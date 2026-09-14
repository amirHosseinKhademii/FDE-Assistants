/**
 * The answer contract for the release question, in Zod.
 *
 * THE SHAPE IS THE SAFETY ARGUMENT, NOT THE PROMPT. Under EU GMP Annex 16 a
 * batch is certified by a named Qualified Person who is personally liable for
 * it. So this schema has NO FIELD THAT CAN SAY "RELEASE IT" — not a boolean, not
 * an enum, not a verdict. The strongest thing the model can produce is a file of
 * blockers, concerns, evidence and gaps for a QP to sign or refuse. That is not
 * timidity; it is the only shape a regulator could accept, and it is what makes
 * the thing deployable without anyone having to validate a language model.
 *
 * WHY `blockers` IS SEPARATE FROM `citations`. The deterministic walk
 * (`tools/functions/release.ts`) already FOUND the blockers; the model's job is
 * to explain why each one blocks, using the procedure text. Keeping them apart
 * means an eval can assert "the lapsed-training blocker survived into the
 * answer" without caring how it was worded.
 *
 * EVERY CITATION CARRIES `as_of`, AND THAT IS THE POINT OF THE WHOLE DOMAIN.
 * `mrd_reg.sop_revisions#SOP-QC-014 Rev 7` is not checkable —
 * `…Rev 7 as of 2026-09-04` is. Rev 6 carried no training precondition and Rev 7
 * does, so the same citation without a date is consistent with both the right
 * answer and its opposite. `coherenceErrors` rejects a dated-source citation
 * that omits it. Insurance has no equivalent of this rule.
 *
 * READABILITY IS A SCHEMA PROBLEM HERE, NOT A UI ONE. `in_short` and
 * `what_would_clear_it` exist because the page was unreadable and the obvious
 * fix — hand the finished answer to a model and ask for a friendlier version —
 * is the one thing this contract forbids. A second pass is an ungrounded
 * paraphrase that no schema checks, and it is precisely where "clear the
 * outstanding paperwork and it ships" would enter. So the compression is asked
 * for in the SAME call, as fields, where `coherenceErrors` can hold it to the
 * same rules as everything else. `what_would_clear_it` was already being written
 * — buried mid-paragraph inside `summary` — which is the sign a field is missing.
 *
 * THE DESCRIPTIONS ARE PROMPT ENGINEERING, NOT DOCUMENTATION. They are what the
 * model reads. Editing one is editing the prompt.
 *
 * DOMAIN: every field here is pharmaceutical. The PATTERN — required boxes, no
 * free-text hiding place, coherence rules for what Zod cannot say — is the same
 * one `packages/insurance/src/schema/coverage-schema.ts` uses.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';

/** Tables whose meaning depends on the day they are read. A citation to one without a date is not checkable. */
const DATED_SOURCES = [
  'sop_revisions',
  'training_records',
  'batch_dispositions',
  'equipment_qualification',
  'market_authorisations',
  'qualifications',
  'signature_authority',
];

const Citation = z.strictObject({
  ref: z
    .string()
    .describe(
      'Exactly where this came from, as "<database>.<table>#<key>" — e.g. ' +
        '"mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF)". For procedure text ' +
        'retrieved from the knowledge base, use "sop:<REVISION_ID>#<section>", ' +
        'e.g. "sop:SOP-QC-014 Rev 7#7.3". Copy refs from the tool output; never ' +
        'construct one you did not receive.',
    ),
  as_of: z
    .string()
    .nullable()
    .describe(
      'The date this source was evaluated as of, YYYY-MM-DD — normally the date ' +
        'of the act being judged, not today. REQUIRED for anything whose meaning ' +
        'changes over time: SOP revisions, training records, dispositions, ' +
        'equipment qualifications, authorisations. Null only for a source that ' +
        'cannot go stale.',
    ),
  claim: z.string().describe('The specific statement this source supports.'),
  detail: z
    .string()
    .describe(
      'The exact value or wording relied on, quoted — "expires_on 2026-08-24", ' +
        'or the clause text verbatim. An auditor reads this against the original.',
    ),
});

const Blocker = z.strictObject({
  code: z
    .string()
    .describe(
      'The code exactly as the assessment tool gave it, e.g. ' +
        '"CERTIFIER_TRAINING_LAPSED". Do not invent codes and do not reword them.',
    ),
  in_short: z
    .string()
    .describe(
      'The finding as a label a reader scans in one second — at most a dozen ' +
        'plain words, no clause numbers, no citation refs. "The certifying QP\'s ' +
        'GMP refresher had expired", not the rule and not the evidence; those go ' +
        'in why_it_blocks and citations, which sit directly underneath it. ' +
        'Never phrase it as a verdict on whether the batch may ship.',
    ),
  why_it_blocks: z
    .string()
    .describe(
      'The rule that makes this fact a blocker, not just the fact. "Her GMP ' +
        'refresher had expired" is the fact; "SOP-QC-014 Rev 7 §7.3, in force on ' +
        'the day, makes a certification without one invalid" is why it blocks. ' +
        'If you cannot name the rule, say so and escalate.',
    ),
  citations: z
    .array(Citation)
    .describe('At least one. The evidence for the fact AND, where you have it, for the rule.'),
});

