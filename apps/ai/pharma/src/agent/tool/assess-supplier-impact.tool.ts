/**
 * assess_supplier_impact — the supplier-to-lots fan-out walk, offered to the
 * model as ONE call.
 *
 * SAME RULE AS `assess-release.tool.ts`, applied to the other direction. The
 * model does not query `mrd_erp` or `mrd_tms` itself, and does not decide which
 * of a supplier's lots to check — `assessSupplierImpact` already found every
 * affected lot, ranked it by how far it travelled, and worked out the one
 * finding that is still preventable (material received after disqualification
 * and never quarantined). A model re-deriving that from raw rows would get
 * most of it right and sound equally sure on the lots it missed.
 *
 * ONE CALL, NOT A LOOP OF ONE-PER-LOT CALLS. The walk already fans out inside
 * itself — a tool that made the model call `assess_release`-style once per
 * affected lot would be up to 23 round trips for this one supplier, and the
 * model would have no way to know it had seen all of them until it had asked
 * for every single one.
 *
 * IT NEVER RETURNS A RECALL DECISION. The dossier ranks exposure and names
 * what is still preventable; it does not say "recall this lot." The tool
 * description says so, and `schema/supplier-impact-schema.ts` makes it
 * impossible to state otherwise in the answer — see that file's `RECALL_VERDICT`.
 *
 * DOMAIN: pharmaceutical supplier disqualification. The PATTERN transfers,
 * and is the same one `assess-release.tool.ts` already records: when a
 * question needs a deterministic multi-system traversal, hand the model the
 * result of the traversal, not the ability to perform it.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { openHandle, type DbHandle } from '../../tools/utils/handle';
import {
  assessSupplierImpact,
  type SupplierImpactDossier,
  type SupplierImpactMiss,
} from '../../tools/functions/assess-supplier-impact';

export const ASSESS_SUPPLIER_IMPACT = 'assess_supplier_impact';

interface Args {
  supplier_id: string;
}

/**
 * TAKES A HANDLE, NOT A CONNECTION STRING — same reasoning as
 * `assess-release.tool.ts`: the caller owns the six connections and closes
 * them, so a tool that opened its own would reopen them on every call a loop
 * makes against one Neon compute. The default exists so the self-test and
 * one-off scripts stay a single line; a real loop should pass its own handle
 * and close it.
 */
export function assessSupplierImpactTool(
  handle?: DbHandle,
): Tool<Args, SupplierImpactDossier | SupplierImpactMiss> {
  const h = handle ?? openHandle();

  return {
    // Live Postgres, across mrd_erp and mrd_tms. Deterministic for a given
    // seed, but external, so an eval run must be fixture-backed to reproduce.
    hasUpstream: true,

    schema: {
      type: 'function',
      name: ASSESS_SUPPLIER_IMPACT,
      description:
        'Given a supplier, find every product lot made with material from ' +
        'them and how far each one travelled — still in our warehouse, on a ' +
        'truck, at a wholesaler, or already at a hospital or pharmacy. Returns ' +
        'a ranked work list, worst exposure first, plus any material from this ' +
        'supplier that is STILL flagged usable and could be drawn on today — ' +
        'the one finding here that can still be PREVENTED rather than ' +
        'remediated. Call this for any question about the impact of a ' +
        'supplier problem — a disqualification, a recall from them, a failed ' +
        'audit — never try to trace it lot by lot yourself; the second hop ' +
        '("which of these already left the building") lives in a different ' +
        'system than the first and cannot be joined to it by hand. NOTE: this ' +
        'tool does not decide whether anything should be recalled — that is a ' +
        'regulatory decision with a legal clock, made by a named person. It ' +
        'only tells you where things are.',
      parameters: z.strictObject({
        supplier_id: z
          .string()
          .describe(
            'Exact supplier id, e.g. "SUP-04". Never guess it; ask instead if ' +
              'you only have a name.',
          ),
      }),
    },

    /**
     * `assessSupplierImpact` already returns an informative miss for an
     * unknown supplier — see `SupplierImpactMiss` — so there is nothing extra
     * to validate here. A throw is reserved for the plumbing, never for a
     * bad model-supplied argument; that rule is enforced one layer down.
     */
    async execute({ supplier_id }) {
      const id = (supplier_id ?? '').trim();
      return assessSupplierImpact(h, id);
    },
  };
}
