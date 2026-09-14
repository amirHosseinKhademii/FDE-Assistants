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
import { runLoopSdk } from '../sdk/loop-sdk';
import { runLoopMastra } from '../mastra/loop-mastra';
import { runLoopLangGraph } from '../langgraph/loop-langgraph';

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
