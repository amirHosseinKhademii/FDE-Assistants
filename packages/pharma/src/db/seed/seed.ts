/**
 * `pnpm db:seed` — build the world in memory, then write it to six databases.
 *
 * ONE TRANSACTION PER DATABASE, not one across all six, because there is no
 * such thing as one across all six: separate databases means separate
 * transactions, and pretending otherwise is the first lie an integration tells
 * itself. If mrd_qms fails after mrd_erp committed, the estate is half-loaded —
 * which is exactly the failure mode a customer's nightly sync has, and the
 * honest fix is `db:reset`, not a distributed transaction we do not have.
 *
 * Inserts go through UNNEST rather than a row per statement. 4,000 round trips
 * to Frankfurt is a minute of waiting for no reason.
 */
import { Client } from 'pg';
import { SYSTEMS, urlFor, redact } from '../../config/connections';
import { buildWorld, SEED, ANCHORS } from './world';
import { buildEquipmentQualification } from './equipment-qualification';
import { buildComplaints } from './complaints';
import { buildLabEvents } from './lab-events';
import { buildOperations } from './operations';
import type { Estate } from '../schema/rows';

/**
 * Column order per table. Explicit so a reordered object cannot shift values.
 *
 * The `Record<string, …>` annotation is load-bearing rather than decorative:
 * both this map and `SYSTEMS` are walked by database NAME, and a literal type
 * would make every lookup a compile error demanding a cast.
 */
