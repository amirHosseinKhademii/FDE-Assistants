/**
 *   pnpm pharma:world-check
 *
 * Has the generated world moved? OFFLINE — no database, no model, no cost.
 *
 * The committed fingerprint in `db/world.fingerprint.json` is the world
 * every current eval baseline was measured against. If this goes red, the
 * estate is no longer the one those numbers describe, and the numbers are not
 * comparable to anything taken after.
 *
 * A RED RESULT IS NOT AUTOMATICALLY A BUG — it is a question with exactly two
 * answers, and they need opposite responses:
 *
 *   NEW TABLES ONLY, every existing table byte-identical
 *     → data was added on its own random stream, as intended. Accept the new
 *       fingerprint (`--accept`) and carry on; baselines stay valid.
 *
 *   EXISTING TABLES CHANGED
 *     → something drew from the shared stream and shifted everything after it.
 *       Every committed eval number now describes a world that no longer
 *       exists. Do not accept; fix the generator to use its own
 *       `makeHelpers(otherSeed)`.
 *
 * Which is why the report is per table rather than one hash: "it changed" is
 * not actionable, "mrd_qms.qc_tests changed and you did not touch it" is.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../../config/connections';
import { fingerprintWorld, type WorldFingerprint } from './world-fingerprint';

// Beside the DDL in `db/`, and OUTSIDE `src/`, for the reason `migrate.ts`
// already gives about the schema files: tsc compiles TypeScript and copies
// nothing, so a data file under `src/` is present under ts-node and absent
// from `dist/` — a failure that only shows up after a build.
const FILE = resolve(PACKAGE_ROOT, 'db', 'world.fingerprint.json');
const accept = process.argv.includes('--accept');

const now = fingerprintWorld();

if (!existsSync(FILE)) {
  writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
  console.log(`\n  wrote the first fingerprint — ${now.tables.length} tables, sha ${now.sha}\n`);
  process.exit(0);
}

const was = JSON.parse(readFileSync(FILE, 'utf8')) as WorldFingerprint;

console.log('\nWorld fingerprint — is the estate still the one the baselines measured?\n');

if (was.sha === now.sha) {
  const rows = now.tables.reduce((a, t) => a + t.rows, 0);
  console.log(`  ok    unchanged — ${now.tables.length} tables, ${rows} rows, sha ${now.sha}\n`);
  process.exit(0);
}

const key = (t: { system: string; table: string }): string => `${t.system}.${t.table}`;
const before = new Map(was.tables.map((t) => [key(t), t]));
const after = new Map(now.tables.map((t) => [key(t), t]));

const added = [...after.keys()].filter((k) => !before.has(k));
const removed = [...before.keys()].filter((k) => !after.has(k));
const differs = [...after.keys()].filter((k) => {
  const b = before.get(k);
  return b && b.sha !== after.get(k)!.sha;
});

/**
 * A table that was EMPTY and now has rows is not a shifted stream — it is a
 * table the fingerprint could not previously see, now covered. Separated from
 * a genuine shift because the two have opposite meanings and the same colour,
 * and a check that hands you the wrong diagnosis costs more than one that says
 * nothing: it sends you hunting a bug that is not there.
 *
 * This is not hypothetical. It fired on the first real use, when
 * `equipment_qualification` moved 0 → 50 because it was lifted out of
 * `seed.ts` so the fingerprint could reach it at all.
 */
const covered = differs.filter((k) => before.get(k)!.rows === 0 && after.get(k)!.rows > 0);
const changed = differs.filter((k) => !covered.includes(k));

for (const k of added) console.log(`  NEW   ${k.padEnd(34)} ${after.get(k)!.rows} rows`);
for (const k of covered)
  console.log(`  COVER ${k.padEnd(34)} 0 → ${after.get(k)!.rows} rows (was invisible to this check)`);
for (const k of removed) console.log(`  GONE  ${k.padEnd(34)} was ${before.get(k)!.rows} rows`);
for (const k of changed) {
  const b = before.get(k)!;
  const a = after.get(k)!;
  console.log(`  \x1b[31mMOVED ${k.padEnd(34)} ${b.rows} → ${a.rows} rows, ${b.sha} → ${a.sha}\x1b[0m`);
}

console.log();

if (changed.length === 0 && removed.length === 0) {
  console.log(
    `  NO SHIFT — ${added.length} new table(s), ${covered.length} newly covered, and every\n` +
      '  table that already had rows is byte-identical. New data is on its own\n' +
      '  random stream, which is the whole point. Committed eval baselines remain\n' +
      '  valid.\n',
  );
  if (accept) {
    writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
    console.log(`  accepted — fingerprint updated to ${now.sha}\n`);
    process.exit(0);
  }
  console.log('  Re-run with --accept to record this as the new expected world.\n');
  process.exit(1);
}

console.log(
  `  \x1b[31mTHE SHARED RANDOM STREAM SHIFTED.\x1b[0m ${changed.length} existing table(s) moved.\n\n` +
    '  Every committed eval baseline describes a world that no longer exists —\n' +
    '  the lot codes, dates and test results those numbers were measured against\n' +
    '  have changed. This is not fixable by accepting the new fingerprint.\n\n' +
    '  The cause is almost always a new generator taking `h` off the world object\n' +
    "  instead of making its own `makeHelpers(otherSeed)`. `h` is right there in\n" +
    '  `MasterWorld`, which is exactly why this is easy to do by accident.\n',
);
process.exit(1);
