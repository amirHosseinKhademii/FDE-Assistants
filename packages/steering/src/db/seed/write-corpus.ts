/**
 * `pnpm steering:corpus` — write the code base to disk.
 *
 * DETERMINISTIC AND COMMITTED, exactly like `pnpm corpus` in the insurance
 * package. The corpus is a fixture: it is regenerated only when the haystack is
 * intentionally changed, and the diff is reviewable because the output is
 * byte-identical from one run to the next.
 *
 * IT GOES UNDER `docs/`, NOT INTO THE PACKAGE. A customer's documents are not
 * source code — at a real engagement `STEERING_CORPUS_DIR` points at theirs and
 * none of this is read. Same rule as `docs/examples/` for insurance, and the
 * same reason.
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { REPO_ROOT } from '../../config/connections';
import { buildPrograms } from './programs';
import { buildRequirements } from './requirements';
import { buildEffort } from './effort';
import { buildCorpus } from './corpus';
import { buildRequirementDocs } from './corpus-requirements';
import { buildPmoDocs } from './corpus-pmo';
import { buildCodeCorpus } from './corpus-code';

export const CORPUS_DIR = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

function main(): void {
  const crm = buildPrograms();
  const alm = buildRequirements(crm);
  const pmo = buildEffort(crm, alm);

  // FOUR GENERATORS, FOUR STREAMS. The order is load-bearing only in that
  // `buildCorpus` writes the hand-authored steering-feel files and
  // `buildCodeCorpus` must not overwrite them — it skips `damping.c` for
  // exactly that reason. Everything else is disjoint by path.
  const files = [
    ...buildCorpus(crm, alm),
    ...buildRequirementDocs(crm, alm),
    ...buildPmoDocs(crm, alm, pmo),
    ...buildCodeCorpus(crm, alm),
  ];

  // A path written twice means one generator silently clobbered another, and
  // the survivor depends on array order — which is exactly the kind of bug that
  // only shows up as a missing document weeks later.
  const seen = new Set<string>();
  for (const f of files) {
    if (seen.has(f.path)) throw new Error(`two generators wrote ${f.path}`);
    seen.add(f.path);
  }

  // Wipe first. A generator that only ever adds leaves the deleted files
  // behind, and a stale document in a corpus is worse than a missing one —
  // it is findable, citable and wrong.
  if (existsSync(CORPUS_DIR)) rmSync(CORPUS_DIR, { recursive: true });

  let bytes = 0;
  for (const f of files) {
    const path = join(CORPUS_DIR, f.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, f.content);
    bytes += f.content.length;
  }

  const repos = new Set(files.map((f) => f.path.split('/')[0]));
  console.log(`\nWrote the Vantis code base — ${files.length} files, ${(bytes / 1024).toFixed(0)} KB\n`);
  for (const r of [...repos].sort()) {
    const n = files.filter((f) => f.path.startsWith(`${r}/`)).length;
    console.log(`  ${String(n).padStart(3)} ${r}`);
  }
  console.log(`\n  → ${CORPUS_DIR}\n`);
}

main();
