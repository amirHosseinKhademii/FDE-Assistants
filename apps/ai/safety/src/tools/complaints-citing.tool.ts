/**
 * STAGE 4.4b — `complaints_citing`, the edge owners built by hand.
 *
 * Read `docs/safety/STAGE4.md` §3.5 first; it is the specification this matches.
 *
 * ── THE GRAPH THIS CORPUS ACTUALLY HAS ────────────────────────────────────
 *
 * Everyone expects a link from investigations to the recalls they caused, and
 * NHTSA publishes one. MEASURED, it barely exists:
 *
 *   investigations                                    114
 *     carrying a campaign number                       42
 *     whose campaign resolves to a recall we hold      14     ← 12%
 *
 * The link that works was never designed. Owners type campaign numbers into
 * their own complaint narratives:
 *
 *   complaints naming a campaign id in their text   5,361
 *     distinct campaigns named                        689
 *     resolving to a recall we hold                   563
 *
 * ── WHY THAT IS A DIFFERENT CLAIM FROM "SAME COMPONENT" ───────────────────
 *
 * REC-001 asks whether a fix is holding. The whole trap of that case is that
 * 1,057 complaints share a COMPONENT with the recall and only some describe the
 * DEFECT — and a system reporting the larger number sounds confident and is
 * wrong.
 *
 * These seven are neither. The person filing had the campaign number in front
 * of them. They are not evidence by similarity; they are evidence by reference.
 * That does not make them proof the remedy failed — see ARCHITECTURE.md
 * guardrail 5 — but it is the strongest material the corpus offers.
 *
 * ── AND IT IS A TOOL, NOT A GRAPH LAYER ───────────────────────────────────
 *
 * One hop is a lookup. No graph store, no node embeddings, no community
 * detection: those would be machinery around a string match.
 *
 * ── AND IT FINDS WHAT THE FILTER CANNOT ───────────────────────────────────
 *
 * One of the seven, ODI 11618838, is filed under model `F-250 SD`. Its
 * narrative opens "The contact owns a 2020 Ford F-150". NHTSA's own structured
 * field disagrees with the owner's own words, and `search_complaints` believes
 * the field — so filtering on `model = F-150` CANNOT return it. Measured.
 *
 * That is the honest limit of stage 4's thesis. Filtering on structured fields
 * beats matching prose, and it inherits whatever the fields get wrong: 1 of the
 * 177 complaints whose text says "owns a 2020 Ford F-150" is filed as something
 * else. It is also why this tool is not a duplicate of 4.3 — reference reaches
 * what the filter misses.
 *
 * ── ONE THING MEASURED AND DELIBERATELY NOT BUILT ─────────────────────────
 *
 * Manufacturers give recalls their OWN numbers, and 20V197000's remedy text
 * ends "Ford's number for this recall is 20S18". It seemed likely owners would
 * quote that instead. MEASURED: 7 complaints name 20V197000 and **0** name
 * 20S18. So the second lookup was not built. Recorded because a plausible idea
 * that measured to nothing is worth as much as one that worked.
 */
import { Client } from 'pg';
import { safetyDatabaseUrl } from '../config/connections';
import { TABLE } from '../grounding/search';
import { CAMPAIGN_PATTERN } from './get-recall.tool';

export const COMPLAINTS_CITING = 'complaints_citing';

export interface CitingComplaint {
  odi_number: string;
  make: string;
  model: string;
  year: number | null;
  filed: string | null;
  text: string;
  source: string;
}

export interface ComplaintsCitingResult {
  campaign_number: string;
  /** False when the campaign is not in this corpus at all. */
  campaign_exists: boolean;
  complaints: CitingComplaint[];
  note: string;
}

export async function complaintsCiting(
  campaignNumber: string,
  connectionString: string = safetyDatabaseUrl(),
): Promise<ComplaintsCitingResult> {
  const id = campaignNumber.trim().toUpperCase();

  if (!CAMPAIGN_PATTERN.test(id)) {
    return {
      campaign_number: id,
      campaign_exists: false,
      complaints: [],
      note: `"${id}" is not a campaign number, so nothing was searched for.`,
    };
  }

  const client = new Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    // THE CAMPAIGN IS CHECKED FIRST, so "no complaints cite it" and "that
    // campaign is not here" cannot collapse into the same empty list. Same
    // three-silences rule as 4.1 and 4.2: an empty result means nothing until
    // you know which emptiness it is.
    const { rows: exists } = await client.query(
      `select 1 from ${TABLE} where metadata->>'kind'='recall' and metadata->>'id'=$1 limit 1`,
      [id],
    );
    const campaignExists = exists.length > 0;

    const { rows } = await client.query(
      `select metadata, content from ${TABLE}
        where metadata->>'kind' = 'complaint' and content like '%' || $1 || '%'
        order by metadata->>'filed'`,
      [id],
    );

    const complaints: CitingComplaint[] = rows.map((r: any) => ({
      odi_number: String(r.metadata.id),
      make: String(r.metadata.make ?? ''),
      model: String(r.metadata.model ?? ''),
      year: typeof r.metadata.year === 'number' ? r.metadata.year : null,
      filed: r.metadata.filed ?? null,
      text: r.content,
      source: `NHTSA ODI complaint ${r.metadata.id}`,
    }));

    let note: string;
    if (!campaignExists) {
      note =
        `Campaign ${id} is not in this corpus, so this result says nothing about it. ` +
        'Check the campaign exists before reading anything into the count.';
    } else if (!complaints.length) {
      note =
        `No complaint names ${id} in its narrative. That is NOT evidence the recall worked — ` +
        'most owners never quote a campaign number. Use search_complaints on the vehicle ' +
        'and component instead.';
    } else {
      note =
        `${complaints.length} complaint(s) name ${id} directly. The person filing had the ` +
        'campaign in front of them, which is a stronger link than sharing a component — but ' +
        'a complaint is an allegation, not a finding that the remedy failed. ' +
        // The same fact as `count_complaints` carries, and this is the tool most
        // likely to be reached for when someone asks whether a fix is holding.
        'This corpus records NO repair completions, so nothing here shows whether these ' +
        'vehicles had the remedy applied. Report what was filed and ESCALATE the question of ' +
        'whether the fix is working.';
    }

    return { campaign_number: id, campaign_exists: campaignExists, complaints, note };
  } finally {
    await client.end();
  }
}
