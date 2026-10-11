/**
 * Self-check for the mortgage arithmetic. Run: pnpm mortgage:check (exit 1 on any failure).
 * The cases are the worked examples from the brief, with the numbers worked out by hand.
 */
import { calculate, deductionYear, amortRateFor, lowestRate, lowestListRate, parseKr, groupKr } from "./mortgage";

const failures: string[] = [];

function expect(name: string, actual: number, expected: number): void {
  if (Math.abs(actual - expected) > 0.5) failures.push(`${name}: expected ${expected}, got ${actual}`);
}

// Price 4 000 000, down 10 % (400 000): loan 3 600 000, LTV 90 %, amortization 2 % = 6 000 kr a month.
const a = calculate({ price: 4_000_000, down: 400_000, rate: 0, fee: 0 });
expect("loan", a.loan, 3_600_000);
expect("ltv", a.ltv * 100, 90);
expect("amortization rate", a.amortRate * 100, 2);
expect("amortization kr a month", a.amortMonth, 6_000);

// Rate 3 %: interest 108 000 a year = 9 000 kr a month. Deduction: 30 % of 100 000 + 21 % of 8 000 = 31 680 a year = 2 640 a month.
// Net interest 6 360 kr a month.
const b = calculate({ price: 4_000_000, down: 400_000, rate: 3, fee: 0 });
expect("interest kr a month before deduction", b.base.interestMonthGross, 9_000);
expect("deduction year", deductionYear(108_000), 31_680);
expect("deduction kr a month", b.base.deductionMonth, 2_640);
expect("interest kr a month after deduction", b.base.interestMonthNet, 6_360);
expect("total a month (interest + amortization)", b.base.totalMonth, 12_360);

// Stress +2 points: interest 5 % of 3.6 M = 180 000 a year, deduction 30 000 + 21 % of 80 000 = 46 800, net 133 200 / 12 = 11 100.
const s = calculate({ price: 4_000_000, down: 400_000, rate: 3, fee: 0 }).stress;
expect("stress net interest a month", s.interestMonthNet, 11_100);

// Amortization thresholds: 50 % is no amortization, 60 % is 1 %, 80 % is 2 %.
expect("amort at 50 %", amortRateFor(0.5) * 100, 0);
expect("amort at 60 %", amortRateFor(0.6) * 100, 1);
expect("amort at 80 %", amortRateFor(0.8) * 100, 2);

// Lowest list rate: "from" rates are not a rate to pick, so a from rate below the others is skipped.
const list = [
  { period: "5 år", rate: 1.75, from: true },
  { period: "5 år", rate: 2.4 },
  { period: "5 år", rate: 2.1 },
  { period: "3 år", rate: 1.2, from: true },
];
expect("lowest rate skips from rates", lowestRate(list, "5 år") ?? -1, 2.1);
expect("lowest rate is null when only from rates", lowestRate(list, "3 år") ?? -1, -1);

expect("lowest list rate skips from rates", lowestListRate([{ bank: "A", period: "3 mån", rate: 1.2, from: true }, { bank: "B", period: "3 mån", rate: 3.09 }, { bank: "C", period: "3 mån", rate: 3.4 }], "3 mån")?.rate ?? -1, 3.09);

// Typed price: spaces, no-break spaces, commas and dots are all grouping, so every form gives the same kronor.
expect("price 3 500 000 with spaces", parseKr("3 500 000"), 3500000);
expect("price 3 500 000 with no-break spaces", parseKr("3\u00a0500\u00a0000"), 3500000);
expect("price 3,500,000", parseKr("3,500,000"), 3500000);
expect("price 3.500.000", parseKr("3.500.000"), 3500000);
expect("price empty is 0", parseKr(""), 0);
expect("grouping shows 3 500 000", groupKr(3500000).replace(/\s/g, " ").length, 9);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("mortgage:check ok (6 groups of expectations)");
