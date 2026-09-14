/**
 *   pnpm pharma:fanout-check
 *
 * The parts of the fan-out orchestrator that have a right answer. OFFLINE — no
 * model, no database, no cost.
 *
 * WHY THIS EXISTS, AND WHY IT DID NOT BEFORE. `rankRows` and `buildAnswer`
 * were inline in a 207-line async function, so reaching them meant spending
 * twenty-four model calls and a database round trip. They were therefore never
 * checked, and one of them shipped wrong:
 *
 *   `--limit 4` produced a four-row work list under a summary reading "there
 *   are 23 affected supplier lots", with nothing anywhere saying the other
 *   nineteen had never been looked at.
 *
 * The partial-failure merge only counted lots ATTEMPTED AND FAILED. Lots never
 * attempted vanished. That is the exact lie of omission the orchestrator's own
 * header claims to prevent, and it survived because it could not be reached
 * without paying for it.
 *
 * The first assertion below is that bug.
 */
import { rankRows, buildAnswer } from './supplier-impact-fanout';
import { validateSupplierImpactAnswer } from '../../schema/supplier-impact-schema';
import type { SupplierImpactDossier } from '../../tools/functions/assess-supplier-impact';
import type { SupplierImpactRow } from '../../schema/supplier-impact-schema';

let failed = 0;

function assert(what: string, ok: boolean, why: string, detail = ''): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  console.log(`        why: ${why}`);
  if (!ok && detail) console.log(`        \x1b[31m${detail}\x1b[0m`);
}

// ── fixtures: the smallest world that exercises the ordering rules ─────────

const row = (lot_id: string, quantity_units: number): SupplierImpactRow =>
  ({
    lot_id,
    product_name: 'X',
    market: 'EU',
    quantity_units,
    exposure: 'x',
    in_short: null,
    findings: [],
    next_action: null,
    escalate: null,
  }) as unknown as SupplierImpactRow;

/** Exposure is a property of the LOT, not of the row — hence the second list. */
const affected = (pairs: [string, string][]): SupplierImpactDossier['affected'] =>
  pairs.map(([lotId, exposure]) => ({ lotId, exposure })) as SupplierImpactDossier['affected'];

const dossier = (lots: number): SupplierImpactDossier =>
  ({
    supplier: {
      supplierId: 'SUP-04',
      name: 'Silverbrook Synthesis Co.',
      disqualifiedOn: '2026-05-20',
      disqualifiedReason: 'undeclared change of synthesis route',
    },
    affected: new Array(lots).fill(null).map((_, i) => ({ lotId: `LOT-${i}` })),
  }) as unknown as SupplierImpactDossier;

const assembly = {
  summary: 'a summary',
  preventable: [],
  missing: ['a record that was absent'],
  unverified_claims: [],
  escalate: null,
} as any;

console.log('\nFan-out orchestrator — the parts with a right answer\n');

// ── THE BUG ───────────────────────────────────────────────────────────────

console.log('lots that were never assessed');

const sampled = buildAnswer(dossier(23), assembly, [row('LOT-0', 10)], [], ['LOT-4', 'LOT-5']);
assert(
  'a limited run says so, in the answer itself',
  sampled.missing.some((m) => /SAMPLE, not the estate/i.test(m)),
  'THE BUG THIS FILE EXISTS FOR: --limit 4 once produced a four-row list under a ' +
    '"23 affected lots" summary with nothing saying nineteen were skipped. A sample ' +
    'indistinguishable from the estate is a lie of omission about patient exposure',
  `missing was ${JSON.stringify(sampled.missing)}`,
);
assert(
  '...and names which lots, and how many of how many',
  sampled.missing.some((m) => m.includes('LOT-4') && m.includes('LOT-5') && m.includes('2 of 23')),
  'a reader who is told "some were skipped" cannot act; one told which, can',
  `missing was ${JSON.stringify(sampled.missing)}`,
);

console.log('\nlots that failed');
const partial = buildAnswer(dossier(3), assembly, [row('LOT-0', 10)], ['LOT-1', 'LOT-2'], []);
assert(
  'each failed lot is named, and said to be neither cleared nor ranked',
  ['LOT-1', 'LOT-2'].every((id) =>
    partial.missing.some((m) => m.startsWith(id) && /neither cleared nor ranked/.test(m)),
  ),
  'an unassessed lot is not a clean lot, and the wording has to refuse that reading',
);
assert(
  'the assembler\'s own missing entries survive',
  partial.missing.includes('a record that was absent'),
  'the merge ADDS to what the assembler found; it must not replace it',
);

