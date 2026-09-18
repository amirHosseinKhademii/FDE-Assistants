/**
 * `pnpm commerce:db-check` — the script that turns "fake but related data" from
 * an assertion into a measurement.
 *
 * FOUR THINGS, AND THE LAST IS WHY THE FIRST THREE ARE WORTH BELIEVING.
 *
 *   1. THE SCHEMA IS WHAT THE CODE THINKS IT IS. Every table and column the
 *      seed writes is compared against the live `information_schema`. This is
 *      the one bug an offline fingerprint structurally cannot see: `columns.ts`
 *      is hand-maintained, and a column added to a `.sql` file and forgotten
 *      there inserts NULL for ever while every row count stays right.
 *   2. REFERENTIAL INTEGRITY ACROSS DATABASES. Twelve soft keys cross a
 *      database boundary and Postgres can check none of them. This walks every
 *      one and reports what dangles — and asserts, in the other direction, that
 *      none of them has quietly acquired a real foreign key.
 *   3. THE SIX TRAPS ARE STILL SHARP. Each is re-derived from the loaded rows
 *      in `traps.ts`, never from the constants that planted it.
 *   4. THE NEGATIVE CONTROL. A reference checker that looks in the wrong place
 *      reports zero dangling references and reads exactly like a clean estate.
 *      So this plants a broken soft key in a copy of the loaded data and
 *      requires itself to catch it. If the control stops failing, everything
 *      above it is decoration.
 *
 * That fourth point is not hypothetical in this repo: `pnpm leak:check` once
 * reported PASS while a live credential sat in the code it was scanning,
 * because the scanner had silently truncated its own input.
 */
import { Client } from 'pg';
import { SYSTEMS, urlFor, assertNotAnotherEngagement } from '../../config/connections';
import { COLUMNS, tablesOf } from '../seed/columns';
import { REQUIRED_FKS, SOFT_KEYS } from './soft-keys';
import { checkAllTraps, type Finding, type Table } from './traps';

type Loaded = Record<string, Record<string, Record<string, any>[]>>;

interface Introspection {
  columns: Map<string, Set<string>>;
  /** `table.column` → referenced table, for every FOREIGN KEY constraint. */
  foreignKeys: Map<string, string>;
}

const findings: Finding[] = [];
const note = (ok: boolean, label: string, detail: string): void => { findings.push({ ok, label, detail }); };

// ── reading the estate ─────────────────────────────────────────────

const COLUMN_SQL = `
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'`;

const FK_SQL = `
  select tc.table_name, kcu.column_name, ccu.table_name as referenced
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
  where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`;

async function readDatabase(db: string): Promise<{ rows: Record<string, Record<string, any>[]>; meta: Introspection }> {
  const client = new Client({ connectionString: urlFor(db) });
  await client.connect();
  try {
    const rows: Record<string, Record<string, any>[]> = {};
    for (const table of tablesOf(db)) {
      rows[table] = (await client.query(`select * from ${table}`)).rows;
    }

    const columns = new Map<string, Set<string>>();
    for (const r of (await client.query(COLUMN_SQL)).rows) {
      if (!columns.has(r.table_name)) columns.set(r.table_name, new Set());
      columns.get(r.table_name)!.add(r.column_name);
    }

    const foreignKeys = new Map<string, string>();
    for (const r of (await client.query(FK_SQL)).rows) {
      foreignKeys.set(`${r.table_name}.${r.column_name}`, r.referenced);
    }

    return { rows, meta: { columns, foreignKeys } };
  } finally {
    await client.end();
  }
}

// ── 1 · the schema is what the code thinks it is ───────────────────

function checkSchemaMatchesColumns(db: string, meta: Introspection): void {
  const missingTables = tablesOf(db).filter((t) => !meta.columns.has(t));
  note(
    missingTables.length === 0,
    `${db} every table the seed writes exists`,
    missingTables.length ? `MISSING: ${missingTables.join(', ')}` : `${tablesOf(db).length} tables`,
  );

  const drift: string[] = [];
  for (const table of tablesOf(db)) {
    const live = meta.columns.get(table);
    if (!live) continue;
    for (const c of COLUMNS[db][table]) if (!live.has(c)) drift.push(`${table}.${c} in columns.ts but not in the database`);
    for (const c of live) if (!COLUMNS[db][table].includes(c)) drift.push(`${table}.${c} in the database but never written`);
  }
  note(
    drift.length === 0,
    `${db} columns.ts and the DDL agree`,
    drift.length ? drift.slice(0, 4).join(' · ') : 'every column is written and every written column exists',
  );
}

