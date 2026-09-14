/**
 * @fde/schema — turn a model's text into a validated object, or a message it
 * can act on.
 *
 * THREE FAILURE MODES, REPORTED DIFFERENTLY, because they have different causes
 * and different fixes:
 *
 *   unparseable      truncation, or a refusal written in prose
 *   wrong shape      valid JSON that does not match the contract
 *   incoherent       a valid object that contradicts itself
 *
 * THE THIRD IS THE ONE PEOPLE FORGET, and it is why this package exists rather
 * than a bare `schema.safeParse`. A schema checks SHAPE — are the fields there,
 * are they the right types. It cannot check COHERENCE: "answer is null and
 * escalate is also null" is a perfectly valid object and a completely useless
 * response. So coherence rules are a first-class input here, not an afterthought
 * bolted on by the caller.
 *
 * WHY THE RULES ARE NOT ZOD REFINEMENTS. Folding them into the schema sounds
 * tidier and is worse: a refinement failure surfaces as a generic schema error,
 * and these rules need their OWN messages — because the message is what gets
 * handed back to the model to fix. A model told "invalid input" retries
 * randomly; one told "you recorded a conflict with no resolution and did not
 * escalate" fixes the actual problem.
 *
 * WHAT IS DELIBERATELY NOT HERE: your fields. The shape of a good answer is the
 * most domain-specific thing in any of these packages, and hand-writing it is
 * the point — see the note on structural honesty in your own schema file.
 */

/** Anything with Zod's `safeParse`. Kept structural so any Zod major works. */
export interface ParsableSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  /** Human-readable, and fed back to the model verbatim on retry. */
  errors?: string;
}

/**
 * A rule the type system cannot express. Returns one message per violation.
 *
 * Write these as statements about what is WRONG and what to do instead. They
 * are read by a model, not a developer.
 */
export type CoherenceRule<T> = (value: T) => string[];

export interface AnswerValidatorOptions<T> {
  schema: ParsableSchema<T>;
  /** Applied only after the shape check passes. */
  coherence?: Array<CoherenceRule<T>>;
  /** Turn a schema error into a message a model can act on. */
  formatSchemaError?(error: unknown): string;
}

/**
 * Default schema-error formatter, written for Zod's issue list.
 *
 * Reports the PATH of each problem — `/conflicts/0/positions` — because a model
 * given "invalid input" has to guess which field, and guessing is what produced
 * the invalid output in the first place.
 */
function defaultFormat(error: unknown): string {
  const issues = (error as { issues?: Array<{ path: unknown[]; message: string }> })?.issues;
  if (!issues) return String(error);
  return issues
    .map((i) => `${i.path.length ? `/${i.path.join('/')}` : '(root)'} ${i.message}`)
    .join('; ');
}

/**
 * Build a validator.
 *
 * NOTE WHAT IT DOES NOT DO: repair. Silently fixing malformed JSON hides the
 * failure rate, and the failure rate is a number you need — it tells you
 * whether the schema is too hard, the prompt is unclear, or the model is wrong
 * for the job. Those have three different fixes and one of them is expensive.
 */
export function createAnswerValidator<T>(opts: AnswerValidatorOptions<T>) {
  const format = opts.formatSchemaError ?? defaultFormat;

  return function validate(raw: string): ValidationResult<T> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { ok: false, errors: `not valid JSON: ${(e as Error).message}` };
    }

    const result = opts.schema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, errors: `does not match schema: ${format(result.error)}` };
    }

    const problems = (opts.coherence ?? []).flatMap((rule) => rule(result.data));
    if (problems.length) {
      return { ok: false, errors: `internally inconsistent: ${problems.join('; ')}` };
    }

    return { ok: true, value: result.data };
  };
}

export {
  verifyValidator,
  verifyDescriptions,
  type ValidatorCase,
  type VerifyResult,
} from './verify';
