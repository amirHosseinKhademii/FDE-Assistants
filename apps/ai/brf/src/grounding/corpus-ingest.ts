/**
 * Reads the BRF corpus folder, chunks it, and writes the index.
 *
 * The package ingest does the work: it wipes the table, writes the chunks and
 * builds the Swedish full-text column. This file adds the provenance a citation
 * needs, which the package cannot know. A per-document facet cannot carry a
 * section number, because one document holds many sections, so each chunk is
 * annotated on its way into the store.
 */
import type { Document as LCDocument } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';
import { fileDocumentSource, ingestDocuments, type IngestResult } from '@fde/grounding';
import { DOMAIN } from '../config/domain';
import { BRF_DOCUMENTS, sectionNumberOf } from '../config/brf-documents';

export interface CorpusIngestResult extends IngestResult {
  /** Chunks under a § heading, which therefore carry a citable section number. */
  withSectionNumber: number;
}

/**
 * Adds `file` and `sectionNumber` to one chunk's metadata.
 *
 * The package already sets `documentId` to the file name ("stadgar.md"), because
 * it uses the source path as the document identity. `file` repeats that under the
 * name the tools and the citations use. `section` stays as the heading trail,
 * because the tools and the CLI read it.
 */
export function withProvenance(doc: LCDocument): LCDocument {
  doc.metadata = {
    ...doc.metadata,
    file: String(doc.metadata.documentId ?? ''),
    sectionNumber: sectionNumberOf(String(doc.metadata.section ?? '')),
  };
  return doc;
}

export async function ingestCorpus(
  store: PGVectorStore,
  onProgress?: (msg: string) => void,
): Promise<CorpusIngestResult> {
  let withSectionNumber = 0;

  // ingestDocuments calls exactly two methods on the store it is given. This
  // object forwards those two, and annotates the chunks on the way in.
  const writer = {
    delete: (params: Parameters<PGVectorStore['delete']>[0]) => store.delete(params),
    addDocuments: (docs: LCDocument[]) => {
      const annotated = docs.map(withProvenance);
      withSectionNumber += annotated.filter((d) => d.metadata.sectionNumber !== null).length;
      return store.addDocuments(annotated);
    },
  } as unknown as PGVectorStore;

  const result = await ingestDocuments(
    writer,
    fileDocumentSource(DOMAIN.corpusDir, BRF_DOCUMENTS),
    {
      tableName: DOMAIN.vectorTable,
      connectionString: DOMAIN.databaseUrl,
      textSearchConfig: DOMAIN.textSearchConfig,
      onProgress,
    },
  );

  return { ...result, withSectionNumber };
}
