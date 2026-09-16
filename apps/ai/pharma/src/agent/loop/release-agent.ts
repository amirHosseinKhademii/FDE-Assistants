/**
 * Ask a release question. The one entry point every surface uses.
 *
 * WHY THIS EXISTS RATHER THAN EACH SURFACE ASSEMBLING IT. A CLI, an eval runner
 * and a web route that each build their own client, registry, prompt and schema
 * will drift, and both will look perfectly healthy while answering differently.
 * The domain exposes one function; surfaces take input and render output.
 *
 * WHAT IS BOUGHT AND WHAT IS WRITTEN. The loop — send the prompt and the tool
 * list, receive a tool call, dispatch it, send the result back, repeat until an
 * answer — is `@fde/agent`, already proven on the insurance side and switchable
 * between the OpenAI Agents SDK and Mastra. Nothing in this file implements a
 * loop. What it supplies is the judgement: which tools exist, what the
 * instructions say, and what shape an answer is allowed to take.
 *
 * THE MODEL NEVER TOUCHES THE SIX DATABASES. It receives the RESULT of the
 * walk. `assess_release` runs here, in our process, against our handle.
 */
import type OpenAI from 'openai';
import { env, openaiClient } from '@fde/foundry';
import {
  ToolRegistry,
  runLoop,
  loopChoice,
  engineLabel,
  cachedInputTokensOf,
  type LoopChoice,
  type LoopEvent,
  type TurnRecord, chatClient, chatModelName } from '@fde/agent';
import { openStore } from '@fde/grounding';
import { openHandle, type DbHandle } from '../../tools/utils/handle';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { KB_DB, urlFor } from '../../config/connections';
import { assessReleaseTool, ASSESS_RELEASE } from '../tool/assess-release.tool';
import { searchProceduresTool, SEARCH_PROCEDURES } from '../tool/search-procedures.tool';
import { RELEASE_SYSTEM_PROMPT } from '../prompt/release-prompt';
import { logRequest, priceDetail } from '@fde/telemetry';
import '../../telemetry/prices';
import {
  validateReleaseAnswer,
  RELEASE_FORMAT,
  type ReleaseAnswer,
} from '../../schema/release-schema';

/**
 * What the model may call, in the order the prompt uses them.
 *
 * EXPORTED SO `prompt:check` CANNOT DRIFT FROM REALITY. That check keeps its own
 * list once, and the copy went stale within a day of the second tool arriving —
 * it passed while the prompt named a tool the loop had never registered. A
 * check with its own copy of the truth checks its copy.
 *
 * The assertion below makes the constant and the registry impossible to
 * separate.
 */
export const RELEASE_TOOL_NAMES = [ASSESS_RELEASE, SEARCH_PROCEDURES] as const;

export interface AskOptions {
  question: string;
  /** 'sdk' | 'mastra'. Falls back to the LOOP env var, then 'sdk'. */
  loop?: string;
  /** Where the question came from: 'ask' | 'eval:release-001#3'. */
  surface: string;
  /** Only the eval runner passes this — a fixture-wrapped registry. */
  registry?: ToolRegistry;
  /** Off only for callers that log the run themselves with extra fields. */
  log?: boolean;
  onEvent?: (e: LoopEvent) => void;
  onTurn?: (t: TurnRecord) => void;
}

export interface AskResult {
  structured?: ReleaseAnswer;
  text: string;
  turns: TurnRecord[];
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  schemaErrors: string[];
  /**
   * What this question cost, in USD. Null when the model has no verified rate.
   *
   * RETURNED, NOT ONLY LOGGED. A cost that exists solely in a log file is a
   * cost every surface has to go and find; returning it means the CLI prints it
   * and a web route can put it on the page without either of them knowing what
   * a token costs.
   *
   * Cached input IS modelled since 2026-09-12, so this is a ceiling only when
   * the engine did not report a cached count — `costBasis` says which.
   * See `telemetry/prices.ts`.
   */
  costUsd: number | null;
  /**
   * One line saying how `costUsd` was arrived at, straight from the pricing
   * code rather than composed here. A surface that wrote its own caption would
   * be a caption that goes stale silently — this one already did once.
   */
  costBasis: string;
}

/**
 * The expensive things, built once per process.
 *
 * SIX CONNECTIONS, NOT SIX PER QUESTION. The handle is shared for the same
 * reason the insurance side shares one Postgres pool: a fresh set per request is
 * fine at one request and ruinous at fifty, against a single Neon compute.
 */
export interface ReleaseContext {
  client: OpenAI;
  /** The six systems of record. */
  handle: DbHandle;
  /** The knowledge base — `mrd_kb`, never one of the six. */
  store: Awaited<ReturnType<typeof openStore>>;
  registry: ToolRegistry;
}

let shared: Promise<ReleaseContext> | undefined;

export function releaseContext(): Promise<ReleaseContext> {
  if (!shared) {
    shared = (async () => {
      const handle = openHandle();
      const client = chatClient(() => openaiClient());
      // The index lives in `mrd_kb`, which is deliberately outside the six
      // systems of record — see `config/connections.ts`. Passing the URL
      // explicitly is not optional: the default would be the global
      // DATABASE_URL, which in this repo is the INSURANCE project, and the
      // queries would return plausible answers from the wrong estate.
      const store = await openStore(openEmbeddings(client), {
        connectionString: urlFor(KB_DB),
        tableName: 'document_chunks',
      });
      return {
        client,
        handle,
        store,
        // ORDER IS THE ORDER THE PROMPT USES THEM IN. Records first, then the
        // text that explains them — a model that searches procedures before it
        // knows what happened is searching for a rule it has no fact to apply.
        registry: assertNames(
          new ToolRegistry([assessReleaseTool(handle), searchProceduresTool(store)]),
        ),
      };
    })();
  }
  return shared;
}

