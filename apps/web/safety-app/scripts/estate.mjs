/**
 * `pnpm safety:estate` — measure Calder Safety's estate and write it down.
 *
 * ── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
 *
 * `EstateExplorer`'s contract is that nothing on the page is typed in by hand.
 * Pharma's and Vantis' generators run `count(*)` against live databases. There
 * is no database here — this estate is three tab-delimited files — so this
 * counts lines and reads columns instead. Same rule: every figure on the page
 * came out of the file, and the command that produced it is printed under it.
 *
 * ── THE COLUMN NAMES ARE TRANSCRIBED FROM NHTSA'S OWN DICTIONARIES ─────────
 *
 * The flat files have NO HEADER ROW. A column is knowable only by position, so
 * the names below are copied from `CMPL.txt`, `RCL.txt` and `INV.txt` — the
 * agency's published field lists, cited per source. A mis-transcription would
 * silently mislabel a column rather than error, which is the same trap
 * `docs/safety/CORPUS.md` §2 names, so the count is ASSERTED against the file:
 * if the dictionary and the data disagree about how many fields there are, this
 * script fails instead of guessing.
 *
 * ── WHAT IS NOT SHOWN, AND WHY IT IS A JUDGEMENT AND NOT A SETTING ─────────
 *
 * This is the first estate on this site made of real people's records. The
 * obvious generator — take row one's value for every column — would publish a
 * real truncated VIN, a real town, a real complainant's narrative and, in field
 * 51, the vehicle operator's name. So each column carries an explicit decision:
 * a sample is read from the file, or a reason is written for why it is not.
 * `WITHHELD` below is that decision, per column, and it is the only hand-
 * written thing in the output besides the source of each field list.
 *
 * Usage:  NHTSA_DIR=/tmp/nhtsa node scripts/estate.mjs [--samples]
 *         --samples prints every value it is about to publish, and writes
 *         nothing. Run it before trusting the file.
 */
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = process.env.NHTSA_DIR ?? '/tmp/nhtsa';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'lib', 'estate.generated.ts');
const DRY = process.argv.includes('--samples');

/** How long a published sample may be before it is cut. */
const SAMPLE_MAX = 54;

/**
 * Why a column's value is not published.
 *
 * Three reasons, and they are different: it is the person's own words, it
 * locates or identifies them, or it identifies a named third party. The
 * reader sees the reason rather than a blank, because "we did not show this"
 * and "this column is empty" are not the same claim.
 */
const PERSON = 'their own words';
const LOCATES = 'identifies a person';
const THIRD = 'a dealer’s details';

/**
 * COMPLAINTS — 51 fields, from https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt
 * (change log: fields 50–51 added April 2026).
 */
const CMPL = [
  ['CMPLID', 'number'],
  ['ODINO', 'number'],
  ['MFR_NAME', 'text'],
  ['MAKETXT', 'text'],
  ['MODELTXT', 'text'],
  ['YEARTXT', 'text'],
  ['CRASH', 'flag'],
  ['FAILDATE', 'date', LOCATES],
  ['FIRE', 'flag'],
  ['INJURED', 'number'],
  ['DEATHS', 'number'],
  ['COMPDESC', 'text'],
  ['CITY', 'text', LOCATES],
  ['STATE', 'text', LOCATES],
  ['VIN', 'text', LOCATES],
  ['DATEA', 'date'],
  ['LDATE', 'date'],
  ['MILES', 'number', LOCATES],
  ['OCCURENCES', 'number'],
  ['CDESCR', 'text', PERSON],
  ['CMPL_TYPE', 'other'],
  ['POLICE_RPT_YN', 'flag'],
  ['PURCH_DT', 'date', LOCATES],
  ['ORIG_OWNER_YN', 'flag'],
  ['ANTI_BRAKES_YN', 'flag'],
  ['CRUISE_CONT_YN', 'flag'],
  ['NUM_CYLS', 'number'],
  ['DRIVE_TRAIN', 'other'],
  ['FUEL_SYS', 'other'],
  ['FUEL_TYPE', 'other'],
  ['TRANS_TYPE', 'other'],
  ['VEH_SPEED', 'number'],
  ['DOT', 'text', LOCATES],
  ['TIRE_SIZE', 'text'],
  ['LOC_OF_TIRE', 'other'],
  ['TIRE_FAIL_TYPE', 'other'],
  ['ORIG_EQUIP_YN', 'flag'],
  ['MANUF_DT', 'date'],
  ['SEAT_TYPE', 'other'],
  ['RESTRAINT_TYPE', 'other'],
  ['DEALER_NAME', 'text', THIRD],
  ['DEALER_TEL', 'text', THIRD],
  ['DEALER_CITY', 'text', THIRD],
  ['DEALER_STATE', 'text', THIRD],
  ['DEALER_ZIP', 'text', THIRD],
  ['PROD_TYPE', 'other'],
  ['REPAIRED_YN', 'flag'],
  ['MEDICAL_ATTN', 'flag'],
  ['VEHICLES_TOWED_YN', 'flag'],
  ['STATE_OF_INCIDENT', 'text', LOCATES],
  ['VEHICLE_OPERATOR', 'text', LOCATES],
];

