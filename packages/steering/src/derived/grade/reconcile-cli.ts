/**
 * `pnpm steering:derived-reconcile` — grade the parse against the answer key.
 *
 * THE ONE COMMAND ALLOWED TO OPEN `vst_pmo`. Everything else reads `vst_derived`.
 * At a real engagement this command does not exist, because no customer has an
 * answer key — which is why K5's checks (coverage, internal consistency,
 * refusal rate, confidence) come first and this only ever confirms that those
 * track the truth.
 *
 * `--sabotage` breaks one input at a time, in memory, and requires the matching
 * assertion to go red. Including one break in the OTHER direction — removing a
 * planted gap from the expected set — because a check that only fires when data
 * goes missing will happily accept data that was invented.
 */
import { Client } from 'pg';
import { derivedUrl, urlFor } from '../../config/connections';
import { report, type Result } from '../../db/init/assertions';
import { reconcile, type ReconcileInput } from './reconcile';

async function rows(url: string, sql: string): Promise<any[]> {
  const c = new Client({ connectionString: url });
  await c.connect();
  const { rows } = await c.query(sql);
  await c.end();
  return rows;
}

async function load(): Promise<ReconcileInput> {
  const derived = derivedUrl();
  const pmo = urlFor('vst_pmo');
  const [files, lines, fields, effort, discipline, rates, quoteItems, estimates,
         keyRates, keyQuoteLines, keyQuotes] = await Promise.all([
    rows(derived, 'select file_id, kind from source_files'),
    rows(derived, 'select file_id, charge_code_key, hours::float8 as hours, employee_raw, approved, note from timesheet_lines'),
    rows(derived, "select file_id, field, value from document_fields where field in ('charge_code','reference')"),
    rows(pmo, 'select effort_id, completed_on, actual_hours::float8 as actual_hours from effort_records'),
    rows(pmo, 'select effort_id, hours::float8 as hours from effort_by_discipline'),
    rows(derived, 'select year, region, discipline, rate_eur_per_hour::float8 as rate_eur_per_hour from rate_card_lines'),
    rows(derived, 'select quote_id, seq, description, change_class, hours::float8 as hours from quote_line_items'),
    rows(derived, 'select program_ref, basis, confidence, hours::float8 as hours from estimate_lines'),
    rows(pmo, 'select year, region, discipline, rate_eur_per_hour::float8 as rate_eur_per_hour from rate_cards'),
    rows(pmo, 'select quote_id, seq, change_class, hours::float8 as hours, cr_ref from quote_lines'),
    rows(pmo, 'select quote_id, actual_hours_final::float8 as actual_hours_final from quotes'),
  ]);
  return {
    files,
    lines,
    fields,
    effort: effort.map((e) => ({ ...e, completed_on: String(e.completed_on instanceof Date ? e.completed_on.toISOString() : e.completed_on).slice(0, 10) })),
    discipline,
    rates, quoteItems, estimates, keyRates, keyQuoteLines, keyQuotes,
  };
}

