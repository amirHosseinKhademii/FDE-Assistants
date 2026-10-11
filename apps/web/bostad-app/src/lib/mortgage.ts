/**
 * The mortgage arithmetic for the calculator. Pure: no fetch, no DOM, so the self-check
 * (mortgage.check.ts) can run it under Node. The rule numbers mirror packages/bostad/src/sources/mortgage-rules.ts;
 * they are copied here because the client cannot import that package (its profile code reads files).
 */

export const MAX_LTV = 0.9;
/** The smallest down payment the rules allow, as a share of the price. */
export const MIN_DOWN_SHARE = 1 - MAX_LTV;
export const STRESS_POINTS = 2;
/** Interest deduction: 30 % up to the ceiling, 21 % above it. */
export const DEDUCTION = { ceilingKr: 100000, lowRate: 0.3, highRate: 0.21 } as const;

export const FIXATIONS = ["3 mån", "1 år", "2 år", "3 år", "5 år"] as const;
export type Fixation = (typeof FIXATIONS)[number];

export interface MortgageInput {
  /** Price in kr. */
  price: number;
  /** Down payment in kr. */
  down: number;
  /** Interest rate in percent, e.g. 3.2. */
  rate: number;
  /** Monthly association fee in kr. */
  fee: number;
}

export interface Scenario {
  rate: number;
  interestMonthGross: number;
  deductionMonth: number;
  interestMonthNet: number;
  totalMonth: number;
}

export interface MortgageResult {
  loan: number;
  /** Loan-to-value as a fraction, 0.9 for 90 %. */
  ltv: number;
  /** Amortization as a fraction of the loan per year: 0, 0.01 or 0.02. */
  amortRate: number;
  amortMonth: number;
  feeMonth: number;
  base: Scenario;
  stress: Scenario;
}

/** Amortization by loan-to-value: nothing up to 50 %, 1 % a year above 50 % and 2 % above 70 %. */
export function amortRateFor(ltv: number): number {
  if (ltv > 0.7) return 0.02;
  if (ltv > 0.5) return 0.01;
  return 0;
}

/** Annual deduction on the yearly interest: 30 % up to 100 000 kr of interest, 21 % above. */
export function deductionYear(interestYear: number): number {
  return (
    DEDUCTION.lowRate * Math.min(interestYear, DEDUCTION.ceilingKr) +
    DEDUCTION.highRate * Math.max(0, interestYear - DEDUCTION.ceilingKr)
  );
}

function scenario(loan: number, rate: number): Scenario {
  const interestYear = (loan * rate) / 100;
  const interestMonthGross = interestYear / 12;
  const deductionMonth = deductionYear(interestYear) / 12;
  return {
    rate,
    interestMonthGross,
    deductionMonth,
    interestMonthNet: interestMonthGross - deductionMonth,
    totalMonth: 0,
  };
}

/** The monthly cost: interest after the deduction, amortization and the fee. Amortization is the same in the stress case. */
export function calculate(input: MortgageInput): MortgageResult {
  const price = Math.max(0, input.price);
  const loan = Math.max(0, price - Math.max(0, input.down));
  const ltv = price > 0 ? loan / price : 0;
  const amortRate = amortRateFor(ltv);
  const amortMonth = (loan * amortRate) / 12;
  const feeMonth = Math.max(0, input.fee);

  const base = scenario(loan, input.rate);
  base.totalMonth = base.interestMonthNet + amortMonth + feeMonth;
  const stress = scenario(loan, input.rate + STRESS_POINTS);
  stress.totalMonth = stress.interestMonthNet + amortMonth + feeMonth;

  return { loan, ltv, amortRate, amortMonth, feeMonth, base, stress };
}

/** The lowest list rate for a fixation period, or null when no bank gives one. */
/**
 * Kronor from a typed price. Every character that is not a digit is dropped, so "3 500 000" (spaces, or the
 * no-break space the browser may insert), "3,500,000", "3.500.000" and "3500000" all give 3500000.
 */
export function parseKr(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** The price as the input shows it while typing: Swedish grouping, a space between thousands, e.g. 3 500 000. */
export function groupKr(amount: number): string {
  return amount > 0 ? Math.round(amount).toLocaleString("sv-SE") : "";
}

/** Below this a price is almost certainly typed in tkr, so the calculator shows a hint instead of numbers. */
export const MIN_PRICE_KR = 100000;

/** The cheapest bank list rate for a period, leaving out "from" rates, or null. */
export function lowestListRate<T extends { period: string; rate: number; from?: boolean }>(rates: T[], period: string): T | null {
  const hits = rates.filter((r) => r.period === period && !r.from);
  return hits.length > 0 ? hits.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
}

/** The lowest list rate for a period. "From" rates are left out: they are the bottom of a range, not a rate a bank quotes. */
export function lowestRate(rates: { period: string; rate: number; from?: boolean }[], period: string): number | null {
  const values = rates.filter((r) => r.period === period && !r.from).map((r) => r.rate);
  return values.length > 0 ? Math.min(...values) : null;
}