const COLUMNS: Record<string, Record<string, string[]>> = {
  mrd_reg: {
    standards: ['standard_id', 'body', 'code', 'title', 'jurisdiction', 'in_force_from'],
    standard_clauses: ['clause_id', 'standard_id', 'clause_no', 'title', 'summary'],
    sops: ['sop_id', 'title', 'category', 'owning_department_ref'],
    sop_revisions: ['revision_id', 'sop_id', 'revision_no', 'effective_from', 'effective_to', 'summary', 'change_summary', 'supersedes_revision_id', 'change_control_ref'],
    sop_clause_links: ['revision_id', 'clause_id', 'relation'],
    policies: ['policy_id', 'title', 'scope', 'owner_ref', 'effective_from', 'effective_to'],
  },
  mrd_hcm: {
    departments: ['department_id', 'name', 'function', 'site_ref', 'head_employee_ref'],
    positions: ['position_id', 'title', 'department_id', 'gmp_critical'],
    employees: ['employee_id', 'full_name', 'position_id', 'department_id', 'site_ref', 'hired_on', 'left_on', 'status'],
    training_curricula: ['curriculum_id', 'code', 'title', 'validity_months', 'mandatory_for'],
    training_records: ['employee_id', 'curriculum_id', 'completed_on', 'expires_on', 'score_pct'],
    qualifications: ['qualification_id', 'employee_id', 'kind', 'authority', 'register_no', 'registered_on', 'valid_until'],
    signature_authority: ['employee_id', 'act', 'granted_on', 'revoked_on'],
  },
  mrd_erp: {
    suppliers: ['supplier_id', 'name', 'country', 'qualified_from', 'disqualified_on', 'disqualified_reason'],
    ingredients: ['ingredient_id', 'name', 'kind', 'cas_number', 'compendial_ref'],
    products: ['product_id', 'product_code', 'name', 'dosage_form', 'strength', 'atc_code', 'status'],
    market_authorisations: ['ma_id', 'product_id', 'market', 'ma_number', 'holder', 'status', 'valid_from', 'valid_to', 'spec_version_ref'],
    bill_of_materials: ['product_id', 'ingredient_id', 'version', 'effective_from', 'effective_to', 'qty_mg', 'tolerance_pct'],
    material_lots: ['material_lot_id', 'ingredient_id', 'supplier_id', 'received_on', 'quantity_kg', 'coa_ref', 'status'],
    product_lots: ['lot_id', 'product_id', 'campaign', 'sub_batch', 'market', 'quantity_units', 'manufactured_on', 'expiry_on', 'work_order_ref', 'spec_version_ref', 'status'],
    lot_material_consumption: ['lot_id', 'material_lot_id', 'quantity_kg'],
  },
  mrd_mes: {
    sites: ['site_id', 'name', 'city', 'country', 'gmp_certificate_no', 'gmp_valid_from', 'gmp_valid_to'],
    lines: ['line_id', 'site_id', 'name', 'building', 'room', 'cleanroom_grade', 'capability'],
    equipment: ['equipment_id', 'line_id', 'name', 'kind', 'serial_no'],
    equipment_qualification: ['equipment_id', 'kind', 'performed_on', 'valid_until', 'status', 'performed_by_ref'],
    work_orders: ['work_order_id', 'line_id', 'product_ref', 'lot_ref', 'planned_start', 'actual_start', 'actual_end', 'status', 'governing_sop_ref', 'signed_by_ref', 'signed_on'],
    process_steps: ['step_id', 'work_order_id', 'seq', 'name', 'started_at', 'ended_at', 'equipment_ref', 'performed_by_ref', 'verified_by_ref'],
    process_parameters: ['step_id', 'name', 'value_num', 'unit', 'lower_limit', 'upper_limit', 'in_spec'],
    deviations: ['deviation_id', 'work_order_id', 'step_id', 'raised_on', 'raised_by_ref', 'severity', 'description', 'status', 'capa_ref'],
  },
  mrd_qms: {
    specifications: ['spec_id', 'product_ref', 'market', 'title'],
    specification_versions: ['spec_version_id', 'spec_id', 'version', 'effective_from', 'effective_to', 'standard_ref'],
    test_methods: ['method_id', 'code', 'title', 'technique', 'compendial_ref'],
    spec_limits: ['spec_version_id', 'method_id', 'attribute', 'lower_limit', 'upper_limit', 'unit'],
    qc_tests: ['test_id', 'lot_ref', 'method_id', 'attribute', 'stage', 'sampled_on', 'tested_on', 'analyst_ref', 'spec_version_ref', 'result_num', 'unit', 'in_spec', 'retest_of_test_id'],
    oos_investigations: ['oos_id', 'test_id', 'opened_on', 'closed_on', 'phase', 'root_cause', 'outcome', 'approved_by_ref'],
    batch_dispositions: ['disposition_id', 'lot_ref', 'market', 'decision', 'decided_on', 'decided_by_ref', 'governing_sop_ref', 'qp_certified'],
    capas: ['capa_id', 'opened_on', 'due_on', 'closed_on', 'source', 'source_ref', 'owner_ref', 'description', 'status'],
    change_controls: ['change_id', 'opened_on', 'implemented_on', 'description', 'affected_sop_ref', 'approved_by_ref', 'status'],
    audits: ['audit_id', 'kind', 'subject_ref', 'performed_on', 'lead_auditor_ref', 'findings_count', 'outcome'],
    complaints: ['complaint_id', 'received_on', 'channel', 'reporter_kind', 'reporter_ref', 'market', 'product_ref', 'lot_ref', 'lot_stated', 'category', 'is_adverse_event', 'severity', 'narrative', 'status', 'opened_by_ref', 'closed_on', 'linked_deviation_ref', 'linked_capa_ref'],
    lab_events: ['event_id', 'test_ref', 'event_seq', 'occurred_at', 'performed_by_ref', 'action', 'result_num', 'unit', 'reason', 'supersedes_event_ref', 'instrument_ref'],
  },
  mrd_tms: {
    warehouses: ['warehouse_id', 'name', 'site_ref', 'country', 'gdp_licence_no', 'licence_valid_to'],
    consignees: ['consignee_id', 'name', 'country', 'market', 'licence_no', 'kind'],
    trucks: ['truck_id', 'plate', 'make', 'model', 'refrigerated', 'telematics_unit_id', 'in_service_from', 'in_service_to'],
    drivers: ['driver_id', 'full_name', 'licence_no', 'employee_ref'],
    shipments: ['shipment_id', 'warehouse_id', 'consignee_id', 'truck_id', 'driver_id', 'dispatched_on', 'delivered_on', 'status', 'required_temp_min', 'required_temp_max'],
    shipment_lines: ['shipment_id', 'lot_ref', 'quantity_units', 'sscc'],
    routes: ['shipment_id', 'seq', 'from_location', 'to_location', 'departed_at', 'arrived_at', 'distance_km'],
    telematics_readings: ['truck_id', 'shipment_id', 'recorded_at', 'temp_c', 'gps_lat', 'gps_lon'],
  },
};

