/**
 * Offline self-test for the list-rate parser: reads the saved Konsumenternas page and asserts that the
 * parser finds at least 10 banks with a 3 mån rate and the known rows. No network. Run: pnpm rates:check
 */
import * as fs from "fs";
import * as path from "path";
import { parseListRates, parseRateCell } from "../sources/rates";

const FIXTURE = path.join(__dirname, "..", "..", "data", "fixtures", "konsumenternas-sample.html");

function assert(cond: unknown, message: string): void {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(parseRateCell("4,60 - 9,80")?.rate === 4.6, "range takes the lower end");
assert(parseRateCell("Från 5,65")?.from === true, "'Från' marks a from rate");
assert(parseRateCell("Uppgift saknas") === null, "'Uppgift saknas' is no rate");
assert(parseRateCell("") === null, "an empty cell is no rate");

const html = fs.readFileSync(FIXTURE, "utf8");
const result = parseListRates(html);
const with3m = new Set(result.rates.filter((r) => r.period === "3 mån").map((r) => r.bank));
console.log(`updated ${result.updated}, companies ${result.companies}, banks with 3 mån ${with3m.size}, rows ${result.rates.length}`);
assert(with3m.size >= 10, `expected >= 10 banks with a 3 mån rate, got ${with3m.size}`);

const swedbank = result.rates.find((r) => r.bank === "Swedbank" && r.period === "3 mån");
assert(swedbank && swedbank.rate === 3.89 && swedbank.listed && !swedbank.from, "Swedbank 3 mån is 3.89 and listed");
assert(result.rates.some((r) => r.bank === "Bluestep" && r.period === "3 mån" && r.from && r.rate === 4.6), "Bluestep 3 mån is a range from 4.60");
assert(result.updated === "2026-10-08", "update date is read from the page");
console.log("rates:check ok");
