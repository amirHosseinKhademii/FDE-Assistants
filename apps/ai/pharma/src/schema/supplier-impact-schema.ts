/**
 * The answer contract for the supplier-impact question, in Zod.
 *
 * THE QUESTION THIS FILE EXISTS TO ANSWER. `NEXT.md`'s N2 section asks it
 * directly: can a work list share `release-schema.ts`, or does pharma have two
 * answer shapes? Written after trying, not before: the first draft reused
 * `Escalation` unchanged and needed everything else new. **Verdict: two
 * shapes.** A decision has one `escalate`; a work list has exposure bands and a
 * next action PER ROW, and the central coherence rule — "a finding without a
 * named human is the system quietly deciding" — has to fire at row granularity
 * here, not once for the whole answer. That is not release's rule reused; it
 * is the same PRINCIPLE applied to a shape release cannot express at all.
 *
 * THE SHAPE IS THE SAFETY ARGUMENT, NOT THE PROMPT, same as release — but the
 * verdict this schema forbids is different. `assess-supplier-impact.ts`'s own
 * header says it plainly: "IT DOES NOT DECIDE A RECALL... A recall is a
 * regulatory decision with a legal clock, made by people with names." So there
 * is NO FIELD that can say "recall it" here either, and `coherenceErrors`
 * rejects the sentence in prose the same way release rejects "may ship" —
 * `RECALL_VERDICT` below, not `SHIP_VERDICT`.
 *
 * WHY CITATIONS ARE PLAIN STRINGS HERE, NOT `release-schema.ts`'s richer
 * `{ ref, as_of, claim, detail }` object. Release's model reasons against
 * PROCEDURE TEXT (`search_procedures`) and has to explain why a rule applies —
 * `claim`/`detail` exist to pin that reasoning to a quoted source. N2 has no
 * second tool yet: `assessSupplierImpact` already did the reasoning (exposure
 * banding, disqualification timing) and handed back plain evidence refs
 * (`mrd_tms.shipments#SHP-…`). Asking the model to invent `claim`/`detail` for
 * a fact it did not derive would be asking it to paraphrase, which is exactly
 * the ungrounded-rewrite failure `release-schema.ts` already warns about.
 * Revisit if/when N2 gets a text-retrieval tool of its own.
 *
 * WHY THERE IS NO `DATED_SOURCES` / `as_of` RULE HERE, and this is deliberate,
 * not an oversight. Release's `as_of` rule exists because a cited TABLE's
 * meaning changes with time — the same SOP revision id means something
 * different depending on which revision was in force. Every table N2 cites
 * (`product_lots`, `material_lots`, `shipments`) is a FACT, not a
 * revision-dependent rule; there is no second reading of a shipment record
 * that changes by date the way a procedure clause does. The whole dossier
 * carries a single `assessed_on` instead, because the true time-sensitivity
 * here is "as of when was this exposure map current", not "which version of a
 * rule governed."
 *
 * DOMAIN: every field here is pharmaceutical. The PATTERN — required boxes, no
 * free-text hiding place, coherence rules for what Zod cannot say — is the same
 * one `release-schema.ts` and `packages/insurance/src/schema/coverage-schema.ts`
 * both use.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';
import { EXPOSURE_ORDER } from '../tools/functions/assess-supplier-impact';

const Escalation = z.strictObject({
  reason: z
    .string()
    .describe('Why a human must decide, specifically. Not "someone should look at this."'),
  suggested_owner: z
    .string()
    .describe(
      'Who should act first, e.g. "Recall coordinator, DEPT-QA", "the receiving ' +
        'warehouse", "QA quarantine". Naming a role is routing, not a decision — the ' +
        'human still decides what happens.',
    ),
});

const Finding = z.strictObject({
  code: z
    .string()
    .describe(
      'The finding code exactly as the assessment tool gave it, e.g. ' +
        '"MADE_AFTER_DISQUALIFICATION" or "DELIVERED_TO_PATIENT_FACING". Do not ' +
        'invent codes and do not reword them.',
    ),
  in_short: z
    .string()
    .describe(
      'The finding as a label a reader scans in one second — at most a dozen ' +
        'plain words, no citation refs. The fact, not the implication for what ' +
        'should happen next; that belongs in next_action.',
    ),
  citations: z
    .array(z.string())
    .describe(
      'At least one evidence ref, copied VERBATIM from the tool output, e.g. ' +
        '"mrd_tms.shipments#SHP-26-1180". Never construct one you did not receive.',
    ),
});

/**
 * EXPORTED 2026-09-12 so a per-lot sub-agent can be asked for exactly one of
 * these. The multi-agent experiment splits the work list into 23 independent
 * judgements; each sub-agent returns one row of THIS shape, and the
 * orchestrator assembles them. Sharing the schema is the point — a sub-agent
 * answering a different shape would have to be translated, and a translation
 * layer is where a row quietly loses its escalation.
 */
