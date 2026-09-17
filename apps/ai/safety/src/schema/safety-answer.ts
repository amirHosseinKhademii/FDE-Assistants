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
      .describe('What was counted, in plain words: "F-150 power-train complaints after the recall".'),
    value: z.number().int().describe('The number the count_complaints tool returned. Never your own arithmetic.'),
    filter: z
      .record(z.string(), z.unknown())
      .describe(
        'The exact filter passed to count_complaints. A number without the question it answers ' +
          'cannot be checked, and 1,057 and 103 are both true of the same corpus.',
      ),
  })
  .describe('A number, and the tool call that produced it.');

const Conflict = z
  .strictObject({
    topic: z.string().describe('What the documents disagree about, in a few words.'),
    positions: z
      .array(z.strictObject({ source: z.string(), says: z.string() }))
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
 */
export function countLikeNumbers(prose: string): number[] {
  const withoutDates = prose.replace(/\d{4}-\d{2}-\d{2}/g, ' ');
  const withoutIds = withoutDates.replace(/\b\d{2}[VETS]\d{6}\b/gi, ' ').replace(/\b\d{8,}\b/g, ' ');
  const found = withoutIds.match(/\b\d{1,3}(?:,\d{3})*\b/g) ?? [];
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
  if (v.answer !== null && v.citations.length === 0 && v.unverified_claims.length === 0) {
    errs.push(
      'gave an answer with no citations and no unverified_claims — every factual claim must be in ' +
        'one list or the other',
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

/** What the tools actually returned, for the rule that cannot be checked without it. */
export interface Evidence {
  /** True when `find_recalls` was called for this question and came back empty. */
  recallSearchWasEmpty: boolean;
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
  if (e.recallSearchWasEmpty && v.campaigns.length > 0) {
    return [
      `find_recalls returned nothing, but the answer cites campaign(s) [${v.campaigns.join(', ')}] — ` +
        'no recall covers this vehicle and component, and a loosely related one is not an answer',
    ];
  }
  return [];
}

export const validateSafetyAnswer = createAnswerValidator<SafetyAnswer>({
  schema: SafetyAnswerSchema,
  coherence: [coherenceErrors],
});
