/**
 * The Agents SDK's raw model responses, rebuilt as the `TurnRecord[]` every
 * engine reports.
 *
 * DELIBERATELY NOT SHARED with the other engines, for the reason
 * `mastra/turns.ts` states: three engines, three reply shapes, three real
 * implementations. What IS shared is the `TurnRecord` they all produce.
 */
import type { ToolCallRecord } from '../core/tool.types';
import type { TurnRecord } from '../core/loop.types';

/**
 * Rebuild `TurnRecord[]` from the SDK's raw model responses.
 *
 * One `rawResponse` is one model round-trip, which is exactly what `loop.ts`
 * calls a turn — so token counts and turn counts stay comparable across the two
 * engines. Tool calls are re-attached by walking the responses in order and
 * taking as many dispatched records as each response asked for; tools run in
 * request order, so the slices line up.
 *
 * `ms` per turn is not available from the SDK (it does not time individual
 * round-trips), so it is reported as 0 rather than guessed. Total wall-clock is
 * still measured by the caller, which is what the scorecard actually reports.
 */
/**
 * Cached input tokens out of an Agents SDK usage object, or `undefined`.
 *
 * The count lives under `inputTokensDetails.cached_tokens`, which is the
 * Responses API's own key passed through. The SDK exposes that as an ARRAY on
 * the aggregate `Usage` (one entry per request) and as a plain object on a
 * single `RequestUsage`, so both shapes are handled.
 *
 * RETURNS `undefined`, NOT `0`, WHEN THE KEY IS ABSENT. The detail object is
 * documented as not needing to carry every key, so "no `cached_tokens` here"
 * means the provider did not say — which is a different fact from "nothing was
 * cached", and `TurnRecord` keeps them apart deliberately.
 */
export function cachedFrom(usage: any): number | undefined {
  const details = usage?.inputTokensDetails ?? usage?.input_tokens_details;
  if (!details) return undefined;

  const entries: any[] = Array.isArray(details) ? details : [details];
  const present = entries.filter((d) => typeof d?.cached_tokens === 'number');
  if (present.length === 0) return undefined;

  return present.reduce((n, d) => n + d.cached_tokens, 0);
}

export function turnsFrom(
  result: any,
  dispatched: ToolCallRecord[],
  turnOffset: number,
  toolOffset: number,
): TurnRecord[] {
  const responses: any[] = result.rawResponses ?? [];
  const turns: TurnRecord[] = [];
  let taken = toolOffset;

  responses.forEach((res, i) => {
    const wanted = (res.output ?? []).filter((o: any) => o.type === 'function_call').length;
    const calls = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    turns.push({
      turn: turnOffset + i + 1,
      ms: 0,
      inputTokens: res.usage?.inputTokens ?? res.usage?.input_tokens ?? 0,
      // `inputTokensDetails` is an ARRAY on the SDK's aggregate `Usage` — one
      // entry per request — and a plain object on a single `RequestUsage`. Both
      // shapes appear depending on what produced `res`, so both are summed.
      // Reading only the object form would silently return nothing on the
      // aggregate, which looks identical to a cache that never hit.
      cachedInputTokens: cachedFrom(res.usage),
      outputTokens: res.usage?.outputTokens ?? res.usage?.output_tokens ?? 0,
      toolCalls: calls,
    });
  });

  return turns;
}
