/**
 * THE RETRIEVAL CLI, minus your domain.
 *
 * Every grounding engagement needs the same six commands, and writing them
 * again per customer is how they drift: one repo redacts the connection string
 * and the next prints a live password, one reports the table it is writing to
 * and the next reports a constant. Both of those actually happened here.
 *
 *   config        is .env filled in?                     OFFLINE
 *   chunks        inspect the corpus and the chunking    OFFLINE
 *   corpus:load   seed files -> the documents table      needs Postgres
 *   corpus:check  does the db yield the same index?      needs Postgres
 *   ingest        documents -> the vector index          needs embeddings + pg
 *   query         one similarity search                  needs embeddings + pg
 *
 * WHAT YOU SUPPLY is in `GroundingCliConfig` below: where the corpus is, which
 * environment variables matter, how to open an embeddings provider, and how to
 * charge for a run. Nothing here knows what your documents are about.
 *
 * THE OFFLINE COMMANDS STAY OFFLINE ON PURPOSE. You should be able to inspect
 * the corpus and the chunking without spending anything or authenticating —
 * that is the difference between a pipeline a customer can poke at on day one
 * and one that needs their cloud account first.
 */
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { DocumentDomain } from './domain.types';
import type { DocumentSource } from './document-source';
import { loadDirectory } from './loader';
import { inspectChunking } from './chunker';
import { loadDocuments } from './documents.store';
import { ingestDocuments } from './ingest';
import { openStore, connectionString, redactedConnectionString } from './store';
import { compareDocumentSources, type Fingerprint } from './verify';
import { chunkAll } from './chunker';

export interface IngestCost {
  /** Tokens the embedding provider reported, summed across batches. */
  inputTokens: number;
  ms: number;
  /** Whatever `embeddingsLabel()` returned, for the log's model/engine fields. */
  label: string;
  documents: number;
  chunks: number;
}

export interface GroundingCliConfig {
  /** Seed files on disk. Read by `chunks` and `corpus:load`, never by `ingest`. */
  corpusDir: string;
  /** Where chunks are indexed. A deployment fact, not a domain one. */
  tableName: string;

  /**
   * WHICH DATABASE THE INDEX LIVES IN. Omitted means the global `DATABASE_URL`.
   *
   * THIS FIELD EXISTS BECAUSE ITS ABSENCE WAS A SILENT CROSS-PROJECT WRITE, and
   * it is the third place in this package the same gap appeared — after
   * `loadDocuments` and after `keywordSearch`. The pattern is worth naming: a
   * package that defaults to ONE global connection is correct for exactly one
   * customer, and every call site that did not thread an explicit string was a
   * write into somebody else's database waiting for a second one to arrive.
   *
   * Concretely: a second domain pointed `dbSource` at its own database, and
   * `ingest` then read documents from there and wrote the VECTORS next to the
   * first customer's, because `openStore` fell back to the global. Nothing
   * would have looked wrong — queries return plausible passages from a table
   * that is quietly in the wrong project.
   */
  connectionString?: string;
  /** Your `DocumentDomain` — classification, id fields, facets. */
  domain: DocumentDomain;
  /** The seed files as a source, for `corpus:load`. */
  fileSource: DocumentSource;
  /** The document store as a source, for `ingest`. */
  dbSource: DocumentSource;

  /** Environment variables `config` reports on. Values are printed, so no secrets. */
  envVars: string[];

  /** Open the embeddings provider. Called only by the online commands. */
  embeddings(): EmbeddingsInterface;
  /** A short name for the provider in charge — 'foundry', 'local', 'bedrock'. */
  embeddingsLabel(): string;
  /**
   * Tokens consumed by the last embed run.
   *
   * A mutable box rather than a return value because the caller that wants the
   * number does not own the provider — the store does, and it is several layers
   * down. Reset before the run, read after.
   */
  embeddingUsage: { promptTokens: number };

  /**
   * Charge for an ingest.
   *
   * A HOOK RATHER THAN A DEPENDENCY. Ingest is a real cost and the one that
   * scales with the corpus instead of with traffic, so it must be logged — but
   * a retrieval package that imported your telemetry would drag a log format,
   * a file path and a price table into every customer that adopts it.
   */
  onIngestCost?(cost: IngestCost): void;

