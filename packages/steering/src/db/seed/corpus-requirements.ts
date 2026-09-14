/**
 * REQUIREMENTS, AS DOCUMENTS. The raw source that `vst_alm` is extracted FROM.
 *
 * OWN RANDOM STREAM (`SEEDS.corpusRequirements`).
 *
 * ── THE RE-ROOT, AND WHY IT MATTERS ───────────────────────────────────────
 *
 * The first version of this estate put requirements straight into a database
 * with `attribute`, `value_num` and `unit` columns already filled in. That was
 * a fiction, and an expensive one: nobody's requirements arrive as rows. They
 * arrive as a specification document — a Word file exported to something, with
 * tables, prose, numbering that restarts halfway through, and units that change
 * between sections.
 *
 * TURNING THEM INTO ROWS IS THE JOB. It is not setup that happens before the
 * interesting work; it IS the interesting work, and modelling it away meant the
 * estate quietly answered the hardest question for us.
 *
 * So: the documents below are the customer's reality. `vst_alm` is the
 * structured view we produce from them. Both are generated from the same
 * underlying facts, which is what makes "did the extraction get it right" a
 * question with a checkable answer.
 *
 * ── THE MESS IS THE SPECIFICATION ─────────────────────────────────────────
 *
 * Every item here is a real thing that real requirement documents do, and each
 * one breaks a different naive parser:
 *
 *   · the same quantity written three ways — "8000 N", "8 kN", "8.0kN"
 *   · requirement ids in a table column in one section, inline in prose in
 *     another, and missing entirely from a third
 *   · a requirements TABLE in one document and a numbered LIST in the next
 *   · "shall" / "should" / "must" used interchangeably despite a definitions
 *     section that says they mean different things
 *   · a revision bar convention (`|` in the margin) that marks changed rows in
 *     some revisions and was forgotten in others
 *   · TBD and TBC left in, with and without owners
 *   · a trace matrix exported half-filled, because it always is
 *   · one requirement stated twice in the same document with different numbers
 *
 * NONE OF IT IS NOISE FOR ITS OWN SAKE. A corpus that is uniformly clean proves
 * nothing about an extractor.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS } from './anchors';
import type { CorpusFile } from './corpus';
import type { Alm, Crm } from '../schema/rows';

/** The three ways a force gets written down in one company. */
function writeForce(h: { int(a: number, b: number): number }, n: number): string {
  const style = h.int(1, 3);
  if (style === 1) return `${n} N`;
  if (style === 2) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} kN`;
  return `${(n / 1000).toFixed(1)}kN`;
}

const MODALS = ['shall', 'shall', 'shall', 'must', 'should'];

export function buildRequirementDocs(crm: Crm, alm: Alm): CorpusFile[] {
  const h = makeHelpers(SEEDS.corpusRequirements);
  const files: CorpusFile[] = [];
  const add = (path: string, content: string): void => {
    files.push({ path, content: `${content.replace(/^\n/, '').trimEnd()}\n` });
  };

  const specs = alm.spec_documents;
  const revsBySpec = new Map<string, typeof alm.spec_revisions>();
  for (const r of alm.spec_revisions) {
    revsBySpec.set(r.spec_id, [...(revsBySpec.get(r.spec_id) ?? []), r]);
  }
  const crsBySpec = new Map<string, typeof alm.customer_requirements>();
  for (const c of alm.customer_requirements) {
    crsBySpec.set(c.spec_id, [...(crsBySpec.get(c.spec_id) ?? []), c]);
  }
  const versByCr = new Map<string, typeof alm.customer_requirement_versions>();
  for (const v of alm.customer_requirement_versions) {
    versByCr.set(v.cr_id, [...(versByCr.get(v.cr_id) ?? []), v]);
  }

  // ── the customer requirement specifications ──────────────────────────────

  for (const spec of specs) {
    const prog = crm.programs.find((p) => p.program_id === spec.program_ref);
    const cust = crm.customers.find((c) => c.customer_id === spec.customer_ref);
    const revs = (revsBySpec.get(spec.spec_id) ?? []).slice().sort((a, b) =>
      String(a.revision).localeCompare(String(b.revision)));
    const crs = crsBySpec.get(spec.spec_id) ?? [];
    const dir = `requirements/${spec.program_ref}`;

    for (const rev of revs) {
      const tag = String(rev.revision).replace(/\s+/g, '');
      // Half the documents lay their requirements out as a TABLE and half as a
      // numbered LIST. One extractor has to cope with both, and which one a
      // programme used is a decision somebody made in 2015 and nobody revisited.
      const asTable = h.chance(0.55);
      const marksChanges = h.chance(0.6);
      const rows: string[] = [];

      crs.forEach((cr, i) => {
        const v = (versByCr.get(cr.cr_id) ?? []).find((x) => x.spec_revision_id === rev.spec_revision_id);
        if (!v) return;
        const prev = (versByCr.get(cr.cr_id) ?? []).find((x) => x.spec_revision_id !== rev.spec_revision_id);
        const changed = prev && Number(prev.value_num) !== Number(v.value_num);
        // THE REVISION BAR, AND AN ACCIDENT MADE DELIBERATE.
        //
        // A `|` in the first cell of a markdown table row adds a column, so a
        // changed row comes out RAGGED — one field wider than the header. That
        // was not designed; it fell out of using the conventional margin bar
        // character inside a pipe table.
        //
        // It is kept, because it is precisely what happens when a Word document
        // with revision bars is exported to anything: the marker survives and
        // the structure does not. A parser that assumes a fixed column count
        // mis-reads exactly the rows that CHANGED, which is the worst possible
        // subset to get wrong.
        //
        // Kept on purpose is not the same as left by accident, so it is written
        // down here and asserted in `corpus-check`.
        const bar = marksChanges && changed ? '|' : ' ';
        const modal = h.pick(MODALS);

        // The value, written the way that section happens to write it.
        let value = '';
        if (v.value_num !== null && cr.unit) {
          value = cr.unit === 'N' ? writeForce(h, Number(v.value_num))
            : `${Number(v.value_num)} ${cr.unit}`;
        }

        // TBD happens, and sometimes nobody owns it.
        const tbd = h.chance(0.04);
        const shown = tbd ? (h.chance(0.5) ? 'TBD' : `TBD (${h.pick(['owner: chassis', 'owner: TBC', 'see §12'])})`) : value;

        if (asTable) {
          rows.push(`| ${bar} | ${cr.cr_id} | ${cr.section} | ${cr.title} | ${v.operator ?? ''} ${shown} | ${v.verification_method} | ${v.asil} | ${v.priority} |`);
        } else {
          // In list form the id sometimes only appears in the prose, and
          // sometimes not at all — which is the hard case.
          const idInProse = h.chance(0.7);
          rows.push(
            `${bar} ${i + 1}. ${idInProse ? `[${cr.cr_id}] ` : ''}${cr.title}. ` +
            `The system ${modal} achieve ${shown}${v.condition ? `, ${v.condition}` : ''}. ` +
            `(${v.verification_method}, ASIL ${v.asil})`);
        }
      });

      // ONE REQUIREMENT STATED TWICE, with different numbers, in the K2 spec.
      // Real documents do this when a section is copied and then one copy is
      // updated. Whichever the extractor takes, it should notice there are two.
      const duplicate = spec.spec_id === ANCHORS.spec && rev.spec_revision_id === ANCHORS.revB;

      add(`${dir}/${spec.spec_id.replace(/\s+/g, '_')}_${tag}.md`, `
