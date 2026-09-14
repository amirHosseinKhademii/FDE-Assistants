/**
 * Keep a dropped Postgres connection from killing the process.
 *
 * THIS IS NOT DEFENSIVE TIDINESS. A pg `Client` and a pg `Pool` are both
 * EventEmitters, and in Node an 'error' event with NO LISTENER is rethrown as an
 * uncaught exception. It does not fail the query — it terminates the PROCESS.
 *
 * WHY IT WAS NEVER NOTICED. Every caller of this package used to be short-lived:
 * a script opens a connection, does its work, exits. Nothing sits idle long
 * enough to be disconnected. The first long-running caller — a web server
 * holding an index open between requests — hit it within a minute, because
 * serverless Postgres (Neon and friends) closes idle connections aggressively
 * and suspends compute. One idle timeout, and the whole server died with
 * "Connection terminated unexpectedly", taking every unrelated request with it.
 *
 * WHAT A HANDLER MUST DO BESIDES EXIST. Swallowing the error silently is worse
 * than the crash: the process survives holding a socket that is never coming
 * back, so every later query fails and it reads like a data problem rather than
 * a network one. Callers that cache a connection must also DISCARD it — that is
 * the caller's job, which is why this reports rather than repairs.
 */
/**
 * The only capability this needs: something that can be told about an error.
 *
 * Typed structurally rather than as `Client | Pool`, because those two declare
 * incompatible `.on` overload sets and TypeScript refuses to call the union.
 * Both satisfy this, and so does anything else with the same shape — which is
 * the right level of commitment for a helper that only ever attaches a listener.
 */
type ErrorEmitter = { on(event: 'error', listener: (err: Error) => void): unknown };

export interface DropOptions {
  /** What to call this connection in the warning. */
  label: string;
  /** Run when the connection drops — evict a cache, mark it stale, etc. */
  onDrop?: (err: Error) => void;
}

/**
 * Attach a drop handler to a `Client` or a `Pool`.
 *
 * Returns the same object, so it can wrap a construction expression.
 */
export function survivesDisconnect<T extends ErrorEmitter>(conn: T, opts: DropOptions): T {
  conn.on('error', (err: Error) => {
    // A Pool re-emits the errors of its idle clients here. Either way the
    // connection is gone; what differs is only who owns replacing it.
    console.warn(`db(${opts.label}): connection dropped — ${err.message}. It will be reopened.`);
    opts.onDrop?.(err);
  });
  return conn;
}
