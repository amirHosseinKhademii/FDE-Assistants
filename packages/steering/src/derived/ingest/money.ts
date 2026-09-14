/**
 * The rest of pipeline 1: rate cards, bottom-up estimates, quotations.
 *
 * PURE, like the timesheets — files in, rows out — so the reconciliation can
 * sabotage it without touching a database.
 *
 * ── WHY THE KEY IS IN THE COMMENT, AND WHY WE READ IT ANYWAY ──────────────
 *
 * A rate card is seven rows of `discipline,rate`. WHICH YEAR AND WHICH REGION
 * those rates apply to is nowhere in the data — it is in a `#` line above the
 * header, and in the filename. A parser that reads only the CSV body produces
 * 168 rates that cannot be told apart, which is worse than useless because it
 * looks complete.
 *
 * Both sources are read and they are required to AGREE. Two independent
 * statements of the same fact are free evidence, and throwing one away to save
 * four lines would mean a renamed file could silently reprice eight years of
 * work.
 *
 * ── THE THREE DOCUMENTS ARE NOT THE SAME KIND OF THING ────────────────────
 *
 * A rate card is a fact approved by finance. A quotation is a promise made to a
 * customer before the work. An estimate is how that promise was arrived at,
 * including — uniquely in this whole estate — HOW SURE ANYBODY WAS. Keeping
 * them in three tables rather than one `money_lines` is not tidiness; it is
 * refusing to average a supplier quote together with somebody's guess.
 */
import { splitCsv } from './timesheets';
import type { DocumentField } from './label-blocks';

export interface RateCardLine {
  file_id: string; line_no: number; year: number; region: string;
  discipline: string; rate_eur_per_hour: number;
}
export interface EstimateLine {
  file_id: string; line_no: number; program_ref: string; author: string;
  estimated_on: string; work_package: string; discipline: string;
  hours: number; basis: string; confidence: string;
}
export interface QuoteLineItem {
  file_id: string; line_no: number; quote_id: string; seq: number;
  description: string; change_class: string; hours: number;
}
export interface MoneyIssue { file_id: string; line_no: number; reason: string }

type File = { path: string; content: string };

// ── rate cards ─────────────────────────────────────────────────────────────

const CARD_META = /^#\s*year:\s*(\d{4})\s+region:\s*(\w+)/;
const CARD_NAME = /(\d{4})-(\w+)\.csv$/;

export function parseRateCards(files: readonly File[]): { lines: RateCardLine[]; issues: MoneyIssue[] } {
  const lines: RateCardLine[] = [];
  const issues: MoneyIssue[] = [];

  for (const f of files) {
    const fromName = CARD_NAME.exec(f.path);
    const rows = f.content.split('\n');
    const meta = rows.map((r) => CARD_META.exec(r)).find(Boolean);

    if (!fromName || !meta) {
      issues.push({ file_id: f.path, line_no: 0, reason: 'no year/region in filename or preamble' });
      continue;
    }
    // The disagreement check. It has never fired; the day it does, somebody has
    // renamed a file and eight years of rates have quietly moved.
    if (fromName[1] !== meta[1] || fromName[2] !== meta[2]) {
      issues.push({
        file_id: f.path, line_no: 0,
        reason: `filename says ${fromName[1]}-${fromName[2]}, the document says ${meta[1]}-${meta[2]}`,
      });
      continue;
    }

    let seenHeader = false;
    rows.forEach((text, i) => {
      if (!text.trim() || text.startsWith('#')) return;
      if (text.startsWith('discipline,')) { seenHeader = true; return; }
      if (!seenHeader) return;
      const c = splitCsv(text);
      const rate = Number(c[1]);
      if (c.length !== 2 || !Number.isFinite(rate)) {
        issues.push({ file_id: f.path, line_no: i + 1, reason: 'not a discipline,rate pair' });
        return;
      }
      lines.push({
        file_id: f.path, line_no: i + 1,
        year: Number(meta[1]), region: meta[2],
        discipline: c[0], rate_eur_per_hour: rate,
      });
    });
  }
  return { lines, issues };
}

// ── estimates ──────────────────────────────────────────────────────────────

const EST_META = /^#\s*author:\s*(.+?)\s{2,}date:\s*(\d{4}-\d{2}-\d{2})/;
const EST_NAME = /([A-Z]{3}-[A-Z]{3}-[A-Z0-9]{2,3})-estimate\.csv$/;

