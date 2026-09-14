/**
 * EFFORT AND COST, AS DOCUMENTS. The raw source that `vst_pmo` is extracted FROM.
 *
 * OWN RANDOM STREAM (`SEEDS.corpusPmo`).
 *
 * ── WHY THIS IS THE MESSIEST PART OF THE ESTATE ───────────────────────────
 *
 * `vst_pmo` has a tidy `effort_records` table with a comparables key on it:
 * change class, element kind, ASIL, whether a safety case was involved. That
 * table is a FICTION as a source. Nobody books time against a comparables key.
 *
 * What actually exists is:
 *
 *   · a timesheet export, by person and week, against charge codes
 *   · a project closure report, written months later by whoever was left
 *   · a quotation document, written before any of it happened
 *   · a rate card spreadsheet nobody has opened since it was approved
 *
 * And the classification that makes the cost question answerable — "this was a
 * modify_hardware change on a gearbox with no safety case" — EXISTS NOWHERE IN
 * THOSE FILES. It has to be read out of prose. That is the single hardest piece
 * of extraction in the whole estate, and the first version of this data skipped
 * it entirely by writing the answer into a column.
 *
 * ── THE PLANTED MESS, ITEM BY ITEM ────────────────────────────────────────
 *
 *   · charge codes in three formats across the years — `VST-1234`, `VST1234`,
 *     `1234` — because the finance system was migrated twice
 *   · hours booked against a code that closed the previous quarter
 *   · a closure report whose total does not match its own timesheets, with a
 *     note explaining why in the third paragraph
 *   · the relocation outlier, whose 3,180 hours are visible in the timesheets
 *     as a run of people who never worked on steering
 *   · quarters with no timesheet export at all — the file was never produced
 *   · people's names spelled two ways
 */
import { makeHelpers, SEEDS, on } from './rng';
import { OUTLIER_EFFORT_ID } from '../../config/assumptions';
import type { CorpusFile } from './corpus';
import type { Pmo, Crm, Alm } from '../schema/rows';

const PEOPLE = [
  ['D. Ferreira', 'Ferreira, Diogo'], ['M. Lindqvist', 'Lindqvist, Maja'],
  ['A. Kovac', 'Kovac, Ana'], ['S. Beker', 'Beker, Sena'],
  ['J. Moreau', 'Moreau, Julien'], ['N. Haas', 'Haas, Nils'],
  ['P. Strand', 'Strand, Petra'], ['L. Renaud', 'Renaud, Luc'],
  ['E. Palmer', 'Palmer, Ewan'], ['R. Dietrich', 'Dietrich, Rea'],
  ['T. Sala', 'Sala, Tomas'], ['I. Arnaud', 'Arnaud, Ines'],
];

/** Three charge-code formats, because finance was migrated twice. */
function chargeCode(h: { int(a: number, b: number): number }, year: number, n: number): string {
  if (year <= 2021) return `${1000 + n}`;
  if (year <= 2023) return `VST${1000 + n}`;
  return `VST-${1000 + n}`;
}

/**
 * `Safety level:  ASIL D`, on the reports where it is known.
 *
 * Added after the sorting phase proved a point the hard way. Of 220 closure
 * reports, NOT ONE stated the safety level in a form that could be paired with
 * the cost — so "what does an ASIL D safety case cost us", a EUR 200,000
 * question, was unanswerable from the customer's own documents. The only honest
 * output was a refusal.
 *
 * Widening the search instead of refusing was measured and is worse: pricing all
 * safety-case work regardless of level gives 451 hours against a true 1,571 —
 * three and a half times out, because most safety-case work is QM and an ASIL D
 * case costs about four times a QM one. `walk-check` asserts that now.
 *
 * So the fix belongs in the DOCUMENT, not the pipeline, and this one line is the
 * whole of it. That is the deliverable a customer can act on: not "your
 * extraction needs work" but "add this field to your closure-report template and
 * a quarter of your cost history becomes machine-answerable".
 *
 * ONLY WHERE THE WORK TRACES TO A CHANGE REQUEST — about 60% of records. Work
 * nobody traced has no requirement to inherit a level from, and inventing one
 * would delete the gap that makes "we cannot tell" a real answer.
 */
