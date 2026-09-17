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
  /** True when this repeated an earlier identical call and was served from memory. */
  cached?: boolean;
}

/**
 * Wrap tools so every result is recorded, and identical calls are made once.
 *
 * ── WHY DEDUPLICATE ───────────────────────────────────────────────────────
 *
 * A real run called `get_recall({campaign_number: "20V197000"})` TWICE with
 * identical arguments. Nothing errored and nothing charged for it, which is
 * exactly why it would have kept happening: a wasted call is invisible in the
 * answer and visible only in the quota, and this engagement runs on a free tier
 * whose failure mode is silent (`docs/FREE.md` §10).
 *
 * These tools are READ-ONLY and the corpus is a frozen snapshot, so the same
 * arguments cannot produce a different answer within one conversation. That is
 * what makes caching safe here and would not make it safe for a tool that
 * writes.
 *
 * ── AND THE REPEAT IS STILL RECORDED ──────────────────────────────────────
 *
 * The call is logged with `cached: true` rather than dropped. Hiding it would
 * make the trace lie about what the model did — and "it asked the same question
 * twice" is a fact about the model worth keeping, especially for stage 7, which
 * is where it becomes a number rather than an anecdote.
 *
 * ── THE CACHE IS PER CONVERSATION ─────────────────────────────────────────
 *
 * Created inside this call, so two questions never share one. A process-wide
 * cache would be faster and would make the eval's repeat runs meaningless.
 *
 * The array is returned by reference and filled as the conversation runs. A
 * caller that reads it before the loop finishes sees a partial list, which is
 * correct — the validator wants exactly what has happened so far.
 */
export function recordingTools(tools: Tool[]): { tools: Tool[]; calls: CallRecord[] } {
  const calls: CallRecord[] = [];
  const seen = new Map<string, unknown>();

  return {
    calls,
    tools: tools.map((t) => ({
      ...t,
      execute: async (args: unknown) => {
        const key = `${t.schema.name}:${JSON.stringify(args ?? null)}`;

        if (seen.has(key)) {
          const result = seen.get(key);
          calls.push({ name: t.schema.name, args, result, cached: true });
          return result;
        }

        const result = await t.execute(args);
        seen.set(key, result);
        calls.push({ name: t.schema.name, args, result });
        return result;
      },
    })),
  };
}

/**
 * What rules 6 and 7 need, derived from the calls rather than self-reported.
 *
 * ── THE LAST SEARCH, NOT EVERY SEARCH ─────────────────────────────────────
 *
 * This first required EVERY `find_recalls` call to be empty, and a real run
 * broke it immediately by doing the sensible thing:
 *
 *   find_recalls({ make: HONDA, model: ODYSSEY })                    → 22
 *   find_recalls({ make: HONDA, model: ODYSSEY, component: FCA })    → 0
 *
 * It looked at the vehicle, then narrowed to the component. Under "every", that
 * conversation counted as NOT having been told "none" — so rules 6 and 7 both
 * stood down on the exact question they exist for, and the check failed with
 * `recallSearchWasEmpty=false` while the answer was correct.
 *
 * The last search is the one the answer rests on. Narrow-then-broad and
 * broad-then-narrow both come out right: whichever the model finished on is
 * what it is entitled to conclude from.
 *
 * A conversation that never searched at all is still not an absence — it cannot
 * have been told "none" by a question it did not ask.
 */
export function evidenceFrom(calls: CallRecord[]): Evidence {
  const last = [...calls].reverse().find((c) => c.name === 'find_recalls');
  return {
    recallSearchWasEmpty: !!last && ((last.result as any)?.matches?.length ?? 0) === 0,
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
