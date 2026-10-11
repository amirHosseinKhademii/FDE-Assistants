/**
 * Swedish mortgage rules used by the calculator. Hard-coded on purpose: they change rarely,
 * and each one carries the law or tax text it comes from and the date it applies.
 */

export const LAW_URL =
  "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2026226-om-begransning-av-bostadskrediter_sfs-2026-226/";
export const SKATTEVERKET_URL =
  "https://www.skatteverket.se/privat/deklaration/avdragforprivatpersoner/avdragforranteutgifter.106.1b39a64a1919eabb488b87.html";
export const FIU36_URL =
  "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/betankande/utveckling-av-makrotillsynsomradet_hd01fiu36/html/";

export const MORTGAGE_RULES = {
  /** Largest loan against the price (loan-to-value) for new credit. */
  maxLtv: {
    value: 0.9,
    /** Source: Lag (2026:226) om begränsning av bostadskrediter, 4 §, in force 2026-04-01. */
    source: "Lag (2026:226), 4 §",
    url: LAW_URL,
    from: "2026-04-01",
  },
  /** Amortization (repayment) per year, on the highest credit amount, by loan-to-value. */
  amortization: {
    /** Above 50 % up to 70 %: 1 % a year. */
    lowRate: 0.01,
    lowAbove: 0.5,
    /** Above 70 %: 2 % a year. */
    highRate: 0.02,
    highAbove: 0.7,
    source: "Lag (2026:226), 7 §",
    url: LAW_URL,
    from: "2026-04-01",
  },
  /** Interest deduction: a tax reduction on the capital deficit, 30 % up to the ceiling and 21 % above. */
  interestDeduction: {
    ceilingKr: 100000,
    lowRate: 0.3,
    highRate: 0.21,
    source: "Skatteverket, avdrag för räntor",
    url: SKATTEVERKET_URL,
    /** Read on the page 2026-10-11. From income year 2026 only loans that meet the security and max-LTV rules qualify. */
    checkedOn: "2026-10-11",
  },
  /** The 4.5 x income rule (an extra 1 % amortization) is not in the law. */
  noIncomeMultipleRule: {
    source: "FiU36, prop. 2025/26:119",
    url: FIU36_URL,
    from: "2026-04-01",
  },
} as const;
