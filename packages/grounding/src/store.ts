/**
 * The vector store, on LangChain + pgvector.
 *
 * WHY THIS IS THE ONE FILE THAT CHANGES PER ENGAGEMENT. LangChain's
 * `VectorStore` is a stable 1.x interface with many implementations. Everything
 * above this file — the search tool, the prompt, the agent loop, the evals —
 * talks to that interface and does not know what is behind it. So landing on a
 * new customer means editing `openStore()` and nothing else:
 *
 *   PGVectorStore          any Postgres — their datacentre, Neon, RDS, Azure
 *   QdrantVectorStore      self-hosted Docker, or Qdrant Cloud EU
 *   AzureAISearchVectorStore   an Azure shop that already runs it
 *
 * WHY PGVECTOR IS THE DEFAULT, and it is not a technical argument. "Can we run
 * Postgres" is never a blocker — every organisation already has it, every cloud
 * has a managed version, and it runs on-prem for a customer who will not let
 * regulated data leave the building. "Can we stand up a vector database" is a new
 * infrastructure conversation with a team that has not met you yet. Picking the
 * thing that does not need a meeting is an FDE skill.
 *
 * A NOTE ON THE ADAPTER'S VERSION. `@langchain/pgvector` is 0.1.0 while
 * `@langchain/core` is 1.2.9. That looks like a risk and is mostly contained:
 * the stable contract is the `VectorStore` interface, and a young adapter
 * implementing a stable interface can be swapped for `@langchain/qdrant`
 * (1.0.3) without touching a line above this file. That is the architecture
 * paying for itself before it has even been stressed.
 */
import { PGVectorStore } from '@langchain/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { survivesDisconnect } from './pg-resilience';

/**
 * Connection string. Local Docker by default so the repo is runnable with no
 * setup; point it at Neon, RDS or the customer's own cluster in `.env`.
 *
 * Deliberately NOT `required()` — an unset value falls back to a local
 * container rather than failing, because the failure mode we care about is a
 * developer who cannot run the thing at all.
 *
 * THE FALLBACK NAMES NOTHING. It used to read `claims:claims@…/claims`, which
 * is a customer's word for their business sitting in a package meant to be
 * lifted into the next engagement unchanged — and `pnpm leak:check` could not
 * see it, because the scanner truncated the string at the `//` in
 * `postgresql://`. Generic credentials for a throwaway dev container; a real
 * deployment sets DATABASE_URL and never reaches this line.
 */
export function connectionString(): string {
  return (
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/postgres'
  );
}

/**
 * The connection string with the password removed — the ONLY form that may be
 * printed, logged, or written to a file.
 *
 * WHY THIS IS A SHARED FUNCTION and not a one-liner at each call site. It was a
 * one-liner at each call site, and that is exactly how it drifted:
 * `logs-sync.ts` redacted, `cli.ts` did not, and `pnpm ingest` printed a live
 * Neon password to the terminal — into shell scrollback, into a pasted
 * transcript, and into anywhere either of those gets copied. A rule that lives
 * in one place cannot be applied in one place and forgotten in another.
 *
 * The HOST AND DATABASE ARE DELIBERATELY KEPT. The whole reason these commands
 * print a connection string is so you can tell at a glance whether you are
 * about to rebuild a local container or a hosted cluster in eu-central-1.
 * Redacting the whole thing would remove the only useful part.
 *
 *   postgresql://neondb_owner:hunter2@ep-x.neon.tech/neondb
 *   postgresql://neondb_owner:***@ep-x.neon.tech/neondb
 */
export function redactedConnectionString(raw: string = connectionString()): string {
  // Matches the password in the userinfo section only. Anchored on `://` so a
  // colon later in the string — in a query parameter, say — is left alone.
  return raw.replace(/(:\/\/[^:@/\s]+:)[^@/\s]+@/, '$1***@');
}

/**
 * Default chunk table. Overridable per deployment — the name is not a domain
 * fact, it is a deployment one.
 */
export const DEFAULT_CHUNK_TABLE = 'document_chunks';

/**
 * Open (and on first use, create) the chunk index.
 *
 * `metadata` carries the document identifier and the heading trail, which is
 * what makes a retrieved passage citable — a fragment that cannot say which of
 * a dozen near-identical documents it came from is not evidence, it is a
 * rumour.
 */
export async function openStore(
  embeddings: EmbeddingsInterface,
  opts: { connectionString?: string; tableName?: string } = {},
): Promise<PGVectorStore> {
  const store = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: { connectionString: opts.connectionString ?? connectionString() },
    tableName: opts.tableName ?? DEFAULT_CHUNK_TABLE,
    columns: {
      idColumnName: 'id',
      vectorColumnName: 'vector',
      contentColumnName: 'content',
      metadataColumnName: 'metadata',
    },
    // Cosine, matching the hand-rolled implementation this replaced, so eval
    // numbers stay comparable across the swap. If you change this, every
    // baseline taken before the change is meaningless against every one after.
    distanceStrategy: 'cosine',
  });

  // THE POOL BEHIND THE INDEX OUTLIVES EVERY QUERY THROUGH IT. A caller that
  // opens this once and keeps it — any server — is holding idle connections
  // that a serverless Postgres will close. Unhandled, that is a process-level
  // crash rather than a failed search. The pool reopens its own connections, so
  // nothing here needs discarding; it only needs to be heard.
  survivesDisconnect(store.pool, { label: opts.tableName ?? DEFAULT_CHUNK_TABLE });

  return store;
}
