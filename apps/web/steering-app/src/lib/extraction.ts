/**
 * How the facts got out of the files — `docs/steering/HOW-WE-SORTED-IT.md`.
 *
 * IT COMES BEFORE THE WALK ON THE PAGE, because it comes before it in life. The
 * walk queries rows; this is where the rows came from. A customer who has just
 * been shown a price built out of a database will ask where the database came
 * from, and the honest answer involves a model reading English — which is
 * exactly the part they will want to poke at.
 *
 * EVERY FIGURE IS FROM THE DOC, which takes them from the run. 1,421 facts,
 * six quote failures, the three answer rates, and the two cost columns are all
 * measured rather than illustrative.
 *
 * WHAT THIS IS NOT. It is not a description of how a model works. Nobody
 * reading this page cares. It is an account of what it was allowed to do, what
 * it was caught doing, and what it cost to stop it — which is the only part
 * anybody can act on.
 */

/** The one that matters: prose in, row out, with the sentence kept. */
export const EXAMPLE = {
  file: 'pmo/closure-reports/EFF-2021-0443.md',
  prose:
    'The existing hardware was modified. The work was on the gearbox. The existing safety case remained valid and was not reopened.',
  row: [
    { field: 'change_class', value: 'modify_hardware' },
    { field: 'element_kind', value: 'gearbox' },
    { field: 'safety_case', value: 'no' },
  ],
  why: 'None of those three is a field anywhere in the estate. Somebody — or something — has to read English and decide.',
};

/* THE THREE KINDS OF FILE USED TO BE DECLARED HERE and are now `STAGES` in
   `lib/pipeline.ts`. They were the same three things described twice — once for
   the landing page and once for this one — which is a duplication of three long
   plain-English explanations, and long prose duplicated is prose that drifts
   without anybody noticing. One source, two presentations. */

/**
 * WHAT STOPS IT INVENTING THINGS.
 *
 * `found` is the measured result rather than the intent. A safeguard nobody has
 * seen fire is a safeguard nobody can read a pass from.
 */
export const SAFEGUARDS = [
  {
    rule: 'Every fact has to quote the sentence it came from',
    how: 'The quote is then searched for in the file. If it is not there, the fact is thrown away — no second model, no human review, no list of right answers.',
    found:
      'In 1,421 facts, nothing was made up. Six quotes failed, and all six were the same dash character mangled in transit; the values were right.',
    strong: true,
  },
  {
    rule: 'Silence is not “no”',
    how: 'A report that never mentions tooling gives “the document does not say”, which is a different value from “no tooling”.',
    found:
      'Conflating them would have stated, with total confidence, that no tooling was needed on 172 jobs nobody ever wrote about.',
  },
  {
    rule: 'Refusing is a good answer',
    how: 'Roughly four questions in ten came back as “the document does not say”.',
    found: 'That is not the system failing. Those documents genuinely do not say.',
  },
  {
    rule: 'A guessed field can be spotted without an answer key',
    how: 'For each field, ask how often it answered at all. A field answered a third of the time, on documents that all look alike, is a field being guessed at.',
    found:
      'change_class answered 100% of the time and asil 2% — both healthy, because the system knows whether it can read them. reuse_class answered 37%, and it has three possible values, so random guessing scores 33%. It was guessing. A second signal agreed: it kept quoting a sentence already used for a different field.',
    strong: true,
  },
];

/* `HONESTY` LIVED HERE — the made-up-data column beside the from-the-files
   column — and went with the block it fed on 2026-09-13. It belonged to the
   cost walk that was removed before it, and on a page about what happens to a
   customer's documents it was arguing about a price. `docs/steering/
   HOW-WE-SORTED-IT.md` keeps the comparison. */
