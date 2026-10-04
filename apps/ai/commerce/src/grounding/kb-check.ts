/**
 * `pnpm commerce:kb-check` — the policy index, checked as the MCP server sees it.
 *
 * Needs `COMMERCE_KB_URL` (written by `kb-provision`) and a built index. Every
 * database check below connects AS THE READER — the only credential the query
 * side will ever hold — because a check run as the admin would pass for reasons
 * the MCP process does not have.
 *
 *   THE READER CANNOT WRITE        INSERT, CREATE TABLE, CREATE TEMP TABLE refused
 *   THE READER CANNOT REACH THE ESTATE   no row of thb_shop readable
 *   INGEST AND QUERY AGREE         one table name, one dimension — measured
 *   THE QUERY SIDE IS CLEAN        loading query.ts pulls in no estate/admin code
 *   IT SEARCHES LIKE IT SAYS       full-text arm live, no score cutoff, facets present
 *
 * Every check was sabotaged once and watched to go red (docs/commerce/evals/
 * RETRIEVAL.md §3 records how).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import { KB_DIMENSIONS, KB_READER_ROLE, KB_TABLE, kbEmbeddings } from './kb';
import { searchPolicy } from './query';

const PACKAGE_ROOT = resolve(__dirname, '..', '..');
config({ path: resolve(PACKAGE_ROOT, '..', '..', '..', '.env'), quiet: true });

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

/**
 * Run `sql` as the reader; return the SQLSTATE it failed with, or 'ok'.
 *
 * ALWAYS INSIDE A TRANSACTION THAT IS ROLLED BACK. The first version ran the
 * probe bare, and when a sabotage granted INSERT the probe SUCCEEDED AND STAYED:
 * a row reading "planted", with no vector, sat in the index the model searches
 * until a later dimension check noticed a vector of length 0. A write probe
 * that can commit is itself the defect it is looking for.
 */
async function attempt(url: string, sql: string): Promise<string> {
  const c = new Client({ connectionString: url });
  try {
    await c.connect();
    await c.query('begin');
    await c.query(sql);
    return 'ok';
  } catch (e) {
    return (e as { code?: string }).code ?? `error: ${(e as Error).message}`;
  } finally {
    await c.query('rollback').catch(() => undefined);
    await c.end().catch(() => undefined);
  }
}

