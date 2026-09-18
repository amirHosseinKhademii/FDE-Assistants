/**
 * EVERY SOFT KEY IN THE ESTATE, IN ONE LIST.
 *
 * A soft key is a column holding another DATABASE's identifier. Postgres cannot
 * check one, because the target is not in the same database — so this list is
 * the only thing that knows they exist, and `db:check` walking it is the only
 * thing that knows whether they still resolve.
 *
 * PLAN.md §2.1 names four of these, because four are the ones a resolution
 * walks. The rest are the same species and are listed anyway: a soft key nobody
 * checks is a soft key that rots quietly, and the ones nobody thought were
 * interesting are exactly the ones that break when a builder is rewritten.
 *
 * THE LIST IS ALSO USED IN THE NEGATIVE DIRECTION. `db:check` asserts that NONE
 * of these columns carries a real foreign-key constraint. If somebody ever
 * "fixes" the schema by adding one, the five-database split has quietly become
 * a single database wearing five names, and the whole point of the estate has
 * gone — silently, with every test still green.
 */
export interface SoftKey {
  from: { db: string; table: string; column: string };
  to: { db: string; table: string; column: string };
  /** Null is a legitimate value — an order not yet shipped has no shipment. */
  nullable: boolean;
}

const k = (
  fromDb: string, fromTable: string, fromCol: string,
  toDb: string, toTable: string, toCol: string,
  nullable = false,
): SoftKey => ({
  from: { db: fromDb, table: fromTable, column: fromCol },
  to: { db: toDb, table: toTable, column: toCol },
  nullable,
});

export const SOFT_KEYS: readonly SoftKey[] = [
  // The four the plan names.
  k('thb_shop', 'orders', 'shipment_ref', 'thb_fleet', 'shipments', 'shipment_id', true),
  k('thb_wms', 'packages', 'order_ref', 'thb_shop', 'orders', 'order_id'),
  k('thb_fleet', 'shipments', 'order_ref', 'thb_shop', 'orders', 'order_id'),
  k('thb_crm', 'cases', 'order_ref', 'thb_shop', 'orders', 'order_id', true),
  k('thb_crm', 'customers', 'user_ref', 'thb_shop', 'users', 'user_id'),

  // The rest, which are no less real for being less interesting.
  k('thb_wms', 'pick_tasks', 'order_ref', 'thb_shop', 'orders', 'order_id'),
  k('thb_wms', 'package_items', 'order_item_ref', 'thb_shop', 'order_items', 'order_item_id'),
  k('thb_wms', 'package_items', 'variant_ref', 'thb_shop', 'product_variants', 'variant_id'),
  k('thb_wms', 'stock_levels', 'variant_ref', 'thb_shop', 'product_variants', 'variant_id'),
  k('thb_wms', 'dispatch_manifests', 'carrier_ref', 'thb_fleet', 'carriers', 'carrier_id'),
  k('thb_fleet', 'shipments', 'package_ref', 'thb_wms', 'packages', 'package_id'),
  k('thb_policy', 'carrier_sla', 'carrier_ref', 'thb_fleet', 'carriers', 'carrier_id'),
];

/**
 * Real foreign keys that must exist INSIDE a database.
 *
 * Not every FK in the DDL — a representative one per parent-child relationship
 * that matters, so that a schema quietly rebuilt without constraints is caught.
 * `[database, table, column, referenced table]`.
 */
export const REQUIRED_FKS: readonly [string, string, string, string][] = [
  ['thb_shop', 'addresses', 'user_id', 'users'],
  ['thb_shop', 'products', 'category_id', 'categories'],
  ['thb_shop', 'product_variants', 'product_id', 'products'],
  ['thb_shop', 'orders', 'user_id', 'users'],
  ['thb_shop', 'orders', 'delivery_address_id', 'addresses'],
  ['thb_shop', 'order_items', 'order_id', 'orders'],
  ['thb_shop', 'order_items', 'variant_id', 'product_variants'],
  ['thb_shop', 'payments', 'order_id', 'orders'],
  ['thb_shop', 'refunds', 'order_id', 'orders'],
  ['thb_shop', 'refunds', 'order_item_id', 'order_items'],
  ['thb_wms', 'stock_levels', 'warehouse_id', 'warehouses'],
  ['thb_wms', 'packages', 'pick_task_id', 'pick_tasks'],
  ['thb_wms', 'packages', 'manifest_id', 'dispatch_manifests'],
  ['thb_wms', 'package_items', 'package_id', 'packages'],
  ['thb_wms', 'pack_photos', 'package_id', 'packages'],
  ['thb_fleet', 'depots', 'carrier_id', 'carriers'],
  ['thb_fleet', 'vehicles', 'depot_id', 'depots'],
  ['thb_fleet', 'routes', 'driver_id', 'drivers'],
  ['thb_fleet', 'stops', 'route_id', 'routes'],
  ['thb_fleet', 'stops', 'shipment_id', 'shipments'],
  ['thb_fleet', 'scans', 'shipment_id', 'shipments'],
  ['thb_fleet', 'delivery_events', 'shipment_id', 'shipments'],
  ['thb_fleet', 'proofs_of_delivery', 'shipment_id', 'shipments'],
  ['thb_fleet', 'driver_reports', 'route_id', 'routes'],
  ['thb_crm', 'contacts', 'customer_id', 'customers'],
  ['thb_crm', 'contact_messages', 'contact_id', 'contacts'],
  ['thb_crm', 'cases', 'customer_id', 'customers'],
  ['thb_crm', 'case_notes', 'case_id', 'cases'],
  ['thb_crm', 'resolutions', 'case_id', 'cases'],
  ['thb_crm', 'csat', 'case_id', 'cases'],
  ['thb_policy', 'policy_versions', 'document_id', 'policy_documents'],
];
