/**
 * `pnpm steering:db-seed` — build the estate in memory, then write it to four
 * databases.
 *
 * ONE TRANSACTION PER DATABASE, not one across all four, because there is no
 * such thing as one across all four: separate databases means separate
 * transactions, and pretending otherwise is the first lie an integration tells
 * itself. If `vst_alm` fails after `vst_crm` committed, the estate is
 * half-loaded — which is exactly the failure mode a customer's nightly sync
 * has, and the honest fix is `db:reset`, not a distributed transaction we do
 * not have.
 *
 * Inserts go through multi-row VALUES rather than a statement per row. Thirteen
 * thousand round trips to Frankfurt is a minute of waiting for no reason.
 *
 * THE CODE BASE IS NOT WRITTEN HERE. It is files; `pnpm steering:corpus` writes
 * it. If you are looking for `commits` or `functions`, they do not exist as
 * tables and that is deliberate — see `config/connections.ts`.
 */
import { Client } from 'pg';
import { SYSTEMS, urlFor, redact } from '../../config/connections';
import { buildEstate } from './estate';
import type { Estate } from '../schema/rows';

/**
 * Column order per table. Explicit so a reordered object literal cannot shift
 * values into the wrong columns — the one failure a seed actually suffers, and
 * one SQL only catches when the types happen to disagree.
 *
 * The `Record<string, …>` annotation is load-bearing rather than decorative:
 * this map and `SYSTEMS` are both walked by database NAME, and a literal type
 * would make every lookup a compile error demanding a cast.
 */
const COLUMNS: Record<string, Record<string, string[]>> = {
  vst_crm: {
    customers: ['customer_id', 'name', 'country', 'kind', 'relationship_since'],
    programs: ['program_id', 'customer_id', 'model', 'segment', 'eps_architecture', 'force_class_n', 'region', 'sop_on', 'volume_per_year', 'status'],
    rfqs: ['rfq_id', 'customer_id', 'program_id', 'issued_on', 'due_on', 'status', 'decided_on', 'lost_reason'],
    rfq_specs: ['rfq_id', 'spec_ref', 'spec_revision', 'attached_on'],
    milestones: ['milestone_id', 'program_id', 'name', 'planned_on', 'actual_on', 'status'],
    contacts: ['contact_id', 'customer_id', 'full_name', 'role', 'email'],
  },
  vst_plm: {
    component_suppliers: ['supplier_id', 'name', 'country', 'status', 'approved_on'],
    product_lines: ['line_id', 'architecture', 'name', 'force_class_n', 'introduced_on', 'status'],
    parts: ['part_no', 'kind', 'name', 'line_id', 'lifecycle', 'make_buy', 'supplier_id', 'unit_cost_eur', 'lead_time_days', 'released_on'],
    part_capabilities: ['part_no', 'attribute', 'value', 'unit', 'source', 'qualified'],
    assemblies: ['assembly_no', 'name', 'line_id', 'revision'],
    bom_lines: ['assembly_no', 'part_no', 'qty', 'position'],
    qualification_tests: ['test_id', 'part_no', 'standard', 'attribute', 'condition', 'max_value_demonstrated', 'unit', 'result', 'tested_on', 'report_ref'],
    part_program_usage: ['part_no', 'program_ref', 'from_sop', 'volume_per_year'],
  },
  vst_alm: {
    spec_documents: ['spec_id', 'customer_ref', 'program_ref', 'title', 'kind', 'issued_by'],
    spec_revisions: ['spec_revision_id', 'spec_id', 'revision', 'received_on', 'effective_from', 'effective_to', 'change_note', 'supersedes'],
    customer_requirements: ['cr_id', 'spec_id', 'section', 'title', 'attribute', 'unit'],
    customer_requirement_versions: ['cr_id', 'spec_revision_id', 'text_body', 'operator', 'value_num', 'condition', 'verification_method', 'asil', 'priority', 'status'],
    cr_history: ['history_id', 'cr_id', 'changed_on', 'field', 'from_value', 'to_value', 'chr_ref', 'author'],
    system_requirements: ['sr_id', 'program_ref', 'title', 'attribute', 'unit', 'owner_discipline', 'derivation_note'],
    system_requirement_versions: ['sr_id', 'revision', 'effective_from', 'effective_to', 'text_body', 'operator', 'value_num', 'condition', 'verification_method', 'asil', 'status', 'maturity'],
    trace_cr_sr: ['cr_id', 'sr_id', 'coverage', 'rationale'],
    // architecture_versions and elements MUST precede budget_allocations: the
    // allocation carries a real foreign key to an element now, so writing it
    // first fails the insert. Table order in this map is an insert order.
    architecture_versions: ['arch_id', 'program_ref', 'version', 'created_on', 'status', 'supersedes'],
    elements: ['element_id', 'arch_id', 'kind', 'name', 'make_buy', 'asil', 'part_ref', 'reuse_class'],
    budgets: ['budget_id', 'parent_sr_id', 'program_ref', 'attribute', 'unit', 'target_value', 'operator', 'tolerance', 'known_open', 'closure_note'],
    budget_allocations: ['budget_id', 'seq', 'label', 'value', 'basis', 'element_id', 'child_sr_id'],
    activities: ['activity_id', 'name', 'kind', 'description'],
    activity_allocations: ['activity_id', 'element_id', 'allocation_type', 'rationale'],
    interfaces: ['interface_id', 'arch_id', 'from_element', 'to_element', 'kind', 'signal', 'rate_ms', 'asil'],
    trace_sr_element: ['sr_id', 'element_id', 'rationale'],
    change_requests: ['chr_id', 'program_ref', 'raised_on', 'source', 'title', 'status', 'decision', 'decided_on', 'effort_ref'],
    change_request_items: ['chr_id', 'seq', 'target_kind', 'target_id', 'action'],
  },
  vst_pmo: {
    effort_records: ['effort_id', 'chr_ref', 'program_ref', 'title', 'completed_on', 'change_class', 'element_kind', 'asil', 'reuse_class', 'interfaces_touched', 'safety_case_impact', 'tooling_required', 'actual_hours', 'calendar_weeks', 'region', 'year', 'outcome_note'],
    effort_by_discipline: ['effort_id', 'discipline', 'hours'],
    rate_cards: ['year', 'region', 'discipline', 'rate_eur_per_hour'],
    quotes: ['quote_id', 'rfq_ref', 'program_ref', 'issued_on', 'quoted_hours', 'quoted_eur', 'tooling_eur', 'outcome', 'actual_hours_final'],
    quote_lines: ['quote_id', 'seq', 'description', 'change_class', 'hours', 'cr_ref'],
  },
};

