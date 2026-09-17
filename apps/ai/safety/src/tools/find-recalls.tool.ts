/**
 * STAGE 4.2 — `find_recalls`, and it is allowed to find nothing.
 *
 * Read `docs/safety/STAGE4.md` §3.2 first; it is the specification this matches.
 *
 * ── THE EMPTY LIST IS THE PRODUCT ─────────────────────────────────────────
 *
 * REC-005 asks whether a recall covers the 2019-2020 Honda Odyssey's
 * forward-collision braking. It does not. That is the answer, and it is the
 * hardest kind of answer for a retrieval system to give, because search has no
 * score cutoff — something always comes back, and it always looks like a
 * candidate.
 *
 * Insurance met the same problem with rideshare coverage and could not solve it
 * structurally: "is rideshare covered" is not a field in a policy document, so
 * deciding the corpus does not answer it is reading comprehension.
 *
 * HERE IT IS A FIELD. A campaign names the make, model, year and component it
 * covers, so the absence of a match is a FACT ABOUT THE CORPUS rather than an
 * impression of it. This tool is what turns that fact into something a model
 * can be held to.
 *
 * ── AND AN EMPTY ANSWER CARRIES ITS OWN EVIDENCE ──────────────────────────
 *
 * "No recalls" and "no recalls FOR THAT COMPONENT" are different claims, and
 * only one of them is true here. MEASURED: the Odyssey has 22 campaigns across
 * 16 components in this slice — cameras, air bags, fuel pumps, door latches —
 * and none for forward collision. So a bare `[]` would understate what we know.
 *
 * When there is no match, this returns the components that DO have campaigns on
 * that vehicle. It is the difference between "I found nothing" and "I looked,
 * the vehicle is well covered, and this component is not among it".
 *
 * DOMAIN: the structured-absence tool. Swap the entity and its filterable
 * fields; keep the empty result as a first-class answer with its own evidence.
 */
import { Client } from 'pg';
import { safetyDatabaseUrl } from '../config/connections';
import { TABLE } from '../grounding/search';
import { COMPONENT_MATCH, MODEL_MATCH } from './matching';

export const FIND_RECALLS = 'find_recalls';

export interface FindRecallsArgs {
  make: string;
  model: string;
  /** Model year. Omitted means any year in the slice. */
  year?: number;
  /**
   * A component, or any parent of one.
   *
   * PREFIX MATCH ON NHTSA'S COLON HIERARCHY — decided and verified in
   * `docs/safety/STAGE4.md` §9 before this was built. `FORWARD COLLISION
   * AVOIDANCE` takes both its children; `POWER TRAIN:AUTOMATIC TRANSMISSION`
   * takes the PRNDL branch without dragging in all of `POWER TRAIN`.
   */
  component?: string;
}

export interface RecallMatch {
  campaign_number: string;
  manufacturer: string;
  component: string;
  vehicles: Array<{ make: string; model: string; year: number | null }>;
  units_affected: number | null;
  owners_notified: string | null;
  initiated_by: string;
  source: string;
}

export interface FindRecallsResult {
  /** Echoed back, so an answer can state what was actually asked. */
  filter: FindRecallsArgs;
  matches: RecallMatch[];
  /**
   * Populated ONLY when `matches` is empty: components that DO have campaigns
   * on this vehicle. Evidence that the absence was looked for, not assumed.
   */
  other_components_on_this_vehicle: string[];
  note: string;
}

/**
 * The component predicate.
 *
 * Three forms because NHTSA punctuates inconsistently, and it does so WITHIN A
 * SINGLE VEHICLE'S OWN RECALLS. Both of these are Honda Odyssey campaigns:
 *
 *   BACK OVER PREVENTION: SENSING SYSTEM: CAMERA     20V438000  (spaced)
 *   BACK OVER PREVENTION:DISPLAY FUNCTION            23V431000  (unspaced)
 *
 * Match one spelling only and you return 4 of 5, with nothing anywhere
 * reporting a problem.
 *
 * That matters most where the answer is ALREADY "none": if the Odyssey's
 * forward-collision result came back empty because of a space rather than
 * because of the data, it would agree with the answer key for the wrong
 * reason — a false negative that no check would ever catch, because the key
 * says zero and the tool says zero.
 */
