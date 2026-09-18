/**
 * ROW SHAPES — one interface per table, transcribed by hand from `db/schema/*.sql`.
 *
 * GENERATED ONCE FROM THE DDL AND THEN OWNED BY HAND, following
 * `apps/ai/pharma/src/db/schema/rows.ts`. There is no codegen step and
 * deliberately so: a generator would be a build dependency protecting five
 * files that change about as often as the schema does, which is rarely. What
 * these buy is the one class of bug the seed actually suffers — a row written
 * with a mistyped or missing column, which SQL would only reject at insert time
 * and only for the first offending batch.
 *
 * TWO TYPES CARRY THE DATABASE'S AWKWARDNESS RATHER THAN HIDING IT. They are
 * pharma's, and they generalise exactly because the awkwardness is Postgres's,
 * not pharma's:
 *
 *   DateLike  the seed WRITES `'2026-08-31'` and pg READS BACK a `Date`. Both
 *             are legitimate and the same interface describes both directions,
 *             so the column type admits both. Every comparison goes through a
 *             normaliser rather than pretending one direction does not exist.
 *   Numeric   pg returns `numeric` columns as STRINGS, because a float cannot
 *             hold an arbitrary-precision decimal without lying. `0.0150` comes
 *             back as `'0.0150'`. Typing it `number` COMPILES and then silently
 *             compares a string to a number at runtime.
 *
 * WHICH IS WHY MONEY IS INTEGER PENCE AND `Numeric` APPEARS EXACTLY ONCE, on
 * `CarrierSla.penalty_rate`. Every other money column in the estate is
 * `integer` and named `*_pence`, so the string-versus-number trap cannot reach
 * an amount anybody pays. The one survivor is a RATE, it cannot be pence, and
 * it is typed honestly rather than conveniently. If a second `Numeric` ever
 * appears in this file, the question to ask is whether it should have been
 * pence.
 */

/** A date column: written as an ISO string, read back as a `Date`. */
export type DateLike = string | Date;

/** A numeric column: written as a number, read back as a STRING. See above. */
export type Numeric = number | string;

// ── thb_shop ──────────────────────────────────────────────────────

export interface Users {
  user_id: string;
  email: string;
  full_name: string;
  created_on: DateLike;
  marketing_opt_in: boolean;
  status: string;
}

export interface Addresses {
  address_id: string;
  user_id: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
  is_default: boolean;
}

export interface Categories {
  category_id: string;
  name: string;
  parent_category_id: string | null;
}

export interface Products {
  product_id: string;
  sku: string;
  name: string;
  category_id: string;
  brand: string;
  list_price_pence: number;
  status: string;
  /** NULL means Thornbury owned the stock. A name means it never did — T4. */
  marketplace_seller: string | null;
}

export interface ProductVariants {
  variant_id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  price_pence: number;
}

export interface Orders {
  order_id: string;
  user_id: string;
  placed_at: DateLike;
  channel: string;
  status: string;
  subtotal_pence: number;
  shipping_pence: number;
  total_pence: number;
  delivery_address_id: string;
  service_level: string;
  promised_by: DateLike;
  /** SOFT KEY → thb_fleet.shipments.shipment_id. No FK; different database. */
  shipment_ref: string | null;
}

export interface OrderItems {
  order_item_id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  qty: number;
  unit_price_pence: number;
  line_total_pence: number;
}

export interface Payments {
  payment_id: string;
  order_id: string;
  method: string;
  amount_pence: number;
  captured_at: DateLike;
  psp_reference: string;
}

export interface Refunds {
  refund_id: string;
  order_id: string;
  /** Nullable: a refund can be against the whole order or one line of it. T3. */
  order_item_id: string | null;
  amount_pence: number;
  kind: string;
  reason: string;
  issued_at: DateLike;
  issued_by: string;
}

// ── thb_wms ───────────────────────────────────────────────────────

export interface Warehouses {
  warehouse_id: string;
  name: string;
  city: string;
  postcode: string;
}

export interface StockLevels {
  warehouse_id: string;
  /** SOFT KEY → thb_shop.product_variants.variant_id */
  variant_ref: string;
  on_hand: number;
  allocated: number;
}

export interface PickTasks {
  pick_task_id: string;
  warehouse_id: string;
  /** SOFT KEY → thb_shop.orders.order_id */
  order_ref: string;
  picker: string;
  started_at: DateLike;
  completed_at: DateLike | null;
  status: string;
}

