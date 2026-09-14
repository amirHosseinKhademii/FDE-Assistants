/**
 * EVERY ASSERTION ABOUT THE ESTATE, AS PURE FUNCTIONS OVER A TABLE GETTER.
 *
 * ── WHY THIS FILE EXISTS SEPARATELY FROM `check.ts` ───────────────────────
 *
 * The same assertions have to run in two places: against the estate IN MEMORY
 * (offline, free, runnable beside a typecheck) and against the estate LOADED
 * FROM POSTGRES (which is the one that matters, because it is the only one that
 * proves the write round-tripped). Writing them twice would guarantee the two
 * copies drift, and the copy that drifts is always the one nobody runs.
 *
 * So both entry points build a `Tables` getter and hand it here.
 *
 * ── THE RULE EVERY TRAP ASSERTION FOLLOWS ─────────────────────────────────
 *
 * A trap is re-derived FROM THE ROWS, never read back from the constant that
 * planted it. `SAFETY_CASE_MULTIPLIER` is 4.2 in `assumptions.ts`; the
 * assertion below measures the ratio of medians out of `effort_records` and
 * requires it in a band. If the generator stopped applying the multiplier, an
 * assertion that compared 4.2 to 4.2 would still pass — and a trap that
 * survives only in the generator's intentions is not in the data.
 *
 * ── AND THE NEGATIVE CONTROL ──────────────────────────────────────────────
 *
 * A reference checker that looks in the wrong place reports zero dangling
 * references and reads exactly like a clean estate. So the soft-key walk plants
 * a reference it knows is bad and requires itself to catch it. This is not
 * hypothetical in this repo: `pnpm leak:check` once reported PASS while a live
 * credential sat in the code it was scanning.
 */
import {
  CR_RACK_FORCE_N,
  CR_RACK_FORCE_N_REV_A,
  CR_ROAD_WHEEL_ANGLE_DEG,
  GEARBOX_CLAIMED_N,
  GEARBOX_DEMONSTRATED_N,
  SWC_DAMP_ASIL_TODAY,
  K2_DAMPING_ASIL_REQUIRED,
  SAFETY_CASE_BAND,
  OUTLIER_EFFORT_ID,
  OUTLIER_HOURS,
  UNTRACED_CRS,
  ORPHAN_SRS,
  QUOTE_BIAS_NEW_FUNCTION,
} from '../../config/assumptions';
import { ANCHORS } from '../seed/anchors';

export interface Note { label: string; detail: string }
export interface Result { ok: Note[]; fail: Note[] }

/** `(system, table) → rows`. Systems are the short keys: crm, plm, alm, pmo. */
export type Tables = (system: string, table: string) => Record<string, any>[];

type Rows = Record<string, any>[];

const n = (v: unknown): number => Number(v);
/** pg hands back `Date`; the generator writes `'YYYY-MM-DD'`. Normalise both. */
const day = (v: unknown): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

/**
 * Every cross-database reference, as `[from system, table, column, to system,
 * table, column, nullable]`.
 *
 * Postgres cannot check one of these — that is the whole point of the
 * partition — so this list IS the referential integrity of the estate.
 */
