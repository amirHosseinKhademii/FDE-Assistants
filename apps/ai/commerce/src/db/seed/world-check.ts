/**
 *   pnpm commerce:world-check
 *
 * Has the generated estate moved? OFFLINE — no database, no model, no cost.
 *
 * The committed fingerprint in `db/world.fingerprint.json` is the estate every
 * eval baseline will be measured against. If this goes red, the estate is no
 * longer the one those numbers describe and they are not comparable to anything
 * taken after.
 *
 * A RED RESULT IS A QUESTION WITH TWO ANSWERS AND THEY NEED OPPOSITE RESPONSES:
 *
 *   NEW TABLES ONLY, every existing table byte-identical
 *     → data was added on its own stream, as intended. Accept (`--accept`).
 *   EXISTING TABLES CHANGED
 *     → a builder's own output moved. Every committed number now describes an
 *       estate that does not exist. Do not accept; find out what changed.
 *
 * Which is why the report is per table: "it changed" is not actionable,
 * "fleet.stops changed and you did not touch it" is.
 *
 * ── AND WHY THIS FILE CARRIES ITS OWN NEGATIVE CONTROLS ────────────
 *
 * A fingerprint that has only ever agreed with itself is indistinguishable from
 * one that cannot disagree. `stable()` could return a constant, the table walk
 * could silently skip every system, and this check would print `ok unchanged`
 * for ever. That is not hypothetical in this repo: `pnpm leak:check` once
 * reported PASS while a live credential sat in the code it was scanning,
 * because the scanner had truncated its own input.
 *
 * So two controls run before the comparison, and BOTH directions matter:
 *
 *   SENSITIVITY  mutate one field of one row — the sha MUST move. Without this
 *                the whole check could be a no-op.
 *   STABILITY    reorder the keys of a row object — the sha MUST NOT move.
 *                Without this `stable()` could be plain `JSON.stringify`, and
 *                the check would cry wolf at a diff that changed no value. A
 *                check that cries wolf gets deleted, which is the same outcome
 *                as not having one.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../config/connections';
import { buildWorld } from './world';
import { fingerprintEstate, fingerprintWorld, stable, type WorldFingerprint } from './world-fingerprint';
import type { Estate } from '../schema/rows';

// Beside the DDL in `db/`, OUTSIDE `src/`, for the reason `migrate.ts` gives
// about the schema files: tsc compiles TypeScript and copies nothing, so a data
// file under `src/` is present under ts-node and absent from `dist/`.
const FILE = resolve(PACKAGE_ROOT, 'db', 'world.fingerprint.json');
const accept = process.argv.includes('--accept');

/** Deep-enough clone for a world of plain rows. Structured clone keeps Dates. */
function clone(world: Estate): Estate {
  return structuredClone(world);
}

/** SENSITIVITY — change one field of one row; the fingerprint must move. */
function assertMutationIsCaught(world: Estate, baseline: string): void {
  const planted = clone(world);
  // One order's total, by one penny. The smallest change the estate can carry.
  planted.shop.orders[0].total_pence += 1;
  const moved = fingerprintEstate(planted).sha;
  if (moved === baseline) {
    console.error(
      '\n  NEGATIVE CONTROL FAILED — a mutated row produced the SAME fingerprint.\n' +
        '  This check cannot detect drift and every "ok" it has ever printed is\n' +
        '  worthless. Fix the fingerprint before trusting anything below it.\n',
    );
    process.exit(1);
  }
}

/** STABILITY — reorder a row's keys; the fingerprint must NOT move. */
function assertReorderIsIgnored(world: Estate, baseline: string): void {
  const reordered = clone(world);
  reordered.shop.orders = reordered.shop.orders.map((o) => {
    const flipped: Record<string, unknown> = {};
    for (const k of Object.keys(o).reverse()) flipped[k] = (o as unknown as Record<string, unknown>)[k];
    return flipped as unknown as (typeof reordered.shop.orders)[number];
  });
  const after = fingerprintEstate(reordered).sha;
  if (after !== baseline) {
    console.error(
      '\n  NEGATIVE CONTROL FAILED — reordering a row\'s keys MOVED the fingerprint.\n' +
        '  `stable()` is not sorting keys, so this check will report drift for diffs\n' +
        '  that changed no value. A check that cries wolf is a check that gets\n' +
        '  deleted, which is the same outcome as not having one.\n',
    );
    process.exit(1);
  }
}