export interface DispatchManifests {
  manifest_id: string;
  warehouse_id: string;
  /** SOFT KEY → thb_fleet.carriers.carrier_id */
  carrier_ref: string;
  cutoff_at: DateLike;
  dispatched_at: DateLike | null;
  seal_no: string;
}

export interface Packages {
  package_id: string;
  warehouse_id: string;
  pick_task_id: string;
  manifest_id: string | null;
  /** SOFT KEY → thb_shop.orders.order_id */
  order_ref: string;
  packed_at: DateLike;
  weight_g: number;
  carton_type: string;
  double_walled: boolean;
}

export interface PackageItems {
  package_id: string;
  /** SOFT KEY → thb_shop.order_items.order_item_id */
  order_item_ref: string;
  /** SOFT KEY → thb_shop.product_variants.variant_id */
  variant_ref: string;
  qty: number;
}

export interface PackPhotos {
  photo_id: string;
  package_id: string;
  taken_at: DateLike;
  uri: string;
  checksum: string;
}

// ── thb_fleet ─────────────────────────────────────────────────────

export interface Carriers {
  carrier_id: string;
  name: string;
  kind: string;
}

export interface Depots {
  depot_id: string;
  carrier_id: string;
  name: string;
  metro: string;
  postcode: string;
}

export interface Vehicles {
  vehicle_id: string;
  depot_id: string;
  reg_plate: string;
  kind: string;
  capacity_parcels: number;
}

export interface Drivers {
  driver_id: string;
  depot_id: string;
  full_name: string;
  licence_no: string;
}

export interface Routes {
  route_id: string;
  depot_id: string;
  vehicle_id: string;
  driver_id: string;
  route_date: DateLike;
  planned_stops: number;
  started_at: DateLike;
  finished_at: DateLike | null;
}

export interface Shipments {
  shipment_id: string;
  carrier_id: string;
  /** SOFT KEY → thb_shop.orders.order_id */
  order_ref: string;
  /** SOFT KEY → thb_wms.packages.package_id */
  package_ref: string;
  tracking_no: string;
  service_level: string;
  dispatched_at: DateLike;
  promised_by: DateLike;
  status: string;
}

export interface Stops {
  stop_id: string;
  route_id: string;
  /** What the DRIVER calls this stop. "stop 14" in a report means this. T1. */
  seq: number;
  shipment_id: string | null;
  address_line: string;
  postcode: string;
  arrived_at: DateLike | null;
  departed_at: DateLike | null;
}

export interface Scans {
  scan_id: string;
  shipment_id: string;
  scanned_at: DateLike;
  scan_type: string;
  location: string;
  depot_id: string | null;
}

export interface DeliveryEvents {
  event_id: string;
  shipment_id: string;
  occurred_at: DateLike;
  status: string;
  /** NULL means the van reported nothing. It does NOT mean nothing happened. T1. */
  exception_code: string | null;
  notes: string | null;
}

export interface ProofsOfDelivery {
  pod_id: string;
  shipment_id: string;
  captured_at: DateLike;
  kind: string;
  uri: string;
  recipient_name: string | null;
}

export interface DriverReports {
  report_id: string;
  /** Attached to the ROUTE, never to an order. That is the whole of T1. */
  route_id: string;
  driver_id: string;
  reported_at: DateLike;
  severity: string;
  body: string;
}

export interface DepotIncidents {
  incident_id: string;
  depot_id: string;
  occurred_on: DateLike;
  kind: string;
  body: string;
  reported_by: string;
}

// ── thb_crm ───────────────────────────────────────────────────────

export interface Customers {
  customer_id: string;
  /** SOFT KEY → thb_shop.users.user_id */
  user_ref: string;
  display_name: string;
  email: string;
  since: DateLike;
  segment: string;
}

export interface Contacts {
  contact_id: string;
  customer_id: string;
  channel: string;
  opened_at: DateLike;
  subject: string;
  status: string;
}

export interface ContactMessages {
  message_id: string;
  contact_id: string;
  sent_at: DateLike;
  direction: string;
  author: string;
  /** A STRANGER WROTE THIS. Two rows carry a planted instruction — T5. */
  body: string;
}

export interface Cases {
  case_id: string;
  customer_id: string;
  contact_id: string | null;
  /** SOFT KEY → thb_shop.orders.order_id */
  order_ref: string | null;
  opened_at: DateLike;
  closed_at: DateLike | null;
  category: string;
  status: string;
  owner: string;
}

export interface CaseNotes {
  note_id: string;
  case_id: string;
  written_at: DateLike;
  author: string;
  body: string;
}

