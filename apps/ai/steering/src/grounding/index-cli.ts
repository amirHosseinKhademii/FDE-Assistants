/**
 * `pnpm steering:index` — pipeline 2, the one that was missing.
 *
 * Cuts the corpus into passages, embeds them, and stores them in
 * `vst_derived.document_chunks` so a question can FIND a document instead of
 * being told where to look.
 *
 * ── WHAT THIS IS ACTUALLY FOR, WHICH IS NOT "RAG" ────────────────────────
 *
 * `walk-cost` step 3 currently opens
 * `eps-steering-feel/docs/safety-assessment-2021.md` by a path written into the
 * source, and finds the right paragraph with a regex keyed to a constant also
 * written into the source. The sentence it surfaces is the single most valuable
 * one in the estate — the damping software ships at ASIL B, a new programme
 * needs ASIL D — and the walk's own output says so: *"this cost item only
 * exists if somebody read the document."*
 *
 * Except nobody read anything. The answer is real and the FINDING of it is
 * staged. At a real engagement no one knows that path. This step is what
 * replaces it.
 *
 * ── NOTHING HERE IS HAND-WRITTEN ─────────────────────────────────────────
 *
 * Loading, heading-aware chunking, table protection, the heading trail on every
 * chunk, batching, the full-text column, hybrid search — all `@fde/grounding`.
 * What steering supplies is one descriptor (`config/steering-documents.ts`) and
 * this file. If that ratio ever inverts, the split was drawn wrong.
 *
 * ── `--dry-run` SPENDS NOTHING ───────────────────────────────────────────
 *
 * Loads and chunks, prints the shape, stores nothing and embeds nothing. Worth
 * running first every time: the run that costs money should not be the run that
 * tells you the file selection was wrong.
 */
import { resolve } from 'node:path';
import {
  fileDocumentSource, chunkAll, loadDirectory, openStore, ingestDocuments,
  asLoaderDocument, redactedConnectionString, toLangChainDocument,
} from '@fde/grounding';
import { derivedUrl, REPO_ROOT } from '../config/connections';
import { STEERING_DOCUMENTS } from '../config/steering-documents';
import { CHUNK_TABLE } from './chunks';
import { loadCode } from './code-source';
import { openEmbeddings, embeddingsChoice, embeddingUsage } from './embeddings.factory';
import { logRequest } from '@fde/telemetry';
import '../telemetry/prices';

// The chunk table name lives in `chunks.ts`, a file with no side effects, so
// that reading it never runs this. See that file for what happened when it did.
export { CHUNK_TABLE } from './chunks';

const CORPUS = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

const DRY = process.argv.includes('--dry-run');

