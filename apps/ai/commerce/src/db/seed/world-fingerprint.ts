/**
 * A hash of the generated world, so a shifted random stream cannot pass quietly.
 *
 * WHAT IT PROTECTS. Once eval baselines exist, they are numbers measured
 * against THIS estate. If the estate moves — different order ids, different
 * dates, a trap that landed on a different stop — those numbers describe a
 * world that no longer exists, and the first symptom is an eval going red for a
 * reason nobody can explain.
 *
 * WHY A SHIFT IS LESS LIKELY HERE THAN IN PHARMA, AND WHY THIS STILL EXISTS.
 * Pharma's builders share one `Helpers`, so a new generator that draws a single
 * number shifts every value produced after it; that is what
 * `apps/ai/pharma/src/db/seed/world-fingerprint.ts` was written to catch. Here
 * each builder has its OWN stream (`STREAM` in rng.ts), so a sixth builder
 * cannot disturb the five that exist. What this still catches is a builder that
 * changes ITS OWN output — reordering a draw, adding a `chance()`, editing a
 * literal — which is the ordinary way an estate drifts and is invisible in a
 * diff of row counts.
 *
 * PER TABLE AND NOT JUST OVERALL, deliberately. One hash says something
 * changed; it cannot say whether a new table appeared (fine) or four existing
 * ones moved (not fine). Those need opposite responses and a bare "changed"
 * cannot tell them apart.
 *
 * OFFLINE AND FREE. `buildWorld()` is pure, so this runs without a database.
 */
import { createHash } from 'node:crypto';
import { buildWorld } from './world';
import { SEED } from './rng';
import type { Estate } from '../schema/rows';

/** The five systems, by the key they carry on the estate object. */
const SYSTEM_KEYS: (keyof Estate)[] = ['shop', 'wms', 'fleet', 'crm', 'policy'];

/**
 * Stable JSON: keys sorted at every level.
 *
 * Without this the hash changes when somebody reorders a field in an object
 * literal — a diff with no effect on a single value, reported as though the
 * whole world had moved. A check that cries wolf is a check that gets deleted.
 */
export function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
}

export interface TableFingerprint {
  system: string;
  table: string;
  rows: number;
  sha: string;
}

export interface WorldFingerprint {
  seed: number;
  tables: TableFingerprint[];
  /** Hash of all of the above. The single number worth comparing. */
  sha: string;
}

export function fingerprintEstate(world: Estate): WorldFingerprint {
  const tables: TableFingerprint[] = [];

  for (const key of SYSTEM_KEYS) {
    const system = world[key] as unknown as Record<string, unknown[]>;
    for (const table of Object.keys(system).sort()) {
      const rows = system[table];
      if (!Array.isArray(rows)) continue;
      tables.push({
        system: key,
        table,
        rows: rows.length,
        sha: createHash('sha256').update(stable(rows)).digest('hex').slice(0, 16),
      });
    }
  }

  const sha = createHash('sha256')
    .update(tables.map((t) => `${t.system}.${t.table}:${t.rows}:${t.sha}`).join('\n'))
    .digest('hex')
    .slice(0, 16);

  return { seed: SEED, tables, sha };
}

/** Fingerprint the world this seed produces. The same pipeline `db:seed` runs. */
export function fingerprintWorld(): WorldFingerprint {
  return fingerprintEstate(buildWorld());
}
