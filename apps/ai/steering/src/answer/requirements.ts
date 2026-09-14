/**
 * The customer's requirements, as the IN-FORCE revision states them.
 *
 * ── WHY THIS IS NOT INSIDE THE LOOP ──────────────────────────────────────
 *
 * A customer requirement is the QUESTION, not evidence. It is what we were
 * asked, not something to be discovered. Letting the model search for its own
 * question would let it assess a different requirement than the one asked
 * about and never notice — so the text is fetched here and handed over.
 *
 * ── IN FORCE, NOT LATEST, AND THAT IS THE LOAD-BEARING CLAUSE ────────────
 *
 * `r.effective_to is null` is the whole of it. The estate holds several
 * revisions of the same specification on purpose, and answering a 2026 question
 * out of a superseded revision produces a confident answer to a question the
 * customer withdrew. Every query in this file carries it.
 *
 * ── IT LIVES HERE BECAUSE TWO SURFACES ASK ───────────────────────────────
 *
 * `pnpm steering:assess` had this query inlined, and then the web desk needed
 * the same rows. Two copies of a clause this load-bearing is how one of them
 * quietly loses it. The CLI now calls this.
 *
 * ── READ ONLY, AND `vst_alm` IS THEIRS ───────────────────────────────────
 *
 * `vst_alm` is one of the four databases Vantis runs. Nothing here writes to
 * it, and nothing ever may — see `pnpm steering:sql-check`. A connection is
 * opened per call and closed in a `finally`: the desk asks for this list once
 * per page load, not per keystroke, and an open `pg` client keeps Node's event
 * loop alive forever if a query throws before `end()`. That failure presents as
 * a HANG rather than as an error, which is the worse of the two by a distance.
 */
import { Client } from 'pg';
import { urlFor } from '../config/connections';

/** One requirement, with the version fields that decide how it is assessed. */
export interface Requirement {
  ref: string;
  /** The spec section it sits in, e.g. "4.2.1". */
  section: string;
  title: string;
  /** The requirement as written. This is what the loop is given. */
  text: string;
  /** The machine-comparable pair. Null on requirements that are only prose. */
  attribute: string | null;
  unit: string | null;
  /** Safety level stated on this version: QM, A, B, C or D. */
  asil: string;
  /** must | should | nice. */
  priority: string;
  /** test | analysis | inspection | review. */
  verificationMethod: string;
  /** The revision this text is from — printed, because "in force" is a claim. */
  revision: string;
  /** The document the revision belongs to. */
  specTitle: string;
  /**
   * The programme this requirement belongs to, e.g. `PRG-KST-K2`.
   *
   * ── ADDED BECAUSE RETRIEVAL WAS ANSWERING FOR SIXTY-SEVEN CARS AT ONCE ──
   *
   * The corpus states the same requirement, in the same words, with different
   * numbers, for every programme Vantis has ever bid — sixty-seven of them
   * carry a road-wheel-angle figure between 44.6° and 55.78°. Unfiltered, a
   * search returns that spread, and a model shown it reasonably concludes the
   * documents disagree with each other. They do not. They are different cars.
   *
   * Three runs showed the cost escalating: wasted tokens, then a false sentence
   * in the reasoning, then a "the documents disagree" panel citing PRG-CHV-07's
   * 53.7° as if it contradicted K2's ±50°.
   *
   * The information was free the whole time — `spec_documents.program_ref`.
   */
  programme: string;
}

/**
 * The one query, written once.
 *
 * `select` lists every column by name rather than `*`, so a column added to the
 * estate cannot silently change this shape.
 */
const SELECT = `
  select cr.cr_id, cr.section, cr.title, cr.attribute, cr.unit,
         v.text_body, v.asil, v.priority, v.verification_method,
         r.revision, sd.title as spec_title, sd.program_ref
    from customer_requirements cr
    join customer_requirement_versions v on v.cr_id = cr.cr_id
    join spec_revisions r on r.spec_revision_id = v.spec_revision_id
    join spec_documents sd on sd.spec_id = r.spec_id
   where r.effective_to is null`;

function toRequirement(row: any): Requirement {
  return {
    ref: row.cr_id,
    section: row.section,
    title: row.title,
    text: row.text_body,
    attribute: row.attribute,
    unit: row.unit,
    asil: row.asil,
    priority: row.priority,
    verificationMethod: row.verification_method,
    revision: row.revision,
    specTitle: row.spec_title,
    programme: row.program_ref,
  };
}

async function withAlm<T>(run: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: urlFor('vst_alm') });
  await c.connect();
  try {
    return await run(c);
  } finally {
    await c.end();
  }
}

/** One requirement by its id, or undefined. The id is exact, never a prefix. */
export async function fetchRequirement(ref: string): Promise<Requirement | undefined> {
  return withAlm(async (c) => {
    const { rows } = await c.query(`${SELECT} and cr.cr_id = $1`, [ref.toUpperCase()]);
    return rows[0] ? toRequirement(rows[0]) : undefined;
  });
}

/**
 * The bid the desk opens on.
 *
 * NOT ALL 641 REQUIREMENTS. The estate holds every requirement of every
 * programme ever quoted, and a picker listing all of them is a search problem
 * wearing a dropdown. A bid is one programme's specification — the K2 request
 * is 24 requirements, which is the fan-out the plan describes and a list a
 * person can actually read.
 */
export const DEFAULT_PROGRAMME = 'CR-K2-';

/**
 * Every in-force requirement whose id starts with `prefix`, in id order.
 *
 * A PREFIX HERE AND AN EXACT MATCH ABOVE, deliberately. Listing a programme is
 * a prefix question; fetching the requirement to be assessed is not, and a
 * prefix match there would assess a neighbour.
 */
export async function listRequirements(prefix = DEFAULT_PROGRAMME): Promise<Requirement[]> {
  return withAlm(async (c) => {
    const { rows } = await c.query(`${SELECT} and cr.cr_id like $1 order by cr.cr_id`, [
      `${prefix}%`,
    ]);
    return rows.map(toRequirement);
  });
}