${'='.repeat(72)}
${cust?.name ?? spec.customer_ref} — CONFIDENTIAL
${spec.title}
Document: ${spec.spec_id}     Revision: ${rev.revision}
Issued:   ${rev.received_on}          Effective: ${rev.effective_from}
${rev.effective_to ? `SUPERSEDED: ${rev.effective_to} — see the later revision` : 'Status: IN FORCE'}
${'='.repeat(72)}

1. SCOPE

   This specification covers the electric power steering system for the
   ${prog?.model ?? ''} programme (${prog?.eps_architecture ?? ''}, ${prog?.segment ?? ''} segment).
   Start of production ${prog?.sop_on ?? 'TBC'}.

2. DEFINITIONS

   shall   mandatory. Non-compliance requires a written concession.
   should  recommended. Deviation requires justification at the design review.
   must    mandatory.

   ${h.chance(0.5) ? '(Note: earlier sections of this document use "must" and "shall"\n   interchangeably. Both are mandatory.)' : ''}

3. CHANGE RECORD

${revs.map((r) => `   ${r.revision}   ${r.received_on}   ${r.change_note ?? '—'}`).join('\n')}

${marksChanges ? '   Changed requirements are marked with a bar in the left margin.' : ''}

4. REQUIREMENTS

${asTable ? `| ${' '} | ID | § | Title | Value | Verif. | ASIL | Class |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}` : rows.join('\n\n')}