function onDatabase(url: string, db: string): string {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

async function main(): Promise<void> {
  const reader = process.env.COMMERCE_KB_URL;
  if (!reader) {
    console.error('\nkb-check cannot run: COMMERCE_KB_URL is not set — run `pnpm commerce:kb-provision`.\n');
    process.exit(2);
  }
  if (!new URL(reader).username.startsWith(KB_READER_ROLE)) {
    console.error(`\nkb-check refuses: COMMERCE_KB_URL does not log in as ${KB_READER_ROLE}.\n`);
    process.exit(2);
  }

  console.log('\ncommerce:kb-check — the policy index, as the read-only role sees it\n');

  console.log('CONTROL');
  const c = new Client({ connectionString: reader });
  await c.connect();
  const rows = Number((await c.query(`select count(*) as n from ${KB_TABLE}`)).rows[0].n);
  check('the reader can SELECT the chunk table', rows > 0, `${rows} chunk(s) in ${KB_TABLE}. Without this, every refusal below could be a dead connection`);

  console.log('\nTHE READER CANNOT WRITE — each must be refused with 42501, insufficient_privilege');
  const ins = await attempt(reader, `insert into ${KB_TABLE} (content, metadata) values ('planted', '{}'::jsonb)`);
  check('INSERT into the chunk table is refused', ins === '42501', `got ${ins}. A reader that can insert can plant a "policy" the model will cite`);
  const tbl = await attempt(reader, 'create table public.kb_check_plant (x int)');
  check('CREATE TABLE is refused', tbl === '42501', `got ${tbl}`);
  const tmp = await attempt(reader, 'create temp table kb_check_plant (x int)');
  check('CREATE TEMP TABLE is refused', tmp === '42501', `got ${tmp}. PUBLIC's default TEMP on the database was revoked by kb-provision`);
  const attrs = (
    await c.query(
      `select r.rolsuper, r.rolcreatedb, r.rolcreaterole,
              (select count(*) from pg_auth_members m where m.member = r.oid) as memberships
         from pg_roles r where r.rolname = $1`,
      [KB_READER_ROLE],
    )
  ).rows[0];
  check(
    'the role has no attributes and belongs to no other role',
    attrs && !attrs.rolsuper && !attrs.rolcreatedb && !attrs.rolcreaterole && Number(attrs.memberships) === 0,
    `super=${attrs?.rolsuper} createdb=${attrs?.rolcreatedb} createrole=${attrs?.rolcreaterole} memberships=${attrs?.memberships}. ` +
      'Membership in neon_superuser would make every GRANT above decorative',
  );

  console.log('\nTHE READER CANNOT REACH THE ESTATE');
  const shop = await attempt(onDatabase(reader, 'thb_shop'), 'select count(*) from orders');
  check(
    'no row of thb_shop is readable with this credential',
    shop !== 'ok',
    `got ${shop}. ${shop === '42501' ? 'It can CONNECT (PUBLIC keeps CONNECT on the estate databases) but reads nothing' : 'Refused before reading'}`,
  );

  console.log('\nINGEST AND QUERY AGREE — one table, one dimension, measured not assumed');
  // A NULL vector reports as `null`, not 0 — it is a row nothing can ever find
  // by meaning, and it is exactly what a successful planted INSERT leaves.
  const dims = (await c.query(`select distinct vector_dims(vector) as d from ${KB_TABLE}`)).rows.map((r) =>
    r.d === null ? null : Number(r.d),
  );
  const probe = (await kbEmbeddings().embedQuery('probe')).length;
  check(
    `every stored vector, the query embedder and KB_DIMENSIONS are all ${KB_DIMENSIONS}`,
    dims.length === 1 && dims[0] === KB_DIMENSIONS && probe === KB_DIMENSIONS,
    `stored=[${dims.join(',')}] query-embedder=${probe} constant=${KB_DIMENSIONS}. A mismatch does not always error — ` +
      'a hosted index read with a local embedder returns the nearest rows of the wrong space',
  );
  const sources = ['kb-cli.ts', 'query.ts'].map((f) => [f, readFileSync(resolve(__dirname, f), 'utf8')] as const);
  const literal = sources.filter(([, s]) => /tableName:\s*['"`]/.test(s) || !/tableName:\s*KB_TABLE/.test(s)).map(([f]) => f);
  check(
    'the ingest side and the query side both name the table ONLY through KB_TABLE',
    literal.length === 0,
    literal.length ? `a table spelled some other way in: ${literal.join(', ')}` : 'kb-cli.ts writes it, query.ts reads it; neither spells it',
  );
  await c.end();

  console.log('\nTHE QUERY SIDE LOADS NO ESTATE CODE');
  const child = spawnSync(
    process.execPath,
    [
      '-r',
      require.resolve('ts-node/register/transpile-only'),
      '-e',
      `require(${JSON.stringify(resolve(__dirname, 'query.ts'))});` +
        'process.stdout.write(JSON.stringify(Object.keys(require.cache)))',
    ],
    { cwd: PACKAGE_ROOT, env: { PATH: process.env.PATH ?? '' }, encoding: 'utf8' },
  );
  let loaded: string[] = [];
  try {
    loaded = JSON.parse(child.stdout);
  } catch {
    loaded = [];
  }
  const estate = loaded.filter((p) => /[\\/]src[\\/](config[\\/]connections|db[\\/])/.test(p));
  check(
    'loading query.ts pulls in neither config/connections nor any db/ module',
    loaded.length > 0 && estate.length === 0,
    loaded.length === 0
      ? `the probe process did not report its module graph: ${child.stderr.slice(0, 160)}`
      : estate.length
        ? `ESTATE CODE LOADED: ${estate.map((p) => p.split('/src/')[1]).join(', ')}`
        : `${loaded.length} modules, none of them the estate's. The MCP process imports this file`,
  );

  console.log('\nIT SEARCHES LIKE IT SAYS');
  const t6 = await searchPolicy({ connectionString: reader, query: 'a carrier deadline in working days across a bank holiday', k: 5 });
  check('the full-text arm is live (not silently dense-only)', t6.fullText, `fullText=${t6.fullText}. hybridSearch swallows a keyword failure`);
  check(
    'a T6 question finds CON-CAR-NEXDROP-2025#2 in the top 3',
    t6.hits.slice(0, 3).some((h) => h.citation === 'policy:CON-CAR-NEXDROP-2025#2'),
    `top 3: ${t6.hits.slice(0, 3).map((h) => h.citation).join(', ')}`,
  );
  const junk = await searchPolicy({ connectionString: reader, query: 'zebra saxophone quantum lighthouse', k: 5 });
  check(
    'NO SCORE CUTOFF — a question about nothing still returns k passages',
    junk.hits.length === 5,
    `${junk.hits.length} returned. "It isn't in the corpus" is the model's judgement (CORPUS.md §4), and T4 needs the junk to arrive`,
  );
  const pub = await searchPolicy({ connectionString: reader, query: 'how many days does a customer have to return an item', k: 8, filter: { docId: 'POL-RET-001' } });
  const retired = await searchPolicy({ connectionString: reader, query: 'electronics returns were thirty days', k: 8, filter: { status: 'retired' } });
  check(
    'facets arrive: the published policy says published, the retired note says retired',
    pub.hits.length > 0 && pub.hits.every((h) => h.audience === 'published') &&
      retired.hits.length > 0 && retired.hits.every((h) => h.status === 'retired' && h.revisionId === 'NOTE-ELEC-2022'),
    `POL-RET-001 audiences=[${[...new Set(pub.hits.map((h) => h.audience))].join(',')}], ` +
      `retired=[${[...new Set(retired.hits.map((h) => h.revisionId))].join(',')}]. T2 turns on published vs internal; ` +
      'retired means WRONG, not old',
  );

  console.log('\nTHE HARNESS ITSELF');
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nkb-check crashed:', (e as Error).message);
  process.exit(1);
});
