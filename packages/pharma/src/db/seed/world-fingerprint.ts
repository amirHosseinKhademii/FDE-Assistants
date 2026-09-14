/**
 * A hash of the generated world, so a shifted random stream cannot pass quietly.
 *
 * THE PROBLEM THIS EXISTS FOR. The whole estate comes off ONE seeded stream:
 * `buildWorld()` makes a single `makeHelpers(SEED)` and `buildOperations()`
 * destructures the very same `h` and keeps drawing from it. So a new generator
 * that draws even one number from that stream shifts EVERY value produced after
 * it — different lot codes, different dates, different test results. The
 * acceptance case stops being the acceptance case.
 *
 * `NEXT.md` already warns about this ("Adding GB data would shift the seed's
 * random stream and invalidate committed eval numbers"). Until now that warning
 * was ADVISORY: nothing detected the shift, so the first sign would have been
 * an eval going red for a reason nobody could explain. This makes it
 * enforceable.
 *
 * Same idea as `@fde/grounding`'s `fingerprintDocuments`, which is why the
 * corpus can be regenerated without fear. Same rule, different data.
 *
 * OFFLINE AND FREE. `buildWorld`/`buildOperations` are pure — no database is
 * touched, so this can run in the same breath as a typecheck.
 *
 * HOW TO ADD DATA WITHOUT TRIPPING IT: give the new generator its OWN
 * `makeHelpers(someOtherSeed)`. A separate stream cannot disturb this one.
 * Taking `h` off the world object is the mistake this check is here to catch,
 * and it is an easy one to make because `h` is right there in `MasterWorld`.
 */
import { createHash } from 'node:crypto';
import { buildWorld } from './world';
import { buildOperations } from './operations';
import { buildEquipmentQualification } from './equipment-qualification';
import { buildComplaints } from './complaints';
import { buildLabEvents } from './lab-events';

/** The six record systems, by the key they carry on the world object. */
const SYSTEM_KEYS = ['reg', 'hcm', 'erp', 'mes', 'qms', 'tms'] as const;

/**
 * Stable JSON: keys sorted at every level.
 *
 * Without this the hash would change when somebody reorders a field in an
 * object literal — a diff with no effect on a single value, reported as though
 * the whole world had moved. A check that cries wolf is a check that gets
 * deleted.
 */
function stable(v: unknown): string {
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
  /** One line per table, so a drift report can name WHICH table moved. */
  tables: TableFingerprint[];
  /** Hash of all of the above. The single number worth comparing. */
  sha: string;
}

/**
 * Fingerprint the world this seed produces.
 *
 * PER TABLE AND NOT JUST OVERALL, deliberately. A single hash tells you
 * something changed; it does not tell you whether one table gained rows (fine,
 * if it is a new one) or every table downstream of a new draw shifted (not
 * fine). Those two need opposite responses, and a bare "changed" cannot tell
 * them apart.
 */
export function fingerprintWorld(): WorldFingerprint {
  // The SAME pipeline `db:seed` runs, in the same order. A fingerprint of a
  // different pipeline is a fingerprint of something nobody ships.
  const world = buildLabEvents(buildComplaints(buildEquipmentQualification(buildOperations(buildWorld()))));
  const tables: TableFingerprint[] = [];

  for (const key of SYSTEM_KEYS) {
    const system = (world as any)[key] as Record<string, unknown[]>;
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

  return { seed: (world as any).SEED ?? 0, tables, sha };
}
