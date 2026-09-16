/**
 * Does an APPROXIMATE vector index earn its place? — measured, not argued.
 *
 * `openStore` never builds one. `@langchain/pgvector` ships `createHnswIndex()`
 * and nothing calls it, so every dense search in this repo is an exact
 * sequential scan. That is a defensible choice at a few thousand rows and a
 * negligent one at a few million, and the honest position for a long time was
 * that NOBODY HAD MEASURED WHERE THE LINE IS. This file is that measurement.
 *
 * ── WHAT IT DOES, AND WHY IT COPIES THE TABLE FIRST ──────────────────────
 *
 * Building an index needs DDL, and the honest comparison needs DDL that CANNOT
 * be run on a live table: pinning the vector column's dimension is a full
 * rewrite, and it removes the property that lets a 384-dimension and a
 * 1536-dimension corpus share one schema (see `store.ts`). So the whole
 * benchmark runs on a `create table … as select` copy, which inherits the real
 * column type, and the copy is dropped in a `finally`. The live table is read
 * and never written.
 *
 * ── THE PROBES ARE REAL QUESTIONS, NOT ROWS ──────────────────────────────
 *
 * The first draft used an existing row's vector as the probe. That measures
 * nothing: the row matches itself at distance 0 and any index on earth finds
 * it. Recall is only meaningful against the query distribution the system
 * actually sees, so the caller passes questions and they get embedded.
 *
 * ── WHAT IT REPORTS, AND WHY EACH NUMBER IS THERE ────────────────────────
 *
 *   refusedOnUnpinned  whether an index can be built AT ALL on the schema as it
 *                      ships — the answer that turns "add an index" from a
 *                      one-line opt-in into a migration
 *   exact / approximate   server-side execution time, so the wire is excluded
 *   networkFloorMs     `select 1`, so the wire can be put back — an 18ms saving
 *                      behind a 113ms round trip is not a saving anybody feels
 *   plannerPicksIndex  whether Postgres CHOOSES the index once it exists. An
 *                      index the planner rejects is disk, not speed
 *   recall             fraction of the exact top-k the approximate scan found.
 *                      This is the correctness half of the trade
 */
import { Client } from 'pg';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { survivesDisconnect, PG_OPTIONS } from './pg-resilience';

export interface IndexBenchmarkOptions {
  /** Must name the database the chunk table lives in. */
  connectionString: string;
  /** The live chunk table. Read only — copied, never altered. */
  tableName: string;
  /** Used to embed `questions`. The SAME model the corpus was indexed with. */
  embeddings: EmbeddingsInterface;
  /** Real questions from the engagement, not sample text. See the header. */
  questions: string[];
  /** Rows the dense arm actually fetches — `k × overFetch`, not the k a user sees. */
  k: number;
  /** HNSW candidate-list sizes to sweep. Default covers the pgvector default of 40. */
  efSearch?: number[];
  /** Repeats per timing sample; the median is reported. */
  repeat?: number;
  /**
   * How many times to BUILD the index from scratch.
   *
   * More than one because HNSW graph construction is not deterministic, and the
   * first two runs of this benchmark disagreed about recall by fourteen points
   * on identical data. A recall figure from a single build is a sample of one
   * presented as a property of the index.
   */
  builds?: number;
  onProgress?: (msg: string) => void;
}

export interface ApproximateSample {
  efSearch: number;
  serverMs: number;
  /** Mean over probes and builds of |approx ∩ exact| / k. 1 means no recall was lost. */
  recall: number;
  /** Worst and best BUILD. Equal when `builds` is 1, which is why it defaults higher. */
  recallMin: number;
  recallMax: number;
  /** Rows actually returned, summed over probes and builds. Short means truncation. */
  returned: number;
  /** What `returned` would be if nothing truncated. */
  expected: number;
}

export interface IndexBenchmark {
  rows: number;
  dimensions: number;
  /** True when the live column is already `vector(n)` rather than bare `vector`. */
  dimensionPinned: boolean;
  /**
   * The error Postgres gave when asked to build HNSW on the column as it ships,
   * or null if it built. Null is also what you get when the column is already
   * pinned — read it with `dimensionPinned`.
   */
  refusedOnUnpinned: string | null;
  /** Full rewrite cost of `alter column … type vector(n)`, on the copy. */
  pinMs: number;
  exactServerMs: number;
  /** `select 1` — the part of a query that no index can touch. */
  networkFloorMs: number;
  buildMs: number;
  indexBytes: number;
  /** False when Postgres prefers a sequential scan even with the index present. */
  plannerPicksIndex: boolean;
  /** How many independent index builds the recall spread below is drawn from. */
  builds: number;
  approximate: ApproximateSample[];
  /**
   * Anything Postgres said out of band during the build. pgvector reports
   * "hnsw graph no longer fits into maintenance_work_mem" here and nowhere
   * else, and that message is the difference between a bad index and a
   * bad machine.
   */
  notices: string[];
}

