/**
 * WHERE DOCUMENTS COME FROM — the one seam that changes per engagement.
 *
 * A customer's documents already exist before anyone builds retrieval on them.
 * They live in a document management system — FileNet, SharePoint, Documentum,
 * Guidewire ContentManagement — reached through an API, with metadata attached.
 * That is the state of the world on day one, and it is what this interface
 * represents.
 *
 *   fileDocumentSource()    a committed seed corpus — this repo, and CI
 *   dbDocumentSource()      the documents table, which the product reads
 *   <customer>Source()      their DMS — one new implementation, nothing else
 *
 * NOTHING HERE IS DOMAIN-SPECIFIC. It was, until 2026-09-11: `DocType` was a
 * union of ten insurance nouns and `classify()` knew what an exclusions
 * schedule was. The vocabulary now arrives as a `DocumentDomain` value (see
 * `domain.types.ts`), so a second customer writes one config file and touches
 * nothing in this directory.
 *
 * ONE EXCEPTION by design: `pnpm chunks` keeps reading files via `loader.ts`.
 * It is a dev tool for inspecting the chunker offline and must never need a
 * database.
 */
import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { loadDirectory, sha, type Document as LoaderDocument } from './loader';
import type { DocumentDomain, DocumentFields } from './domain.types';
import { survivesDisconnect, PG_OPTIONS } from './pg-resilience';

/**
 * Lifecycle status. `unknown` is a real value, not a placeholder.
 *
 * A source that cannot determine status must say so rather than guess
 * 'current' — defaulting an unknown status to live is how a withdrawn document
 * reaches a decision. Which statuses mean "retired" is the DOMAIN's call; this
 * layer only knows the concept exists.
 */
export const UNKNOWN_STATUS = 'unknown';

export interface DocumentRelation {
  /** A domain-defined verb. Superseding is not the same as supplementing. */
  verb: string;
  /** May name an id this source has never seen. That is a fact, not an error. */
  toId: string;
}

/**
 * A whole, UNCHUNKED document plus the metadata precedence is decided from.
 *
 * Unchunked on purpose. Chunk size is already tunable — `pnpm chunks` reports
 * four budgets — and it will change. Chunks are derived and disposable; this is
 * the thing they are derived from.
 */
export interface SourceDocument {
  /**
   * The DOCUMENT's own identity, stable across runs — NOT the id of whatever
   * parent it belongs to. Two documents can legitimately share a parent id, and
   * keying on the parent merges them into one row.
   */
  documentId: string;
  /** A domain-defined type string. This layer groups by it, never reads it. */
  docType: string;
  title: string;
  /** The whole document, verbatim. */
  body: string;
  edition: string | null;
  effectiveOn: string | null;
  expiresOn: string | null;
  status: string;
  /** Domain metadata. One jsonb column, so a new customer is config not DDL. */
  facets: Record<string, unknown>;
  relations: DocumentRelation[];
  contentSha: string;
  sourcePath: string;
}

/** The seam. One method: hand us every document you hold, whole. */
export interface DocumentSource {
  readonly name: string;
  list(): Promise<SourceDocument[]>;
}

// ---------------------------------------------------------------------------
// Parsing a seed corpus
// ---------------------------------------------------------------------------

/**
 * Metadata lives in the leading blockquote as `Key: Value` pairs separated by
 * `·`. Keeping it IN the document rather than in a sidecar means the document
 * and the facts about it stay in one reviewable diff.
 */
const BANNER_FIELD = /([A-Za-z][A-Za-z ]*?)\s*:\s*([^·\n]+)/g;

export function bannerFields(text: string): DocumentFields {
  const out: DocumentFields = new Map();
  const quoted: string[] = [];
  for (const line of text.split('\n').slice(1)) {
    if (line.startsWith('>')) quoted.push(line.replace(/^>\s?/, ''));
    else if (quoted.length) break;
  }
  // Joined with NEWLINES, not spaces. The value pattern stops at `·` or a line
  // break; joining with a space let it run past the end of the line and swallow
  // the following sentence, which silently lost seven effective dates before it
  // was caught.
  for (const m of quoted.join('\n').matchAll(BANNER_FIELD)) {
    out.set(m[1].trim().toLowerCase(), m[2].trim());
  }
  return out;
}