export const AffectedLot = z.strictObject({
  lot_id: z.string().describe('The affected product lot, e.g. "LOT-IBU200-2609-B".'),
  product_name: z.string().describe('What this lot is, for a reader who does not know the product codes.'),
  market: z.string().describe('The market this lot was made for.'),
  quantity_units: z.number().int().describe('Units at stake in this row.'),
  exposure: z
    .enum(EXPOSURE_ORDER)
    .describe(
      'How far this lot got, copied verbatim from the assessment — never re-derive ' +
        'or soften it. This is what the row is ranked by.',
    ),
  in_short: z
    .string()
    .describe('This row in one scannable line — what happened and where the lot is now.'),
  findings: z
    .array(Finding)
    .describe(
      'Every finding the assessment attached to this lot, carried through — do not ' +
        'drop one because it looks minor. Do not add one the assessment did not ' +
        'find; if you believe there is another, put it in unverified_claims.',
    ),
  next_action: z
    .string()
    .nullable()
    .describe(
      'The single next imperative step for THIS lot, e.g. "Notify the receiving ' +
        'pharmacy chain and open a field-alert record" or "Quarantine at the ' +
        'originating warehouse; do not release to a production order." This is ' +
        'the routing step, not the final decision — a recall or a hold is still ' +
        'made by a named person. Null ONLY when exposure is "expired", where no ' +
        'action remains to take.',
    ),
  escalate: Escalation.nullable().describe(
    'Non-null whenever exposure is "patient_facing", "distributor" or ' +
      '"in_transit" — material outside our control needs a named human today. ' +
      'Null is allowed only for "in_our_control" and "expired".',
  ),
});

export const SupplierImpactAnswerSchema = z.strictObject({
  summary: z
    .string()
    .nullable()
    .describe(
      'What a recall coordinator needs to know, in plain prose, in at most three ' +
        'sentences: the scale (how many lots, how far the worst ones got) and the ' +
        'single most urgent thing. Do NOT state or imply that a recall is ' +
        'required or that any lot must be pulled — that decision belongs to ' +
        'Quality/Regulatory and this system does not make it. Null only when you ' +
        'cannot say anything useful, in which case escalate.',
    ),

  supplier_id: z.string().describe('The supplier the question was about, e.g. "SUP-04".'),
  supplier_name: z.string().describe('The supplier\'s name, for a reader who does not know the codes.'),
  disqualified_on: z
    .string()
    .nullable()
    .describe('YYYY-MM-DD the supplier was disqualified, or null if it never was.'),

  rows: z
    .array(AffectedLot)
    .describe(
      'The ranked work list, ONE ENTRY PER AFFECTED LOT, in the order the ' +
        'assessment gave them — worst exposure first. Do not reorder, drop, merge ' +
        'or invent a row; an empty array is the correct answer when nothing is ' +
        'affected.',
    ),

  preventable: z
    .array(z.string())
    .describe(
      'Estate-level findings that are not about any one lot — material from this ' +
        'supplier still flagged usable, or received after the disqualification ' +
        'date. These are the only findings here that can still be PREVENTED ' +
        'rather than remediated, which is why they are their own field rather ' +
        'than buried inside a row.',
    ),

  missing: z
    .array(z.string())
    .describe(
      'What could NOT be checked because a record is absent, one plain sentence ' +
        'each. An unchecked thing is not a cleared thing.',
    ),

  unverified_claims: z
    .array(z.string())
    .describe(
      'Anything you asserted that the assessment tool did not report. If you ' +
        'believe there is a further affected lot or delivery the tool missed, say ' +
        'so here — never add it to rows.',
    ),

  escalate: Escalation.nullable().describe(
    'Non-null whenever `preventable` is non-empty — material still usable from a ' +
      'disqualified supplier is a decision for a human today, independent of any ' +
      'single lot. May also be used for a finding about the assessment as a ' +
      'whole that does not belong to one row.',
  ),
});

// ---------------------------------------------------------------------------

/** Inferred, never hand-written. */
export type SupplierImpactAnswer = z.infer<typeof SupplierImpactAnswerSchema>;
export type SupplierImpactRow = z.infer<typeof AffectedLot>;
export type SupplierImpactFinding = z.infer<typeof Finding>;
export type { ValidationResult };

/** What gets handed to the agent as its output type. */
export const SUPPLIER_IMPACT_FORMAT = SupplierImpactAnswerSchema;

// ---------------------------------------------------------------------------