/**
 * Close the connections, for processes that are supposed to END.
 *
 * A server never calls this. A batch job must: open pg clients keep the event
 * loop alive, so a CLI would print its answer and then hang. Safe to call when
 * no context was built.
 */
/** The registry and `RELEASE_TOOL_NAMES` must agree, or the name list is fiction. */
function assertNames(registry: ToolRegistry): ToolRegistry {
  const actual = registry.schemas().map((s) => s.name).sort();
  const declared = [...RELEASE_TOOL_NAMES].sort();
  if (actual.join() !== declared.join()) {
    throw new Error(
      `RELEASE_TOOL_NAMES is out of date: registry has [${actual.join(', ')}], ` +
        `the constant says [${declared.join(', ')}]`,
    );
  }
  return registry;
}

export async function closeReleaseContext(): Promise<void> {
  if (!shared) return;
  const ctx = await shared;
  shared = undefined;
  await ctx.handle.close();
  await ctx.store.end();
}

/**
 * The lot a question is about, for grouping cost by subject.
 *
 * ONE LOT ONLY. "Unlike 2609-B, what about 2609-D?" names two and there is no
 * honest way to pick — so nothing is recorded rather than a guess that is
 * invisible in the log.
 */
export function lotIdInQuestion(question: string): string | null {
  const found = [...new Set(question.match(/\bLOT-[A-Z0-9]+-\d{4}-[A-Z]\b/g) ?? [])];
  return found.length === 1 ? found[0] : null;
}

export async function askRelease(opts: AskOptions): Promise<AskResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const { client, registry: sharedRegistry } = await releaseContext();

  const result = await runLoop<ReleaseAnswer>(
    choice,
    client,
    chatModelName(env.chatDeployment()),
    opts.registry ?? sharedRegistry,
    opts.question,
    {
      system: RELEASE_SYSTEM_PROMPT,
      responseFormat: RELEASE_FORMAT,
      // REQUIRED. `@fde/agent` ships no default validator on purpose — a loop
      // that invented an answer shape would be checking against something
      // nobody agreed to, and omitting this would let raw text through as if it
      // had passed, while still typechecking.
      validate: validateReleaseAnswer,
      agentName: 'release',
      /**
       * The one-line summary of a tool result for `--trace`.
       *
       * Deliberately reports the BLOCKER COUNT and not `releasable`. A trace
       * line reading "releasable: true" is the single most misreadable thing
       * this system could print, for exactly the reason the schema forbids the
       * phrase in an answer.
       */
      summariseResult: (r: any) => {
        // The MISS is snake_case (it is model-facing prose); the DOSSIER is
        // camelCase (it is internal). Reading `lot_id` off a dossier printed
        // "undefined → EU" in the first live run — harmless in the trace, and
        // exactly the kind of thing a trace exists to show you.
        if (r?.found === false) return `no dossier: ${r.lot_id} / ${r.market}`;
        if (Array.isArray(r?.findings)) {
          const blockers = r.findings.filter((f: any) => f.severity === 'blocker').length;
          return `${r.lotId} → ${r.market}: ${blockers} blocker(s), ${r.findings.length} finding(s)`;
        }
        // `search_procedures`. Naming the REVISIONS it reached is the useful
        // line: "3 passages" says nothing, "Rev 7" vs "Rev 6" is the difference
        // between the right rule and a superseded one.
        if (Array.isArray(r?.results)) {
          if (!r.results.length) return 'no passage matched';
          const revs = [...new Set(r.results.map((p: any) => p.revision_id))];
          return `${r.results.length} passage(s) from ${revs.join(', ')}`;
        }
        return null;
      },
      onEvent: opts.onEvent,
      onTurn: opts.onTurn,
      // maxTurns deliberately unset: every surface gets the cap a real request
      // gets, so an eval measures the same path a user takes.
    },
  );

  const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
  const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
  // `undefined` when no turn reported one — NOT 0. The price formula reads the
  // difference: absent keeps the figure a ceiling, zero claims a measurement.
  const cachedInputTokens = cachedInputTokensOf(result.turns);
  const toolCalls = result.turns.reduce((a, t) => a + t.toolCalls.length, 0);
  const ms = Date.now() - started;

  if (opts.log !== false) {
    // Written down BEFORE it is rendered. A number that is only printed is a
    // number you cannot ask questions about next month — and until this landed,
    // every pharma request was invisible to everything except the Azure portal,
    // which cannot tell one domain's spend from another's.
    //
    // `subject` is the LOT, which is what cost is worth grouping by here: the
    // insurance side groups by policy for the same reason.
    logRequest({
      subject: lotIdInQuestion(opts.question),
      question: opts.question,
      model: chatModelName(env.chatDeployment()),
      engine: engineLabel(choice),
      turns: result.turns.length,
      toolCalls,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      ms,
      stoppedBecause: result.stoppedBecause,
      schemaRetries: result.schemaErrors.length,
      surface: opts.surface,
    });
  }

  const { costUsd, basis: costBasis } = priceDetail(
    chatModelName(env.chatDeployment()), inputTokens, outputTokens, cachedInputTokens,
  );

  return {
    costUsd,
    costBasis,
    structured: result.structured,
    text: result.text,
    turns: result.turns,
    toolCalls,
    inputTokens,
    outputTokens,
    ms,
    engine: engineLabel(choice),
    stoppedBecause: result.stoppedBecause,
    schemaErrors: result.schemaErrors,
  };
}
