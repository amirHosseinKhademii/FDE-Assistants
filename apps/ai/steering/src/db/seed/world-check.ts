/**
 *   pnpm steering:world-check
 *
 * Has the generated estate moved? OFFLINE — no database, no model, no cost.
 *
 * The committed fingerprint in `db/estate.fingerprint.json` is the estate every
 * later number will be measured against. If this goes red, the estate is no
 * longer the one those numbers describe.
 *
 * A RED RESULT IS A QUESTION WITH TWO ANSWERS AND THEY NEED OPPOSITE RESPONSES
 * — see `fingerprint.ts`. Which is why the report below is per table.
 *
 * `--accept` writes the current state as the new baseline. Use it for added
 * tables; do not use it to make a changed table go away.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { PACKAGE_ROOT } from '../../config/connections';
import { fingerprintEstate, type EstateFingerprint } from './fingerprint';

// Beside the DDL in `db/`, OUTSIDE `src/`, for the reason `migrate.ts` gives
// about the schema files: tsc compiles TypeScript and copies nothing, so a data
// file under `src/` is present under ts-node and absent from `dist/` — a
// failure that only shows up after a build.
const FILE = resolve(PACKAGE_ROOT, 'db', 'estate.fingerprint.json');
const accept = process.argv.includes('--accept');

const now = fingerprintEstate();

if (!existsSync(FILE) || accept) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(now, null, 2)}\n`);
  const c = {
    tables: now.tables.filter((t) => t.system !== 'corpus').length,
    rows: now.tables.filter((t) => t.system !== 'corpus').reduce((a, t) => a + t.rows, 0),
    repos: now.tables.filter((t) => t.system === 'corpus').length,
    files: now.tables.filter((t) => t.system === 'corpus').reduce((a, t) => a + t.rows, 0),
  };
  console.log(
    `\n  wrote the fingerprint — ${c.tables} tables / ${c.rows} rows, ` +
      `${c.files} files across ${c.repos} repositories, sha ${now.sha}\n`,
  );
  process.exit(0);
}

const was = JSON.parse(readFileSync(FILE, 'utf8')) as EstateFingerprint;

console.log('\nEstate fingerprint — is this still the estate the numbers describe?\n');

/**
 * Counted separately, because "47 tables, 13759 rows" conflated 37 real tables
 * and 13,705 rows with 10 corpus pseudo-tables and 54 files. A drift alarm has
 * to be unambiguous about WHAT moved — half of this estate is prose.
 */
const split = (f: EstateFingerprint) => {
  const db = f.tables.filter((t) => t.system !== 'corpus');
  const co = f.tables.filter((t) => t.system === 'corpus');
  return {
    tables: db.length,
    rows: db.reduce((a, t) => a + t.rows, 0),
    repos: co.length,
    files: co.reduce((a, t) => a + t.rows, 0),
  };
};

if (was.sha === now.sha) {
  const c = split(now);
  console.log(
    `  ok    unchanged — ${c.tables} tables / ${c.rows} rows in 4 databases, ` +
      `${c.files} files across ${c.repos} repositories, sha ${now.sha}\n`,
  );
  process.exit(0);
}

const key = (t: { system: string; table: string }): string => `${t.system}.${t.table}`;
const before = new Map(was.tables.map((t) => [key(t), t]));
const after = new Map(now.tables.map((t) => [key(t), t]));

const added = [...after.keys()].filter((k) => !before.has(k));
const removed = [...before.keys()].filter((k) => !after.has(k));

/**
 * A table that was EMPTY and now has rows is not a shifted stream — it is a
 * table the fingerprint could not previously distinguish, now covered. Kept
 * separate from a real change so the two are not read as the same event.
 */
const filled = [...after.keys()].filter((k) => {
  const b = before.get(k);
  return b && b.rows === 0 && after.get(k)!.rows > 0;
});
const changed = [...after.keys()].filter((k) => {
  const b = before.get(k);
  return b && b.sha !== after.get(k)!.sha && b.rows > 0;
});

for (const k of added) console.log(`  added   ${k}  (${after.get(k)!.rows} rows)`);
for (const k of filled) console.log(`  filled  ${k}  (0 → ${after.get(k)!.rows} rows)`);
for (const k of removed) console.log(`  REMOVED ${k}`);
for (const k of changed) {
  const b = before.get(k)!;
  const a = after.get(k)!;
  console.log(`  CHANGED ${k}  ${b.rows} → ${a.rows} rows, sha ${b.sha} → ${a.sha}`);
}

if (changed.length === 0 && removed.length === 0) {
  console.log(
    `\n  only additions — ${added.length} new table(s), ${filled.length} filled. ` +
      `The existing streams are intact.\n  Accept with:  pnpm steering:world-check --accept\n`,
  );
  process.exit(0);
}

console.log(
  `\nworld-check: FAIL — ${changed.length} existing table(s) changed and ${removed.length} removed.\n` +
    `  Something drew from a stream it does not own. Give the new generator its own\n` +
    `  makeHelpers(seed) rather than accepting this.\n`,
);
process.exit(1);