/**
 * Table names reach SQL as identifiers, which cannot be parameterised. They come
 * from config rather than from a user today, and a benchmark is exactly the kind
 * of throwaway that later gets an `--table` flag bolted onto it.
 */
function identifier(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return name;
}

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/**
 * Server-side execution time, in milliseconds, with the wire excluded.
 *
 * `timing off` because per-node instrumentation on a 3,854-row scan costs more
 * than the scan — the summary total is the number wanted, and it stays honest
 * with instrumentation off.
 */
async function serverMs(client: Client, sql: string, repeat: number): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < repeat; i++) {
    const { rows } = await client.query(`explain (analyze, timing off, format json) ${sql}`);
    samples.push(rows[0]['QUERY PLAN'][0]['Execution Time'] as number);
  }
  return Number(median(samples).toFixed(2));
}

async function planUsesIndex(client: Client, sql: string): Promise<boolean> {
  const { rows } = await client.query(`explain (format json) ${sql}`);
  return JSON.stringify(rows[0]['QUERY PLAN'][0]['Plan']).includes('Index Scan');
}

export async function benchmarkVectorIndex(opts: IndexBenchmarkOptions): Promise<IndexBenchmark> {
  const table = identifier(opts.tableName);
  const scratch = identifier(`${table}_indexbench`);
  if (scratch === table) throw new Error('scratch table would be the live table');
  const repeat = opts.repeat ?? 7;
  const builds = opts.builds ?? 3;
  const efSweep = opts.efSearch ?? [40, 64, 128];
  const say = opts.onProgress ?? (() => {});

  const client = survivesDisconnect(new Client({ connectionString: opts.connectionString, ...PG_OPTIONS }), {
    label: 'index-bench',
  });
  const notices: string[] = [];
  client.on('notice', (n) => {
    // `drop ... if exists` announces every no-op, and this file issues several
    // on purpose. Keeping them would bury the one message worth reading.
    if (n.message && !/does not exist, skipping/.test(n.message)) notices.push(n.message);
  });
  await client.connect();

  try {
    say(`embedding ${opts.questions.length} probe questions`);
    const probes = (await opts.embeddings.embedDocuments(opts.questions)).map(
      (v) => `[${v.join(',')}]`,
    );

    const { rows: shape } = await client.query(
      `select count(*)::int rows, min(vector_dims(vector))::int dims from ${table}`,
    );
    const { rows: typed } = await client.query(
      `select format_type(a.atttypid, a.atttypmod) t
         from pg_attribute a join pg_class c on c.oid = a.attrelid
        where c.relname = $1 and a.attname = 'vector'`,
      [table],
    );
    const dimensionPinned = typed[0]?.t !== 'vector';

    say(`copying ${table} (${shape[0].rows} rows) → ${scratch}`);
    await client.query(`drop table if exists ${scratch}`);
    // `as select` inherits the SOURCE column's type, pinned or not — which is the
    // whole point: the copy must reproduce the schema as it ships, or the first
    // measurement below is answering a question nobody asked.
    await client.query(
      `create table ${scratch} as select id, content, metadata, vector from ${table}`,
    );

    const query = (probe: string): string =>
      `select id from ${scratch} order by vector <=> '${probe}'::vector limit ${opts.k}`;

    // ── 1 · THE STATE OF THE REPO TODAY ──────────────────────────────────
    const exactIds: string[][] = [];
    const exactTimes: number[] = [];
    for (const probe of probes) {
      exactTimes.push(await serverMs(client, query(probe), repeat));
      const { rows } = await client.query(query(probe));
      exactIds.push(rows.map((r: { id: string }) => r.id));
    }
    const exactServerMs = median(exactTimes);

    const pings: number[] = [];
    for (let i = 0; i < repeat; i++) {
      const t = Date.now();
      await client.query('select 1');
      pings.push(Date.now() - t);
    }

    // ── 2 · CAN AN INDEX BE BUILT ON THE SCHEMA AS IT SHIPS? ─────────────
    //
    // NOT `concurrently`, and the reason is a false positive this file was
    // written around. A failed CREATE INDEX CONCURRENTLY leaves an INVALID
    // index in the catalogue; the next `concurrently if not exists` under the
    // same name then sees it, skips, AND RETURNS SUCCESS. The first run of this
    // benchmark reported that IVFFlat built fine. It had not built at all.
    let refusedOnUnpinned: string | null = null;
    if (!dimensionPinned) {
      try {
        await client.query(
          `create index ${scratch}_probe on ${scratch} using hnsw (vector vector_cosine_ops)`,
        );
        await client.query(`drop index ${scratch}_probe`);
      } catch (e: unknown) {
        refusedOnUnpinned = e instanceof Error ? e.message : String(e);
        say(`refused on the shipped schema: ${refusedOnUnpinned}`);
      }
    }

    // ── 3 · PAY THE MIGRATION, THEN BUILD ────────────────────────────────
    let pinMs = 0;
    if (!dimensionPinned) {
      const t = Date.now();
      await client.query(
        `alter table ${scratch} alter column vector type vector(${shape[0].dims})`,
      );
      pinMs = Date.now() - t;
      say(`pinned to vector(${shape[0].dims}) in ${pinMs}ms — a full table rewrite`);
    }

    // ── 4 · BUILD IT, MORE THAN ONCE ─────────────────────────────────────
    //
    // HNSW graph construction is NOT DETERMINISTIC — insertion order and
    // parallel workers change which neighbours each node keeps. Two builds of
    // this benchmark over identical rows reported recall of 83.9% and 97.9%.
    // Reporting either one alone would have been a confident, reproducible,
    // wrong answer, so the index is built `builds` times and the SPREAD is
    // reported. The floor is what a rebuild can hand you on a bad day, and a
    // rebuild is not a rare event: it is what happens after a re-ingest.
    let buildMs = 0;
    let indexBytes = 0;
    let plannerPicksIndex = false;
    const perEf = new Map<number, { times: number[]; recalls: number[]; returned: number }>();
    for (const ef of efSweep) perEf.set(ef, { times: [], recalls: [], returned: 0 });

    for (let build = 0; build < builds; build++) {
      await client.query(`drop index if exists ${scratch}_hnsw`);
      const started = Date.now();
      await client.query(
        `create index ${scratch}_hnsw on ${scratch} using hnsw (vector vector_cosine_ops)`,
      );
      if (build === 0) {
        buildMs = Date.now() - started;
        // Without this the planner is deciding on the statistics of a table it
        // has never looked at, and the question asked next — would it CHOOSE the
        // index — gets a meaningless answer.
        await client.query(`analyze ${scratch}`);
        const { rows: sized } = await client.query(`select pg_relation_size($1)::bigint b`, [
          `${scratch}_hnsw`,
        ]);
        indexBytes = Number(sized[0].b);
        plannerPicksIndex = await planUsesIndex(client, query(probes[0]));
      }

      // `enable_seqscan = off` is a measurement instrument, not a setting
      // anybody should ship. It is here because "the planner declined" and "the
      // index is no faster" are different findings, and a report that merges
      // them cannot be acted on.
      await client.query('set enable_seqscan = off');
      for (const ef of efSweep) {
        await client.query(`set hnsw.ef_search = ${Number(ef)}`);
        const acc = perEf.get(ef)!;
        let recall = 0;
        for (let i = 0; i < probes.length; i++) {
          acc.times.push(await serverMs(client, query(probes[i]), repeat));
          const { rows } = await client.query(query(probes[i]));
          const truth = new Set(exactIds[i]);
          acc.returned += rows.length;
          recall += rows.filter((r: { id: string }) => truth.has(r.id)).length / truth.size;
        }
        acc.recalls.push(recall / probes.length);
      }
      await client.query('reset enable_seqscan');
      say(
        `build ${build + 1}/${builds}: ` +
          efSweep.map((ef) => `ef=${ef} ${(100 * perEf.get(ef)!.recalls[build]).toFixed(1)}%`).join('  '),
      );
    }

    const approximate: ApproximateSample[] = efSweep.map((ef) => {
      const acc = perEf.get(ef)!;
      return {
        efSearch: ef,
        serverMs: median(acc.times),
        recall: acc.recalls.reduce((a, b) => a + b, 0) / acc.recalls.length,
        recallMin: Math.min(...acc.recalls),
        recallMax: Math.max(...acc.recalls),
        returned: acc.returned,
        expected: probes.length * opts.k * builds,
      };
    });

    return {
      rows: shape[0].rows,
      dimensions: shape[0].dims,
      dimensionPinned,
      refusedOnUnpinned,
      pinMs,
      exactServerMs,
      networkFloorMs: median(pings),
      buildMs,
      indexBytes,
      plannerPicksIndex,
      builds,
      approximate,
      notices,
    };
  } finally {
    // A benchmark that leaves a 67MB copy behind on a metered database is a
    // benchmark nobody runs twice.
    await client.query(`drop table if exists ${scratch}`).catch(() => {});
    await client.end();
  }
}
