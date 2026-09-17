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

/** What a document is FROM. The pipeline downstream treats all three alike. */
export type DocKind = 'complaint' | 'recall' | 'investigation';

/** Any of the three. Everything downstream — chunk, embed, index — takes this. */
export type SafetyDoc = ComplaintDoc | RecallDoc | InvestigationDoc;

export interface ComplaintDoc {
  id: string;
  kind: 'complaint';
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
    byOdi.set(odino, { id: odino, kind: 'complaint', text: buildText(meta, narrative), meta });
  }

  const docs = [...byOdi.values()];
  report.documents = docs.length;
  return { docs, report };
}


// ─────────────────────────────────────────────────────────────────────────────
// RECALLS — one CAMPAIGN, one document
//
// The file has 44,791 rows and 3,026 campaigns: NHTSA writes one row per
// make/model/year a campaign covers. A person quotes `20V437000`, never "row
// 18,332", so the campaign is the unit and the vehicles are metadata.
//
// Column numbers are RCL.txt's minus one. Note field 21 is spelled
// `CONEQUENCE_DEFECT` in NHTSA's own dictionary — the typo is theirs and is
// reproduced here deliberately, because a reader checking this against the
// dictionary should find them identical.
// ─────────────────────────────────────────────────────────────────────────────

const R = {
  CAMPNO: 1,
  MAKETXT: 2,
  MODELTXT: 3,
  YEARTXT: 4,
  COMPNAME: 6,
  MFGNAME: 7,
  POTAFF: 11,
  ODATE: 12,
  INFLUENCED_BY: 13,
  DESC_DEFECT: 19,
  CONEQUENCE_DEFECT: 20,
  CORRECTIVE_ACTION: 21,
} as const;

export const RECALL_FIELDS = 27;

export interface RecallDoc {
  id: string;
  kind: 'recall';
  text: string;
  meta: {
    campno: string;
    component: string;
    manufacturer: string;
    /** Every make/model/year this campaign covers — the fan-out, folded in. */
    vehicles: Array<{ make: string; model: string; year: number | null }>;
    /** Date the manufacturer notified owners. The "after the remedy" clock. */
    notified: string | null;
    /** MFR, ODI or OVSC. 133 of 3,026 were NOT volunteered — CORPUS.md §4. */
    influencedBy: string;
    unitsAffected: number | null;
  };
}

