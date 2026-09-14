/**
 * Do the hours we read out of the documents add up to what the answer key says?
 *
 * ── THE MISTAKE THIS FILE IS SHAPED AGAINST ───────────────────────────────
 *
 * The obvious check is "parsed hours == vst_pmo hours". It would go red, and
 * then an afternoon would go into fixing data that is correctly messy. Two
 * quarters were never exported. Some lines are booked against a charge code
 * that closed the previous quarter. Two thirds of the work has no closure
 * report, so its charge code appears in no document and the hours cannot be
 * attributed to any piece of engineering at all.
 *
 * NONE OF THAT IS AN ERROR. It is what the customer has. So the reconciliation
 * asserts the EXPECTED delta — reconstructed from the documents themselves
 * (which quarters exist on disk, which reports were written) — and the residual
 * after that must be zero.
 *
 * ── AND THE SECOND MISTAKE, WHICH THIS PACKAGE HAS ALREADY MADE ONCE ──────
 *
 * The expected delta is NOT obtained by running the parser and writing down
 * what came out. That is how `assertions.ts` ended up with a negative control
 * that evaluated hardcoded ternaries and passed forever. The expected set here
 * comes from the file listing and the answer key; the parser's output is the
 * thing being judged and never the thing doing the judging.
 *
 * `--sabotage` breaks one input at a time and requires the matching assertion
 * to go red, in both directions: remove a file, and also remove a planted gap
 * from the expected set.
 */
import type { Result } from '../../db/init/assertions';

export interface ReconcileInput {
  /**
   * From `vst_derived.source_files` — WHAT WAS INGESTED, not what parsed.
   *
   * This started out derived from the lines themselves, and that was a hole
   * the sabotage found on its first run: delete a file and the quarter simply
   * stopped being judged, so the reconciliation stayed green while a quarter
   * of the estate went missing. A check that narrows its own scope to whatever
   * data turned up cannot fail. Coverage is a claim about files; only the
   * file list can make it.
   */
  files: { file_id: string; kind: string }[];
  /** From `vst_derived.timesheet_lines`. */
  lines: { file_id: string; charge_code_key: string; hours: number; employee_raw: string; approved: boolean | null; note: string | null }[];
  /** From `vst_derived.document_fields` — the closure-report head blocks. */
  fields: { file_id: string; field: string; value: string }[];
  /** From the ANSWER KEY, `vst_pmo`. Used to judge, never to fill a gap. */
  effort: { effort_id: string; completed_on: string; actual_hours: number }[];
  discipline: { effort_id: string; hours: number }[];

  /** Parsed from `pmo/rate-cards/`. */
  rates: { year: number; region: string; discipline: string; rate_eur_per_hour: number }[];
  /** Parsed from `pmo/quotes/`. */
  quoteItems: { quote_id: string; seq: number; description: string; change_class: string; hours: number }[];
  /** Parsed from `pmo/estimates/`. Nothing in the answer key corresponds. */
  estimates: { program_ref: string; basis: string; confidence: string; hours: number }[];

  /** ANSWER KEY. */
  keyRates: { year: number; region: string; discipline: string; rate_eur_per_hour: number }[];
  keyQuoteLines: { quote_id: string; seq: number; change_class: string; hours: number; cr_ref: string | null }[];
  keyQuotes: { quote_id: string; actual_hours_final: number | null }[];
}

const TOL = 0.05;

/** `2021-07-14` → `2021-Q3`. */
export function quarterOf(day: string): string {
  const m = Number(day.slice(5, 7));
  return `${day.slice(0, 4)}-Q${Math.ceil(m / 3)}`;
}

/** `pmo/timesheets/2021-Q3.csv` → `2021-Q3`. */
function quarterOfFile(path: string): string {
  return path.replace(/^.*\/(\d{4}-Q[1-4])\.csv$/, '$1');
}

