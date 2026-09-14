/**
 * The `documents` table — whole documents, and the metadata precedence is
 * decided from.
 *
 * WHY IT EXISTS, next to `policy_chunks`. Chunks are the shredded corpus:
 * fragments and vectors, which is what similarity search needs and nothing else
 * can use. You cannot ask them "which bulletin replaced which", because they
 * have never seen a bulletin — only pieces of one. Precedence is a property of
 * a WHOLE document.
 *
 *   documents        the insurer's records, as they exist before we arrive
 *   policy_chunks    what we build FROM them · derived · rebuild any time
 *
 * WHAT THE SEED CORPUS PROVES, and it is the most useful thing here. Loading
 * the twelve committed documents yields mostly nulls:
 *
 *   - `auto-pa-end-2024-03.md` and `auto-exclusions-schedule-2023.md` carry no
 *     structured metadata at all — no id field, no jurisdiction, no date.
 *   - `auto-pa-2021-07.md` states its supersession in PROSE — "Superseded by
 *     PA-2022-04." — where no parser can reach it as a relation.
 *
 * That is not a defect in the fixture. It is what a real document management
 * system looks like: effective dates half-populated, supersession tracked in a
 * spreadsheet or in somebody's head, jurisdiction implied by a folder name.
 * Discovering it is usually the most valuable thing an FDE delivers in week one.
 *
 * So every precedence column is NULLABLE and `status` has an explicit
 * 'unknown'. A missing value is never read as a permissive one: defaulting an
 * unknown status to 'current' is how a withdrawn circular reaches a live claim.
 *
 * NOT HERE, deliberately: policyholder records. They are fetched by exact id
 * and never searched, and a documents table sitting right next to them is the
 * temptation that would undo `get_policyholder`. A determination that REFERS to
 * AUT-4471 is a document about a policy and belongs here; AUT-4471's deductible
 * does not.
 */
import { Client } from 'pg';
import { connectionString } from './store';
import { UNKNOWN_STATUS, type DocumentSource, type SourceDocument } from './document-source';
import type { DocumentDomain } from './domain.types';
import { survivesDisconnect } from './pg-resilience';

export const DOCUMENTS_TABLE = 'documents';
export const RELATIONS_TABLE = 'document_relations';

/**
 * Create the tables if absent.
 *
 * `document_id` is the DOCUMENT — the file — not whatever parent it belongs to.
 * Two documents can legitimately share a parent id (an exclusions schedule and
 * the base form it attaches to), and keying on the parent merges them into one
 * row. That parent id now lives in `facets`, where it is domain data rather
 * than schema.
 */
export async function ensureSchema(client: Client): Promise<void> {
  await client.query(`
    create table if not exists ${DOCUMENTS_TABLE} (
      document_id   text primary key,
      doc_type      text        not null,
      title         text        not null,
      body          text        not null,
      edition       text,
      effective_on  date,
      expires_on    date,
      status        text        not null default 'unknown',
      -- DOMAIN METADATA, in one column: whatever precedence turns on in THIS
      -- domain — a jurisdiction, an edition, a parent id. It used to be a
      -- column each, which meant a new customer needed a migration. Postgres
      -- indexes jsonb with GIN, and the chunk table already filters on a jsonb
      -- metadata column, so this makes the two tables consistent rather than
      -- introducing something new.
      facets        jsonb       not null default '{}'::jsonb,
      content_sha   text        not null,
      source_name   text,
      source_path   text,
      updated_at    timestamptz not null default now()
    );
  `);
  await client.query(`
    create table if not exists ${RELATIONS_TABLE} (
      from_id text not null references ${DOCUMENTS_TABLE}(document_id) on delete cascade,
      verb    text not null,
      to_ref  text not null,
      primary key (from_id, verb, to_ref)
    );
  `);
  // to_ref is NOT a foreign key on purpose. A bulletin may name a predecessor
  // we do not hold — at a customer, routinely. A dangling edge is a fact worth
  // keeping, not an integrity error.
  for (const ddl of [
    `create index if not exists ${DOCUMENTS_TABLE}_type_idx on ${DOCUMENTS_TABLE} (doc_type, status)`,
    // One GIN index covers every facet key, present and future. The whole point
    // of the jsonb column: a new domain field needs no DDL at all.
    `create index if not exists ${DOCUMENTS_TABLE}_facets_idx on ${DOCUMENTS_TABLE} using gin (facets)`,
  ]) {
    await client.query(ddl);
  }
}

export interface LoadResult {
  source: string;
  seen: number;
  inserted: number;
  updated: number;
  unchanged: number;
  removed: number;
  relations: number;
  /** Documents whose precedence metadata is incomplete. Reported, never fixed. */
  incomplete: Array<{ documentId: string; missing: string[] }>;
}

/**
 * Which precedence fields a document is missing. Reported, never repaired.
 *
 * WHAT COUNTS AS MISSING IS THE DOMAIN'S CALL. This used to hardcode
 * `['form','schedule']` as the exempt types, which is an insurance fact sitting
 * in generic code.
 */
