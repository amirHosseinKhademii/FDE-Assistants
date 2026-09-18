/**
 * thb_wms — the warehouse. Own random stream (`STREAM.warehouse`).
 *
 * IT READS `OrderPlan[]` AND INVENTS NOTHING ABOUT AN ORDER. Which carrier took
 * a parcel and when it left were decided once, in `shop.ts`, and are passed
 * along. Re-deriving them here off a second random stream would produce a
 * different answer, and `packages.order_ref` would point at a shipment that
 * thinks it left on another day — a soft key broken by construction rather than
 * by a bug, which is the worse kind because it looks deliberate.
 *
 * THE PACK PHOTO IS THE INTERESTING ROW. It shows the carton sealed and square
 * ON THE BENCH, and it is genuine evidence — of the state of the parcel at the
 * moment it left the building. Everything trap T1 is about happened afterwards,
 * on a trolley, at stop 14. An assistant that reads "pack photo present, no
 * exception on the shipment" and concludes the parcel arrived intact has
 * treated a photograph of one moment as a statement about a different one.
 * No trap is planted in this file; this one is a trap in the shape of the data.
 */
import { SEED, STREAM, addHours, iso, makeHelpers, pad, ts, type Helpers } from './rng';
import type { OrderPlan } from './shop';
import type { Wms, Shop } from '../schema/rows';

const WAREHOUSES = [
  { warehouse_id: 'WH-DAVENTRY', name: 'Daventry NDC', city: 'Daventry', postcode: 'NN11 8QE' },
  { warehouse_id: 'WH-WAKEFIELD', name: 'Wakefield RDC', city: 'Wakefield', postcode: 'WF10 5QN' },
  { warehouse_id: 'WH-AVONMOUTH', name: 'Avonmouth RDC', city: 'Avonmouth', postcode: 'BS11 8DS' },
];

const PICKERS = ['t.ellery', 'm.bahri', 'k.nowak', 'd.arundel', 'p.szabo', 'l.mccrae', 'g.ferreira', 'n.whitlock'];

/** Which delivery region each site serves. Decides who picked an order. */
const SERVES: Record<string, readonly string[]> = {
  'WH-DAVENTRY': ['Birmingham', 'Nottingham', 'Ipswich', 'Norwich', 'Lincoln'],
  'WH-WAKEFIELD': ['Leeds', 'Manchester', 'Sheffield', 'Hull', 'Carlisle'],
  'WH-AVONMOUTH': ['Bristol', 'Exeter', 'Plymouth', 'Truro'],
};

function warehouseFor(city: string): string {
  for (const [wh, cities] of Object.entries(SERVES)) if (cities.includes(city)) return wh;
  return 'WH-DAVENTRY';
}

// ── stock ──────────────────────────────────────────────────────────

/**
 * Not every line is held at every site. A variant absent from a site is
 * ordinary, and a table with no gaps in it is a table nobody has to think about.
 */
function buildStockLevels(h: Helpers, variants: Shop['product_variants']): Wms['stock_levels'] {
  const out: Wms['stock_levels'] = [];
  for (const v of variants) {
    for (const w of WAREHOUSES) {
      if (!h.chance(0.72)) continue;
      const on_hand = h.int(0, 180);
      out.push({
        warehouse_id: w.warehouse_id,
        variant_ref: v.variant_id,
        on_hand,
        allocated: Math.min(on_hand, h.int(0, 12)),
      });
    }
  }
  return out;
}

// ── manifests ──────────────────────────────────────────────────────

/**
 * One manifest per site, carrier and dispatch day — which is what a manifest
 * is: the sealed list a driver signs for. Built lazily so an empty combination
 * never produces a row.
 */
class Manifests {
  readonly rows: Wms['dispatch_manifests'] = [];
  private readonly seen = new Map<string, string>();