const Escalation = z.strictObject({
  reason: z
    .string()
    .describe('Why a human must decide, specifically. Not "I am unsure."'),
  suggested_owner: z
    .string()
    .describe(
      'Who should take it, e.g. "Qualified Person, DEPT-QA", "QA manager", ' +
        '"the originating production supervisor".',
    ),
});

export const ReleaseAnswerSchema = z.strictObject({
  summary: z
    .string()
    .nullable()
    .describe(
      'What a release coordinator needs to know, in plain prose, in at most ' +
        'three sentences. State what stands in the way. Do NOT list the ' +
        'remediation steps here — they belong in what_would_clear_it, one per ' +
        'entry, and repeating them in both places is how this page became ' +
        'unreadable. Do NOT state or imply that the batch may ship — that ' +
        'decision is the QP\'s and this system does not make it. Null only when ' +
        'you cannot say anything useful, in which case escalate.',
    ),

  lot_id: z.string().describe('The lot the answer is about, e.g. "LOT-IBU200-2609-B".'),

  market: z
    .string()
    .describe(
      'The destination market the question was asked about, e.g. "EU". This ' +
        'decides which limits and which rules apply; never answer about a ' +
        'different one.',
    ),

  governing_spec_version: z
    .string()
    .nullable()
    .describe(
      'The specification version the DESTINATION\'s marketing authorisation was ' +
        'granted against — not the one the lot was manufactured to, when they ' +
        'differ. Null when there is no authorisation for this market.',
    ),

  blockers: z
    .array(Blocker)
    .describe(
      'One entry per finding that prevents release, carried through from the ' +
        'assessment. Do not drop one because it looks procedural rather than ' +
        'product-related — a certification signed without valid training is ' +
        'invalid however good the tablets are. Do not add one the assessment did ' +
        'not find; if you believe there is another, put it in unverified_claims.',
    ),

  concerns: z
    .array(Blocker)
    .describe(
      'Findings that do not prevent release but that the QP should see — a ' +
        'resolved out-of-specification result, a supplier disqualified after the ' +
        'material was used. Same shape as a blocker; the difference is severity, ' +
        'and the assessment tool already decided it.',
    ),

  what_would_clear_it: z
    .array(z.string())
    .describe(
      'What would have to be DONE AND RECORDED before a Qualified Person could ' +
        'review this lot — one short imperative step per entry, in the order they ' +
        'must happen, e.g. "Complete and approve the SOP-QC-003 out-of-' +
        'specification investigation for the dissolution failure." Name the ' +
        'procedure where one governs the step. This is not a prediction that the ' +
        'batch will clear and it is not a verdict: it is the list of gates, and ' +
        'the QP still decides after every one of them is met. Empty when nothing ' +
        'was found blocking; never empty when there is a blocker.',
    ),

  missing: z
    .array(z.string())
    .describe(
      'What could NOT be checked because a record is absent, one plain sentence ' +
        'each. An unchecked thing is not a passed thing, and an empty array here ' +
        'is a strong statement that will be audited.',
    ),

  unverified_claims: z
    .array(z.string())
    .describe(
      'Anything you asserted that no tool checked and no retrieved document ' +
        'states. Reasoning by analogy from a nearby clause belongs here. If the ' +
        'procedures do not address the situation, saying so is the correct ' +
        'answer, not a failure.',
    ),

  escalate: Escalation.nullable().describe(
    'Non-null when a human must decide. Escalate whenever there is a blocker, ' +
      'when a record needed for the decision is missing, when the procedures do ' +
      'not address the situation, or when two sources disagree. Escalating is ' +
      'cheap and visible; a confident wrong answer about a batch release is not.',
  ),
});

// ---------------------------------------------------------------------------

/** Inferred, never hand-written. */
export type ReleaseAnswer = z.infer<typeof ReleaseAnswerSchema>;
export type ReleaseCitation = z.infer<typeof Citation>;
export type ReleaseBlocker = z.infer<typeof Blocker>;
export type { ValidationResult };

/** What gets handed to the agent as its output type. */
export const RELEASE_FORMAT = ReleaseAnswerSchema;

// ---------------------------------------------------------------------------

