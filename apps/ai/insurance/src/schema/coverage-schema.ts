/**
 * The answer contract, in Zod.
 *
 * WHY ZOD AND NOT HAND-WRITTEN JSON SCHEMA, which is what this file used to be.
 * The old version kept a JSON Schema object and a TypeScript `interface` side by
 * side, maintained by hand, with nothing to catch them diverging — rename a
 * field in one and not the other and it fails at runtime, silently. The type is
 * now INFERRED from the schema, so that class of bug is gone by construction.
 *
 * The old file argued for hand-writing on the grounds that "THIS EXACT OBJECT is
 * what gets sent to the model", with no translation layer guessing on your
 * behalf. That was worth testing rather than believing. Handing this schema to
 * the Agents SDK and capturing the actual outgoing request gives:
 *
 *     strict                       : true
 *     has $ref / $defs             : false      <- reused Citation is inlined
 *     additionalProperties: false  : every object
 *     nullable                     : type: ["string","null"]
 *
 * No `$ref`, which was the real risk — OpenAI strict mode is unforgiving about
 * them and `Citation` appears twice. The generated schema is inspectable in one
 * line if you ever need to read exactly what the model was given.
 *
 * The deciding argument is not elegance, it is interop: Zod is what LangChain
 * and the Agents SDK both speak, for tool parameters as well as output. One
 * schema language across the stack, and the `as never` casts disappear.
 *
 * THE DESCRIPTIONS BELOW ARE PROMPT ENGINEERING, NOT DOCUMENTATION. "Be honest;
 * an empty array is a strong statement and will be audited" is doing work. They
 * are ported verbatim from the hand-written version. If you edit one, you are
 * editing the prompt — re-run `pnpm eval` before believing it is an improvement.
 *
 * The shape encodes the project's one rule — only assert a checkable fact if a
 * tool checked it or a document says it — by making the distinction structural
 * rather than aspirational:
 *
 *   citations[]         what IS backed, and by exactly what
 *   unverified_claims[] what ISN'T, admitted plainly
 *   conflicts[]         where the documents disagree with each other
 *   escalate            when a human has to decide
 *
 * There is deliberately no free-text field a factual claim can hide in. The
 * model cannot write a confident paragraph that mixes three checked facts with
 * one invention, because it cannot write a paragraph at all. A guess still gets
 * made — it just has nowhere to land except a box labelled "unchecked."
 *
 * WHY THE `conflicts` FIELD EXISTS, when the travel-assistant version has no
 * such thing: this corpus contains a deliberate contradiction. PA-2023-01 §4.4
 * says rental reimbursement is $40/day for 30 days; endorsement PA-END-2024-03
 * says $50/day for 21 days; neither document states which policies it attaches
 * to. Without somewhere to put "these two disagree," a model has exactly two
 * options, and both are wrong: silently pick one, or refuse entirely. A named
 * box makes surfacing the conflict the cheap, obvious path — and gives evals a
 * field to assert on. *
 * DOMAIN: the fields are insurance. The PATTERN transfers: required boxes, no
 * free-text hiding place, and coherenceErrors() for combinations Zod cannot express.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';

const Citation = z.strictObject({
  source: z
    .string()
    .describe(
      'Where this came from. Exactly one of: "policy:<FORM_ID>#<section>" ' +
        'for a policy wording (e.g. "policy:PA-END-2024-03#daily-limit"), or ' +
        '"record:<POLICY_ID>" for a policyholder record (e.g. ' +
        '"record:AUT-4471"). Never invent a source you did not receive from a ' +
        'tool.',
    ),
  claim: z.string().describe('The specific statement this source supports.'),
  detail: z
    .string()
    .describe(
      'The exact wording relied on, quoted from the retrieved passage. Not ' +
        'a paraphrase — an auditor reads this against the original.',
    ),
});

const Position = z.strictObject({
  source: z.string().describe('Same format as a citation source.'),
  says: z.string().describe('What this document states.'),
});

const Conflict = z.strictObject({
  topic: z.string().describe('What the documents disagree about, in a few words.'),
  positions: z
    .array(Position)
    .describe('One entry per conflicting position. At least two.'),
  resolved_by: z
    .string()
    .nullable()
    .describe(
      'The source that settles which document governs — normally a ' +
        'policyholder record naming the attached endorsements. Null when ' +
        'nothing in the corpus settles it, in which case escalate.',
    ),
});

const Escalation = z.strictObject({
  reason: z
    .string()
    .describe('Why a human is needed, specifically. Not "I am unsure."'),
  suggested_owner: z
    .string()
    .describe(
      'Who should take it, e.g. "underwriting referral desk", ' +
        '"claims desk supervisor", "product operations".',
    ),
});

export const CoverageAnswerSchema = z.strictObject({
  answer: z
    .string()
    .nullable()
    .describe(
      "The answer to the adjuster's question, in plain prose. Null when you " +
        'cannot answer at all. If you can answer partially — enough to save the ' +
        'adjuster the lookup, but not enough to be certain — give the partial ' +
        'answer here AND set escalate. A partial answer with a flag is more ' +
        'useful than a refusal.',
    ),

  policy_id: z
    .string()
    .nullable()
    .describe(
      'The policyholder record this answer is about, e.g. "AUT-4471". Null ' +
        'when the question is about a policy form generally and names no ' +
        'customer.',
    ),

  policy_form: z
    .string()
    .nullable()
    .describe(
      'The policy form the answer is based on, e.g. "PA-2023-01". Get this ' +
        'from the policyholder record — do NOT assume the national form. Null ' +
        'only when no specific form applies.',
    ),

  citations: z
    .array(Citation)
    .describe(
      'One entry per factual claim that is backed by a document you actually ' +
        'retrieved. A claim with no entry here belongs in unverified_claims ' +
        'instead. There is no third option.',
    ),

  unverified_claims: z
    .array(z.string())
    .describe(
      'Anything you asserted that no tool checked and no document supports. ' +
        'Be honest; an empty array is a strong statement and will be audited. ' +
        'Reasoning by analogy from a nearby clause belongs here — if the ' +
        'documents do not address the situation, saying so is the correct ' +
        'answer, not a failure.',
    ),

  conflicts: z
    .array(Conflict)
    .describe(
      'Where two or more retrieved documents disagree on the same point. Do ' +
        'NOT resolve a conflict by picking the newer document, the more ' +
        'specific one, or the one that seems more likely. Report it here, cite ' +
        'both sides, and escalate unless a policyholder record settles which ' +
        'document governs.',
    ),

  escalate: Escalation.nullable().describe(
    'Non-null when a human must decide. Escalate when: the documents do ' +
      'not address the situation at all; a conflict has no resolved_by; a ' +
      'record is missing or its endorsements are unconfirmed; or the answer ' +
      'would require reasoning beyond what the documents state. Escalating ' +
      'is cheap and visible. A wrong confident answer is neither.',
  ),
});

// ---------------------------------------------------------------------------

/** Inferred, never hand-written. This is the whole point of the file. */
export type CoverageAnswer = z.infer<typeof CoverageAnswerSchema>;
export type { ValidationResult };
export type Citation = z.infer<typeof Citation>;
export type Conflict = z.infer<typeof Conflict>;