/** Each break names the assertion it must turn red. A break that breaks nothing is a dead check. */
const BREAKS: { name: string; must: string; apply: (i: ReconcileInput) => ReconcileInput }[] = [
  {
    name: 'one timesheet file never ingested',
    must: 'hours read from the timesheets equal the answer key, per effort',
    apply: (i) => {
      // The file carrying the most hours, so the break is guaranteed to touch
      // an attributable effort rather than landing in the unattributable 66%.
      //
      // The FILE STAYS REGISTERED and only its lines go, which is the whole
      // point: that is what a silent parser failure looks like from the
      // outside. An earlier version of this break removed both, and the
      // reconciliation then had nothing to miss.
      const by = new Map<string, number>();
      for (const l of i.lines) by.set(l.file_id, (by.get(l.file_id) ?? 0) + l.hours);
      const worst = [...by].sort((a, b) => b[1] - a[1])[0][0];
      return { ...i, lines: i.lines.filter((l) => l.file_id !== worst) };
    },
  },
  {
    name: 'a quarter that was never exported is claimed as present',
    must: 'quarters with no timesheet export at all',
    apply: (i) => {
      // The other direction: invent coverage rather than remove it. A gap check
      // that only notices deletions cannot notice a fabricated file.
      const present = new Set(
        i.files.filter((f) => f.kind === 'timesheet')
          .map((f) => f.file_id.replace(/^.*\/(\d{4}-Q[1-4])\.csv$/, '$1')),
      );
      const spanned = new Set(i.effort.map((e) => {
        const m = Number(e.completed_on.slice(5, 7));
        return `${e.completed_on.slice(0, 4)}-Q${Math.ceil(m / 3)}`;
      }));
      const gap = [...spanned].filter((q) => !present.has(q)).sort();
      return {
        ...i,
        files: [...i.files, ...gap.map((q) => ({ file_id: `pmo/timesheets/${q}.csv`, kind: 'timesheet' }))],
      };
    },
  },
  {
    name: 'closed-code bookings counted as if they were normal time',
    must: 'lines booked against a closed charge code are kept, flagged, and excluded',
    apply: (i) => ({ ...i, lines: i.lines.map((l) => ({ ...l, note: null })) }),
  },
  {
    name: 'employee names normalised on the way in',
    must: 'both spellings of a name survive the parse',
    apply: (i) => ({
      ...i,
      lines: i.lines.map((l) => ({
        ...l,
        employee_raw: l.employee_raw.includes(',')
          ? `${l.employee_raw.split(',')[1].trim()[0]}. ${l.employee_raw.split(',')[0]}`
          : l.employee_raw,
      })),
    }),
  },
  {
    name: 'a charge code recovered but its hours counted in neither bucket',
    must: 'every booked hour is either attributed or explicitly unattributable',
    apply: (i) => {
      // Misread one closure report's charge code. Its real timesheet lines now
      // fall into the unattributable bucket, while the effort itself still
      // counts as attributed out of the answer key — so the headline moves and
      // the hours are counted twice. A2 does not see it (it compares 0 against
      // 0 for a code with no lines is not reached; the effort is simply judged
      // against a code that has none), and A7 does not see it either. Only the
      // total does.
      const withCode = i.fields.find((f) => f.field === 'charge_code')!;
      return {
        ...i,
        fields: i.fields.map((f) => (f === withCode ? { ...f, value: '9999' } : f)),
      };
    },
  },
  {
    name: 'the year and region read from the CSV body instead of the preamble',
    must: 'approved rates read from the rate cards match the answer key',
    apply: (i) => ({
      // What a parser that ignores the `#` line and the filename produces:
      // 168 rates that all claim to be the same year and region. It looks like
      // a complete parse and it prices eight years of work off one card.
      ...i,
      rates: i.rates.map((x) => ({ ...x, year: 2019, region: 'EU' })),
    }),
  },
  {
    name: 'a quoted line read off by one row',
    must: 'quoted lines read from the markdown tables match the answer key',
    apply: (i) => ({ ...i, quoteItems: i.quoteItems.map((x) => ({ ...x, seq: x.seq + 1 })) }),
  },
  {
    name: 'an empty approval read as a rejection',
    must: 'an empty approval is stored as unknown, not as a rejection',
    apply: (i) => ({ ...i, lines: i.lines.map((l) => ({ ...l, approved: l.approved ?? false })) }),
  },
];

async function main(): Promise<void> {
  const input = await load();

  if (!process.argv.includes('--sabotage')) {
    process.exit(report('derived:reconcile', reconcile(input)));
  }

  console.log('\nSabotage — each break must turn its own assertion red.\n');
  const r: Result = { ok: [], fail: [] };
  const clean = reconcile(input);
  (clean.fail.length ? r.fail : r.ok).push({
    label: 'control — the unsabotaged parse is green',
    detail: `${clean.ok.length} ok, ${clean.fail.length} failing`,
  });

  for (const b of BREAKS) {
    const out = reconcile(b.apply({ ...input, files: [...input.files], lines: [...input.lines], fields: [...input.fields], rates: [...input.rates], quoteItems: [...input.quoteItems] }));
    const caught = out.fail.some((f) => f.label === b.must);
    r[caught ? 'ok' : 'fail'].push({
      label: `detected — ${b.name}`,
      detail: caught
        ? `"${b.must}" went red, as it must`
        : `"${b.must}" STAYED GREEN. That assertion does not test what it claims to.`,
    });
  }
  process.exit(report('derived:reconcile --sabotage', r));
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
