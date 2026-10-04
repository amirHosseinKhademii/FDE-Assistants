/**
 * The policy index's BUILD side — configuration only, like pharma's `cli.ts`.
 *
 *   pnpm commerce:kb-chunks        inspect the corpus and its chunking     OFFLINE
 *   pnpm commerce:kb-load          seed files -> thb_kb documents table    admin
 *   pnpm commerce:kb-ingest        chunk + embed (bge-small) -> KB_TABLE   admin
 *   pnpm commerce:kb-query "…"     the raw dense arm, for poking           admin
 *
 * THIS SIDE HOLDS THE ESTATE'S ADMIN URL, AND THAT IS WHY IT IS A SEPARATE FILE
 * FROM `query.ts`. It writes: it creates tables in `thb_kb`, deletes and
 * re-inserts chunks. The query side reads with a role that can do none of that
 * (`kb-provision.ts`, `kb-check.ts`). Everything the two must agree on — table,
 * model, dimension — comes from `kb.ts`, not from here.
 *
 * `envVars` names NO connection string. `runGroundingCli`'s `config` command
 * prints the values of what is listed (redacting URL passwords), and a URL that
 * never reaches a print statement is one less thing to get right.
 */
import { dbDocumentSource, fileDocumentSource, runGroundingCli } from '@fde/grounding';
import { resolve } from 'node:path';
import { REPO_ROOT, urlFor } from '../config/connections';
import { COMMERCE_DOCUMENTS } from '../config/commerce-documents';
import { KB_DB, KB_TABLE, kbEmbeddings } from './kb';

/** A customer's documents are not source code — see CORPUS-PLAN.md. Overridable. */
export const CORPUS_DIR = process.env.COMMERCE_CORPUS_DIR ?? resolve(REPO_ROOT, 'docs', 'commerce', 'corpus');

/** Local embeddings cost nothing; the counter is kept because the CLI contract has one. */
const embeddingUsage = { promptTokens: 0 };

/** `POL-RET-001 Rev 3 — Returns and Refunds Policy` → `POL-RET-001 Rev 3`: the Revision Id. */
export function identifierOf(headingTrail: string): string {
  const first = headingTrail.split(' > ')[0] ?? '';
  return first.split(' — ')[0]?.trim() ?? '';
}

if (require.main === module) {
  const KB_URL = urlFor(KB_DB);

  runGroundingCli({
    corpusDir: CORPUS_DIR,
    tableName: KB_TABLE,
    domain: COMMERCE_DOCUMENTS,
    fileSource: fileDocumentSource(CORPUS_DIR, COMMERCE_DOCUMENTS),
    // BOTH the documents AND the vectors live in thb_kb. Without `connectionString`
    // below the index would be built wherever DATABASE_URL points — the insurance
    // project — and queries would return plausible answers from the wrong corpus.
    dbSource: dbDocumentSource({ connectionString: KB_URL }),
    connectionString: KB_URL,
    envVars: ['EMBEDDINGS'],
    embeddings: kbEmbeddings,
    embeddingsLabel: () => 'local (bge-small, 384)',
    embeddingUsage,
    identifierOf,
    // EXACT. `POL-RET-001 Rev 2` and `Rev 3` disagree about electronics, and a
    // prefix match would answer from whichever the embedding liked better.
    matchesIdentifier(heading: string, wanted: string): boolean {
      const norm = (s: string): string => s.toUpperCase().replace(/\s+/g, ' ').trim();
      return norm(identifierOf(heading)) === norm(wanted);
    },
    // The filter narrows on the POLICY (`POL-RET-001`), which is what an
    // operator types; the identifier above names the REVISION.
    filterKey: 'docId',
    filterFlag: 'doc',
  });
}