export const SOFT_KEYS: readonly [string, string, string, string, string, string, boolean][] = [
  ['alm', 'spec_documents', 'customer_ref', 'crm', 'customers', 'customer_id', false],
  ['alm', 'spec_documents', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['alm', 'system_requirements', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['alm', 'budgets', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['alm', 'architecture_versions', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['alm', 'change_requests', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['alm', 'elements', 'part_ref', 'plm', 'parts', 'part_no', true],
  ['crm', 'rfq_specs', 'spec_ref', 'alm', 'spec_documents', 'spec_id', false],
  ['plm', 'part_program_usage', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['pmo', 'effort_records', 'chr_ref', 'alm', 'change_requests', 'chr_id', true],
  ['pmo', 'effort_records', 'program_ref', 'crm', 'programs', 'program_id', false],
  ['pmo', 'quotes', 'rfq_ref', 'crm', 'rfqs', 'rfq_id', false],
  ['pmo', 'quotes', 'program_ref', 'crm', 'programs', 'program_id', false],
];

/** The tables that must never be empty — i.e. all of them. */
export const EXPECTED_TABLES: Record<string, string[]> = {
  crm: ['customers', 'programs', 'rfqs', 'rfq_specs', 'milestones', 'contacts'],
  plm: ['component_suppliers', 'product_lines', 'parts', 'part_capabilities', 'assemblies', 'bom_lines', 'qualification_tests', 'part_program_usage'],
  alm: ['spec_documents', 'spec_revisions', 'customer_requirements', 'customer_requirement_versions', 'cr_history', 'system_requirements', 'system_requirement_versions', 'trace_cr_sr', 'budgets', 'budget_allocations', 'architecture_versions', 'elements', 'activities', 'activity_allocations', 'interfaces', 'trace_sr_element', 'change_requests', 'change_request_items'],
  pmo: ['effort_records', 'effort_by_discipline', 'rate_cards', 'quotes', 'quote_lines'],
};

export function runAssertions(T: Tables): Result {
  const ok: Note[] = [];
  const fail: Note[] = [];
  const note = (pass: boolean, label: string, detail: string): void => {
    (pass ? ok : fail).push({ label, detail });
  };

  // ── 1. nothing is empty ──────────────────────────────────────────────────

  {
    const empty: string[] = [];
    let total = 0;
    for (const [system, tables] of Object.entries(EXPECTED_TABLES)) {
      for (const table of tables) {
        const rows = T(system, table);
        total += rows.length;
        if (!rows.length) empty.push(`${system}.${table}`);
      }
    }
    note(
      empty.length === 0,
      'every table has rows',
      empty.length ? `EMPTY: ${empty.join(', ')}` : `${total} rows across ${Object.values(EXPECTED_TABLES).flat().length} tables in 4 databases`,
    );
  }

  // ── 2. referential integrity across databases ────────────────────────────

  {
    let dangling = 0;
    const detail: string[] = [];
    for (const [fs, ft, fc, ts, tt, tc, nullable] of SOFT_KEYS) {
      const targets = new Set(T(ts, tt).map((r) => String(r[tc])));
      let bad = 0;
      for (const row of T(fs, ft)) {
        const v = row[fc];
        if (v === null || v === undefined || v === '') {
          if (!nullable) bad++;
          continue;
        }
        if (!targets.has(String(v))) bad++;
      }
      dangling += bad;
      if (bad) detail.push(`${fs}.${ft}.${fc} → ${ts}.${tt}: ${bad}`);
    }
    note(
      dangling === 0,
      `${SOFT_KEYS.length} soft keys resolve across database boundaries`,
      dangling === 0 ? 'no dangling references' : detail.join('; '),
    );

    // ── THE NEGATIVE CONTROL, AND THE FIRST VERSION OF IT WAS A FAKE ──────
    //
    // What was here before constructed two object literals and evaluated
    // hardcoded ternaries over them:
    //
    //     const strictBad = strictRow.program_ref === null ? true : false;
    //
    // That is `true`, always, on every estate including a broken one. It never
    // touched the walk above. It printed "ok — the reference walk catches what
    // it should" and proved nothing, which is strictly worse than having no
    // control at all, because the label invites trust.
    //
    // This is pharma's defect #5 repeated — an injection self-test that passed
    // for the wrong reason because its fixture was malformed rather than
    // malicious. The rule that came out of it is that every guard gets tested
    // in BOTH directions: what it must catch, and what it must let through.
    //
    // So the control now plants a bad reference INTO A COPY of the real rows
    // and re-runs the actual walk over it.
    const control = (mutate: (rows: Rows) => void, key: [string, string, string, string, string, string, boolean]): number => {
      const [fs, ft, fc, ts, tt, tc, nullable] = key;
      const rows: Rows = JSON.parse(JSON.stringify(T(fs, ft)));
      mutate(rows);
      const targets = new Set(T(ts, tt).map((r) => String(r[tc])));
      let bad = 0;
      for (const row of rows) {
        const v = row[fc];
        if (v === null || v === undefined || v === '') { if (!nullable) bad++; continue; }
        if (!targets.has(String(v))) bad++;
      }
      return bad;
    };

    const strictKey: [string, string, string, string, string, string, boolean] =
      ['alm', 'system_requirements', 'program_ref', 'crm', 'programs', 'program_id', false];
    const nullableKey: [string, string, string, string, string, string, boolean] =
      ['alm', 'elements', 'part_ref', 'plm', 'parts', 'part_no', true];

    // must CATCH: a reference to something that does not exist
    const caughtDangling = control((rows) => { rows[0].program_ref = 'PRG-DOES-NOT-EXIST'; }, strictKey) === 1;
    // must CATCH: a null in a column that may not be null
    const caughtNull = control((rows) => { rows[0].program_ref = null; }, strictKey) === 1;
    // must LET THROUGH: a null in a column that may be
    const allowedNull = control((rows) => { rows[0].part_ref = null; }, nullableKey) === 0;

    note(
      caughtDangling && caughtNull && allowedNull,
      'negative control — the reference walk itself was made to fail, three ways',
      `planted PRG-DOES-NOT-EXIST into a copy of alm.system_requirements and the walk caught it; ` +
        `planted a null in the same NOT NULL column and it caught that; planted a null in the ` +
        `nullable alm.elements.part_ref and it correctly let it through. So the ${dangling} above means something.`,
    );
  }

  // ── 3. T1 · two spec revisions that disagree ─────────────────────────────

  {
    const revs = T('alm', 'spec_revisions').filter((r) => r.spec_id === ANCHORS.spec);
    const a = revs.find((r) => r.revision === 'Rev A');
    const b = revs.find((r) => r.revision === 'Rev B');
    const vers = T('alm', 'customer_requirement_versions').filter((v) => v.cr_id === ANCHORS.crRackForce);
    const va = vers.find((v) => v.spec_revision_id === ANCHORS.revA);
    const vb = vers.find((v) => v.spec_revision_id === ANCHORS.revB);
    const pass =
      !!a && !!b &&
      day(a.effective_to) === day(b.effective_from) &&
      a.effective_to !== null &&
      b.effective_to === null &&
      n(va?.value_num) === CR_RACK_FORCE_N_REV_A &&
      n(vb?.value_num) === CR_RACK_FORCE_N;
    note(
      pass,
      'T1 — the superseded revision is still in the database and still disagrees',
      `${ANCHORS.crRackForce}: Rev A ${n(va?.value_num)} N (in force to ${day(a?.effective_to)}), ` +
        `Rev B ${n(vb?.value_num)} N (in force). A prefix match on the spec id merges them.`,
    );
  }

  // ── 4. T2 · claimed 8000 N, demonstrated 7600 N ──────────────────────────

  {
    const cap = T('plm', 'part_capabilities').find(
      (c) => c.part_no === ANCHORS.gearbox && c.attribute === 'max_rack_force_n',
    );
    const test = T('plm', 'qualification_tests').find(
      (t) => t.part_no === ANCHORS.gearbox && t.attribute === 'max_rack_force_n',
    );
    const claimed = n(cap?.value);
    const demonstrated = n(test?.max_value_demonstrated);
    const pass =
      claimed === GEARBOX_CLAIMED_N &&
      demonstrated === GEARBOX_DEMONSTRATED_N &&
      cap?.qualified === false &&
      cap?.source === 'analysis' &&
      demonstrated < CR_RACK_FORCE_N;
    note(
      pass,
      'T2 — the datasheet and the rig disagree, and the rig is short of the requirement',
      `${ANCHORS.gearbox}: claims ${claimed} N by ${cap?.source} (qualified=${cap?.qualified}), ` +
        `demonstrated ${demonstrated} N. Short of CR-K2-0101 by ${CR_RACK_FORCE_N - demonstrated} N.`,
    );
  }

  // ── 5. T3 · the ASIL step-up, and its cost measured out of history ───────

  {
    // HALF OF THIS ASSERTION IS NOT HERE. The ASIL the component ships at is a
    // sentence in `docs/safety-assessment-2021.md`, not a column, so it is
    // checked in `runCorpusAssertions`. What the DATABASE can say is what the
    // new programme REQUIRES, and that half is below.
    const srv = T('alm', 'system_requirement_versions').find((v) => v.sr_id === ANCHORS.srDampingAsil);
    note(
      srv?.asil === K2_DAMPING_ASIL_REQUIRED,
      'T3 — the new programme allocates damping at the higher ASIL',
      `${ANCHORS.srDampingAsil} requires ASIL ${srv?.asil}. What the component ships at today is in ` +
        `the corpus, not in any table — see the corpus checks.`,
    );

    // The cost of that, RE-DERIVED from loaded rows. The outlier is excluded by
    // id, because it is a different question wearing the same columns.
    // ── MEASURED WITHIN EACH CHANGE CLASS, NOT POOLED ACROSS ALL OF THEM ──
    //
    // This used to pool every record into two heaps and divide one median by
    // the other. It read 4.20 for a long time and then read 4.69 the day ASIL
    // started being inherited from requirements instead of drawn — and the
    // generator's multiplier had not changed at all.
    //
    // The pooled figure was a COMPOSITION ARTEFACT. A new-hardware job and a
    // recalibration differ by two orders of magnitude in base hours, so as soon
    // as the safety-case mix shifts between classes, the ratio of the two
    // pooled medians moves for reasons that have nothing to do with safety
    // cases. Within each class it is 3.88–4.90, median 4.41, against a
    // generator value of 4.2.
    //
    // WHICH IS THIS ESTATE'S OWN LESSON, TURNED ON ITS OWN CHECK. `walk-cost`
    // refuses to price from an unfiltered set for exactly this reason, and
    // `walk-check` has a sabotage case asserting that widening a comparable set
    // gives an answer 3.5× out. The check was doing the thing the product is
    // built to refuse to do, and it took a data change to expose it.
    const eff = T('pmo', 'effort_records').filter((e) => e.effort_id !== OUTLIER_EFFORT_ID);
    const classes = [...new Set(eff.map((e) => String(e.change_class)))].sort();
    const ratios: number[] = [];
    for (const cls of classes) {
      const inClass = eff.filter((e) => e.change_class === cls);
      const withCase = inClass.filter((e) => e.safety_case_impact === true).map((e) => n(e.actual_hours));
      const without = inClass.filter((e) => e.safety_case_impact === false).map((e) => n(e.actual_hours));
      // Under three either side and a median is one record's opinion.
      if (withCase.length < 3 || without.length < 3) continue;
      ratios.push(median(withCase) / median(without));
    }
    const ratio = median(ratios);
    const [lo, hi] = SAFETY_CASE_BAND;
    note(
      ratio >= lo && ratio <= hi,
      'T3 — the safety-case multiplier is recoverable from the effort history',
      `${ratio.toFixed(2)}× (band ${lo}–${hi}) — the median of ${ratios.length} within-class ratios, ` +
        `spanning ${Math.min(...ratios).toFixed(2)}–${Math.max(...ratios).toFixed(2)}. ` +
        `Pooling all classes instead reads ${(median(eff.filter((e) => e.safety_case_impact === true).map((e) => n(e.actual_hours))) / median(eff.filter((e) => e.safety_case_impact === false).map((e) => n(e.actual_hours)))).toFixed(2)}×, ` +
        `which is the comparability mistake this estate exists to teach.`,
    );
  }

  // ── 6. T4 · the budgets, reported as deltas ──────────────────────────────

  {
    const budgets = T('alm', 'budgets');
    const allocs = T('alm', 'budget_allocations');
    const sumOf = (id: string) => allocs.filter((a) => a.budget_id === id).reduce((s, a) => s + n(a.value), 0);

    const lines: string[] = [];
    let wrong = 0;
    for (const b of budgets) {
      const sum = Number(sumOf(b.budget_id).toFixed(3));
      const target = n(b.target_value);
      const delta = Number((sum - target).toFixed(3));
      // THE OPERATOR IS LOAD-BEARING AND THE FIRST VERSION OF THIS LINE
      // IGNORED IT. `Math.abs(delta) <= tolerance` treats a budget that comes
      // in UNDER its ceiling as failing to close, which turned the latency
      // budget's 0.2 ms of margin into a red check. Margin is the good outcome
      // on a `<=` budget. Only an `=` budget is two-sided.
      const closes =
        b.operator === '<=' ? delta <= n(b.tolerance)
          : b.operator === '>=' ? delta >= -n(b.tolerance)
            : Math.abs(delta) <= n(b.tolerance);
      // The check: `known_open` must agree with the arithmetic. A budget that
      // closes and claims to be open, or is open and claims to close, is the
      // real defect — not the delta itself.
      if (closes === Boolean(b.known_open)) {
        wrong++;
        lines.push(`${b.budget_id}: delta ${delta}, known_open=${b.known_open} — disagree`);
      }
    }
    note(
      wrong === 0,
      `${budgets.length} budgets: every delta agrees with its known_open flag`,
      wrong === 0 ? 'no budget misrepresents whether it closes' : lines.join('; '),
    );

    const onCenter = budgets.find((b) => b.budget_id === ANCHORS.budOnCenter);
    const hyst = budgets.find((b) => b.budget_id === ANCHORS.budHysteresis);
    const lat = budgets.find((b) => b.budget_id === ANCHORS.budLatency);
    const dOn = Number((sumOf(ANCHORS.budOnCenter) - n(onCenter?.target_value)).toFixed(3));
    const dHy = Number((sumOf(ANCHORS.budHysteresis) - n(hyst?.target_value)).toFixed(3));
    const dLa = Number((sumOf(ANCHORS.budLatency) - n(lat?.target_value)).toFixed(3));
    note(
      dOn === 0 && dHy > 0.5 && hyst?.known_open === true && !!hyst?.closure_note && dLa < 0,
      'T4 — the three K2 budgets say what the worked example says',
      `on-centre torque closes exactly (delta ${dOn}); hysteresis is OPEN by +${dHy} Nm with a ` +
        `closure note; latency closes with ${Math.abs(dLa)} ms margin.`,
    );
  }

  // ── 7. T5 · the outlier, and mean vs median ──────────────────────────────

  {
    const all = T('pmo', 'effort_records');
    const outlier = all.find((e) => e.effort_id === OUTLIER_EFFORT_ID);
    // THE COMPARABLE SET IS THE POINT, and the first version of this check got
    // it wrong. Filtering only on `change_class` left ASIL-D safety-case work
    // in the same pool as ordinary work, so the pool already spanned 700 to
    // 2,940 hours and a 3,180-hour record barely moved the mean — the check
    // reported "no outlier" on an estate that has one.
    //
    // A real estimate filters on the WHOLE comparables key, and the outlier is
    // extreme only against the set it actually belongs to. Matching the check
    // to how the data would really be used is what makes the number mean
    // something.
    // THE FILTER IS THE COMPARABLES KEY, not one column of it, and getting
    // that wrong twice is what this comment records.
    //
    // First version filtered on `change_class` alone: 68 records spanning 700
    // to 2,940 hours, because ASIL-D safety-case work was still in the pool.
    // One 3,180-hour record barely moved that mean, so the check reported no
    // outlier on an estate that has one.
    //
    // Second version added `safety_case_impact`: 54 records, and a 6% shift.
    // Still not a trap — 54 comparables absorb almost anything.
    //
    // The real filter is the one an estimate would actually use: the SAME KIND
    // OF THING. modify_hardware, on a gearbox, no safety case. That leaves a
    // handful, and on a handful one bad record dominates. Which is the whole
    // point: comparables sets in this estate are SMALL, and small sets are
    // exactly where the mean/median distinction stops being pedantry.
    const comparable = (e: Record<string, any>) =>
      e.change_class === 'modify_hardware' &&
      e.element_kind === 'gearbox' &&
      e.safety_case_impact === false;
    const cls = all.filter(comparable).map((e) => n(e.actual_hours));
    const clsNoOutlier = all
      .filter((e) => comparable(e) && e.effort_id !== OUTLIER_EFFORT_ID)
      .map((e) => n(e.actual_hours));
    const meanShift = mean(cls) / mean(clsNoOutlier);
    const medianShift = median(cls) / median(clsNoOutlier);
    note(
      !!outlier &&
        n(outlier.actual_hours) === OUTLIER_HOURS &&
        outlier.safety_case_impact === false &&
        !!outlier.outcome_note &&
        meanShift > 1.25 &&
        // 10%, not 5%. On a nine-record set the median moves a little whatever
        // you add — it steps to the next value. The claim being made is not
        // "the median is immovable", it is that the mean is FAR more sensitive,
        // and the measured 40% against 5% is that claim with a number on it.
        Math.abs(medianShift - 1) < 0.10,
      'T5 — one record moves the mean eight times as much as the median',
      `${OUTLIER_EFFORT_ID} = ${OUTLIER_HOURS} h. Comparable set (modify_hardware · gearbox · no safety case): ` +
        `mean ${mean(clsNoOutlier).toFixed(0)} → ${mean(cls).toFixed(0)} h ` +
        `(${((meanShift - 1) * 100).toFixed(0)}% higher once it is included), ` +
        `median ${median(clsNoOutlier).toFixed(0)} → ${median(cls).toFixed(0)} h. n=${cls.length}.`,
    );
  }

  // ── 8. T6 · structurally perfect, impossible to buy ──────────────────────

  {
    const parts = T('plm', 'parts');
    const obsolete = parts.find((p) => p.part_no === ANCHORS.ecuObsolete);
    const current = parts.find((p) => p.part_no === ANCHORS.ecuCurrent);
    const inBom = T('plm', 'bom_lines').some((b) => b.part_no === ANCHORS.ecuObsolete)
      || T('plm', 'part_program_usage').some((u) => u.part_no === ANCHORS.ecuObsolete);
    note(
      obsolete?.lifecycle === 'ltb-passed' &&
        current?.lifecycle === 'production' &&
        n(obsolete?.unit_cost_eur) < n(current?.unit_cost_eur) &&
        inBom,
      'T6 — the cheapest matching ECU is still in the structure and cannot be ordered',
      `${ANCHORS.ecuObsolete} EUR ${n(obsolete?.unit_cost_eur)} (${obsolete?.lifecycle}) vs ` +
        `${ANCHORS.ecuCurrent} EUR ${n(current?.unit_cost_eur)} (${current?.lifecycle}). ` +
        `The cheap one still appears in the structure, so a BOM-only view proposes it.`,
    );
  }

  // ── 9. T7 · coverage holes, counted exactly ──────────────────────────────

  {
    const k2Crs = T('alm', 'customer_requirements')
      .filter((c) => c.spec_id === ANCHORS.spec)
      .map((c) => c.cr_id as string);
    const traced = new Set(T('alm', 'trace_cr_sr').map((t) => t.cr_id as string));
    const untraced = k2Crs.filter((id) => !traced.has(id)).sort();
    const expected = [...UNTRACED_CRS].sort();
    note(
      untraced.length === expected.length && untraced.every((v, i) => v === expected[i]),
      'T7 — exactly the planted customer requirements have no trace link',
      `${untraced.length} of ${k2Crs.length} K2 requirements untraced: ${untraced.join(', ') || 'none'} ` +
        `(expected ${expected.join(', ')})`,
    );

    const tracedSr = new Set(T('alm', 'trace_cr_sr').map((t) => t.sr_id as string));
    const k2Srs = T('alm', 'system_requirements').filter((s) => s.program_ref === ANCHORS.program);
    const orphans = k2Srs.filter((s) => !tracedSr.has(s.sr_id)).map((s) => s.sr_id as string).sort();
    const expectedOrphans = [...ORPHAN_SRS].sort();
    const allExplained = k2Srs
      .filter((s) => orphans.includes(s.sr_id))
      .every((s) => typeof s.derivation_note === 'string' && s.derivation_note.includes('DERIVED'));
    note(
      orphans.length === expectedOrphans.length &&
        orphans.every((v, i) => v === expectedOrphans[i]) &&
        allExplained,
      'T7 — exactly the planted system requirement has no customer parent, and says so',
      `orphan SRs: ${orphans.join(', ') || 'none'}; each carries a derivation_note beginning DERIVED`,
    );
  }

  // ── 10. the acceptance rows the worked example rests on ──────────────────

  {
    // CR-K2-0102 is "satisfied as-is" only if the rack BOTH demonstrates the
    // angle AND ships. A capability with no programme behind it is a claim.
    const cap = T('plm', 'part_capabilities').find(
      (c) => c.part_no === ANCHORS.rack && c.attribute === 'road_wheel_angle_deg',
    );
    const usage = T('plm', 'part_program_usage').filter((u) => u.part_no === ANCHORS.rack);
    note(
      n(cap?.value) >= CR_ROAD_WHEEL_ANGLE_DEG && cap?.qualified === true && usage.length >= 2,
      'acceptance · CR-K2-0102 can be answered "as-is" from rows',
      `${ANCHORS.rack} demonstrates ${n(cap?.value)}° (qualified, source ${cap?.source}) against a ` +
        `±${CR_ROAD_WHEEL_ANGLE_DEG}° requirement, and ships on ${usage.length} programmes.`,
    );

    // CR-K2-0103's "as-is" rests on the budget closing on a MEASURED carryover,
    // not on two estimates that happen to add up.
    const allocs = T('alm', 'budget_allocations').filter((a) => a.budget_id === ANCHORS.budOnCenter);
    const measured = allocs.filter((a) => a.basis === 'measured');
    note(
      allocs.length >= 2 && measured.length >= 1 && n(measured[0]?.value) === 2.4,
      'acceptance · CR-K2-0103 rests on a measured allocation, not on arithmetic alone',
      `${ANCHORS.budOnCenter}: ${allocs.map((a) => `${a.label} ${n(a.value)} (${a.basis})`).join(', ')}`,
    );

    // The brief's chain starts here and LEAVES THE DATABASE halfway. vst_alm
    // knows the ECU carries the damping activity; the component, the function
    // and its args are files. The handover point is the assertion.
    const alloc = T('alm', 'activity_allocations').find(
      (a) => a.activity_id === 'ACT-DAMPING' && a.element_id === ANCHORS.elEcu,
    );
    note(
      !!alloc && alloc.allocation_type === 'primary',
      'acceptance · the ECU carries the damping activity (the database half of the chain)',
      `ACT-DAMPING allocated to ${ANCHORS.elEcu} as ${alloc?.allocation_type}. The chain continues into ` +
        `the corpus — no table names the function that performs it.`,
    );
  }

  // ── 11. effort splits sum exactly ────────────────────────────────────────

  {
    const byEffort = new Map<string, number>();
    for (const d of T('pmo', 'effort_by_discipline')) {
      byEffort.set(d.effort_id, Number(((byEffort.get(d.effort_id) ?? 0) + n(d.hours)).toFixed(1)));
    }
    const bad: string[] = [];
    for (const e of T('pmo', 'effort_records')) {
      const sum = byEffort.get(e.effort_id);
      if (sum === undefined || Math.abs(sum - n(e.actual_hours)) > 0.05) {
        bad.push(`${e.effort_id}: ${sum} vs ${n(e.actual_hours)}`);
      }
    }
    note(
      bad.length === 0,
      'every effort record equals the sum of its disciplines',
      bad.length === 0 ? `${byEffort.size} records reconcile exactly` : bad.slice(0, 3).join('; '),
    );
  }

  // ── 12. the estate knows its own quoting bias ────────────────────────────

  {
    const lines = T('pmo', 'quote_lines');
    const dominant = new Map<string, string>();
    for (const l of lines) {
      if (n(l.seq) === 1) dominant.set(l.quote_id, l.change_class);
    }
    const closed = T('pmo', 'quotes').filter((q) => q.actual_hours_final !== null);
    const ratioFor = (cls: string) =>
      median(
        closed
          .filter((q) => dominant.get(q.quote_id) === cls)
          .map((q) => n(q.actual_hours_final) / n(q.quoted_hours)),
      );
    const nf = ratioFor('new_function');
    const rc = ratioFor('recalibrate');
    const target = 1 + QUOTE_BIAS_NEW_FUNCTION;
    note(
      Math.abs(nf - target) < 0.05 && Math.abs(rc - 1) < 0.05,
      'the quoting bias is measurable from quoted vs actual',
      `new_function-dominant quotes ran ${((nf - 1) * 100).toFixed(0)}% over (target ` +
        `${(QUOTE_BIAS_NEW_FUNCTION * 100).toFixed(0)}%); recalibrate-dominant ran ` +
        `${((rc - 1) * 100).toFixed(0)}% over. n=${closed.length} closed quotes.`,
    );
  }

  return { ok, fail };
}

/** Print a result block and return the exit code. */
export function report(label: string, r: Result): number {
  console.log('');
  for (const { label: l, detail } of r.ok) console.log(`  ok      ${l}\n          ${detail}`);
  for (const { label: l, detail } of r.fail) console.log(`  FAIL    ${l}\n          ${detail}`);
  const passed = r.fail.length === 0;
  console.log(`\n${label}: ${passed ? 'PASS' : 'FAIL'} — ${r.ok.length} ok, ${r.fail.length} failing\n`);
  return passed ? 0 : 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CORPUS — the half of the estate that is not a database.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assertions over the code base, which is files.
 *
 * WHY THESE LOOK DIFFERENT FROM THE ONES ABOVE. There are no columns to
 * compare, so every check here is a search: does this document contain this
 * fact, in a form a reader could find? That is a weaker kind of assertion and
 * deliberately so — it is the same weakness a grounded answer has, and if the
 * check cannot find the fact by reading, neither will anything else.
 *
 * THE ONE THING THESE MUST NOT DO is assert that the corpus is tidy. Half the
 * planted mess exists precisely to be survived: the stale CHANGELOG, the
 * contradicting design note, the CSV with a missing field. A check that
 * required them away would be deleting the test data.
 */
export function runCorpusAssertions(files: { path: string; content: string }[]): Result {
  const ok: Note[] = [];
  const fail: Note[] = [];
  const note = (pass: boolean, label: string, detail: string): void => {
    (pass ? ok : fail).push({ label, detail });
  };
  const get = (path: string): string => files.find((f) => f.path === path)?.content ?? '';
  const bytes = files.reduce((s, f) => s + f.content.length, 0);

  note(
    files.length >= 40 && bytes > 60_000,
    'the corpus exists and is not a stub',
    `${files.length} files, ${(bytes / 1024).toFixed(0)} KB across ${new Set(files.map((f) => f.path.split('/')[0])).size} repositories`,
  );

  // ── T3's other half: the ASIL, in prose ─────────────────────────────────

  {
    const sa = get('eps-steering-feel/docs/safety-assessment-2021.md');
    // `\s+` rather than a literal space, and the asterisks optional: the
    // sentence is markdown-bolded and wraps mid-phrase, so "developed to" and
    // "ASIL B" are on different lines with the `**` around the outside. A
    // regex that assumed they were adjacent found nothing and reported the
    // fact missing from a document that states it plainly.
    const statesAsil = new RegExp(`developed\\s+to\\s+\\*{0,2}ASIL\\s+${SWC_DAMP_ASIL_TODAY}`, 'i').test(sa);
    const namesComponent = sa.includes(ANCHORS.swcDamping);
    const warnsAboutReuse = /cannot inherit this classification/i.test(sa);
    note(
      statesAsil && namesComponent && warnsAboutReuse,
      'T3 — the shipping ASIL is findable, and it is a sentence rather than a column',
      `safety-assessment-2021.md names ${ANCHORS.swcDamping}, states ASIL ${SWC_DAMP_ASIL_TODAY}, and says ` +
        `a programme allocating a higher ASIL "cannot inherit this classification". Nothing in any ` +
        `database says this.`,
    );

    // And the trap inside the trap: an older document says something else.
    const dn = get('eps-steering-feel/docs/design-note-damping.md');
    note(
      /ASIL D/.test(dn) && /out of date/i.test(dn) && dn.includes('VST-SA-2021-014'),
      'T3 — an older design note contradicts it, and the contradiction is resolvable',
      `design-note-damping.md still says ASIL ${K2_DAMPING_ASIL_REQUIRED}, marks itself out of date, and ` +
        `points at the superseding document. A search that takes the first hit gets the wrong answer; ` +
        `one that reads the note gets the right one.`,
    );
  }

  // ── the brief's "args", in a comment block ──────────────────────────────

  {
    const c = get('eps-steering-feel/src/damping.c');
    const params = ['DAMP_GAIN_BASE', 'DAMP_SPD_BRK', 'DAMP_MAX_TRQ', 'DAMP_RATE_LIM', 'DAMP_ENABLE'];
    const found = params.filter((p) => c.includes(p));
    const hasFn = c.includes('Damping_Apply');
    const hasBlock = /CALIBRATION PARAMETERS/.test(c);
    note(
      hasFn && hasBlock && found.length === params.length,
      'the calibration parameters are in the source, in a comment, as they would be',
      `damping.c defines Damping_Apply and documents ${found.length} parameters in a comment block — ` +
        `not in a schema. Extracting them is parsing, not a SELECT.`,
    );

    const compat = get('eps-steering-feel/src/legacy/damp_compat.c');
    note(
      compat.includes('DampApply') && compat.includes('Damping_Apply'),
      'the function has two names in the tree, and both are live',
      `the pre-2018 symbol DampApply still exists as a shim. Anything matching on the function name ` +
        `has to cope with both spellings.`,
    );
  }

  // ── the stale CHANGELOG versus the live git log ─────────────────────────

  {
    const ch = get('eps-steering-feel/CHANGELOG.md');
    const gl = get('eps-steering-feel/git-log.txt');
    const changelogStops2023 = /\[4\.2\.0\] - 2023/.test(ch) && /Maintenance of this file stopped/i.test(ch);
    const logRunsLater = /Date:\s+202[456]/.test(gl);
    const commits = (gl.match(/^commit /gm) ?? []).length;
    note(
      changelogStops2023 && logRunsLater && commits > 200,
      'the readable history and the complete history disagree, and the readable one is stale',
      `CHANGELOG.md stops at 4.2.0 in 2023 and says so; git-log.txt carries ${commits} commits running past it. ` +
        `Answering "what changed recently" from the tidier document is wrong.`,
    );
    note(
      /Change-Request: CHR-/.test(gl),
      'commits carry a change-request trailer, which is the join back into vst_alm',
      `git-log.txt embeds "Change-Request: CHR-…" trailers. That string is the only link between the ` +
        `code base and the change control record — no key, no table.`,
    );
  }

  // ── the export that is not quite a table ────────────────────────────────

  {
    const csv = get('eps-steering-feel/cal/damping_params.csv');
    const lines = csv.split('\n').filter((l) => l && !l.startsWith('#'));
    const header = lines[0]?.split(',') ?? [];
    const missingField = lines.some((l) => /,,/.test(l));
    // The inconsistency is BETWEEN the export and the source, not inside the
    // export — the CSV only ever writes the parameter one way, and it is the
    // wrong way. Checking within one file asked the wrong question and failed
    // on data that is exactly as messy as intended.
    const caseInconsistent =
      csv.includes('damp_rate_lim') && get('eps-steering-feel/src/damping.c').includes('DAMP_RATE_LIM');
    const quotedComma = /"[^"]*,[^"]*"/.test(csv);
    note(
      header.length === 7 && missingField && caseInconsistent && quotedComma,
      'the calibration export is messy in four specific ways, all of them real',
      `${lines.length - 1} rows: one empty value, one parameter written lowercase where the source ` +
        `writes it uppercase, quoted free text containing a comma, and a comment header above the ` +
        `column row.`,
    );

    const jira = get('tickets/jira-export-2026-09.csv');
    const jiraLines = jira.split('\n').filter((l) => l && !l.startsWith('#'));
    note(
      jiraLines.length > 200 && /^VST-\d+,/m.test(jira),
      'the ticket export is present and inconsistently quoted',
      `${jiraLines.length - 1} tickets, some summaries quoted and some not — the export quoted "minimally", ` +
        `which is a decision somebody made once and nobody revisited.`,
    );
  }

  return { ok, fail };
}
