/**
 * Does the estate do what it says, and does the drop path refuse before it
 * destroys? Offline, instant, no Postgres.
 *
 * THE ASSERTION THAT MATTERS is `no database is dropped when a later name is
 * foreign`. Both engagements' original scripts asserted and dropped in the same
 * loop, so a foreign name in fourth place was found after three were gone. That
 * is not a thing you can test against a real database, which is exactly why the
 * client is injectable.
 *
 *   pnpm estate:check
 */
import { createDatabases, dropDatabases, migrateSchemas, type SqlClient, type System } from './estate';

let failed = 0;

function check(ok: boolean, name: string, detail: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
}

const SYSTEMS: System[] = [
  { db: 'acme_a', label: 'first', schema: 'a.sql' },
  { db: 'acme_b', label: 'second', schema: 'b.sql' },
  { db: 'acme_c', label: 'third', schema: 'c.sql' },
];

/** Records every statement, and answers whatever the case needs. */
function fake(answers: (sql: string) => any[] = () => []): SqlClient & { sql: string[]; ended: number } {
  const sql: string[] = [];
  return {
    sql,
    ended: 0,
    async connect() {},
    async query(text: string) {
      sql.push(text);
      return { rows: answers(text) };
    },
    async end() {
      (this as any).ended++;
    },
  };
}

function control(): void {
  const before = failed;
  const log = console.log;
  console.log = () => {};
  check(false, 'planted', 'planted');
  console.log = log;
  const noticed = failed === before + 1;
  failed = before;
  check(
    noticed,
    'control: a false assertion IS caught',
    noticed
      ? 'a deliberately false assertion moved the counter — the checks above can fail'
      : 'a deliberately false assertion did NOT move the counter — every ok above is meaningless',
  );
}

