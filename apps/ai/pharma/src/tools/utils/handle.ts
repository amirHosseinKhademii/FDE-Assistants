/**
 * One handle over the six databases, so nothing above this file has to know
 * that there are six of them.
 *
 * WHY THIS IS NOT A POOL PER CALLER. Answering one question touches five
 * databases and ~26 queries (`db:trace` prints the count). A caller that opened
 * its own client per silo per question would open thirty connections to one
 * Neon compute to ask one thing. The handle opens each database lazily, at most
 * once, and is closed by whoever opened it.
 *
 * THE COUNT IS A DESIGN SIGNAL, NOT A STATISTIC. `fetches` exists because the
 * cost of the silo layout should be a number rather than a feeling: if it
 * climbs when a new caller arrives, the fetch shape is wrong and that is worth
 * knowing before it is worth fixing.
 *
 * IT SURVIVES A DROPPED CONNECTION, and that is not tidiness — it is the
 * difference between this file working in a CLI and working in a server. A pg
 * `Client` is an EventEmitter, and an 'error' event with NO LISTENER is
 * rethrown by Node as an uncaught exception: it kills the PROCESS, not the
 * query. Neon closes idle connections, so the web surface hit this the first
 * time a page sat open for half a minute — the whole dev server died with
 * "Connection terminated unexpectedly" and took every other request with it.
 * The CLI never saw it once: it opens, asks, closes, exits, well inside any
 * idle timeout. A long-lived caller is a different set of assumptions, and this
 * is the one that was wrong.
 */
import { Client } from 'pg';
import { urlFor } from '../../config/connections';

/**
 * Postgres error states that mean "the connection died", as opposed to "your
 * SQL was wrong".
 *
 * THE DISTINCTION IS THE WHOLE SAFETY ARGUMENT. A syntax error, a type error or
 * a missing column will fail identically forever, so retrying one is a slower
 * way to get the same failure. These, by contrast, say nothing about the query
 * — the socket went away — so the same statement on a fresh connection is a
 * genuinely different attempt.
 */
const DROPPED = new Set([
  '57P01', // admin_shutdown — what `pg_terminate_backend` and idle timeouts raise
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now — compute waking up
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08P01', // protocol_violation
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
]);

/** pg raises some of these as a bare Error with no code, so the text is checked too. */
const DROPPED_TEXT =
  /connection terminated|connection closed|terminating connection|server conn crashed|not queryable|socket hang up/i;

function isDroppedConnection(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code && DROPPED.has(e.code)) return true;
  return Boolean(e?.message && DROPPED_TEXT.test(e.message));
}

/** A row as Postgres hands it back, before a silo module gives it a shape. */
type Row = Record<string, any>;

export interface DbHandle {
  /** Run one query against one named database. Counted. */
  query(db: string, sql: string, params?: unknown[]): Promise<Row[]>;
  /** Same, for the common case of "there is at most one". */
  one(db: string, sql: string, params?: unknown[]): Promise<Row | undefined>;
  /** How many queries have been run through this handle. */
  readonly fetches: number;
  /**
   * How many of those had to be re-issued on a fresh connection.
   *
   * SEPARATE FROM `fetches` ON PURPOSE. `fetches` is a design signal — the cost
   * of the silo layout, which should not move because the network hiccuped.
   * This is an infrastructure signal. Conflating them would make a flaky
   * connection look like a worse fetch shape.
   */
  readonly retries: number;
  close(): Promise<void>;
}

export function openHandle(): DbHandle {
  const clients: Record<string, Promise<Client>> = {};
  let fetches = 0;
  let retries = 0;

  const clientFor = (db: string): Promise<Client> => {
    const cached = clients[db];
    if (cached) return cached;

    // Declared before it is built so the callbacks below can check "am I still
    // the cached attempt?". The `!` is a definite-assignment assertion, and it
    // is safe for a specific reason: nothing reads `opening` synchronously.
    // `c.on(...)` only STORES its callback, and the catch clause runs after an
    // await — both strictly after the assignment two lines below.
    let opening!: Promise<Client>;
    opening = (async () => {
      const c = new Client({ connectionString: urlFor(db) });

      // The listener that keeps the process alive. It also EVICTS the dead
      // client, so the next call opens a fresh one rather than reusing a socket
      // that is never coming back — a handler that only swallows the error
      // turns a crash into every subsequent query failing, which is worse
      // because it looks like a data problem.
      c.on('error', (err: Error) => {
        if (clients[db] === opening) delete clients[db];
        console.warn(`db(${db}): connection dropped — ${err.message}. Reconnecting on next query.`);
      });

      try {
        await c.connect();
      } catch (err) {
        // A rejected promise left in the cache would poison this database for
        // the life of the process: every later call would await the same
        // failure and never retry.
        if (clients[db] === opening) delete clients[db];
        throw err;
      }
      return c;
    })();

    clients[db] = opening;
    return opening;
  };

  return {
    /**
     * Run one query, and re-issue it ONCE if the connection died underneath it.
     *
     * WHY A RETRY IS SAFE HERE AND WOULD NOT BE ELSEWHERE. Re-sending a
     * statement is only safe when running it twice is the same as running it
     * once. Everything reachable through this handle is a READ — and that is
     * not a convention anybody has to remember, it is asserted: `pnpm sql:check`
     * scans this whole directory and fails the build if a write statement
     * appears. So the dangerous version of this — a retry that inserts a row
     * twice because the first one actually succeeded before the socket dropped
     * — cannot arise without that check going red first.
     *
     * ONCE, NOT UNTIL IT WORKS. A loop against a database that is genuinely
     * down turns a fast, clear failure into a slow, confusing one, and the
     * caller above already renders a failed fetch as an informative miss.
     */
    async query(db, sql, params = []) {
      fetches++;
      const attempt = clientFor(db);
      try {
        const { rows } = await (await attempt).query(sql, params);
        return rows;
      } catch (err) {
        if (!isDroppedConnection(err)) throw err;

        // Discard the dead connection, but only if it is still the cached one —
        // the error handler may have evicted it already and a concurrent call
        // may have opened a healthy replacement we must not throw away.
        if (clients[db] === attempt) delete clients[db];

        retries++;
        console.warn(
          `db(${db}): connection died mid-query — retrying once on a fresh connection.`,
        );
        const { rows } = await (await clientFor(db)).query(sql, params);
        return rows;
      }
    },
    async one(db, sql, params = []) {
      return (await this.query(db, sql, params))[0];
    },
    get fetches() {
      return fetches;
    },
    get retries() {
      return retries;
    },
    async close() {
      // Take the clients out of the cache FIRST, so a close running alongside a
      // dropped connection cannot race the error handler into re-adding one.
      const pending = Object.values(clients);
      for (const db of Object.keys(clients)) delete clients[db];

      await Promise.all(
        pending.map(async (p) => {
          // Closing a connection that already died throws, and there is nothing
          // to do about it — the socket we wanted shut is already shut.
          try {
            await (await p).end();
          } catch {
            /* already gone */
          }
        }),
      );
    },
  };
}
