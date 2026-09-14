/**
 * The retrieval CLI, for THIS domain — configuration only.
 *
 * Every command lives in `@fde/grounding`: argument parsing, the chunk-budget
 * sweep, the seed load, the fingerprint comparison, the ingest, the query. Not
 * one line of that is specific to pharmaceuticals, and this file is the
 * measurement of that claim — if the package needed changing to serve a second
 * domain, this is where it would have shown.
 *
 *   pnpm chunks                    inspect corpus + chunking        OFFLINE
 *   pnpm env:check                 is .env filled in?               OFFLINE
 *   pnpm corpus:load               seed files -> documents table    needs pg
 *   pnpm corpus:check              db index == folder index?        needs pg
 *   pnpm ingest                    build the pgvector index         needs Azure + pg
 *   pnpm query "who may certify a batch" --sop SOP-QC-014
 *
 * EVERYTHING HERE POINTS AT `mrd_kb`, NEVER AT THE SIX. The record systems are
 * the customer's and are read by `db:trace`; this builds an index on top of
 * their documents and must not be able to reach their records. That is a
 * connection string, and it is the only place the distinction is enforced.
 */
import {
  dbDocumentSource,
  fileDocumentSource,
  runGroundingCli,
} from '@fde/grounding';
import { KB_DB, urlFor, REPO_ROOT } from '../config/connections';
import { PHARMA_DOCUMENTS } from '../config/pharma-documents';
import { openEmbeddings, embeddingsChoice, embeddingUsage } from './embeddings.factory';
import { join, resolve } from 'node:path';

/**
 * The corpus lives in `docs/`, outside the package, for the reason
 * `CORPUS-PLAN.md` gives: a customer's documents are not source code. They are
 * reviewed by different people on a different schedule, and at a real
 * engagement they are not in this repo at all.
 */
const CORPUS_DIR = process.env.PHARMA_CORPUS_DIR
  ?? resolve(REPO_ROOT, 'docs', 'pharma', 'corpus');

const KB_URL = urlFor(KB_DB);

runGroundingCli({
  corpusDir: CORPUS_DIR,
  // Named for what it holds, not for the customer. `sop_chunks` would be wrong
  // too — the index carries standards and policies as well as procedures.
  tableName: 'document_chunks',
  domain: PHARMA_DOCUMENTS,
  fileSource: fileDocumentSource(CORPUS_DIR, PHARMA_DOCUMENTS),
  dbSource: dbDocumentSource({ connectionString: KB_URL }),

  // BOTH the documents AND the vectors live in mrd_kb. `dbSource` above only
  // covers the first; without this the index would be built in whatever
  // `DATABASE_URL` names — which in this repo is the insurance project, and the
  // resulting queries would return plausible answers from the wrong estate.
  connectionString: KB_URL,

  envVars: [
    'PHARMA_DATABASE_URL',
    'EMBEDDINGS',
    'FOUNDRY_OPENAI_ENDPOINT',
    'FOUNDRY_EMBEDDING_DEPLOYMENT',
  ],

  embeddings: openEmbeddings,
  embeddingsLabel: embeddingsChoice,
  embeddingUsage,

  /**
   * The identifier a heading trail resolves to.
   *
   * A SOP's own heading carries its revision — `SOP-QC-014 Rev 7` — and that is
   * the string a citation must name, because Rev 6 and Rev 7 are different
   * documents saying different things. Standards and policies have no such
   * identifier and returning `''` for them is correct rather than a gap.
   */
  identifierOf(headingTrail: string): string {
    const m = /\b(SOP-[A-Z]{2,4}-\d{3})\s+Rev\s+(\d+)\b/i.exec(headingTrail);
    // Normalised to the CANONICAL spelling — `SOP-QC-014 Rev 7` — rather than
    // upper-cased wholesale. The first version returned `SOP-QC-014 REV 7`,
    // which matched fine (comparison normalises both sides) and rendered as a
    // citation nobody writes that way. An identifier that appears in output is
    // read by people, so it spells itself the way the document does.
    return m ? `${m[1].toUpperCase()} Rev ${Number(m[2])}` : '';
  },

  /**
   * EXACT, and the exactness is the whole lesson carried over from form
   * editions. `SOP-QC-014` is a prefix of `SOP-QC-014 Rev 6` and of
   * `SOP-QC-014 Rev 7`; a prefix match merges two revisions that disagree about
   * whether a QP needs current training, and returns whichever the embedding
   * liked better with a citation attached.
   */
  matchesIdentifier(heading: string, wanted: string): boolean {
    const norm = (s: string): string => s.toUpperCase().replace(/\s+/g, ' ').trim();
    return norm(heading) === norm(wanted);
  },

  // The filter narrows on the PROCEDURE, because that is what an operator
  // types — `--sop SOP-QC-014` — while the identifier above names the
  // REVISION. Two different strings for two different questions, which is why
  // `@fde/grounding` keeps the flag and the metadata key separate.
  filterKey: 'sopId',
  filterFlag: 'sop',
});
