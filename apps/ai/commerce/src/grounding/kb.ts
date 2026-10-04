/**
 * THE POLICY INDEX, AS FACTS BOTH SIDES READ FROM ONE PLACE.
 *
 * Two processes touch the index and they must agree on everything that is not
 * the credential: the INGEST side (a build step in this package, holding the
 * estate's admin URL) writes it, and the QUERY side (`query.ts`, imported by the
 * MCP server, holding only a read-only URL) reads it. A table name or a vector
 * dimension that differs between them does not fail — the dense arm returns the
 * nearest rows of the wrong table, or pgvector refuses a dimension it was never
 * given, and the first is plausible junk with a citation attached. So neither
 * side spells these facts itself; both import them, and `commerce:kb-check`
 * measures the DATABASE against them rather than trusting this comment.
 *
 * THIS FILE READS NO ENVIRONMENT AND IMPORTS NO ESTATE CODE. `query.ts` imports
 * it, and the MCP process that imports `query.ts` must never load the module
 * that knows the estate's admin URL (`config/connections.ts`). `kb-check`
 * asserts that import graph, by loading `query.ts` in a fresh process.
 */
import { LocalEmbeddings } from '@fde/grounding';

/**
 * Its own database, NOT one of the five. The five are the customer's systems of
 * record; this is OURS — built from `docs/commerce/corpus/`, rebuildable at any
 * time — so it is deliberately absent from `DB_NAMES`, and `commerce:db-reset`
 * (which drops the five) leaves it alone. PLAN.md §4.2.
 */
export const KB_DB = 'thb_kb';

/**
 * The chunk table. `_local` because the vectors are bge-small's: the repo's
 * convention (`.env.example`, EMBEDDINGS) is that local and hosted vectors never
 * share a table, so a later hosted index cannot silently mix into this one.
 */
export const KB_TABLE = 'policy_chunks_local';

/**
 * The embedder, pinned. This index is LOCAL-ONLY — the hosted embedding
 * deployment was deleted with Foundry (docs/FREE.md) — and the model and query
 * prefix are passed explicitly rather than read from LOCAL_EMBEDDING_MODEL, so
 * the MCP process cannot embed its questions with a different model from the
 * one the passages were embedded with because of an environment it inherited.
 */
export const KB_MODEL = 'Xenova/bge-small-en-v1.5';
export const KB_QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';
export const KB_DIMENSIONS = 384;

export function kbEmbeddings(): LocalEmbeddings {
  return new LocalEmbeddings({ model: KB_MODEL, queryPrefix: KB_QUERY_PREFIX });
}

/**
 * The ONE role the query side connects as. SELECT on `KB_TABLE` and nothing
 * else; `commerce:kb-check` proves it cannot INSERT, CREATE TABLE or CREATE
 * TEMP TABLE. Its URL lives in `COMMERCE_KB_URL` — never derived from the
 * estate's admin URL, which creates and drops all five databases.
 */
export const KB_READER_ROLE = 'thb_kb_reader';
