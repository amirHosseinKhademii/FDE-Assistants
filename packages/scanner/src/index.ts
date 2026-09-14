/**
 * @fde/scanner — read a source tree and prove a rule about it.
 *
 * The machinery is here; the RULE stays with the caller. What counts as a
 * forbidden pattern, which paths are in scope and which are exempt are domain
 * questions — the same split `@fde/grounding` makes, where the loader is shared
 * and the descriptor is passed in.
 *
 * It exists because three checks in this repo each wrote their own
 * comment-stripper and the three disagreed, leaving a documented, already-fixed
 * bug still live in one of them. See `scanner.ts` for the demonstration.
 *
 * NOT USED BY `scripts/leak-check.mjs`, ON PURPOSE. That check scans every
 * `packages/*\/src` for leaked domain vocabulary — including this package's. A
 * checker that imported the thing it checks could be silenced by the thing it
 * checks. It keeps its own copy, and this package's selftest pins the two to the
 * same behaviour on the line that caused the original miss.
 */
export * from './scanner';
