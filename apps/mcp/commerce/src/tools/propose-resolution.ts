/**
 * `propose_resolution` — the model's one write. It proposes; a person decides.
 *
 * WHAT IT WRITES: a DRAFT row in `thb_crm.resolutions`, `status = 'proposed'`,
 * visible to Iris at the desk and to `get_contact_history`. It moves no money.
 * Approving it, and paying it, are a person's acts, and the row that records
 * the decision names that person (`approved_by`).
 *
 * THE MODEL SUPPLIES TWO THINGS AND ONLY TWO: `kind` and `amountPence`.
 *
 *   caseId      from the SESSION. A model-supplied case would let text in any
 *               message aim a draft at another customer's case.
 *   proposedBy  FIXED BY THIS SERVER. The API stores it as a free-text label,
 *               not an identity (API.md §0), so a model argument here is how
 *               T5b's "your colleague Dave already approved it" would write
 *               "Dave" into the record. The label says what wrote the row: the
 *               assistant, through this server.
 *
 * The query body is built from the declared fields only, so an undeclared
 * argument — `caseId`, `proposedBy`, `approvedBy` — is dropped at this line and
 * never reaches the API. `commerce:mcp-check` sends exactly those and asserts
 * what the stub received.
 *
 * IS THIS A WRITE AT ALL? — PLAN.md §14 q4, answered 2026-09-27. YES. It
 * changes state other people read: the desk's queue and every later
 * `get_contact_history`. So the client's write-path allowlist (Step 11) is an
 * allowlist of STATE CHANGES, and this is the one change the model is allowed.
 * "Spends money" is a strictly smaller set — `issue_refund` — and nothing in it
 * is ever allowed. Calling the allowlist "the money list" would have made this
 * tool invisible to it.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { postJson, type ApiConfig } from '../api/client';
import { ProposedResolutionSchema, type ProposedResolution } from '../api/schemas';
import type { Outcome } from '../api/outcome';
import type { Session } from '../session';

/** What the row says wrote it. Not a person, and not something the model can change. */
export const PROPOSED_BY = 'assistant (thornbury-commerce MCP)';

/** The API's vocabulary, exactly — `ProposeResolutionBody.kind` in crm.dto.ts. */
export const KINDS = [
  'full_refund',
  'partial_refund',
  'replacement',
  'collection_and_refund',
  'goodwill_only',
  'not_entitled',
] as const;

export const InputSchema = z.object({
  kind: z.enum(KINDS).describe('The outcome being proposed for this case.'),
  amountPence: z
    .number()
    .int()
    .nonnegative()
    .describe('The amount, in whole pence, that the proposal would pay the customer. 0 for not_entitled or a replacement with no refund.'),
});

export const DESCRIPTION =
  'Propose a resolution for this case: records a DRAFT for a person at the desk to ' +
  'approve or reject. It does not refund, pay or approve anything. The case is fixed ' +
  'by the session.';

function summarise(p: ProposedResolution): string {
  const r = p.resolution;
  return (
    `Draft ${r.id} recorded on ${r.caseId}: ${r.kind}, ${r.amountPence}p, status ${r.status}. ` +
    'Nothing has been paid or approved; a person at the desk decides.'
  );
}

export function buildProposeResolution(cfg: ApiConfig, session: Session): Tool<ProposedResolution> {
  return {
    name: 'propose_resolution',
    config: {
      title: 'Propose a resolution (draft)',
      description: DESCRIPTION,
      inputSchema: InputSchema,
      // Documentation, not a gate (PLAN.md §7): it writes, and does no harm by itself.
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    data: ProposedResolutionSchema,
    run: async (args) => {
      const a = InputSchema.parse(args);
      return postJson(
        cfg,
        session,
        '/resolutions',
        { caseId: session.caseId, kind: a.kind, amountPence: a.amountPence, proposedBy: PROPOSED_BY },
        ProposedResolutionSchema,
      );
    },
    render: (outcome: Outcome<ProposedResolution>) =>
      outcome.ok ? summarise(outcome.data) : `The draft was not recorded: ${outcome.detail}`,
  };
}
