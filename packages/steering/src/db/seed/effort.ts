/**
 * vst_pmo — what past changes actually took. The database the cost answer
 * stands on.
 *
 * OWN RANDOM STREAM (`SEEDS.effort`).
 *
 * ── THE HOURS MODEL, STATED OPENLY ────────────────────────────────────────
 *
 *     hours = BASE[change_class] × (safety_case_impact ? 4.2 : 1) × noise
 *
 * and nothing else. Three consequences, each deliberate:
 *
 *   1. `safety_case_impact` is the ONLY multiplier, so the 4.2× is recoverable
 *      from the loaded rows as a ratio of medians. `db:check` measures it back
 *      out and requires it in [3.8, 4.6]. A trap that survives only in the
 *      generator's intentions is not in the data.
 *
 *   2. ASIL does NOT enter the formula directly. It enters through
 *      `safety_case_impact`, which is drawn more often at C and D. That is a
 *      real claim about the domain rather than a convenience: an ASIL D
 *      function is not expensive because of the letter, it is expensive because
 *      of the argument you have to build and maintain around it.
 *
 *   3. The noise is multiplicative and symmetric, so it moves the mean around
 *      and leaves the median where it belongs. That is what makes T5 a trap
 *      about STATISTICS rather than about noise.
 *
 * ── T5 AND T3 MUST NOT TOUCH EACH OTHER ───────────────────────────────────
 *
 * The 3,180-hour outlier carries `safety_case_impact = false` and is excluded
 * from the ratio comparables. If it sat on either side of that ratio it would
 * drag the measured multiplier out of band and turn T3's assertion red for a
 * reason that looks like a generator bug. Two traps interfering is how a check
 * stops meaning anything — it is exactly the pharma defect where a guard
 * rejected the correct answer and every failure afterwards looked like the
 * model misbehaving.
 */
import { makeHelpers, SEEDS, on } from './rng';
import {
  OUTLIER_EFFORT_ID,
  OUTLIER_HOURS,
  SAFETY_CASE_MULTIPLIER,
  QUOTE_BIAS_NEW_FUNCTION,
  QUOTE_BIAS_RECALIBRATE,
} from '../../config/assumptions';
import type {
  Pmo, Programs, Rfqs, ChangeRequests, ChangeRequestItems, SystemRequirementVersions,
} from '../schema/rows';

/**
 * Base hours per change class, before the safety multiplier.
 *
 * These are the shape of the answer the FDE capability will eventually give,
 * so they are ordered the way an engineer would order them: reusing something
 * is nearly free, recalibrating is cheap, touching code is not, and cutting
 * metal is the most expensive thing on the list.
 */
const BASE_HOURS: Record<string, number> = {
  reuse_as_is: 8,
  recalibrate: 60,
  validation_only: 120,
  integration_only: 180,
  modify_function: 320,
  safety_case_only: 400,
  modify_hardware: 700,
  new_function: 900,
  new_hardware: 1_800,
};

const CHANGE_CLASSES = Object.keys(BASE_HOURS);
const ELEMENT_KINDS = ['sensor', 'ecu', 'motor', 'gearbox', 'mechanical', 'software_domain'] as const;
const DISCIPLINES = ['systems', 'software', 'hardware', 'calibration', 'validation', 'safety', 'pm'] as const;
const REGIONS = ['EU', 'NA', 'CN'] as const;

/** How the hours of one change split across disciplines, by change class. */
const SPLIT: Record<string, Partial<Record<typeof DISCIPLINES[number], number>>> = {
  reuse_as_is: { systems: 0.5, pm: 0.5 },
  recalibrate: { calibration: 0.6, validation: 0.25, pm: 0.15 },
  validation_only: { validation: 0.8, pm: 0.2 },
  integration_only: { software: 0.4, validation: 0.4, pm: 0.2 },
  modify_function: { software: 0.55, validation: 0.2, systems: 0.15, pm: 0.1 },
  safety_case_only: { safety: 0.7, systems: 0.2, pm: 0.1 },
  modify_hardware: { hardware: 0.6, validation: 0.2, systems: 0.12, pm: 0.08 },
  new_function: { software: 0.5, systems: 0.2, validation: 0.2, pm: 0.1 },
  new_hardware: { hardware: 0.55, validation: 0.2, systems: 0.15, pm: 0.1 },
};

