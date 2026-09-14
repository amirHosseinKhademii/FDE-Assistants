/**
 * `mrd_erp` — hop 1. What the lot IS, and whether we may sell it where it is
 * going.
 *
 * FIRST HOP, AND THE ONLY ONE WITH NO INPUT BUT THE LOT ID. Everything the
 * other five silos are asked is keyed by a value that comes out of here:
 * `workOrderRef` into `mrd_mes`, `specVersionRef` into `mrd_qms`. Neither is a
 * foreign key and neither can be — different database — so this module is where
 * the walk gets its footing.
 *
 * THESE FUNCTIONS RETURN DATA AND PRINT NOTHING. That is the whole reason the
 * file exists: the judgement in `db:trace` (a disqualified supplier, a lapsed
 * training record) used to be a colour in a terminal, which meant nothing but a
 * human could ever act on it. A finding has to survive as a value.
 */
import type { DbHandle } from '../utils/handle';

const DB = 'mrd_erp';

/** The markets Meridian sells into. A destination is a parameter, not a constant. */
export type Market = 'US' | 'EU';

export interface Lot {
  lotId: string;
  productId: string;
  market: Market;
  quantityUnits: number;
  manufacturedOn: Date;
  expiryOn: Date;
  status: string;
  /** Soft key → `mrd_mes.work_orders`. */
  workOrderRef: string;
  /** Soft key → `mrd_qms.specification_versions`. */
  specVersionRef: string;
}

export interface Product {
  productId: string;
  productCode: string;
  name: string;
  dosageForm: string;
  strength: string;
}

export interface Authorisation {
  maId: string;
  market: Market;
  maNumber: string;
  holder: string;
  status: string;
  /** The specification version the authorisation was granted against — not necessarily the current one. */
  specVersionRef: string;
}

export interface ConsumedMaterial {
  materialLotId: string;
  ingredientId: string;
  supplierId: string;
  supplierName: string;
  /** Set when the supplier was disqualified — possibly long before this lot existed. */
  disqualifiedOn: Date | null;
  /**
   * THE FINDING, as opposed to the date. T4 is "disqualified AFTER the material
   * was already consumed" — a disqualification that predates the run is not a
   * finding about this lot at all, it is a supplier we correctly stopped using.
   * Computed here because this is the only place `lot.manufacturedOn` and
   * `disqualifiedOn` are both in scope.
   */
  disqualifiedAfterUse: boolean;
}

export async function fetchLot(h: DbHandle, lotId: string): Promise<Lot | undefined> {
  const r = await h.one(DB, 'select * from product_lots where lot_id = $1', [lotId]);
  if (!r) return undefined;
  return {
    lotId: r.lot_id,
    productId: r.product_id,
    market: r.market,
    quantityUnits: r.quantity_units,
    manufacturedOn: r.manufactured_on,
    expiryOn: r.expiry_on,
    status: r.status,
    workOrderRef: r.work_order_ref,
    specVersionRef: r.spec_version_ref,
  };
}

export async function fetchProduct(h: DbHandle, productId: string): Promise<Product | undefined> {
  const r = await h.one(DB, 'select * from products where product_id = $1', [productId]);
  if (!r) return undefined;
  return {
    productId: r.product_id,
    productCode: r.product_code,
    name: r.name,
    dosageForm: r.dosage_form,
    strength: r.strength,
  };
}

/**
 * The licence to sell this product in this market.
 *
 * `unique (product_id, market)` means this is an exact lookup and never a
 * search — which is the evidence that settled "one tool per silo with fixed
 * queries" over a general SQL surface.
 */
export async function fetchAuthorisation(
  h: DbHandle,
  productId: string,
  market: Market,
): Promise<Authorisation | undefined> {
  const r = await h.one(
    DB,
    'select * from market_authorisations where product_id = $1 and market = $2',
    [productId, market],
  );
  if (!r) return undefined;
  return {
    maId: r.ma_id,
    market: r.market,
    maNumber: r.ma_number,
    holder: r.holder,
    status: r.status,
    specVersionRef: r.spec_version_ref,
  };
}

/** What went into the lot, and the standing of whoever supplied it. */
export async function fetchMaterialsConsumed(
  h: DbHandle,
  lotId: string,
  manufacturedOn: Date,
): Promise<ConsumedMaterial[]> {
  const rows = await h.query(
    DB,
    `select c.material_lot_id, m.ingredient_id, s.supplier_id, s.name, s.disqualified_on
       from lot_material_consumption c
       join material_lots m on m.material_lot_id = c.material_lot_id
       join suppliers s on s.supplier_id = m.supplier_id
      where c.lot_id = $1 order by 1`,
    [lotId],
  );
  return rows.map((r) => ({
    materialLotId: r.material_lot_id,
    ingredientId: r.ingredient_id,
    supplierId: r.supplier_id,
    supplierName: r.name,
    disqualifiedOn: r.disqualified_on ?? null,
    disqualifiedAfterUse: !!r.disqualified_on && r.disqualified_on > manufacturedOn,
  }));
}

/** Everything hop 1 knows, in one call. */
export interface ErpFacts {
  lot: Lot;
  product: Product;
  authorisation: Authorisation | undefined;
  materials: ConsumedMaterial[];
}

/**
 * ONE CALL PER SILO, NOT ONE PER QUERY. Hop 1 alone is four queries; a tool
 * surface that exposed each of them separately would turn one question into
 * dozens of round trips through the agent loop. The small functions above stay
 * exported because they are testable on their own — this is what callers use.
 */
