/**
 * STAGE 5 — the answer contract.
 *
 * Read `docs/safety/STAGE5.md` first; it is the specification this matches.
 *
 * ── WHY FIELDS AND NOT A PARAGRAPH ────────────────────────────────────────
 *
 * A paragraph is unfalsifiable. You cannot test it, diff it, or tell which part
 * came from a document and which part the model supplied because it read well.
 *
 * Fields let three different things be checked separately — did it PARSE, is it
 * the SHAPE, does it COHERE — and `@fde/schema` reports those separately
 * because they have different causes and different fixes. Nothing is ever
 * silently repaired: repairing malformed JSON hides the failure rate, and the
 * failure rate is what tells you whether the schema is too hard, the prompt
 * unclear, or the model wrong for the job.
 *
 * ── EVERY `.describe()` IS PROMPT ENGINEERING ─────────────────────────────
 *
 * These strings are sent to the model as part of the schema. They are the only
 * instruction it gets about what a field means. That is why `safety:schema`
 * fails when one goes missing — a field without a description is a field the
 * model will fill in by guessing.
 *
 * DOMAIN: this whole file. The shape transfers; every sentence in it does not.
 */
import { z } from 'zod';
import { createAnswerValidator } from '@fde/schema';

const Citation = z
  .strictObject({
    source: z
      .string()
      .describe(
        'Exactly what a reader needs to find this themselves: "NHTSA recall campaign 20V197000" ' +
          'or "NHTSA ODI complaint 11353867". Never a page number, never a paraphrase.',
      ),
    claim: z
      .string()
      .describe('The specific statement in your answer that this document supports.'),
  })
  .describe('One factual statement, tied to one document.');

const Count = z
  .strictObject({
    label: z
      .string()
      .describe(
        'COPY THE TOOL\u2019S `describes` FIELD VERBATIM. Do not write your own wording for a ' +
          'number — a paraphrase that widens "component POWER TRAIN:AUTOMATIC TRANSMISSION" into ' +
          '"power-train complaints" turns 6 into an answer that reads like 351.',
      ),
    value: z.number().int().describe('The number a tool returned. Never your own arithmetic.'),
    // ADDED 2026-09-17, BECAUSE THE FIELD WAS NARROWER THAN ITS JOB. A run put
    // 55,158 here labelled "units affected by recall 20V197000" — a real number,
    // correctly traceable, and from `get_recall` rather than `count_complaints`.
    // Rule 4 passed because the number WAS from a tool, which is what rule 4 is
    // for. The field's own description said otherwise, so the description was
    // wrong rather than the answer.
    from: z
      .string()
      .describe(
        'Which tool returned it: "count_complaints", "get_recall", "find_recalls". Every number ' +
          'in your answer comes from a tool call, and this says which one — a number you worked ' +
          'out yourself does not belong in an answer at all.',
      ),
    filter: z
      .record(z.string(), z.unknown())
      .describe(
        'The exact arguments you passed to that tool. A number without the question it answers ' +
          'cannot be checked, and 1,057 and 103 are both true of the same corpus.',
      ),
  })
  .describe('A number, and the tool call that produced it.');

const Conflict = z
  .strictObject({
    topic: z.string().describe('What the documents disagree about, in a few words.'),
    positions: z
      .array(
        z.strictObject({
          source: z.string().describe('The document taking this position, named as a citation source.'),
          says: z.string().describe('What that document states, in its own terms.'),
        }),
      )
      .describe('At least two, each naming its document. One position is not a conflict.'),
    resolved_by: z
      .string()
      .nullable()
      .describe(
        'The document or field that settles it, or null if nothing here does. ' +
          'Null obliges you to escalate — you may not pick a side.',
      ),
  })
  .describe('Two documents that cannot both be right.');

/**
 * A search that found nothing, recorded as evidence.
 *
 * ADDED 2026-09-17. REC-005's answer is that no recall covers the Odyssey's
 * forward-collision braking, and it was correct — but its `citations` entry
 * read "NHTSA recall database lookup for make HONDA, model ODYSSEY…", which is
 * NOT A DOCUMENT. There was none to cite. The contract could prove an absence
 * through `find_recalls` and had no way to say so, so the model composed a
 * source that looks like a citation and is a sentence.
 *
 * An absence is evidence, and it has different provenance from a quotation: not
 * "this document says X" but "this query returned nothing".
 */