/** Base rates per discipline in EUR/h, 2019. Escalated ~3%/yr, ±region. */
const BASE_RATE: Record<string, number> = {
  systems: 96, software: 92, hardware: 94, calibration: 86,
  validation: 78, safety: 108, pm: 102,
};
const REGION_FACTOR: Record<string, number> = { EU: 1.0, NA: 1.18, CN: 0.62 };

export function buildEffort(
  crm: { programs: Programs[]; rfqs: Rfqs[] },
  alm: {
    change_requests: ChangeRequests[];
    // ── ADDED SO A JOB'S SAFETY LEVEL CAN BE INHERITED, NOT INVENTED ──────
    //
    // `asil` used to be `h.pick(['QM','QM','B','B','C','D'])` — a die roll,
    // unrelated to anything. That made the estate quietly incoherent: a change
    // implementing an ASIL D requirement could be recorded as QM work, and no
    // check could see it because there was no relationship to violate.
    //
    // It was found by trying to DERIVE the safety level from the requirements
    // documents and discovering there was nothing on the other end of the join.
    // A missing fact, not a missing key. See docs/steering/SORTING.md.
    change_request_items: ChangeRequestItems[];
    system_requirement_versions: SystemRequirementVersions[];
  },
): Pmo {
  const h = makeHelpers(SEEDS.effort);
  const pmo: Pmo = { effort_records: [], effort_by_discipline: [], rate_cards: [], quotes: [], quote_lines: [] };

  // ── rate cards ───────────────────────────────────────────────────────────
  //
  // Hours become euros here and nowhere else. A rate hardcoded in an estimator
  // is a rate nobody can audit, and it is wrong the moment a year rolls over.

  for (let year = 2019; year <= 2026; year++) {
    for (const region of REGIONS) {
      for (const discipline of DISCIPLINES) {
        const escalation = Math.pow(1.03, year - 2019);
        pmo.rate_cards.push({
          year, region, discipline,
          rate_eur_per_hour: Number((BASE_RATE[discipline] * escalation * REGION_FACTOR[region]).toFixed(2)),
        });
      }
    }
  }

  // ── effort records ───────────────────────────────────────────────────────

  const implemented = alm.change_requests.filter((c) => c.status === 'implemented');

  /**
   * `chr_id` → the ASIL of the requirement that change targets.
   *
   * Every generated change request carries an item with `target_kind = 'sr'`;
   * that SR's in-force version states an ASIL. So the chain a human would walk —
   * this job implemented that change, that change modified that requirement,
   * that requirement is ASIL D, therefore this was ASIL D work — is now a chain
   * that exists in the data rather than one the data merely looks like it has.
   *
   * THE MAP IS DELIBERATELY INCOMPLETE. A change targeting a budget or an
   * element rather than a requirement yields nothing, and about 40% of effort
   * records have no change request at all — standing work nobody traced. Those
   * keep a drawn ASIL. Filling every row would be tidier and would delete the
   * gap that makes "we cannot tell" a real answer.
   */
  const asilOfChr = new Map<string, string>();
  {
    const asilOfSr = new Map<string, string>();
    for (const v of alm.system_requirement_versions) asilOfSr.set(v.sr_id, v.asil);
    for (const item of alm.change_request_items) {
      if (item.target_kind !== 'sr') continue;
      const a = asilOfSr.get(item.target_id);
      if (a && !asilOfChr.has(item.chr_id)) asilOfChr.set(item.chr_id, a);
    }
  }
  const runnable = crm.programs.filter((p) => p.status !== 'bid');

  /** Split `hours` across disciplines so the parts sum EXACTLY to the whole. */
  const split = (effort_id: string, change_class: string, hours: number): void => {
    const weights = SPLIT[change_class];
    const names = Object.keys(weights) as (typeof DISCIPLINES[number])[];
    let allocated = 0;
    names.forEach((d, i) => {
      const last = i === names.length - 1;
      // The last discipline absorbs the rounding, so `sum(parts) = whole` is an
      // assertion `db:check` can make exactly rather than within a tolerance.
      const v = last ? Number((hours - allocated).toFixed(1)) : Number((hours * (weights[d] ?? 0)).toFixed(1));
      allocated = Number((allocated + v).toFixed(1));
      pmo.effort_by_discipline.push({ effort_id, discipline: d, hours: v });
    });
  };

  const push = (
    effort_id: string,
    opts: {
      chr: string | null; program: string; title: string; completed: string;
      change_class: string; element_kind: string; asil: string; reuse_class: string;
      interfaces: number; safety: boolean; tooling: boolean; hours: number;
      weeks: number; region: string; note: string | null;
    },
  ): void => {
    pmo.effort_records.push({
      effort_id, chr_ref: opts.chr, program_ref: opts.program, title: opts.title,
      completed_on: opts.completed, change_class: opts.change_class,
      element_kind: opts.element_kind, asil: opts.asil, reuse_class: opts.reuse_class,
      interfaces_touched: opts.interfaces, safety_case_impact: opts.safety,
      tooling_required: opts.tooling, actual_hours: opts.hours, calendar_weeks: opts.weeks,
      region: opts.region, year: Number(opts.completed.slice(0, 4)), outcome_note: opts.note,
    });
    split(effort_id, opts.change_class, opts.hours);
  };

  // T5 — the outlier, written first and by hand so it cannot be confused with
  // a draw that happened to come out large. Note what `outcome_note` says: the
  // number is not wrong, it is answering a different question.
  push(OUTLIER_EFFORT_ID, {
    chr: null,
    program: 'PRG-HLX-H1',
    title: 'Gearbox housing change, H1 facelift',
    completed: on(2021, 11, 26),
    change_class: 'modify_hardware',
    element_kind: 'gearbox',
    asil: 'B',
    reuse_class: 'modified',
    interfaces: 1,
    safety: false, // see the header — T5 must not touch T3
    tooling: true,
    hours: OUTLIER_HOURS,
    weeks: 71,
    region: 'EU',
    note:
      'Booked against this change but absorbed the Rothbury line relocation: tooling ' +
      'transfer, re-qualification and a second PPAP. Not comparable to a housing change ' +
      'on its own — roughly 2,400 of these hours are the relocation.',
  });

  let effN = 0;
  for (let i = 0; i < 639; i++) {
    const change_class = h.pick(CHANGE_CLASSES);
    // The draw is still taken even when it is discarded. Consuming the same
    // number of values keeps every LATER draw in this loop where it was, so
    // this change moves `asil` and the two things that depend on it, and not
    // the element kinds, regions and dates of 639 records as well.
    const drawn = h.pick(['QM', 'QM', 'B', 'B', 'C', 'D']);
    const prog = h.pick(runnable);
    const completedDays = h.int(-2_500, -40);
    const chr = h.chance(0.6) && implemented.length ? h.pick(implemented) : null;
    // Inherited where the work traces to a requirement; drawn where it does not.
    const asil = (chr && asilOfChr.get(chr.chr_id)) || drawn;

    // Safety-case work correlates with ASIL — see the header, point 2. It does
    // NOT correlate with change class, which is what keeps the ratio of medians
    // interpretable without matching on anything.
    //
    // MOVED BELOW `asil`, which is the whole substance of this change: it used
    // to be computed from a die roll, and is now computed from the requirement
    // the work implemented.
    const safety = asil === 'D' ? h.chance(0.62) : asil === 'C' ? h.chance(0.38) : h.chance(0.07);
    // Symmetric in log space: moves the mean, leaves the median.
    const noise = h.chance(0.5) ? h.num(0.74, 1.0, 3) : h.num(1.0, 1.35, 3);
    const hours = Number((BASE_HOURS[change_class] * (safety ? SAFETY_CASE_MULTIPLIER : 1) * noise).toFixed(1));

    push(`EFF-BULK-${String(++effN).padStart(4, '0')}`, {
      chr: chr?.chr_id ?? null,
      program: prog.program_id,
      title: `${change_class.replace(/_/g, ' ')} — ${prog.model}`,
      completed: h.day(completedDays),
      change_class,
      element_kind: h.pick(ELEMENT_KINDS),
      asil,
      reuse_class: h.pick(['carryover', 'modified', 'new']),
      interfaces: h.int(0, 4),
      safety,
      tooling: change_class.includes('hardware') ? h.chance(0.55) : false,
      hours,
      weeks: Math.max(1, Math.round(hours / h.int(18, 45))),
      region: prog.region,
      note: null,
    });

    // Close the loop back to vst_alm: the change request now names what it
    // cost. A mutation of another generator's output, and safe because it draws
    // nothing from any random stream — the id was already decided above.
    if (chr && !chr.effort_ref) chr.effort_ref = `EFF-BULK-${String(effN).padStart(4, '0')}`;
  }

  // ── quotes ───────────────────────────────────────────────────────────────
  //
  // T7's second half: the estate's own record of how wrong its estimates were.
  // `actual_hours_final` is `quoted_hours` scaled by the bias for the quote's
  // DOMINANT change class, so the bias is recoverable as a ratio of medians —
  // the same discipline as the safety multiplier above.

  const dominantOf = (rfqId: string): string => (rfqId.charCodeAt(rfqId.length - 1) % 2 === 0 ? 'new_function' : 'recalibrate');

  let qN = 0;
  for (const rfq of crm.rfqs) {
    const prog = crm.programs.find((p) => p.program_id === rfq.program_id);
    if (!prog) continue;
    const quote_id = `QUO-${String(++qN).padStart(4, '0')}`;
    const dominant = dominantOf(rfq.rfq_id);
    const bias = dominant === 'new_function' ? QUOTE_BIAS_NEW_FUNCTION : QUOTE_BIAS_RECALIBRATE;

    const nLines = h.int(3, 8);
    let quoted = 0;
    for (let i = 0; i < nLines; i++) {
      // The dominant class takes the first and largest line, so "dominant" is
      // a property of the rows and not only of the id it was derived from.
      const cls = i === 0 ? dominant : h.pick(CHANGE_CLASSES);
      const hours = Number((BASE_HOURS[cls] * (i === 0 ? h.num(1.8, 3.0, 2) : h.num(0.4, 1.2, 2))).toFixed(1));
      quoted = Number((quoted + hours).toFixed(1));
      pmo.quote_lines.push({
        quote_id, seq: i + 1,
        description: `${cls.replace(/_/g, ' ')} on ${prog.model}`,
        change_class: cls, hours, cr_ref: null,
      });
    }

    const rate = 94 * REGION_FACTOR[prog.region];
    const closed = rfq.status === 'won' || rfq.status === 'lost';
    pmo.quotes.push({
      quote_id, rfq_ref: rfq.rfq_id, program_ref: prog.program_id,
      issued_on: rfq.due_on as string,
      quoted_hours: quoted,
      quoted_eur: Number((quoted * rate).toFixed(2)),
      tooling_eur: h.chance(0.45) ? h.num(40_000, 900_000, 2) : null,
      outcome: rfq.status === 'open' ? 'open' : rfq.status,
      actual_hours_final:
        closed && rfq.status === 'won'
          ? Number((quoted * (1 + bias) * h.num(0.96, 1.04, 3)).toFixed(1))
          : null,
    });
  }

  return pmo;
}
