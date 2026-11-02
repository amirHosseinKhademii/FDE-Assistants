/**
 * The answer contract, in Zod.
 *
 * One rule shapes it: state a fact only when a passage from the cooperative's own
 * documents says it. The shape makes that structural rather than merely requested.
 *
 *   citations[]         what IS backed, by file and section
 *   unverified_claims[] what is NOT backed, admitted plainly
 *   conflicts[]         where two documents disagree
 *   escalate            when a board member has to decide
 *
 * There is no free-text field where an unchecked claim can hide. The model can still
 * guess, but the guess has nowhere to land except the unverified box.
 *
 * The .describe() strings are prompt text. Editing one edits the prompt, so run the
 * eval suite before believing that a change is an improvement.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';

const Citation = z.strictObject({
  file: z
    .string()
    .describe(
      'The document file name exactly as a search result gave it, e.g. "stadgar.md". ' +
        'Never invent a file name.',
    ),
  section: z
    .string()
    .describe(
      'The section label exactly as the passage gave it, e.g. "§ 9". Use the heading text ' +
        'only when the passage has no § label.',
    ),
  claim: z.string().describe('The specific statement this passage supports.'),
  detail: z
    .string()
    .describe(
      'The exact wording relied on, quoted from the passage. Not a paraphrase: a board member ' +
        'reads this against the original.',
    ),
});

const Position = z.strictObject({
  file: z.string().describe('The document file name, exactly as a search result gave it.'),
  section: z.string().describe('The section label, exactly as the passage gave it.'),
  says: z.string().describe('What this passage states.'),
});

const Conflict = z.strictObject({
  topic: z.string().describe('What the documents disagree about, in a few words.'),
  positions: z.array(Position).describe('One entry per conflicting passage. At least two.'),
  resolved_by: z
    .string()
    .nullable()
    .describe(
      'The passage that states which decision governs, written as "file § section", for example ' +
        '"protokoll-2025-03-12.md § 2". Null when no passage states it. In that case escalate.',
    ),
});

const Escalation = z.strictObject({
  reason: z
    .string()
    .describe('Why a board member is needed, specifically. Not "I am not sure".'),
  suggested_owner: z
    .string()
    .describe('Who should decide, for example "styrelsen", "förvaltaren" or "föreningsstämman".'),
});

export const BrfAnswerSchema = z.strictObject({
  answer: z
    .string()
    .nullable()
    .describe(
      'The answer in Swedish, in plain prose, with the finding first. Null when you cannot answer ' +
        'at all. For a partial answer, give it here AND set escalate.',
    ),

  citations: z
    .array(Citation)
    .describe(
      'One entry per factual claim backed by a passage you retrieved. A claim with no entry here ' +
        'belongs in unverified_claims instead.',
    ),

  unverified_claims: z
    .array(z.string())
    .describe(
      'Anything asserted that no passage supports. Be honest: an empty array is a strong statement ' +
        'and will be audited.',
    ),

  conflicts: z
    .array(Conflict)
    .describe(
      'Where two or more passages disagree on the same point. Do NOT resolve a conflict by picking ' +
        'the newer or the more specific document. Report it here, cite both sides, and escalate ' +
        'unless a passage states which decision governs.',
    ),

  escalate: Escalation.nullable().describe(
    'Non-null when a board member must decide: no passage addresses the question, a conflict has ' +
      'no resolved_by, or the answer needs a decision the documents do not contain. Escalating is ' +
      'cheap and visible. A wrong confident answer is neither.',
  ),
});

// ---------------------------------------------------------------------------

/** Inferred, never hand-written. */
export type BrfAnswer = z.infer<typeof BrfAnswerSchema>;
export type Citation = z.infer<typeof Citation>;
export type Conflict = z.infer<typeof Conflict>;
export type { ValidationResult };

/** What gets handed to the agent as its output type. */
export const ANSWER_FORMAT = BrfAnswerSchema;

/**
 * A refusal is the defined answer to "the documents do not say". It makes no claim,
 * so it needs no citation. The sentence is fixed and the UI shows it verbatim, so it
 * lives here and nowhere else.
 */
export const REFUSAL_SENTENCE = 'Det framgår inte av föreningens dokument.';
export const REFUSAL_TEXT = `${REFUSAL_SENTENCE} Kontakta styrelsen eller förvaltaren.`;

/**
 * True only for a refusal: nothing cited, nothing claimed, no conflict, escalated, and
 * the answer either absent or exactly the refusal text. A non-refusal with no citations
 * is still rejected, so this does not loosen the citation rule. It only names the case
 * where there is nothing to cite.
 */
export function isRefusal(v: Pick<BrfAnswer, 'answer' | 'citations' | 'unverified_claims' | 'conflicts' | 'escalate'>): boolean {
  if (v.escalate === null) return false;
  if (v.citations.length > 0 || v.unverified_claims.length > 0 || v.conflicts.length > 0) return false;
  if (v.answer === null) return true;
  const a = v.answer.trim();
  return a === REFUSAL_SENTENCE || a === REFUSAL_TEXT;
}

/**
 * Rules that Zod cannot express. Each message is written for the MODEL to act on,
 * because the message goes straight back to it on a retry.
 */
function coherenceErrors(v: BrfAnswer): string[] {
  const errs: string[] = [];

  if (v.answer === null && v.escalate === null) {
    errs.push(
      'answer is null and escalate is null, so there is nothing to act on: if you cannot answer, ' +
        'say why and name an owner in escalate.',
    );
  }

  if (v.answer !== null && v.citations.length === 0 && v.unverified_claims.length === 0 && !isRefusal(v)) {
    errs.push(
      'gave an answer with no citations and no unverified_claims. Every factual claim must be in ' +
        'one list or the other. If the documents say nothing, that is a refusal, not an answer: set ' +
        `answer to exactly "${REFUSAL_TEXT}", leave citations, unverified_claims and conflicts empty, ` +
        'and set escalate.',
    );
  }

  for (const c of v.conflicts) {
    if (c.positions.length < 2) {
      errs.push(`conflict "${c.topic}" lists fewer than two positions.`);
    }
  }

  // An unresolved conflict that did not escalate is the dangerous case. It means the
  // model silently picked a side between two documents, so this is the rule that
  // matters most.
  const unresolved = v.conflicts.filter((c) => c.resolved_by === null);
  if (unresolved.length > 0 && v.escalate === null) {
    errs.push(
      `conflict(s) [${unresolved.map((c) => c.topic).join(', ')}] have no resolved_by, but escalate ` +
        'is null. An unresolved conflict must be escalated, never decided.',
    );
  }

  return errs;
}

/**
 * Parse and validate. The three failure modes (unparseable, wrong shape, incoherent)
 * are reported separately, because each has a different cause and a different fix.
 * Nothing is repaired silently. A repaired answer would hide the failure rate, and the
 * failure rate is what shows whether the schema, the prompt or the model is the problem.
 */
export const validateBrfAnswer = createAnswerValidator<BrfAnswer>({
  schema: BrfAnswerSchema,
  coherence: [coherenceErrors],
});
