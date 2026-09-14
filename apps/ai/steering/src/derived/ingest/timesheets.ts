/**
 * Timesheet exports → rows. PURE: files in, rows out, no database.
 *
 * Pure because the reconciliation has to be able to sabotage it — feed it a
 * corpus with one file removed and require the check to go red. That is only
 * possible if parsing and storing are separate steps.
 *
 * ── WHAT THESE FILES ACTUALLY LOOK LIKE ───────────────────────────────────
 *
 * Four `#` preamble lines, then a header, then data, and somewhere in the
 * middle of some of them another `#` line followed by three rows booked against
 * a charge code that closed the previous quarter. Names appear as `N. Haas` and
 * as `"Haas, Nils"` — quoted, because of the comma. Charge codes appear in
 * three formats because finance was migrated twice. `approved` is `Y` or empty,
 * and empty means never signed off.
 *
 * ── THE TWO DECISIONS IN HERE, STATED ─────────────────────────────────────
 *
 * 1. `charge_code_key` collapses `1158` / `VST1158` / `VST-1158` to `1158`.
 *    That is a FORMAT change and it is reversible — `charge_code_raw` keeps
 *    what was written. The file's own header states the format changed twice,
 *    so this is reading the document, not overruling it.
 *
 * 2. Employee names are NOT collapsed. `M. Lindqvist` and `Lindqvist, Maja`
 *    stay two values. That one is a judgement about who people are, it is not
 *    stated anywhere in the documents, and it belongs somewhere visible.
 *
 * A parser that did both would look tidier and would have hidden the second.
 *
 * ── ONE KNOWN LIMIT, STATED RATHER THAN DISCOVERED ────────────────────────
 *
 * A `#` note inside the data attaches to EVERY line after it, not to the three
 * that follow it. That is correct for these files only because the closed-code
 * block is appended last. If a future export puts a note in the middle, the
 * rows after it get a label they do not deserve. The reconciliation would catch
 * it — those hours would be excluded and the per-effort totals would go short —
 * but the assertion that would fire is the hours one, not the note one.
 */

export interface TimesheetLine {
  file_id: string;
  line_no: number;
  week_ending: string;
  employee_raw: string;
  charge_code_raw: string;
  charge_code_key: string;
  hours: number;
  activity: string;
  /** `null` = never signed off. NOT `false` — nothing was rejected. */
  approved: boolean | null;
  /** The nearest preceding `#` line inside the data, if any. */
  note: string | null;
}

export interface ParseIssue {
  file_id: string;
  line_no: number;
  reason: string;
  text: string;
}

export interface TimesheetParse {
  lines: TimesheetLine[];
  issues: ParseIssue[];
  /** `YYYY-Qn` for every file that exists. The gaps are the point. */
  quarters: string[];
}

/**
 * One CSV data line → fields, honouring double quotes.
 *
 * Hand-rolled rather than a library, and the reason is narrow: it has to be
 * obvious what happens to `"Lindqvist, Maja"`, because that single case is the
 * difference between twelve employees and twenty-four. Six lines that can be
 * read beats a dependency whose quoting mode is a config option.
 */
export function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const HEADER = 'week_ending,employee,charge_code,hours,activity,approved';
const QUARTER = /(\d{4})-Q([1-4])\.csv$/;

export function parseTimesheets(files: readonly { path: string; content: string }[]): TimesheetParse {
  const lines: TimesheetLine[] = [];
  const issues: ParseIssue[] = [];
  const quarters: string[] = [];

  for (const f of files) {
    const q = QUARTER.exec(f.path);
    if (!q) { issues.push({ file_id: f.path, line_no: 0, reason: 'not a quarterly export', text: f.path }); continue; }
    quarters.push(`${q[1]}-Q${q[2]}`);

    // A `#` line BEFORE the header describes the file; one AFTER it describes
    // the rows that follow. Same syntax, different meaning, and the difference
    // is the whole reason the closed-code bookings are recoverable at all.
    let seenHeader = false;
    let note: string | null = null;

    f.content.split('\n').forEach((text, i) => {
      const line_no = i + 1;
      if (!text.trim()) return;
      if (text.startsWith('#')) {
        if (seenHeader) note = text.replace(/^#\s*/, '');
        return;
      }
      if (text.trim() === HEADER) { seenHeader = true; return; }
      if (!seenHeader) {
        issues.push({ file_id: f.path, line_no, reason: 'data before header', text });
        return;
      }

      const c = splitCsv(text);
      if (c.length !== 6) {
        issues.push({ file_id: f.path, line_no, reason: `expected 6 fields, got ${c.length}`, text });
        return;
      }
      const hours = Number(c[3]);
      if (!Number.isFinite(hours)) {
        issues.push({ file_id: f.path, line_no, reason: 'hours not a number', text });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0])) {
        issues.push({ file_id: f.path, line_no, reason: 'week_ending not a date', text });
        return;
      }

      lines.push({
        file_id: f.path,
        line_no,
        week_ending: c[0],
        employee_raw: c[1],
        charge_code_raw: c[2],
        charge_code_key: c[2].replace(/\D/g, ''),
        hours,
        activity: c[4],
        approved: c[5] === 'Y' ? true : c[5] === '' ? null : false,
        note,
      });
    });
  }

  return { lines, issues, quarters: quarters.sort() };
}