function runControls(): void {
  const world = buildWorld();
  const baseline = fingerprintEstate(world).sha;
  assertMutationIsCaught(world, baseline);
  assertReorderIsIgnored(world, baseline);
  console.log('  control  a mutated row moves the sha, a reordered row does not\n');
}

function writeFirst(now: WorldFingerprint): never {
  writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
  console.log(`  wrote the first fingerprint — ${now.tables.length} tables, sha ${now.sha}\n`);
  process.exit(0);
}

function reportUnchanged(now: WorldFingerprint): never {
  const rows = now.tables.reduce((a, t) => a + t.rows, 0);
  console.log(`  ok       unchanged — ${now.tables.length} tables, ${rows} rows, sha ${now.sha}\n`);
  process.exit(0);
}

const key = (t: { system: string; table: string }): string => `${t.system}.${t.table}`;

function reportDrift(was: WorldFingerprint, now: WorldFingerprint): never {
  const before = new Map(was.tables.map((t) => [key(t), t]));
  const after = new Map(now.tables.map((t) => [key(t), t]));

  const added = [...after.keys()].filter((k) => !before.has(k));
  const removed = [...before.keys()].filter((k) => !after.has(k));
  const differs = [...after.keys()].filter((k) => before.has(k) && before.get(k)!.sha !== after.get(k)!.sha);

  // A table that was EMPTY and now has rows is not a shifted stream — it is a
  // table the fingerprint could not previously see, now covered. Separated
  // because the two have opposite meanings and the same colour.
  const covered = differs.filter((k) => before.get(k)!.rows === 0 && after.get(k)!.rows > 0);
  const changed = differs.filter((k) => !covered.includes(k));

  for (const k of added) console.log(`  NEW      ${k.padEnd(30)} ${after.get(k)!.rows} rows`);
  for (const k of covered) console.log(`  COVER    ${k.padEnd(30)} 0 → ${after.get(k)!.rows} rows (was invisible to this check)`);
  for (const k of removed) console.log(`  GONE     ${k.padEnd(30)} was ${before.get(k)!.rows} rows`);
  for (const k of changed) {
    const b = before.get(k)!;
    const a = after.get(k)!;
    console.log(`  \x1b[31mMOVED    ${k.padEnd(30)} ${b.rows} → ${a.rows} rows, ${b.sha} → ${a.sha}\x1b[0m`);
  }
  console.log();

  if (changed.length === 0 && removed.length === 0) {
    console.log(
      `  NO SHIFT — ${added.length} new table(s), ${covered.length} newly covered, and every\n` +
        '  table that already had rows is byte-identical. Committed baselines remain\n' +
        '  valid.\n',
    );
    if (accept) {
      writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
      console.log(`  accepted — fingerprint updated to ${now.sha}\n`);
      process.exit(0);
    }
    console.log('  Re-run with --accept to record this as the new expected estate.\n');
    process.exit(1);
  }

  console.log(
    `  \x1b[31mTHE ESTATE MOVED.\x1b[0m ${changed.length} existing table(s) changed.\n\n` +
      '  Every committed eval number describes an estate that no longer exists —\n' +
      '  the order ids, the dates and the stop the trap sits on may all have moved.\n' +
      '  Each builder owns its own random stream (see `STREAM` in rng.ts), so this\n' +
      '  is not a neighbour shifting you: the builder named above changed its own\n' +
      '  output. Find out whether that was intended before accepting it.\n',
  );
  process.exit(1);
}

function main(): void {
  console.log('\nEstate fingerprint — is this still the world the baselines measured?\n');
  runControls();

  const now = fingerprintWorld();
  if (!existsSync(FILE)) writeFirst(now);

  const was = JSON.parse(readFileSync(FILE, 'utf8')) as WorldFingerprint;
  if (was.sha === now.sha) reportUnchanged(now);
  reportDrift(was, now);
}

main();
