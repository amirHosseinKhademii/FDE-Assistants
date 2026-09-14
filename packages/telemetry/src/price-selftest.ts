/**
 *   pnpm price:check
 *
 * Does the cost arithmetic hold? OFFLINE — no model, no network, no cost.
 *
 * WHY THIS NEEDED A SELF-TEST WHEN THE OLD FORMULA DID NOT. The old one was
 * two multiplications and an addition; reading it was checking it. Cached-token
 * pricing adds a subtraction and three conditions, and the failure mode is a
 * number that is merely WRONG rather than absent — which no other check in this
 * repo would notice, because nothing anywhere asserts what a request should
 * cost.
 *
 * A COST BUG IS SILENT IN THE ONE DIRECTION THAT MATTERS. Every other defect
 * here announces itself: a bad citation fails a check, a bad disposition fails
 * an eval. A cost that is too low looks like good news and gets quoted in a
 * business case. Nobody investigates money they appear not to have spent.
 *
 * The rates below are DELIBERATELY ROUND AND FAKE. Real rates belong to a
 * deployment and live in the app (`telemetry/prices.ts`); a self-test pinned to
 * today's Azure price list would go red the next time somebody renegotiates a
 * contract, which is not a code defect.
 */
import { configureRequestLog, priceOf, logRequest, type Price } from './request-log';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

/** A real file, because the note is asserted off the line that is actually written. */
const LINES = resolve(tmpdir(), `fde-price-selftest-${process.pid}.jsonl`);

const WITH_CACHE: Price = {
  inputPerM: 10,
  cachedInputPerM: 1, // a tenth, the same shape as the real gpt-5-mini gap
  outputPerM: 100,
  source: 'self-test, not a real rate',
  checked: '2026-09-12',
};

/** The same deployment BEFORE anybody confirmed a cached rate from a bill. */
const NO_CACHE_RATE: Price = {
  inputPerM: 10,
  outputPerM: 100,
  source: 'self-test, not a real rate',
  checked: '2026-09-12',
};

configureRequestLog({
  path: LINES,
  prices: { cached: WITH_CACHE, uncached: NO_CACHE_RATE },
});

let failed = 0;

function assert(what: string, got: unknown, want: unknown, why: string): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
  console.log(`        why: ${why}`);
  if (!ok) console.log(`        \x1b[31mgot ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}\x1b[0m`);
}

console.log('\nPrice self-test — cached input is a discounted SUBSET\n');

// ── the baseline everything else is measured against ──────────────────────

console.log('no cached tokens reported');

// 1,000,000 input at 10 + 100,000 output at 100 = 10 + 10 = 20
assert('full price when the engine reports nothing', priceOf('cached', 1e6, 1e5), 20,
  'the ceiling, and the number this repo has been printing all along');

assert('an unpriced model reports null, never zero', priceOf('nope', 1e6, 1e5), null,
  'a missing rate is an admitted gap; zero would be an invented figure that looks like a bargain');

// ── the subtraction, which is the whole point ─────────────────────────────

console.log('\ncached tokens are SUBTRACTED from the input count, not added');

// 900,000 cached: 100,000 fresh at 10 = 1, plus 900,000 cached at 1 = 0.9,
// plus output 10 → 11.9. The additive bug would give 20 + 0.9 = 20.9.
assert('90% cached costs 11.9, not 20.9', priceOf('cached', 1e6, 1e5, 9e5), 11.9,
  'THE BUG THIS FILE EXISTS FOR: add instead of subtract and a cache HIT makes the ' +
  'request dearer than no cache at all. Cost going UP is the one direction nobody investigates');

assert('a cache hit is always cheaper than no hit',
  (priceOf('cached', 1e6, 1e5, 9e5) ?? 0) < (priceOf('cached', 1e6, 1e5) ?? 0), true,
  'stated as an inequality as well as a figure, because this is the property that must hold ' +
  'for ANY rates, not just the round ones above');