const COMPONENT_PREFIX = COMPONENT_MATCH;

export async function findRecalls(
  args: FindRecallsArgs,
  connectionString: string = safetyDatabaseUrl(),
): Promise<FindRecallsResult> {
  const make = args.make.trim().toUpperCase();
  const model = args.model.trim().toUpperCase();

  const client = new Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    const params: unknown[] = [make, model];
    // MODEL IS PREFIX-MATCHED. "F-250" must reach "F-250 SD" — a person says
    // the first and the corpus stores the second, and REC-003 scored 1 of 3
    // entirely because an exact match returned nothing. See `matching.ts`.
    let where = `upper(v->>'make') = $1 and ${MODEL_MATCH("upper(v->>'model')", '$2')}`;

    if (args.year !== undefined) {
      params.push(args.year);
      where += ` and (v->>'year')::int = $${params.length}`;
    }
    if (args.component) {
      params.push(args.component.trim().toUpperCase());
      where += ` and ${COMPONENT_PREFIX("metadata->>'component'", `$${params.length}`)}`;
    }

    // DISTINCT ON THE CAMPAIGN, AND THAT IS NOT TIDINESS.
    //
    // `jsonb_array_elements` unnests the vehicle list, so a campaign covering
    // three vehicles becomes three rows — 20V197000 alone would appear three
    // times. This engagement has now met the row-versus-entity trap four times
    // (1,407 recalls that were 107 campaigns; 12 death complaints that were 5;
    // 675 Odyssey complaints that were 400) and every one of them was an unnest
    // or a join counted without collapsing it.
    const { rows } = await client.query(
      `select distinct on (metadata->>'id') metadata->>'id' id, content, metadata
         from ${TABLE}, jsonb_array_elements(metadata->'vehicles') v
        where metadata->>'kind' = 'recall' and ${where}
        order by metadata->>'id'`,
      params,
    );

    const matches: RecallMatch[] = rows.map((r: any) => ({
      campaign_number: String(r.metadata.id),
      manufacturer: String(r.metadata.manufacturer ?? ''),
      component: String(r.metadata.component ?? ''),
      vehicles: Array.isArray(r.metadata.vehicles) ? r.metadata.vehicles : [],
      units_affected:
        typeof r.metadata.unitsAffected === 'number' ? r.metadata.unitsAffected : null,
      owners_notified: r.metadata.notified ?? null,
      initiated_by: String(r.metadata.influencedBy ?? ''),
      source: `NHTSA recall campaign ${r.metadata.id}`,
    }));

    if (matches.length) {
      return {
        filter: args,
        matches,
        other_components_on_this_vehicle: [],
        note: `${matches.length} campaign(s) cover this vehicle and component.`,
      };
    }

    // NOTHING MATCHED — so find out what IS covered, and say so.
    const { rows: others } = await client.query(
      `select distinct metadata->>'component' comp
         from ${TABLE}, jsonb_array_elements(metadata->'vehicles') v
        where metadata->>'kind' = 'recall'
          and upper(v->>'make') = $1 and upper(v->>'model') = $2
        order by 1`,
      [make, model],
    );
    const components = others.map((r: any) => String(r.comp)).filter(Boolean);

    return {
      filter: args,
      matches: [],
      other_components_on_this_vehicle: components,
      note: components.length
        ? `No campaign covers ${make} ${model}${args.component ? ` for ${args.component}` : ''}. ` +
          `The vehicle DOES have ${components.length} other recalled component(s) in this slice, ` +
          'so the absence is specific to what was asked, not a gap in coverage. ' +
          'Do not cite one of those as though it answered the question.'
        : `No campaign covers ${make} ${model} at all in this slice, for any component. ` +
          'The slice is model years 2019-2020; check the vehicle names first.',
    };
  } finally {
    await client.end();
  }
}