function asilLine(e: { chr_ref: string | null; asil: string }): string {
  return e.chr_ref ? `\nSafety level:  ASIL ${e.asil}` : '';
}

export function buildPmoDocs(crm: Crm, alm: Alm, pmo: Pmo): CorpusFile[] {
  const h = makeHelpers(SEEDS.corpusPmo);
  const files: CorpusFile[] = [];
  const add = (path: string, content: string): void => {
    files.push({ path, content: `${content.replace(/^\n/, '').trimEnd()}\n` });
  };

  const progById = new Map(crm.programs.map((p) => [p.program_id, p]));
  const chrById = new Map(alm.change_requests.map((c) => [c.chr_id, c]));
  const splitByEffort = new Map<string, typeof pmo.effort_by_discipline>();
  for (const d of pmo.effort_by_discipline) {
    splitByEffort.set(d.effort_id, [...(splitByEffort.get(d.effort_id) ?? []), d]);
  }

  // Every effort record gets a charge code. This map IS the join that the
  // timesheets and the closure reports share, and it is the only thing that
  // connects a week of somebody's time to a piece of engineering work.
  const codeOf = new Map<string, string>();
  pmo.effort_records.forEach((e, i) => codeOf.set(e.effort_id, chargeCode(h, e.year, i)));

  // ── closure reports ──────────────────────────────────────────────────────
  //
  // Written months after the fact by whoever was still on the programme. This
  // is where the CLASSIFICATION lives — in prose, never as a field.

  // A SAMPLE, PLUS THE ONES THAT MUST NEVER BE MISSING.
  //
  // Not every project gets a closure report written — that is realistic, and
  // 220 of 640 is about right. But the first version sampled ALL of them, and
  // EFF-2021-0443 did not come out. That record is the anchor of the entire
  // cost lesson: 3,180 hours whose explanation exists only in prose. Leaving
  // its presence to a dice roll meant `walk-cost` could have been telling a
  // story about a document that was not there.
  //
  // So the anchors are forced in and the rest is sampled around them.
  const mustHave = pmo.effort_records.filter((e) => e.effort_id === OUTLIER_EFFORT_ID);
  const closing = [
    ...mustHave,
    ...h.sample(pmo.effort_records.filter((e) => !mustHave.includes(e)), 220 - mustHave.length),
  ];
  for (const e of closing) {
    const prog = progById.get(e.program_ref);
    const chr = e.chr_ref ? chrById.get(e.chr_ref) : undefined;
    const split = splitByEffort.get(e.effort_id) ?? [];
    const isOutlier = e.effort_id === OUTLIER_EFFORT_ID;
    // The reported total sometimes disagrees with the timesheets. When it does,
    // the report says why — in the third paragraph, in prose.
    const drift = !isOutlier && h.chance(0.18) ? h.int(-40, 90) : 0;
    const reported = Number(e.actual_hours) + drift;

    add(`pmo/closure-reports/${e.effort_id}.md`, `
PROJECT CLOSURE REPORT
Vantis Steering Systems — Programme Office

Reference:     ${e.effort_id}
Charge code:   ${codeOf.get(e.effort_id)}${asilLine(e)}
Programme:     ${e.program_ref}${prog ? `  (${prog.model}, ${prog.eps_architecture})` : ''}
Change ref:    ${e.chr_ref ?? 'none — standing work'}
Completed:     ${e.completed_on}
Region:        ${e.region}
Prepared by:   ${h.pick(PEOPLE)[0]}, ${h.dayBetween(-2_200, -30)}

1. WHAT WAS DONE

   ${e.title}.
   ${chr ? `Raised as ${chr.chr_id} (${chr.source}) on ${chr.raised_on}: ${chr.title}.` : ''}

   ${classificationProse(h, e, isOutlier)}

2. EFFORT

   Reported total: ${reported} hours over ${e.calendar_weeks} weeks.

${split.map((d) => `   ${String(d.discipline).padEnd(14)} ${String(Number(d.hours)).padStart(8)} h`).join('\n')}

3. NOTES

   ${e.outcome_note
      ? wrapText(String(e.outcome_note), 68, '   ')
      : drift
        ? wrapText(`Timesheet total differs from the figure above by ${Math.abs(drift)} hours. ` +
          `${drift > 0
            ? 'Late bookings arrived after the code was closed and were journalled in.'
            : 'Some hours were moved to the programme overhead code during the year-end review.'} ` +
          'The figure in §2 is the one to use.', 68, '   ')
        : h.pick([
          'Nothing unusual. Delivered to plan.',
          'Slight overrun on validation, absorbed within the programme contingency.',
          'Closed early. The supplier delivered ahead of the agreed date.',
          'No issues to report at closure.',
        ])}

4. LESSONS

   ${h.pick([
     'None recorded.',
     'The estimate assumed a single design iteration. There were two. Future estimates for this class of change should assume two.',
     'Test rig availability was the constraint, not engineering capacity.',
     'The customer changed the requirement mid-way. The change was absorbed rather than re-quoted, which was a commercial decision and not a technical one.',
     'Worth reusing the verification approach from this one.',
   ])}
`);
  }

  // ── timesheets ───────────────────────────────────────────────────────────
  //
  // By person and week, against charge codes. This is the raw material. It has
  // no idea what kind of engineering work any of it was.

  const quarters: { year: number; q: number }[] = [];
  for (let y = 2019; y <= 2026; y++) for (let q = 1; q <= 4; q++) quarters.push({ year: y, q });

  for (const { year, q } of quarters) {
    // Some quarters were simply never exported. The gap is real and an
    // extractor that assumes continuous coverage will silently undercount.
    if (h.chance(0.08)) continue;

    const inQuarter = pmo.effort_records.filter((e) => {
      const d = String(e.completed_on);
      const m = Number(d.slice(5, 7));
      return Number(d.slice(0, 4)) === year && Math.ceil(m / 3) === q;
    });
    if (!inQuarter.length) continue;

    const rows = ['week_ending,employee,charge_code,hours,activity,approved'];
    for (const e of inQuarter) {
      const split = splitByEffort.get(e.effort_id) ?? [];
      const code = codeOf.get(e.effort_id)!;
      for (const d of split) {
        // Spread one discipline's hours over a plausible number of weeks and
        // people. Names appear in both spellings, because two systems fed this.
        let left = Number(d.hours);
        const weeks = Math.max(1, Math.min(13, Math.ceil(left / 34)));
        for (let wk = 0; wk < weeks && left > 0; wk++) {
          const person = h.pick(PEOPLE)[h.chance(0.65) ? 0 : 1];
          const hrs = wk === weeks - 1 ? left : Math.min(left, h.int(4, 40));
          left = Number((left - hrs).toFixed(1));
          rows.push([
            on(year, (q - 1) * 3 + 1 + Math.floor(wk / 4.4), Math.min(28, 1 + (wk % 4) * 7)),
            person.includes(',') ? `"${person}"` : person,
            code,
            hrs.toFixed(1),
            d.discipline,
            h.chance(0.93) ? 'Y' : '',
          ].join(','));
        }
      }
    }

    // A handful of lines booked to a code that closed the previous quarter.
    // Finance queries these every year and the answer is always "it was late".
    if (h.chance(0.35) && quarters.length) {
      const stale = h.pick(pmo.effort_records);
      rows.push(`# the three lines below were booked against a closed code and journalled later`);
      for (let i = 0; i < 3; i++) {
        rows.push([
          on(year, (q - 1) * 3 + 2, h.int(1, 28)),
          h.pick(PEOPLE)[0],
          codeOf.get(stale.effort_id)!,
          h.num(2, 16, 1).toFixed(1),
          h.pick(['systems', 'software', 'pm']),
          '',
        ].join(','));
      }
    }

    add(`pmo/timesheets/${year}-Q${q}.csv`,
      `# Vantis Steering Systems — timesheet export\n` +
      `# period: ${year} Q${q}   exported: ${on(year, Math.min(12, q * 3 + 1), 5)}\n` +
      `# charge code format changed in 2022 and again in 2024. Older rows keep the old format.\n` +
      `# an empty 'approved' column means the line was never signed off, not that it was rejected.\n` +
      rows.join('\n'));
  }

  // ── quotations ───────────────────────────────────────────────────────────

  for (const qt of pmo.quotes) {
    const lines = pmo.quote_lines.filter((l) => l.quote_id === qt.quote_id);
    const prog = progById.get(qt.program_ref);
    add(`pmo/quotes/${qt.quote_id}.md`, `
# Quotation ${qt.quote_id}
**RFQ:** ${qt.rfq_ref} · **Programme:** ${qt.program_ref}${prog ? ` (${prog.model})` : ''}
**Issued:** ${qt.issued_on} · **Outcome:** ${qt.outcome}

## Engineering effort

| # | description | class | hours |
|---|---|---|---|
${lines.map((l) => `| ${l.seq} | ${l.description} | ${l.change_class} | ${Number(l.hours)} |`).join('\n')}

**Quoted total: ${Number(qt.quoted_hours)} hours — EUR ${Number(qt.quoted_eur).toLocaleString('en-GB')}**
${qt.tooling_eur ? `\nTooling, quoted separately: EUR ${Number(qt.tooling_eur).toLocaleString('en-GB')}` : ''}

## Assumptions

${h.sample([
  'One design iteration. A second iteration is not included and would be re-quoted.',
  'Customer-supplied interface specification is final at the date of this quotation.',
  'Test rig capacity available in the window agreed at the technical review.',
  'No change to the safety goal allocation after nomination.',
  'Existing calibration approach carried over. A new approach would be re-quoted.',
  'Prices hold for 90 days from issue.',
], h.int(2, 4)).map((a) => `- ${a}`).join('\n')}

${qt.actual_hours_final !== null ? `
## Post-programme reconciliation
*Added at programme close, ${h.dayBetween(-1_400, -60)}.*

Actual engineering effort: **${Number(qt.actual_hours_final)} hours** against
${Number(qt.quoted_hours)} quoted — ${
  (() => {
    const pct = (Number(qt.actual_hours_final) / Number(qt.quoted_hours) - 1) * 100;
    return `${pct >= 0 ? 'over' : 'under'} by ${Math.abs(pct).toFixed(0)}%`;
  })()
}.

${h.pick([
  'The variance sits almost entirely in the first line item.',
  'Two change requests during development were absorbed rather than re-quoted.',
  'Close to plan. No commercial action taken.',
  'Reviewed at the programme post-mortem. The estimate method was not changed as a result.',
])}` : ''}
`);
  }

  // ── rate cards ───────────────────────────────────────────────────────────
  //
  // Approved once a year, as a spreadsheet, and never opened again.

  const years = [...new Set(pmo.rate_cards.map((r) => r.year))].sort();
  for (const year of years) {
    for (const region of ['EU', 'NA', 'CN']) {
      const rows = pmo.rate_cards.filter((r) => r.year === year && r.region === region);
      if (!rows.length) continue;
      add(`pmo/rate-cards/${year}-${region}.csv`,
        `# Vantis Steering Systems — approved engineering rates\n` +
        `# year: ${year}   region: ${region}\n` +
        `# approved by: ${h.pick(PEOPLE)[0]} (finance)   date: ${on(year - 1, 11, h.int(1, 28))}\n` +
        `# rates are fully loaded and include overhead. Do not add a multiplier.\n` +
        `discipline,rate_eur_per_hour\n` +
        rows.map((r) => `${r.discipline},${Number(r.rate_eur_per_hour).toFixed(2)}`).join('\n'));
    }
  }

  // ── bottom-up estimates ──────────────────────────────────────────────────
  //
  // What somebody built BEFORE the work, by hand, in a spreadsheet. The
  // interesting thing about these is how often they disagree with what the
  // history would have said.

  for (const prog of h.sample(crm.programs, 34)) {
    const rows = ['work_package,discipline,hours,basis,confidence'];
    for (let i = 0; i < h.int(6, 16); i++) {
      rows.push([
        h.pick(['assist tuning', 'gearbox change', 'ECU integration', 'safety case', 'EOL calibration',
          'diagnostics', 'motor control', 'harness', 'validation', 'HIL rig update', 'rack redesign']),
        h.pick(['systems', 'software', 'hardware', 'calibration', 'validation', 'safety', 'pm']),
        String(h.int(20, 900)),
        h.pick(['similar to H1', 'engineering judgement', 'supplier quote', 'from the last programme', 'guess']),
        h.pick(['high', 'medium', 'medium', 'low']),
      ].join(','));
    }
    add(`pmo/estimates/${prog.program_id}-estimate.csv`,
      `# bottom-up estimate, built before nomination\n` +
      `# author: ${h.pick(PEOPLE)[0]}   date: ${h.dayBetween(-2_400, -80)}\n` +
      `# "basis" is free text. It is the only record of WHERE a number came from.\n` +
      rows.join('\n'));
  }

  return files;
}

