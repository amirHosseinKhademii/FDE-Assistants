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
 * AND A HANDLER IS NOT ENOUGH ON ITS OWN, which took a second incident to
 * learn. The header above describes the drop that ANNOUNCES itself: the peer
 * closes, pg emits 'error', something reacts. The worse case is the one that
 * says nothing — a pooler that stops answering without sending a FIN. The
 * socket stays ESTABLISHED on this side, pg waits for a reply that is never
 * coming, and the process sits in `ep_poll` FOREVER. No error, no timeout, no
 * listener to fire.
 *
 * MEASURED 2026-09-16 against Neon's free tier, which autosuspends: a local
 * model is slow enough between tool calls to cross the idle window, and an eval
 * run sat holding a dead socket to `:5432` at 2% CPU with the model long
 * finished and not one case logged. Neon itself answered a fresh probe in
 * ~1 second throughout, so "the database is down" is the wrong conclusion and
 * costs an hour.
 *
 * `PG_OPTIONS` is the fix and it is TCP-level, not application-level, because
 * the application layer has nothing to observe. Keepalive probes force the
 * kernel to discover the peer is gone, which finally produces the 'error' event
 * the handler below has been waiting for.
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

/**
 * What every Postgres connection in this package is built with.
 *
 * ONE OBJECT RATHER THAN FOUR LITERALS, because these are the settings whose
 * absence is invisible: a connection without them works perfectly until the day
 * it hangs, and then hangs in a place that looks like a data problem.
 *
 *   keepAlive                     ask the kernel to probe an idle peer, so a
 *                                 silent disappearance becomes a real error
 *   keepAliveInitialDelayMillis   10s — comfortably inside the window a
 *                                 serverless pooler will drop an idle client
 *   connectionTimeoutMillis       a connect that cannot finish must fail, not
 *                                 wait. Generous, because Neon resuming a
 *                                 suspended compute is a legitimate slow path
 *   query_timeout                 the backstop for the case above: a query that
 *                                 will never answer stops being indefinite
 *
 * THE TIMEOUTS ARE DELIBERATELY LOOSE. They exist to convert "forever" into "an
 * error", not to police latency — a tight bound here would fail honest queries
 * on a cold serverless database and teach everyone to raise it.
 */
export const PG_OPTIONS = {
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  connectionTimeoutMillis: 30_000,
  query_timeout: 120_000,
} as const;
