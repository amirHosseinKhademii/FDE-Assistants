/**
 * How far the build has got — the ONE place either page reads it from.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * The landing page used to type "Five of the fourteen steps have run" as a
 * literal while `/steps` derived the same number from its own list. Two places
 * holding one fact is how one of them goes stale: the steps page would move on
 * the day a step landed and the front page would keep saying five. Both pages
 * now import from here, so there is nothing to keep in step by hand.
 *
 * ── WHEN A STEP FINISHES ───────────────────────────────────────────────────
 *
 * When a ☑ lands against a step in `docs/commerce/MCP-STEPS.md`, add its number
 * to `DONE` and nothing else. Every count, every phase status and the progress
 * bar read it. Then rewrite that step's copy on `/steps` from future tense
 * ("this step will…") to past ("we found…") — the one thing a list cannot do.
 *
 * STEP 0 IS NOT IN `DONE`. It is the idea in plain words, and `MCP-STEPS.md`
 * puts no ☑ against it — there is nothing to run. Counting it would inflate the
 * only number on either page anybody would quote.
 */

/** The steps that have actually run. Checked against MCP-STEPS.md's ☑ marks. */
export const DONE: readonly string[] = ['1', '2', '3', '4a', '4b', '5', '6'];

/** Every step, in order. Step 4 was split into 4a and 4b, which is why this is not 0–12. */
export const ALL_STEPS: readonly string[] = [
  '0', '1', '2', '3', '4a', '4b', '5', '6', '7', '8', '9', '10', '11', '12',
];

/**
 * What a step has to wait for before it can start.
 *
 * MCP-STEPS.md's own table ("what we need before which step"). `nobody` means a
 * ten-line stub stands in for the customer's backend, so the step can be built
 * and tested on a laptop with nothing else running.
 */
export type Needs = 'nobody' | 'the API' | 'the policy documents' | 'the steps before it';

export const NEEDS: Record<string, Needs> = {
  '0': 'nobody',
  '1': 'nobody',
  '2': 'nobody',
  '3': 'nobody',
  '4a': 'nobody',
  '4b': 'the API',
  '5': 'nobody',
  // Two halves since 2026-09-27. The protocol half needs nothing
  // (`commerce:mcp-check`, offline); the backend half needs the API on :3610
  // (`commerce:mcp-break`) — and every defect step 6 found was in that half.
  '6': 'the API',
  '7': 'nobody',
  '8': 'nobody',
  '9': 'the policy documents',
  '10': 'the steps before it',
  '11': 'the steps before it',
  '12': 'the steps before it',
};

/** Steps that count towards "done" — every step except the idea. */
export const BUILDABLE = ALL_STEPS.filter((s) => s !== '0');

export const isDone = (step: string) => DONE.includes(step);

/** How many of a set of steps have run. Intersects, so it stays true as `DONE` grows. */
export const doneIn = (steps: readonly string[]) => steps.filter(isDone).length;

/** The first step that has not run yet — what the page calls "up next". */
export const NEXT = BUILDABLE.find((s) => !isDone(s)) ?? null;

/** A count as a word, for sentences. Numerals past fourteen are never needed here. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
];
export const inWords = (n: number) => WORDS[n] ?? String(n);