/**
 * The classification, in prose — never as a field.
 *
 * `vst_pmo.change_class`, `element_kind` and `safety_case_impact` are the three
 * columns the whole cost answer is filtered on. In the raw documents they do
 * not exist. They are sentences like "the housing was modified" and "no change
 * to the safety argument was required", and extracting them is the hardest
 * single job in this estate.
 */
function classificationProse(
  h: { pick<T>(a: readonly T[]): T; chance(p: number): boolean },
  e: { change_class: string; element_kind: string; safety_case_impact: boolean; asil: string; reuse_class: string; tooling_required: boolean; interfaces_touched: number },
  isOutlier: boolean,
): string {
  const what: Record<string, string[]> = {
    reuse_as_is: ['Carried over unchanged from the previous programme.', 'No engineering change; the existing design was adopted as-is.'],
    recalibrate: ['Existing function retuned for this vehicle. No code change.', 'Calibration only — the software was not modified.'],
    validation_only: ['Re-validation of an unchanged design against the new conditions.', 'Test campaign only; no design change.'],
    integration_only: ['Integration of existing components into the new platform build.', 'No new function. Integration and bring-up only.'],
    modify_function: ['An existing function was modified.', 'Changes were made to the existing control software.'],
    safety_case_only: ['The design was unchanged. The safety argument was rebuilt.', 'No functional change. The work was the safety case: requirements, evidence and the argument itself.'],
    modify_hardware: ['The existing hardware was modified.', 'A change to the existing mechanical design.'],
    new_function: ['A new function was developed from scratch.', 'New software, no predecessor to carry over.'],
    new_hardware: ['A new component was designed.', 'New hardware, developed from a blank sheet.'],
  };
  const kind: Record<string, string> = {
    sensor: 'the torque sensor', ecu: 'the ECU', motor: 'the assist motor',
    gearbox: 'the gearbox', mechanical: 'the rack and housing', software_domain: 'the control software',
  };

  const parts: string[] = [];
  parts.push(`${h.pick(what[e.change_class] ?? ['Engineering work was carried out.'])} The work was on ${kind[e.element_kind] ?? 'the system'}.`);

  if (isOutlier) {
    parts.push('This report also covers the transfer of production to the new line, which was booked here for want of a separate code.');
  }

  parts.push(e.safety_case_impact
    ? h.pick([
      `Because the change touched the ASIL ${e.asil} path, the safety case had to be reworked and re-assessed.`,
      `A full safety argument was produced again for this change; the previous decomposition could not be inherited.`,
    ])
    : h.pick([
      'No change to the safety argument was required.',
      'The existing safety case remained valid and was not reopened.',
      'Assessed as having no safety impact at the change review.',
    ]));

  if (e.tooling_required) parts.push('Tooling was modified and re-qualified.');
  if (e.interfaces_touched > 0) parts.push(`${e.interfaces_touched} interface(s) were affected.`);

  return wrapText(parts.join(' '), 68, '   ').trimStart();
}

function wrapText(s: string, n: number, indent: string): string {
  const out: string[] = [];
  let cur = '';
  for (const word of s.split(/\s+/)) {
    if ((cur + ' ' + word).trim().length > n) { out.push(cur.trim()); cur = word; } else cur += ' ' + word;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((l, i) => (i === 0 ? l : indent + l)).join('\n');
}
