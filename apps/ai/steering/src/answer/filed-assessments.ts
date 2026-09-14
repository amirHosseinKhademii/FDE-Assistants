/**
 * What has already been assessed, read back out of `assess_history`.
 *
 * ── WHY A SECOND READER EXISTS, AND WHAT IT IS NOT ───────────────────────
 *
 * `apps/steering-app/src/server/assess-history.ts` owns this table: the DDL,
 * the pool and the write. It also has a `listAssessments()` and this file does
 * NOT call it, because a package cannot import from an app. What it must not
 * do is duplicate the write path, and it does not — there is no DDL and no
 * insert here, and `pnpm steering:sql-check` would not catch that omission
 * because this directory is outside its scanned scope. So it is said plainly
 * instead: THIS FILE READS. If the table does not exist it says so; it never
 * creates it, because a summary that silently creates an empty history would
 * report "nothing assessed yet" for a database it had just invented.
 *
 * ── A ROW IS A RUN, AND A RUN IS NOT A REQUIREMENT ───────────────────────
 *
 * The table is an append-only log. Assess the same requirement three times and
 * it holds three rows — which is right for a log and wrong for a tally: a
 * finding mix over ROWS counts the requirement you re-ran three times three
 * times over. Everything below exists to turn runs into requirements without
 * throwing away the fact that there were re-runs.
 *
 * Four kinds of row are separated rather than filtered, because each one is a
 * fact somebody should see:
 *
 *   answered    the newest answered run for a reference. This is the answer.
 *   superseded  an older run of a reference that has a newer one
 *   failed      a run that spent tokens and produced no answer
 *   typed       `ref is null` — somebody typed a requirement rather than
 *               picking one. It was assessed, it cost money, and it cannot
 *               count against a programme's 24 because it is not one of them
 *
 * ── AND ONE MORE: `unreadable` ───────────────────────────────────────────
 *
 * `answer` is `jsonb` and nothing in Postgres holds it to the answer contract.
 * A row written by an older revision of the schema parses as JSON and is not an
 * assessment. Those are counted and named, never coerced — a summary built on
 * a row it did not understand is the quietest possible way to be wrong.
 */
import { Pool } from 'pg';
import { survivesDisconnect } from '@fde/grounding';
import { derivedUrl } from '../config/connections';
import { FINDINGS, type RequirementAssessment } from '../schema/assessment-schema';

/** One requirement, and the assessment in force for it. */
export interface FiledAssessment {
  ref: string;
  /** When it was filed. Printed, because "the current answer" is a claim. */
  ts: string;
  assessment: RequirementAssessment;
}

export interface FiledHistory {
  /** One per reference, newest answered run wins. */
  answered: FiledAssessment[];
  /** References whose NEWEST run failed — the answer in use is older than the last attempt. */
  failedSince: string[];
  /** Older answered runs that a newer one replaced. A count: the rows themselves are not needed. */
  superseded: number;
  /** Runs with no reference. Assessed and paid for; not attributable to a programme. */
  typed: number;
  /**
   * References whose `answer` is not an assessment this code understands.
   *
   * NAMED, NOT COUNTED, and the difference was a bug: a count made the row
   * disappear from every list — it is not answered, not failed, not superseded
   * — while reporting only that "1 row" was odd. The reference is the one thing
   * that makes it actionable, because it says WHICH requirement is missing from
   * the tally. A row with no reference at all is carried as `(typed)`.
   */
  unreadableRefs: string[];
  /** True when nothing has ever been filed — the table is not there yet. */
  noHistory: boolean;
}

/** Every column by name. A column added to the table cannot change this shape. */
const SELECT = `
  select ref, ts, answer
    from assess_history
   order by ts desc`;

/**
 * Does this JSON actually satisfy the answer contract's essentials?
 *
 * NOT a Zod parse, deliberately. Zod would reject a row for a field the
 * summary never reads, and a stored answer is already a validated one — it was
 * checked before it was written. What is checked here is only what this file
 * goes on to USE, so the reason a row is dropped is always a reason that
 * matters to the thing dropping it.
 */
function readAssessment(answer: any): RequirementAssessment | undefined {
  const a = answer?.assessment;
  if (!a || typeof a !== 'object') return undefined;
  if (!FINDINGS.includes(a.finding)) return undefined;
  if (!a.cost || typeof a.cost !== 'object') return undefined;
  if (!Array.isArray(a.citations) || !Array.isArray(a.decisions_for_human)) return undefined;
  return a as RequirementAssessment;
}

