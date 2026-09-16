/**
 * Ask a coverage question. The one entry point every surface uses.
 *
 * WHY THIS EXISTS. Before it, `ask.ts` and the web route each ASSEMBLED the
 * application by hand: build a client, open a store, construct the registry,
 * pick a prompt, pass a schema, log the request. Ten imports each, in two
 * places. Add a tool or change the prompt and the terminal and the browser can
 * silently answer differently — both looking perfectly healthy. That is exactly
 * the failure this project keeps designing against, and a surface reassembling
 * the domain is how you get it.
 *
 * So the domain exposes one function, and the surfaces do what surfaces should:
 * take input, render output.
 *
 * WHAT STAYS OUT OF HERE ON PURPOSE: HTTP, SSE framing, React, the terminal.
 * `onEvent` hands progress to whoever asked, and the caller decides whether that
 * becomes a printed line or an SSE frame.
 */
import type OpenAI from 'openai';
import { env, openaiClient } from './foundry/client';
import { openEmbeddings } from './grounding/embeddings.factory';
import { openStore } from '@fde/grounding';
import { ToolRegistry, loggedModelName } from '@fde/agent';
import { getPolicyholderTool } from './tools/get-policyholder.tool';
import { searchPolicyTool } from './tools/search-policy.tool';
import { searchGuidanceTool } from './tools/search-guidance.tool';
import { runLoop, loopChoice, engineLabel, cachedInputTokensOf, type LoopChoice } from '@fde/agent';
import { COVERAGE_SYSTEM_PROMPT, buildUserPrompt } from './tools/coverage-prompt';
import { validateCoverageAnswer, COVERAGE_FORMAT, type CoverageAnswer } from './schema/coverage-schema';
import type { LoopEvent, TurnRecord } from '@fde/agent';
import { logRequest } from '@fde/telemetry';
import './telemetry/prices';
import { DOMAIN } from './config/domain';

export interface AskOptions {
  question: string;
  /** The claim this belongs to. Also what `--form` filtering keys off. */
  policyId?: string;
  /** 'sdk' | 'mastra'. Falls back to the LOOP env var, then 'sdk'. */
  loop?: string;
  /** Where the question came from: 'ask' | 'http' | 'eval:cov-001#3'. */
  surface: string;
  /**
   * Only the eval runner passes this — it needs the fixture-wrapped registry so
   * `get_policyholder` replays instead of re-reading. Everything else gets the
   * shared one, which is the point: one assembly, one behaviour.
   */
  registry?: ToolRegistry;
  onEvent?: (e: LoopEvent) => void;
  onTurn?: (t: TurnRecord) => void;
  /** Off only for callers that log the run themselves with extra fields. */
  log?: boolean;
}

export interface AskResult {
  structured?: CoverageAnswer;
  text: string;
  turns: TurnRecord[];
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  schemaErrors: string[];
}

/**
 * The expensive things, built once per process rather than per question.
 *
 * A fresh Postgres pool per request is fine at one request and ruinous at fifty.
 * Nothing about a conversation is cached — each call carries its own transcript,
 * which is the same property `store: false` gives us on the provider side.
 */
export interface CoverageContext {
  client: OpenAI;
  /**
   * The one Postgres-backed store behind `search_policy`.
   *
   * Exposed because a caller that supplies its own `registry` — the eval runner
   * does, to wrap `get_policyholder` in fixtures — still needs a search tool,
   * and building it from a SECOND `openStore()` would open a second connection
   * pool that nobody closes. One pool, built here, shared by everything.
   */
  store: Awaited<ReturnType<typeof openStore>>;
  registry: ToolRegistry;
}

let shared: Promise<CoverageContext> | undefined;
export function coverageContext(): Promise<CoverageContext> {
  if (!shared) {
    shared = (async () => {
      const client = openaiClient();
      const store = await openStore(openEmbeddings(client), { tableName: DOMAIN.vectorTable });
      return {
        client,
        store,
        registry: new ToolRegistry([
          getPolicyholderTool(),
          searchPolicyTool(store),
          searchGuidanceTool(store),
        ]),
      };
    })();
  }
  return shared;
}

/**
 * Close the pool, for processes that are supposed to END.
 *
 * A long-lived server never calls this — the context is built once and lives as
 * long as the process. A batch job must: an open pg pool keeps the event loop
 * alive, so `pnpm eval` would print its scorecard and then hang until CI's own
 * timeout killed it, reporting failure on a green run. That bug was in the eval
 * runner from its first version and stayed invisible because a human reads the
 * card and hits ctrl-C.
 *
 * A no-op when no context was ever built, so calling it is always safe.
 */
