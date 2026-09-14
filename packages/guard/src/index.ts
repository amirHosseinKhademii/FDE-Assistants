/**
 * @fde/guard — fail-closed API authentication.
 *
 * THE OBVIOUS IMPLEMENTATION FAILS OPEN, and that is the whole reason this is a
 * package rather than four lines in a route handler:
 *
 *     if (process.env.API_KEY && header !== process.env.API_KEY) return 401;
 *
 * Read it again. With `API_KEY` unset, every request is allowed. Forget the
 * variable in one deploy config and you have silently shipped an
 * unauthenticated endpoint that answers questions about customer data — and
 * nothing in any log looks wrong, because from the server's point of view
 * nothing IS wrong.
 *
 * So the rule here is inverted: **no key configured means refuse.** In
 * development it degrades to loopback-only, so a laptop still works without
 * ceremony; in production it returns 503 and says why. There is no
 * configuration that results in "open to the internet with no key".
 *
 * Its self-test asserts that every denial branch actually denies — a guard that
 * has never been observed refusing is a guard you are hoping about.
 */
export * from './guard';
