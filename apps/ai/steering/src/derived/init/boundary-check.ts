/**
 * `pnpm steering:derived-boundary-check` — the ingest cannot open the answer key.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * `vst_derived` is supposed to be derived from documents. The four customer
 * databases contain the right answers. When extraction leaves a gap — and it
 * will — the cheapest fix available to anyone, including me, is one line that
 * reads the value out of `vst_alm` instead. Nothing would fail. The grade would
 * go up. And the number it produced would mean nothing at all, for as long as
 * nobody happened to read that line.
 *
 * So it is made mechanically impossible rather than agreed to.
 *
 * ── WHY THE BAN IS ON SYMBOLS AND NOT ON THE MODULE ───────────────────────
 *
 * The obvious rule is "ingest may not import `config/connections`". Wrong: the
 * ingest legitimately needs `REPO_ROOT` and `derivedUrl` from that file. The ban is
 * on the three symbols that reach the customer's estate — `SYSTEMS`,
 * `DB_NAMES`, `urlFor` — plus the literal database names, which would otherwise
 * be a one-line way around it.
 *
 * Comments are NOT exempt, unlike `leak:check`. Nothing in an ingest file has
 * any reason to name `vst_alm` even in prose, and exempting comments would
 * exempt the exact string a commented-out shortcut is written in.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PACKAGE_ROOT, DB_NAMES, DERIVED_DB } from '../../config/connections';
import { report, type Result } from '../../db/init/assertions';

/**
 * BOTH PIPELINES THAT READ THE CORPUS, not just the deterministic one.
 *
 * `extract/` was added to this list the moment it existed, and it is the more
 * important of the two: a parser that cheats produces a number somebody will
 * check, whereas a prompt that cheats produces a plausible sentence nobody
 * will. If the extraction can see the answer key, its score is fiction.
 */
const SCANNED = [
  join(PACKAGE_ROOT, 'src', 'derived', 'ingest'),
  join(PACKAGE_ROOT, 'src', 'derived', 'extract'),
];
const BANNED = ['SYSTEMS', 'DB_NAMES', 'urlFor', 'vst_crm', 'vst_plm', 'vst_alm', 'vst_pmo'];

function walk(d: string): string[] {
  return readdirSync(d).sort().flatMap((n) => {
    const full = join(d, n);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function main(): void {
  const r: Result = { ok: [], fail: [] };
  const files = SCANNED.flatMap(walk);

  for (const full of files) {
    const rel = relative(PACKAGE_ROOT, full);
    const src = readFileSync(full, 'utf8');
    const hits = BANNED.filter((w) => src.includes(w));
    if (hits.length) {
      r.fail.push({
        label: `ingest reaches the answer key — ${rel}`,
        detail: `names ${hits.join(', ')}. The ingest may read the corpus and write vst_derived. Nothing else.`,
      });
    }
  }
  if (!r.fail.length) {
    r.ok.push({
      label: `${files.length} ingest and extract file(s) name none of the customer's databases`,
      detail: `banned: ${BANNED.join(', ')}`,
    });
  }

  // ── THE OTHER DIRECTION, WHICH IS THE ONE THAT ACTUALLY CAUSED DAMAGE ───
  //
  // Everything above stops the ingest reaching the customer's databases. It
  // does nothing about the estate reaching OURS, and that is the direction that
  // destroyed pharma's index: `db:drop` iterated its system list, the index was
  // in that list, and it went. `assertOurs` rejects `vst_derived` by name, but only
  // if something CALLS it with that name — a loop over `SYSTEMS` never would.
  //
  // So the two facts that must hold are asserted directly, and they are free.
  const inSystems = DB_NAMES.includes(DERIVED_DB);
  r[inSystems ? 'fail' : 'ok'].push({
    label: `${DERIVED_DB} is not a member of SYSTEMS`,
    detail: inSystems
      ? `IT IS. db:drop and db:reset iterate that array — our index is one reset from gone.`
      : `SYSTEMS is ${DB_NAMES.join(', ')}. db:drop and db:reset iterate it and cannot find ${DERIVED_DB}.`,
  });

  const dropSrc = readFileSync(join(PACKAGE_ROOT, 'src', 'db', 'init', 'drop.ts'), 'utf8');
  const reachable = dropSrc.includes(DERIVED_DB) || dropSrc.includes('DERIVED_DB');
  r[reachable ? 'fail' : 'ok'].push({
    label: 'the estate drop script cannot name our database',
    detail: reachable
      ? `src/db/init/drop.ts names ${DERIVED_DB}. It has one job and that is not it.`
      : `src/db/init/drop.ts never names ${DERIVED_DB}; derived:drop is separate and asks.`,
  });

  // The plant, for the same reason leak:check plants one: a scanner that has
  // never caught anything is indistinguishable from a scanner that cannot.
  const planted = `const x = urlFor('vst_alm');`;
  const caught = BANNED.some((w) => planted.includes(w));
  r[caught ? 'ok' : 'fail'].push({
    label: 'the check catches its own plant',
    detail: caught ? `a line reading ${planted} would be flagged` : 'IT DOES NOT — the scan is dead',
  });

  process.exit(report('derived:boundary-check', r));
}

main();