const titleOf = (text: string): string =>
  (text.split('\n').find((l) => l.startsWith('# ')) ?? '').replace(/^#\s+/, '').trim();

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const asDate = (v: string | undefined): string | null =>
  v && DATE.test(v.trim()) ? v.trim() : null;

function relationsOf(fields: DocumentFields, domain: DocumentDomain): DocumentRelation[] {
  const out: DocumentRelation[] = [];
  for (const [key, verb] of Object.entries(domain.relationFields)) {
    for (const id of (fields.get(key) ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
      if (/^[A-Za-z]/.test(id)) out.push({ verb, toId: id });
    }
  }
  return out;
}

/**
 * The seed corpus as a document source.
 *
 * Reuses `loadDirectory` so document ids and content hashes stay identical to
 * what the chunker sees — a document must resolve to the same id in the table
 * and in the index.
 */
export function fileDocumentSource(dir: string, domain: DocumentDomain): DocumentSource {
  return {
    name: `files:${dir}`,
    async list(): Promise<SourceDocument[]> {
      const docs = await loadDirectory(dir);

      return docs.map((d) => {
        const fields = bannerFields(d.text);
        const title = titleOf(d.text);
        // Identity is the FILE, not whatever parent the document belongs to.
        const documentId = d.id.replace(/\.md$/i, '');

        const declaredId = domain.idFields
          .map((f) => fields.get(f))
          .find((v) => v && v.trim());

        const rawStatus = (fields.get('status') ?? '').toLowerCase().trim();

        return {
          documentId,
          docType: domain.classify(declaredId ?? documentId, title, fields),
          title,
          body: d.text,
          edition: fields.get('edition') ?? fields.get('revision') ?? null,
          effectiveOn: asDate(fields.get('effective') ?? fields.get('effective on')),
          expiresOn: asDate(fields.get('expires') ?? fields.get('expires on')),
          status: rawStatus || UNKNOWN_STATUS,
          facets: domain.facets(fields, { id: declaredId ?? documentId, title }),
          relations: relationsOf(fields, domain),
          contentSha: createHash('sha256').update(d.text).digest('hex'),
          sourcePath: relative(dir, d.path),
        };
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Reading the document store — what the product path uses
// ---------------------------------------------------------------------------

/**
 * The documents table as a source. THIS IS THE ONE THE PRODUCT USES.
 *
 * ORDERING IS LOAD-BEARING and is done in Node, not in SQL. Chunk ids derive
 * from a document's POSITION, so a different order renumbers the whole index.
 * `loadDirectory` sorts by the file-relative id; sorting by `document_id` in
 * SQL put two documents past each other and moved every chunk id downstream.
 * `pnpm corpus:check` caught it; nothing in the output would have looked wrong.
 * Postgres collation is also not guaranteed to match JavaScript's.
 */
export function dbDocumentSource(opts: { connectionString: string }): DocumentSource {
  return {
    name: 'db:documents',
    async list(): Promise<SourceDocument[]> {
      // Required lazily so a files-only path never opens a driver.
      const { Client } = require('pg') as typeof import('pg');
      const client = survivesDisconnect(new Client({ connectionString: opts.connectionString, ...PG_OPTIONS }), {
        label: 'document-source',
      });
      await client.connect();
      try {
        const { rows } = await client.query(
          `select d.*,
                  coalesce(
                    (select json_agg(json_build_object('verb', r.verb, 'toId', r.to_ref))
                       from document_relations r where r.from_id = d.document_id),
                    '[]'::json
                  ) as relations
             from documents d`,
        );
        return rows
          .map((r: any) => ({
            documentId: r.document_id,
            docType: r.doc_type,
            title: r.title,
            body: r.body,
            edition: r.edition,
            // pg returns DATE as a Date; the interface is an ISO day string.
            effectiveOn: r.effective_on ? new Date(r.effective_on).toISOString().slice(0, 10) : null,
            expiresOn: r.expires_on ? new Date(r.expires_on).toISOString().slice(0, 10) : null,
            status: r.status,
            facets: r.facets ?? {},
            relations: (r.relations ?? []) as DocumentRelation[],
            contentSha: r.content_sha,
            sourcePath: r.source_path,
          }))
          // Exactly `loadDirectory`'s sort, on exactly the field it sorts on.
          .sort((a: SourceDocument, b: SourceDocument) =>
            a.sourcePath.localeCompare(b.sourcePath));
      } finally {
        await client.end();
      }
    },
  };
}

/**
 * A SourceDocument as the chunker's `Document`.
 *
 * Reproduces exactly what `loadDirectory` returns, field for field, so
 * switching ingest between sources is a PROVABLE NO-OP: same chunk ids, same
 * hashes, same metadata, same citations.
 *
 * `id` is `sourcePath` — WITH the extension — because that is what
 * `loadDirectory` produced and what every existing chunk id derives from.
 */
export function asLoaderDocument(d: SourceDocument): LoaderDocument {
  return {
    id: d.sourcePath,
    path: d.sourcePath,
    text: d.body,
    hash: sha(d.body),
    bytes: Buffer.byteLength(d.body, 'utf8'),
  };
}
