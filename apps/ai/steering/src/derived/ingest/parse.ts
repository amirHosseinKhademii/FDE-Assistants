/**
 * `pnpm steering:derived-parse` — pipeline 1, the deterministic half.
 *
 * Reads the timesheet exports and the closure-report head blocks and writes
 * rows into `vst_derived`. No model, no embeddings, no cost. A failure here is a bug
 * in this file, never a judgement call — which is exactly why it goes first:
 * everything downstream needs something exact to be checked against.
 *
 * IDEMPOTENT by truncate-and-reload, not by upsert. There is one corpus and one
 * pass over it; an upsert path would be untested code guarding against a
 * situation that does not exist yet. When incremental re-ingest is real (K5,
 * where a changed file invalidates the facts derived from it), `source_files`
 * already carries the sha256 it will need.
 */
import { Client } from 'pg';
import { derivedUrl, redact, DERIVED_DB } from '../../config/connections';
import { read, type RawFile } from './corpus';
import { parseTimesheets } from './timesheets';
import { parseLabelBlocks } from './label-blocks';
import { parseRateCards, parseEstimates, parseQuotes, type MoneyIssue } from './money';
import { parseEffortSplits } from './closure-effort';

/**
 * Multi-row INSERT, in chunks.
 *
 * THE FIRST VERSION OF THIS FILE issued one round trip per row and took over
 * two minutes on nine thousand lines against a database in Frankfurt — for a
 * step whose whole argument is that it is free and exact. The work was never
 * the problem; the latency was. 500 rows per statement takes it to seconds.
 *
 * Chunked rather than one enormous statement because Postgres caps a query at
 * 65,535 bind parameters, and ten columns would hit that at 6,553 rows — a
 * limit that would have been discovered by the corpus growing, months later.
 */
async function insert(client: Client, table: string, cols: string[], rows: unknown[][]): Promise<void> {
  const per = Math.max(1, Math.floor(60_000 / cols.length));
  for (let i = 0; i < rows.length; i += per) {
    const batch = rows.slice(i, i + per);
    const values = batch
      .map((_, r) => `(${cols.map((__, c) => `$${r * cols.length + c + 1}`).join(',')})`)
      .join(',');
    await client.query(
      `insert into ${table} (${cols.join(',')}) values ${values}`,
      batch.flat(),
    );
  }
}

async function main(): Promise<void> {
  console.log(`\nParsing the corpus into ${DERIVED_DB} — ${redact(derivedUrl())}\n`);

  const timesheets: RawFile[] = read('pmo/timesheets');
  const closures: RawFile[] = read('pmo/closure-reports');
  const cards: RawFile[] = read('pmo/rate-cards');
  const estimates: RawFile[] = read('pmo/estimates');
  const quotes: RawFile[] = read('pmo/quotes');

  const ts = parseTimesheets(timesheets);
  const rc = parseRateCards(cards);
  const est = parseEstimates(estimates);
  const qt = parseQuotes(quotes);
  const fields = [...parseLabelBlocks(closures), ...qt.fields];
  const eff = parseEffortSplits(closures);

  console.log(`  read    ${timesheets.length} timesheets · ${closures.length} closure reports · ` +
    `${cards.length} rate cards · ${estimates.length} estimates · ${quotes.length} quotations`);
  console.log(`  parse   ${ts.lines.length} timesheet lines · ${rc.lines.length} rates · ` +
    `${est.lines.length} estimate lines · ${qt.items.length} quote lines · ${fields.length} labelled fields · ` +
    `${eff.lines.length} discipline splits`);

  // Printed, never swallowed. A parser that silently drops what it cannot read
  // reports 100% coverage of whatever it happened to understand.
  const issues: (MoneyIssue | { file_id: string; line_no: number; reason: string })[] =
    [...ts.issues, ...rc.issues, ...est.issues, ...qt.issues];
  if (issues.length) {
    console.log(`  issues  ${issues.length} line(s) not parsed:`);
    for (const i of issues.slice(0, 8)) console.log(`            ${i.file_id}:${i.line_no}  ${i.reason}`);
  }

  const client = new Client({ connectionString: derivedUrl() });
  await client.connect();
  await client.query('begin');
  try {
    await client.query('truncate source_files cascade');

    const registered: [string, RawFile[]][] = [
      ['timesheet', timesheets], ['closure-report', closures],
      ['rate-card', cards], ['estimate', estimates], ['quotation', quotes],
    ];
    await insert(client, 'source_files', ['file_id', 'kind', 'sha256', 'bytes', 'lines'],
      registered.flatMap(([kind, fs]) => fs.map((f) => [f.path, kind, f.sha256, f.bytes, f.lines])));
    await insert(client, 'timesheet_lines',
      ['file_id', 'line_no', 'week_ending', 'employee_raw', 'charge_code_raw',
       'charge_code_key', 'hours', 'activity', 'approved', 'note'],
      ts.lines.map((l) => [l.file_id, l.line_no, l.week_ending, l.employee_raw,
        l.charge_code_raw, l.charge_code_key, l.hours, l.activity, l.approved, l.note]));
    await insert(client, 'document_fields', ['file_id', 'line_no', 'field', 'label_raw', 'value'],
      fields.map((f) => [f.file_id, f.line_no, f.field, f.label_raw, f.value]));
    await insert(client, 'rate_card_lines',
      ['file_id', 'line_no', 'year', 'region', 'discipline', 'rate_eur_per_hour'],
      rc.lines.map((l) => [l.file_id, l.line_no, l.year, l.region, l.discipline, l.rate_eur_per_hour]));
    await insert(client, 'estimate_lines',
      ['file_id', 'line_no', 'program_ref', 'author', 'estimated_on', 'work_package',
       'discipline', 'hours', 'basis', 'confidence'],
      est.lines.map((l) => [l.file_id, l.line_no, l.program_ref, l.author, l.estimated_on,
        l.work_package, l.discipline, l.hours, l.basis, l.confidence]));
    await insert(client, 'effort_split_lines', ['file_id', 'line_no', 'subject', 'discipline', 'hours'],
      eff.lines.map((l) => [l.file_id, l.line_no, l.subject, l.discipline, l.hours]));
    await insert(client, 'effort_totals', ['file_id', 'subject', 'hours', 'weeks'],
      eff.totals.map((t) => [t.file_id, t.subject, t.hours, t.weeks]));
    await insert(client, 'quote_line_items',
      ['file_id', 'line_no', 'quote_id', 'seq', 'description', 'change_class', 'hours'],
      qt.items.map((l) => [l.file_id, l.line_no, l.quote_id, l.seq, l.description, l.change_class, l.hours]));
    await client.query('commit');
  } catch (e: any) {
    await client.query('rollback');
    console.error(`\n  FAIL    ${e.message}\n`);
    await client.end();
    process.exit(1);
  }
  await client.end();

  console.log(`\nderived:parse: done — ${ts.quarters.length} quarters present. Next: derived:reconcile.\n`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
