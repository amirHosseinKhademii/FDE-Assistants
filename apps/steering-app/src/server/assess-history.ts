/**
 * Every requirement assessed on this page, and the answer it got — in Postgres.
 *
 * WHY THIS IS NOT `logs/requests.jsonl`. That log already records every request,
 * but `RequestRecord` in `@fde/telemetry` carries what a run COST — tokens,
 * turns, time — and deliberately nothing of the answer body. Adding the answer
 * there means changing a package two other engagements depend on, its DDL and
 * both engine loops; and its primary key is `(ts, surface)` filled by a
 * file-to-Postgres sync, so a request-time insert would race `pnpm logs:sync`.
 *
 * WHY `vst_derived` AND NOT ONE OF THE FOUR. The four are the CUSTOMER'S
 * systems of record and nothing on the answer path may write to them. That
 * guarantee is made here by the CONNECTION, not by a directory: this file
 * resolves `derivedUrl()` and never touches the estate's own handle, so a write
 * physically cannot reach `vst_alm` however the code is edited. `vst_derived`
 * is also the one database in the estate that was written rather than handed
 * over, which is what makes it ours to add a table to.
 *
 * WHY THIS FILE IS IN THE APP AND NOT IN `packages/steering`. `pnpm
 * steering:sql-check` scans a NAMED set of directories and prints that scope in
 * its pass line. It does not recurse into new ones — so a `src/history/` inside
 * the package would have passed silently while the green tick claimed coverage
 * it did not have. An app route was never inside the claimed scope, so nothing
 * is falsified by this living here. Pharma reached the same conclusion for the
 * same reason and the note is repeated rather than referenced, because the next
 * person to move this file will be reading THIS header.
 *
 * RETENTION, STATED BECAUSE NOBODY WILL ASK LATER. These rows are durable and
 * there is NO prune and NO TTL. A row names a car maker's unannounced
 * requirement and what we concluded about our ability to meet it; that is
 * commercially sensitive on both sides. If this outlives the exercise it needs
 * a retention rule before it holds a real customer's specification.
 *
 * NEVER THROWS ON WRITE. A failed record must not take down the thing it is
 * recording: a lost row is an annoyance, losing the assessment somebody just
 * paid a minute and a few cents for is not.
 *
 * `pg` IS IMPORTED BY NAME, NOT DEFAULT. The shared tsconfig sets
 * `allowSyntheticDefaultImports` without `esModuleInterop`, so `import pg from
 * 'pg'` compiles cleanly and is `undefined` at runtime.
 */
import { Pool } from 'pg';
import { derivedUrl } from '@vantis/steering/config';

/**
 * The DDL runs on first use rather than in a migration step. There is one
 * version of this table and no deployed copy to preserve, so a migration
 * framework would be ceremony around a single CREATE TABLE. Replace it, don't
 * extend it, the day a second version has to reach a database somebody else is
 * using.
 *
 * `answer` and `failure` are BOTH nullable and exactly one is set. A run that
 * failed still spent tokens and still took a minute; dropping those rows would
 * make the history quietly cheaper and more reliable than the system is.
 *
 * `ref` AND `text` ARE BOTH STORED, and that is not redundancy. A picked
 * requirement has a reference and the text it had at the revision in force; a
 * typed one has no reference at all. Keeping only the reference would lose what
 * was actually assessed the next time the specification is revised.
 */

// ── EVERYTHING BELOW MOVED INTO THE PACKAGE, 2026-09-13 ────────────────────
//
// The table, the pool and the write now live in
// `packages/steering/src/answer/filed-assessments.ts`.
//
// WHY IT MOVED. `pnpm steering:assess` had no way to file anything: every
// assessment run from the command line was printed and thrown away, and after a
// day of them `assess_history` held ONE answered row — written by this app. A
// summary across assessments cannot be demonstrated on a history that only the
// web desk can write to.
//
// The alternative was a second INSERT against the same table, one here and one
// in the package. That is the drift `answer/requirements.ts` warns about in its
// own header, and it is not hypothetical: this file was briefly left holding
// its copy while the package held the new one, and both compiled.
//
// WHAT ABOUT THE SCOPE ARGUMENT THIS FILE USED TO MAKE. It said a writer inside
// the package would sit outside `sql:check`'s scanned directories and pass
// silently while the green tick claimed coverage it did not have. That was
// true. It is no longer: `sql:check` now scans `src/answer/` with its own rule
// — the file that writes may not name the customer's estate, and the file that
// names the estate may not write — and plants both directions. The write is now
// checked by more than it was here, where it was checked by nothing.
//
// This file stays as the app's door: the two routes import from here, and
// nothing else in the app knows the table moved.
export {
  recordAssessment,
  listAssessments,
  HISTORY_LIMIT,
  type AssessRecord,
  type HistoryRow,
} from '@vantis/steering/history';