/** The error Postgres raises for a table that was never created. */
const NO_TABLE = '42P01';

/**
 * Every filed assessment, sorted into the five kinds above.
 *
 * `limit` is a row cap, not a requirement cap: 200 rows of a log with re-runs
 * in it is well under a hundred requirements. Stated because a caller reading
 * "200" may think it bounds the summary, and it does not — it bounds how far
 * back the log is read.
 */
export async function fetchFiledAssessments(limit = 200): Promise<FiledHistory> {
  try {
    const { rows } = await connect().query(`${SELECT} limit $1`, [limit]);
    return sortRows(rows);
  } catch (e: any) {
    // NOT `ensureTable()` FIRST, deliberately. A reader that creates the table
    // it is about to find empty reports "nothing has been assessed yet" for a
    // database it just invented, and the two readings are indistinguishable on
    // screen. Writing creates it; reading finds out.
    if (e?.code !== NO_TABLE) throw e;
    return { answered: [], failedSince: [], superseded: 0, typed: 0, unreadableRefs: [], noHistory: true };
  }
}

/**
 * Let the process exit. A pool holds Node's event loop open, which turns a
 * finished CLI into a hang — the same failure `requirements.ts` closes its
 * client in a `finally` to avoid, and the worse of the two outcomes because it
 * presents as nothing happening rather than as an error.
 */
export async function closeHistory(): Promise<void> {
  if (!pool) return;
  const p = pool;
  pool = undefined;
  ready = undefined;
  await p.end();
}

/**
 * Rows in, requirements out. Exported for the self-test, which needs to feed it
 * a history with a re-run and a failure in it without a database.
 *
 * ROWS ARRIVE NEWEST FIRST, and the whole function depends on it: the first
 * answered row seen for a reference is the one in force, and every later one
 * is superseded. A caller that reorders them breaks this silently, which is
 * why the ordering lives in `SELECT` above and not in an argument.
 */
export function sortRows(rows: { ref: string | null; ts: Date | string; answer: any }[]): FiledHistory {
  const answered: FiledAssessment[] = [];
  const seen = new Set<string>();
  const attempted = new Set<string>();
  const failedSince: string[] = [];
  let superseded = 0;
  let typed = 0;
  const unreadableRefs: string[] = [];

  for (const row of rows) {
    if (!row.ref) {
      // An unreadable answer is worth naming even when it has no reference —
      // it still means a run was paid for and its result cannot be read.
      if (row.answer !== null && !readAssessment(row.answer)) unreadableRefs.push('(typed)');
      typed++;
      continue;
    }
    if (row.answer === null) {
      // Only the NEWEST failure matters, and only when it is newer than the
      // answer being used. An old failure followed by a success is a retry that
      // worked, which is not news.
      if (!attempted.has(row.ref)) failedSince.push(row.ref);
      attempted.add(row.ref);
      continue;
    }
    const assessment = readAssessment(row.answer);
    if (!assessment) {
      unreadableRefs.push(row.ref);
      continue;
    }
    attempted.add(row.ref);
    if (seen.has(row.ref)) {
      superseded++;
      continue;
    }
    seen.add(row.ref);
    answered.push({
      ref: row.ref,
      ts: typeof row.ts === 'string' ? row.ts : row.ts.toISOString(),
      assessment,
    });
  }

  answered.sort((a, b) => a.ref.localeCompare(b.ref));
  return { answered, failedSince, superseded, typed, unreadableRefs, noHistory: false };
}


// ═══════════════════════════════════════════════════════════════════════════
// FILING AN ASSESSMENT — moved here from the app on 2026-09-13.
//
// ── WHY IT MOVED, AND WHY THAT WAS NOT OBVIOUS ─────────────────────────────
//
// It lived in `apps/steering-app/src/server/assess-history.ts`, for a stated
// and good reason: `pnpm steering:sql-check` scans a NAMED set of directories
// and a new one inside the package would have passed silently while the green
// tick claimed coverage it did not have.
//
// What forced the move is the summary agent. `pnpm steering:assess` had no way
// to file anything — every assessment run from the command line was lost, and
// after a day of them the history held ONE answer. A summary across
// assessments cannot be demonstrated on a history that only the web desk can
// write to.
//
// The alternative was a second INSERT against the same table, one in the app
// and one in the package. That is the drift `answer/requirements.ts` warns
// about in its own header — two copies of a load-bearing statement, one of
// which quietly loses a clause.
//
// ── SO THE SCOPE HOLE IS CLOSED RATHER THAN INHERITED ──────────────────────
//
// `sql:check` now scans `src/answer/` too, with a different rule: exactly one
// file here may write, it is this one, and it may not name the customer's
// estate. `requirements.ts` names the estate and may not write. Both
// directions are planted and asserted, so the exemption is checked instead of
// remembered — which is more than was true of this code in the app.
//
// ── WHAT DID NOT CHANGE ────────────────────────────────────────────────────
//
// The connection, and it is the guarantee: `derivedUrl()`, never `urlFor`. A
// write physically cannot reach `vst_alm` however this file is edited. The
// pool, the retryable `ensureTable`, the never-throw write and the retention
// note all moved with the code rather than being re-derived, because each of
// them is a recorded failure and not a preference.
// ═══════════════════════════════════════════════════════════════════════════

