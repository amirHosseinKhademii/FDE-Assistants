/**
 * STAGE 3.1 — a tab-separated file becomes documents.
 *
 * Read `docs/safety/PARSE.md` before changing anything here; it is the
 * specification this file was written to match, and it explains every decision
 * below in plain language.
 *
 * ── THE ONE THING THAT WILL BITE A NEWCOMER ───────────────────────────────
 *
 * DO NOT REPLACE `split('\t')` WITH A CSV LIBRARY. It looks like an upgrade and
 * it is a regression. Python's `csv.reader` and every equivalent default to
 * `quotechar='"'`; this file is not quoted, and 708 of its 100,980 lines carry
 * an ODD number of double quotes because people write
 * `THE "SERVICE ENGINE" LIGHT CAME ON`. At an unbalanced quote a quote-aware
 * reader keeps consuming — newlines included — until it finds the next one.
 *
 * MEASURED, and it produced two data-quality "findings" that were not true:
 *
 *   default quoting   100,928 rows   longest narrative 18,257   70,155 complaints
 *   QUOTE_NONE        100,980 rows   longest narrative  2,048   70,194 complaints
 *   awk, no parser    100,980 lines, 51 fields on every one, longest field 2,048
 *
 * NHTSA's own file characteristics say "TAB delimited" and name no quote
 * character. The corpus was clean; the reader was configured for a format the
 * file does not use. See `docs/safety/CORPUS.md` §3.
 */
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * Column positions, transcribed from `CMPL.txt` — NHTSA's own data dictionary.
 *
 * EVERY NUMBER HERE IS THE DICTIONARY'S MINUS ONE, because the dictionary is
 * 1-indexed and JavaScript is not. That off-by-one is the most likely bug in
 * this file and it would NOT error: narratives would simply start arriving in
 * the mileage field, and every downstream count would be about the wrong thing.
 *
 * The file has 51 fields. Only these are used; the rest stay unread rather than
 * half-understood.
 */
const F = {
  ODINO: 1,
  MFR: 2,
  MAKE: 3,
  MODEL: 4,
  YEAR: 5,
  CRASH: 6,
  FAILDATE: 7,
  FIRE: 8,
  INJURED: 9,
  DEATHS: 10,
  COMPDESC: 11,
  CITY: 12,
  STATE: 13,
  VIN: 14,
  LDATE: 16,
  MILES: 17,
  CDESCR: 19,
} as const;

/** What the dictionary says a complaint row has. A short row is a shifted row. */
export const EXPECTED_FIELDS = 51;

export interface ComplaintDoc {
  id: string;
  /** What gets embedded and searched. See `buildText` for why it starts with a header. */
  text: string;
  meta: {
    odino: string;
    manufacturer: string;
    make: string;
    model: string;
    year: number | null;
    /** Received by NHTSA. ISO, always — see `isoDate`. */
    filed: string | null;
    /** Date of the incident itself, which people do not always remember. */
    failed: string | null;
    components: string[];
    crash: boolean;
    fire: boolean;
    injuries: number;
    deaths: number;
    miles: number | null;
    state: string;
    /** 11 of 17 characters. NHTSA's de-identification — never completed or joined on. */
    vin11: string;
  };
}

export interface ParseReport {
  linesRead: number;
  documents: number;
  /** Rows whose field count was not 51. Should be zero; kept because silence is not proof. */
  ragged: number;
  /** Rows folded into a document that already existed — the one-row-per-component fan-out. */
  merged: number;
}

/**
 * NHTSA flat files use `YYYYMMDD`. The API uses `MM/DD/YYYY` for complaints and
 * `DD/MM/YYYY` for recalls — three formats from one agency, and a wrong one
 * shifts every before/after answer while erroring nowhere. Eval case REC-008
 * exists to catch exactly that, which is why this conversion happens once, at
 * the boundary, and nothing downstream sees a raw date.
 *
 * Returns null rather than throwing: a missing `FAILDATE` is normal and is not
 * a parse failure.
 */