export async function runEstateCheck(): Promise<number> {
  console.log('\nEstate — create, drop and migrate, with no Postgres in sight\n');
  console.log('THE DROP PATH — every name checked before anything is destroyed');

  const ours = (db: string): void => {
    if (!db.startsWith('acme_')) throw new Error(`refusing to drop ${db} — not ours`);
  };

  const withForeign = [...SYSTEMS.slice(0, 3), { db: 'somebody_elses', label: 'not ours' }];
  const c1 = fake();
  let threw: Error | undefined;
  try {
    await dropDatabases('postgres://admin', withForeign, ours, c1);
  } catch (e) {
    threw = e as Error;
  }
  check(
    threw !== undefined,
    'a foreign name in LAST place still refuses',
    threw ? `"${threw.message}"` : 'it proceeded — three databases would already be gone',
  );
  check(
    c1.sql.length === 0,
    'and NOTHING was dropped — not even the three legitimate ones before it',
    c1.sql.length === 0
      ? 'zero statements reached the database; the check runs before the first drop'
      : `${c1.sql.length} statement(s) ran: ${c1.sql.join(' | ')} — DROP DATABASE has no undo`,
  );

  const c2 = fake();
  const dropped = await dropDatabases('postgres://admin', SYSTEMS, ours, c2);
  check(
    dropped.length === 3 && c2.sql.every((s) => /drop database if exists ".+" with \(force\)/.test(s)),
    'when every name is ours, all three drop, with (force)',
    `${dropped.join(', ')} — force is what closes other sessions holding the database open`,
  );

  console.log('\nCREATE — idempotent, and it says which it skipped');

  // Answer "already exists" for the SECOND system only — probes arrive in
  // SYSTEMS order, so counting them is enough and needs no name matching.
  let probe = 0;
  const c5 = fake((sql) =>
    sql.startsWith('select 1 from pg_database') && ++probe === 2 ? [{ exists: 1 }] : [],
  );
  const created = await createDatabases('postgres://admin', SYSTEMS, c5);
  check(
    created.filter((r) => r.created).length === 2 && created[1].created === false,
    'an existing database is reported and left alone',
    created.map((r) => `${r.db}:${r.created ? 'create' : 'skip'}`).join(' '),
  );
  check(
    c5.sql.filter((s) => s.startsWith('create database')).length === 2,
    'and only the missing ones get a CREATE',
    'idempotent — re-running is never the destructive step',
  );

  console.log('\nMIGRATE — skip unless forced, and the DDL comes from the caller');

  const read = async (schema: string): Promise<string> => `create table t_${schema.replace('.sql', '')} ();`;
  let n = 0;
  const c6 = fake((sql) => (sql.includes('information_schema') ? [{ n: n++ === 0 ? 0 : 4 }] : []));
  const migrated = await migrateSchemas((db) => `postgres://${db}`, [SYSTEMS[0]], read, { client: c6 });
  check(
    migrated.length === 1 && migrated[0].skipped === false && migrated[0].tables === 4,
    'an empty database is migrated, and the table count after is reported',
    `${migrated[0].db}: ${migrated[0].tables} table(s) from ${migrated[0].schema}`,
  );
  check(
    c6.sql.some((s) => s.includes('create table t_a')),
    'the DDL the caller read is what runs',
    'the package never touches the filesystem — that is how the .sql stays outside src/',
  );

  const c7 = fake((sql) => (sql.includes('information_schema') ? [{ n: 9 }] : []));
  const skipped = await migrateSchemas((db) => `postgres://${db}`, [SYSTEMS[0]], read, { client: c7 });
  check(
    skipped[0].skipped === true && !c7.sql.some((s) => s.includes('create table')),
    'a database that already has tables is skipped, not re-applied',
    `${skipped[0].tables} table(s) already — no DDL ran`,
  );

  const c8 = fake((sql) => (sql.includes('information_schema') ? [{ n: 9 }] : []));
  const forced = await migrateSchemas((db) => `postgres://${db}`, [SYSTEMS[0]], read, {
    force: true,
    client: c8,
  });
  check(
    forced[0].skipped === false && c8.sql.some((s) => s.includes('create table')),
    'and --force applies it anyway',
    'the escape hatch works, so the skip above is a choice rather than a wall',
  );

  check(
    c6.sql.includes('begin') && c6.sql.includes('commit'),
    'the DDL runs inside a TRANSACTION',
    c6.sql.includes('begin')
      ? 'half a schema is worse than none — the next run would see tables, skip, and report success'
      : `statements: ${c6.sql.join(' | ')} — a partial schema would be left behind`,
  );

  const boom = fake((sql) => {
    if (sql.includes('information_schema')) return [{ n: 0 }];
    if (sql.startsWith('create table')) throw new Error('syntax error at or near');
    return [];
  });
  let rolled: Error | undefined;
  try {
    await migrateSchemas((db) => `postgres://${db}`, [SYSTEMS[0]], read, { client: boom });
  } catch (e) {
    rolled = e as Error;
  }
  check(
    rolled !== undefined && boom.sql.includes('rollback') && !boom.sql.includes('commit'),
    'and a failing DDL rolls back and rethrows',
    rolled
      ? 'rollback ran, commit did not, and the error reached the caller'
      : 'the failure was swallowed — a broken schema would report success',
  );

  console.log('\nTHE CALLER KEEPS ITS OWN FIELDS');

  const withExtra = [{ db: 'acme_a', label: 'first', standsFor: 'Alpha' }];
  const c9 = fake();
  const back = await createDatabases('postgres://admin', withExtra, c9);
  check(
    back[0].standsFor === 'Alpha',
    'a descriptor with extra fields comes back whole',
    'a caller prints a `standsFor` this package has never heard of — flattening it would have cost that line',
  );

  console.log('\nNEGATIVE CONTROL — the checks above must be capable of failing');
  control();

  console.log(
    failed === 0
      ? '\nestate: PASS — nothing drops until every name is ours, create is idempotent, migrate skips unless forced\n'
      : `\nestate: FAIL — ${failed} problem(s)\n`,
  );
  return failed;
}

if (require.main === module) {
  runEstateCheck().then((f) => process.exit(f === 0 ? 0 : 1));
}
