/**
 * Every question asked on this page, and the answer it got — in Postgres.
 *
 * WHY THIS IS NOT `logs/requests.jsonl`. That log already records every request,
 * but `RequestRecord` in `@fde/telemetry` carries what a question COST — tokens,
 * turns, time — and deliberately nothing of the answer body. Adding the answer
 * there means changing a package insurance also depends on, its DDL, and both
 * engine loops; and its primary key is `(ts, surface)` filled by a file-to-
 * Postgres sync, so a request-time insert would race `pnpm logs:sync`.
 *
 * WHY `mrd_kb` AND NOT ONE OF THE SIX. The six are the CUSTOMER'S systems of
 * record under GxP, and rule 19 is that nothing on the answer path may write to
 * them. That guarantee is made here by the CONNECTION, not by a directory: this
 * file resolves `urlFor(KB_DB)` and never touches `tools/utils/handle.ts`, so a
 * write physically cannot reach `mrd_qms` however the code is edited. `mrd_kb`
 * is also outside `SYSTEMS`, so `pnpm db:reset` cannot delete this.
 *
 * WHY THIS FILE IS IN THE APP AND NOT IN `packages/pharma`. `pnpm sql:check`
 * scans `src/{tools,agent,cli,eval,guard,schema,telemetry}` and `src/*.ts`, and
 * PRINTS THAT SCOPE in its pass line. It does not recurse into new
 * subdirectories — so a `src/history/` holding this would have passed silently
 * while the green tick claimed coverage it did not have. The guard's own header
 * calls that blind spot worse than no guard. An app route was never inside the
 * claimed scope, so nothing is falsified by it living here.
 *
 * RETENTION, STATED BECAUSE NOBODY WILL ASK LATER. These rows are durable and
 * there is NO prune and NO TTL. A question names a lot, a market and sometimes
 * the person who signed; the answer body names more. That is new — the request
 * log holds the questions already, but never held the answers. If this outlives
 * the exercise it needs a retention rule before it holds a real customer's data.
 *
 * NEVER THROWS ON WRITE, for the reason `@fde/telemetry`'s log gives: a failed
 * record must not take down the thing it is recording. A lost row is an
 * annoyance; losing the answer the reviewer is waiting for is not.
 *
 * `pg` IS IMPORTED BY NAME, NOT DEFAULT. The shared tsconfig sets
 * `allowSyntheticDefaultImports` without `esModuleInterop`, so `import pg from
 * 'pg'` compiles cleanly and is `undefined` at runtime. See the note in
 * `packages/pharma/src/config/connections.ts`.
 */
import { Pool } from 'pg';
import { KB_DB, urlFor } from '@meridian/pharma/config';

/**
 * The same idiom `@fde/telemetry`'s `sync.ts` uses: the DDL runs on first use
 * rather than in a migration step. There is one version of this table and no
 * deployed copy to preserve, so a migration framework would be ceremony around
 * a single CREATE TABLE — `db/init/migrate.ts` says the same thing about the
 * estate. Replace it, don't extend it, the day a second version has to reach a
 * database somebody else is using.
 *
 * `answer` and `failure` are BOTH nullable and exactly one is set. A question
 * that failed still spent tokens and still took a minute; dropping those rows
 * would make the history quietly cheaper than the system really is.
 */
const DDL = `
create table if not exists ask_history (
  id        bigserial   primary key,
  ts        timestamptz not null default now(),
  question  text        not null,
  loop      text        not null,
  surface   text        not null,
  answer    jsonb,
  failure   jsonb,
  run       jsonb,
  trace     jsonb       not null default '[]'::jsonb
);
create index if not exists ask_history_ts on ask_history (ts desc);
alter table ask_history add column if not exists kind text not null default 'release';
create index if not exists ask_history_kind_ts on ask_history (kind, ts desc);`;