${duplicate ? `
4.9 ADDITIONAL — STEERING EFFORT (added at the ${rev.revision} review)

    The steering wheel torque at 30 degrees of steering wheel angle shall not
    exceed 2.9 Nm.

    [NOTE: this restates §4.3.1 with a different figure. §4.3.1 says 2.7 Nm.
     Raised with the customer ${on(2026, 8, 20)}, no response at time of issue.]
` : ''}

5. VERIFICATION

   Verification method per requirement is given above. Where the method is
   "test", the supplier ${h.pick(MODALS)} provide a test report referencing this
   document and the requirement identifier.

END OF DOCUMENT
`);
    }

    // ── the trace matrix, exported half-filled, because it always is ───────
    const srs = alm.system_requirements.filter((s) => s.program_ref === spec.program_ref);
    const traces = alm.trace_cr_sr.filter((t) => crs.some((c) => c.cr_id === t.cr_id));
    const matrix = ['customer_req,system_req,coverage,notes'];
    for (const c of crs) {
      const mine = traces.filter((t) => t.cr_id === c.cr_id);
      if (!mine.length) {
        // The honest hole: a requirement with no link, exported as a blank row.
        matrix.push(`${c.cr_id},,,${h.chance(0.5) ? 'not yet allocated' : ''}`);
        continue;
      }
      for (const t of mine) {
        matrix.push(`${c.cr_id},${t.sr_id},${t.coverage},${h.chance(0.15) ? '"reviewed, see minutes"' : ''}`);
      }
    }
    add(`${dir}/trace-matrix-${spec.spec_id.replace(/\s+/g, '_')}.csv`,
      `# exported from the requirements tool ${on(2026, 9, h.int(1, 12))}\n` +
      `# WARNING: rows with an empty system_req are NOT errors in the export.\n` +
      `# They are requirements nobody has allocated yet.\n${matrix.join('\n')}`);

    // ── the system requirements document (SYS.2) ──────────────────────────
    if (srs.length) {
      const srvBySr = new Map(alm.system_requirement_versions.map((v) => [v.sr_id, v]));
      add(`${dir}/system-requirements-${spec.program_ref}.md`, `
# System Requirements Specification — ${prog?.model ?? spec.program_ref}
**Internal document** · Vantis Steering Systems · Revision ${h.int(1, 5)}
**Derived from:** ${spec.spec_id} ${revs[revs.length - 1]?.revision ?? ''}
**Owner:** systems engineering

## 1. Purpose

Transforms the customer requirements in ${spec.spec_id} into requirements on
the Vantis system. Every requirement below either traces to a customer
requirement or is marked DERIVED with its rationale.

## 2. Requirements

${srs.map((sr) => {
  const v = srvBySr.get(sr.sr_id);
  const parents = alm.trace_cr_sr.filter((t) => t.sr_id === sr.sr_id).map((t) => t.cr_id);
  return `### ${sr.sr_id} — ${sr.title}

${v?.text_body ?? ''}

- attribute: ${sr.attribute ?? '(prose only)'}${sr.unit ? ` [${sr.unit}]` : ''}
- ASIL: ${v?.asil ?? '?'} · verification: ${v?.verification_method ?? '?'} · owner: ${sr.owner_discipline}
- traces to: ${parents.length ? parents.join(', ') : '**DERIVED — no customer parent**'}
- rationale: ${sr.derivation_note ?? '(none recorded)'}`;
}).join('\n\n')}

## 3. Open items

${h.sample(srs, Math.min(srs.length, h.int(1, 4))).map((sr) =>
  `- ${sr.sr_id}: ${h.pick([
    'value TBC pending the customer response on the test condition',
    'ASIL to be confirmed after the hazard analysis update',
    'may be merged with a neighbouring requirement at the next review',
    'verification method disputed — analysis vs test',
  ])}`).join('\n')}
`);
    }

    // ── the architecture document (SYS.3) ─────────────────────────────────
    const archs = alm.architecture_versions.filter((a) => a.program_ref === spec.program_ref);
    const baselined = archs.find((a) => a.status === 'baselined');
    if (baselined) {
      const els = alm.elements.filter((e) => e.arch_id === baselined.arch_id);
      const allocs = alm.activity_allocations.filter((a) => els.some((e) => e.element_id === a.element_id));
      const ifaces = alm.interfaces.filter((i) => i.arch_id === baselined.arch_id);
      add(`${dir}/architecture-${spec.program_ref}.md`, `
# System Architectural Design — ${prog?.model ?? spec.program_ref}
**Baseline:** ${baselined.arch_id} · created ${baselined.created_on} · ${baselined.status}
${baselined.supersedes ? `**Supersedes:** ${baselined.supersedes}` : ''}

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
${els.map((e) => `| ${e.element_id} | ${e.kind} | ${e.make_buy} | ${e.asil} | ${e.part_ref ?? '—'} | ${e.reuse_class} |`).join('\n')}

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
${allocs.map((a) => `| ${a.activity_id} | ${a.element_id} | ${a.allocation_type} |`).join('\n')}

## 3. Interfaces

${ifaces.length ? `| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
${ifaces.map((i) => `| ${i.from_element} | ${i.to_element} | ${i.kind} | ${i.signal} | ${i.rate_ms ?? '—'} ms | ${i.asil} |`).join('\n')}` : '(not yet documented for this baseline)'}

## 4. Requirements allocated to elements

${alm.trace_sr_element.filter((t) => els.some((e) => e.element_id === t.element_id))
  .map((t) => `- ${t.sr_id} → ${t.element_id}`).join('\n') || '(allocation table not exported)'}
`);
    }

    // ── review minutes, because a spec is never read in silence ───────────
    if (h.chance(0.55)) {
      add(`${dir}/review-notes-${spec.program_ref}.md`, `
# Requirements review — ${prog?.model ?? spec.program_ref}
**Date:** ${h.dayBetween(-2_200, -60)} · **Chair:** ${h.pick(['M. Lindqvist', 'A. Kovac', 'S. Beker', 'J. Moreau'])}

Attendees: ${h.sample(['systems', 'software', 'hardware', 'safety', 'calibration', 'purchasing', 'PM'], h.int(3, 6)).join(', ')}

## Points raised

${h.sample([
  'The rack force figure is stated at the rack in §4.1 and at the motor in §5.2. These are not the same number and the document does not say which governs.',
  'Verification method for the on-centre requirements is "test" but no test condition is given for the 0 to 20 km/h range.',
  'Two requirements cover assist cut-off. One says taper, one says step. Taper assumed.',
  'ASIL allocation for the damping path is inherited from the previous programme. Somebody should check whether that inheritance is still valid.',
  'The customer has not responded on the TBD items. Proceeding on the assumption they will land close to the previous programme.',
  'Mass target looks aggressive against the force class. Flagged to purchasing, not resolved here.',
], h.int(2, 5)).map((p, i) => `${i + 1}. ${p}`).join('\n\n')}

## Actions

${h.sample([
  'Raise a question to the customer on the measurement point. — systems',
  'Check the ASIL inheritance against the current safety concept. — safety',
  'Estimate the cost of the aggressive mass target. — hardware, PM',
  'No action; noted for the next revision.',
], h.int(1, 3)).map((a) => `- ${a}`).join('\n')}
`);
    }
  }

  return files;
}
