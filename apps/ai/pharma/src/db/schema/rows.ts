/**
 * ROW SHAPES — one interface per table, transcribed from `db/schema/*.sql`.
 *
 * GENERATED ONCE FROM THE DDL AND THEN OWNED BY HAND. There is no codegen step
 * and deliberately so: a generator would be a build dependency protecting six
 * files that change about as often as the schema does, which is rarely. What
 * these buy is the one class of bug the seed actually suffers — a row written
 * with a mistyped or missing column, which SQL would only reject at insert time
 * and only for the first offending batch.
 *
 * TWO TYPES CARRY THE DATABASE'S AWKWARDNESS RATHER THAN HIDING IT:
 *
 *   DateLike  the seed WRITES `'2026-09-04'` and pg READS back a `Date`. Both
 *             are legitimate and the same interface describes both directions,
 *             so the column type admits both. Every comparison goes through a
 *             normaliser rather than pretending one of them does not exist.
 *   Numeric   pg returns `numeric` columns as STRINGS, because a float cannot
 *             hold an arbitrary-precision decimal without lying. `93.6958` comes
 *             back as `'93.6958'`. Typing these `number` would compile and then
 *             silently compare a string to a number at runtime — which is
 *             exactly how a dissolution result of '71.4' passes a `< 80` check.
 */

/** A date column: written as an ISO string, read back as a `Date`. */
export type DateLike = string | Date;

/** A numeric column: written as a number, read back as a string. See above. */
export type Numeric = number | string;

// ── mrd_erp ───────────────────────────────────────────────────────

export interface Suppliers {
  supplier_id: string;
  name: string;
  country: string;
  qualified_from: DateLike;
  disqualified_on: DateLike | null;
  disqualified_reason: string | null;
}

export interface Ingredients {
  ingredient_id: string;
  name: string;
  kind: string;
  cas_number: string | null;
  compendial_ref: string | null;
}

export interface Products {
  product_id: string;
  product_code: string;
  name: string;
  dosage_form: string;
  strength: string;
  atc_code: string | null;
  status: string;
}

export interface MarketAuthorisations {
  ma_id: string;
  product_id: string;
  market: string;
  ma_number: string;
  holder: string;
  status: string;
  valid_from: DateLike;
  valid_to: DateLike | null;
  spec_version_ref: string;
}

export interface BillOfMaterials {
  bom_id?: number;
  product_id: string;
  ingredient_id: string;
  version: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
  qty_mg: Numeric;
  tolerance_pct: Numeric;
}

export interface MaterialLots {
  material_lot_id: string;
  ingredient_id: string;
  supplier_id: string;
  received_on: DateLike;
  quantity_kg: Numeric;
  coa_ref: string;
  status: string;
}

export interface ProductLots {
  lot_id: string;
  product_id: string;
  campaign: string;
  sub_batch: string;
  market: string;
  quantity_units: number;
  manufactured_on: DateLike;
  expiry_on: DateLike;
  work_order_ref: string;
  spec_version_ref: string;
  status: string;
}

export interface LotMaterialConsumption {
  consumption_id?: number;
  lot_id: string;
  material_lot_id: string;
  quantity_kg: Numeric;
}

// ── mrd_mes ───────────────────────────────────────────────────────

export interface Sites {
  site_id: string;
  name: string;
  city: string;
  country: string;
  gmp_certificate_no: string;
  gmp_valid_from: DateLike;
  gmp_valid_to: DateLike;
}

export interface Lines {
  line_id: string;
  site_id: string;
  name: string;
  building: string;
  room: string;
  cleanroom_grade: string;
  capability: string;
}

export interface Equipment {
  equipment_id: string;
  line_id: string;
  name: string;
  kind: string;
  serial_no: string;
}

export interface EquipmentQualification {
  qualification_id?: number;
  equipment_id: string;
  kind: string;
  performed_on: DateLike;
  valid_until: DateLike;
  status: string;
  performed_by_ref: string;
}

export interface WorkOrders {
  work_order_id: string;
  line_id: string;
  product_ref: string;
  lot_ref: string;
  planned_start: DateLike;
  actual_start: DateLike;
  actual_end: DateLike;
  status: string;
  governing_sop_ref: string;
  signed_by_ref: string | null;
  signed_on: DateLike | null;
}

export interface ProcessSteps {
  step_id: string;
  work_order_id: string;
  seq: number;
  name: string;
  started_at: DateLike;
  ended_at: DateLike;
  equipment_ref: string | null;
  performed_by_ref: string;
  verified_by_ref: string;
}

export interface ProcessParameters {
  parameter_id?: number;
  step_id: string;
  name: string;
  value_num: Numeric;
  unit: string;
  lower_limit: Numeric;
  upper_limit: Numeric;
  in_spec: boolean;
}

export interface Deviations {
  deviation_id: string;
  work_order_id: string;
  step_id: string | null;
  raised_on: DateLike;
  raised_by_ref: string;
  severity: string;
  description: string;
  status: string;
  capa_ref: string | null;
}

