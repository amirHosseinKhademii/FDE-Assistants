/**
 * assess_release — the deterministic five-silo walk, offered to the model as
 * ONE call.
 *
 * THE MODEL DOES NOT WALK THE DATABASES, AND THAT IS THE DESIGN. Answering this
 * question takes ~26 queries across six databases that cannot be joined, and the
 * correct answer turns on comparing a training expiry date against an SOP
 * revision that changed six months earlier. A model doing that freehand would
 * get it right most of the time and sound equally confident when it did not.
 * So the walk is code, it is tested, and the model receives its result.
 *
 * WHAT IS LEFT FOR THE MODEL IS THE PART THAT IS ACTUALLY JUDGEMENT: why a
 * finding blocks (which needs the procedure text, not the row), whether the
 * evidence is sufficient, what is missing, and whom to escalate to.
 *
 * ONE CALL, NOT SIX. A tool per silo would be six round trips and six chances
 * for the model to stop early with a partial picture — and stopping after
 * `mrd_qms` gives you "five of five tests passed, release it", which is the
 * exact wrong answer this whole exercise exists to prevent.
 *
 * IT NEVER RETURNS "RELEASABLE: SHIP IT". `releasable` here means "this code
 * found no blocker", which is not a clearance. The tool description says so to
 * the model, and `schema/release-schema.ts` makes it impossible to state
 * otherwise in the answer.
 *
 * DOMAIN: pharmaceutical batch release. The PATTERN transfers: when a question
 * needs a deterministic multi-system traversal, hand the model the result of the
 * traversal, not the ability to perform it.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { openHandle, type DbHandle } from '../../tools/utils/handle';
import { assessRelease, type ReleaseDossier } from '../../tools/functions/assess-release';
import type { Market } from '../../tools/departments/erp';

export const ASSESS_RELEASE = 'assess_release';

const MARKETS = ['US', 'EU'] as const;

interface Args {
  lot_id: string;
  market: string;
}

export interface AssessReleaseMiss {
  lot_id: string;
  market: string;
  found: false;
  /** Says what IS available, so a malformed id can be corrected rather than invented around. */
  note: string;
}

/**
 * TAKES A HANDLE, NOT A CONNECTION STRING.
 *
 * The caller owns the six connections and closes them — a tool that opened its
 * own would open them again on every call the model makes, against one Neon
 * compute. The default exists so the self-test and one-off scripts stay a single
 * line; a loop should pass its own and close it.
 */
export function assessReleaseTool(
  handle?: DbHandle,
): Tool<Args, ReleaseDossier | AssessReleaseMiss> {
  const h = handle ?? openHandle();

  return {
    // Six live Postgres databases. Deterministic for a given seed, but external,
    // so an eval run must be fixture-backed to be reproducible.
    hasUpstream: true,

    schema: {
      type: 'function',
      name: ASSESS_RELEASE,
      description:
        'Assess whether one manufactured lot may be released to one destination ' +
        'market. Walks the six Meridian systems of record — products and ' +
        'authorisations, manufacturing, quality, personnel, standards, ' +
        'distribution — and returns every finding that bears on the decision, ' +
        'each with the exact database row it came from and the date it was ' +
        'judged as of. It ALSO returns a `basis` — what was checked and as of ' +
        'when, including the date of the release decision and the procedure ' +
        'revision that governed on that day — present whether or not anything ' +
        'was wrong, because "was this valid?" is a question about the basis, ' +
        'not only about the exceptions. ' +
        'Call this FIRST for any release question; it is the only ' +
        'way to see facts that live in more than one system, such as a ' +
        'certifying person whose training had lapsed on the day they signed. ' +
        'The limits applied are those of the DESTINATION market, which may ' +
        'differ from the ones the lot was manufactured to. NOTE: a result of ' +
        '"releasable: true" means only that this assessment found no blocker — ' +
        'it is NOT a certification and must never be reported as permission to ' +
        'ship. A Qualified Person decides that.',
      parameters: z.strictObject({
        lot_id: z
          .string()
          .describe(
            'Exact lot id, e.g. "LOT-IBU200-2609-B". Case sensitive, and the ' +
              'final letter is the sub-batch — "…-B" and "…-D" are different ' +
              'lots sold into different markets. Never guess it; ask instead.',
          ),
        market: z
          .string()
          .describe(
            'The destination market, "EU" or "US". This decides which ' +
              'specification limits and which rules apply, so asking about the ' +
              'wrong one produces a confident wrong answer.',
          ),
      }),
    },

    /**
     * Returns an informative miss rather than throwing. A throw is reserved for
     * the plumbing — see `ToolCallRecord.cause` — so a bad model-supplied
     * argument must come back as something the model can read and correct.
     */
    async execute({ lot_id, market }) {
      const id = (lot_id ?? '').trim();
      const to = (market ?? '').trim().toUpperCase();

      if (!MARKETS.includes(to as Market)) {
        return {
          lot_id: id,
          market: to,
          found: false,
          note:
            `"${market}" is not a market in this estate. Known markets: ` +
            `${MARKETS.join(', ')}. Meridian holds no authorisations outside ` +
            `these, so a question about another market cannot be answered from ` +
            `these records — say so rather than substituting a nearby one.`,
        };
      }

      const dossier = await assessRelease(h, id, to as Market);
      if (!dossier) {
        return {
          lot_id: id,
          market: to,
          found: false,
          note:
            `No lot "${id}" exists. Lot ids look like "LOT-IBU200-2609-B": ` +
            `product code, campaign year and month, then a single sub-batch ` +
            `letter. Ask for the correct id rather than guessing one.`,
        };
      }
      return dossier;
    },
  };
}