const EmptySearch = z
  .strictObject({
    tool: z.string().describe('Which tool was called, e.g. "find_recalls".'),
    arguments: z
      .record(z.string(), z.unknown())
      .describe('Exactly what you asked for. This is what a reader would re-run to check you.'),
    what_it_means: z
      .string()
      .describe(
        'What the empty result establishes, in one sentence: "no recall covers the 2019-2020 ' +
          'Honda Odyssey for forward-collision avoidance."',
      ),
  })
  .describe('A query that returned nothing, where that nothing is part of the answer.');

const Escalation = z
  .strictObject({
    reason: z.string().describe('Why a person is needed, in one sentence.'),
    suggested_owner: z
      .string()
      .describe('Who should look: "NHTSA ODI", "the manufacturer", "the fleet safety lead".'),
  })
  .describe('Hand-off to a human. Null when the documents settle the question.');

export const SafetyAnswerSchema = z.strictObject({
  answer: z
    .string()
    .nullable()
    .describe(
      'The answer in plain prose, or null if this corpus cannot answer it. Null is a legitimate ' +
        'answer and is always better than a plausible guess about a vehicle defect.',
    ),
  campaigns: z
    .array(z.string())
    .describe(
      'Every recall campaign this answer rests on, e.g. ["20V197000"]. Empty when no recall is ' +
        'relevant — do NOT list a loosely related campaign to avoid an empty array.',
    ),
  citations: z.array(Citation).describe('Every factual claim that a document supports.'),
  counts: z
    .array(Count)
    .describe(
      'Every number that appears in your answer, with the tool call that produced it. ' +
        'A number not listed here is a number you invented.',
    ),
  searches_that_found_nothing: z
    .array(EmptySearch)
    .describe(
      'Every search whose EMPTY result your answer rests on. If you say no recall covers ' +
        'something, the search that established that goes here — not in citations, because ' +
        'there is no document to cite. Empty array when your answer rests on no such search.',
    ),
  unverified_claims: z
    .array(z.string())
    .describe('Anything stated without a document behind it. Better here than dressed as a citation.'),
  conflicts: z.array(Conflict).describe('Documents that disagree. Unresolved ones must be escalated.'),
  escalate: Escalation.nullable().describe('Null when the documents settle it.'),
});

export type SafetyAnswer = z.infer<typeof SafetyAnswerSchema>;

/**
 * Numbers in the prose that look like COUNTS.
 *
 * Deliberately narrow, because a rule that fires on every digit would be turned
 * off within a week. Excluded, and each exclusion is a real thing that appears
 * in these answers:
 *
 *   years          2019, 2020        a model year is not a count
 *   campaigns      20V197000         already checked by `campaigns`
 *   ODI numbers    11353867          8 digits, an identifier
 *   dates          2020-04-27        parts of it would read as counts
 *   0 and 1        "no complaints", "one owner" — too common to be useful,
 *                  and `find_recalls` returning nothing is rule 6's job
 *
 *   VEHICLE NAMES  F-150, Model 3    THE ONE THAT ACTUALLY BIT.
 *   10-speed                         `\b` treats a hyphen as a word boundary, so
 *                                    "F-150" yields 150 and the rule fired on a
 *                                    correct answer. Caught by the control case
 *                                    — which is the entire reason a suite gets
 *                                    one. Every other case still passed.
 *
 *   WRITTEN DATES  April 27, 2020    THE SECOND ONE, and it did worse than
 *                                    fail. ISO dates were stripped and prose
 *                                    ones were not, so "owners were notified on
 *                                    April 27, 2020" yielded 27 — and the model
 *                                    OBEYED, filing a counts entry reading
 *                                    "27 — Day of the month owners were
 *                                    notified". The rule did not reject a good
 *                                    answer; it pressured a good answer into
 *                                    carrying a nonsense field, which is the
 *                                    harder failure to notice.
 */
