/**
 * Which engine drives the loop, decided in one place.
 *
 *   LOOP=sdk        (default)  @openai/agents
 *   LOOP=mastra                @mastra/core + @ai-sdk/openai-compatible
 *   LOOP=langgraph              @langchain/langgraph + @langchain/openai
 *
 * All three are frameworks; none is code we maintain. What IS ours is the
 * contract in `loop.types.ts` that all three satisfy, and keeping multiple
 * live implementations is how that contract stays honest rather than assumed.
 *
 * Same shape as `EMBEDDINGS=foundry|local`. A flag, not a migration.
 *
 * WHY A THIRD ENGINE, AND WHY NOT EVERYWHERE. Release (pharma's first
 * bottleneck) is one lot, one decision — Agents SDK vs. Mastra already
 * answers whether the loop is replaceable for that shape, and a third engine
 * there would be a redundant way to do a solved job (see `docs/SWAP.md` §8 in
 * the insurance tree). Supplier impact (pharma's second bottleneck, N2) is a
 * different shape — many rows, per-row state, a work list rather than a
 * verdict — which is what LangGraph is actually built for (checkpointed,
 * auditable per-step state). It is wired in here, behind the same contract,
 * so N2 can run all three and the comparison is real. See
 * `docs/pharma/BOTTLENECK-2.md` §"Reopening two closed decisions, on N2
 * specifically".
 *
 * REMEMBER: an engine change is a SETUP change. `eval:diff` refuses to compare
 * baselines across one, by design — record a baseline per engine and compare
 * them by hand.
 */
import type OpenAI from 'openai';
import type { ToolRegistry } from './registry';
import type { LoopOptions, LoopResult } from './loop.types';
import { runLoopSdk } from '../sdk/loop';
import { sdkProviderRefusal } from '../sdk/provider';
import { runLoopMastra } from '../mastra/loop';
import { runLoopLangGraph } from '../langgraph/loop';

export type LoopChoice = 'sdk' | 'mastra' | 'langgraph';

/** CLI flag wins over the env var, so a single run can be steered by hand. */
export function loopChoice(flag?: string): LoopChoice {
  const raw = (flag ?? process.env.LOOP ?? 'sdk').trim().toLowerCase();
  if (raw === 'mastra') return 'mastra';
  if (raw === 'langgraph') return 'langgraph';
  return 'sdk';
}

/**
 * What a baseline and a log line CALL the engine — not the same as the flag.
 *
 * The flag is `sdk` because typing `--loop agents-sdk` is silly. The recorded
 * label stays `agents-sdk` because twelve baselines already say that, and
 * `eval:history` treats the engine string as part of the setup key: renaming it
 * would mark every future run as incomparable to every past one, for a rename.
 * A measurement you cannot compare to yesterday's is worth much less.
 */
export function engineLabel(choice: LoopChoice): string {
  if (choice === 'mastra') return 'mastra';
  if (choice === 'langgraph') return 'langgraph';
  return 'agents-sdk';
}

export function runLoop<T>(
  choice: LoopChoice,
  client: OpenAI,
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  if (choice === 'mastra') return runLoopMastra<T>(client, model, registry, prompt, opts);
  if (choice === 'langgraph') return runLoopLangGraph<T>(client, model, registry, prompt, opts);
  return runLoopSdk<T>(client, model, registry, prompt, opts);
}

/**
 * Why a loop cannot run against the configured provider, or null when it can.
 *
 * Only the Agents SDK refuses anything: Mastra and LangGraph build their own
 * model objects and serve azure, bedrock, local and hosted alike (see
 * `docs/ENGINES.md`). The sdk answer comes from `sdkProviderRefusal`, the same
 * rule that makes `configureSdk` throw, so the two cannot disagree.
 */
export function loopRefusal(choice: LoopChoice): string | null {
  if (choice === 'sdk') return sdkProviderRefusal();
  return null;
}

const LOOP_LABEL: Record<LoopChoice, string> = {
  sdk: 'Agents SDK',
  mastra: 'Mastra',
  langgraph: 'LangGraph',
};

export interface LoopOption {
  id: LoopChoice;
  label: string;
  /** False when this engine cannot serve the configured provider. */
  usable: boolean;
  /** The refusal in full, or null. Shown in a tooltip, not a picker row. */
  reason: string | null;
}

/**
 * Every engine with its standing against the CURRENT provider, read per call.
 * The unusable one is returned rather than filtered out, so a picker can grey
 * it out and say why.
 */
export function loopOptions(): LoopOption[] {
  return (['sdk', 'mastra', 'langgraph'] as LoopChoice[]).map((id) => {
    const reason = loopRefusal(id);
    return { id, label: LOOP_LABEL[id], usable: reason === null, reason };
  });
}

export interface LoopResolution {
  /** The engine that will run. Always usable with the configured provider. */
  choice: LoopChoice;
  /** The engine that was wanted (requested, else LOOP) when it was not usable. */
  fellBackFrom: LoopChoice | null;
  /** A sentence for the server log and the history row, or null. */
  reason: string | null;
}

/** An unknown name counts as not asked for. It is not coerced to sdk. */
function asChoice(raw: string | undefined): LoopChoice | null {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'sdk' || v === 'mastra' || v === 'langgraph' ? v : null;
}

/**
 * Pick the engine a request runs on, falling back instead of refusing.
 *
 * Order: the requested engine if it can run here, then the configured LOOP,
 * then Mastra, LangGraph and the Agents SDK, first usable wins. With Foundry
 * configured (LLM_PROVIDER unset or azure) the sdk is usable, so an explicit
 * request is honoured exactly as before and nothing falls back.
 *
 * This exists for the web surfaces. A visitor's saved picker value, or a
 * request that names sdk on a hosted deployment, used to throw. It now runs
 * on the engine the server is configured for, and `fellBackFrom` says so. The
 * CLIs keep `loopChoice`, which still refuses.
 */
export function resolveLoop(requested?: string): LoopResolution {
  const asked = asChoice(requested);
  const configured = asChoice(process.env.LOOP) ?? 'sdk';
  const wanted = asked ?? configured;
  const order: LoopChoice[] = [...new Set<LoopChoice>([wanted, configured, 'mastra', 'langgraph', 'sdk'])];
  const choice = order.find((c) => loopRefusal(c) === null) ?? 'mastra';
  if (choice === wanted) return { choice, fellBackFrom: null, reason: null };
  const reason =
    `${LOOP_LABEL[wanted]} cannot serve LLM_PROVIDER=${(process.env.LLM_PROVIDER ?? 'azure').trim().toLowerCase()}; ` +
    `running ${LOOP_LABEL[choice]} instead.`;
  return { choice, fellBackFrom: wanted, reason };
}