/**
 * WHICH QUESTION A ROW ANSWERS, and it is a column rather than a convention.
 *
 * Pharma has TWO answer shapes, and `supplier-impact-schema.ts` settled that on
 * purpose: a release decision has one `escalate`, a work list has exposure
 * bands and a next action per row. They cannot be read by the same renderer.
 *
 * So without this column the release desk's sidebar would eventually hand a
 * supplier work list to the release dossier renderer, which would find no
 * blockers, no citations and no escalation in it and draw a clean page — and in
 * THIS domain a clean dossier reads as "nothing is wrong with this batch".
 * `api.ask.tsx` already names that exact failure as the reason a missing answer
 * is an error rather than an empty object. `surface` cannot do the job: both
 * routes are `http`.
 *
 * FILTERED IN THE QUERY, NOT IN THE COMPONENT. A page that receives the wrong
 * shape and declines to draw it is one forgotten guard away from drawing it.
 * The rows never arrive.
 *
 * ADDED WITH `add column if not exists ... default`, because `ask_history` is
 * the one table in this system that cannot be rebuilt — see `connections.ts`.
 * Rows written before this existed are release rows, which is what the default
 * says.
 */
export type AskKind = 'release' | 'supplier';

/** How many rows the page asks for. A reviewer scans a column, they do not page. */
export const HISTORY_LIMIT = 50;

export interface AskRecord {
  kind: AskKind;
  question: string;
  loop: string;
  surface: string;
  answer: unknown | null;
  failure: unknown | null;
  run: unknown | null;
  trace: unknown[];
}

export interface HistoryRow extends AskRecord {
  id: string;
  ts: string;
}

/**
 * One pool for the process, created on first use.
 *
 * A pool rather than a client per request because a serverless Postgres wakes
 * slowly and a fresh connection per keystroke-triggered refetch is the thing
 * that makes it feel broken. The pooled endpoint is deliberate — `direct()` is
 * for CREATE/DROP only, and nothing here does either at the database level.
 */
let pool: Pool | undefined;
let ready: Promise<void> | undefined;

function connect(): Pool {
  if (!pool) pool = new Pool({ connectionString: urlFor(KB_DB), max: 4 });
  return pool;
}

/**
 * Idempotent, and awaited once per process rather than once per request — but
 * NOT cached when it fails.
 *
 * The first version kept a rejected promise, on the reasoning that a genuinely
 * broken table should stop hammering the database. The failure that actually
 * produces is the common one: a serverless Postgres waking from idle times out
 * on the very first request after a deploy, and from then on EVERY `recordAsk`
 * and `listAsks` fails for the life of the process — the page reporting "the
 * history could not be read" until somebody restarts it. A cold start is the
 * single most likely first-request failure here, so it must be retryable.
 */
function ensureTable(): Promise<void> {
  if (!ready) {
    ready = connect()
      .query(DDL)
      .then(() => undefined)
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  }
  return ready;
}

/**
 * File one finished question. Returns nothing and reports nothing — see the
 * header on why this cannot be allowed to fail a request.
 */
export async function recordAsk(record: AskRecord): Promise<void> {
  try {
    await ensureTable();
    await connect().query(
      `insert into ask_history (kind, question, loop, surface, answer, failure, run, trace)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.kind,
        record.question,
        record.loop,
        record.surface,
        record.answer === null ? null : JSON.stringify(record.answer),
        record.failure === null ? null : JSON.stringify(record.failure),
        record.run === null ? null : JSON.stringify(record.run),
        JSON.stringify(record.trace ?? []),
      ],
    );
  } catch {
    // Deliberately silent, and the one place in this file where that is right:
    // the reviewer's answer has already been sent, and a lost row must not turn
    // into a failed request. `ensureTable` has already cleared itself, so the
    // next question retries rather than inheriting this failure.
  }
}

/**
 * The newest questions first.
 *
 * This one DOES throw. A read that fails is a page that should say so — an
 * empty list would be indistinguishable from "you have never asked anything",
 * and that is the reading that makes someone re-run a question they already
 * paid for.
 */
export async function listAsks(
  kind: AskKind,
  limit: number = HISTORY_LIMIT,
): Promise<HistoryRow[]> {
  await ensureTable();
  const { rows } = await connect().query(
    `select id::text, ts, kind, question, loop, surface, answer, failure, run, trace
       from ask_history
      where kind = $1
      order by ts desc
      limit $2`,
    [kind, limit],
  );
  return rows.map((r: any) => ({
    id: r.id,
    ts: new Date(r.ts).toISOString(),
    kind: r.kind,
    question: r.question,
    loop: r.loop,
    surface: r.surface,
    answer: r.answer,
    failure: r.failure,
    run: r.run,
    trace: Array.isArray(r.trace) ? r.trace : [],
  }));
}