export function reconcile(input: ReconcileInput): Result {
  const r: Result = { ok: [], fail: [] };
  const { files, lines, fields, effort, discipline } = input;

  // ── what the documents say exists ────────────────────────────────────────
  const present = new Set(
    files.filter((f) => f.kind === 'timesheet').map((f) => quarterOfFile(f.file_id)),
  );

  // charge code → effort, but only where somebody wrote the closure report.
  const byFile = new Map<string, Record<string, string>>();
  for (const f of fields) byFile.set(f.file_id, { ...(byFile.get(f.file_id) ?? {}), [f.field]: f.value });
  const codeToEffort = new Map<string, string[]>();
  for (const rec of byFile.values()) {
    const code = rec.charge_code?.replace(/\D/g, '');
    if (!code || !rec.reference) continue;
    codeToEffort.set(code, [...(codeToEffort.get(code) ?? []), rec.reference]);
  }

  // ── what the answer key says ─────────────────────────────────────────────
  const hoursOf = new Map<string, number>();
  for (const d of discipline) hoursOf.set(d.effort_id, (hoursOf.get(d.effort_id) ?? 0) + Number(d.hours));
  const quarterOfEffort = new Map(effort.map((e) => [e.effort_id, quarterOf(String(e.completed_on).slice(0, 10))]));

  // ── A1 · the bridge is one-to-one where it exists ────────────────────────
  const ambiguous = [...codeToEffort].filter(([, ids]) => new Set(ids).size > 1);
  (ambiguous.length ? r.fail : r.ok).push({
    label: 'each charge code names at most one effort record',
    detail: ambiguous.length
      ? `${ambiguous.length} code(s) claimed by two efforts, e.g. ${ambiguous[0][0]} → ${ambiguous[0][1].join(', ')}`
      : `${codeToEffort.size} codes recovered from closure-report head blocks, none ambiguous`,
  });

  // ── A2 · per effort, the hours match exactly ─────────────────────────────
  //
  // Attributable AND in a quarter that was actually exported. Anything else is
  // accounted for below rather than silently folded into a tolerance.
  const booked = new Map<string, number>();
  for (const l of lines) {
    if (l.note) continue;                       // booked to a closed code — see A4
    booked.set(l.charge_code_key, (booked.get(l.charge_code_key) ?? 0) + Number(l.hours));
  }
  const judged: string[] = [];
  const wrong: string[] = [];
  // Deliberately accumulated from the ANSWER KEY where an effort was judged,
  // and from the documents only where it could not be. See A8 — summing the
  // documents on both sides of that identity would make it arithmetic that is
  // true by construction and tests nothing.
  let attributedHours = 0;
  for (const [code, ids] of codeToEffort) {
    const id = ids[0];
    const inScope = present.has(quarterOfEffort.get(id) ?? '');
    attributedHours += inScope ? (hoursOf.get(id) ?? 0) : (booked.get(code) ?? 0);
    if (inScope) {
      judged.push(id);
      const expected = hoursOf.get(id) ?? 0;
      const actual = booked.get(code) ?? 0;
      if (Math.abs(expected - actual) > TOL) wrong.push(`${id} (code ${code}): documents ${actual}h, key ${expected}h`);
    }
  }
  (wrong.length ? r.fail : r.ok).push({
    label: 'hours read from the timesheets equal the answer key, per effort',
    detail: wrong.length
      ? `${wrong.length} of ${judged.length} disagree — ${wrong.slice(0, 3).join(' · ')}`
      : `${judged.length} efforts reconciled to the hour; residual 0.0 h`,
  });

  // ── A3 · the missing quarters are the ones missing on disk ───────────────
  const spanned = new Set(effort.map((e) => quarterOfEffort.get(e.effort_id)!));
  const gaps = [...spanned].filter((q) => !present.has(q)).sort();
  (gaps.length ? r.ok : r.fail).push({
    label: 'quarters with no timesheet export at all',
    detail: gaps.length
      ? `${gaps.length} gap(s): ${gaps.join(', ')} — work happened, no file was ever produced`
      : 'NONE — coverage is continuous, which this corpus is not. The gap trap is gone.',
  });

  // ── A4 · the closed-code bookings are visible and set aside ──────────────
  const stale = lines.filter((l) => l.note);
  const staleHours = stale.reduce((a, l) => a + Number(l.hours), 0);
  (stale.length ? r.ok : r.fail).push({
    label: 'lines booked against a closed charge code are kept, flagged, and excluded',
    detail: stale.length
      ? `${stale.length} lines, ${staleHours.toFixed(1)} h, each carrying the '#' note above it`
      : 'NONE FOUND — either the trap is gone or the note is not being carried onto the row',
  });

  // ── A5 · nothing was tidied on the way in ────────────────────────────────
  const names = new Set(lines.map((l) => l.employee_raw));
  const surnames = new Map<string, Set<string>>();
  for (const n of names) {
    const key = (n.includes(',') ? n.split(',')[0] : n.split(' ').pop() ?? n).trim().toLowerCase();
    surnames.set(key, new Set([...(surnames.get(key) ?? []), n]));
  }
  const doubled = [...surnames].filter(([, v]) => v.size > 1);
  (doubled.length ? r.ok : r.fail).push({
    label: 'both spellings of a name survive the parse',
    detail: doubled.length
      ? `${doubled.length} people spelled two ways, e.g. ${[...doubled[0][1]].join(' / ')} — merging them is a judgement, and it is not made here`
      : 'ONE spelling each — the parser is normalising names, which hides a decision',
  });

  // ── A6 · an unsigned line is not a rejected one ──────────────────────────
  const unsigned = lines.filter((l) => l.approved === null).length;
  const rejected = lines.filter((l) => l.approved === false).length;
  (unsigned > 0 && rejected === 0 ? r.ok : r.fail).push({
    label: 'an empty approval is stored as unknown, not as a rejection',
    detail: `${unsigned} unsigned (null), ${rejected} explicitly rejected` +
      (rejected ? ' — a rejection was invented' : ''),
  });

  // ── A7 · the size of the hole, stated ────────────────────────────────────
  const attributable = new Set([...codeToEffort.values()].flat());
  const share = effort.length ? (attributable.size / effort.length) * 100 : 0;
  const unattributed = lines
    .filter((l) => !l.note && !codeToEffort.has(l.charge_code_key))
    .reduce((a, l) => a + Number(l.hours), 0);
  (attributable.size > 0 && attributable.size < effort.length ? r.ok : r.fail).push({
    label: 'hours the documents cannot attribute to any piece of work',
    detail:
      `${attributable.size} of ${effort.length} efforts (${share.toFixed(0)}%) have a closure report and therefore ` +
      `a charge code; ${unattributed.toFixed(0)} h of booked time belongs to work no document names`,
  });

  // ── A8 · the two buckets above account for every hour, exactly once ──────
  //
  // A7's figure is the headline of this whole step — it is the number that says
  // two thirds of the cost history cannot be classified from documents. A7
  // computes it by SUBTRACTION (lines whose code is not in the bridge), and a
  // subtraction is only as good as the claim that there is no third bucket.
  //
  // Without this, a charge code that was recovered from a closure report but
  // whose lines were counted in NEITHER place would inflate the headline and
  // nothing would notice.
  //
  // THE FIRST VERSION OF THIS ASSERTION WAS TAUTOLOGICAL and worth recording:
  // it summed the same lines on both sides, so the two buckets partitioned by
  // construction and the identity could not fail whatever the data did. The
  // fix is that `attributedHours` above is taken from the ANSWER KEY for every
  // effort in scope. The identity then only holds if the parse agreed with the
  // key hour for hour — it is A2 restated as a total, which is the form that
  // catches an error A2's per-effort loop never looks at.
  const total = lines.filter((l) => !l.note).reduce((a, l) => a + Number(l.hours), 0);
  const residual = total - attributedHours - unattributed;
  (Math.abs(residual) <= TOL ? r.ok : r.fail).push({
    label: 'every booked hour is either attributed or explicitly unattributable',
    detail: Math.abs(residual) <= TOL
      ? `${total.toFixed(0)} h total = ${attributedHours.toFixed(0)} attributed + ${unattributed.toFixed(0)} unattributable, exactly`
      : `${residual.toFixed(1)} h counted twice or not at all — the ${unattributed.toFixed(0)} h figure is an artefact`,
  });

  // ── A9 · the rates ──────────────────────────────────────────────────────
  //
  // Worth one sentence about why this is not trivial: the year and region a
  // rate applies to are NOT IN THE DATA. They are in a `#` comment and in the
  // filename. A parser reading only the CSV body would produce 168 numbers
  // that cannot be told apart — and would report full coverage while doing it.
  const keyRate = new Map(input.keyRates.map((k) => [`${k.year}|${k.region}|${k.discipline}`, Number(k.rate_eur_per_hour)]));
  const rateWrong: string[] = [];
  for (const l of input.rates) {
    const k = `${l.year}|${l.region}|${l.discipline}`;
    const want = keyRate.get(k);
    if (want === undefined) rateWrong.push(`${k} is in no rate card the key knows`);
    else if (Math.abs(want - Number(l.rate_eur_per_hour)) > 0.005) rateWrong.push(`${k}: documents ${l.rate_eur_per_hour}, key ${want}`);
  }
  const rateMissing = input.keyRates.length - input.rates.length;
  (rateWrong.length || rateMissing !== 0 ? r.fail : r.ok).push({
    label: 'approved rates read from the rate cards match the answer key',
    detail: rateWrong.length || rateMissing
      ? `${rateWrong.length} wrong, ${rateMissing} missing — ${rateWrong.slice(0, 2).join(' · ')}`
      : `${input.rates.length} rates across ${new Set(input.rates.map((x) => x.year)).size} years and ` +
        `${new Set(input.rates.map((x) => x.region)).size} regions, every one exact`,
  });

  // ── A10 · the quoted lines ──────────────────────────────────────────────
  const keyLine = new Map(input.keyQuoteLines.map((k) => [`${k.quote_id}|${k.seq}`, k]));
  const quoteWrong: string[] = [];
  for (const l of input.quoteItems) {
    const want = keyLine.get(`${l.quote_id}|${l.seq}`);
    if (!want) { quoteWrong.push(`${l.quote_id} line ${l.seq} is in no quotation the key knows`); continue; }
    if (want.change_class !== l.change_class) quoteWrong.push(`${l.quote_id}/${l.seq}: class ${l.change_class} vs ${want.change_class}`);
    if (Math.abs(Number(want.hours) - Number(l.hours)) > TOL) quoteWrong.push(`${l.quote_id}/${l.seq}: ${l.hours}h vs ${want.hours}h`);
  }
  const lineMissing = input.keyQuoteLines.length - input.quoteItems.length;
  (quoteWrong.length || lineMissing !== 0 ? r.fail : r.ok).push({
    label: 'quoted lines read from the markdown tables match the answer key',
    detail: quoteWrong.length || lineMissing
      ? `${quoteWrong.length} wrong, ${lineMissing} missing — ${quoteWrong.slice(0, 2).join(' · ')}`
      : `${input.quoteItems.length} lines across ${new Set(input.quoteItems.map((x) => x.quote_id)).size} quotations, every one exact`,
  });

  // ── A11 · what the money documents DO NOT SAY ───────────────────────────
  //
  // The most useful assertion in this file, and it grades nothing.
  //
  // Three facts sit in `vst_pmo` and in no document anywhere:
  //   · which requirement a quoted line was priced for (`cr_ref`)
  //   · what the work finally cost (`actual_hours_final`)
  //   · the estimates themselves — `vst_pmo` HAS NO ESTIMATES TABLE
  //
  // The last one runs both ways, and that is the interesting part. The
  // documents carry something the databases do not: `basis` and `confidence`,
  // the only record in the estate of HOW SURE ANYBODY WAS. An estimate built
  // from supplier quotes is not the same evidence as one built from guesses,
  // and today nothing can tell them apart — so nothing does.
  const settled = input.keyQuotes.filter((q) => q.actual_hours_final !== null).length;
  const guessed = input.estimates.filter((e) => e.basis === 'guess').length;
  (settled > 0 && input.estimates.length > 0 ? r.ok : r.fail).push({
    label: 'the gap between the documents and the key, in both directions',
    detail:
      `key only: ${settled} quotations record what the work finally cost, and no document does. ` +
      `Documents only: ${input.estimates.length} estimate lines carry a basis and a confidence ` +
      `(${guessed} of them 'guess') — there is no estimates table to compare them against.`,
  });

  // ── A12 · a link that exists in NEITHER half ────────────────────────────
  //
  // Found by writing A11 and being wrong about it. `vst_pmo.quote_lines.cr_ref`
  // is documented in the DDL as a soft key to `vst_alm.customer_requirements` —
  // which requirement a quoted line was priced for — with a comment explaining
  // that nulls are for lines pricing integration or programme management.
  //
  // EVERY ROW IS NULL. The generator writes `cr_ref: null` unconditionally.
  // `db:check`'s soft-key walk never noticed, and could not: a null soft key is
  // legitimately allowed, so a column that is *always* null looks exactly like
  // a column that is *sometimes* null.
  //
  // This is asserted as a KNOWN-EMPTY rather than quietly tolerated, so that
  // the day somebody fills it in, this line goes red and says why. The question
  // it blocks — "what did we last charge for a requirement like this one?" —
  // currently has no answer in either the documents or the databases.
  const pricedFor = input.keyQuoteLines.filter((k) => k.cr_ref).length;
  (pricedFor === 0 ? r.ok : r.fail).push({
    label: 'no quoted line can be traced to the requirement it priced — anywhere',
    detail: pricedFor === 0
      ? `all ${input.keyQuoteLines.length} quoted lines have a null cr_ref in the answer key, and no quotation ` +
        `document names a requirement either. The link does not exist in this estate; it is not lost in extraction.`
      : `${pricedFor} lines now carry a requirement — the estate changed, and this assertion is out of date on purpose.`,
  });

  return r;
}