  idFor(warehouse_id: string, carrier_ref: string, day: string): string {
    const key = `${warehouse_id}|${carrier_ref}|${day}`;
    const existing = this.seen.get(key);
    if (existing) return existing;

    const manifest_id = pad('MAN-', this.rows.length + 1, 5);
    this.seen.set(key, manifest_id);
    this.rows.push({
      manifest_id, warehouse_id, carrier_ref,
      cutoff_at: ts(new Date(`${day}T16:00:00Z`)),
      dispatched_at: ts(new Date(`${day}T18:30:00Z`)),
      seal_no: `SEAL-${pad('', 400000 + this.rows.length * 7, 6)}`,
    });
    return manifest_id;
  }
}

// ── one order's paperwork ──────────────────────────────────────────

function pickTaskFor(h: Helpers, p: OrderPlan, warehouse_id: string): Wms['pick_tasks'][number] {
  return {
    pick_task_id: `PT-${p.order_id.slice(4)}`,
    warehouse_id,
    order_ref: p.order_id,
    picker: h.pick(PICKERS),
    started_at: ts(addHours(p.dispatched_at, -h.int(3, 9))),
    completed_at: ts(addHours(p.dispatched_at, -h.int(1, 2))),
    status: 'picked',
  };
}

function packageFor(h: Helpers, p: OrderPlan, warehouse_id: string, manifest_id: string): Wms['packages'][number] {
  return {
    package_id: `PKG-${p.order_id.slice(4)}-1`,
    warehouse_id,
    pick_task_id: `PT-${p.order_id.slice(4)}`,
    manifest_id,
    order_ref: p.order_id,
    packed_at: ts(addHours(p.dispatched_at, -1)),
    weight_g: 200 + p.items.reduce((a, it) => a + it.qty * h.int(150, 1400), 0),
    carton_type: p.fragile ? 'fragile' : h.pick(['small', 'medium', 'medium', 'large']),
    // A fragile line is USUALLY double-walled. Usually, not always — and the
    // exceptions are what a damage claim turns on.
    double_walled: p.fragile ? h.chance(0.8) : h.chance(0.15),
  };
}

function packageItemsFor(p: OrderPlan, package_id: string): Wms['package_items'] {
  return p.items.map((it) => ({
    package_id,
    order_item_ref: it.order_item_id,
    variant_ref: it.variant_id,
    qty: it.qty,
  }));
}

function packPhotoFor(p: OrderPlan, package_id: string): Wms['pack_photos'][number] {
  return {
    photo_id: `PHO-${p.order_id.slice(4)}`,
    package_id,
    taken_at: ts(addHours(p.dispatched_at, -1)),
    uri: `s3://thb-pack-photos/${iso(p.dispatched_at)}/${package_id}.jpg`,
    checksum: pad('', Number(p.order_id.slice(4)) * 8191 % 999999999, 9),
  };
}

// ── the entry point, which lists its steps ─────────────────────────

export function buildWarehouse(shop: Shop, plans: OrderPlan[]): Wms {
  const h = makeHelpers(SEED + STREAM.warehouse);
  const manifests = new Manifests();

  const pick_tasks: Wms['pick_tasks'] = [];
  const packages: Wms['packages'] = [];
  const package_items: Wms['package_items'] = [];
  const pack_photos: Wms['pack_photos'] = [];

  for (const p of plans) {
    const warehouse_id = warehouseFor(p.city);
    const manifest_id = manifests.idFor(warehouse_id, p.carrier, iso(p.dispatched_at));

    pick_tasks.push(pickTaskFor(h, p, warehouse_id));
    const pkg = packageFor(h, p, warehouse_id, manifest_id);
    packages.push(pkg);
    package_items.push(...packageItemsFor(p, pkg.package_id));
    if (h.chance(0.78)) pack_photos.push(packPhotoFor(p, pkg.package_id));
  }

  return {
    warehouses: WAREHOUSES,
    stock_levels: buildStockLevels(h, shop.product_variants),
    pick_tasks,
    dispatch_manifests: manifests.rows,
    packages,
    package_items,
    pack_photos,
  };
}