export function parseEstimates(files: readonly File[]): { lines: EstimateLine[]; issues: MoneyIssue[] } {
  const lines: EstimateLine[] = [];
  const issues: MoneyIssue[] = [];

  for (const f of files) {
    const prog = EST_NAME.exec(f.path);
    const rows = f.content.split('\n');
    const meta = rows.map((r) => EST_META.exec(r)).find(Boolean);
    if (!prog || !meta) {
      issues.push({ file_id: f.path, line_no: 0, reason: 'no programme in filename, or no author line' });
      continue;
    }

    let seenHeader = false;
    rows.forEach((text, i) => {
      if (!text.trim() || text.startsWith('#')) return;
      if (text.startsWith('work_package,')) { seenHeader = true; return; }
      if (!seenHeader) return;
      const c = splitCsv(text);
      const hours = Number(c[2]);
      if (c.length !== 5 || !Number.isFinite(hours)) {
        issues.push({ file_id: f.path, line_no: i + 1, reason: `expected 5 fields, got ${c.length}` });
        return;
      }
      lines.push({
        file_id: f.path, line_no: i + 1,
        program_ref: prog[1], author: meta[1], estimated_on: meta[2],
        work_package: c[0], discipline: c[1], hours, basis: c[3], confidence: c[4],
      });
    });
  }
  return { lines, issues };
}

// ── quotations ─────────────────────────────────────────────────────────────
//
// Markdown, and therefore the point where pipeline 1 stops being CSV reading.
// It still parses, because the parts that carry numbers are a table and a bold
// total line — both regular. What does NOT parse is the Assumptions section
// below them, which is prose and belongs to pipeline 3. Same split as the MISRA
// reports: take the half that is exact, hand the other half over honestly.

const QUOTE_ID = /^#\s*Quotation\s+(QUO-\d+)/;
const BOLD_PAIR = /\*\*([A-Za-z ]+):\*\*\s*([^·]+)/g;
const TOTAL = /^\*\*Quoted total:\s*([\d.]+)\s*hours\s*—\s*EUR\s*([\d,.]+)\*\*/;
const TOOLING = /^Tooling, quoted separately:\s*EUR\s*([\d,.]+)/;
const ROW = /^\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/;

const num = (s: string): number => Number(s.replace(/,/g, ''));

export function parseQuotes(
  files: readonly File[],
): { items: QuoteLineItem[]; fields: DocumentField[]; issues: MoneyIssue[] } {
  const items: QuoteLineItem[] = [];
  const fields: DocumentField[] = [];
  const issues: MoneyIssue[] = [];

  for (const f of files) {
    const rows = f.content.split('\n');
    const idm = rows.map((r) => QUOTE_ID.exec(r)).find(Boolean);
    if (!idm) { issues.push({ file_id: f.path, line_no: 0, reason: 'no quotation id' }); continue; }
    const quote_id = idm[1];
    fields.push({ file_id: f.path, line_no: 1, field: 'quote_id', label_raw: 'Quotation', value: quote_id });

    let sawTotal = false;
    rows.forEach((text, i) => {
      const line_no = i + 1;

      // `**RFQ:** x · **Programme:** y` — TWO fields on ONE line. The reason
      // `document_fields` is not keyed on the line number.
      for (const m of text.matchAll(BOLD_PAIR)) {
        fields.push({
          file_id: f.path, line_no,
          field: m[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          label_raw: m[1].trim(), value: m[2].trim(),
        });
      }

      const t = TOTAL.exec(text);
      if (t) {
        sawTotal = true;
        fields.push({ file_id: f.path, line_no, field: 'quoted_hours', label_raw: 'Quoted total', value: t[1] });
        fields.push({ file_id: f.path, line_no, field: 'quoted_eur', label_raw: 'Quoted total', value: String(num(t[2])) });
        return;
      }
      const tl = TOOLING.exec(text);
      if (tl) {
        fields.push({ file_id: f.path, line_no, field: 'tooling_eur', label_raw: 'Tooling', value: String(num(tl[1])) });
        return;
      }

      const r = ROW.exec(text);
      if (!r) return;
      const hours = Number(r[4].trim());
      if (!Number.isFinite(hours)) {
        issues.push({ file_id: f.path, line_no, reason: 'quote line without a number of hours' });
        return;
      }
      items.push({
        file_id: f.path, line_no, quote_id, seq: Number(r[1]),
        description: r[2].trim(), change_class: r[3].trim(), hours,
      });
    });

    if (!sawTotal) issues.push({ file_id: f.path, line_no: 0, reason: 'no quoted total line' });
  }
  return { items, fields, issues };
}
