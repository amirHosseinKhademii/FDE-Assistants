/**
 * DOMAIN: the lists a HUMAN picks from — lots, and suppliers.
 *
 * WHY THIS IS NOT A SEARCH TOOL. `assess_release` takes an exact `lot_id`
 * because a release decision has one right subject, and "the five most
 * IBU200-shaped lots" is a catastrophic way to pick it — `LOT-IBU200-2609-B`
 * and `LOT-IBU200-2609-D` differ by one character and go to different markets
 * under different limits. That rule stands.
 *
 * This is a different job, and the difference is WHO DECIDES. This returns
 * candidates to a PERSON, who picks one, and the pick becomes the lot id in the
 * question. The model never sees this list and never chooses from it, so there
 * is no path by which a near-match becomes an answer.
 *
 * WHAT THIS STANDS IN FOR. In a real deployment the reviewer is already looking
 * at a batch in the MES or the QMS, which supplies the lot id as context. This
 * exists because the demo app has no host system to be embedded in.
 *
 * READ-ONLY, like everything on the answer path. `pnpm sql:check` scans this
 * directory and would fail the build if a write appeared here.
 */
import { openHandle } from './tools/utils/handle';
import { asOfDay } from './tools/utils/dates';

export interface LotSummary {
  lotId: string;
  productId: string;
  /** US | EU — the market the lot was MADE for, which is not always the one asked about. */
  market: string;
  manufacturedOn: string;
  /** in_process | quarantine | released | rejected */
  status: string;
}

export async function listLots(): Promise<LotSummary[]> {
  const h = openHandle();
  try {
    const rows = await h.query(
      'mrd_erp',
      `select lot_id, product_id, market, manufactured_on, status
         from product_lots
        order by manufactured_on desc, lot_id`,
    );
    return rows.map((r: any) => ({
      lotId: r.lot_id,
      productId: r.product_id,
      market: r.market,
      manufacturedOn: asOfDay(r.manufactured_on),
      status: r.status,
    }));
  } finally {
    await h.close();
  }
}

// ---------------------------------------------------------------------------

/**
 * The supplier list, for the same reason and under the same rule as `listLots`.
 *
 * THE DISQUALIFICATION DATE IS IN THE SUMMARY, and that is the whole reason
 * this returns an object rather than a list of ids. The supplier question is
 * "this supplier was disqualified — what did we make with their material", so a
 * picker that shows only names makes the reviewer guess which of them the
 * question is even askable about. A supplier that was never disqualified is
 * still listed, because "we checked and it is still qualified" is an answer a
 * reviewer is entitled to get rather than be prevented from asking for.
 *
 * THE MODEL NEVER SEES THIS LIST, same as lots. A person picks, and the pick
 * becomes an exact `supplier_id` in the question. There is no path by which a
 * near-match becomes an answer.
 */
export interface SupplierSummary {
  supplierId: string;
  name: string;
  country: string;
  /** YYYY-MM-DD, or null when the supplier is still qualified. */
  disqualifiedOn: string | null;
  disqualifiedReason: string | null;
}

export async function listSuppliers(): Promise<SupplierSummary[]> {
  const h = openHandle();
  try {
    const rows = await h.query(
      'mrd_erp',
      `select supplier_id, name, country, disqualified_on, disqualified_reason
         from suppliers
        order by disqualified_on desc nulls last, supplier_id`,
    );
    return rows.map((r: any) => ({
      supplierId: r.supplier_id,
      name: r.name,
      country: r.country,
      disqualifiedOn: r.disqualified_on ? asOfDay(r.disqualified_on) : null,
      disqualifiedReason: r.disqualified_reason ?? null,
    }));
  } finally {
    await h.close();
  }
}
