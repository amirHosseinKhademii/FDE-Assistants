/**
 * PROVE A SOURCE SWAP CHANGED NOTHING.
 *
 * A retrieval pipeline's inputs move: files become a database, a database
 * becomes a customer's API, a loader is replaced, an ordering changes. Every
 * one of those is claimed to be a no-op, and "it is only a refactor" is how an
 * index gets silently rewritten.
 *
 * This fingerprints everything the vector store would receive — the embedded
 * TEXT and the METADATA — from two or more sources, and asserts they agree.
 * It costs one read per source: no embeddings, no model call.
 *
 * WHY METADATA IS IN THE FINGERPRINT. Metadata is what makes a chunk citable
 * and filterable. A check that only counted chunks would pass while every
 * citation quietly changed shape — and that is not hypothetical: the check that
 * became this one caught a source returning the same 555 chunks in a different
 * ORDER, which renumbered every chunk id. A re-ingest would have rewritten
 * every citation the model emits, and nothing in the output would have looked
 * wrong.
 *
 * WHY KEY ORDER IS NORMALISED. Postgres normalises jsonb key order, so a
 * database source returns metadata keys in a different order than a file source
 * builds them — identical data, different `JSON.stringify`, different hash. The
 * first version compared raw stringify and reported a FAIL for a corpus that
 * was byte-identical in content. A fingerprint compares CONTENT.
 *
 * WHY THERE IS A NEGATIVE CONTROL. Matching fingerprints prove nothing unless a
 * mismatch would show up. The control reverses document order — the exact bug
 * this check was built to catch — and asserts the fingerprint moves. If it ever
 * stops failing, the comparison above it has gone blind.
 */
import { createHash } from 'node:crypto';
import { chunkAll, type ChunkOptions } from './chunker';
import { toLangChainDocument } from './ingest';
import { asLoaderDocument, type SourceDocument } from './document-source';

export interface Fingerprint {
  chunks: number;
  /** sha256 over content + order-normalised metadata, first 16 hex chars. */
  sha: string;
}

/** Recursively sort object keys so serialisation is order-independent. */
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, stable(val)]),
    );
  }
  return v;
}

/** Fingerprint what these documents would put into the vector store. */
export function fingerprintDocuments(
  docs: SourceDocument[],
  opts?: ChunkOptions,
): Fingerprint {
  const byId = new Map(docs.map((d) => [d.sourcePath, d]));
  const lc = chunkAll(docs.map(asLoaderDocument), opts).map((c) =>
    toLangChainDocument(c, byId.get(c.documentId)),
  );
  const blob = lc
    .map((d) => JSON.stringify({ content: d.pageContent, metadata: stable(d.metadata) }))
    .join('\n');
  return {
    chunks: lc.length,
    sha: createHash('sha256').update(blob).digest('hex').slice(0, 16),
  };
}

export interface LabelledSource {
  label: string;
  docs: SourceDocument[];
}

export interface SourceComparison {
  results: Array<{ label: string; fingerprint: Fingerprint }>;
  /** True when every source yields an identical fingerprint. */
  agree: boolean;
  /** False means the comparison cannot detect a difference — it is blind. */
  controlPassed: boolean;
  controlSha: string;
}

/**
 * Compare two or more sources, and run the negative control.
 *
 * Needs at least two sources: comparing one against itself is the shape of
 * check that passes forever and means nothing.
 */
export function compareDocumentSources(
  sources: LabelledSource[],
  opts?: ChunkOptions,
): SourceComparison {
  if (sources.length < 2) {
    throw new Error(
      'compareDocumentSources needs at least two sources — one source compared ' +
        'against itself always agrees and proves nothing.',
    );
  }

  const results = sources.map((s) => ({
    label: s.label,
    fingerprint: fingerprintDocuments(s.docs, opts),
  }));

  const first = results[0].fingerprint;
  const agree = results.every(
    (r) => r.fingerprint.sha === first.sha && r.fingerprint.chunks === first.chunks,
  );

  // Reversing order must change the fingerprint, because chunk ids derive from
  // position. If it does not, the fingerprint is not looking at order and the
  // whole comparison is weaker than it appears.
  const reversed = fingerprintDocuments([...sources[0].docs].reverse(), opts);

  return {
    results,
    agree,
    controlPassed: reversed.sha !== first.sha,
    controlSha: reversed.sha,
  };
}
