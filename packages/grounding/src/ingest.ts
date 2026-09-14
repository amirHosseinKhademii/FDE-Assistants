/**
 * Build the index: documents → chunks → pgvector, via LangChain.
 *
 * WHY THE CHUNKER IS STILL HAND-WRITTEN, when the point of adopting a framework
 * was to stop hand-writing retrieval code. The hand-rolled version was
 * archived, and then measured back in.
 *
 * LangChain.js ships `CharacterTextSplitter`, `RecursiveCharacterTextSplitter`,
 * `MarkdownTextSplitter`, `TokenTextSplitter` and `LatexTextSplitter`. Not one
 * of them attaches the heading trail to the chunk as metadata — the Python
 * `MarkdownHeaderTextSplitter` has no JavaScript equivalent. In a corpus of
 * near-identical documents that is fatal, not cosmetic:
 *
 *   - A retrieved fragment reading "we will pay $40 per day" is worthless
 *     without the trail that says WHICH document and WHICH section it came
 *     from. A dozen near-identical revisions each contain that sentence with a
 *     different number.
 *   - The highest-value eval check any grounded system has is that a cited
 *     source resolves to a real document. With no identifier in the metadata
 *     there is nothing to cite and nothing to resolve.
 *   - `MarkdownTextSplitter` would also happily cut a limits table away from
 *     its header row, which turns "$1,000" into a number with nothing attached.
 *
 * So the split is: **the framework does the generic 90%, you keep the domain
 * 10%.** LangChain owns loading into its Document type, embedding, storage,
 * retrieval, filtering and reranking. What stays here is the one transformation
 * that preserves document structure. That is not a failure of the framework —
 * it is the correct boundary, and finding it took a type signature rather than
 * an argument.
 */
import { Document as LCDocument } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';
import { chunkAll, type Chunk } from './chunker';
import { asLoaderDocument, type DocumentSource, type SourceDocument } from './document-source';
import { ensureFullTextIndex } from './hybrid';

export interface IngestResult {
  documents: number;
  chunks: number;
}

/**
 * Convert our chunk into LangChain's Document.
 *
 * `pageContent` is the heading trail plus body — the same text the hand-rolled
 * embedder sent, so the vectors mean the same thing they did before the swap.
 * Everything a citation needs travels in `metadata`, because that is what
 * survives the round trip through the vector store.
 */
export function toLangChainDocument(c: Chunk, src?: SourceDocument): LCDocument {
  const trail = c.headings.join(' > ');

  return new LCDocument({
    pageContent: c.text,
    metadata: {
      chunkId: c.id,
      documentId: c.documentId,
      section: trail,
      body: c.body,
      hash: c.hash,
      index: c.index,
      // Where the passage begins in its source file. Carried so a citation can
      // say "open this file HERE" — without it, a schema that requires a line
      // gets one invented. See the note on `Chunk.startLine`.
      startLine: c.startLine,

      // ---- Carried from the documents table --------------------------------
      //
      // WITHOUT THIS, MOST OF A REAL CORPUS IS UNREACHABLE. A domain's primary
      // identifier is typically derived from the heading text and only exists
      // for its primary document type — in this project's corpus it was empty
      // for 67 of 79 documents, because bulletins, circulars, determinations,
      // procedures and manuals simply do not carry one. A search tool filtering
      // on that identifier matches nothing for all of them, silently.
      //
      // The fix is NOT a looser identifier regex; loosening one is how distinct
      // variants get silently merged. It is to carry the fields precedence is
      // actually decided on — type, date, status, jurisdiction — so they become
      // filters the database applies rather than facts the model has to notice
      // inside prose.
      //
      // `docRef` is what a citation names, and is deliberately distinct from
      // the derived identifier: two documents may legitimately share the latter
      // while being separately citable.
      docType: src?.docType ?? null,
      docRef: src?.documentId ?? null,
      effectiveOn: src?.effectiveOn ?? null,
      status: src?.status ?? 'unknown',
      // Domain facets are SPREAD, not nested, so a search filter reads
      // `metadata.jurisdiction` rather than `metadata.facets.jurisdiction` —
      // which keeps the tools' filters working and keeps this layer ignorant of
      // what the keys mean.
      ...(src?.facets ?? {}),
    },
  });
}

/**
 * Read the customer's documents, chunk them, and write the vectors to pgvector.
 *
 * TAKES A SOURCE, NOT A DIRECTORY. It used to take `dir: string`, which encoded
 * an assumption no customer satisfies: that their documents are files in a
 * folder. They are records in a document management system. `DocumentSource`
 * is the seam — `dbDocumentSource()` in the product, `fileDocumentSource()` to
 * populate that store from a committed fixture.
 *
 * The swap is verified rather than asserted: `pnpm corpus:check` chunks from
 * both and compares the fingerprint of everything the vector store receives,
 * content and metadata. It caught a real ordering bug on its first run.
 *
 * Idempotent by table: the store is emptied first, because a partial re-ingest
 * that leaves stale chunks behind produces an index that disagrees with the
 * source — and nothing about the retrieval output would look wrong.
 */
export async function ingestDocuments(
  store: PGVectorStore,
  source: DocumentSource,
  // `connectionString` must name the SAME database the store was opened with.
  // It is not defaulted separately: the full-text column belongs to the chunk
  // table, and adding it to a table of that name in a DIFFERENT database is a
  // failure with no symptom — the dense arm works, the keyword arm silently
  // finds nothing, and hybrid search quietly degrades to half of itself.
  opts: { onProgress?: (msg: string) => void; tableName?: string; connectionString?: string } = {},
): Promise<IngestResult> {
  const sourceDocs = await source.list();
  const docs = sourceDocs.map(asLoaderDocument);
  // Keyed on the same id `asLoaderDocument` puts on the chunker's Document, so
  // every chunk can find the document it came from.
  const byId = new Map(sourceDocs.map((d) => [d.sourcePath, d]));
  opts.onProgress?.(`loaded ${docs.length} documents from ${source.name}`);

  const chunks = chunkAll(docs);
  opts.onProgress?.(`chunked into ${chunks.length} passages`);

  await store.delete({ filter: {} }).catch(() => {
    // First run: the table may not exist yet. initialize() creates it.
  });

  const lcDocs = chunks.map((c) => toLangChainDocument(c, byId.get(c.documentId)));
  await store.addDocuments(lcDocs);
  opts.onProgress?.(`embedded and stored ${lcDocs.length} chunks`);

  // The keyword half of retrieval. A GENERATED column, so it cannot fall out of
  // step with `content`, and created here rather than in `openStore` so that
  // opening the store to read never issues DDL.
  await ensureFullTextIndex({ tableName: opts.tableName, connectionString: opts.connectionString });
  opts.onProgress?.('full-text index ready');

  return { documents: docs.length, chunks: chunks.length };
}
