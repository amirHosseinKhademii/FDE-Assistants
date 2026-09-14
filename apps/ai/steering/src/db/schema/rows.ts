/**
 * ROW SHAPES — one interface per table, transcribed from `db/schema/*.sql`.
 *
 * Generated once by hand from the DDL and then owned by hand, for pharma's
 * reason: a codegen step would be a build dependency protecting five files that
 * change about as often as the schema does. What these buy is the one class of
 * bug a seed actually suffers — a row written with a mistyped or missing column,
 * which SQL would otherwise reject at insert time, for the first offending batch
 * only, several thousand rows in.
 *
 * TWO TYPES CARRY THE DATABASE'S AWKWARDNESS RATHER THAN HIDING IT, and both
 * are lifted verbatim from pharma because the awkwardness is Postgres's, not
 * the domain's:
 *
 *   DateLike  the seed WRITES `'2026-07-30'` and pg READS BACK a `Date`. Both
 *             are legitimate; the same interface describes both directions.
 *   Numeric   pg returns `numeric` columns as STRINGS, because a float cannot
 *             hold an arbitrary-precision decimal without lying. `2.700` comes
 *             back as `'2.700'`. Typing these `number` compiles and then
 *             silently compares a string to a number at runtime — which is
 *             exactly how a budget delta of '0.900' passes a `< 0.05` check.
 */

export type DateLike = string | Date;
export type Numeric = number | string;

// ── vst_crm ────────────────────────────────────────────────────────────────

export interface Customers {
  customer_id: string;
  name: string;
  country: string;
  kind: string;
  relationship_since: DateLike;
}

export interface Programs {
  program_id: string;
  customer_id: string;
  model: string;
  segment: string;
  eps_architecture: string;
  force_class_n: number;
  region: string;
  sop_on: DateLike | null;
  volume_per_year: number | null;
  status: string;
}

export interface Rfqs {
  rfq_id: string;
  customer_id: string;
  program_id: string;
  issued_on: DateLike;
  due_on: DateLike;
  status: string;
  decided_on: DateLike | null;
  lost_reason: string | null;
}

export interface RfqSpecs {
  rfq_id: string;
  spec_ref: string;
  spec_revision: string;
  attached_on: DateLike;
}

export interface Milestones {
  milestone_id: string;
  program_id: string;
  name: string;
  planned_on: DateLike;
  actual_on: DateLike | null;
  status: string;
}

export interface Contacts {
  contact_id: string;
  customer_id: string;
  full_name: string;
  role: string;
  email: string;
}

export interface Crm {
  customers: Customers[];
  programs: Programs[];
  rfqs: Rfqs[];
  rfq_specs: RfqSpecs[];
  milestones: Milestones[];
  contacts: Contacts[];
}

// ── vst_plm ────────────────────────────────────────────────────────────────

export interface ComponentSuppliers {
  supplier_id: string;
  name: string;
  country: string;
  status: string;
  approved_on: DateLike;
}

export interface ProductLines {
  line_id: string;
  architecture: string;
  name: string;
  force_class_n: number;
  introduced_on: DateLike;
  status: string;
}

export interface Parts {
  part_no: string;
  kind: string;
  name: string;
  line_id: string | null;
  lifecycle: string;
  make_buy: string;
  supplier_id: string | null;
  unit_cost_eur: Numeric;
  lead_time_days: number;
  released_on: DateLike;
}

export interface PartCapabilities {
  part_no: string;
  attribute: string;
  value: Numeric;
  unit: string;
  source: string;
  qualified: boolean;
}

export interface Assemblies {
  assembly_no: string;
  name: string;
  line_id: string;
  revision: string;
}

export interface BomLines {
  assembly_no: string;
  part_no: string;
  qty: number;
  position: string;
}

export interface QualificationTests {
  test_id: string;
  part_no: string;
  standard: string;
  attribute: string;
  condition: string;
  max_value_demonstrated: Numeric | null;
  unit: string;
  result: string;
  tested_on: DateLike;
  report_ref: string;
}

export interface PartProgramUsage {
  part_no: string;
  program_ref: string;
  from_sop: DateLike;
  volume_per_year: number;
}

export interface Plm {
  component_suppliers: ComponentSuppliers[];
  product_lines: ProductLines[];
  parts: Parts[];
  part_capabilities: PartCapabilities[];
  assemblies: Assemblies[];
  bom_lines: BomLines[];
  qualification_tests: QualificationTests[];
  part_program_usage: PartProgramUsage[];
}

// ── vst_alm ────────────────────────────────────────────────────────────────

export interface SpecDocuments {
  spec_id: string;
  customer_ref: string;
  program_ref: string;
  title: string;
  kind: string;
  issued_by: string;
}

export interface SpecRevisions {
  spec_revision_id: string;
  spec_id: string;
  revision: string;
  received_on: DateLike;
  effective_from: DateLike;
  effective_to: DateLike | null;
  change_note: string | null;
  supersedes: string | null;
}

export interface CustomerRequirements {
  cr_id: string;
  spec_id: string;
  section: string;
  title: string;
  attribute: string | null;
  unit: string | null;
}

export interface CustomerRequirementVersions {
  cr_id: string;
  spec_revision_id: string;
  text_body: string;
  operator: string | null;
  value_num: Numeric | null;
  condition: string | null;
  verification_method: string;
  asil: string;
  priority: string;
  status: string;
}

export interface CrHistory {
  history_id: string;
  cr_id: string;
  changed_on: DateLike;
  field: string;
  from_value: string | null;
  to_value: string | null;
  chr_ref: string | null;
  author: string;
}

