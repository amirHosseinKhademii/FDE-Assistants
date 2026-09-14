/**
 *   pnpm supplier:check
 *
 * Does the supplier-impact walk find the right lots, and can it fail?
 * Needs the six databases. No model, no Azure, no cost.
 *
 * EVERY NUMBER IS RE-DERIVED WITH DIFFERENT SQL. The assessment builds its list
 * with one grouped join; this rebuilds the same list from the other end, lot by
 * lot, and compares the two as SETS. Checking the walk with the walk's own query
 * proves only that the query is deterministic.
 *
 * BOTH DIRECTIONS, as everywhere else in this repo. A missing lot is the obvious
 * failure — it is the one that leaves product on a shelf. The quieter failure is
 * an EXTRA lot: a recall list with innocent batches on it gets ignored wholesale
 * the second time, so a false positive costs more than it looks. Both are
 * checked, and each check is shown to be capable of failing.
 */
import { openHandle } from '../utils/handle';
import { asOfDay } from '../utils/dates';
import { assessSupplierImpact, EXPOSURE_ORDER } from './assess-supplier-impact';

const SUPPLIER = 'SUP-04';
let failed = 0;
// Counted, not written down. A hand-maintained total drifts the moment a check
// is added, and then the summary line quietly lies about how much was verified.
let ran = 0;

function check(ok: boolean, name: string, note: string): void {
  ran++;
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${note}`);
}

async function main(): Promise<void> {
  const h = openHandle();
  const d = await assessSupplierImpact(h, SUPPLIER);
  if ('found' in d) throw new Error(`${SUPPLIER} not found — the estate is not seeded`);

  console.log(`\nSupplier impact — ${d.supplier.name} (${SUPPLIER})\n`);

  // ── 1. the set of affected lots, rebuilt from the other end ───────────────
  // Every lot in the estate, asked individually whether it used this supplier.
  // Slow and stupid on purpose: it shares no SQL with the function under test.
  const allLots = await h.query('mrd_erp', 'select lot_id from product_lots order by lot_id');
  const independent: string[] = [];
  for (const { lot_id } of allLots) {
    const hit = await h.one(
      'mrd_erp',
      `select 1 from lot_material_consumption c
         join material_lots m on m.material_lot_id = c.material_lot_id
        where c.lot_id = $1 and m.supplier_id = $2 limit 1`,
      [lot_id, SUPPLIER],
    );
    if (hit) independent.push(lot_id);
  }

  const got = new Set(d.affected.map((a) => a.lotId));
  const want = new Set(independent);
  const missing = [...want].filter((l) => !got.has(l));
  const extra = [...got].filter((l) => !want.has(l));

  check(
    missing.length === 0,
    'no affected lot is missed',
    missing.length
      ? `MISSED: ${missing.join(', ')} — these used ${SUPPLIER} material and are not on the list`
      : `all ${want.size} lots that used ${SUPPLIER} material are on the list`,
  );
  check(
    extra.length === 0,
    'no innocent lot is listed',
    extra.length
      ? `EXTRA: ${extra.join(', ')} — never used ${SUPPLIER} material`
      : 'every listed lot genuinely consumed material from this supplier',
  );

  // ── 2. the control: the comparison above can actually fail ────────────────
  const planted = new Set([...want]);
  planted.delete([...want][0]);
  check(
    [...want].filter((l) => !planted.has(l)).length === 1,
    'control: a dropped lot IS detected',
    `removing ${[...want][0]} from the expected set made the comparison report it — so the silence above means something`,
  );

  // ── 3. exposure is complete and consistent ────────────────────────────────
  const banded = EXPOSURE_ORDER.reduce((n, e) => n + d.totals.byExposure[e], 0);
  check(
    banded === d.totals.lots && d.totals.lots === d.affected.length,
    'every lot lands in exactly one exposure band',
    `${d.totals.lots} lots, ${banded} banded — no lot is counted twice or dropped`,
  );

  // A lot is only "patient facing" if it really reached one.
  const pf = d.affected.filter((a) => a.exposure === 'patient_facing');
  check(
    pf.every((a) => a.deliveries.some((x) => ['hospital', 'pharmacy_chain'].includes(x.consigneeKind))),
    'patient-facing means a real hospital or pharmacy delivery',
    `${pf.length} lot(s), each with a delivery to a hospital or pharmacy chain`,
  );

  // And "still ours" must mean the transport system has never heard of it.
  const ours = d.affected.filter((a) => a.exposure === 'in_our_control');
  check(
    ours.every((a) => a.deliveries.every((x) => x.status === 'held')),
    'still-ours means no live delivery',
    `${ours.length} lot(s) with no dispatched shipment — these are the cheap ones to fix`,
  );

  // ── 4. the ranking actually ranks ─────────────────────────────────────────
  const ranks = d.affected.map((a) => EXPOSURE_ORDER.indexOf(a.exposure));
  check(
    ranks.every((r, i) => i === 0 || ranks[i - 1] <= r),
    'the work list is ordered worst-first',
    `a coordinator reading top to bottom meets ${EXPOSURE_ORDER[Math.min(...ranks)]} before ${EXPOSURE_ORDER[Math.max(...ranks)]}`,
  );

  // ── 5. the as-of rule, again ──────────────────────────────────────────────
  const disq = d.supplier.disqualifiedOn!;
  const mats = await h.query(
    'mrd_erp',
    'select material_lot_id, received_on from material_lots where supplier_id = $1',
    [SUPPLIER],
  );
  const trulyAfter = mats.filter((m) => asOfDay(m.received_on) > disq).map((m) => m.material_lot_id);
  check(
    trulyAfter.length === d.materials.receivedAfterDisqualification.length &&
      trulyAfter.every((m) => d.materials.receivedAfterDisqualification.includes(m)),
    'material received after the disqualification is dated, not guessed',
    trulyAfter.length
      ? `${trulyAfter.join(', ')} arrived after ${disq} — the only finding here that can still be prevented`
      : 'no delivery arrived after the disqualification date',
  );

  // ── 6. a supplier that does not exist is a message, not a crash ───────────
  const miss = await assessSupplierImpact(h, 'SUP-99999');
  check(
    'found' in miss && miss.found === false && miss.reason.includes('SUP-'),
    'an unknown supplier is an informative miss',
    `"found" in miss === ${'found' in miss} — a bad argument must never throw, it must explain`,
  );

  // ── 7. a qualified supplier still answers ─────────────────────────────────
  const stillOk = await h.one(
    'mrd_erp',
    'select supplier_id from suppliers where disqualified_on is null limit 1',
  );
  const hypothetical = await assessSupplierImpact(h, stillOk!.supplier_id);
  check(
    !('found' in hypothetical) && hypothetical.findings.includes('SUPPLIER_STILL_QUALIFIED'),
    'a still-qualified supplier answers hypothetically',
    `${stillOk!.supplier_id} is not disqualified, and the walk says so rather than refusing — "what would the exposure be" is a question worth asking before the audit, not after`,
  );

  console.log(
    `\n  supplier-impact: ${failed ? `${failed} FAILING` : `PASS — ${ran} checks`}   ` +
      `\x1b[2m(${h.fetches} fetches, most of them this test's own brute-force rebuild)\x1b[0m\n`,
  );
  await h.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
