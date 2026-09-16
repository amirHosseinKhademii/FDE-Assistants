/**
 * Ask a supplier-impact question. The one entry point every surface uses.
 * Sibling of `release-agent.ts` — same reasoning: one domain function so a
 * CLI, an eval runner and a web route cannot each assemble their own registry,
 * prompt and schema and quietly drift apart.
 *
 * THE FIRST REAL THREE-ENGINE WIRING. `release-agent.ts` only ever chooses
 * between `sdk` and `mastra` — `runLoop`'s third option, `langgraph`, was
 * built and compliance-tested (`@fde/agent/src/langgraph/`) specifically for
 * this bottleneck and has had nothing to run against until this file. Nothing
 * here special-cases the engine: `loopChoice(opts.loop)` already returns
 * `'langgraph'` when asked, and `runLoop` already dispatches to it — this file
 * only had to exist for `LOOP=langgraph pnpm db:supplier-impact-ask ...` to
 * become possible. See `docs/pharma/BOTTLENECK-2.md` §"Reopening two closed
 * decisions, on N2 specifically" for why that comparison is being run at all.
 *
 * THE MODEL NEVER TOUCHES THE TWO DATABASES OR THE INDEX ITSELF. It receives
 * the RESULT of the fan-out walk and of the text search. `assess_supplier_impact`
 * and `search_procedures` both run here, in our process.
 *
 * THE SECOND TOOL WAS NOT PART OF THE ORIGINAL PLAN FOR N2, AND IS NOW HERE
 * BECAUSE THE DATA CHANGED UNDERNEATH IT. `supplier-impact-schema.ts`'s header
 * originally argued for plain-string citations because "N2 has no second tool
 * yet to reason against retrieved text." A separate session ingested
 * `SOP-SCM-004 Rev 5` — Supplier Qualification and Disqualification — into
 * `mrd_kb` while this bottleneck was being built, which made that argument
 * stale within the same day. `search_procedures` needed no changes at all:
 * it was already written generically over any `sop_id`, not tied to release's
 * `SOP-QC-014`. The schema's citation shape was NOT revisited to match — see
 * that file's header for why a plain string ref (`sop:SOP-SCM-004 Rev 5#6.2`)
 * still satisfies it without a change.
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
import {
  assessSupplierImpactTool,
  ASSESS_SUPPLIER_IMPACT,
} from '../tool/assess-supplier-impact.tool';
import { searchProceduresTool, SEARCH_PROCEDURES } from '../tool/search-procedures.tool';
import { SUPPLIER_IMPACT_SYSTEM_PROMPT } from '../prompt/supplier-impact-prompt';
import { logRequest, priceDetail } from '@fde/telemetry';
import '../../telemetry/prices';
import {
  validateSupplierImpactAnswer,
  SUPPLIER_IMPACT_FORMAT,
  type SupplierImpactAnswer,
} from '../../schema/supplier-impact-schema';

/**
 * What the model may call, in the order the prompt uses them.
 *
 * EXPORTED SO `prompt:check` CANNOT DRIFT FROM REALITY — same reasoning as
 * `RELEASE_TOOL_NAMES`, and the same bug it exists to prevent: a prompt that
 * names a tool the loop never registered passes a check that keeps its own
 * copy of the list.
 */
export const SUPPLIER_IMPACT_TOOL_NAMES = [ASSESS_SUPPLIER_IMPACT, SEARCH_PROCEDURES] as const;

export interface AskSupplierImpactOptions {
  question: string;
  /** 'sdk' | 'mastra' | 'langgraph'. Falls back to the LOOP env var, then 'sdk'. */
  loop?: string;
  /** Where the question came from: 'ask' | 'eval:sup-001#3'. */
  surface: string;
  /** Only the eval runner passes this — a fixture-wrapped registry. */
  registry?: ToolRegistry;
  /** Off only for callers that log the run themselves with extra fields. */
  log?: boolean;
  onEvent?: (e: LoopEvent) => void;
  onTurn?: (t: TurnRecord) => void;
}

export interface AskSupplierImpactResult {
  structured?: SupplierImpactAnswer;
  text: string;
  turns: TurnRecord[];
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  schemaErrors: string[];
  /** See `release-agent.ts`'s `costUsd`: a ceiling only when the engine did
   *  not report a cached count, and `costBasis` says which. */
  costUsd: number | null;
  costBasis: string;
}

/** The expensive things, built once per process. Same shape as `ReleaseContext`. */
export interface SupplierImpactContext {
  client: OpenAI;
  handle: DbHandle;
  /** The knowledge base — `mrd_kb`, never one of the two systems of record. */
  store: Awaited<ReturnType<typeof openStore>>;
  registry: ToolRegistry;
}