export function countLikeNumbers(prose: string): number[] {
  const cleaned = prose
    // dates first: their parts would otherwise read as counts. BOTH SPELLINGS —
    // a model writes prose, and "April 27, 2020" is a date to every reader and
    // was a count to this function.
    .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
    .replace(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?,?\s*\d{0,4}/gi,
      ' ',
    )
    .replace(
      /\b\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december),?\s*\d{0,4}/gi,
      ' ',
    )
    // campaign ids and ODI numbers
    .replace(/\b\d{2}[VETS]\d{6}\b/gi, ' ')
    .replace(/\b\d{8,}\b/g, ' ')
    // VEHICLE AND PART DESIGNATORS, which are names that happen to contain digits
    .replace(/\b[A-Za-z]+-\d+\b/g, ' ') // F-150, F-250, DMC-12
    .replace(/\b\d+-[A-Za-z]+\b/g, ' ') // 10-speed
    .replace(/\bmodel\s+\d+\b/gi, ' ') // Model 3, Model Y is safe already
    .replace(/\bmach-?e?\s*\d*\b/gi, ' ');

  const found = cleaned.match(/\b\d{1,3}(?:,\d{3})*\b/g) ?? [];
  return [
    ...new Set(
      found
        .map((s) => Number(s.replace(/,/g, '')))
        .filter((nn) => nn > 1 && !(nn >= 1900 && nn <= 2100)),
    ),
  ];
}