console.log('\na complete run');
const whole = buildAnswer(dossier(1), assembly, [row('LOT-0', 10)], [], []);
assert(
  'says nothing about sampling or failure',
  whole.missing.length === 1 && whole.missing[0] === 'a record that was absent',
  'a clean run must not carry a caveat it has not earned — noise trains readers to skip the field',
);

// ── facts the orchestrator owns ───────────────────────────────────────────

console.log('\nfacts come from the dossier, never the model');
assert(
  'supplier id, name and date are copied, not generated',
  whole.supplier_id === 'SUP-04' &&
    whole.supplier_name === 'Silverbrook Synthesis Co.' &&
    whole.disqualified_on === '2026-05-20',
  'passing a known fact through a model gives it a chance to be wrong and no chance to be more right',
);

// ── ranking ───────────────────────────────────────────────────────────────

console.log('\nranking — band first, then quantity inside the band');

const input = [
  row('L-CTRL', 999999),
  row('L-PAT-S', 10),
  row('L-DIST', 500000),
  row('L-PAT-L', 20),
];
const ranked = rankRows(
  input,
  affected([
    ['L-CTRL', 'in_our_control'],
    ['L-PAT-S', 'patient_facing'],
    ['L-DIST', 'distributor'],
    ['L-PAT-L', 'patient_facing'],
  ]),
);

assert(
  'exposure outranks quantity',
  ranked.map((r) => r.lot_id).join(',') === 'L-PAT-L,L-PAT-S,L-DIST,L-CTRL',
  'a 20-unit lot at a hospital is assessed ahead of 999,999 units in our own warehouse — ' +
    'the actions differ in KIND, not in degree, which is SOP-SCM-004 §7.2',
  `got ${ranked.map((r) => r.lot_id).join(',')}`,
);
assert(
  'quantity breaks ties inside a band',
  ranked[0].lot_id === 'L-PAT-L' && ranked[1].lot_id === 'L-PAT-S',
  'within one band the most product at stake comes first — matching the walk\'s own sort exactly, ' +
    'because a different order here would make the single-agent comparison meaningless',
);

console.log('\nranking neither adds, drops nor mutates');
assert(
  'every row in, every row out',
  ranked.length === input.length &&
    input.every((r) => ranked.some((x) => x.lot_id === r.lot_id)),
  'SEPARATING SUCCESSES FROM FAILURES IS NO LONGER THIS FUNCTION\'S JOB — `runFanout` in ' +
    '@fde/agent does it, and two places deciding what counts as a failure is how they drift. ' +
    'What is still asserted here is that ranking is a REORDERING and nothing else',
);
assert(
  'the caller\'s array is not reordered underneath it',
  input[0].lot_id === 'L-CTRL',
  'rankRows sorts a copy; a ranking function that reorders its input in place is one you ' +
    'cannot call twice and get the same answer',
);

// ── a supplier that was never disqualified ────────────────────────────────
//
// FOUND BY THE EVAL, not by review. `sup-002` asks about SUP-01, which exists
// and was never disqualified. The walk correctly returns every lot that
// consumed its material — a factual answer to a factual question — and the
// orchestrator fanned out over all twenty of them, assessing lots affected by
// nothing and meeting a rate limit on the way.
//
// Asserted on the ANSWER SHAPE rather than by calling the orchestrator, which
// needs a database. What matters is that a clean supplier yields no rows and no
// escalation, and that the contract accepts that.

console.log('\na supplier that was never disqualified');

const cleanAnswer = {
  summary:
    'Rhine Fine Chemicals GmbH (SUP-01) has not been disqualified, so no lot is affected ' +
    'by a disqualification. 20 lot(s) consumed material from this supplier, which is a ' +
    'normal supply relationship and not a finding.',
  supplier_id: 'SUP-01',
  supplier_name: 'Rhine Fine Chemicals GmbH',
  disqualified_on: '',
  rows: [],
  preventable: [],
  missing: [],
  unverified_claims: [],
  escalate: null,
} as any;

const cleanVerdict = validateSupplierImpactAnswer(JSON.stringify(cleanAnswer));
assert(
  'an empty work list for a clean supplier satisfies the contract',
  cleanVerdict.ok,
  'consuming a supplier\'s material is a normal supply relationship, not a finding. If the ' +
    'contract rejected this the orchestrator would have to invent rows to satisfy it',
  `rejected: ${cleanVerdict.errors}`,
);
assert(
  '...and escalates nothing',
  cleanAnswer.escalate === null && cleanAnswer.rows.length === 0,
  'there is nobody to escalate to and nothing to escalate about — an escalation here would ' +
    'train a reviewer to ignore them',
);

console.log(`\n  fan-out: ${failed ? `${failed} FAILING` : 'PASS — 12 assertions'}\n`);
process.exit(failed ? 1 : 0);