  /**
   * The identifier a heading trail resolves to, if your corpus has one.
   *
   * Reported by `chunks` so you can see at a glance whether the derivation
   * still covers the corpus. Returning `''` for a document that has no such
   * identifier is normal and expected — most document types will not.
   */
  identifierOf?(headingTrail: string): string;
  /** Does this heading belong to that identifier? Backs `--filter`. */
  matchesIdentifier?(heading: string, wanted: string): boolean;
  /**
   * Metadata key the filter flag maps to in a query — `formId`, `productLine`,
   * whatever your chunks carry.
   */
  filterKey?: string;
  /**
   * The flag your operators actually type, WITHOUT the dashes. Defaults to
   * `filter`. Separate from `filterKey` because the word a human types and the
   * key in the metadata are rarely the same word, and forcing them to match
   * would silently break every runbook that already says `--form`.
   */
  filterFlag?: string;

  /** Extra commands, for the lookups only your domain has. */
  commands?: Record<string, (args: string[]) => Promise<void> | void>;
}

const flag = (argv: string[], name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};

// ---------------------------------------------------------------------------

function showConfig(cfg: GroundingCliConfig): void {
  let missing = 0;
  console.log('');
  for (const v of cfg.envVars) {
    // Strip quotes a .env file may carry through, so a quoted value does not
    // read as a different value than the one actually used.
    const value = process.env[v]?.replace(/^["']|["']$/g, '');
    if (value) console.log(`  ok      ${v.padEnd(30)} ${safeToPrint(v, value)}`);
    else {
      console.log(`  MISSING ${v}`);
      missing++;
    }
  }
  // Redacted, always. See `redactedConnectionString` for the incident.
  console.log(`  ok      ${'DATABASE_URL'.padEnd(30)} ${redactedConnectionString()}`);
  console.log(
    missing === 0
      ? '\nconfig is complete. This says nothing about whether you can authenticate —\n' +
          'that is what the first online command will tell you.\n'
      : `\n${missing} variable(s) missing. Copy .env.example to .env and fill it in.\n`,
  );
}

/**
 * Never print a secret, whatever it is called.
 *
 * THE `DATABASE_URL` LINE BELOW THIS LOOP WAS REDACTED AND THIS LOOP WAS NOT,
 * which is how `pnpm env:check` printed a live Neon password for
 * `PHARMA_DATABASE_URL` — in full, into shell scrollback and into a pasted
 * transcript. The redaction rule existed; it was applied to the one variable
 * this file knew by name and to none of the ones a caller supplies.
 *
 * So the test is on the VALUE, not on a list of names. Anything carrying
 * credentials in a URL is redacted by shape, and names that announce a secret
 * are redacted whatever shape they hold — a caller adding
 * `CUSTOMER_WAREHOUSE_URL` next year gets the rule for free, which a name list
 * would not have given them.
 */
const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/i;

function safeToPrint(name: string, value: string): string {
  // `scheme://user:password@host` in anything, whatever the variable is called.
  if (/:\/\/[^:@/\s]+:[^@/\s]+@/.test(value)) return redactedConnectionString(value);
  if (SECRET_NAME.test(name)) return `${value.slice(0, 4)}***  (${value.length} chars)`;
  return value;
}

async function showChunks(cfg: GroundingCliConfig, argv: string[]): Promise<void> {
  const docs = await loadDirectory(cfg.corpusDir);
  console.log(`\n${docs.length} documents in ${cfg.corpusDir}\n`);

  const { lines, chunks } = inspectChunking(docs);
  for (const l of lines) console.log(l);

  if (cfg.identifierOf) {
    const ids = [...new Set(chunks.map((c) => cfg.identifierOf!(c.headings.join(' > '))))].filter(
      Boolean,
    );
    console.log(`\n  ${ids.length} distinct identifiers: ${ids.sort().join(', ')}`);
  }

  const filter = flag(argv, `--${cfg.filterFlag ?? 'filter'}`);
  if (filter && cfg.matchesIdentifier) {
    const hits = [
      ...new Set(
        chunks.filter((c) => cfg.matchesIdentifier!(c.headings[0], filter)).map((c) => c.documentId),
      ),
    ];
    console.log(
      `\n  --${cfg.filterFlag ?? 'filter'} ${filter} -> ` +
        `${hits.sort().join(', ') || '(no documents)'}`,
    );
  }
  console.log('');
}

/**
 * Seed files into the documents table — whole, unchunked.
 *
 * No embeddings and no model call: the only cost is a Postgres round trip.
 * Safe to re-run; `loadDocuments` is idempotent on content hash.
 *
 * THE `incomplete` REPORT IS THE POINT OF THE OUTPUT, not the counts. It names
 * every document whose precedence metadata is missing — which against a real
 * customer's first export will be most of them. Reported, never repaired: a
 * missing value must not be read as a permissive one.
 */
async function corpusLoad(cfg: GroundingCliConfig): Promise<void> {
  // `cfg.connectionString` MUST be forwarded. It was not, for one release, and
  // the consequence was not a wrong answer — it was a second domain's load
  // writing into the FIRST domain's database and pruning 79 rows it had never
  // heard of. Every other call in this file passed it; this one did not, and
  // nothing in the output said which database had been written to.
  const res = await loadDocuments(cfg.fileSource, cfg.domain, {
    prune: true,
    connectionString: cfg.connectionString,
  });

  // The DESTINATION, printed next to the source. Half of that incident was a
  // missing parameter; the other half was output that never said where the
  // rows went.
  console.log(`\nsource: ${res.source}`);
  console.log(`target: ${redactedConnectionString(cfg.connectionString)}`);
  console.log(
    `  ${res.seen} documents — ${res.inserted} inserted, ${res.updated} updated, ` +
      `${res.unchanged} unchanged, ${res.removed} removed, ${res.relations} relation(s)`,
  );

  if (res.incomplete.length) {
    console.log(`\n  ${res.incomplete.length} of ${res.seen} with incomplete precedence metadata:`);
    for (const r of res.incomplete) {
      console.log(`    ${r.documentId.padEnd(30)} missing: ${r.missing.join(', ')}`);
    }
    console.log(
      '\n  Reported, not repaired. A missing value is never read as a permissive\n' +
        '  one — status stays "unknown" rather than becoming "current".',
    );
  }
  console.log('');
}

/**
 * Prove that reading documents from the DATABASE produces exactly the index
 * that reading them from the SEED FILES does.
 *
 * WHAT IT COSTS: one read per source. No embeddings, no model call — which is
 * why it can run before every ingest instead of after a bad one.
 *
 * IT EARNED ITS KEEP TWICE. First when a database source returned the same
 * chunks in a different ORDER: chunk ids derive from position, so a re-ingest
 * would have silently rewritten every citation the model emits. Again when a
 * jsonb source returned identical facets with different KEY ORDERING, which an
 * earlier version reported as a FAIL on a corpus that was byte-identical.
 *
 * The negative control is not optional. A fingerprint comparison that would
 * pass on two different corpora proves nothing, so `compareDocumentSources`
 * reorders the documents and requires the fingerprint to move.
 */
async function corpusCheck(cfg: GroundingCliConfig): Promise<void> {
  const comparison = compareDocumentSources([
    { label: 'folder (seed files)', docs: await cfg.fileSource.list() },
    { label: 'database (documents)', docs: await cfg.dbSource.list() },
  ]);

  const row = (label: string, f: Fingerprint) =>
    console.log(`  ${label.padEnd(26)} chunks=${String(f.chunks).padEnd(5)} fingerprint=${f.sha}`);

  console.log('');
  for (const r of comparison.results) row(r.label, r.fingerprint);

  // The raw loader has to agree on chunk COUNT. It is the path `chunks` uses,
  // and if it diverged the free offline command would stop describing the index
  // the product actually builds.
  const rawChunks = chunkAll(await loadDirectory(cfg.corpusDir)).length;
  console.log(`  raw loadDirectory          chunks=${String(rawChunks).padEnd(5)} (chunks path)`);

  const ok = comparison.agree && rawChunks === comparison.results[0].fingerprint.chunks;
  console.log(
    ok
      ? '\n  PASS — the database yields the same index as the folder.'
      : '\n  FAIL — the database yields a DIFFERENT index. Do not re-ingest.',
  );

  console.log('\n  NEGATIVE CONTROL');
  console.log(
    `  ${comparison.controlPassed ? 'ok  ' : 'FAIL'} reordering the documents changes the ` +
      `fingerprint   ${comparison.controlSha}` +
      (comparison.controlPassed ? '' : '  — identical, so this check is blind'),
  );

  console.log('');
  if (!ok || !comparison.controlPassed) process.exit(1);
}

async function ingest(cfg: GroundingCliConfig): Promise<void> {
  const store = await openStore(cfg.embeddings(), {
    tableName: cfg.tableName,
    connectionString: cfg.connectionString,
  });

  // The CONFIGURED table, never the package default — a version of this printed
  // a constant while writing somewhere else, which is the same class of lie as
  // a sync reporting rows into a database it never touched.
  // The CONFIGURED connection, not the global one. Printing the global while
  // writing to a configured database is the same class of lie as printing a
  // constant table name — and it is the line that would have told an operator
  // the vectors were going to the wrong project.
  console.log(
    `\nindexing into ${cfg.tableName} at ${redactedConnectionString(cfg.connectionString)}`,
  );
  console.log(`embeddings: ${cfg.embeddingsLabel()}\n`);

  cfg.embeddingUsage.promptTokens = 0;
  const started = Date.now();

  // Reads the DOCUMENT STORE, not the folder. `corpus:load` is what puts the
  // seed fixture there, and `corpus:check` proves the two produce the same
  // index — so this path is the one a customer's real export exercises.
  const res = await ingestDocuments(store, cfg.dbSource, {
    tableName: cfg.tableName,
    connectionString: cfg.connectionString,
    onProgress: (m) => console.log(`  ${m}`),
  });
  await store.end();

  cfg.onIngestCost?.({
    inputTokens: cfg.embeddingUsage.promptTokens,
    ms: Date.now() - started,
    label: cfg.embeddingsLabel(),
    documents: res.documents,
    chunks: res.chunks,
  });

  console.log(`\ndone: ${res.documents} documents, ${res.chunks} chunks\n`);
}

async function query(cfg: GroundingCliConfig, text: string, argv: string[]): Promise<void> {
  if (!text) {
    console.error(`usage: query "<text>" [--${cfg.filterFlag ?? 'filter'} <id>] [--k 5]`);
    process.exit(1);
  }
  const filter = flag(argv, `--${cfg.filterFlag ?? 'filter'}`);
  const k = Number(flag(argv, '--k') ?? 5);

  const store = await openStore(cfg.embeddings(), {
    tableName: cfg.tableName,
    connectionString: cfg.connectionString,
  });
  const hits = await store.similaritySearchWithScore(
    text,
    k,
    filter && cfg.filterKey ? { [cfg.filterKey]: filter } : undefined,
  );

  console.log('');
  for (const [doc, score] of hits) {
    // pgvector returns a DISTANCE; report similarity so the number keeps
    // meaning what it meant before the store was swapped underneath.
    console.log(`  ${(1 - score).toFixed(3)}  ${doc.metadata.section}`);
  }
  if (!hits.length) console.log('  (no results)');
  console.log('');
  await store.end();
}

// ---------------------------------------------------------------------------

/** Wire the commands to `process.argv` and run one. Exits the process. */
export async function runGroundingCli(cfg: GroundingCliConfig): Promise<void> {
  const argv = process.argv.slice(2);
  const [cmd, ...rest] = argv;
  const positional = rest.filter((a) => !a.startsWith('--'));
  const extra = cfg.commands ?? {};

  try {
    if (cmd === 'config') showConfig(cfg);
    else if (cmd === 'chunks') await showChunks(cfg, argv);
    else if (cmd === 'corpus:load') await corpusLoad(cfg);
    else if (cmd === 'corpus:check') await corpusCheck(cfg);
    else if (cmd === 'ingest') await ingest(cfg);
    else if (cmd === 'query') await query(cfg, positional[0] ?? '', argv);
    else if (cmd && extra[cmd]) await extra[cmd](positional);
    else {
      const names = [
        'config',
        'chunks',
        'corpus:load',
        'corpus:check',
        'ingest',
        'query "<text>"',
      ].concat(
        Object.keys(extra),
      );
      console.error(`commands: ${names.join(' | ')}`);
      process.exit(1);
    }
  } catch (e: any) {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  }
}

