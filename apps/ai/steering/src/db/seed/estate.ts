/**
 * The whole estate, in memory, from five independent random streams.
 *
 * BUILD ORDER IS A DEPENDENCY ORDER, not a preference. Each generator reads the
 * output of the ones before it — hardware needs programmes to ship parts on,
 * requirements need programmes to belong to, effort needs change requests to
 * have been raised. It is the same order `SYSTEMS` seeds in, so a partial load
 * leaves soft keys dangling in one direction only.
 *
 * READING ANOTHER GENERATOR'S OUTPUT IS SAFE. DRAWING FROM ITS STREAM IS NOT.
 * That distinction is the entire lesson `rng.ts` records: `buildHardware` may
 * look at every programme it likes, and must never touch `programs.ts`'s
 * helpers. Each generator makes its own from its own seed, so adding a sixth
 * tomorrow shifts nothing that exists today.
 *
 * ONE DELIBERATE MUTATION: `buildEffort` back-fills `effort_ref` on the change
 * requests it books hours against, so the soft key resolves in both directions.
 * It draws nothing random to do it — the id was already decided — so it cannot
 * shift anything.
 */
import { buildPrograms } from './programs';
import { buildHardware } from './hardware';
import { buildRequirements } from './requirements';
import { buildEffort } from './effort';
import type { Estate } from '../schema/rows';

export { ANCHORS } from './anchors';
export { buildCorpus, type CorpusFile } from './corpus';

export function buildEstate(): Estate {
  const crm = buildPrograms();
  const plm = buildHardware(crm);
  const alm = buildRequirements(crm);
  const pmo = buildEffort(crm, alm);
  return { crm, plm, alm, pmo };
}

/** Every table, as `[system, table, rows]`. Used by the fingerprint and by reports. */
export function tablesOf(estate: Estate): [string, string, Record<string, unknown>[]][] {
  const out: [string, string, Record<string, unknown>[]][] = [];
  for (const system of Object.keys(estate) as (keyof Estate)[]) {
    const bucket = estate[system] as unknown as Record<string, Record<string, unknown>[]>;
    for (const table of Object.keys(bucket).sort()) {
      out.push([system, table, bucket[table]]);
    }
  }
  return out;
}
