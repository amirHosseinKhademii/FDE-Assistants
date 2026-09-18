/**
 * Money is INTEGER PENCE. Everywhere, in every DTO, with no exceptions.
 *
 * WHY, AND WHY THE REASON MOVED RATHER THAN DISAPPEARED. PLAN.md §2.1 argues
 * this from raw `pg`: postgres returns `numeric` as a STRING, so typing a refund
 * amount `number` compiles and then compares a string to a number at runtime —
 * `'340.00' < 100` is `false` for the wrong reason, and every check built on it
 * is decorative. This app reaches Postgres through Prisma rather than `pg`, so
 * that exact sentence is no longer true: Prisma maps `numeric` to a DECIMAL
 * OBJECT, not a string. The failure is the same shape and a different disguise —
 * `decimalObject < 100` coerces through `valueOf`, sometimes usefully and never
 * dependably, and `JSON.stringify` of it is not a number either.
 *
 * So the rule stands and the enforcement is here: integers in, integers out, and
 * the one genuine decimal in the estate goes through `decimalToNumber` where it
 * is visible.
 *
 * fde-assistants-2d confirmed the estate side on 2026-09-18: every `*_pence`
 * column is `integer`, and `thb_policy.carrier_sla.penalty_rate` is the ONLY
 * numeric column in all five databases — because it is a rate, not money.
 */

export class MoneyError extends Error {}

/**
 * `Int`, not `BigInt`.
 *
 * Postgres `integer` tops out near 2.1 billion pence — about £21 million on one
 * row — which no single Thornbury order approaches. `BigInt` would buy headroom
 * nobody needs and cost something real: `JSON.stringify` THROWS on a BigInt
 * ("Do not know how to serialize a BigInt"), so the first response carrying one
 * would 500 from inside the serialiser, after the handler had already succeeded.
 */
export const MAX_PENCE = 2_147_483_647;

/** Reject anything that is not a whole number of pence, loudly and at the boundary. */
export function assertPence(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new MoneyError(
      `${field} must be an integer number of pence, got ${typeof value} ${String(value)}. ` +
        `A decimal here means someone divided by 100 upstream.`,
    );
  }
  if (Math.abs(value) > MAX_PENCE) {
    throw new MoneyError(`${field} is outside the range a postgres integer holds: ${value}`);
  }
  return value;
}

/**
 * The one decimal, normalised on the way out.
 *
 * Structurally typed on purpose: taking `Prisma.Decimal` here would make this
 * shared file import one system's GENERATED CLIENT, which is precisely the
 * coupling the five-client split exists to prevent. A rate is a rate whoever
 * produced it.
 */
export function decimalToNumber(value: unknown, field: string): number {
  if (value === null || value === undefined) {
    throw new MoneyError(`${field} is missing`);
  }
  if (typeof value === 'number') return value;
  // `pg` hands back a string; Prisma hands back a Decimal whose `toString` is exact.
  const asText = typeof value === 'string' ? value : String(value);
  const n = Number(asText);
  if (!Number.isFinite(n)) {
    throw new MoneyError(`${field} is not a number: ${asText}`);
  }
  return n;
}

/** For log lines and nothing else. Never do arithmetic on the result. */
export function formatPence(pence: number): string {
  const sign = pence < 0 ? '-' : '';
  const abs = Math.abs(pence);
  return `${sign}£${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
