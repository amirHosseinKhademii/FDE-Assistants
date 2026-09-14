/**
 * Where the indexed passages live. A CONSTANT, in a file that does nothing.
 *
 * ── WHY THIS IS NOT IN `index-cli.ts`, WHICH IS WHERE IT STARTED ─────────
 *
 * It was, and importing it to read one string EXECUTED THE INDEXER.
 *
 * `index-cli.ts` calls `main()` at module scope, the way every CLI in this
 * package does. `documents.ts` imported `CHUNK_TABLE` from it. So every search —
 * and every case of the retrieval check — re-embedded 702 documents on import,
 * and because `ingestDocuments` DELETES the table before refilling it, the
 * queries then ran against a table that was empty. Three of five cases reported
 * "nothing found" and looked exactly like retrieval failing.
 *
 * It also spent 410,000 embedding tokens per invocation, silently.
 *
 * The lesson is not "move the constant". It is that a module which acts on
 * import is a landmine, and a constant is the most innocent-looking possible
 * reason to import one. `index-cli.ts` now guards its entry point, and
 * `sql:check` asserts that nothing on the answer path imports a CLI.
 */
export const CHUNK_TABLE = 'document_chunks';