const DDL = `
create table if not exists assess_history (
  id       bigserial   primary key,
  ts       timestamptz not null default now(),
  ref      text,
  text     text        not null,
  loop     text        not null,
  surface  text        not null,
  answer   jsonb,
  failure  jsonb,
  run      jsonb,
  trace    jsonb       not null default '[]'::jsonb
);
create index if not exists assess_history_ts on assess_history (ts desc);`;

/** How many rows the page asks for. A bid engineer scans a column, they do not page. */
export const HISTORY_LIMIT = 50;

export interface AssessRecord {
  /** Null when the requirement was typed rather than picked. */
  ref: string | null;
  text: string;
  loop: string;
  surface: string;
  answer: unknown | null;
  failure: unknown | null;
  run: unknown | null;
  trace: unknown[];
}

export interface HistoryRow extends AssessRecord {
  id: string;
  ts: string;
}

/**
 * One pool for the process, created on first use. A pool rather than a client
 * per request because a serverless Postgres wakes slowly, and a fresh
 * connection per refetch is the thing that makes it feel broken.
 *
 * `survivesDisconnect` IS LOAD-BEARING, and its absence killed the dev server
 * after 23 minutes of idling on 2026-09-14. A pg `Pool` re-emits the errors of
 * its idle clients, and in Node an 'error' event with no listener is rethrown
 * as an uncaught exception — it terminates the PROCESS, not the query. Neon
 * closes idle connections, so this fires on any server left open rather than on
 * a CLI, which is why every gate was green while `/api/history` was one idle
 * timeout away from taking the whole app down.
 *
 * `tools/utils/handle.ts` carries the same warning and got the handler; this
 * pool sat next to it without one. Nothing is passed for `onDrop` on purpose:
 * a Pool replaces its own dead idle clients, so unlike the cached single Client
 * next door there is nothing here for the caller to discard.
 */
let pool: Pool | undefined;
let ready: Promise<void> | undefined;

function connect(): Pool {
  if (!pool) {
    pool = survivesDisconnect(new Pool({ connectionString: derivedUrl(), max: 4 }), {
      label: 'assess_history',
    });
  }
  return pool;
}

/**
 * Idempotent, awaited once per process — but NOT cached when it fails.
 *
 * Keeping a rejected promise sounds right and produces the common failure: a
 * serverless Postgres waking from idle times out on the very first request
 * after a deploy, and from then on EVERY write and read fails for the life of
 * the process. A cold start is the single most likely first-request failure
 * here, so it has to be retryable.
 */
function ensureTable(): Promise<void> {
  if (!ready) {
    ready = connect()
      .query(DDL)
      .then(() => undefined)
      .catch((e: unknown) => {
        ready = undefined;
        throw e;
      });
  }
  // Non-null because the branch above always assigns it.
  return ready!;
}

/**
 * What happened to the row. NEVER a thrown error — see below.
 */
export interface FilingResult {
  filed: boolean;
  /** Why it was not filed. Present only when `filed` is false. */
  error?: string;
}

/**
 * File one finished assessment.
 *
 * ── IT STILL NEVER THROWS. IT NO LONGER SAYS NOTHING. ────────────────────
 *
 * The original swallowed every failure on purpose, and that reasoning stands
 * for the surface it was written for: the answer is already on the reader's
 * screen, and a lost row must not turn into a failed request.
 *
 * What the silence cost showed up the first time a BATCH used this. Fifteen
 * requirements were queued; the first was assessed, paid for, and its row never
 * landed. Nothing anywhere said so — `catch {}` had eaten the reason, and the
 * only evidence was a work list that refused to get shorter. Diagnosing it
 * needed a `select` run by hand.
 *
 * So the contract is now: a caller that does not care still cannot be hurt —
 * no throw, no rejection — and a caller that DOES care is told. The web route
 * ignores the return and behaves exactly as before.
 */
