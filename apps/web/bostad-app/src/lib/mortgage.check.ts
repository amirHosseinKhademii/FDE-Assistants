/**
 * Self-check for the mortgage arithmetic. Run: pnpm mortgage:check (exit 1 on any failure).
 * The cases are the worked examples from the brief, with the numbers worked out by hand.
 */
import { calculate, deductionYear, amortRateFor } from "./mortgage";

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

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("mortgage:check ok (6 groups of expectations)");