export async function closeCoverageContext(): Promise<void> {
  if (!shared) return;
  const ctx = await shared;
  shared = undefined;
  await ctx.store.end();
}

/**
 * The policy id a question is about, when the caller did not pass one.
 *
 * WHY THIS EXISTS, measured rather than assumed. `buildUserPrompt` prepends
 * "Policy AUT-4471." only when a policy id arrives as a FIELD. On 2026-09-11
 * the same question with the id left in prose failed 2 times in 15 — two tool
 * calls, the attached endorsement never searched, a confident and
 * correctly-cited $40 where the answer is $50 — while the field version never
 * failed in 15+ runs.
 *
 * The tempting conclusion was "always use the dropdown". That is a workaround:
 * it tells people not to use the path that breaks, and on a surface where
 * typing a question IS the interface it does not survive contact with reality.
 *
 * So the input is normalised instead, and the degraded path stops existing.
 *
 * ONE ID ONLY. "Unlike AUT-4471, what does AUT-4472 get?" names two, and there
 * is no honest way to pick. Two distinct ids means we pass nothing and leave
 * the model to resolve it exactly as it does today — a guess we make silently
 * is worse than one the model makes visibly, because ours is invisible in the
 * trace.
 */
export function policyIdInQuestion(question: string): string | undefined {
  const found = [...new Set(question.match(DOMAIN.recordIdInText) ?? [])];
  return found.length === 1 ? found[0] : undefined;
}

export async function askCoverage(opts: AskOptions): Promise<AskResult> {
  const started = Date.now();
  // Normalise before anything reads it, so every surface — CLI, HTTP, eval —
  // takes the same path into the loop.
  const policyId = opts.policyId ?? policyIdInQuestion(opts.question);
  const choice: LoopChoice = loopChoice(opts.loop);
  const { client, registry: shared_ } = await coverageContext();
  const registry = opts.registry ?? shared_;

  const result = await runLoop<CoverageAnswer>(
    choice,
    client,
    env.chatDeployment(),
    registry,
    buildUserPrompt(opts.question, policyId),
    {
      system: COVERAGE_SYSTEM_PROMPT,
      responseFormat: COVERAGE_FORMAT,
      // REQUIRED, not optional. `@fde/agent` deliberately ships no default
      // validator — a loop that invented an answer shape would be checking
      // against something nobody agreed to. Omitting it here would let raw
      // text through as if it had passed, and it would typecheck.
      validate: validateCoverageAnswer,
      // What the agent is called on the wire and in traces. `@fde/agent`
      // defaults to 'agent' — a package that hard-coded one customer's word
      // would put it in every other customer's traces.
      agentName: 'coverage',
      // The `--trace` one-liner for a tool result. The package handles the
      // shapes every retrieval system shares; only we know that
      // `get_policyholder` answers with a `record` keyed on `policy_id`.
      summariseResult: (r: any) => {
        if (r?.found === false && r?.policy_id) return `no record for ${r.policy_id}`;
        if (typeof r?.record === 'string') {
          return `record ${r.policy_id} (${r.record.length} chars)`;
        }
        return null;
      },
      onEvent: opts.onEvent,
      onTurn: opts.onTurn,
      // maxTurns is deliberately NOT set: every surface gets the same cap a real
      // request gets. Two caps would make the eval suite's central claim false.
    },
  );

  const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
  const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
  // `undefined` when no turn reported one — NOT 0. Absent keeps the figure a
  // ceiling; zero would claim a measurement nobody took.
  const cachedInputTokens = cachedInputTokensOf(result.turns);
  const toolCalls = result.turns.reduce((a, t) => a + t.toolCalls.length, 0);
  const ms = Date.now() - started;
  const engine = engineLabel(choice);

  if (opts.log !== false) {
    // Pillar 5: written down before it is rendered. A number that is only
    // printed is a number you cannot answer questions about next month.
    logRequest({
      subject: policyId ?? null,
      question: opts.question,
      // NOT `env.chatDeployment()` on its own — that is the AZURE deployment
      // name, and under `LLM_PROVIDER=local` it logged a local run as
      // `gpt-5-mini` at $0.0024 against a meter on a torn-down subscription.
      // Same shape as `grounding/cli.ts`'s embeddings label, one layer up.
      model: loggedModelName(env.chatDeployment()),
      engine,
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

  return {
    structured: result.structured,
    text: result.text,
    turns: result.turns,
    toolCalls,
    inputTokens,
    outputTokens,
    ms,
    engine,
    stoppedBecause: result.stoppedBecause,
    schemaErrors: result.schemaErrors,
  };
}
