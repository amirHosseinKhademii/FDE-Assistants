/**
 * @fde/estate — several databases, one per source system, brought up and torn
 * down together.
 *
 * The SQL and the safety are here; the words are the caller's. Every function
 * returns what it did rather than printing it, because the two engagements that
 * share this print very differently and the formatting was the only thing they
 * did not have in common.
 *
 * The one thing it does NOT leave to the caller is the order of the drop path:
 * every name is checked before any database is dropped. See `estate.ts`.
 */
export * from './estate';
