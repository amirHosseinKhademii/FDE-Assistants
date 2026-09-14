/**
 * The laboratory audit trail — INFRASTRUCTURE ONLY, added 2026-09-12.
 *
 * Nothing reads this yet. It exists so two candidates have somewhere to land:
 * the audit-trail / data-integrity hunt (`BOTTLENECK-2.md` §5) and LoRA
 * finetuning, whose stated blocker was that "the lab event log does not exist,
 * and that table IS the feature".
 *
 * ══ WHY THE FINISHED RESULT CANNOT ANSWER THE QUESTION ════════════════════
 *
 * `qc_tests` holds the number that was reported. It cannot say how many times
 * the sample was injected before that number appeared, whether a chromatogram
 * was re-integrated by hand, or whether a run was aborted and quietly deleted.
 *
 * A test that passed on the fourth injection after two were discarded is
 * INDISTINGUISHABLE from a clean first-time pass in `qc_tests`, and completely
 * distinguishable here. "Did anyone re-run a test until it passed?" is the
 * question a regulator asks, and it is answerable only from the sequence.
 *
 * ══ THE SHAPE OF THE JUDGEMENT, WHICH IS WHY LoRA WAS POINTED AT IT ═══════
 *
 * Scoring one event sequence for "does this look like testing into compliance"
 * is a narrow, repeated call over thousands of rows — the shape a small tuned
 * model suits and a frontier model is expensive for. THAT REMAINS A CLAIM. The
 * honest baseline is a good prompt on the same rows, and a finetune that does
 * not beat it is a finding rather than a failure.
 *
 * ══ ITS OWN RANDOM STREAM ═════════════════════════════════════════════════
 *
 * `makeHelpers(LAB_EVENTS_SEED)` and the world taken READ-ONLY. One draw from
 * the shared stream moves 17 tables — measured, not feared. `pnpm
 * pharma:world-check` is what enforces this; `h` is on `MasterWorld` and
 * destructuring it is the easy mistake.
 *
 * FABRICATED. No real analyst, instrument or result is described.
 */
import { makeHelpers, ts, pad } from './rng';
import { ANCHORS, type MasterWorld } from './world';

/** Different again from the world's `20260911` and complaints' `20260912`. */
export const LAB_EVENTS_SEED = 20260913;

interface LabEvent {
  event_id: string;
  test_ref: string;
  event_seq: number;
  occurred_at: string;
  performed_by_ref: string;
  action: string;
  result_num: number | null;
  unit: string | null;
  reason: string | null;
  supersedes_event_ref: string | null;
  instrument_ref: string | null;
}

/**
 * How many tests get a trail. NOT all 473.
 *
 * A real LIMS records every injection of every test and would run to tens of
 * thousands of rows. This is sized to be READ — enough sequences to contain a
 * few worth finding, few enough that somebody can look at all of them while
 * deciding what a detector should even look for. Grow it when something
 * actually scores them.
 */
const TESTS_WITH_TRAILS = 60;

/** Reasons an analyst actually types, and the empty one that matters most. */
const REPROCESS_REASONS = [
  'Integration parameters adjusted per method; baseline drift at peak start.',
  'Manual integration applied — shoulder on the main peak.',
  'Re-integrated with updated baseline after review by supervisor.',
  'Peak width parameter corrected to method value.',
];

