/**
 * `get_policy_rules` — policy as CONFIGURATION: the rows the returns tooling obeys.
 *
 * THE FIRST TOOL WHOSE ARGUMENTS COME FROM THE MODEL, and that is safe here for
 * a reason worth stating: policy rows are not customer data. There is no record
 * a caller could reach that another caller should not, so there is no confused
 * deputy to guard against — the category, channel and amount are the question,
 * and asking about "electronics" for a lamp filed as homeware is exactly the
 * judgement T2 exists to test. Contrast `get_order`, which takes nothing.
 *
 * INPUT STRICTNESS FOLLOWS THE EXISTING DEFAULT (`z.object`), NOT `z.strictObject`.
 * NEXT.md §6 records that as an open decision for Byron. What makes the default
 * harmless HERE: the query string is built from the declared fields only, so an
 * undeclared argument is dropped at this line and never forwarded to the API.
 *
 * WHAT IT IS NOT: the written policy. The published returns policy, bulletins and
 * procedures are prose, and they disagree with these rows on purpose (T2) — which
 * is why this is a separate tool from the document search and not merged into it.
 * A single "policy" tool would have to pick a side, and picking is the failure.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { getJson, type ApiConfig } from '../api/client';
import { PolicyRulesSchema, type PolicyRules } from '../api/schemas';
import type { Outcome } from '../api/outcome';
import type { Session } from '../session';

export const DESCRIPTION =
  "Thornbury's configured policy rows for one product category: the return window, " +
  'the refund rules, goodwill limits by customer tier, approval thresholds by action, ' +
  'and any category overrides — each with a citation. This is the configuration the ' +
  'returns tooling applies, not the written policy documents.';

export const InputSchema = z.object({
  category: z
    .string()
    .min(1)
    .max(64)
    .describe('The product category, as the catalogue names it: electronics, homeware, apparel, kitchen or garden.'),
  channel: z
    .string()
    .min(1)
    .max(64)
    .describe('The channel the order was placed through: web, app or phone. Rows that apply to any channel are always included.'),
  valuePence: z
    .number()
    .int()
    .nonnegative()
    .describe('An amount in whole pence — for example a refund being considered. Required by the rules service; the approval thresholds are listed in the result.'),
  tier: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .describe("The customer's tier, to narrow the goodwill limits: standard or priority. Omit it for every tier."),
  action: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .describe('The action being approved, to narrow the approval thresholds: refund, goodwill or replacement. Omit it for every action.'),
});

function summarise(p: PolicyRules): string {
  const a = p.asked;
  const lines = [
    `Configured rules for category "${a.category}", channel "${a.channel}", ${a.valuePence}p` +
      `${a.tier ? `, tier ${a.tier}` : ''}${a.action ? `, action ${a.action}` : ''}:`,
    p.returnWindow
      ? `Return window: ${p.returnWindow.windowDays} days (${p.returnWindow.citation}; channel ${p.returnWindow.channel}; ` +
        `effective ${p.returnWindow.effectiveFrom}${p.returnWindow.effectiveTo ? ` to ${p.returnWindow.effectiveTo}` : ''}).`
      : 'Return window: no configured row for this category and channel.',
    `Refund rules (${p.refundRules.length}):`,
    ...p.refundRules.map(
      (r) =>
        `  ${r.citation} ${r.code} — if ${r.condition}: ${r.outcome}` +
        `${r.requiresApproval ? ' [requires approval]' : ''} (applies to ${r.appliesTo}, from ${r.effectiveFrom})`,
    ),
    `Goodwill limits: ${
      p.goodwillLimits
        .map((g) => `${g.citation} ${g.tier}: up to ${g.maxPence}p, approval above ${g.requiresApprovalAbovePence}p`)
        .join('; ') || 'none'
    }.`,
    `Approval thresholds: ${
      p.approvalThresholds
        .map((t) => `${t.citation} ${t.action} up to ${t.maxPence}p by ${t.approverRole}`)
        .join('; ') || 'none'
    }.`,
    `Category overrides: ${
      p.categoryOverrides.map((o) => `${o.citation} ${o.overrideKind}=${o.valueText} — ${o.note}`).join('; ') || 'none'
    }.`,
  ];
  return lines.join('\n');
}

export function buildGetPolicyRules(cfg: ApiConfig, session: Session): Tool<PolicyRules> {
  return {
    name: 'get_policy_rules',
    config: {
      title: 'Configured policy rules',
      description: DESCRIPTION,
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    data: PolicyRulesSchema,
    run: async (args) => {
      // Declared fields ONLY. The SDK has already validated `args` against
      // InputSchema; anything undeclared it let through stops here.
      const a = InputSchema.parse(args);
      const query = new URLSearchParams({
        category: a.category,
        channel: a.channel,
        valuePence: String(a.valuePence),
        ...(a.tier ? { tier: a.tier } : {}),
        ...(a.action ? { action: a.action } : {}),
      });
      return getJson(cfg, session, `/policy/rules?${query}`, PolicyRulesSchema);
    },
    render: (outcome: Outcome<PolicyRules>) =>
      outcome.ok ? summarise(outcome.data) : `Could not read the policy rules: ${outcome.detail}`,
  };
}
