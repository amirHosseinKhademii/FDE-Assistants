/**
 * Every question asked at the desk, and the answer it got — in Postgres.
 *
 * ── WHY THE ROWS ARE WORTH KEEPING AT ALL ─────────────────────────────────
 *
 * This is the first surface on this engagement whose output is not the same
 * twice. The same question has come back in 3.9 seconds and in 85.8, and one
 * question escalated once and then did not, four runs running. A page that only
 * ever shows the latest answer cannot show that — and "the same question gave
 * two different answers" is the single most important thing a reader of this
 * engagement needs to believe.
 *
 * So the history is not a convenience feature. It is the only place the
 * variability is visible.
 *
 * ── WHY IT IS IN THE APP AND NOT IN `@calder/safety` ──────────────────────
 *
 * Steering's equivalent started here and later moved into its package, because
 * its CLI needed to file rows too and a second INSERT against one table is
 * exactly the drift that causes. That argument applies here eventually and does
 * not yet: the desk is the only thing filing, and the package is being actively
 * written in by another pair of hands this afternoon. Moving it later is a
 * smaller job than untangling a collision now.
 *
 * ── NEVER THROWS ON WRITE ─────────────────────────────────────────────────
 *
 * A failed record must not take down the thing it is recording. Losing a row is
 * an annoyance; losing the answer somebody just waited eighty seconds and a few
 * cents for is not. So the write is wrapped, logged and swallowed.
 *
 * ── AND IT WRITES AFTER THE ANSWER IS SENT ────────────────────────────────
 *
 * Nobody waits on a database round trip to read their own result.
 *
 * ── RETENTION, STATED BECAUSE NOBODY WILL ASK LATER ───────────────────────
 *
 * Durable, with no prune and no TTL. These rows hold public questions about
 * public filings, so nothing here is sensitive in the way steering's rows are —
 * but a free Neon tier is not infinite and the page reads only the newest few.
 *
 * `pg` IS IMPORTED BY NAME, NOT DEFAULT. The shared tsconfig sets
 * `allowSyntheticDefaultImports` without `esModuleInterop`, so `import pg from
 * 'pg'` compiles cleanly and is `undefined` at runtime.
 */
import { Pool } from 'pg';

/** How many the desk shows. Small on purpose — it is a sample, not an archive. */
export const HISTORY_LIMIT = 12;

export interface AskRecord {
  question: string;
  engine: string;
  model: string;
  ms: number;
  /** The tool names, in the order they were called. The method, not the answer. */
  tools: string[];
  /** Null when the contract refused it, or when the model declined to answer. */
  answer: string | null;
  /** Populated only when the contract refused. */
  rejected: string[] | null;
  escalated: boolean;
}

export interface HistoryRow extends AskRecord {
  id: number;
  asked_at: string;
}

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.SAFETY_DATABASE_URL;
  if (!connectionString) return null;
  pool ??= new Pool({ connectionString, max: 2 });
  return pool;
}

/**
 * One CREATE TABLE, run once per process.
 *
 * A migration framework would be ceremony around a single statement, and this
 * table is owned by this app alone.
 */
function ensure(p: Pool): Promise<void> {
  ready ??= p
    .query(
      `create table if not exists safety_ask_history (
         id         bigserial primary key,
         asked_at   timestamptz not null default now(),
         question   text        not null,
         engine     text        not null,
         model      text        not null,
         ms         integer     not null,
         tools      jsonb       not null default '[]'::jsonb,
         answer     text,
         rejected   jsonb,
         escalated  boolean     not null default false
       )`,
    )
    .then(() => undefined);
  return ready;
}

/** Files one row. Never throws — see the header. */
export async function recordAsk(r: AskRecord): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await ensure(p);
    await p.query(
      `insert into safety_ask_history
         (question, engine, model, ms, tools, answer, rejected, escalated)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)`,
      [
        r.question,
        r.engine,
        r.model,
        r.ms,
        JSON.stringify(r.tools),
        r.answer,
        r.rejected ? JSON.stringify(r.rejected) : null,
        r.escalated,
      ],
    );
  } catch (err) {
    // Deliberately swallowed. The answer has already been delivered.
    console.error('[ask-history] could not file a row:', err);
  }
}

/** The newest few, for the panel the reader expands. */
export async function listAsks(limit = HISTORY_LIMIT): Promise<HistoryRow[]> {
  const p = getPool();
  if (!p) return [];
  try {
    await ensure(p);
    const { rows } = await p.query(
      `select id, asked_at, question, engine, model, ms, tools, answer, rejected, escalated
         from safety_ask_history
        order by asked_at desc
        limit $1`,
      [limit],
    );
    return rows.map((r: any) => ({
      id: Number(r.id),
      asked_at: new Date(r.asked_at).toISOString(),
      question: String(r.question),
      engine: String(r.engine),
      model: String(r.model),
      ms: Number(r.ms),
      tools: Array.isArray(r.tools) ? r.tools : [],
      answer: r.answer ?? null,
      rejected: Array.isArray(r.rejected) ? r.rejected : null,
      escalated: Boolean(r.escalated),
    }));
  } catch (err) {
    console.error('[ask-history] could not read rows:', err);
    return [];
  }
}