/**
 * Is this failure worth trying once more?
 *
 * ── THE TWO KINDS OF FAILURE WANT OPPOSITE RESPONSES ─────────────────────
 *
 * A `22P05` or `22P02` is a byte in the payload that Postgres will never
 * accept. Retrying sends the same byte again, fails the same way, and doubles
 * the delay before anyone is told — so those are reported immediately.
 *
 * A connection that died is the other case entirely, and it is the one that
 * actually happened: a batch run leaves this pool idle for the forty-odd
 * seconds each assessment takes, a serverless Postgres hangs up on idle
 * connections, and the next insert is the thing that discovers the socket is
 * gone. `pg` discards the broken client when the query fails, so the retry
 * gets a fresh one and succeeds — which is exactly what happened by hand when
 * the same requirement was simply run again.
 *
 * This is the same argument `ensureTable` already makes above, applied to the
 * statement rather than the DDL: *a cold start is the single most likely first
 * request failure here*, and an idle hang-up is the most likely later one.
 *
 * ── THE CLASSES, AND WHY THEY ARE MATCHED BY PREFIX ──────────────────────
 *
 * Postgres groups these by design: `08***` is every connection exception, and
 * `57P01`/`57P02`/`57P03` are the server saying it is going away. Listing
 * individual codes would mean discovering each new one the expensive way.
 * Node's own socket errors arrive before Postgres can assign a code at all.
 */
const RETRYABLE_SOCKET_ERRORS = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']);

function worthRetrying(e: any): boolean {
  const code = e?.code;
  if (typeof code === 'string') {
    if (code.startsWith('08')) return true;
    if (code.startsWith('57P')) return true;
    return RETRYABLE_SOCKET_ERRORS.has(code);
  }
  // `pg` raises this one with no code at all when the pool hands out a client
  // whose socket has already been closed by the far end.
  return /connection terminated|connection error|socket hang up/i.test(String(e?.message ?? ''));
}

async function insertOnce(record: AssessRecord): Promise<void> {
  await ensureTable();
  await connect().query(
    `insert into assess_history (ref, text, loop, surface, answer, failure, run, trace)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      record.ref,
      record.text,
      record.loop,
      record.surface,
      record.answer === null ? null : JSON.stringify(record.answer),
      record.failure === null ? null : JSON.stringify(record.failure),
      record.run === null ? null : JSON.stringify(record.run),
      JSON.stringify(record.trace ?? []),
    ],
  );
}

export async function recordAssessment(record: AssessRecord): Promise<FilingResult> {
  try {
    try {
      await insertOnce(record);
    } catch (first: any) {
      if (!worthRetrying(first)) throw first;
      // ONCE, not a loop with backoff. A dead socket is replaced by the pool on
      // the first failure, so the second attempt either works or the database
      // is genuinely unreachable — and a caller waiting on an answer should not
      // sit through an escalating retry ladder to be told so.
      await insertOnce(record);
    }
    return { filed: true };
  } catch (e: any) {
    // STILL CAUGHT — the answer has already been sent, and a lost row must not
    // turn into a failed request. `ensureTable` has cleared itself, so the next
    // assessment retries rather than inheriting this failure.
    //
    // The code is kept alongside the message because it is the part that says
    // what KIND of failure this was — and by the time it reaches here, a
    // connection-class failure has already been retried once and failed twice.
    const code = e?.code ? `${e.code} ` : '';
    return { filed: false, error: `${code}${e?.message ?? String(e)}` };
  }
}

/**
 * The newest assessments first.
 *
 * This one DOES throw. A read that fails is a page that should say so — an
 * empty list is indistinguishable from "you have never assessed anything", and
 * that is the reading that makes somebody re-run, and re-pay for, an
 * assessment they already have.
 */

export async function listAssessments(limit: number = HISTORY_LIMIT): Promise<HistoryRow[]> {
  await ensureTable();
  const { rows } = await connect().query(
    `select id::text, ts, ref, text, loop, surface, answer, failure, run, trace
       from assess_history
      order by ts desc
      limit $1`,
    [limit],
  );
  return rows.map((r: any) => ({
    id: r.id,
    ts: new Date(r.ts).toISOString(),
    ref: r.ref,
    text: r.text,
    loop: r.loop,
    surface: r.surface,
    answer: r.answer,
    failure: r.failure,
    run: r.run,
    trace: Array.isArray(r.trace) ? r.trace : [],
  }));
}