/**
 * RECALLS — 29 fields, from https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt
 * (last updated May 2025; fields 28–29 added then).
 *
 * NOTHING IS WITHHELD HERE. Every field is a manufacturer's filed statement or
 * an agency code. There is no person in this file.
 */
const RCL = [
  ['RECORD_ID', 'number'],
  ['CAMPNO', 'text'],
  ['MAKETXT', 'text'],
  ['MODELTXT', 'text'],
  ['YEARTXT', 'text'],
  ['MFGCAMPNO', 'text'],
  ['COMPNAME', 'text'],
  ['MFGNAME', 'text'],
  ['BGMAN', 'date'],
  ['ENDMAN', 'date'],
  ['RCLTYPECD', 'other'],
  ['POTAFF', 'number'],
  ['ODATE', 'date'],
  ['INFLUENCED_BY', 'other'],
  ['MFGTXT', 'text'],
  ['RCDATE', 'date'],
  ['DATEA', 'date'],
  ['RPNO', 'other'],
  ['FMVSS', 'other'],
  ['DESC_DEFECT', 'text'],
  ['CONEQUENCE_DEFECT', 'text'],
  ['CORRECTIVE_ACTION', 'text'],
  ['NOTES', 'text'],
  ['RCL_CMPT_ID', 'text'],
  ['MFR_COMP_NAME', 'text'],
  ['MFR_COMP_DESC', 'text'],
  ['MFR_COMP_PTNO', 'text'],
  ['DO_NOT_DRIVE', 'flag'],
  ['PARK_OUTSIDE', 'flag'],
];

/**
 * INVESTIGATIONS — 11 fields, from https://static.nhtsa.gov/odi/ffdd/inv/INV.txt
 * (last updated September 2023). Field 1 is the agency's own action number and
 * is spelt with spaces in the dictionary; it is written here as the page shows
 * it. Nothing in this file is a member of the public's record.
 */
const INV = [
  ['NHTSA_ACTION_NUMBER', 'text'],
  ['MAKE', 'text'],
  ['MODEL', 'text'],
  ['YEAR', 'text'],
  ['COMPNAME', 'text'],
  ['MFR_NAME', 'text'],
  ['ODATE', 'date'],
  ['CDATE', 'date'],
  ['CAMPNO', 'text'],
  ['SUBJECT', 'text'],
  ['SUMMARY', 'text'],
];

/**
 * One pass per file: count rows, count the distinct values of the column that
 * is the UNIT OF MEANING, count how many rows carry each column at all, and
 * take the first non-empty value of every column we are allowed to publish.
 *
 * ONE PASS, because `FLAT_CMPL` unzips to 1.5 GB and the slice is 79 MB — and
 * because reading it twice would invite the two reads to disagree.
 */