/**
 * The verdict this system exists never to state, in the forms a model writes it.
 *
 * EXPORTED 2026-09-12, and widened, because a SECOND path to an answer had been
 * built without it. The debate adjudicator (`lot-debate.ts`) wrote
 *
 *   "a recall ... IS WARRANTED unless lot-specific negative evidence is produced"
 *
 * and nothing stopped it — twice over. The phrasing was not in the pattern, and
 * more seriously the pattern was never applied to that schema at all. A new
 * route to an answer inherits the machinery and does NOT inherit the guarantee;
 * `NEXT.md` §N1 says the same thing about compliance checks in one line:
 * inheriting is not asserting.
 *
 * `warranted|justified|appropriate|called for|indicated|necessary` all carry the
 * same meaning as `required` in a QA memo. This will never be complete — it is a
 * regex over prose — which is why the SHAPE is the primary defence and this is
 * the backstop. A backstop that catches one more real sentence than it did
 * yesterday is still worth widening.
 */
export const RECALL_VERDICT =
  /\b(must|should|needs? to|has to|ought to)\s+(be\s+)?recall(ed)?\b|\binitiate\s+(a\s+|the\s+)?recall\b|\brecommend(ing|ed)?\s+(a\s+|the\s+)?recall\b|\b(warrants?|justifies|requires)\s+(a\s+|an\s+|the\s+)?(immediate\s+)?recall\b|\brecall\b[^.?!]{0,80}?\b(is|are|would be|will be|seems|appears)\s+(required|warranted|justified|appropriate|necessary|indicated|called for)\b/i;

/**
 * Does this prose state a recall decision? One implementation, two callers.
 *
 * A SHARED FUNCTION rather than an exported regex the callers each `.test()`,
 * so that widening the pattern reaches every path at once. Two copies of a
 * safety rule is how they drift apart — the same argument this file already
 * makes for keeping the row-level coherence rules in the orchestrator.
 */
/**
 * An IMPERATIVE recall, which the prose pattern above does not catch.
 *
 * `RECALL_VERDICT` looks for a claim — "a recall is warranted", "must be
 * recalled". A `next_action` is not a claim, it is an INSTRUCTION, and the
 * shortest possible form of the forbidden one is the single word:
 *
 *     next_action: "Recall"
 *
 * That shipped. A per-lot assessor was told its action must come from the
 * outcomes SOP-SCM-004 §7.3 permits, and §7.3 lists recall among the four — so
 * it selected one, correctly following an instruction that should never have
 * offered it. Nothing objected, because a bare verb matches no pattern written
 * for a sentence.
 *
 * Anchored at the START of the field: "Recall the lot" is a verdict, while
 * "Notify the consignee; escalate to the QP for a recall decision" is the
 * correct output and must pass. The owner string "Recall coordinator, DEPT-QA"
 * is a ROLE and is never passed through here.
 */
const RECALL_IMPERATIVE = /^\s*(recall|withdraw)\b(?!\s+(coordinator|decision|assessment))/i;

/**
 * Does this INSTRUCTION tell someone to recall?
 *
 * Separate from `recallVerdictIn` because the two read different shapes: a
 * claim is a sentence, an action is a command, and a command can be one word.
 */
/**
 * REFERRING a recall decision to a human, which is the CORRECT output.
 *
 * The distinction the first version missed, and it missed it on the very first
 * run after being written:
 *
 *   "Initiate a recall"                                    — forbidden
 *   "Notify the QP to decide whether to initiate a recall"  — exactly right
 *
 * Both contain "initiate a recall". Only the second puts the verb inside a
 * clause about somebody else deciding, which is the whole behaviour this system
 * is built to produce — and the guard rejected it.
 *
 * Requires the decision word to come BEFORE the recall, or the recall to be
 * immediately followed by one. "A recall is warranted; the QP will decide the
 * timing" is still a verdict and still caught: deciding the timing of a recall
 * you have already declared is not referring the decision.
 */
const RECALL_REFERRAL =
  /\b(decide|decides|deciding|decision|determine)\b[^.?!]{0,60}?\brecall\b|\brecall\b\s+(decision|is for|rests with|is a decision)/i;

/**
 * Does this INSTRUCTION tell someone to recall?
 *
 * Separate from `recallVerdictIn` because the two read different shapes: a
 * claim is a sentence, an action is a command, and a command can be one word.
 *
 * THE ORDER OF THESE THREE TESTS IS THE RULE. A bare imperative is forbidden
 * however it is dressed. Otherwise a recall phrase is only a verdict when it is
 * NOT framed as a decision for a human — because referring the decision is the
 * output this whole design exists to produce, and a guard that rejects it
 * forbids the right answer.
 */
