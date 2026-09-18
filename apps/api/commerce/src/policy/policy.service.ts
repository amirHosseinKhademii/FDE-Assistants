/**
 * Reads from `thb_policy`. Returns rows and says where they came from.
 *
 * IT RECONCILES NOTHING, ON PURPOSE. `return_windows` says electronics is 14
 * days; the published returns document says 30. This service returns the row.
 * The document is retrieved by a different tool from a different store, and the
 * layer above holds both and reports a conflict. PLAN.md §2.3: "Neither is the
 * answer. The answer is 'these disagree, here is each with its source, a human
 * decides'." A policy service that quietly preferred one would delete the
 * disagreement and with it the only honest answer.
 *
 * EFFECTIVE-DATING IS A READ CONCERN AND IT IS DONE HERE. The corpus
 * deliberately holds superseded revisions, and so does this database. Returning
 * every row that ever applied would make the caller pick, and picking by `id`
 * order is how a 2026 question gets answered out of a 2024 rule — the same
 * failure `apps/ai/insurance/src/config/form-id.ts` prevents with exact match.
 *
 * THESE ARE `not_found`, NOT `out_of_scope`, AND THAT IS DELIBERATE. Policy rows
 * are Thornbury's own configuration: they name no customer, so "there is no SLA
 * for that carrier" discloses nothing and there is nothing to enumerate. See
 * src/common/outcome.ts for why the customer-data paths do the opposite.
 */
import { Inject, Injectable } from '@nestjs/common';
import { POLICY_CLIENT, type PolicyClient } from './policy.client';
import {
  PolicyRulesResponse,
  SlaResponse,
  type PolicyRulesQuery,
  type SlaQuery,
} from './policy.dto';
import { shapeResponse } from '../common/zod';
import { decimalToNumber } from '../common/money';
import { succeed, notFound, invalidRequest, type Outcome } from '../common/outcome';
import {
  civilDate,
  londonCivilDate,
  slaDueDate,
  workingDaysLate,
  isCovered,
} from '../common/calendar/working-days';
import { UK_BANK_HOLIDAYS } from '../common/calendar/uk-bank-holidays';

const MS_PER_DAY = 86_400_000;

/** `effective_from` in the past, `effective_to` absent or still ahead. */
function currentlyEffective(now: Date) {
  return {
    effectiveFrom: { lte: now },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
  };
}

@Injectable()
export class PolicyService {
  constructor(@Inject(POLICY_CLIENT) private readonly db: PolicyClient) {}

  async getRules(
    query: PolicyRulesQuery,
    now: Date = new Date(),
  ): Promise<Outcome<PolicyRulesResponse>> {
    const [returnWindow, refundRules, goodwillLimits, approvalThresholds, overrides] =
      await Promise.all([
        this.findReturnWindow(query, now),
        this.findRefundRules(query, now),
        this.findGoodwillLimits(query, now),
        this.findApprovalThresholds(query, now),
        this.findCategoryOverrides(query, now),
      ]);

    return succeed(
      shapeResponse(
        PolicyRulesResponse,
        {
          asked: {
            category: query.category,
            channel: query.channel,
            valuePence: query.valuePence,
            tier: query.tier ?? null,
            action: query.action ?? null,
          },
          returnWindow: returnWindow && {
            citation: `rule:return_windows:${returnWindow.windowId}`,
            category: returnWindow.category,
            channel: returnWindow.channel,
            windowDays: returnWindow.windowDays,
            effectiveFrom: civilDate(returnWindow.effectiveFrom),
            effectiveTo: returnWindow.effectiveTo
              ? civilDate(returnWindow.effectiveTo)
              : null,
          },
          refundRules: refundRules.map((r) => ({
            citation: `rule:refund_rules:${r.ruleId}`,
            code: r.code,
            appliesTo: r.appliesTo,
            condition: r.condition,
            outcome: r.outcome,
            requiresApproval: r.requiresApproval,
            effectiveFrom: civilDate(r.effectiveFrom),
          })),
          goodwillLimits: goodwillLimits.map((g) => ({
            citation: `rule:goodwill_limits:${g.limitId}`,
            tier: g.tier,
            maxPence: g.maxPence,
            requiresApprovalAbovePence: g.requiresApprovalAbovePence,
            effectiveFrom: civilDate(g.effectiveFrom),
          })),
          approvalThresholds: approvalThresholds.map((a) => ({
            citation: `rule:approval_thresholds:${a.thresholdId}`,
            action: a.action,
            maxPence: a.maxPence,
            approverRole: a.approverRole,
            effectiveFrom: civilDate(a.effectiveFrom),
          })),
          categoryOverrides: overrides.map((o) => ({
            citation: `rule:category_overrides:${o.overrideId}`,
            overrideKind: o.overrideKind,
            valueText: o.valueText,
            note: o.note,
            effectiveFrom: civilDate(o.effectiveFrom),
          })),
          exceedsApprovalThreshold: exceedsThreshold(query, approvalThresholds),
        },
        'GET /policy/rules',
      ),
    );
  }