// ── mrd_hcm ───────────────────────────────────────────────────────

export interface Departments {
  department_id: string;
  name: string;
  function: string;
  site_ref: string;
  head_employee_ref: string | null;
}

export interface Positions {
  position_id: string;
  title: string;
  department_id: string;
  gmp_critical: boolean;
}

export interface Employees {
  employee_id: string;
  full_name: string;
  position_id: string;
  department_id: string;
  site_ref: string;
  hired_on: DateLike;
  left_on: DateLike | null;
  status: string;
}

export interface TrainingCurricula {
  curriculum_id: string;
  code: string;
  title: string;
  validity_months: number;
  mandatory_for: string;
}

export interface TrainingRecords {
  record_id?: number;
  employee_id: string;
  curriculum_id: string;
  completed_on: DateLike;
  expires_on: DateLike;
  score_pct: number;
}

export interface Qualifications {
  qualification_id: string;
  employee_id: string;
  kind: string;
  authority: string;
  register_no: string | null;
  registered_on: DateLike;
  valid_until: DateLike | null;
}

export interface SignatureAuthority {
  authority_id?: number;
  employee_id: string;
  act: string;
  granted_on: DateLike;
  revoked_on: DateLike | null;
}

// ── mrd_qms ───────────────────────────────────────────────────────

export interface Specifications {
  spec_id: string;
  product_ref: string;
  market: string;
  title: string;
}

export interface SpecificationVersions {
  spec_version_id: string;
  spec_id: string;
  version: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
  standard_ref: string | null;
}

export interface TestMethods {
  method_id: string;
  code: string;
  title: string;
  technique: string;
  compendial_ref: string | null;
}

export interface SpecLimits {
  limit_id?: number;
  spec_version_id: string;
  method_id: string;
  attribute: string;
  lower_limit: Numeric | null;
  upper_limit: Numeric | null;
  unit: string;
}

export interface QcTests {
  test_id: string;
  lot_ref: string;
  method_id: string;
  attribute: string;
  stage: string;
  sampled_on: DateLike;
  tested_on: DateLike;
  analyst_ref: string;
  spec_version_ref: string;
  result_num: Numeric;
  unit: string;
  in_spec: boolean;
  retest_of_test_id: string | null;
}

export interface OosInvestigations {
  oos_id: string;
  test_id: string;
  opened_on: DateLike;
  closed_on: DateLike | null;
  phase: string;
  root_cause: string | null;
  outcome: string | null;
  approved_by_ref: string | null;
}

export interface BatchDispositions {
  disposition_id: string;
  lot_ref: string;
  market: string;
  decision: string;
  decided_on: DateLike;
  decided_by_ref: string;
  governing_sop_ref: string;
  qp_certified: boolean;
}

export interface Capas {
  capa_id: string;
  opened_on: DateLike;
  due_on: DateLike;
  closed_on: DateLike | null;
  source: string;
  source_ref: string;
  owner_ref: string;
  description: string;
  status: string;
}

export interface ChangeControls {
  change_id: string;
  opened_on: DateLike;
  implemented_on: DateLike | null;
  description: string;
  affected_sop_ref: string | null;
  approved_by_ref: string;
  status: string;
}

export interface Audits {
  audit_id: string;
  kind: string;
  subject_ref: string;
  performed_on: DateLike;
  lead_auditor_ref: string;
  findings_count: number;
  outcome: string;
}

// ── mrd_tms ───────────────────────────────────────────────────────

export interface Warehouses {
  warehouse_id: string;
  name: string;
  site_ref: string;
  country: string;
  gdp_licence_no: string;
  licence_valid_to: DateLike;
}

export interface Consignees {
  consignee_id: string;
  name: string;
  country: string;
  market: string;
  licence_no: string;
  kind: string;
}

export interface Trucks {
  truck_id: string;
  plate: string;
  make: string;
  model: string;
  refrigerated: boolean;
  telematics_unit_id: string | null;
  in_service_from: DateLike;
  in_service_to: DateLike | null;
}

export interface Drivers {
  driver_id: string;
  full_name: string;
  licence_no: string;
  employee_ref: string | null;
}

export interface Shipments {
  shipment_id: string;
  warehouse_id: string;
  consignee_id: string;
  truck_id: string;
  driver_id: string;
  dispatched_on: DateLike;
  delivered_on: DateLike | null;
  status: string;
  required_temp_min: Numeric;
  required_temp_max: Numeric;
}

export interface ShipmentLines {
  line_id?: number;
  shipment_id: string;
  lot_ref: string;
  quantity_units: number;
  sscc: string;
}

export interface Routes {
  route_id?: number;
  shipment_id: string;
  seq: number;
  from_location: string;
  to_location: string;
  departed_at: DateLike;
  arrived_at: DateLike;
  distance_km: Numeric;
}

export interface TelematicsReadings {
  reading_id?: number;
  truck_id: string;
  shipment_id: string;
  recorded_at: DateLike;
  temp_c: Numeric;
  gps_lat: Numeric;
  gps_lon: Numeric;
}

