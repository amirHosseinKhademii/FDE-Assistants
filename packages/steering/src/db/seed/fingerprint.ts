/**
 * A hash of the generated estate, per table, so a shifted random stream cannot
 * pass quietly.
 *
 * WHY PER TABLE AND NOT ONE HASH. "It changed" is not actionable.
 * "vst_scm.commits changed and you did not touch it" is. The two possible
 * causes of a red result need opposite responses:
 *
 *   NEW TABLES ONLY, everything existing byte-identical
 *     → data was added on its own stream, as intended. Accept and carry on.
 *
 *   AN EXISTING TABLE CHANGED
 *     → something drew from a stream it does not own, and every number measured
 *       against the old estate now describes a world that no longer exists. Do
 *       not accept; give the new generator its own `makeHelpers(seed)`.
 *
 * OFFLINE AND FREE. The generators are pure — no database, no model — so this
 * runs in the same breath as a typecheck. That is what makes it usable as a
 * gate rather than as something somebody remembers to do.
 */
import { createHash } from 'node:crypto';
import { buildEstate, tablesOf } from './estate';
import { buildPrograms } from './programs';
import { buildRequirements } from './requirements';
import { buildEffort } from './effort';
import { buildCorpus } from './corpus';
import { buildRequirementDocs } from './corpus-requirements';
import { buildPmoDocs } from './corpus-pmo';
import { buildCodeCorpus } from './corpus-code';

export interface TableFingerprint {
  system: string;
  table: string;
  rows: number;
  sha: string;
}

export interface EstateFingerprint {
  sha: string;
  rows: number;
  tables: TableFingerprint[];
}

/**
 * Stable JSON: object keys sorted at every level.
 *
 * `JSON.stringify` preserves insertion order, so two generators producing the
 * same row with its columns assembled in a different order would hash
 * differently and report a change that is not one.
 */
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export function fingerprintEstate(): EstateFingerprint {
  const estate = buildEstate();
  const tables: TableFingerprint[] = [];
  let rows = 0;
  for (const [system, table, data] of tablesOf(estate)) {
    tables.push({ system, table, rows: data.length, sha: sha256(stable(data)) });
    rows += data.length;
  }

  // THE CORPUS IS FINGERPRINTED TOO, and it has to be: it is half the estate
  // and it is the half that gets regenerated to disk and committed. A corpus
  // that drifts without being noticed is worse than a table that does, because
  // the diff is large, prose, and easy to wave through.
  //
  // It appears as one pseudo-table per repository, so the per-table report in
  // `world-check.ts` reads the same way for both halves — "eps-steering-feel
  // changed and you did not touch it" is the same kind of sentence as
  // "vst_alm.budgets changed".
  const crm = buildPrograms();
  const alm = buildRequirements(crm);
  const pmo = buildEffort(crm, alm);
  const files = [
    ...buildCorpus(crm, alm),
    ...buildRequirementDocs(crm, alm),
    ...buildPmoDocs(crm, alm, pmo),
    ...buildCodeCorpus(crm, alm),
  ];
  const byRepo = new Map<string, { path: string; content: string }[]>();
  for (const f of files) {
    const repo = f.path.split('/')[0];
    byRepo.set(repo, [...(byRepo.get(repo) ?? []), f]);
  }
  for (const repo of [...byRepo.keys()].sort()) {
    const group = byRepo.get(repo)!;
    tables.push({
      system: 'corpus',
      table: repo,
      rows: group.length,
      sha: sha256(group.map((f) => `${f.path}:${f.content}`).join('\u0000')),
    });
    rows += group.length;
  }

  return { sha: sha256(tables.map((t) => `${t.system}.${t.table}:${t.sha}`).join('|')), rows, tables };
}
