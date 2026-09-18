/**
 * Policy as CONFIGURATION. The other half of policy is prose and it is
 * deliberately not in this database — see prisma/policy.prisma.
 *
 * EVERY ROW COMES BACK WITH ITS ID, and that is a requirement rather than a
 * convenience. PLAN.md §8 fixes three citation shapes so an auditor can re-find
 * anything the model asserted, and one of them is `rule:<TABLE>:<ID>`. An
 * endpoint that returned `windowDays: 14` without saying which row said so would
 * make that citation unwritable, and coherence rule 2 — "a number may not come
 * from prose alone" — unenforceable.
 */
import { z } from 'zod';

const Money = z.int();
const CivilDate = z.string();

/**
 * QUERY PARAMETERS ARRIVE AS STRINGS, ALWAYS. `valuePence=4500` is the string
 * `'4500'` no matter what the DTO wishes, so it is coerced HERE, once, at the
 * boundary — and coerced to an INTEGER, because `z.coerce.number()` would
 * cheerfully accept `45.5` and hand a fractional penny to a comparison against
 * an approval threshold.
 *
 * `tier` AND `action` ARE OPTIONAL BECAUSE THE TABLES DISAGREE ABOUT WHAT KEYS
 * THEM. `return_windows` is keyed by category and channel; `goodwill_limits` by
 * a customer TIER; `approval_thresholds` by the ACTION being approved. A single
 * required triple would have forced this endpoint to invent a mapping between
 * those three vocabularies, which is a policy decision wearing a query string.
 * Omit them and the whole ladder comes back for the caller to read; supply them
 * and it is filtered.
 */
export const PolicyRulesQuery = z.strictObject({
  category: z.string().min(1).max(64),
  channel: z.string().min(1).max(64),
  valuePence: z
    .string()
    .regex(/^\d+$/, 'valuePence must be a whole number of pence')
    .transform(Number)
    .pipe(z.int().nonnegative()),
  tier: z.string().min(1).max(64).optional(),
  action: z.string().min(1).max(64).optional(),
});
export type PolicyRulesQuery = z.infer<typeof PolicyRulesQuery>;

export const PolicyRulesResponse = z.strictObject({
  asked: z.strictObject({
    category: z.string(),
    channel: z.string(),
    valuePence: Money,
    tier: z.string().nullable(),
    action: z.string().nullable(),
  }),
  /**
   * Null when no row covers this category and channel. NOT a default of 30 —
   * PLAN.md §3's T4 is about the corpus, and this is its configuration twin: an
   * invented default is a fluent, plausible answer with nothing behind it.
   */
  returnWindow: z
    .strictObject({
      citation: z.string(),
      category: z.string(),
      channel: z.string(),
      windowDays: z.int(),
      effectiveFrom: CivilDate,
      effectiveTo: CivilDate.nullable(),
    })
    .nullable(),
  refundRules: z.array(
    z.strictObject({
      citation: z.string(),
      code: z.string(),
      appliesTo: z.string(),
      condition: z.string(),
      outcome: z.string(),
      requiresApproval: z.boolean(),
      effectiveFrom: CivilDate,
    }),
  ),
  goodwillLimits: z.array(
    z.strictObject({
      citation: z.string(),
      tier: z.string(),
      maxPence: Money,
      requiresApprovalAbovePence: Money,
      effectiveFrom: CivilDate,
    }),
  ),
  approvalThresholds: z.array(
    z.strictObject({
      citation: z.string(),
      action: z.string(),
      maxPence: Money,
      approverRole: z.string(),
      effectiveFrom: CivilDate,
    }),
  ),
  categoryOverrides: z.array(
    z.strictObject({
      citation: z.string(),
      overrideKind: z.string(),
      valueText: z.string(),
      note: z.string(),
      effectiveFrom: CivilDate,
    }),
  ),
  /**
   * Computed from `approval_thresholds` and the value asked about — and NULL
   * rather than `false` when no `action` was supplied or no row matched.
   * "We do not know" and "it does not exceed" are different facts, and
   * collapsing them would let coherence rule 5 pass on an absence.
   */
  exceedsApprovalThreshold: z.boolean().nullable(),
});
export type PolicyRulesResponse = z.infer<typeof PolicyRulesResponse>;

/**
 * THE WORKING-DAY CALENDAR HELPER'S HTTP SURFACE — T6.
 *
 * A sixth endpoint, beyond the five reads the MCP server was specified to call.
 * The brief asks for "a working-day calendar helper" alongside them without
 * saying where it lives, and it belongs here: `carrier_sla.working_days` is a
 * `thb_policy` row, so an endpoint that reads the SLA and one that applies it
 * would otherwise be two calls that only ever happen together.
 *
 * `dispatchedAt` and `deliveredAt` are supplied by the caller rather than read
 * from `thb_fleet`, and that is not laziness — reading them here would be this
 * module opening a second system's database, which is the one thing the estate
 * is built to prevent. The caller already has them from
 * `GET /deliveries/by-order/:orderId`. Two calls and a deliberate walk.
 */
export const SlaQuery = z.strictObject({
  carrierRef: z.string().min(1).max(32),
  serviceLevel: z.string().min(1).max(32),
  dispatchedAt: z.string().min(1),
  deliveredAt: z.string().min(1).optional(),
});
export type SlaQuery = z.infer<typeof SlaQuery>;

export const SlaResponse = z.strictObject({
  citation: z.string(),
  carrierRef: z.string(),
  serviceLevel: z.string(),
  workingDays: z.int(),
  /** A rate, not money. The one non-integer column in the estate. */
  penaltyRate: z.number(),
  penaltyCapPence: Money,
  /** Europe/London civil dates — see src/common/calendar/working-days.ts. */
  dispatchedOn: CivilDate,
  dueOn: CivilDate,
  deliveredOn: CivilDate.nullable(),
  /** Zero when on time. Never negative. */
  workingDaysLate: z.int().nullable(),
  /**
   * What a naive calendar-day subtraction would have said. Returned so the
   * difference is VISIBLE rather than merely avoided — T6 is only interesting if
   * somebody can see the two numbers disagree.
   */
  calendarDaysLateIfNaive: z.int().nullable(),
  bankHolidaysInWindow: z.array(CivilDate),
});
export type SlaResponse = z.infer<typeof SlaResponse>;