export interface Resolutions {
  resolution_id: string;
  case_id: string;
  kind: string;
  amount_pence: number;
  status: string;
  proposed_at: DateLike;
  proposed_by: string;
  decided_at: DateLike | null;
  /** NULL until a HUMAN decides. The model can propose; it cannot pay. */
  approved_by: string | null;
}

export interface Csat {
  csat_id: string;
  case_id: string;
  responded_at: DateLike;
  score: number;
  comment: string | null;
}

// ── thb_policy ────────────────────────────────────────────────────

export interface PolicyDocuments {
  document_id: string;
  slug: string;
  title: string;
  kind: string;
  owner: string;
}

export interface PolicyVersions {
  version_id: string;
  document_id: string;
  revision: string;
  effective_from: DateLike;
  effective_to: DateLike | null;
  published: boolean;
  summary: string;
}

export interface ReturnWindows {
  window_id: string;
  category: string;
  channel: string;
  window_days: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
}

export interface RefundRules {
  rule_id: string;
  code: string;
  applies_to: string;
  condition: string;
  outcome: string;
  requires_approval: boolean;
  effective_from: DateLike;
}

export interface CategoryOverrides {
  override_id: string;
  category: string;
  override_kind: string;
  value_text: string;
  note: string;
  effective_from: DateLike;
}

export interface CarrierSla {
  sla_id: string;
  /** SOFT KEY → thb_fleet.carriers.carrier_id */
  carrier_ref: string;
  service_level: string;
  working_days: number;
  /**
   * THE ONLY `Numeric` IN THE ESTATE. A rate, not money — 0.0150 is 1.5 % of
   * order value per working day late. pg hands it back as the STRING '0.0150'.
   */
  penalty_rate: Numeric;
  penalty_cap_pence: number;
  effective_from: DateLike;
}

export interface GoodwillLimits {
  limit_id: string;
  tier: string;
  max_pence: number;
  requires_approval_above_pence: number;
  effective_from: DateLike;
}

export interface ApprovalThresholds {
  threshold_id: string;
  action: string;
  max_pence: number;
  approver_role: string;
  effective_from: DateLike;
}

export interface BankHolidays {
  holiday_date: DateLike;
  jurisdiction: string;
  name: string;
}

// ── the estate, by system ─────────────────────────────────────────

export interface Shop {
  users: Users[];
  addresses: Addresses[];
  categories: Categories[];
  products: Products[];
  product_variants: ProductVariants[];
  orders: Orders[];
  order_items: OrderItems[];
  payments: Payments[];
  refunds: Refunds[];
}

export interface Wms {
  warehouses: Warehouses[];
  stock_levels: StockLevels[];
  pick_tasks: PickTasks[];
  dispatch_manifests: DispatchManifests[];
  packages: Packages[];
  package_items: PackageItems[];
  pack_photos: PackPhotos[];
}

export interface Fleet {
  carriers: Carriers[];
  depots: Depots[];
  vehicles: Vehicles[];
  drivers: Drivers[];
  routes: Routes[];
  shipments: Shipments[];
  stops: Stops[];
  scans: Scans[];
  delivery_events: DeliveryEvents[];
  proofs_of_delivery: ProofsOfDelivery[];
  driver_reports: DriverReports[];
  depot_incidents: DepotIncidents[];
}

export interface Crm {
  customers: Customers[];
  contacts: Contacts[];
  contact_messages: ContactMessages[];
  cases: Cases[];
  case_notes: CaseNotes[];
  resolutions: Resolutions[];
  csat: Csat[];
}

export interface Policy {
  policy_documents: PolicyDocuments[];
  policy_versions: PolicyVersions[];
  return_windows: ReturnWindows[];
  refund_rules: RefundRules[];
  category_overrides: CategoryOverrides[];
  carrier_sla: CarrierSla[];
  goodwill_limits: GoodwillLimits[];
  approval_thresholds: ApprovalThresholds[];
  bank_holidays: BankHolidays[];
}

export interface Estate {
  shop: Shop;
  wms: Wms;
  fleet: Fleet;
  crm: Crm;
  policy: Policy;
}

/**
 * The same estate as it comes BACK from Postgres — every `DateLike` is a `Date`
 * and every `Numeric` a string. `db:check` loads into this rather than `Estate`
 * so that a comparison written against the seed's types fails to compile here,
 * which is the point: reading is not the inverse of writing.
 */
export type LoadedEstate = Record<string, Record<string, Record<string, any>[]>>;