/** `pmo/closure-reports/EFF-BULK-0067.md` → `closure_report`. Counted for the shape report. */
function countByType(paths: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const t = STEERING_DOCUMENTS.classify(p, '', new Map());
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

async function shape(): Promise<{ docs: number; chunks: number; chars: number; byType: Map<string, number> }> {
  const loaded = await loadDirectory(CORPUS);
  const source = fileDocumentSource(CORPUS, STEERING_DOCUMENTS);
  const listed = await source.list();
  const chunks = chunkAll(listed.map(asLoaderDocument));

  // Code is loaded and chunked separately — `loadDirectory` reads prose
  // extensions only, and routing C through the markdown chunker would index it
  // successfully and uselessly. See `code-source.ts`.
  const code = loadCode(CORPUS);
  const codeChunks = code.flatMap((u) => u.chunks);

  return {
    docs: loaded.length + code.length,
    chunks: chunks.length + codeChunks.length,
    chars: [...chunks, ...codeChunks].reduce((a, c) => a + c.text.length, 0),
    byType: countByType([...listed.map((d) => d.sourcePath), ...code.map((u) => u.document.sourcePath)]),
  };
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`\nIndexing ${CORPUS}\n`);

  const s = await shape();
  for (const [type, n] of [...s.byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${type}`);
  }
  console.log(`\n  ${s.docs} documents → ${s.chunks} passages, ${(s.chars / 1000).toFixed(0)}k characters`);
  // ── 3.15 CHARACTERS PER TOKEN, MEASURED, NOT THE USUAL 4 ───────────────
  //
  // The dry-run said ~417,000 and the real run spent 528,582 — a 27% shortfall
  // on the one number somebody would budget a larger corpus from.
  //
  // "~4 chars per token" is the rule of thumb for ordinary English prose. This
  // corpus is not that: it is identifiers, part numbers, tables, ASCII rules and
  // C. `SWC-DAMP`, `DAMP_GAIN_BASE` and `PRG-KST-K2` all split into several
  // tokens apiece, and a table row is mostly punctuation and whitespace.
  //
  // So the divisor is the ratio this corpus actually produced, and it is stated
  // as measured rather than assumed, because the next person to change the
  // corpus needs to know which of the two it is.
  const CHARS_PER_TOKEN = 3.15;
  console.log(
    `  ~${Math.round(s.chars / CHARS_PER_TOKEN).toLocaleString()} tokens to embed ` +
      `(at ${CHARS_PER_TOKEN} chars/token, measured on this corpus), using ${embeddingsChoice()}`,
  );

  if (DRY) {
    console.log('\ndry-run: nothing embedded, nothing stored.\n');
    return;
  }

  const connectionString = derivedUrl();
  console.log(`\n  store   ${redactedConnectionString(connectionString)} → ${CHUNK_TABLE}\n`);

  const store = await openStore(openEmbeddings(), { connectionString, tableName: CHUNK_TABLE });
  try {
    const result = await ingestDocuments(store, fileDocumentSource(CORPUS, STEERING_DOCUMENTS), {
      connectionString,
      tableName: CHUNK_TABLE,
      onProgress: (m) => console.log(`  ${m}`),
    });

    // ── CODE GOES IN AFTER, AND THE ORDER IS LOAD-BEARING ────────────────
    //
    // `ingestDocuments` empties the table before refilling it. Adding code
    // first would index it and then delete it, leaving a run that reports two
    // successes and stores one of them.
    const code = loadCode(CORPUS);
    const codeChunks = code.flatMap((u) =>
      u.chunks.map((c) => toLangChainDocument(c, u.document)),
    );
    await store.addDocuments(codeChunks);
    console.log(`  embedded and stored ${codeChunks.length} code chunks from ${code.length} source files`);

    console.log(`\n  ${result.chunks + codeChunks.length} chunks from ${result.documents + code.length} documents`);
    console.log(`  ${embeddingUsage.promptTokens.toLocaleString()} embedding tokens`);

    // ── THE COST THAT SCALES WITH THE CORPUS, NOT WITH TRAFFIC ────────────
    //
    // Logged as ONE record, not one per batch. A batch is an artefact of the
    // 96-input cap, not a unit anybody reasons about; the question people ask is
    // "what did indexing this customer cost", and that is one number.
    //
    // `cachedInputTokens` is OMITTED rather than set to 0. Embeddings have no
    // prompt cache, so there is nothing to report, and a measured zero would be
    // a small lie in the one column built to hold that distinction.
    logRequest({
      subject: null,
      question: `index ${CORPUS}`,
      model: embeddingsChoice() === 'local' ? 'local-bge-small' : 'text-embedding-3-small',
      engine: 'embeddings',
      turns: 1,
      toolCalls: 0,
      inputTokens: embeddingUsage.promptTokens,
      outputTokens: 0,
      ms: Date.now() - startedAt,
      stoppedBecause: 'complete',
      schemaRetries: 0,
      surface: 'steering:index',
    });
  } finally {
    // The pool behind the index outlives every query through it — see
    // `openStore`. A CLI that forgets this hangs on exit.
    await store.end();
  }
  console.log('\nindex: done. Next: pnpm steering:search "<question>"\n');
}

/**
 * GUARDED, and every CLI in this package should be.
 *
 * Without it, `import { CHUNK_TABLE } from './index-cli'` re-embedded the whole
 * corpus and emptied the table the caller was about to query. An entry point
 * that runs on import is indistinguishable from a library until the day it is
 * imported.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