/** Which bucket of the world object each database is loaded from. */
const BUCKET: Record<string, keyof Estate> = { mrd_reg: 'reg', mrd_hcm: 'hcm', mrd_erp: 'erp', mrd_mes: 'mes', mrd_qms: 'qms', mrd_tms: 'tms' };

/**
 * Insert every row of one table in batches.
 *
 * `$1::text[]` style casts are omitted deliberately — pg infers from the target
 * column, and naming the type here would be one more place to get `numeric`
 * versus `integer` wrong.
 */
async function insertAll(
  client: Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  batch = 500,
): Promise<number> {
  if (!rows.length) return 0;
  let written = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const params: unknown[] = [];
    const tuples = slice.map((row) => {
      const ph = columns.map((c) => {
        params.push(row[c] ?? null);
        return `$${params.length}`;
      });
      return `(${ph.join(',')})`;
    });
    await client.query(
      `insert into ${table} (${columns.join(',')}) values ${tuples.join(',')}`,
      params,
    );
    written += slice.length;
  }
  return written;
}

// ─────────────────────────────────────────────────────────────────── run ───

async function main(): Promise<void> {
  console.log(`\nBuilding the Meridian world  (seed ${SEED}, deterministic)\n`);

  const world = buildOperations(buildWorld());

  // Equipment qualification. Extracted so `world-fingerprint.ts` can build the
  // same rows — it was the one table the fingerprint saw as empty.
  buildEquipmentQualification(world);

  // Complaints. Own random stream — see the header of `complaints.ts`.
  buildComplaints(world);

  // Laboratory audit trail. Own random stream — see `lab-events.ts`.
  buildLabEvents(world);

  let total = 0;
  for (const { db, label } of SYSTEMS) {
    // One honest cast at the boundary. Above this line the buckets are fully
    // typed and a mistyped column is a compile error; here the table is reached
    // by a name that only exists as a string, and pretending otherwise would
    // mean a cast at every one of the 47 call sites instead of this one.
    const bucket = world[BUCKET[db]] as unknown as Record<string, Record<string, unknown>[]>;
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();
    await client.query('begin');
    try {
      // Truncate rather than drop: the schema is the migration's business, the
      // rows are this script's. Reverse order so foreign keys inside one database
      // do not fight the wipe.
      const tables = Object.keys(COLUMNS[db]);
      await client.query(`truncate ${tables.join(', ')} restart identity cascade`);
      let n = 0;
      for (const table of tables) {
        n += await insertAll(client, table, COLUMNS[db][table], bucket[table] ?? []);
      }
      await client.query('commit');
      total += n;
      console.log(`  load    ${db.padEnd(9)} ${String(n).padStart(6)} rows across ${tables.length} tables — ${label}`);
    } catch (e: any) {
      await client.query('rollback');
      console.error(`\n  FAIL    ${db} — ${e.message}\n`);
      await client.end();
      process.exit(1);
    }
    await client.end();
  }

  console.log(`\nseed: done — ${total} rows, six databases, ${redact(urlFor('mrd_*'))}\n`);
}

// A CommonJS build has no top-level await. See create.ts for why the catch
// matters: a seed that fails with exit code 0 is worse than one that crashes.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