// ── 2 · foreign keys, in both directions ───────────────────────────

function checkRequiredForeignKeys(db: string, meta: Introspection): void {
  const want = REQUIRED_FKS.filter(([d]) => d === db);
  const missing = want.filter(([, t, c, ref]) => meta.foreignKeys.get(`${t}.${c}`) !== ref);
  note(
    missing.length === 0,
    `${db} real foreign keys are present INSIDE the system`,
    missing.length
      ? `MISSING: ${missing.map(([, t, c, ref]) => `${t}.${c}→${ref}`).join(', ')}`
      : `${want.length} constraints enforced by Postgres`,
  );
}

/**
 * The check that protects the whole design. If a soft key ever acquires a real
 * foreign key, the five databases have become one database wearing five names —
 * silently, with every other test still green.
 */
function checkSoftKeysAreNotForeignKeys(db: string, meta: Introspection): void {
  const mine = SOFT_KEYS.filter((k) => k.from.db === db);
  const wrong = mine.filter((k) => meta.foreignKeys.has(`${k.from.table}.${k.from.column}`));
  note(
    wrong.length === 0,
    `${db} soft keys are NOT foreign keys`,
    wrong.length
      ? `${wrong.map((k) => `${k.from.table}.${k.from.column}`).join(', ')} has a real FK — it points at another database and cannot`
      : `${mine.length} cross-database reference(s), none constrained`,
  );
}

// ── the soft-key walk ──────────────────────────────────────────────

interface Dangling { key: string; count: number; sample: string }

function walkSoftKeys(loaded: Loaded): Dangling[] {
  const out: Dangling[] = [];
  for (const k of SOFT_KEYS) {
    const source = loaded[k.from.db]?.[k.from.table] ?? [];
    const targets = new Set((loaded[k.to.db]?.[k.to.table] ?? []).map((r) => String(r[k.to.column])));
    const bad = source.filter((r) => {
      const v = r[k.from.column];
      if (v === null || v === undefined) return !k.nullable;
      return !targets.has(String(v));
    });
    if (bad.length) {
      out.push({
        key: `${k.from.db}.${k.from.table}.${k.from.column} → ${k.to.db}.${k.to.table}`,
        count: bad.length,
        sample: String(bad[0][k.from.column]),
      });
    }
  }
  return out;
}

function checkSoftKeysResolve(loaded: Loaded): void {
  const dangling = walkSoftKeys(loaded);
  note(
    dangling.length === 0,
    'every soft key resolves across the boundary',
    dangling.length
      ? dangling.map((d) => `${d.key}: ${d.count} dangling (e.g. ${d.sample})`).join(' · ')
      : `${SOFT_KEYS.length} cross-database references, all resolving`,
  );
}

/**
 * NEGATIVE CONTROL — plant a broken reference and require the walk to find it.
 *
 * Without this, a walk that looked in the wrong table would report zero
 * dangling references and read exactly like a clean estate.
 */
function controlDanglingSoftKeyIsCaught(loaded: Loaded): void {
  const planted: Loaded = { ...loaded, thb_crm: { ...loaded.thb_crm } };
  planted.thb_crm.customers = loaded.thb_crm.customers.map((r, i) =>
    i === 0 ? { ...r, user_ref: 'USR-9999' } : r,
  );
  const caught = walkSoftKeys(planted).some((d) => d.sample === 'USR-9999');
  note(
    caught,
    'CONTROL a planted dangling soft key is caught',
    caught
      ? 'USR-9999 in thb_crm.customers.user_ref was detected'
      : 'THE WALK DID NOT CATCH ITS OWN PLANT — every result above it is decoration',
  );
}

// ── chronology ─────────────────────────────────────────────────────

const at = (v: unknown): number => (v instanceof Date ? v.getTime() : new Date(String(v)).getTime());

/**
 * A PARCEL CANNOT ARRIVE BEFORE IT WAS SENT, and nothing else here was checking.
 *
 * This exists because both halves of it were wrong at once and every other
 * check stayed green. `outcomeOf` pinned T1's delivery date while its dispatch
 * stayed random, so the trap order was delivered seventeen days before it left
 * the warehouse; and `reserveT1Round` re-dated borrowed deliveries backwards
 * past their own dispatch. Row counts, soft keys and the traps themselves were
 * all satisfied — the evidence trail simply ran backwards.
 */
