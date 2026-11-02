/**
 * The BRF index commands.
 *
 *   pnpm brf:ingest                   read the corpus folder, embed it, write the index
 *   pnpm --filter @brf/ai chunks      inspect the corpus and the chunking, offline
 *   pnpm --filter @brf/ai config      show the configuration, offline, secrets redacted
 *
 * ingest is the only command that writes. It wipes the table before it writes, so an
 * ingest that fails part way leaves the table partly filled. Run it again to finish.
 *
 * This entry point must not import @fde/agent or @fde/foundry. Those load Azure modules,
 * and an ingest with EMBEDDINGS=local should reach neither.
 */
import './config/env';
import { inspectChunking, loadDirectory, redactedConnectionString } from '@fde/grounding';
import { logRequest } from '@fde/telemetry';
import { DOMAIN, EMBEDDING_MODEL, EMBEDDING_POOLING, TEXT_SEARCH_CONFIG } from './config/domain';
import { sectionNumberOf } from './config/brf-documents';
import { embeddingsLabel, embeddingUsage, openEmbeddings } from './grounding/embeddings.factory';
import { openBrfStore } from './grounding/store';
import { ingestCorpus } from './grounding/corpus-ingest';
import './telemetry/request-log';

const command = process.argv[2];

async function chunks(): Promise<void> {
  const docs = await loadDirectory(DOMAIN.corpusDir);
  console.log(`\n${docs.length} documents in ${DOMAIN.corpusDir}\n`);

  const { lines, chunks: all } = inspectChunking(docs);
  for (const l of lines) console.log(l);

  const numbered = all.filter((c) => sectionNumberOf(c.headings.join(' > ')) !== null).length;
  console.log(`\n  ${numbered} of ${all.length} chunks at the default budget carry a § number\n`);
}

function config(): void {
  console.log('');
  console.log(`  corpus        ${DOMAIN.corpusDir}`);
  console.log(`  database      ${redactedConnectionString(DOMAIN.databaseUrl)}`);
  console.log(`  table         ${DOMAIN.vectorTable}`);
  console.log(`  embeddings    ${DOMAIN.embeddingChoice}`);
  if (DOMAIN.embeddingChoice === 'local') {
    console.log(`  model         ${EMBEDDING_MODEL} (${EMBEDDING_POOLING} pooling)`);
    console.log(`  model cache   ${process.env.LOCAL_EMBEDDING_CACHE_DIR}`);
  }
  console.log(`  text search   ${TEXT_SEARCH_CONFIG}`);
  console.log(`  llm provider  ${process.env.LLM_PROVIDER ?? 'unset'}`);
  console.log(`  loop          ${process.env.LOOP ?? 'mastra (default)'}`);
  console.log('');
}

async function ingest(): Promise<void> {
  const label = embeddingsLabel();
  const store = await openBrfStore(openEmbeddings());

  console.log(`\nindexing ${DOMAIN.vectorTable} at ${redactedConnectionString(DOMAIN.databaseUrl)}`);
  console.log(
    `embeddings: ${label}` +
      (label === 'local' ? ` (${EMBEDDING_MODEL}, ${EMBEDDING_POOLING} pooling)` : ''),
  );
  if (label === 'local') console.log(`model cache: ${process.env.LOCAL_EMBEDDING_CACHE_DIR}`);
  console.log('');

  embeddingUsage.promptTokens = 0;
  const started = Date.now();
  const res = await ingestCorpus(store, (m) => console.log(`  ${m}`));
  await store.end();

  logRequest({
    subject: null,
    question: `ingest ${DOMAIN.vectorTable}`,
    model: label === 'local' ? `local/${EMBEDDING_MODEL}` : 'azure-embeddings',
    engine: label,
    turns: 0,
    toolCalls: 0,
    inputTokens: embeddingUsage.promptTokens,
    outputTokens: 0,
    ms: Date.now() - started,
    stoppedBecause: 'complete',
    schemaRetries: 0,
    surface: 'ingest',
  });

  console.log(
    `\ndone: ${res.documents} documents, ${res.chunks} chunks, ` +
      `${res.withSectionNumber} with a § number\n`,
  );
}

async function main(): Promise<void> {
  if (command === 'chunks') return chunks();
  if (command === 'config') return config();
  if (command === 'ingest') return ingest();
  console.error('usage: ingest.ts ingest | chunks | config');
  process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