/** What gets handed to the agent as its output type. */
export const COVERAGE_FORMAT = CoverageAnswerSchema;

// ---------------------------------------------------------------------------


/**
 * Rules Zod cannot express — THIS domain's.
 *
 * A schema checks SHAPE: are the fields present, are they the right types. It
 * cannot check COHERENCE: "answer is null and escalate is also null" is a
 * perfectly valid object and a completely useless response.
 *
 * Each returns a message written for the MODEL to act on, because that message
 * is handed straight back on retry. `@fde/schema` runs them; what they say is
 * insurance.
 */
function coherenceErrors(v: CoverageAnswer): string[] {
  const errs: string[] = [];

  if (v.answer === null && v.escalate === null) {
    errs.push(
      'answer is null and escalate is null — if you cannot answer, say why and ' +
        'name an owner in escalate',
    );
  }

  if (v.answer !== null && v.citations.length === 0 && v.unverified_claims.length === 0) {
    errs.push(
      'gave an answer with no citations and no unverified_claims — every ' +
        'factual claim must be in one list or the other',
    );
  }

  for (const c of v.conflicts) {
    if (c.positions.length < 2) {
      errs.push(`conflict "${c.topic}" lists fewer than two positions`);
    }
  }

  // An unresolved conflict that did not escalate is the dangerous case: it
  // means the model silently picked a side. This is the single most important
  // rule in this file.
  const unresolved = v.conflicts.filter((c) => c.resolved_by === null);
  if (unresolved.length > 0 && v.escalate === null) {
    errs.push(
      `conflict(s) [${unresolved.map((c) => c.topic).join(', ')}] have no ` +
        `resolved_by but escalate is null — an unresolved conflict must be ` +
        `escalated, never decided`,
    );
  }

  return errs;
}

/**
 * Parse and validate.
 *
 * The three failure modes — unparseable, wrong shape, incoherent — are reported
 * separately by `@fde/schema` because they have different causes and different
 * fixes. Nothing is ever silently repaired: repairing malformed JSON hides the
 * failure rate, and the failure rate tells you whether the schema is too hard,
 * the prompt is unclear, or the model is wrong for the job.
 */
export const validateCoverageAnswer = createAnswerValidator<CoverageAnswer>({
  schema: CoverageAnswerSchema,
  coherence: [coherenceErrors],
});