function checkDeliveryFollowsDispatch(loaded: Loaded): void {
  const shipments = new Map(loaded.thb_fleet.shipments.map((s) => [s.shipment_id, s]));
  const backwards = loaded.thb_fleet.delivery_events.filter((e) => {
    const s = shipments.get(e.shipment_id);
    return s && at(e.occurred_at) < at(s.dispatched_at);
  });
  note(
    backwards.length === 0,
    'no parcel is delivered before it was dispatched',
    backwards.length
      ? `${backwards.length} event(s) precede their dispatch, e.g. ${backwards[0].shipment_id}`
      : `${loaded.thb_fleet.delivery_events.length} delivery events, all after their dispatch`,
  );

  const early = loaded.thb_fleet.scans.filter((sc) => {
    const s = shipments.get(sc.shipment_id);
    return s && at(sc.scanned_at) < at(s.dispatched_at) - 3_600_000;
  });
  note(
    early.length === 0,
    'no scan precedes its own dispatch',
    early.length ? `${early.length} scan(s) out of order` : `${loaded.thb_fleet.scans.length} scans in order`,
  );
}

/**
 * `promised_by` HAS TO BE ABLE TO BE MISSED, or it is not a promise.
 *
 * It was filled with the DELIVERY date, which made every delivered shipment on
 * time by construction: `where delivered > promised_by` returned zero rows and
 * always would. A column that cannot disagree with reality is the same species
 * of quiet wrong as a check that cannot fail — so this asserts that some
 * shipments genuinely ran late, and that T6's six genuinely did not.
 */
function checkPromisedByIsAPromise(loaded: Loaded): void {
  const events = new Map<string, number>();
  for (const e of loaded.thb_fleet.delivery_events) {
    if (e.status === 'DELIVERED') events.set(e.shipment_id, at(e.occurred_at));
  }
  const delivered = loaded.thb_fleet.shipments.filter((s) => events.has(s.shipment_id));
  const late = delivered.filter((s) => {
    const day = new Date(events.get(s.shipment_id)!).toISOString().slice(0, 10);
    return day > new Date(at(s.promised_by)).toISOString().slice(0, 10);
  });
  note(
    late.length > 0,
    'some shipments are genuinely late by their own promise',
    late.length
      ? `${late.length} of ${delivered.length} delivered after promised_by — the column is not self-certifying`
      : `0 of ${delivered.length} — promised_by cannot be missed, so it is not a promise`,
  );
}

/**
 * MONEY THAT WENT BACK CANNOT EXCEED MONEY THAT CAME IN.
 *
 * Two arithmetic invariants that no other check was asserting, and the second
 * one was live: T3's planted £22 partial sat against a £14.77 line after prices
 * moved to category bands. The order total still exceeded the refund, which is
 * all anything was looking at, so it passed. A partial refund larger than the
 * line it is against is not a subtlety — it is arithmetic nobody can defend,
 * and it would have surfaced as an apparent bug in whichever tool displayed it.
 */
function checkRefundArithmetic(loaded: Loaded): void {
  const lineTotal = new Map(loaded.thb_shop.order_items.map((li) => [li.order_item_id, Number(li.line_total_pence)]));
  const orderTotal = new Map(loaded.thb_shop.orders.map((o) => [o.order_id, Number(o.total_pence)]));

  const overLine = loaded.thb_shop.refunds.filter(
    (r) => r.order_item_id !== null && Number(r.amount_pence) > (lineTotal.get(r.order_item_id) ?? 0),
  );
  note(
    overLine.length === 0,
    'no refund exceeds the line it is against',
    overLine.length
      ? `${overLine.length}, e.g. ${overLine[0].refund_id}: ${overLine[0].amount_pence}p against a ${lineTotal.get(overLine[0].order_item_id)}p line`
      : `${loaded.thb_shop.refunds.length} refunds, every line-level one within its line`,
  );

  const byOrder = new Map<string, number>();
  for (const r of loaded.thb_shop.refunds) {
    byOrder.set(r.order_id, (byOrder.get(r.order_id) ?? 0) + Number(r.amount_pence));
  }
  const overOrder = [...byOrder.entries()].filter(([id, sum]) => sum > (orderTotal.get(id) ?? 0));
  note(
    overOrder.length === 0,
    'no order is refunded more than it was worth',
    overOrder.length
      ? `${overOrder.length}, e.g. ${overOrder[0][0]}: ${overOrder[0][1]}p refunded on a ${orderTotal.get(overOrder[0][0])}p order`
      : `${byOrder.size} refunded orders, all within their total`,
  );
}