export function isoDate(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`;
}

/**
 * `Number('')` is 0, which would quietly turn "we do not know the mileage" into
 * "zero miles" — a fact nobody stated, in a field somebody may filter on.
 */
function int(raw: string): number | null {
  const s = raw.trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

function yn(raw: string): boolean {
  return raw.trim().toUpperCase() === 'Y';
}

/**
 * THE HIGHEST-LEVERAGE STRING IN THE PIPELINE, and it is a concatenation.
 *
 * The narrative never says "F-150". It says "THE GEAR WILL NOT GO INTO PARK".
 * Without this header a question about a 2020 F-150 transmission matches nothing
 * on the meaning arm, however good the embedder is.
 *
 * And stage 3.2 barely runs on this corpus — only 114 investigations are chunked
 * out of 73,334 documents — so the chunker is NOT where retrieval is won here.
 * What the parser puts in the text is what can be found. Everything else stays
 * in `meta`, where it is filtered on: writing "deaths 0" into the text would
 * make every complaint match a question about fatalities.
 */
function buildText(meta: ComplaintDoc['meta'], narrative: string): string {
  const head = [
    [meta.year, meta.make, meta.model].filter(Boolean).join(' '),
    meta.components.join(', '),
    meta.filed ? `filed ${meta.filed}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  return `${head}\n${narrative.trim()}`;
}

/** One line at a time: this slice is 79 MB, the full file is 1.5 GB. */
async function* lines(path: string): AsyncGenerator<string> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    // These files are Windows-origin. Without this a stray \r rides along on
    // the last field's value and compares unequal to everything.
    crlfDelay: Infinity,
  });
  for await (const line of rl) if (line.length > 0) yield line;
}

/**
 * Read the complaints slice and return one document per COMPLAINT.
 *
 * NHTSA writes ONE ROW PER COMPONENT, so 31% of complaints appear more than
 * once with an identical narrative — ODI 11341276 is one person and five rows.
 * Collapsing them is not tidying: left alone, that person occupies five of the
 * six result slots and crowds out four others, and every count published about
 * the corpus is 44% too high.
 *
 * A Map rather than assuming adjacency: the rows ARE adjacent today, and
 * nothing in the format promises it.
 */
export async function parseComplaints(
  path: string,
): Promise<{ docs: ComplaintDoc[]; report: ParseReport }> {
  const byOdi = new Map<string, ComplaintDoc>();
  const narrativeOf = new Map<string, string>();
  const report: ParseReport = { linesRead: 0, documents: 0, ragged: 0, merged: 0 };

  for await (const line of lines(path)) {
    report.linesRead++;
    const f = line.split('\t');
    if (f.length !== EXPECTED_FIELDS) {
      report.ragged++;
      continue;
    }

    const odino = f[F.ODINO].trim();
    const component = f[F.COMPDESC].trim();
    const existing = byOdi.get(odino);

    if (existing) {
      report.merged++;
      if (component && !existing.meta.components.includes(component)) {
        existing.meta.components.push(component);
        existing.text = buildText(existing.meta, narrativeOf.get(odino) ?? '');
      }
      continue;
    }

    const narrative = f[F.CDESCR];
    const meta: ComplaintDoc['meta'] = {
      odino,
      manufacturer: f[F.MFR].trim(),
      make: f[F.MAKE].trim(),
      model: f[F.MODEL].trim(),
      year: int(f[F.YEAR]),
      filed: isoDate(f[F.LDATE]),
      failed: isoDate(f[F.FAILDATE]),
      components: component ? [component] : [],
      crash: yn(f[F.CRASH]),
      fire: yn(f[F.FIRE]),
      injuries: int(f[F.INJURED]) ?? 0,
      deaths: int(f[F.DEATHS]) ?? 0,
      miles: int(f[F.MILES]),
      state: f[F.STATE].trim(),
      vin11: f[F.VIN].trim(),
    };

    narrativeOf.set(odino, narrative);
    byOdi.set(odino, { id: odino, text: buildText(meta, narrative), meta });
  }

  const docs = [...byOdi.values()];
  report.documents = docs.length;
  return { docs, report };
}
