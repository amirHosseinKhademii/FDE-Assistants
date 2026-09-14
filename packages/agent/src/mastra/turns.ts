/**
 * Mastra's reply, rebuilt as the `TurnRecord[]` every engine reports.
 *
 * THE ONE PART THAT IS DELIBERATELY NOT SHARED between engines. Each has its
 * own reply shape — `res.steps[]` here, `rawResponses` on the Agents SDK, an
 * accumulated message list on LangGraph — so three real implementations is the
 * honest answer, not duplication to be factored away. What IS shared is the
 * `TurnRecord` they all produce, which is what makes turn and token counts
 * comparable across engines at all.
 */
import type { ToolCallRecord } from '../core/tool.types';
import type { TurnRecord } from '../core/loop.types';

/**
 * `res.steps[]` is one model round-trip each, which is what `TurnRecord` means
 * on the SDK path too — so turn counts and token counts stay comparable across
 * engines. Tool calls are re-attached by walking steps in order and taking as
 * many dispatched records as each step asked for; tools run in request order,
 * so the slices line up.
 */
export function turnsFrom(steps: any[], dispatched: ToolCallRecord[]): TurnRecord[] {
  const turns: TurnRecord[] = [];
  let taken = 0;
  steps.forEach((step, i) => {
    const wanted = (step.toolCalls ?? []).length;
    const slice = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    turns.push({
      turn: i + 1,
      // Mastra does not time individual round-trips, so this is 0 rather than a
      // guess — the same choice loop-sdk.ts makes. Wall clock is the caller's.
      ms: 0,
      inputTokens: step.usage?.inputTokens ?? 0,
      // The AI SDK surfaces this at the TOP LEVEL of usage, already typed
      // `number | undefined`, so `?? undefined` is the whole adaptation — no
      // digging, no key guessing. Left undefined rather than coerced to 0 when
      // the provider does not report it: see `TurnRecord.cachedInputTokens`.
      cachedInputTokens: step.usage?.cachedInputTokens ?? undefined,
      outputTokens: step.usage?.outputTokens ?? 0,
      toolCalls: slice,
      text: typeof step.text === 'string' && step.text ? step.text : undefined,
    });
  });
  return turns;
}

/** How many of `dispatched` the turns so far already claimed. */
export function sumToolCalls(turns: TurnRecord[]): number {
  return turns.reduce((a, t) => a + t.toolCalls.length, 0);
}