let shared: Promise<SupplierImpactContext> | undefined;

export function supplierImpactContext(): Promise<SupplierImpactContext> {
  if (!shared) {
    shared = (async () => {
      const handle = openHandle();
      const client = chatClient(() => openaiClient());
      // Passing the connection string explicitly is not optional — see
      // `release-agent.ts`'s identical comment: the default is the global
      // DATABASE_URL, which in this repo is the INSURANCE project.
      const store = await openStore(openEmbeddings(client), {
        connectionString: urlFor(KB_DB),
        tableName: 'document_chunks',
      });
      return {
        client,
        handle,
        store,
        // ORDER IS THE ORDER THE PROMPT USES THEM IN — records first, then the
        // text that explains one of them. Same reasoning as `release-agent.ts`.
        registry: assertNames(
          new ToolRegistry([assessSupplierImpactTool(handle), searchProceduresTool(store)]),
        ),
      };
    })();
  }
  return shared;
}

/** The registry and `SUPPLIER_IMPACT_TOOL_NAMES` must agree, or the name list is fiction. */
function assertNames(registry: ToolRegistry): ToolRegistry {
  const actual = registry.schemas().map((s) => s.name).sort();
  const declared = [...SUPPLIER_IMPACT_TOOL_NAMES].sort();
  if (actual.join() !== declared.join()) {
    throw new Error(
      `SUPPLIER_IMPACT_TOOL_NAMES is out of date: registry has [${actual.join(', ')}], ` +
        `the constant says [${declared.join(', ')}]`,
    );
  }
  return registry;
}

/** Safe to call when no context was built. A server never calls this. */
export async function closeSupplierImpactContext(): Promise<void> {
  if (!shared) return;
  const ctx = await shared;
  shared = undefined;
  await ctx.handle.close();
  await ctx.store.end();
}

/**
 * The supplier a question is about, for grouping cost by subject.
 * Same "exactly one, or nothing" reasoning as `lotIdInQuestion`.
 */
export function supplierIdInQuestion(question: string): string | null {
  const found = [...new Set(question.match(/\bSUP-\d{2,}\b/g) ?? [])];
  return found.length === 1 ? found[0] : null;
}

export async function askSupplierImpact(opts: AskSupplierImpactOptions): Promise<AskSupplierImpactResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const { client, registry: sharedRegistry } = await supplierImpactContext();

  const result = await runLoop<SupplierImpactAnswer>(
    choice,
    client,
    chatModelName(env.chatDeployment()),
    opts.registry ?? sharedRegistry,
    opts.question,
    {
      system: SUPPLIER_IMPACT_SYSTEM_PROMPT,
      responseFormat: SUPPLIER_IMPACT_FORMAT,
      validate: validateSupplierImpactAnswer,
      agentName: 'supplier-impact',
      /**
       * The one-line summary of a tool result for `--trace`. Deliberately
       * reports the exposure mix, not a bare row count — same reasoning
       * `release-agent.ts` gives for reporting the blocker count instead of
       * `releasable`.
       */
      summariseResult: (r: any) => {
        if (r?.found === false) return `no dossier: ${r.supplier_id} — ${r.reason}`;
        if (Array.isArray(r?.affected)) {
          const outside = r.affected.filter(
            (a: any) => a.exposure !== 'in_our_control' && a.exposure !== 'expired',
          ).length;
          const preventable = (r.materials?.notQuarantined?.length ?? 0) > 0;
          return (
            `${r.supplier?.supplierId}: ${r.affected.length} lot(s), ${outside} outside our control` +
            (preventable ? ', preventable material still usable' : '')
          );
        }
        // search_procedures. Same reasoning as release-agent.ts: naming the
        // revisions reached is the useful line, not a bare passage count.
        if (Array.isArray(r?.results)) {
          if (!r.results.length) return 'no passage matched';
          const revs = [...new Set(r.results.map((p: any) => p.revision_id))];
          return `${r.results.length} passage(s) from ${revs.join(', ')}`;
        }
        return null;
      },
      onEvent: opts.onEvent,
      onTurn: opts.onTurn,
      // maxTurns deliberately unset — same reasoning as release-agent.ts.
    },
  );

  const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
  const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
  // `undefined` when no turn reported one — NOT 0. Absent keeps the figure a
  // ceiling; zero would claim a measurement nobody took.
  const cachedInputTokens = cachedInputTokensOf(result.turns);
  const toolCalls = result.turns.reduce((a, t) => a + t.toolCalls.length, 0);
  const ms = Date.now() - started;

  if (opts.log !== false) {
    logRequest({
      subject: supplierIdInQuestion(opts.question),
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
