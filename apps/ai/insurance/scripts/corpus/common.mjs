/**
 * Shared pieces for the new document types.
 *
 * Everything here is DETERMINISTIC — no randomness, no timestamps. Same input,
 * byte-identical output, clean `git diff`. A corpus that changes when you
 * regenerate makes every baseline incomparable and every bug unreproducible.
 *
 * THE BANNER IS NOT DECORATION. `document-source.ts` parses these `Key: Value`
 * pairs into the `documents` table, and the precedence columns come from here:
 * jurisdiction, effective date, status, supersession. A generated document
 * without a banner is a document the precedence model cannot see.
 *
 * Field names must match what `bannerFields()` looks for. Adding a field here
 * that the parser does not know is a silent no-op.
 */
export const FICTION =
  '> Meridian Mutual Insurance Company. Fictional document, written for an FDE\n' +
  '> practice engagement. Do not use for anything real.';

/**
 * Render the banner.
 *
 * Each entry becomes `Key: Value`, joined with ` · `, wrapped so no single
 * field is split across lines — the parser stops a value at a line break, and
 * a wrapped value silently loses its tail. That exact bug cost us seven
 * effective dates; see `document-source.ts`.
 */
export function banner(fields) {
  const pairs = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);

  const lines = [];
  let line = '';
  for (const p of pairs) {
    if (line && line.length + p.length + 3 > 72) {
      lines.push(line);
      line = p;
    } else {
      line = line ? `${line} · ${p}` : p;
    }
  }
  if (line) lines.push(line);

  return `${FICTION}\n>\n${lines.map((l) => `> ${l}`).join('\n')}\n`;
}

/** A document, ready to write. */
export const doc = (heading, fields, body) =>
  `# ${heading}\n\n${banner(fields)}\n${body.trim()}\n`;

/** The five jurisdictions the corpus uses, matching the existing state forms. */
export const STATES = {
  IL: 'Illinois',
  TX: 'Texas',
  CA: 'California',
  NY: 'New York',
  FL: 'Florida',
};

/** The forms a guidance document can bear on. */
export const ALL_AUTO_FORMS = [
  'PA-2023-01',
  'PA-2023-01-TX',
  'PA-2023-01-CA',
  'PA-2023-01-NY',
  'PA-2023-01-FL',
];
