/**
 * The half of a prose document that parses: its `Label:   value` head.
 *
 * A project closure report is prose — the classification that makes the cost
 * question answerable is written in the third paragraph in English, and getting
 * it out is a job for a model. But the FIRST TWELVE LINES are a fixed block:
 *
 *     Reference:     EFF-2021-0443
 *     Charge code:   1158
 *     Programme:     PRG-KST-K2  (K2, R-EPS)
 *
 * That block is free, exact, and it carries the one field nothing else in the
 * estate has: the charge code. It is the ONLY bridge between a week of
 * somebody's time in a timesheet and a piece of engineering work. Where no
 * closure report was written — about two thirds of the time — the bridge does
 * not exist, and the hours cannot be attributed to anything. Not a defect in
 * the parser; a fact about the customer.
 *
 * So documents split across pipelines rather than being assigned to one. The
 * 81 MISRA reports will split the same way: `SUMMARY` parses, `DEVIATIONS`
 * does not.
 *
 * ── WHERE THE BLOCK ENDS ──────────────────────────────────────────────────
 *
 * At the first numbered section heading. Not at the first blank line — the
 * block already contains one — and not at "the first line without a colon",
 * which would run on into the prose and start harvesting sentences that happen
 * to contain one.
 */

export interface DocumentField {
  file_id: string;
  line_no: number;
  field: string;
  label_raw: string;
  value: string;
}

const SECTION = /^\s*\d+\.\s+[A-Z]/;
const FIELD = /^([A-Z][A-Za-z ]{1,28}):\s{2,}(\S.*)$/;

/** `Charge code` → `charge_code`. Lowercase, spaces to underscores, nothing else. */
export function normaliseLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function parseLabelBlocks(
  files: readonly { path: string; content: string }[],
): DocumentField[] {
  const out: DocumentField[] = [];
  for (const f of files) {
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (SECTION.test(lines[i])) break;
      const m = FIELD.exec(lines[i]);
      if (!m) continue;
      out.push({
        file_id: f.path,
        line_no: i + 1,
        field: normaliseLabel(m[1]),
        label_raw: m[1],
        value: m[2].trim(),
      });
    }
  }
  return out;
}
