/**
 * Equipment qualification records — generated AFTER the main world, on purpose.
 *
 * It has to know which equipment exists AND which anchor is the expired one, so
 * it cannot run inside `buildWorld()`.
 *
 * IT DRAWS NO RANDOM NUMBERS. Every date below is a literal — the original
 * destructured `int` off the shared stream and never used it. That is what makes
 * this safe to call from `world-fingerprint.ts` as well as from `db:seed`: both
 * produce the same rows and neither disturbs the stream.
 *
 * EXTRACTED FROM `seed.ts` 2026-09-12, and the reason is worth recording. This
 * was the ONE table populated after `buildOperations`, so the world fingerprint
 * saw it as empty and could not have detected a change to it. A guard with a
 * hole in it is worse than no guard, because the hole is invisible from the
 * green tick.
 */
import { ANCHORS, type MasterWorld } from './world';

export function buildEquipmentQualification(world: MasterWorld): MasterWorld {
  const { mes } = world;
  const engineer = world.byPos('POS-ENG')[0];
  for (const eq of mes.equipment) {
    const lapses = eq.equipment_id === ANCHORS.unqualifiedEquipment;
    mes.equipment_qualification.push({
      equipment_id: eq.equipment_id, kind: 'IQ', performed_on: '2022-05-10',
      valid_until: '2032-05-09', status: 'passed', performed_by_ref: engineer,
    });
    if (!lapses) {
      // Coverage starts BEFORE the earliest campaign in the world (2024-02).
      // The first version randomised performed_on into 2024–2025, which left
      // every early run sitting outside its own equipment's qualification
      // window — a finding on dozens of lots that nobody planted and nobody
      // wanted. Equipment that has been qualified since before the data starts
      // is both realistic and the only way T3 stays the only one of its kind.
      mes.equipment_qualification.push({
        equipment_id: eq.equipment_id, kind: 'PQ', performed_on: '2022-06-01',
        valid_until: '2027-12-31', status: 'passed', performed_by_ref: engineer,
      });
      continue;
    }
    // T3 — A LAPSE WITH A START AND AN END, not an open-ended one.
    //
    // The first version simply let EQ-0112's qualification expire and never
    // renewed it. EQ-0112 is the granulator on LINE-01-T1, so EVERY later run
    // on that line — including the acceptance case's own lot — inherited the
    // finding, and T1's story stopped being "one procedural defect" and became
    // "this whole line is unqualified". A trap that contaminates its
    // neighbours is not a trap, it is a bug in the corpus.
    //
    // So: qualification runs out 2026-06-30, the gap swallows WO-26-0389 on
    // 2026-07-13, and requalification on 2026-07-20 closes it again before
    // WO-26-0417 runs in August. Which means the question is not "is this
    // equipment qualified" but "was it qualified ON THE DAY" — the same as-of
    // rule the SOP revisions live by, applied to a machine.
    // A CHAIN with exactly one hole in it. Two consecutive qualifications carry
    // EQ-0112 from before the data starts up to 2026-06-30; the next one does
    // not land until 2026-07-20. Three weeks uncovered, and one run inside it.
    mes.equipment_qualification.push({
      equipment_id: eq.equipment_id, kind: 'PQ', performed_on: '2022-06-01',
      valid_until: '2024-06-14', status: 'passed', performed_by_ref: engineer,
    });
    mes.equipment_qualification.push({
      equipment_id: eq.equipment_id, kind: 'PQ', performed_on: '2024-06-15',
      valid_until: ANCHORS.equipmentValidUntil, status: 'passed', performed_by_ref: engineer,
    });
    mes.equipment_qualification.push({
      equipment_id: eq.equipment_id, kind: 'requalification', performed_on: '2026-07-20',
      valid_until: '2028-07-19', status: 'passed', performed_by_ref: engineer,
    });
  }

  return world;
}
