/**
 * When is the loop finished, and what does a schema failure cost?
 *
 * WHY THIS IS SHARED AND NOT COPIED, and it is a correctness argument rather
 * than a tidiness one. Every engine ran the same twenty-five lines here, ending
 * in the same retry sentence written out three times:
 *
 *     "Your previous response did not satisfy the required schema: …"
 *
 * That sentence is a PROMPT. Three copies means one of them can be improved, or
 * typo-fixed, or reworded by a find-and-replace that misses a file — and from
 * then on an engine comparison is partly measuring a prompt difference while
 * reporting it as an engine difference. `eval:diff` would not catch it: the
 * engine is part of the setup key, so the two runs are never compared directly.
 * The whole reason three engines exist is that a diff between them means
 * something, and this is the single place that claim was quietly untrue.
 *
 * WHAT IS DELIBERATELY *NOT* HERE: how the retry gets back to the model. The
 * Agents SDK appends a user message to `result.history`, Mastra re-sends one
 * string, LangGraph pushes a `HumanMessage` onto the accumulated list. Those
 * are genuinely three different things, so each engine keeps its own line — it
 * just no longer keeps its own copy of the sentence.
 *
 * `turnsFrom` is NOT here either, for the same reason: three engines, three
 * reply shapes, three real implementations.
 */
import type { LoopOptions, LoopResult, TurnRecord, ValidationResult } from './loop.types';

/**
 * What the loop should do next. A discriminated union rather than a nullable
 * return, because "finished" and "go round again" want completely different
 * handling and a caller that forgets one should not compile.
 */
export type Settlement<T> =
  | { kind: 'done'; result: LoopResult<T> }
  /** The sentence to put in front of the model again. How is the engine's business. */
  | { kind: 'retry'; instruction: string };

/**
 * The validator, or a refusal to invent one.
 *
 * NO DOMAIN DEFAULT, and asking for a schema without a validator is a mistake
 * rather than a shortcut: it would let raw text through as if it had passed,
 * and it would typecheck. So it throws instead.
 */
export function validatorFor(opts: LoopOptions): (raw: string) => ValidationResult {
  if (opts.validate) return opts.validate;
  if (opts.responseFormat) {
    throw new Error(
      'responseFormat was set without a validate function. @fde/agent ships no ' +
        'default validator — the answer contract is yours. Pass one (see @fde/schema).',
    );
  }
  return (raw: string): ValidationResult => ({ ok: true, value: raw as unknown });
}

/** The one copy of the retry sentence. See the header for why that matters. */
export function schemaRetryInstruction(errors: string): string {
  return (
    `Your previous response did not satisfy the required schema: ${errors}. ` +
    'Reply again with valid JSON only.'
  );
}

/**
 * Owns the retry budget and the running list of schema failures, so an engine
 * holds neither. `errors` is read by the engines' own `max_turns` returns,
 * which is why it is exposed rather than private.
 */
export interface SchemaGate<T> {
  /** Every schema failure seen so far, in order. Shared by reference, as before. */
  readonly errors: string[];
  /** Decide whether this text ends the loop. Consumes a retry when it does not. */
  settle(text: string, turns: TurnRecord[]): Settlement<T>;
}

export function schemaGate<T>(opts: LoopOptions): SchemaGate<T> {
  const validate = validatorFor(opts);
  const errors: string[] = [];
  let retriesLeft = opts.structuredRetries ?? 1;

  return {
    errors,
    settle(text, turns) {
      const done = (result: LoopResult<T>): Settlement<T> => ({ kind: 'done', result });

      // No contract asked for, so any text is the answer.
      if (!opts.responseFormat) {
        return done({ text, turns, stoppedBecause: 'model_finished', schemaErrors: errors });
      }

      // WHY WE RE-VALIDATE WHAT THE ENGINE ALREADY VALIDATED. Every engine's
      // own structured-output feature enforces SHAPE — fields present, right
      // types. None of them knows anything about a schema's COHERENCE rules,
      // which is where a model can look fully compliant and still be silently
      // wrong (an unresolved conflict with no escalation is the standing
      // example). The caller's validator is the only thing that checks both.
      const validated = validate(text);
      if (validated.ok) {
        return done({
          text,
          turns,
          structured: validated.value as T,
          stoppedBecause: 'model_finished',
          schemaErrors: errors,
        });
      }

      errors.push(validated.errors!);
      opts.onEvent?.({ type: 'schema_retry', turn: turns.length, error: validated.errors! });

      // HANDED BACK TO THE MODEL, NEVER SILENTLY REPAIRED — that is what keeps
      // the failure rate visible instead of absorbing it into a patch nobody
      // measures. When the budget runs out the run is reported as
      // `schema_invalid` rather than as an answer.
      if (retriesLeft <= 0) {
        return done({ text, turns, stoppedBecause: 'schema_invalid', schemaErrors: errors });
      }
      retriesLeft--;
      return { kind: 'retry', instruction: schemaRetryInstruction(validated.errors!) };
    },
  };
}
