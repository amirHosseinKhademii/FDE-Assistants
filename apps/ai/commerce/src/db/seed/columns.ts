/**
 * COLUMN ORDER PER TABLE, EXPLICIT.
 *
 * Why this exists rather than `Object.keys(row)`: a reordered object literal
 * would then silently shift every value one column to the left, and Postgres
 * would accept it wherever the types happened to line up. `text` next to `text`
 * is the common case, so the failure is quiet and the data is wrong.
 *
 * IT IS ALSO THE ONE PLACE THAT CAN DRIFT FROM THE DDL WITHOUT A COMPILER
 * NOTICING, which is why `db:check` reads the live `information_schema` and
 * compares. A column added to a `.sql` file and forgotten here inserts NULL for
 * ever, and the interfaces in `db/schema/rows.ts` cannot catch it: they
 * describe the ROW, and this describes the INSERT.
 */
export const COLUMNS: Record<string, Record<string, string[]>> = {
  thb_policy: {
    policy_documents: ['document_id', 'slug', 'title', 'kind', 'owner'],
    policy_versions: ['version_id', 'document_id', 'revision', 'effective_from', 'effective_to', 'published', 'summary'],
    return_windows: ['window_id', 'category', 'channel', 'window_days', 'effective_from', 'effective_to'],
    refund_rules: ['rule_id', 'code', 'applies_to', 'condition', 'outcome', 'requires_approval', 'effective_from'],
    category_overrides: ['override_id', 'category', 'override_kind', 'value_text', 'note', 'effective_from'],
    carrier_sla: ['sla_id', 'carrier_ref', 'service_level', 'working_days', 'penalty_rate', 'penalty_cap_pence', 'effective_from'],
    goodwill_limits: ['limit_id', 'tier', 'max_pence', 'requires_approval_above_pence', 'effective_from'],
    approval_thresholds: ['threshold_id', 'action', 'max_pence', 'approver_role', 'effective_from'],
    bank_holidays: ['holiday_date', 'jurisdiction', 'name'],
  },
  thb_shop: {
    users: ['user_id', 'email', 'full_name', 'created_on', 'marketing_opt_in', 'status'],
    addresses: ['address_id', 'user_id', 'line1', 'line2', 'city', 'postcode', 'country', 'is_default'],
    categories: ['category_id', 'name', 'parent_category_id'],
    products: ['product_id', 'sku', 'name', 'category_id', 'brand', 'list_price_pence', 'status', 'marketplace_seller'],
    product_variants: ['variant_id', 'product_id', 'sku', 'variant_name', 'price_pence'],
    orders: ['order_id', 'user_id', 'placed_at', 'channel', 'status', 'subtotal_pence', 'shipping_pence', 'total_pence', 'delivery_address_id', 'service_level', 'promised_by', 'shipment_ref'],
    order_items: ['order_item_id', 'order_id', 'product_id', 'variant_id', 'qty', 'unit_price_pence', 'line_total_pence'],
    payments: ['payment_id', 'order_id', 'method', 'amount_pence', 'captured_at', 'psp_reference'],
    refunds: ['refund_id', 'order_id', 'order_item_id', 'amount_pence', 'kind', 'reason', 'issued_at', 'issued_by'],
  },
  thb_wms: {
    warehouses: ['warehouse_id', 'name', 'city', 'postcode'],
    stock_levels: ['warehouse_id', 'variant_ref', 'on_hand', 'allocated'],
    pick_tasks: ['pick_task_id', 'warehouse_id', 'order_ref', 'picker', 'started_at', 'completed_at', 'status'],
    dispatch_manifests: ['manifest_id', 'warehouse_id', 'carrier_ref', 'cutoff_at', 'dispatched_at', 'seal_no'],
    packages: ['package_id', 'warehouse_id', 'pick_task_id', 'manifest_id', 'order_ref', 'packed_at', 'weight_g', 'carton_type', 'double_walled'],
    package_items: ['package_id', 'order_item_ref', 'variant_ref', 'qty'],
    pack_photos: ['photo_id', 'package_id', 'taken_at', 'uri', 'checksum'],
  },
  thb_fleet: {
    carriers: ['carrier_id', 'name', 'kind'],
    depots: ['depot_id', 'carrier_id', 'name', 'metro', 'postcode'],
    vehicles: ['vehicle_id', 'depot_id', 'reg_plate', 'kind', 'capacity_parcels'],
    drivers: ['driver_id', 'depot_id', 'full_name', 'licence_no'],
    routes: ['route_id', 'depot_id', 'vehicle_id', 'driver_id', 'route_date', 'planned_stops', 'started_at', 'finished_at'],
    shipments: ['shipment_id', 'carrier_id', 'order_ref', 'package_ref', 'tracking_no', 'service_level', 'dispatched_at', 'promised_by', 'status'],
    stops: ['stop_id', 'route_id', 'seq', 'shipment_id', 'address_line', 'postcode', 'arrived_at', 'departed_at'],
    scans: ['scan_id', 'shipment_id', 'scanned_at', 'scan_type', 'location', 'depot_id'],
    delivery_events: ['event_id', 'shipment_id', 'occurred_at', 'status', 'exception_code', 'notes'],
    proofs_of_delivery: ['pod_id', 'shipment_id', 'captured_at', 'kind', 'uri', 'recipient_name'],
    driver_reports: ['report_id', 'route_id', 'driver_id', 'reported_at', 'severity', 'body'],
    depot_incidents: ['incident_id', 'depot_id', 'occurred_on', 'kind', 'body', 'reported_by'],
  },
  thb_crm: {
    customers: ['customer_id', 'user_ref', 'display_name', 'email', 'since', 'segment'],
    contacts: ['contact_id', 'customer_id', 'channel', 'opened_at', 'subject', 'status'],
    contact_messages: ['message_id', 'contact_id', 'sent_at', 'direction', 'author', 'body'],
    cases: ['case_id', 'customer_id', 'contact_id', 'order_ref', 'opened_at', 'closed_at', 'category', 'status', 'owner'],
    case_notes: ['note_id', 'case_id', 'written_at', 'author', 'body'],
    resolutions: ['resolution_id', 'case_id', 'kind', 'amount_pence', 'status', 'proposed_at', 'proposed_by', 'decided_at', 'approved_by'],
    csat: ['csat_id', 'case_id', 'responded_at', 'score', 'comment'],
  },
};

/** Which bucket of the estate object each database is loaded from. */
export const BUCKET: Record<string, string> = {
  thb_policy: 'policy', thb_shop: 'shop', thb_wms: 'wms', thb_fleet: 'fleet', thb_crm: 'crm',
};

/**
 * The order tables must be TRUNCATED and INSERTED in, per database.
 *
 * Insert order is the FK order: a child row whose parent is not there yet is
 * rejected at insert time, which is the point of having the constraint. The
 * wipe runs in reverse for the same reason. `Object.keys(COLUMNS[db])` already
 * happens to be in dependency order, and this constant says so out loud rather
 * than depending on a property of object literals that a reformat could break.
 */
export function tablesOf(db: string): string[] {
  return Object.keys(COLUMNS[db]);
}