export interface SystemRequirements {
  sr_id: string;
  program_ref: string;
  title: string;
  attribute: string | null;
  unit: string | null;
  owner_discipline: string;
  derivation_note: string | null;
}

export interface SystemRequirementVersions {
  sr_id: string;
  revision: number;
  effective_from: DateLike;
  effective_to: DateLike | null;
  text_body: string;
  operator: string | null;
  value_num: Numeric | null;
  condition: string | null;
  verification_method: string;
  asil: string;
  status: string;
  maturity: string;
}

export interface TraceCrSr {
  cr_id: string;
  sr_id: string;
  coverage: string;
  rationale: string | null;
}

export interface Budgets {
  budget_id: string;
  parent_sr_id: string;
  program_ref: string;
  attribute: string;
  unit: string;
  target_value: Numeric;
  operator: string;
  tolerance: Numeric;
  known_open: boolean;
  closure_note: string | null;
}

export interface BudgetAllocations {
  budget_id: string;
  seq: number;
  label: string;
  value: Numeric;
  basis: string;
  element_id: string | null;
  child_sr_id: string | null;
}

export interface ArchitectureVersions {
  arch_id: string;
  program_ref: string;
  version: number;
  created_on: DateLike;
  status: string;
  supersedes: string | null;
}

export interface Elements {
  element_id: string;
  arch_id: string;
  kind: string;
  name: string;
  make_buy: string;
  asil: string;
  part_ref: string | null;
  reuse_class: string;
}

export interface Activities {
  activity_id: string;
  name: string;
  kind: string;
  description: string;
}

export interface ActivityAllocations {
  activity_id: string;
  element_id: string;
  allocation_type: string;
  rationale: string | null;
}

export interface Interfaces {
  interface_id: string;
  arch_id: string;
  from_element: string;
  to_element: string;
  kind: string;
  signal: string;
  rate_ms: Numeric | null;
  asil: string;
}

export interface TraceSrElement {
  sr_id: string;
  element_id: string;
  rationale: string | null;
}

export interface ChangeRequests {
  chr_id: string;
  program_ref: string;
  raised_on: DateLike;
  source: string;
  title: string;
  status: string;
  decision: string | null;
  decided_on: DateLike | null;
  effort_ref: string | null;
}

export interface ChangeRequestItems {
  chr_id: string;
  seq: number;
  target_kind: string;
  target_id: string;
  action: string;
}

export interface Alm {
  spec_documents: SpecDocuments[];
  spec_revisions: SpecRevisions[];
  customer_requirements: CustomerRequirements[];
  customer_requirement_versions: CustomerRequirementVersions[];
  cr_history: CrHistory[];
  system_requirements: SystemRequirements[];
  system_requirement_versions: SystemRequirementVersions[];
  trace_cr_sr: TraceCrSr[];
  budgets: Budgets[];
  budget_allocations: BudgetAllocations[];
  architecture_versions: ArchitectureVersions[];
  elements: Elements[];
  activities: Activities[];
  activity_allocations: ActivityAllocations[];
  interfaces: Interfaces[];
  trace_sr_element: TraceSrElement[];
  change_requests: ChangeRequests[];
  change_request_items: ChangeRequestItems[];
}

// ── vst_pmo ────────────────────────────────────────────────────────────────

export interface EffortRecords {
  effort_id: string;
  chr_ref: string | null;
  program_ref: string;
  title: string;
  completed_on: DateLike;
  change_class: string;
  element_kind: string;
  asil: string;
  reuse_class: string;
  interfaces_touched: number;
  safety_case_impact: boolean;
  tooling_required: boolean;
  actual_hours: Numeric;
  calendar_weeks: number;
  region: string;
  year: number;
  outcome_note: string | null;
}

export interface EffortByDiscipline {
  effort_id: string;
  discipline: string;
  hours: Numeric;
}

export interface RateCards {
  year: number;
  region: string;
  discipline: string;
  rate_eur_per_hour: Numeric;
}

export interface Quotes {
  quote_id: string;
  rfq_ref: string;
  program_ref: string;
  issued_on: DateLike;
  quoted_hours: Numeric;
  quoted_eur: Numeric;
  tooling_eur: Numeric | null;
  outcome: string;
  actual_hours_final: Numeric | null;
}

export interface QuoteLines {
  quote_id: string;
  seq: number;
  description: string;
  change_class: string;
  hours: Numeric;
  cr_ref: string | null;
}

export interface Pmo {
  effort_records: EffortRecords[];
  effort_by_discipline: EffortByDiscipline[];
  rate_cards: RateCards[];
  quotes: Quotes[];
  quote_lines: QuoteLines[];
}

// ── the estate ─────────────────────────────────────────────────────────────

/**
 * Four buckets, one per database, keyed by the short name `SYSTEMS` uses.
 *
 * THERE IS NO `scm` BUCKET. The code base is not a database — it is
 * `docs/steering/corpus/`, generated by `db/seed/corpus.ts` as files and
 * chunked rather than queried. See `config/connections.ts`.
 *
 * The generators write into this and `seed.ts` walks it. Nothing joins across
 * two buckets in TypeScript either — the partition is real all the way up, and
 * a helper that quietly stitched two of them together in memory would hide
 * exactly the work the estate exists to make visible.
 */
export interface Estate {
  crm: Crm;
  plm: Plm;
  alm: Alm;
  pmo: Pmo;
}

/** What comes back OUT of Postgres: same tables, every column widened. */
export type LoadedEstate = Record<string, Record<string, Record<string, any>[]>>;