/** Which bucket of the estate each database is loaded from. */
const BUCKET: Record<string, keyof Estate> = {
  vst_crm: 'crm', vst_plm: 'plm', vst_alm: 'alm', vst_pmo: 'pmo',
};

/**
 * Insert every row of one table in batches.
 *
 * Explicit `::type` casts are omitted deliberately — pg infers from the target
 * column, and naming the type here would be one more place to get `numeric`
 * against `integer` wrong.
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

async function main(): Promise<void> {
  console.log('\nBuilding the Vantis estate  (five seeded streams, deterministic)\n');
  const estate = buildEstate();

  let total = 0;
  for (const { db, label } of SYSTEMS) {
    // One honest cast at the boundary. Above this line the buckets are fully
    // typed and a mistyped column is a compile error; here the table is reached
    // by a name that only exists as a string, and pretending otherwise would
    // mean a cast at every one of the 37 call sites instead of this one.
    const bucket = estate[BUCKET[db]] as unknown as Record<string, Record<string, unknown>[]>;
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();
    await client.query('begin');
    try {
      // Truncate rather than drop: the schema is the migration's business, the
      // rows are this script's. `cascade` so foreign keys inside one database
      // do not fight the wipe.
      const tables = Object.keys(COLUMNS[db]);
      await client.query(`truncate ${tables.join(', ')} restart identity cascade`);
      let n = 0;
      for (const table of tables) {
        n += await insertAll(client, table, COLUMNS[db][table], bucket[table] ?? []);
      }
      await client.query('commit');
      total += n;
      console.log(`  load    ${db}  ${String(n).padStart(6)} rows across ${String(tables.length).padStart(2)} tables — ${label}`);
    } catch (e: any) {
      await client.query('rollback');
      console.error(`\n  FAIL    ${db} — ${e.message}\n`);
      await client.end();
      process.exit(1);
    }
    await client.end();
  }

  console.log(`\nseed: done — ${total} rows across four databases, ${redact(urlFor('vst_*'))}`);
  console.log('      The code base is not in here. Run `pnpm steering:corpus` for that.\n');
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