async function survey(file, fields, unitColumn, tally) {
  const samples = new Array(fields.length).fill(undefined);
  const filled = new Array(fields.length).fill(0);
  const units = new Set();
  let rows = 0;
  let ragged = 0;

  const rl = createInterface({ input: createReadStream(join(DIR, file)), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const cells = line.split('\t');
    rows += 1;
    if (cells.length !== fields.length) ragged += 1;
    const unit = cells[unitColumn] ?? '';
    /* EVERY FACT IS COUNTED ONCE PER UNIT OF MEANING, NOT ONCE PER ROW. One
       complaint about five components is five rows and one filing; counting
       deaths per row would report the same death five times. `tally` therefore
       only sees a row the first time its unit appears. */
    const firstSighting = !units.has(unit);
    units.add(unit);
    tally?.(cells, firstSighting);
    for (let i = 0; i < fields.length; i += 1) {
      const v = (cells[i] ?? '').trim();
      if (!v) continue;
      filled[i] += 1;
      if (samples[i] === undefined && !fields[i][2]) {
        samples[i] = v.length > SAMPLE_MAX ? `${v.slice(0, SAMPLE_MAX - 1)}…` : v;
      }
    }
  }

  return { rows, ragged, units: units.size, samples, filled };
}

/**
 * The facts the pages quote, counted here so the page and the estate cannot
 * drift apart. Every one is per unit of meaning — see `survey`.
 */
const cmplFacts = { crash: 0, fire: 0, injured: 0, deaths: 0, fatalities: 0, allCaps: 0, short: 0 };
const makes = new Set();
const makeModel = new Set();
const components = new Set();
const influencedBy = {};

/**
 * HOW LONG A PASSAGE WOULD BE, per source.
 *
 * It decides whether a source is chunked at all, so it is measured rather than
 * described as "thousands". For complaints the passage is the narrative; for
 * recalls it is the three prose blocks a campaign files; for investigations it
 * is the summary. Counted once per unit of meaning, like everything else.
 */
const lengths = { complaints: [0, 0, 0], recalls: [0, 0, 0], investigations: [0, 0, 0] };
const note = (key, n) => {
  lengths[key][0] += n;
  lengths[key][1] += 1;
  /* THE MAXIMUM DECIDES WHETHER TO CHUNK, not the mean. A source whose mean is
     700 and whose longest is 40,000 still needs a chunker for the tail. */
  if (n > lengths[key][2]) lengths[key][2] = n;
};

function tallyComplaint(c, first) {
  /* COMPONENTS ARE A PROPERTY OF THE ROW, NOT OF THE FILING — the fan-out IS
     the component list, so this one is counted on every row. Everything below
     it describes the complaint, so it is counted once. */
  components.add(c[11]);
  if (!first) return;
  if (c[6] === 'Y') cmplFacts.crash += 1;
  if (c[8] === 'Y') cmplFacts.fire += 1;
  if (Number(c[9]) > 0) cmplFacts.injured += 1;
  if (Number(c[10]) > 0) cmplFacts.deaths += 1;
  cmplFacts.fatalities += Number(c[10]) || 0;
  const narrative = c[19] ?? '';
  /* ALL CAPS means "has letters and none of them are lower case" — a narrative
     of digits and punctuation is not shouting, it is just short. */
  if (/[A-Za-z]/.test(narrative) && narrative === narrative.toUpperCase()) cmplFacts.allCaps += 1;
  if (narrative.length < 40) cmplFacts.short += 1;
  note('complaints', narrative.length);
  makes.add(c[3]);
  makeModel.add(`${c[3]}|${c[4]}`);
}

function tallyRecall(c, first) {
  if (!first) return;
  /* Fields 20, 21 and 22 — the defect, what it could do, and what the dealer
     will fit. Together they are what a campaign actually says. */
  note('recalls', (c[19] ?? '').length + (c[20] ?? '').length + (c[21] ?? '').length);
  const by = c[13] || '(blank)';
  influencedBy[by] = (influencedBy[by] ?? 0) + 1;
}

const SOURCES = [
  { db: 'complaints', file: 'CMPL_SLICE.tsv', fields: CMPL, unit: 1, label: 'FLAT_CMPL', tally: tallyComplaint },
  { db: 'recalls', file: 'RCL_SLICE.tsv', fields: RCL, unit: 1, label: 'FLAT_RCL_POST_2010', tally: tallyRecall },
  {
    db: 'investigations',
    file: 'INV_SLICE.tsv',
    fields: INV,
    unit: 0,
    label: 'FLAT_INV',
    /* Field 11 is SUMMARY — what NHTSA wrote down about the enquiry. */
    tally: (c, first) => first && note('investigations', (c[10] ?? '').length),
  },
];

const measured = [];
for (const src of SOURCES) {
  const r = await survey(src.file, src.fields, src.unit, src.tally);
  /* THE ASSERTION THE WHOLE SCRIPT RESTS ON. If the dictionary says 51 fields
     and the data has 52, every name below position N is attached to the wrong
     column — and nothing downstream would notice. */
  if (r.ragged > 0) {
    throw new Error(
      `${src.file}: ${r.ragged} of ${r.rows} rows do not have ${src.fields.length} fields — ` +
        `the transcribed dictionary and the data disagree. Refusing to write.`,
    );
  }
  measured.push({ ...src, ...r });
  console.log(
    `${src.db.padEnd(15)} ${String(r.rows).padStart(7)} rows  ${String(r.units).padStart(7)} units  ` +
      `${src.fields.length} fields`,
  );
}

if (DRY) {
  for (const m of measured) {
    console.log(`\n── ${m.db} — every value this would publish ──`);
    m.fields.forEach(([name, , withheld], i) => {
      const pct = Math.round((m.filled[i] / m.rows) * 100);
      console.log(
        `  ${name.padEnd(20)} ${String(pct).padStart(3)}%  ` +
          (withheld ? `[WITHHELD] ${withheld}` : (m.samples[i] ?? '(empty in every row)')),
      );
    });
  }
  console.log('\n--samples: nothing written.');
  process.exit(0);
}

const estate = measured.map((m) => ({
  db: m.db,
  label: m.label,
  tables: [
    {
      name: m.file.replace('.tsv', ''),
      rows: m.rows,
      columns: m.fields.map(([name, kind, withheld], i) => ({
        name,
        kind,
        /* How many rows carry this column at all. The schema promises far more
           than the file delivers, and a field list that hid that would be
           describing the dictionary rather than the data. */
        filled: Math.round((m.filled[i] / m.rows) * 100),
        ...(withheld ? { withheld } : m.samples[i] !== undefined ? { sample: m.samples[i] } : {}),
      })),
    },
  ],
}));

/**
 * THE DATE COMES FROM THE FILES, NOT FROM THE CLOCK.
 *
 * It was `new Date()`, which is the day the generator last ran — and the page
 * this feeds spends a paragraph arguing that the snapshot must be frozen and
 * dated because `FLAT_CMPL.zip` changes daily. Re-running next month against
 * the same slices would have moved the date and left the numbers alone, which
 * is the exact drift the argument exists to prevent, on the page making it.
 *
 * The three slices are cut in one pass, so the newest of their mtimes is when
 * the snapshot was taken. Each source carries its own as well, because they are
 * three separate downloads and one of them could be refreshed alone.
 */
const snapshotOf = (file) => statSync(join(DIR, file)).mtime.toISOString().slice(0, 10);
const snapshots = Object.fromEntries(measured.map((m) => [m.db, snapshotOf(m.file)]));
const today = Object.values(snapshots).sort().at(-1);
const units = Object.fromEntries(measured.map((m) => [m.db, m.units]));
const rows = Object.fromEntries(measured.map((m) => [m.db, m.rows]));

writeFileSync(
  OUT,
  `/**
 * GENERATED by \`pnpm safety:estate\` — do not edit.
 *
 * Calder Safety's estate is three tab-delimited files published by NHTSA, not
 * three databases. Column names are transcribed from the agency's own data
 * dictionaries and the count is asserted against the data; see
 * \`scripts/estate.mjs\` for why that assertion is the load-bearing part.
 *
 * WHERE A VALUE IS MISSING IT SAYS WHY. This is the first corpus on this site
 * made of real people's records, so a column either carries a value read from
 * the file or carries the reason it is not published. Neither is a default.
 */

export interface EstateColumn {
  name: string;
  /** One real value from the file. Absent where the column may not be shown. */
  sample?: string;
  /** Why this column's values are not published. Mutually exclusive with \`sample\`. */
  withheld?: string;
  /** Percent of rows in which this column is non-empty. */
  filled: number;
  kind: 'text' | 'number' | 'date' | 'flag' | 'json' | 'other';
}

export interface EstateTable {
  name: string;
  columns: EstateColumn[];
  rows: number;
}

export interface EstateSource {
  db: string;
  label: string;
  tables: EstateTable[];
}

/**
 * Every table in the estate, as a union.
 *
 * WHAT IT IS FOR: \`estate-notes.ts\` types its map against this, so a source
 * added here without a sentence describing it is a FAILING TYPECHECK, and a
 * sentence describing a source that has gone is too. The pages' prose cannot
 * quietly fall behind the data.
 */
export type EstateTableKey = ${JSON.stringify(
    estate.flatMap((s) => s.tables.map((t) => `${s.db}.${t.name}`)),
  ).replace(/^\[/, '').replace(/\]$/, '').split(',').join(' | ')};

/**
 * The day the snapshot was cut, read from the slice files themselves — NOT the
 * day this ran. It is frozen on purpose: \`FLAT_CMPL.zip\` changes daily, and an
 * answer key written against moving data rots under its own eval baseline.
 */
export const MEASURED_AT = '${today}';

/** Per source, because they are three downloads and one could be refreshed alone. */
export const SNAPSHOT = ${JSON.stringify(snapshots, null, 2)} as const;

/** The command that reproduces every number in this file. */
export const MEASURED_BY = 'pnpm safety:estate';

/**
 * ROWS AND UNITS OF MEANING ARE NOT THE SAME NUMBER, and the gap is 44%.
 * NHTSA writes one complaint row per component, so one filing appears up to
 * five times; one recall campaign fans out across every make, model and year it
 * covers. Quoting rows as the size of the estate overstates it.
 */
export const ROWS = ${JSON.stringify(rows, null, 2)} as const;

export const UNITS = ${JSON.stringify(units, null, 2)} as const;

export const TOTAL_ROWS = ${measured.reduce((s, m) => s + m.rows, 0)};
export const TOTAL_UNITS = ${measured.reduce((s, m) => s + m.units, 0)};

export const ESTATE: EstateSource[] = ${JSON.stringify(estate, null, 2)};

/**
 * WHAT IS IN THE NARRATIVES AND WHAT HAPPENED TO THE PEOPLE IN THEM.
 *
 * COUNTED PER COMPLAINT, NOT PER ROW. \`docs/safety/CORPUS.md\` §3 and §5 count
 * the same things per row, so its figures are these facts multiplied by the
 * component fan-out. Both are honest; only one can be called "complaints that
 * report a death", and it is this one.
 */
export const COMPLAINT_FACTS = ${JSON.stringify(cmplFacts, null, 2)} as const;

export const DISTINCT = ${JSON.stringify({ makes: makes.size, makeModel: makeModel.size, components: components.size }, null, 2)} as const;

/**
 * \`INFLUENCED_BY\` — who started the recall, PER CAMPAIGN.
 *
 * The one conflict in this estate that needs no inference: NHTSA writes down
 * whether the manufacturer volunteered or was pushed into it.
 */
export const INFLUENCED_BY: Record<string, number> = ${JSON.stringify(influencedBy, null, 2)};

/**
 * MEAN PASSAGE LENGTH IN CHARACTERS, per source, per unit of meaning.
 *
 * This is the number that decides whether a source is chunked. A complaint is
 * already about the size a chunker aims for; a recall campaign and an
 * investigation are not.
 */
export const MEAN_CHARS = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(lengths).map(([k, [sum, n]]) => [k, n ? Math.round(sum / n) : 0]),
    ),
    null,
    2,
  )} as const;

/**
 * THE LONGEST PASSAGE IN EACH SOURCE, which is the number a chunking decision
 * actually turns on. A mean of 700 says nothing if the tail runs to 40,000.
 */
export const MAX_CHARS = ${JSON.stringify(
    Object.fromEntries(Object.entries(lengths).map(([k, v]) => [k, v[2]])),
    null,
    2,
  )} as const;
`,
  'utf8',
);
console.log(`\nwrote ${OUT}`);