export async function fetchErpFacts(h: DbHandle, lotId: string): Promise<ErpFacts | undefined> {
  const lot = await fetchLot(h, lotId);
  if (!lot) return undefined;

  const product = await fetchProduct(h, lot.productId);
  if (!product) return undefined;

  return {
    lot,
    product,
    authorisation: await fetchAuthorisation(h, lot.productId, lot.market),
    materials: await fetchMaterialsConsumed(h, lot.lotId, lot.manufacturedOn),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE OTHER DIRECTION: supplier → material → product lots.
//
// Everything above is keyed by a lot id, because the first question this estate
// was asked started with one lot. This second question runs the walk BACKWARDS —
// one supplier fans out to many lots — and no amount of composing the functions
// above produces it: asking "which lots used this supplier" by calling
// `fetchMaterialsConsumed` for all 94 lots is 94 round trips to answer one
// question, and the shape of the answer is a list rather than a record.
//
// That is a finding about the department modules, not a flaw in them. They were
// right for the direction they were written for.
// ─────────────────────────────────────────────────────────────────────────────

export interface Supplier {
  supplierId: string;
  name: string;
  country: string;
  qualifiedFrom: Date;
  /** Null means still qualified. A date means it stopped being acceptable THAT day. */
  disqualifiedOn: Date | null;
  disqualifiedReason: string | null;
}

export async function fetchSupplier(h: DbHandle, supplierId: string): Promise<Supplier | undefined> {
  const r = await h.one(
    DB,
    `select supplier_id, name, country, qualified_from, disqualified_on, disqualified_reason
       from suppliers where supplier_id = $1`,
    [supplierId],
  );
  if (!r) return undefined;
  return {
    supplierId: r.supplier_id,
    name: r.name,
    country: r.country,
    qualifiedFrom: r.qualified_from,
    disqualifiedOn: r.disqualified_on ?? null,
    disqualifiedReason: r.disqualified_reason ?? null,
  };
}

export interface SuppliedMaterial {
  materialLotId: string;
  ingredientId: string;
  receivedOn: Date;
  /** released | quarantine | rejected */
  status: string;
  quantityKg: number;
  /** How many product lots have already consumed it. Zero means it is still in stock. */
  consumedByLots: number;
}

/**
 * Every material lot this supplier ever sent, oldest first.
 *
 * NOT FILTERED BY DATE, deliberately. Which side of the disqualification a
 * delivery falls on is a judgement the assessment makes and reports; filtering
 * it out here would hide the most actionable case of all — material that
 * arrived AFTER the supplier was disqualified and is still sitting in stock
 * marked usable.
 */
export async function fetchSuppliedMaterials(
  h: DbHandle,
  supplierId: string,
): Promise<SuppliedMaterial[]> {
  const rows = await h.query(
    DB,
    `select ml.material_lot_id, ml.ingredient_id, ml.received_on, ml.status, ml.quantity_kg,
            (select count(*)::int from lot_material_consumption c
              where c.material_lot_id = ml.material_lot_id) as consumed_by
       from material_lots ml
      where ml.supplier_id = $1
      order by ml.received_on, ml.material_lot_id`,
    [supplierId],
  );
  return rows.map((r) => ({
    materialLotId: r.material_lot_id,
    ingredientId: r.ingredient_id,
    receivedOn: r.received_on,
    status: r.status,
    quantityKg: Number(r.quantity_kg),
    consumedByLots: r.consumed_by,
  }));
}

export interface AffectedLot {
  lotId: string;
  productId: string;
  productName: string;
  market: Market;
  /** in_process | quarantine | released | rejected */
  status: string;
  manufacturedOn: Date;
  expiryOn: Date;
  quantityUnits: number;
  /** Which of the supplier's deliveries went into it. Usually one, not always. */
  materialLotIds: string[];
}

/**
 * Every product lot that consumed material from this supplier.
 *
 * ONE QUERY, NOT ONE PER LOT. The join crosses three tables inside `mrd_erp`,
 * which is allowed precisely because they share a database — the silo boundary
 * this estate is built around sits between the six databases, not inside them.
 * Doing it lot by lot would turn one fetch into ninety-four and teach the wrong
 * lesson about where the expensive boundary actually is.
 */
export async function fetchLotsUsingSupplier(
  h: DbHandle,
  supplierId: string,
): Promise<AffectedLot[]> {
  const rows = await h.query(
    DB,
    `select pl.lot_id, pl.product_id, p.name as product_name, pl.market, pl.status,
            pl.manufactured_on, pl.expiry_on, pl.quantity_units,
            array_agg(distinct ml.material_lot_id order by ml.material_lot_id) as material_lots
       from product_lots pl
       join lot_material_consumption lmc on lmc.lot_id = pl.lot_id
       join material_lots ml on ml.material_lot_id = lmc.material_lot_id
       join products p on p.product_id = pl.product_id
      where ml.supplier_id = $1
      group by pl.lot_id, pl.product_id, p.name, pl.market, pl.status,
               pl.manufactured_on, pl.expiry_on, pl.quantity_units
      order by pl.manufactured_on desc`,
    [supplierId],
  );
  return rows.map((r) => ({
    lotId: r.lot_id,
    productId: r.product_id,
    productName: r.product_name,
    market: r.market,
    status: r.status,
    manufacturedOn: r.manufactured_on,
    expiryOn: r.expiry_on,
    quantityUnits: r.quantity_units,
    materialLotIds: r.material_lots,
  }));
}
