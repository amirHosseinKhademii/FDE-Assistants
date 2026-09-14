/**
 * File one finished assessment, however it finished.
 *
 * ── WHY THIS IS A SHARED FUNCTION AND NOT SIX LINES IN EACH CLI ──────────
 *
 * It was six lines in `assess.ts`, and then `assess-all.ts` needed the same
 * six. The marshalling is not the part worth sharing — the RULE is: **a run
 * that produced no answer is filed too**, with `answer: null` and the reason it
 * failed. That single branch is what lets the work list tell *attempted and
 * failed* apart from *never attempted*, and a resume that cannot tell those
 * apart re-runs work it has already paid for, or skips work it never did.
 *
 * A second copy would look correct while being one dropped `else` away from
 * breaking that, and it would break it silently: the batch would simply stop
 * showing failures and the list would get shorter every run. Same reasoning as
 * `answer/requirements.ts` and its "in force, not latest" clause — the danger
 * of two copies is never the typing, it is the clause one of them loses.
 *
 * ── WHY `src/cli/` AND NOT `src/answer/` ─────────────────────────────────
 *
 * `pnpm steering:sql-check` scans `src/answer/` under a rule it states in its
 * own pass line: exactly one file there may write, it is `filed-assessments.ts`,
 * and it may not name the customer's estate. This helper contains no SQL — it
 * hands a record to the one file that does. Adding it there would widen a
 * guarded scope for something the guard has nothing to say about, and a guard
 * whose scope grows for unrelated reasons stops meaning what its pass line
 * claims.
 *
 * ── IT RETURNS WHETHER THE ROW LANDED, AND CALLERS SHOULD LOOK ───────────
 *
 * `recordAssessment` never throws — a lost row must not take down the thing it
 * is recording. For one assessment on a screen that is plainly right. For a
 * BATCH a silent write failure costs every loop in the run and reports nothing,
 * which is exactly what happened the first time this was used in anger.
 *
 * So the result is passed straight back rather than discarded. `assess.ts` has
 * an answer on screen and ignores it; `assess-all.ts` stops the batch on it.
 */
import { recordAssessment, type FilingResult } from '../answer/filed-assessments';
import type { AssessResult } from '../agent/loop/assess-requirement';

/**
 * `surface` IS REQUIRED AND HAS NO DEFAULT.
 *
 * Where an assessment was made is part of what it is, and a default is how two
 * surfaces end up sharing a label — after which they cannot be told apart in
 * the history or compared in `logs/requests.jsonl`. `explain-assessment.ts`
 * states the same rule for the same reason.
 */
export async function fileAssessment(
  ref: string | null,
  text: string,
  result: AssessResult,
  surface: string,
): Promise<FilingResult> {
  const run = {
    engine: result.engine,
    turns: result.turns.length,
    ms: result.ms,
    stoppedBecause: result.stoppedBecause,
  };

  return recordAssessment({
    ref,
    text,
    loop: result.engine,
    surface,
    answer: result.assessment
      ? { assessment: result.assessment, citations: result.citations }
      : null,
    failure: result.assessment
      ? null
      : {
          message: result.schemaErrors.join(' | ') || 'no valid answer',
          stoppedBecause: result.stoppedBecause,
          run,
        },
    run,
    trace: result.turns,
  });
}