function missingFields(d: SourceDocument, domain: DocumentDomain): string[] {
  const missing: string[] = [];
  if (d.status === UNKNOWN_STATUS) missing.push('status');
  if (!d.effectiveOn) missing.push('effective_on');

  const exempt = domain.rootTypes ?? [];
  if (!exempt.includes(d.docType)) {
    for (const key of domain.requiredFacets ?? []) {
      const v = d.facets[key];
      const empty = v === null || v === undefined || (Array.isArray(v) && v.length === 0);
      if (empty) missing.push(key);
    }
  }
  return missing;
}

/**
 * Load a source into the table. IDEMPOTENT: same source in, same rows out.
 *
 * Not a nicety — this gets re-run every time the corpus grows, and a loader
 * that appended would quietly double the haystack, which no retrieval output
 * would look wrong for.
 *
 * `content_sha` is what makes a later re-embed incremental. At 128 chunks that
 * is invisible; at the ~782 CORPUS-PLAN.md §2.3 projects it is the difference
 * between a command you run without thinking and one you don't.
 */
export async function loadDocuments(
  source: DocumentSource,
  domain: DocumentDomain,
  opts: { prune?: boolean; connectionString?: string; allowFullReplace?: boolean } = {},
): Promise<LoadResult> {
  const docs = await source.list();
  // WHICH DATABASE. Defaulting to the global `DATABASE_URL` kept this simple
  // while there was one customer, and stopped being simple the moment there
  // were two: a second domain lives in an entirely different Neon project, and
  // a package that can only ever write to one database is not a package that
  // transfers. The default is unchanged, so nothing above this line moves.
  const client = survivesDisconnect(
    new Client({ connectionString: opts.connectionString ?? connectionString() }),
    { label: 'documents' },
  );
  await client.connect();

  try {
    await ensureSchema(client);
    await client.query('begin');

    const before = await client.query<{ document_id: string; content_sha: string }>(
      `select document_id, content_sha from ${DOCUMENTS_TABLE}`,
    );
    const existing = new Map(before.rows.map((r) => [r.document_id, r.content_sha]));

    let inserted = 0, updated = 0, unchanged = 0, relations = 0;

    for (const d of docs) {
      const prior = existing.get(d.documentId);
      if (prior === d.contentSha) unchanged++;
      else if (prior === undefined) inserted++;
      else updated++;

      await client.query(
        `insert into ${DOCUMENTS_TABLE}
           (document_id, doc_type, title, body, edition,
            effective_on, expires_on, status, facets,
            content_sha, source_name, source_path, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12, now())
         on conflict (document_id) do update set
           doc_type = excluded.doc_type, title = excluded.title,
           body = excluded.body, edition = excluded.edition,
           effective_on = excluded.effective_on, expires_on = excluded.expires_on,
           status = excluded.status, facets = excluded.facets,
           content_sha = excluded.content_sha, source_name = excluded.source_name,
           source_path = excluded.source_path, updated_at = now()`,
        [
          d.documentId, d.docType, d.title, d.body, d.edition,
          d.effectiveOn, d.expiresOn, d.status, JSON.stringify(d.facets),
          d.contentSha, source.name, d.sourcePath,
        ],
      );

      // Replaced wholesale per document rather than merged: a relation REMOVED
      // from a document must disappear, and a merge would keep it for ever.
      await client.query(`delete from ${RELATIONS_TABLE} where from_id = $1`, [d.documentId]);
      for (const r of d.relations) {
        await client.query(
          `insert into ${RELATIONS_TABLE} (from_id, verb, to_ref) values ($1,$2,$3)
           on conflict do nothing`,
          [d.documentId, r.verb, r.toId],
        );
        relations++;
      }
    }

    // Opt-in. Against the seed corpus a vanished document is a real deletion;
    // against a customer's DMS, an id missing from one page of results is far
    // more likely to be a paging bug.
    let removed = 0;
    if (opts.prune) {
      /**
       * ZERO OVERLAP MEANS WRONG DATABASE, NOT AN EMPTIED CORPUS.
       *
       * A prune deletes every row the source did not supply. When the source
       * and the table share NOT ONE id, the overwhelmingly likely explanation
       * is that they are not about the same corpus at all — which is precisely
       * what happened when a second domain's load fell back to the first
       * domain's `DATABASE_URL` and removed 79 rows it had never heard of.
       *
       * A genuine full replacement is real but rare, and it is cheap to ask for
       * explicitly. A silent cross-corpus wipe is neither.
       */
      const incoming = new Set(docs.map((d) => d.documentId));
      const overlap = [...existing.keys()].filter((id) => incoming.has(id)).length;
      if (existing.size > 0 && overlap === 0 && !opts.allowFullReplace) {
        throw new Error(
          `refusing to prune: ${existing.size} document(s) already in ${DOCUMENTS_TABLE} and ` +
            `NONE of them appear in the ${docs.length} document(s) from ${source.name}. ` +
            `That normally means this load is pointed at the wrong database — check the ` +
            `connectionString passed to loadDocuments(). Pass allowFullReplace to override.`,
        );
      }

      const res = await client.query(
        `delete from ${DOCUMENTS_TABLE} where not (document_id = any($1::text[]))`,
        [docs.map((d) => d.documentId)],
      );
      removed = res.rowCount ?? 0;
    }

    await client.query('commit');

    return {
      source: source.name,
      seen: docs.length,
      inserted, updated, unchanged, removed, relations,
      incomplete: docs
        .map((d) => ({ documentId: d.documentId, missing: missingFields(d, domain) }))
        .filter((r) => r.missing.length > 0),
    };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}
