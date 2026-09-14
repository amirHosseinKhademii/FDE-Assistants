/**
 *   pnpm db:supplier-impact SUP-04
 *
 * The work list a recall coordinator currently assembles by hand, across four
 * systems, over about a day.
 *
 * NO MODEL AND NO COST. Every line below is a fact from the estate or a
 * consequence of one, decided in code. That is deliberate and it is the same
 * order the release bottleneck was built in: make the walk correct first, where
 * it can be checked against the database by hand, and only then hand it to a
 * model to explain and prioritise. A model on top of a wrong walk is a
 * confident wrong answer.
 *
 * PRINTING ONLY — there is no SQL in this file. The fetching is `tools/`, the
 * judgement is `tools/functions/assess-supplier-impact.ts`, and what is left
 * here is deciding what a person sees first.
 */
import { openHandle } from '../tools/utils/handle';
import {
  assessSupplierImpact,
  EXPOSURE_ORDER,
  type Exposure,
  type AffectedLotAssessment,
} from '../tools/functions/assess-supplier-impact';

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const amber = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

/**
 * What each band means in a sentence, and what it costs to deal with.
 *
 * THE WORDING IS THE POINT. "patient_facing" is a field name; "it reached a
 * hospital or a pharmacy chain" is what makes somebody pick up a telephone.
 */
const BAND: Record<Exposure, { title: string; note: string; paint: (s: string) => string }> = {
  patient_facing: {
    title: 'Reached a hospital or pharmacy chain',
    note: 'Closest to a patient. Needs a person today.',
    paint: red,
  },
  distributor: {
    title: 'Reached a wholesaler',
    note: 'Out of our hands but still in the supply chain — recoverable through the distributor.',
    paint: red,
  },
  in_transit: {
    title: 'On a lorry now',
    note: 'The cheapest thing on this page to fix: the shipment can still be stopped.',
    paint: amber,
  },
  in_our_control: {
    title: 'Never shipped — still ours',
    note: 'Quarantine in place. No external notification needed for these.',
    paint: amber,
  },
  expired: {
    title: 'Past expiry',
    note: 'No longer a live exposure. Listed for the record, not for action.',
    paint: dim,
  },
};

function printLot(a: AffectedLotAssessment): void {
  console.log(`  ${bold(a.lotId)}  ${a.productName}`);
  console.log(
    dim(
      `      ${a.market} · ${a.status} · made ${a.manufacturedOn} · expires ${a.expiryOn} · ` +
        `${a.quantityUnits.toLocaleString()} units`,
    ),
  );
  for (const d of a.deliveries) {
    const when = d.deliveredOn ? `delivered ${d.deliveredOn}` : `dispatched ${d.dispatchedOn}`;
    console.log(
      `      → ${d.consigneeName} (${d.consigneeKind}, ${d.consigneeCountry})  ${when}  ${dim(d.shipmentId)}`,
    );
  }
  if (a.findings.length) console.log(dim(`      ${a.findings.join('  ')}`));
}

async function main(): Promise<void> {
  const supplierId = process.argv[2] ?? 'SUP-04';
  const h = openHandle();
  const d = await assessSupplierImpact(h, supplierId);

  if ('found' in d) {
    console.error(`\n  ${d.reason}\n`);
    await h.close();
    process.exit(1);
  }

  console.log(`\n${bold(`${d.supplier.name}  (${d.supplier.supplierId}, ${d.supplier.country})`)}`);
  if (d.supplier.disqualifiedOn) {
    console.log(`  disqualified ${d.supplier.disqualifiedOn}`);
    console.log(dim(`  ${d.supplier.disqualifiedReason ?? ''}`));
  } else {
    console.log(
      amber('  STILL QUALIFIED — this is what the exposure WOULD be if they were disqualified today.'),
    );
  }

  console.log(`\n─── EXPOSURE ${'─'.repeat(56)}`);
  console.log(
    `  ${d.totals.lots} product lot(s), ${d.totals.units.toLocaleString()} units, ` +
      `from ${d.materials.total} material deliveries`,
  );
  for (const e of EXPOSURE_ORDER) {
    const n = d.totals.byExposure[e];
    if (n) console.log(`     ${String(n).padStart(3)}  ${BAND[e].title}`);
  }

  // The stock findings come BEFORE the work list on purpose: they are the only
  // things here that can still be prevented rather than remediated.
  if (d.findings.length) {
    console.log(`\n─── STOCK ON HAND ${'─'.repeat(51)}`);
    if (d.materials.receivedAfterDisqualification.length) {
      console.log(
        red(
          `  ${d.materials.receivedAfterDisqualification.length} delivery(ies) arrived AFTER the disqualification:`,
        ),
      );
      console.log(`      ${d.materials.receivedAfterDisqualification.join(', ')}`);
    }
    if (d.materials.notQuarantined.length) {
      console.log(
        amber(`  ${d.materials.notQuarantined.length} unused delivery(ies) still flagged usable:`),
      );
      console.log(`      ${d.materials.notQuarantined.join(', ')}`);
      console.log(dim('      A production order could still draw on these. Nothing stops it.'));
    }
  }

  for (const e of EXPOSURE_ORDER) {
    const rows = d.affected.filter((a) => a.exposure === e);
    if (!rows.length) continue;
    const b = BAND[e];
    console.log(`\n─── ${b.paint(b.title.toUpperCase())} (${rows.length}) ${'─'.repeat(Math.max(0, 50 - b.title.length))}`);
    console.log(dim(`  ${b.note}\n`));
    for (const a of rows) printLot(a);
  }

  console.log(`\n${dim(`fetches: ${h.fetches}  ·  assessed ${d.assessedOn}`)}`);
  console.log(
    dim('This is not a recall decision. It is the list, ranked. A person decides what happens.\n'),
  );
  await h.close();
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