export function recallImperativeIn(where: string, text: string): string | null {
  if (RECALL_IMPERATIVE.test(text)) {
    return `${where} INSTRUCTS a recall — this system never decides a recall; state what ` +
      'the named human must decide instead, and escalate to them';
  }
  if (RECALL_VERDICT.test(text) && !RECALL_REFERRAL.test(text)) {
    return `${where} INSTRUCTS a recall — this system never decides a recall; state what ` +
      'the named human must decide instead, and escalate to them';
  }
  return null;
}

export function recallVerdictIn(where: string, text: string): string | null {
  // A QUESTION IS NOT A VERDICT, and this distinction is the whole point of the
  // debate adjudicator: "should this lot be recalled?" put TO a Qualified Person
  // is the correct output, while "a recall is warranted" is the forbidden one.
  // Callers must not run this over a field that is a question by construction —
  // see `lot-debate.ts`, where `decision_for_human` is exempt and every
  // assertion field is not.
  if (text.trim().endsWith('?')) return null;
  return RECALL_VERDICT.test(text)
    ? `${where} states or implies a recall decision — this system never decides a ` +
        'recall; report the exposure and escalate to a named human'
    : null;
}

/** Which exposure bands mean the material has left our control. */
const OUTSIDE_OUR_CONTROL = new Set(['patient_facing', 'distributor', 'in_transit']);

/**
 * Rules Zod cannot express — this domain's, at TWO granularities where
 * release only needs one. That split is the finding this file exists to
 * record: a work list needs the "no silent decision" rule per row AND once
 * for the estate-level findings, because those are two different escalations
 * to two different people about two different things.
 */
function coherenceErrors(v: SupplierImpactAnswer): string[] {
  const errs: string[] = [];

  if (v.summary === null && v.escalate === null && v.rows.every((r) => r.escalate === null)) {
    errs.push(
      'summary is null and nothing anywhere escalates — if you cannot answer, say ' +
        'why and name an owner',
    );
  }

  // THE ROW-LEVEL VERSION of release's central rule: a finding that left our
  // control with no named human is the system quietly deciding a recall
  // question is not urgent.
  for (const r of v.rows) {
    if (OUTSIDE_OUR_CONTROL.has(r.exposure) && r.escalate === null) {
      errs.push(
        `row ${r.lot_id} has exposure "${r.exposure}" but escalate is null — material ` +
          'outside our control must go to a named human, never be resolved here',
      );
    }
    if (r.exposure !== 'expired' && r.next_action === null) {
      errs.push(
        `row ${r.lot_id} has exposure "${r.exposure}" but next_action is null — only ` +
          '"expired" rows have no remaining action',
      );
    }
    for (const f of r.findings) {
      if (f.citations.length === 0) {
        errs.push(`row ${r.lot_id} finding ${f.code} has no citations — every finding needs evidence`);
      }
    }
  }

  // THE ESTATE-LEVEL VERSION of the same rule: a preventable finding is not
  // about one lot, so it needs the top-level escalate rather than a row's.
  if (v.preventable.length > 0 && v.escalate === null) {
    errs.push(
      `${v.preventable.length} preventable finding(s) but escalate is null — material ` +
        'still usable from a disqualified supplier is a decision for a human today',
    );
  }

  // Nothing in the schema can carry a recall verdict, so the only place one
  // could hide is the prose — every prose field the model writes, checked the
  // same way release checks every place "may ship" could hide.
  const prose: [string, string][] = [
    ...(v.summary ? ([['summary', v.summary]] as [string, string][]) : []),
    ...v.rows.flatMap((r) => [
      [`${r.lot_id}.in_short`, r.in_short] as [string, string],
      ...(r.next_action ? ([[`${r.lot_id}.next_action`, r.next_action]] as [string, string][]) : []),
    ]),
  ];
  for (const [where, text] of prose) {
    // `next_action` is an INSTRUCTION and gets the stricter reading: the
    // shortest forbidden form is the single word "Recall", which no pattern
    // written for a sentence catches. Every other prose field is a claim.
    const err = where.endsWith('.next_action')
      ? recallImperativeIn(where, text)
      : recallVerdictIn(where, text);
    if (err) errs.push(err);
  }

  // A GENEROUS CEILING, NOT THE STATED LIMIT — same reasoning as release's:
  // this catches a model that ignored the field, not one a few words over.
  for (const r of v.rows) {
    if (r.in_short.trim().split(/\s+/).length > 30) {
      errs.push(`${r.lot_id}.in_short is a paragraph — it is the one-line label a reader scans`);
    }
  }

  return errs;
}

export const validateSupplierImpactAnswer = createAnswerValidator<SupplierImpactAnswer>({
  schema: SupplierImpactAnswerSchema,
  coherence: [coherenceErrors],
});
