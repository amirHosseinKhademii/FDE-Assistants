/**
 * STAGE 4.1 — `get_recall`, exact lookup by campaign number.
 *
 * Read `docs/safety/STAGE4.md` §3.1 first; it is the specification this matches.
 *
 * ── THIS TOOL EXISTS IN ORDER NOT TO BE A SEARCH ──────────────────────────
 *
 * A campaign number has exactly one answer. `20V197000` is a specific document
 * and no other document is a worse-but-acceptable version of it.
 *
 * Stage 3.5 proved what happens when you ask search instead: the query
 * "recall 20V197000" returned the campaign at position FOUR, behind a Lincoln
 * Corsair complaint and a Thomas Built bus recall, because `to_tsquery` matches
 * the common word "recall" across thousands of documents and the dense arm
 * returns passages that merely LOOK like they contain campaign numbers.
 *
 *   IF THE QUESTION HAS ONE EXACT ANSWER, IT IS A LOOKUP, NOT A SEARCH.
 *
 * Insurance reached the same rule with `get_policyholder` on a corpus that
 * shares nothing with this one.
 *
 * ── AND `influenced_by` IS WHY THIS TOOL RETURNS FIELDS, NOT PROSE ────────
 *
 * REC-003 asks whether Ford volunteered a recall or was pushed into it. That is
 * not a judgement to be inferred from the defect text — it is a STRUCTURED
 * FIELD, `INFLUENCED_BY`, and its value is one of three codes. A tool that
 * handed back only the narrative would force the model to guess at something
 * the data states outright, and the key's check is `does_not_escalate`: hedging
 * on a recorded fact is wrong in the opposite direction.
 *
 * DOMAIN: the exact-lookup tool. Swap the id pattern and the record shape; keep
 * the lookup/search split and the informative miss.
 */
import { Client } from 'pg';
import { safetyDatabaseUrl } from '../config/connections';
import { TABLE } from '../grounding/search';

export const GET_RECALL = 'get_recall';

/**
 * NHTSA campaign numbers: two digits of year, a type letter, six digits.
 *
 *   20V197000   V = vehicle    E = equipment
 *   23E014000   T = tyre       S = child seat
 *
 * Checked so a MALFORMED id and an ABSENT one can be reported differently —
 * see the miss type below.
 */
export const CAMPAIGN_PATTERN = /^\d{2}[VETS]\d{6}$/;

/** What `INFLUENCED_BY` means, spelled out. REC-003 turns on this distinction. */
const INITIATED_BY: Record<string, string> = {
  MFR: 'the manufacturer, voluntarily',
  ODI: "NHTSA's Office of Defects Investigation — not volunteered",
  OVSC: "NHTSA's Office of Vehicle Safety Compliance — not volunteered",
};

export interface RecallResult {
  found: true;
  campaign_number: string;
  manufacturer: string;
  component: string;
  vehicles: Array<{ make: string; model: string; year: number | null }>;
  units_affected: number | null;
  owners_notified: string | null;
  /** The raw code, kept so nothing downstream has to parse English. */
  influenced_by: string;
  /** The code in words, because the answer has to say it in words. */
  initiated_by: string;
  defect: string | null;
  consequence: string | null;
  remedy: string | null;
  /** What a citation should name. */
  source: string;
  /**
   * What `units_affected` is, in words, for a `counts` entry.
   *
   * Same reason `count_complaints` carries one: a run captioned this number
   * "units_affected", which is a field name rather than a sentence. The tool
   * knows what its own number means; the model should not have to invent a
   * description of it.
   */
  describes: string;
}

export interface RecallMiss {
  found: false;
  campaign_number: string;
  /** `malformed` and `absent` are different problems with different fixes. */
  reason: 'malformed' | 'absent';
  note: string;
}

export type RecallLookup = RecallResult | RecallMiss;

/**
 * Pull one labelled section out of the document text.
 *
 * The parser in stage 3.1 wrote these labels; this reads them back. Anchored to
 * the start of a line so the word "REMEDY:" inside a narrative cannot be
 * mistaken for the section heading.
 */
function section(text: string, label: string): string | null {
  const m = new RegExp(`^${label}:\\s*(.*)$`, 'm').exec(text);
  return m ? m[1].trim() || null : null;
}

/**
 * Look up one campaign.
 *
 * Takes a connection string rather than reading the environment, so a caller
 * can point it at another database and nothing here changes — the same seam
 * `CORPUS_DIR` gives the file stages.
 */
export async function getRecall(
  campaignNumber: string,
  connectionString: string = safetyDatabaseUrl(),
): Promise<RecallLookup> {
  const id = campaignNumber.trim().toUpperCase();

  // CHECKED BEFORE THE QUERY, so a typo is reported as a typo. A model that
  // wrote `20V19700` can fix it; a model told only "not found" may conclude the
  // recall does not exist and say so in an answer.
  if (!CAMPAIGN_PATTERN.test(id)) {
    return {
      found: false,
      campaign_number: id,
      reason: 'malformed',
      note:
        `"${id}" is not a campaign number. They are two digits, a letter ` +
        '(V vehicle, E equipment, T tyre, S child seat) and six digits — e.g. 20V197000.',
    };
  }

  const client = new Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select content, metadata from ${TABLE}
        where metadata->>'kind' = 'recall' and metadata->>'id' = $1
        limit 1`,
      [id],
    );

    // NOT A NEAR MISS, AND THIS IS THE DELIBERATE PART. There is no fuzzy
    // fallback here, no "did you mean 20V197001". The corpus is a slice —
    // model years 2019 and 2020 — so a well-formed campaign number that is
    // absent is far more likely to be real and out of scope than mistyped, and
    // offering a neighbouring campaign would invite citing the wrong recall.
    if (!rows.length) {
      return {
        found: false,
        campaign_number: id,
        reason: 'absent',
        note:
          `No campaign ${id} in this corpus. The slice covers model years 2019-2020 ` +
          'only, so the campaign may exist at NHTSA and fall outside it. Do not ' +
          'substitute a different campaign.',
      };
    }

    const { content, metadata } = rows[0] as { content: string; metadata: Record<string, any> };
    const code = String(metadata.influencedBy ?? '').toUpperCase();

    return {
      found: true,
      campaign_number: id,
      manufacturer: String(metadata.manufacturer ?? ''),
      component: String(metadata.component ?? ''),
      vehicles: Array.isArray(metadata.vehicles) ? metadata.vehicles : [],
      units_affected: typeof metadata.unitsAffected === 'number' ? metadata.unitsAffected : null,
      owners_notified: metadata.notified ?? null,
      influenced_by: code,
      // Falls through to the raw code rather than guessing, so a fourth code
      // NHTSA adds later shows up as itself instead of as a wrong sentence.
      initiated_by: INITIATED_BY[code] ?? `recorded as "${code}"`,
      defect: section(content, 'DEFECT'),
      consequence: section(content, 'CONSEQUENCE'),
      remedy: section(content, 'REMEDY'),
      source: `NHTSA recall campaign ${id}`,
      describes: `vehicles covered by recall ${id}`,
    };
  } finally {
    await client.end();
  }
}