assert('zero cached equals not-cached, to the cent', priceOf('cached', 1e6, 1e5, 0), 20,
  'the DOLLAR figures agree on purpose — what differs between "measured, no hits" and ' +
  '"not reported" is the costNote, not the money. See the claim assertions below');

assert('fully cached still pays for output', priceOf('cached', 1e6, 1e5, 1e6), 11,
  'input falls to 1.0, output is untouched at 10 — output is never cached, and a formula ' +
  'that discounted it would flatter every long answer');

// ── refusing to discount on half the evidence ─────────────────────────────

console.log('\nboth facts required, or the figure stays a ceiling');

assert('cached tokens reported but NO verified rate → full price',
  priceOf('uncached', 1e6, 1e5, 9e5), 20,
  'the engine knows, the bill has not been checked. Charging the cheap rate here would be ' +
  'guessing a discount, and `prices.ts` forbids inventing a figure — a ceiling is defensible');

// ── the clamp ─────────────────────────────────────────────────────────────

console.log('\nthe clamp — a nonsense reading must not become a refund');

assert('cached > input is clamped to input', priceOf('cached', 1e6, 1e5, 5e6), 11,
  'unclamped, the uncached remainder goes negative and the bill SHRINKS the more absurd ' +
  'the reading gets. Providers report cached as a subset; this refuses to profit if one does not');

assert('a negative cached count is floored at zero', priceOf('cached', 1e6, 1e5, -1), 20,
  'falls back to the ceiling rather than inflating the bill — wrong input should degrade to ' +
  'the honest number, not to a different wrong one');

// ── what the LINE says, not just what it costs ────────────────────────────
//
// The dollar figure cannot distinguish "measured, no hits" from "not reported"
// — both are the ceiling. The note is the only thing that can, and it is the
// difference between a true finding and a false one about an engine.

console.log('\nthe note, which is the only thing that separates unknown from measured');

// `costNote` is not on `priceOf`'s return, so this reads the LINE THAT IS
// ACTUALLY WRITTEN — through `logRequest`, to a real file, parsed back. Testing
// the note any other way would test a re-derivation of it rather than the thing
// a person opens `logs/requests.jsonl` and reads.
const noteFor = (cachedInputTokens: number | undefined, model = 'cached'): string => {
  rmSync(LINES, { force: true });
  logRequest({
    subject: null, question: 'q', model, engine: 'selftest',
    turns: 1, toolCalls: 0, inputTokens: 1e6, cachedInputTokens, outputTokens: 1e5,
    ms: 0, stoppedBecause: 'model_finished', schemaRetries: 0, surface: 'selftest',
  });
  return JSON.parse(readFileSync(LINES, 'utf8').trim()).costNote as string;
};

assert('not reported says CEILING', /^.*— CEILING: engine did not report/.test(noteFor(undefined)), true,
  'no discount can be applied without a reading, and the line SAYS the absence rather than ' +
  'leaving a reader to assume the number is exact');

assert('measured zero does NOT say ceiling', /billed as cached/.test(noteFor(0)), true,
  'identical MONEY to the line above (both 20) — the note is the only thing that separates ' +
  '"we measured, nothing cached" from "we never looked". An engine that silently reports ' +
  'nothing must not be recorded as an engine on which caching does not help');

assert('no verified rate says CEILING and names the model',
  /CEILING: 900000 cached tokens reported but no verified cached rate for "uncached"/
    .test(noteFor(9e5, 'uncached')), true,
  'the actionable half: it is the RATE that is missing, not the reading, so the fix is to ' +
  'check a bill rather than to touch an engine');

assert('measured and rated states the split', noteFor(9e5),
  'self-test, not a real rate, checked 2026-09-12 — 900000 of 1000000 input tokens billed as cached',
  'the whole caveat travels on the line, the same way PROVISIONAL does on `source` — a figure ' +
  'and its caveat in different places is a caveat lost on the way to a spreadsheet');

rmSync(LINES, { force: true });

console.log(`\n  price: ${failed ? `${failed} FAILING` : 'PASS — 13 assertions'}\n`);
process.exit(failed ? 1 : 0);
