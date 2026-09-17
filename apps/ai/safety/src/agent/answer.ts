/**
 * STAGE 6.3 — the answer, checked against what the tools actually returned.
 *
 * ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
 *
 * Stage 5 wrote six coherence rules. Five of them are properties of the answer
 * alone, so `validateSafetyAnswer` can check them from the text.
 *
 * RULE 6 IS NOT. "No campaign may be cited when the recall search found
 * nothing" cannot be decided by reading the answer — an answer citing 20V438000
 * is perfectly coherent on its own, and only wrong if `find_recalls` came back
 * empty. `STAGE5.md` says so and deliberately put it outside `coherenceErrors`
 * rather than inventing a self-reported field, because a model that will reach
 * for an unrelated campaign will also tick a box saying it did not.
 *
 * Which left it unenforced: stage 5 tested it, and nothing called it.
 *
 * ── SO THE TOOL RESULTS ARE RECORDED, AND THE VALIDATOR CLOSES OVER THEM ──
 *
 * The loop's `validate` is `(raw: string) => ValidationResult`. It cannot be
 * given more arguments without changing every engine, so instead the tools are
 * wrapped to record what they returned and the validator is built around that
 * record.
 *
 * WRAPPING THE TOOLS RATHER THAN READING THE ENGINE'S TURN RECORDS is
 * deliberate. `TurnRecord.toolCalls` arrives after a turn COMPLETES, and
 * validation happens during the settle that ends it — so the record would be
 * one turn stale exactly when it is needed. Wrapping `execute` is true the
 * instant the tool returns, on all three engines, with nothing engine-specific.
 *
 * ── AND A FAILURE HERE IS A RETRY, NOT A REJECTION ────────────────────────
 *
 * Returning `ok: false` hands the sentence back to the model, which is the
 * whole point: "you cited a campaign but the search found none" is something a
 * model can act on. `@fde/schema`'s rule holds — nothing is repaired for it.
 */
import type { Tool } from '@fde/agent';
import type { ValidationResult } from '@fde/schema';
import {
  evidenceErrors,
  validateSafetyAnswer,
  type Evidence,
  type SafetyAnswer,
} from '../schema/safety-answer';

/** One tool call, as it actually resolved. */
export interface CallRecord {
  name: string;
  args: unknown;
  result: unknown;
}

/**
 * Wrap tools so every result is recorded, and hand back the shared log.
 *
 * The array is returned by reference and filled as the conversation runs. A
 * caller that reads it before the loop finishes sees a partial list, which is
 * correct — the validator wants exactly what has happened so far.
 */
export function recordingTools(tools: Tool[]): { tools: Tool[]; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  return {
    calls,
    tools: tools.map((t) => ({
      ...t,
      execute: async (args: unknown) => {
        const result = await t.execute(args);
        calls.push({ name: t.schema.name, args, result });
        return result;
      },
    })),
  };
}

/** What rule 6 needs, derived from the calls rather than self-reported. */
export function evidenceFrom(calls: CallRecord[]): Evidence {
  const recallSearches = calls.filter((c) => c.name === 'find_recalls');
  return {
    // TRUE ONLY IF A SEARCH RAN AND EVERY ONE CAME BACK EMPTY. A conversation
    // that never asked cannot have been told "none", and one that asked twice
    // — say a narrow component and then a wider one — is entitled to cite what
    // the wider search found.
    recallSearchWasEmpty:
      recallSearches.length > 0 &&
      recallSearches.every((c) => ((c.result as any)?.matches?.length ?? 0) === 0),
  };
}

/**
 * The validator the loop is given: stage 5's five rules, then rule 6.
 *
 * Ordered on purpose. A malformed answer has no `campaigns` array to inspect,
 * so the shape check must pass before the evidence check is meaningful.
 */
export function validatorFor(calls: CallRecord[]) {
  return (raw: string): ValidationResult<SafetyAnswer> => {
    const base = validateSafetyAnswer(raw);
    if (!base.ok || !base.value) return base;

    const errs = evidenceErrors(base.value, evidenceFrom(calls));
    if (errs.length) return { ok: false, errors: `internally inconsistent: ${errs.join('; ')}` };

    return base;
  };
}