/**
 * Does this citation point at something whose meaning depends on the date?
 *
 * `sop:` IS THE MOST DATE-DEPENDENT REF OF ALL, and it was exempt until
 * `pnpm checks:check` caught it. `DATED_SOURCES` lists TABLES, matched as
 * `.<table>#` — which covers `mrd_reg.sop_revisions#…` but not a citation to the
 * procedure TEXT, written `sop:SOP-QC-014 Rev 7#7.3`. That is precisely the
 * citation where a missing date is fatal: Rev 6 carried no training precondition
 * and Rev 7 does, so the undated form is consistent with the right answer and
 * its exact opposite. The rule was being enforced on the row and waived on the
 * clause the row points at.
 */
export function isDatedSource(ref: string): boolean {
  if (ref.startsWith('sop:')) return true;
  return DATED_SOURCES.some((t) => ref.includes(`.${t}#`));
}

/**
 * Rules Zod cannot express — THIS domain's.
 *
 * Zod checks shape. It cannot check that a blocker was escalated, or that a
 * citation to a time-varying table carried the date it was read as of. Both of
 * those are structurally valid objects and completely wrong answers.
 *
 * Each message is written for the MODEL, because it is handed straight back on
 * retry.
 */
/** The verdict this system exists never to state, in the forms a model writes it. */
const SHIP_VERDICT = /\b(may|can) (now )?(be released|ship|be shipped)\b/i;

function coherenceErrors(v: ReleaseAnswer): string[] {
  const errs: string[] = [];

  if (v.summary === null && v.escalate === null) {
    errs.push(
      'summary is null and escalate is null — if you cannot answer, say why and ' +
        'name an owner in escalate',
    );
  }

  // The single most important rule in this file. A blocker that was not
  // escalated means the system quietly decided a batch-release question that is
  // legally a named human's to decide.
  if (v.blockers.length > 0 && v.escalate === null) {
    errs.push(
      `${v.blockers.length} blocker(s) [${v.blockers.map((b) => b.code).join(', ')}] ` +
        'but escalate is null — a blocker must go to a human, never be resolved here',
    );
  }

  for (const b of [...v.blockers, ...v.concerns]) {
    if (b.citations.length === 0) {
      errs.push(`finding ${b.code} has no citations — every finding must name its evidence`);
    }
    for (const c of b.citations) {
      if (isDatedSource(c.ref) && !c.as_of) {
        errs.push(
          `citation "${c.ref}" has no as_of — that source means different things on ` +
            'different dates, so a citation without the date it was read as of is ' +
            'not checkable',
        );
      }
    }
  }

  // Nothing else in the schema can carry a verdict, so the only place a
  // "ship it" could hide is the prose — and EVERY prose field is such a place.
  // When `in_short` and `what_would_clear_it` were added for readability they
  // were added to this loop in the same commit: a guard that covers the oldest
  // prose field and not the newest one is decorative. `what_would_clear_it` is
  // the likeliest of the three, because "do these two things and it may ship"
  // is the natural way to write a remediation list and it is exactly the
  // sentence this system must never produce.
  if (v.blockers.length > 0) {
    const prose: [string, string][] = [
      ...(v.summary ? ([['summary', v.summary]] as [string, string][]) : []),
      ...v.what_would_clear_it.map((s, i) => [`what_would_clear_it[${i}]`, s] as [string, string]),
      ...[...v.blockers, ...v.concerns].map(
        (b) => [`in_short of ${b.code}`, b.in_short] as [string, string],
      ),
    ];
    for (const [where, text] of prose) {
      if (SHIP_VERDICT.test(text)) {
        errs.push(
          `${where} says the batch may be released while blockers are listed — this ` +
            'system never states that a batch may ship; report the blockers and escalate',
        );
      }
    }
  }

  // A blocker with no stated remedy is the model declining to finish the
  // sentence. It knows what the procedure requires — it just quoted the clause —
  // and leaving the reader to work the steps out of the rule text is the
  // readability failure this field exists to fix.
  if (v.blockers.length > 0 && v.what_would_clear_it.length === 0) {
    errs.push(
      `${v.blockers.length} blocker(s) but what_would_clear_it is empty — say what ` +
        'would have to be done and recorded before a QP could review this lot',
    );
  }

  // A GENEROUS CEILING, NOT THE STATED LIMIT. `in_short` asks for a dozen words;
  // rejecting at thirteen would fail answers that are perfectly readable and
  // turn a formatting preference into a retry, which shows up as eval flakiness.
  // This only catches the real failure — a model that ignored the field and
  // pasted the explanation into it.
  for (const b of [...v.blockers, ...v.concerns]) {
    if (b.in_short.trim().split(/\s+/).length > 30) {
      errs.push(
        `in_short of ${b.code} is a paragraph — it is the one-line label a reader ` +
          'scans; put the explanation in why_it_blocks',
      );
    }
  }

  return errs;
}

export const validateReleaseAnswer = createAnswerValidator<ReleaseAnswer>({
  schema: ReleaseAnswerSchema,
  coherence: [coherenceErrors],
});