/**
 * THE HIGH-VALUE EXCEPTION HAS TO BE EXCEPTIONAL.
 *
 * `DOC-HIGHVALUE` calls itself an exception bulletin and `RR-006` exists to
 * catch the rare order needing a manager. Prices were one uniform draw for
 * every category, which put 1,030 of 2,000 orders over the £250 threshold — a
 * rule firing on half of all orders discriminates nothing, and an eval case
 * about it would grade the ordinary path. It also priced a smart plug at
 * £127.11, which is how the MCP session noticed.
 *
 * Both ends are asserted: it must fire sometimes (or the rule is dead) and
 * rarely (or it is not an exception).
 */
function checkHighValueIsExceptional(loaded: Loaded): void {
  const threshold = Number(
    loaded.thb_policy.approval_thresholds.find((t) => t.threshold_id === 'AT-REFUND-MGR')?.max_pence ?? 25000,
  );
  const totals = loaded.thb_shop.orders.map((o) => Number(o.total_pence));
  const over = totals.filter((t) => t > threshold).length;
  const share = over / totals.length;
  note(
    over > 0 && share < 0.2,
    'the high-value threshold is exercised but exceptional',
    `${over} of ${totals.length} orders over ${threshold}p (${(share * 100).toFixed(1)}%)`,
  );
}

// ── determinism ────────────────────────────────────────────────────

function checkRowCountsAgainstTheSeed(loaded: Loaded): void {
  // Required lazily: building the world costs a second and is pointless if the
  // connection failed above.
  const { buildWorld } = require('../seed/world') as typeof import('../seed/world');
  const { BUCKET } = require('../seed/columns') as typeof import('../seed/columns');
  const world = buildWorld() as unknown as Record<string, Record<string, unknown[]>>;

  const mismatched: string[] = [];
  for (const { db } of SYSTEMS) {
    const bucket = world[BUCKET[db]];
    for (const table of tablesOf(db)) {
      const expected = (bucket[table] ?? []).length;
      const actual = (loaded[db]?.[table] ?? []).length;
      if (expected !== actual) mismatched.push(`${db}.${table} ${actual} loaded vs ${expected} generated`);
    }
  }
  note(
    mismatched.length === 0,
    'regenerating the world reproduces what is loaded',
    mismatched.length
      ? mismatched.slice(0, 4).join(' · ')
      : 'every table matches the seed row for row — the estate is regenerable',
  );
}

// ── run ────────────────────────────────────────────────────────────

function report(): never {
  for (const f of findings) {
    console.log(`  ${f.ok ? 'ok   ' : '\x1b[31mFAIL \x1b[0m'} ${f.label.padEnd(52)} ${f.detail}`);
  }
  const failed = findings.filter((f) => !f.ok);
  console.log(
    failed.length
      ? `\ndb-check: \x1b[31m${failed.length} of ${findings.length} failed\x1b[0m\n`
      : `\ndb-check: ${findings.length} checks passed\n`,
  );
  process.exit(failed.length ? 1 : 0);
}

async function main(): Promise<void> {
  assertNotAnotherEngagement(urlFor('thb_shop'));
  console.log('\nThornbury estate check\n');

  const loaded: Loaded = {};
  for (const { db } of SYSTEMS) {
    const { rows, meta } = await readDatabase(db);
    loaded[db] = rows;
    checkSchemaMatchesColumns(db, meta);
    checkRequiredForeignKeys(db, meta);
    checkSoftKeysAreNotForeignKeys(db, meta);
  }

  checkSoftKeysResolve(loaded);
  controlDanglingSoftKeyIsCaught(loaded);
  checkDeliveryFollowsDispatch(loaded);
  checkPromisedByIsAPromise(loaded);
  checkRefundArithmetic(loaded);
  checkHighValueIsExceptional(loaded);
  checkRowCountsAgainstTheSeed(loaded);

  const T: Table = (db, table) => loaded[db]?.[table] ?? [];
  findings.push(...checkAllTraps(T));

  report();
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
