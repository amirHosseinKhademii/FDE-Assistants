/**
 * `pnpm safety:index` — stage 3.4. The first stage that leaves this machine.
 *
 * Streams `vectors.ndjson` into Postgres, then checks what LANDED rather than
 * what was sent. A partial load looks exactly like a complete one: the table
 * has 40,000 rows and nothing anywhere is an error.
 */
import { createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { safetyDatabaseUrl } from '../config/connections';
import { VECTORS_NDJSON } from '../config/paths';
import { loadIntoStore } from '../grounding/index-store';

const TABLE = 'document_chunks';
const CANARY = '11353867';
const n = (x: number) => x.toLocaleString('en-GB');

async function main(): Promise<number> {
  const conn = safetyDatabaseUrl();
  console.log(`\nstage 3.4 · index\n  reading ${VECTORS_NDJSON}`);
  console.log(`  into ${new URL(conn).host} · ${TABLE}\n`);

  const report = await loadIntoStore(VECTORS_NDJSON, { connectionString: conn, tableName: TABLE }, (i) => {
    process.stdout.write(`\r  inserted ${n(i)}…        `);
  });
  console.log(`\r  ${n(report.inserted)} rows in ${n(report.batches)} batches, ${(report.ms / 60000).toFixed(1)} min\n`);

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}`);
    console.log(`        ${detail}`);
  };

  const c = new Client({ connectionString: conn, keepAlive: true, connectionTimeoutMillis: 30000 });
  await c.connect();
  try {
    // 1 — counted against the FILE by wc -l, not against the loader's own tally.
    //     A loader confirming its own row count proves nothing; same rule as
    //     stage 3.1's awk cross-check.
    const fileLines = Number(
      execFileSync('wc', ['-l', VECTORS_NDJSON], { encoding: 'utf8' }).trim().split(/\s+/)[0],
    );
    const rows = Number((await c.query(`select count(*) n from ${TABLE}`)).rows[0].n);
    check(
      rows === fileLines,
      'every line in the file became a row, counted by wc -l and not by the loader',
      `wc -l says ${n(fileLines)}; the table holds ${n(rows)}`,
    );

    // 2 — ONE dimension group. PGVectorStore creates an UNCONSTRAINED vector
    //     column, so mixed dimensions insert happily and fail only at query
    //     time, somewhere else, later. Insurance hit it; pharma hit it again on
    //     the deployed app with "different vector dimensions 1536 and 384".
    const dims = (await c.query(`select vector_dims(vector) d, count(*) n from ${TABLE} group by 1`)).rows;
    check(
      dims.length === 1 && Number(dims[0].d) === 384,
      'one dimension group, 384 — not two',
      dims.map((r: any) => `${r.d} dims × ${n(Number(r.n))}`).join(', ') || 'no rows',
    );

    // 3 — the passage REC-001 turns on, with its text intact.
    const canary = (
      await c.query(`select content from ${TABLE} where metadata->>'id' = $1`, [CANARY])
    ).rows;
    check(
      canary.length === 1 && canary[0].content.includes('NOT GO INTO PARK'),
      `ODI ${CANARY} is in the table with its text intact`,
      canary.length === 1 ? `${n(canary[0].content.length)} chars` : `${canary.length} rows — expected 1`,
    );

    // 4 — the keyword arm has something to search. Without this, stage 3.5 has
    //     one arm and the campaign numbers this corpus turns on are unfindable.
    const ts = Number(
      (await c.query(`select count(*) n from ${TABLE} where content_ts is not null`)).rows[0].n,
    );
    check(
      ts === rows && rows > 0,
      'content_ts is populated — the keyword arm has something to search',
      `${n(ts)} of ${n(rows)} rows`,
    );

    // 5 — THE KEY FUSION DEDUPLICATES ON, present and unique.
    //
    //     Stage 3.5 found this the expensive way. `@fde/grounding`'s `keyOf`
    //     reads `metadata.chunkId` and falls back to the first 120 characters of
    //     the text when it is absent. Ours was absent, and this corpus opens
    //     every passage with a generated header — so 977 rows shared a prefix,
    //     174 of them identically (`2019 HONDA CR-V | FORWARD COLLISION
    //     AVOIDANCE: AUTOMATIC EME…`). Distinct complaints fused into ONE entry
    //     and their reciprocal-rank scores ADDED, which put a keyword-rank-22
    //     passage above a keyword-rank-1 exact match. Nothing errored. Search
    //     simply returned the wrong order, and the natural suspect is the
    //     embedder.
    //
    //     Asked of the DATABASE, in SQL, not of the loader that wrote it —
    //     the same rule as check 1.
    const keys = (
      await c.query(
        `select count(*) n,
                count(metadata->>'chunkId') present,
                count(distinct metadata->>'chunkId') uniq
           from ${TABLE}`,
      )
    ).rows[0];
    check(
      Number(keys.present) === rows && Number(keys.uniq) === rows && rows > 0,
      'every row carries a distinct chunkId — what fusion deduplicates on',
      `${n(Number(keys.present))} present, ${n(Number(keys.uniq))} distinct, of ${n(rows)} rows`,
    );

    // BOTH NUMBERS, because they disagree and only one is the quota. Postgres
    // reported 295 MB while Neon's own `pg_cluster_size()` reported 318 MB —
    // planning a reload against the smaller one is how you run out of room.
    const size = (await c.query('select pg_size_pretty(pg_database_size(current_database())) s')).rows[0].s;
    const billed = await c
      .query('select pg_size_pretty(pg_cluster_size()) s')
      .then((r) => r.rows[0].s as string)
      .catch(() => null);
    console.log(`\n  postgres reports: ${size}`);
    console.log(
      billed
        ? `  neon bills:       ${billed}  (free tier is 512 MB — this is the one that stops the load)`
        : '  neon bills:       n/a — `create extension neon` to see the number the quota uses',
    );
  } finally {
    await c.end();
  }

  console.log(
    failed === 0
      ? '\n  index: PASS — stage 3.5 may begin\n'
      : `\n  index: FAIL — ${failed} check(s). Nothing downstream should run.\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