export async function parseRecalls(
  path: string,
): Promise<{ docs: RecallDoc[]; report: ParseReport }> {
  const byCamp = new Map<string, RecallDoc>();
  const prose = new Map<string, string>();
  const report: ParseReport = { linesRead: 0, documents: 0, ragged: 0, merged: 0 };

  for await (const line of lines(path)) {
    report.linesRead++;
    const f = line.split('\t');
    if (f.length < RECALL_FIELDS) {
      report.ragged++;
      continue;
    }

    const campno = f[R.CAMPNO].trim();
    const vehicle = {
      make: f[R.MAKETXT].trim(),
      model: f[R.MODELTXT].trim(),
      year: int(f[R.YEARTXT]),
    };
    const existing = byCamp.get(campno);

    if (existing) {
      report.merged++;
      const seen = existing.meta.vehicles.some(
        (v) => v.make === vehicle.make && v.model === vehicle.model && v.year === vehicle.year,
      );
      if (!seen) {
        existing.meta.vehicles.push(vehicle);
        existing.text = recallText(existing.meta, prose.get(campno) ?? '');
      }
      continue;
    }

    // Three prose blocks, in the order a reader needs them: what is wrong, what
    // it causes, what will be done. Joined rather than concatenated so a search
    // hit can be traced back to which block it came from.
    const body = [
      f[R.DESC_DEFECT].trim() && `DEFECT: ${f[R.DESC_DEFECT].trim()}`,
      f[R.CONEQUENCE_DEFECT].trim() && `CONSEQUENCE: ${f[R.CONEQUENCE_DEFECT].trim()}`,
      f[R.CORRECTIVE_ACTION].trim() && `REMEDY: ${f[R.CORRECTIVE_ACTION].trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

    const meta: RecallDoc['meta'] = {
      campno,
      component: f[R.COMPNAME].trim(),
      manufacturer: f[R.MFGNAME].trim(),
      vehicles: [vehicle],
      notified: isoDate(f[R.ODATE]),
      influencedBy: f[R.INFLUENCED_BY].trim(),
      unitsAffected: int(f[R.POTAFF]),
    };

    prose.set(campno, body);
    byCamp.set(campno, { id: campno, kind: 'recall', text: recallText(meta, body), meta });
  }

  const docs = [...byCamp.values()];
  report.documents = docs.length;
  return { docs, report };
}

/** Same argument as `buildText`: the prose rarely names the campaign or the car. */
function recallText(meta: RecallDoc['meta'], body: string): string {
  const vehicles = meta.vehicles
    .slice(0, 6)
    .map((v) => [v.year, v.make, v.model].filter(Boolean).join(' '))
    .join('; ');
  const more = meta.vehicles.length > 6 ? ` (+${meta.vehicles.length - 6} more)` : '';
  const head = [
    `RECALL ${meta.campno}`,
    meta.component,
    `${vehicles}${more}`,
    meta.notified ? `owners notified ${meta.notified}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  return `${head}\n${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVESTIGATIONS — the only source with a LINK to another source
//
// Field 9 is `CAMPNO`, "Recall Campaign Number, if applicable". That is the
// edge from an investigation to the recall it produced, already in the data —
// the graph `docs/rag/GRAPH.md` describes, without having to infer one.
//
// Also the only source that needs chunking: 114 documents, mean 2,504
// characters, max 5,796.
// ─────────────────────────────────────────────────────────────────────────────

const I = {
  ACTION_NUMBER: 0,
  MAKE: 1,
  MODEL: 2,
  YEAR: 3,
  COMPNAME: 4,
  MFR_NAME: 5,
  ODATE: 6,
  CDATE: 7,
  CAMPNO: 8,
  SUBJECT: 9,
  SUMMARY: 10,
} as const;

export const INVESTIGATION_FIELDS = 11;

export interface InvestigationDoc {
  id: string;
  kind: 'investigation';
  text: string;
  meta: {
    actionNumber: string;
    subject: string;
    component: string;
    manufacturer: string;
    vehicles: Array<{ make: string; model: string; year: number | null }>;
    opened: string | null;
    closed: string | null;
    /** The recall this investigation led to, when there was one. The graph edge. */
    campno: string | null;
  };
}

export async function parseInvestigations(
  path: string,
): Promise<{ docs: InvestigationDoc[]; report: ParseReport }> {
  const byAction = new Map<string, InvestigationDoc>();
  const summaries = new Map<string, string>();
  const report: ParseReport = { linesRead: 0, documents: 0, ragged: 0, merged: 0 };

  for await (const line of lines(path)) {
    report.linesRead++;
    const f = line.split('\t');
    if (f.length < INVESTIGATION_FIELDS) {
      report.ragged++;
      continue;
    }

    const id = f[I.ACTION_NUMBER].trim();
    const vehicle = {
      make: f[I.MAKE].trim(),
      model: f[I.MODEL].trim(),
      year: int(f[I.YEAR]),
    };
    const existing = byAction.get(id);

    if (existing) {
      report.merged++;
      const seen = existing.meta.vehicles.some(
        (v) => v.make === vehicle.make && v.model === vehicle.model && v.year === vehicle.year,
      );
      if (!seen) {
        existing.meta.vehicles.push(vehicle);
        existing.text = investigationText(existing.meta, summaries.get(id) ?? '');
      }
      continue;
    }

    const summary = f[I.SUMMARY].trim();
    const campno = f[I.CAMPNO].trim();
    const meta: InvestigationDoc['meta'] = {
      actionNumber: id,
      subject: f[I.SUBJECT].trim(),
      component: f[I.COMPNAME].trim(),
      manufacturer: f[I.MFR_NAME].trim(),
      vehicles: [vehicle],
      opened: isoDate(f[I.ODATE]),
      closed: isoDate(f[I.CDATE]),
      campno: campno || null,
    };

    summaries.set(id, summary);
    byAction.set(id, {
      id,
      kind: 'investigation',
      text: investigationText(meta, summary),
      meta,
    });
  }

  const docs = [...byAction.values()];
  report.documents = docs.length;
  return { docs, report };
}

function investigationText(meta: InvestigationDoc['meta'], summary: string): string {
  const vehicles = meta.vehicles
    .slice(0, 6)
    .map((v) => [v.year, v.make, v.model].filter(Boolean).join(' '))
    .join('; ');
  const head = [
    `INVESTIGATION ${meta.actionNumber}`,
    meta.component,
    vehicles,
    meta.opened ? `opened ${meta.opened}` : null,
    meta.campno ? `led to recall ${meta.campno}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
  return `${head}\n${meta.subject}\n${summary}`;
}