  /** T6. See src/common/calendar/working-days.ts for the arithmetic and its two traps. */
  async getSla(query: SlaQuery, now: Date = new Date()): Promise<Outcome<SlaResponse>> {
    // ARGUMENTS ARE VALIDATED BEFORE THE DATABASE IS TOUCHED, and the order is
    // the point rather than an optimisation. Looking the SLA up first meant an
    // unparsable or out-of-range date was reported as `not_found` — the caller
    // was told "no such carrier" about a request whose real problem was its
    // timestamp, and the answer changed depending on whether an unrelated row
    // happened to exist. Whether an argument is usable cannot depend on data.
    const timestamps = readTimestamps(query);
    if (!timestamps.ok) return timestamps;

    const sla = await this.db.carrierSla.findFirst({
      where: {
        carrierRef: query.carrierRef,
        serviceLevel: query.serviceLevel,
        effectiveFrom: { lte: now },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!sla) return notFound('carrier SLA for that carrier and service level');

    return succeed(
      shapeResponse(
        SlaResponse,
        buildSla(sla, timestamps.data.dispatchedAt, timestamps.data.deliveredAt),
        'GET /policy/sla',
      ),
    );
  }

  private findReturnWindow(query: PolicyRulesQuery, now: Date) {
    return this.db.returnWindow.findFirst({
      where: { category: query.category, channel: query.channel, ...currentlyEffective(now) },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * `applies_to` holds a category OR the literal `all`, so a rule that governs
   * everything is not silently dropped by a category filter.
   */
  private findRefundRules(query: PolicyRulesQuery, now: Date) {
    return this.db.refundRule.findMany({
      where: { appliesTo: { in: [query.category, 'all'] }, effectiveFrom: { lte: now } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private findGoodwillLimits(query: PolicyRulesQuery, now: Date) {
    return this.db.goodwillLimit.findMany({
      where: { effectiveFrom: { lte: now }, ...(query.tier ? { tier: query.tier } : {}) },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private findApprovalThresholds(query: PolicyRulesQuery, now: Date) {
    return this.db.approvalThreshold.findMany({
      where: { effectiveFrom: { lte: now }, ...(query.action ? { action: query.action } : {}) },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private findCategoryOverrides(query: PolicyRulesQuery, now: Date) {
    return this.db.categoryOverride.findMany({
      where: { category: query.category, effectiveFrom: { lte: now } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}

// ── argument validation, separated from both ────────────────────────────────

/**
 * Parse and range-check the two caller-supplied timestamps.
 *
 * RANGE, NOT JUST PARSABILITY — and this is the difference between a 400 and a
 * 500. The bank-holiday table has a horizon and `assertCovered` THROWS past it,
 * on purpose, rather than pretending a year has no holidays in it. But
 * `dispatchedAt` comes from the caller, so letting that throw escape turns one
 * bad query parameter into an exception, and the MCP layer reads a 5xx as
 * `transport` — blame: infrastructure. fde-assistants-86 depends on the
 * opposite: a 5xx from this API always means plumbing.
 */
function readTimestamps(
  query: SlaQuery,
): Outcome<{ dispatchedAt: Date; deliveredAt: Date | null }> {
  const dispatchedAt = new Date(query.dispatchedAt);
  if (Number.isNaN(dispatchedAt.getTime())) {
    return invalidRequest('dispatchedAt is not a parsable timestamp');
  }

  const deliveredAt = query.deliveredAt ? new Date(query.deliveredAt) : null;
  if (deliveredAt && Number.isNaN(deliveredAt.getTime())) {
    return invalidRequest('deliveredAt is not a parsable timestamp');
  }

  const outOfRange = [
    ['dispatchedAt', londonCivilDate(dispatchedAt)] as const,
    ...(deliveredAt ? [['deliveredAt', londonCivilDate(deliveredAt)] as const] : []),
  ].find(([, date]) => !isCovered(date));

  if (outOfRange) {
    return invalidRequest(
      `${outOfRange[0]} (${outOfRange[1]}) is outside the bank-holiday table this ` +
        `API can compute working days over. Extend ` +
        `src/common/calendar/uk-bank-holidays.ts rather than assuming a year with ` +
        `no holidays in it.`,
    );
  }

  return succeed({ dispatchedAt, deliveredAt });
}

// ── computation, separated from fetching ────────────────────────────────────

/**
 * Null unless the caller named an ACTION and a row matched it.
 *
 * Without an action there is no single threshold to compare against — there are
 * several, for different actions — and picking one would be this API inventing
 * the policy it was asked to report.
 */
function exceedsThreshold(
  query: PolicyRulesQuery,
  thresholds: { action: string; maxPence: number }[],
): boolean | null {
  if (!query.action) return null;
  const match = thresholds.find((t) => t.action === query.action);
  return match ? query.valuePence > match.maxPence : null;
}

interface SlaRow {
  slaId: string;
  carrierRef: string;
  serviceLevel: string;
  workingDays: number;
  penaltyRate: unknown;
  penaltyCapPence: number;
}

function buildSla(sla: SlaRow, dispatchedAt: Date, deliveredAt: Date | null) {
  const dispatchedOn = londonCivilDate(dispatchedAt);
  const dueOn = slaDueDate(dispatchedAt, sla.workingDays);
  const deliveredOn = deliveredAt ? londonCivilDate(deliveredAt) : null;
  const [lo, hi] = [dispatchedOn, deliveredOn ?? dueOn].sort();

  return {
    citation: `rule:carrier_sla:${sla.slaId}`,
    carrierRef: sla.carrierRef,
    serviceLevel: sla.serviceLevel,
    workingDays: sla.workingDays,
    penaltyRate: decimalToNumber(sla.penaltyRate, 'carrier_sla.penalty_rate'),
    penaltyCapPence: sla.penaltyCapPence,
    dispatchedOn,
    dueOn,
    deliveredOn,
    workingDaysLate: deliveredAt
      ? workingDaysLate(dispatchedAt, sla.workingDays, deliveredAt)
      : null,
    calendarDaysLateIfNaive: naiveCalendarLateness(dispatchedOn, deliveredOn, sla.workingDays),
    bankHolidaysInWindow: UK_BANK_HOLIDAYS.filter((h) => h >= lo && h <= hi),
  };
}

/**
 * THE WRONG ANSWER, COMPUTED ON PURPOSE.
 *
 * This is the number T6 describes somebody reporting as "3 days late" over a
 * bank-holiday weekend. Returning it beside the right one is cheaper than
 * explaining the difference, and it makes the trap visible in a response body
 * rather than only in a check.
 */
function naiveCalendarLateness(
  dispatchedOn: string,
  deliveredOn: string | null,
  workingDays: number,
): number | null {
  if (deliveredOn === null) return null;
  const elapsed = Math.round(
    (Date.parse(`${deliveredOn}T00:00:00Z`) - Date.parse(`${dispatchedOn}T00:00:00Z`)) /
      MS_PER_DAY,
  );
  return Math.max(0, elapsed - workingDays);
}