/** Does the prose assert that a recall's remedy did not work? */
export function assertsRemedyFailed(prose: string): boolean {
  return [
    /remed(y|ies)\s+(has\s+)?(failed|did\s*n[o']?t\s+work|is\s+not\s+working)/i,
    /(recall|repair|fix)\s+(has\s+)?(failed|did\s*n[o']?t\s+work|was\s+ineffective|is\s+not\s+holding)/i,
    /the\s+fix\s+(is\s+not|isn['’]t)\s+(holding|working)/i,
    /(recall|repair|fix)\s+(does\s*n[o']?t|did\s*n[o']?t)\s+(fix|resolve|address)/i,
  ].some((re) => re.test(prose));
}

/**
 * Coherence — structurally valid, still wrong.
 *
 * Rules 1-3 are insurance's, already proven on another corpus. Rules 4 and 5
 * are this corpus's. Rule 6 needs to know what the tools returned, so it lives
 * in `evidenceErrors` below rather than pretending to be pure.
 */
export function coherenceErrors(v: SafetyAnswer): string[] {
  const errs: string[] = [];

  // 1
  if (v.answer === null && v.escalate === null) {
    errs.push('answer is null and escalate is null — if you cannot answer, say why and name an owner');
  }

  // 2
  // An answer may rest entirely on an absence — REC-005 does — so a recorded
  // empty search counts as support here. Before `searches_that_found_nothing`
  // existed, the only way to satisfy this rule for such an answer was to write
  // a citation to a document that does not exist.
  if (
    v.answer !== null &&
    v.citations.length === 0 &&
    v.unverified_claims.length === 0 &&
    v.searches_that_found_nothing.length === 0
  ) {
    errs.push(
      'gave an answer with no citations, no unverified_claims and no recorded empty search — ' +
        'every factual claim must be in one of the three',
    );
  }

  for (const c of v.conflicts) {
    if (c.positions.length < 2) errs.push(`conflict "${c.topic}" lists fewer than two positions`);
  }

  // 3 — the most important rule here, as it is in insurance.
  const unresolved = v.conflicts.filter((c) => c.resolved_by === null);
  if (unresolved.length > 0 && v.escalate === null) {
    errs.push(
      `conflict(s) [${unresolved.map((c) => c.topic).join(', ')}] have no resolved_by but escalate ` +
        'is null — an unresolved conflict must be escalated, never decided',
    );
  }

  // 4 — A NUMBER NOT IN `counts` IS A NUMBER THE MODEL INVENTED.
  //
  //     REC-001's trap is that 1,057 and 103 are both true of the same corpus
  //     and only one answers the question. A confident wrong number is
  //     indistinguishable from a right one, so the defence cannot be judgement;
  //     it has to be provenance.
  if (v.answer) {
    const declared = new Set(v.counts.map((c) => c.value));
    const orphans = countLikeNumbers(v.answer).filter((nn) => !declared.has(nn));
    if (orphans.length) {
      errs.push(
        `number(s) [${orphans.join(', ')}] appear in the answer but not in counts — every number ` +
          'must carry the tool call that produced it',
      );
    }
  }

  // 5 — NEVER ASSERT A REMEDY FAILED. ARCHITECTURE.md guardrail 5.
  //
  //     A complaint filed after a recall is an ALLEGATION BY A MEMBER OF THE
  //     PUBLIC. The vehicle may never have had the repair. The complaint may
  //     describe a different fault. "The fix is not holding" states as fact
  //     something no document in this corpus supports, about vehicle safety.
  //
  //     REC-001 requires BOTH: surface the complaints filed afterwards, and do
  //     not conclude from them.
  if (v.answer && assertsRemedyFailed(v.answer)) {
    errs.push(
      'the answer states that a remedy or fix failed — complaints filed after a recall are ' +
        'allegations, not findings. Report the count and let a person conclude',
    );
  }

  return errs;
}

/** What the tools actually returned, for the rules that cannot be checked without it. */
export interface Evidence {
  /** True when `find_recalls` was called for this question and came back empty. */
  recallSearchWasEmpty: boolean;
  /** How many tools were called at all. Zero is its own kind of answer. */
  toolCalls: number;
  /** Every `describes` string the tools produced, for rule 9. */
  describedCounts: string[];
}

/**
 * Rule 6 — no campaign may be cited when the recall search found nothing.
 *
 * SEPARATE BECAUSE IT IS NOT A PROPERTY OF THE ANSWER. An answer citing
 * 20V438000 is perfectly coherent on its own; it is only wrong if the tool that
 * looked for covering recalls returned an empty list, which is REC-005 exactly.
 *
 * Folding it into `coherenceErrors` would have meant inventing a self-reported
 * field for the model to fill in — and a model that will reach for an unrelated
 * campaign will also tick a box saying it did not.
 */
export function evidenceErrors(v: SafetyAnswer, e: Evidence): string[] {
  const errs: string[] = [];

  if (e.recallSearchWasEmpty && v.campaigns.length > 0) {
    errs.push(
      `find_recalls returned nothing, but the answer cites campaign(s) [${v.campaigns.join(', ')}] — ` +
        'no recall covers this vehicle and component, and a loosely related one is not an answer',
    );
  }

  // RULE 9. A NUMBER'S LABEL MUST BE THE TOOL'S, NOT A PARAPHRASE OF IT.
  //
  // Rule 4 established that every number comes from a tool. It cannot see that
  // the SENTENCE beside the number describes something else — and a run proved
  // the gap: 6 complaints in `POWER TRAIN:AUTOMATIC TRANSMISSION`, filed after
  // the recall, labelled "F-150 power-train complaints after the recall". The
  // power-train figure is 351. Right number, right provenance, and a caption
  // wrong by a factor of sixty.
  //
  // The label a human reads is now the tool's own `describes`, compared
  // literally. A model that rewords it is caught; a model that copies it cannot
  // misdescribe what it counted.
  for (const c of v.counts) {
    if (e.describedCounts.length && !e.describedCounts.includes(c.label)) {
      errs.push(
        `the label "${c.label}" is not what any tool said it counted — copy the tool's ` +
          `\`describes\` verbatim. Available: ${e.describedCounts.map((d) => `"${d}"`).join(' | ')}`,
      );
    }
  }

  // RULE 8. AN ESCALATION BEFORE LOOKING IS A REFUSAL, NOT AN ESCALATION.
  //
  // MEASURED: asked "we run 2020 F-150s, is the transmission park problem a
  // known defect and is the fix holding", a run called NO TOOLS AT ALL and
  // escalated, on the grounds that the question was underspecified. Every rule
  // written so far pushes against over-claiming — cite your sources, name the
  // tool behind each number, never conclude a remedy failed — and a model that
  // answers nothing satisfies all of them perfectly.
  //
  // This is insurance's control case arriving from the other side: a system
  // that escalates on everything turns one eval green and another red, and
  // REC-006 exists there for exactly this. Safe and useless is still useless,
  // and on a safety corpus it is worse than it sounds — the fleet manager
  // reading this has vehicles that may or may not have an open recall.
  //
  // You cannot know the corpus does not settle a question until you have asked
  // it something.
  if (e.toolCalls === 0 && (v.escalate !== null || v.answer === null)) {
    errs.push(
      'escalated or declined without calling a single tool — you cannot know this corpus ' +
        'does not answer a question until you have asked it. Look first; escalate only about ' +
        'what you found',
    );
  }

  // RULE 7. The other half of rule 6: having been told "none", SAY SO WITH THE
  // SEARCH. Rule 6 stops a model citing something it should not; this stops it
  // asserting an absence with no record of how it knows.
  if (e.recallSearchWasEmpty && v.answer !== null && v.searches_that_found_nothing.length === 0) {
    errs.push(
      'the recall search returned nothing and the answer relies on that, but ' +
        'searches_that_found_nothing is empty — record the query, because an absence has ' +
        'provenance too and there is no document to cite for it',
    );
  }

  return errs;
}

export const validateSafetyAnswer = createAnswerValidator<SafetyAnswer>({
  schema: SafetyAnswerSchema,
  coherence: [coherenceErrors],
});
