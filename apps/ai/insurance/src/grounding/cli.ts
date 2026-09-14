/**
 * The retrieval CLI, for THIS domain — configuration only.
 *
 * Every command lives in `@fde/grounding` (`cli.ts`): the argument parsing, the
 * chunk-budget sweep, the seed load, the fingerprint comparison, the ingest and
 * the query. None of that is specific to insurance, and writing it again per
 * customer is exactly how it drifts — one repo redacts the connection string
 * and the next prints a live password.
 *
 * What is here is the 10% that cannot transfer: where the corpus lives, which
 * form ids headings resolve to, which environment variables this deployment
 * needs, and what an ingest costs.
 *
 *   pnpm env:check                      is .env filled in?          OFFLINE
 *   pnpm chunks                         inspect corpus + chunking   OFFLINE
 *   pnpm holder AUT-4471                exact record lookup         OFFLINE
 *   pnpm corpus:load                    seed files -> documents     needs pg
 *   pnpm corpus:check                   db index == folder index?   needs pg
 *   pnpm ingest                         build the pgvector index    needs Azure + pg
 *   pnpm query "rental car limit" --form PP 00 01 06 24
 */
// Imported for its side effect as much as for `env`: this module loads .env
// from the repo root, and every command below needs that to have happened.
import { env } from '../foundry/client';
import {
  connectionString,
  dbDocumentSource,
  fileDocumentSource,
  runGroundingCli,
} from '@fde/grounding';
import { logRequest } from '@fde/telemetry';
import '../telemetry/prices';
import { INSURANCE_DOCUMENTS } from '../config/insurance-documents';
import { formIdOf, matchesForm } from '../config/form-id';
import { DOMAIN } from '../config/domain';
import { getPolicyholderTool } from '../tools/get-policyholder.tool';
import { openEmbeddings, embeddingsChoice, embeddingUsage } from './embeddings.factory';

runGroundingCli({
  corpusDir: DOMAIN.corpusDir,
  tableName: DOMAIN.vectorTable,
  domain: INSURANCE_DOCUMENTS,
  fileSource: fileDocumentSource(DOMAIN.corpusDir, INSURANCE_DOCUMENTS),
  dbSource: dbDocumentSource({ connectionString: connectionString() }),

  envVars: [
    'FOUNDRY_OPENAI_ENDPOINT',
    'FOUNDRY_CHAT_DEPLOYMENT',
    'FOUNDRY_EMBEDDING_DEPLOYMENT',
  ],

  embeddings: openEmbeddings,
  embeddingsLabel: embeddingsChoice,
  embeddingUsage,

  // Form ids are ours: `PP 00 01 06 24`, derived from the heading trail. Most
  // of the corpus has none — bulletins and circulars are not forms — and
  // `formIdOf` returning '' for them is correct, not a gap to paper over.
  identifierOf: formIdOf,
  matchesIdentifier: matchesForm,
  filterKey: 'formId',
  filterFlag: 'form',

  /**
   * Pillar 5. Ingest is a real cost — hundreds of passages embedded — and it is
   * the one that scales with the corpus rather than with traffic, so it would
   * otherwise never appear in a per-question cost table.
   */
  onIngestCost(c) {
    logRequest({
      subject: null,
      question: 'ingest db:documents',
      model: c.label === 'local' ? 'local-embeddings' : env.embeddingDeployment(),
      engine: c.label,
      turns: 0,
      toolCalls: 0,
      inputTokens: c.inputTokens,
      outputTokens: 0,
      ms: c.ms,
      stoppedBecause: 'complete',
      schemaRetries: 0,
      surface: 'ingest',
    });
  },

  commands: {
    /**
     * Exact record lookup. Domain-only by construction: `get_policyholder`
     * fetches ONE record by key and is the tool that exists to not be a search.
     */
    async holder(args) {
      const id = args[0];
      if (!id) {
        console.error('usage: holder <POLICY_ID>');
        process.exit(1);
      }
      console.log(JSON.stringify(await getPolicyholderTool().execute({ policy_id: id }), null, 2));
    },
  },
});
