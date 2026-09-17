/**
 * How a filter matches NHTSA's text fields. One definition, two tools.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * The component rule was written twice — once in `find-recalls.tool.ts` and once
 * in `search-complaints.tool.ts` — and `count_complaints` imports the second.
 * Two implementations of "what does this component mean" that can drift is the
 * same hazard as two copies of a scoring rule: nothing fails, and `find_recalls`
 * and `count_complaints` quietly stop agreeing about the same filter.
 *
 * ── BOTH RULES ARE "EXACT, OR A CHILD OF IT" ──────────────────────────────
 *
 * They differ only in what separates a parent from a child:
 *
 *   component   a colon      POWER TRAIN -> POWER TRAIN:AUTOMATIC TRANSMISSION
 *   model       a space      F-250       -> F-250 SD
 *
 * ── THE MODEL RULE COST A CASE BEFORE IT EXISTED ──────────────────────────
 *
 * REC-003 asks "did Ford volunteer the F-250 tailgate recall, or was it
 * pushed?" and scored 1 of 3. The failure was not the model's judgement — it
 * was that `find_recalls(FORD, "F-250")` returned NOTHING, because the campaign
 * is filed under `F-250 SD`. A person says "F-250". The corpus says "F-250 SD".
 * An exact match makes the natural name wrong.
 *
 * MEASURED before adopting it, both for what it finds and what it does not:
 *
 *   "F-250"    -> F-250 SD          and 19V864000 is found
 *   "F-150"    -> F-150             and nothing else
 *   "MODEL 3"  -> MODEL 3           and not MODEL 3 PERFORMANCE, were there one
 *
 *   complaint counts, exact vs prefix:
 *     FORD F-150     2043 vs 2043      unchanged
 *     TESLA MODEL 3  1062 vs 1062      unchanged
 *     HONDA ODYSSEY  1416 vs 1416      unchanged
 *
 * That last block is the important one: every number this engagement has
 * verified — 1,057, 5, 400 — is produced by a filter this rule does not move.
 *
 * ── AND IT EXCLUDES THE JUNK, WITHOUT TRYING TO ───────────────────────────
 *
 * The recall corpus contains `redundant F-250` and `redundant  F-250` — with
 * one space and with two — in the model field, which is NHTSA's own data entry
 * rather than anything this pipeline did. A prefix rule cannot reach them,
 * because they do not START with the name. Substring matching would have
 * swept them in, which is one more reason it was not chosen.
 */

/**
 * SQL for "this column equals the parameter, or is a child of it".
 *
 * Returns a fragment for interpolation, with `$n` supplied by the caller —
 * parameterised, never concatenated with a value.
 */
export const COMPONENT_MATCH = (col: string, param: string) =>
  `(${col} = ${param} or ${col} like ${param} || ':%' or ${col} like ${param} || ': %')`;

/**
 * Same shape, separated by a space.
 *
 * NOT a bare `like '%…%'`. "F-150" must not match "redundant F-150", and a
 * trailing-wildcard-only rule is what keeps the corpus's own bad rows out.
 */
export const MODEL_MATCH = (col: string, param: string) =>
  `(${col} = ${param} or ${col} like ${param} || ' %')`;