export function buildLabEvents(world: MasterWorld): MasterWorld {
  const h = makeHelpers(LAB_EVENTS_SEED);
  const { int, pick, chance } = h;

  const tests = world.qms.qc_tests;
  const analysts = world.byPos('POS-QCA').length ? world.byPos('POS-QCA') : world.allEmployees;
  const supervisors = world.byPos('POS-QCS').length ? world.byPos('POS-QCS') : analysts;
  const instruments = world.mes.equipment.map((e: any) => e.equipment_id);

  const out: LabEvent[] = [];
  let n = 0;
  const id = (): string => pad('LEV-', ++n, 6);

  // Deterministic pick of which tests get a trail: every Nth, so the selection
  // does not move when the count changes and does not draw from the stream.
  const step = Math.max(1, Math.floor(tests.length / TESTS_WITH_TRAILS));
  const chosen = tests.filter((_: any, i: number) => i % step === 0).slice(0, TESTS_WITH_TRAILS);

  for (const t of chosen) {
    const analyst = pick(analysts);
    const instrument = instruments.length ? pick(instruments) : null;
    const base = new Date(`${String(t.tested_on).slice(0, 10)}T08:00:00Z`);
    let seq = 0;
    let at = base;

    const push = (e: Partial<LabEvent> & { action: string }): LabEvent => {
      at = new Date(at.getTime() + int(4, 40) * 60000);
      const row: LabEvent = {
        event_id: id(),
        test_ref: t.test_id,
        event_seq: ++seq,
        occurred_at: ts(at),
        performed_by_ref: analyst,
        action: e.action,
        result_num: e.result_num ?? null,
        unit: e.result_num != null ? (t.unit ?? null) : null,
        reason: e.reason ?? null,
        supersedes_event_ref: e.supersedes_event_ref ?? null,
        instrument_ref: instrument,
      };
      out.push(row);
      return row;
    };

    // Every trail opens the same way a real one does.
    push({ action: 'system_suitability', reason: 'Five replicate injections, RSD within method limit.' });

    const reported = Number(t.result_num);

    // ── THE ORDINARY CASE: one acquisition, one approval ──────────────────
    //
    // Most tests are boring, and the corpus has to say so. A table where every
    // sequence is suspicious teaches a detector that suspicion is the baseline,
    // and then it finds nothing because everything looks the same.
    const messy = chance(0.28);

    if (!messy) {
      push({ action: 'acquisition', result_num: reported });
      push({ action: 'approve', performed_by_ref: pick(supervisors) } as any);
      continue;
    }

    // ── A MESSY BUT LEGITIMATE SEQUENCE ───────────────────────────────────
    //
    // Re-integration WITH a stated reason, reviewed. This is what a clean audit
    // trail looks like when something genuinely went wrong with the
    // chromatography — and a detector that flags it has learned the wrong rule.
    const first = push({
      action: 'acquisition',
      result_num: Number((reported * (1 + (int(-25, 25) / 1000))).toFixed(4)),
    });
    push({
      action: 'reintegrate',
      result_num: reported,
      reason: pick(REPROCESS_REASONS),
      supersedes_event_ref: first.event_id,
    });
    push({ action: 'approve' });
  }

  // ── THE ANCHORED SEQUENCE, so a later capability has something to find ───
  //
  // Tied to the lot whose OOS was retested to a pass with NO investigation —
  // T7, the trap the estate already carries. Anchored rather than random,
  // because a finding that moves with the seed is one nobody can write a test
  // against.
  //
  // WHAT MAKES IT A FINDING, and none of these alone would:
  //   three acquisitions, the first two ABORTED with no reason given
  //   the aborted runs DELETED
  //   the passing third run approved by the same person who ran it
  //
  // Each of those has an innocent explanation. Together they are the pattern a
  // data-integrity review exists to catch, and a model has to weigh them rather
  // than match one.
  const t7 = tests.find((x: any) => x.lot_ref === ANCHORS.oosLot) ?? tests[0];
  if (t7) {
    const analyst = analysts[0];
    let seq = 0;
    let at = new Date(`${String(t7.tested_on).slice(0, 10)}T09:00:00Z`);
    const ev = (action: string, extra: Partial<LabEvent> = {}): LabEvent => {
      at = new Date(at.getTime() + 25 * 60000);
      const row: LabEvent = {
        event_id: id(),
        test_ref: t7.test_id,
        event_seq: ++seq,
        occurred_at: ts(at),
        performed_by_ref: analyst,
        action,
        result_num: null,
        unit: null,
        reason: null,
        supersedes_event_ref: null,
        instrument_ref: instruments[0] ?? null,
        ...extra,
      };
      out.push(row);
      return row;
    };

    ev('system_suitability', { reason: 'Five replicate injections, RSD within method limit.' });
    const a1 = ev('acquisition', { result_num: 71.4, unit: t7.unit ?? '%' });
    ev('abort', {});                                   // no reason given
    ev('delete', { supersedes_event_ref: a1.event_id }); // and the run removed
    const a2 = ev('acquisition', { result_num: 74.9, unit: t7.unit ?? '%' });
    ev('abort', {});
    ev('delete', { supersedes_event_ref: a2.event_id });
    ev('acquisition', { result_num: 88.6, unit: t7.unit ?? '%' });
    ev('approve', {});                                 // same analyst approves their own
  }

  world.qms.lab_events = out;
  return world;
}

/**
 * NO DETECTOR IS WRITTEN HERE, and no labels either.
 *
 * The LoRA candidate needs labelled examples, and the honest way to produce
 * them is from this generator — which knows which sequences it made suspicious
 * — rather than by hand. That labelling belongs with the capability, not with
 * the table: labels written now would encode today's guess at what "looks like
 * testing into compliance" means, and the first real attempt would inherit it
 * without ever questioning it.
 */