// ── mrd_reg ───────────────────────────────────────────────────────

export interface Standards {
  standard_id: string;
  body: string;
  code: string;
  title: string;
  jurisdiction: string;
  in_force_from: DateLike;
}

export interface StandardClauses {
  clause_id: string;
  standard_id: string;
  clause_no: string;
  title: string;
  summary: string;
}

export interface Sops {
  sop_id: string;
  title: string;
  category: string;
  owning_department_ref: string;
}

export interface SopRevisions {
  revision_id: string;
  sop_id: string;
  revision_no: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
  summary: string;
  change_summary: string;
  supersedes_revision_id: string | null;
  change_control_ref: string | null;
}

export interface SopClauseLinks {
  link_id?: number;
  revision_id: string;
  clause_id: string;
  relation: string;
}

export interface Policies {
  policy_id: string;
  title: string;
  scope: string;
  owner_ref: string;
  effective_from: DateLike;
  effective_to: DateLike | null;
}


// ── the six buckets ──────────────────────────────────────────────────────────
//
// One property per table, so `world.qms.qc_tests` is typed all the way down and
// a table added to the DDL but forgotten in the seed is a compile error rather
// than an empty table nobody notices.

export interface Reg {
  standards: Standards[];
  standard_clauses: StandardClauses[];
  sops: Sops[];
  sop_revisions: SopRevisions[];
  sop_clause_links: SopClauseLinks[];
  policies: Policies[];
}

export interface Hcm {
  departments: Departments[];
  positions: Positions[];
  employees: Employees[];
  training_curricula: TrainingCurricula[];
  training_records: TrainingRecords[];
  qualifications: Qualifications[];
  signature_authority: SignatureAuthority[];
}

export interface Erp {
  suppliers: Suppliers[];
  ingredients: Ingredients[];
  products: Products[];
  market_authorisations: MarketAuthorisations[];
  bill_of_materials: BillOfMaterials[];
  material_lots: MaterialLots[];
  product_lots: ProductLots[];
  lot_material_consumption: LotMaterialConsumption[];
}

export interface Mes {
  sites: Sites[];
  lines: Lines[];
  equipment: Equipment[];
  equipment_qualification: EquipmentQualification[];
  work_orders: WorkOrders[];
  process_steps: ProcessSteps[];
  process_parameters: ProcessParameters[];
  deviations: Deviations[];
}

/** One complaint as received. `lot_ref` is what we KNOW, `lot_stated` what we
 *  were TOLD — different facts, and the gap between them is the triage job. */
export interface Complaints {
  complaint_id: string;
  received_on: DateLike;
  channel: string;
  reporter_kind: string;
  reporter_ref: string | null;
  market: string;
  product_ref: string | null;
  lot_ref: string | null;
  lot_stated: string | null;
  category: string;
  is_adverse_event: boolean;
  severity: string;
  narrative: string;
  status: string;
  opened_by_ref: string;
  closed_on: DateLike | null;
  linked_deviation_ref: string | null;
  linked_capa_ref: string | null;
}

/** One step in producing a laboratory result. The SEQUENCE is the finding, not
 *  any single row — see `lab-events.ts`. */
export interface LabEvents {
  event_id: string;
  test_ref: string;
  event_seq: number;
  occurred_at: string;
  performed_by_ref: string;
  action: string;
  result_num: number | null;
  unit: string | null;
  reason: string | null;
  supersedes_event_ref: string | null;
  instrument_ref: string | null;
}

export interface Qms {
  specifications: Specifications[];
  specification_versions: SpecificationVersions[];
  test_methods: TestMethods[];
  spec_limits: SpecLimits[];
  qc_tests: QcTests[];
  oos_investigations: OosInvestigations[];
  batch_dispositions: BatchDispositions[];
  capas: Capas[];
  change_controls: ChangeControls[];
  audits: Audits[];
  /** Added 2026-09-12, infrastructure only — nothing reads them yet. */
  complaints: Complaints[];
  lab_events: LabEvents[];
}

export interface Tms {
  warehouses: Warehouses[];
  consignees: Consignees[];
  trucks: Trucks[];
  drivers: Drivers[];
  shipments: Shipments[];
  shipment_lines: ShipmentLines[];
  routes: Routes[];
  telematics_readings: TelematicsReadings[];
}

/** The whole estate, in memory, before any of it is written. */
export interface Estate {
  reg: Reg;
  hcm: Hcm;
  erp: Erp;
  mes: Mes;
  qms: Qms;
  tms: Tms;
}

/**
 * A row as READ BACK from Postgres, where every table is reached by name.
 *
 * Deliberately looser than the interfaces above: `db:check` walks tables it
 * looks up by string, and pretending that indexing is statically known would
 * mean a cast at every call site instead of one honest type here.
 */
export type LoadedTable = Record<string, any>[];
export type LoadedDb = Record<string, LoadedTable>;
export type LoadedEstate = Record<string, LoadedDb>;
