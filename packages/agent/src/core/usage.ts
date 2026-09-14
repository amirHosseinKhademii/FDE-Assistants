/**
 * Rolling per-turn usage up into the one number a request is logged with.
 *
 * Trivial for input and output tokens — they are always present, so a caller
 * sums them inline and nobody needs a helper. Cached tokens are not always
 * present, and the rule for absence is the whole reason this file exists:
 * three call sites summing them by hand would be three chances to write
 * `?? 0` and quietly destroy the distinction `TurnRecord` is careful to keep.
 */
import type { TurnRecord } from './loop.types';

/**
 * Cached input tokens across a run, or `undefined` if no turn reported any.
 *
 * THE RULE, and the direction it errs in:
 *
 *   no turn reported    → `undefined`, meaning "this engine does not say".
 *                         The cost stays a ceiling. Returning 0 here would
 *                         claim the cache never helped, which is a finding
 *                         about an engine rather than the absence of one.
 *
 *   some turns reported → the sum of those that did, counting the silent ones
 *                         as zero. That UNDERSTATES the cache, and therefore
 *                         OVERSTATES the cost. Deliberate: a partial reading
 *                         should land on the side of the ceiling, because a
 *                         cost that is too high gets questioned and a cost
 *                         that is too low gets quoted.
 *
 * Turn 1 legitimately reports 0 on every engine — nothing has been sent yet, so
 * there is nothing to reuse. A run whose total is 0 across a SINGLE turn says
 * nothing about whether caching works; the signal lives in turn 2 onward.
 */
export function cachedInputTokensOf(turns: TurnRecord[]): number | undefined {
  const reported = turns.filter((t) => typeof t.cachedInputTokens === 'number');
  if (reported.length === 0) return undefined;
  return reported.reduce((a, t) => a + (t.cachedInputTokens as number), 0);
}
