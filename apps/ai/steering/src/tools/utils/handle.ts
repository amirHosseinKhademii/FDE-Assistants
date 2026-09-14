/**
 * One handle over `vst_derived`, so nothing above this file opens a connection.
 *
 * ── WHY THIS IS NOT PHARMA'S HANDLE, COPIED ──────────────────────────────
 *
 * `packages/pharma/src/tools/utils/handle.ts` is the same idea and four times
 * the size, because it pools SIX databases lazily: answering one question there
 * touches five of them. The answer path here touches ONE — `vst_derived`, the
 * knowledge base we derived — so the pool, the per-database cache and the
 * eviction logic would all be machinery guarding a case that cannot arise.
 *
 * What IS carried across is the part that was learned the hard way, and it is
 * not the pooling. See `reconnects` below.
 *
 * The third domain is where the `@fde/*` split gets tested, and the honest
 * reading is: these two files share a shape, not enough code to extract yet.
 * A third consumer with a third connection count is the point at which the
 * common part is visible rather than guessed at. Recorded in
 * `docs/pharma/EXTRACTION.md` rather than pre-empted here.
 *
 * ── READ-ONLY, AND ASSERTED RATHER THAN INTENDED ─────────────────────────
 *
 * Everything reachable through this handle is a SELECT. That is not a
 * convention somebody has to remember: `pnpm steering:sql-check` scans this
 * directory and fails the build if a write statement appears. The retry below
 * depends on it — re-issuing a statement is only safe when running it twice is
 * the same as running it once.
 */
import { Client } from 'pg';
import { derivedUrl } from '../../config/connections';

/** A row as Postgres hands it back, before a department module gives it a shape. */
export type Row = Record<string, any>;

export interface DerivedHandle {
  /** Run one query. Counted. */
  query(sql: string, params?: unknown[]): Promise<Row[]>;
  /** Same, for the common case of "there is at most one". */
  one(sql: string, params?: unknown[]): Promise<Row | undefined>;
  /** How many queries have run. A design signal — see the note on `reconnects`. */
  readonly fetches: number;
  /** How many had to be re-issued on a fresh connection. An INFRASTRUCTURE signal. */
  readonly reconnects: number;
  close(): Promise<void>;
}

/**
 * Postgres states that mean "the connection died", as opposed to "your SQL was
 * wrong".
 *
 * THE DISTINCTION IS THE WHOLE SAFETY ARGUMENT FOR RETRYING. A syntax error or
 * a missing column will fail identically forever, so retrying one is a slower
 * way to reach the same failure. These say nothing about the query — the socket
 * went away — so the same statement on a fresh connection is a genuinely
 * different attempt.
 */
const DROPPED = new Set([
  '57P01', // admin_shutdown — what an idle timeout raises
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now — the compute waking up
  '08000', '08003', '08006', '08P01',
  'ECONNRESET', 'EPIPE', 'ETIMEDOUT',
]);

/** pg raises some of these as a bare Error with no code, so the text is checked too. */
const DROPPED_TEXT =
  /connection terminated|connection closed|terminating connection|socket hang up|not queryable/i;

function isDropped(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code && DROPPED.has(e.code)) return true;
  return Boolean(e?.message && DROPPED_TEXT.test(e.message));
}

/**
 * A connected client, opened at most once and replaced if it dies.
 *
 * The `error` listener is not tidiness. A pg `Client` is an EventEmitter, and
 * an 'error' event with NO LISTENER is rethrown by Node as an uncaught
 * exception — it kills the PROCESS, not the query. Neon closes idle
 * connections, so a long-lived caller (a server, a page left open) hits this
 * and a CLI never does: open, ask, close, exit, well inside any timeout.
 * Pharma's web surface found it the hard way; steering inherits the fix
 * without having to.
 */
function connector(): { get: () => Promise<Client>; drop: () => void; close: () => Promise<void> } {
  let current: Promise<Client> | undefined;

  const open = (): Promise<Client> => {
    let opening!: Promise<Client>;
    opening = (async () => {
      const c = new Client({ connectionString: derivedUrl() });
      c.on('error', (err: Error) => {
        if (current === opening) current = undefined;
        console.warn(`derived: connection dropped — ${err.message}. Reconnecting on next query.`);
      });
      try {
        await c.connect();
      } catch (err) {
        // A rejected promise left in place would poison every later call with
        // the same failure and never retry.
        if (current === opening) current = undefined;
        throw err;
      }
      return c;
    })();
    current = opening;
    return opening;
  };

  return {
    get: () => current ?? open(),
    drop: () => { current = undefined; },
    close: async () => {
      const pending = current;
      current = undefined;
      if (!pending) return;
      // Closing a connection that already died throws, and there is nothing to
      // do about it — the socket we wanted shut is already shut.
      try { await (await pending).end(); } catch { /* already gone */ }
    },
  };
}

export function openDerived(): DerivedHandle {
  const conn = connector();
  let fetches = 0;
  let reconnects = 0;

  return {
    /**
     * Run one query, and re-issue it ONCE if the connection died underneath it.
     *
     * Once, not until it works: a loop against a database that is genuinely
     * down turns a fast, clear failure into a slow, confusing one, and every
     * caller above already renders a failed fetch as an informative miss.
     */
    async query(sql, params = []) {
      fetches++;
      const attempt = conn.get();
      try {
        return (await (await attempt).query(sql, params)).rows;
      } catch (err) {
        if (!isDropped(err)) throw err;
        conn.drop();
        reconnects++;
        console.warn('derived: connection died mid-query — retrying once on a fresh connection.');
        return (await (await conn.get()).query(sql, params)).rows;
      }
    },

    async one(sql, params = []) {
      return (await this.query(sql, params))[0];
    },

    get fetches() { return fetches; },
    get reconnects() { return reconnects; },
    close: conn.close,
  };
}
