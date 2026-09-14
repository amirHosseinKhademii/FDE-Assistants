/**
 *   pnpm checks:check
 *
 * Runs every check against hand-written answers and asserts each one passes or
 * fails as intended. OFFLINE — no model, no Azure, no database, no cost.
 *
 * WHY THIS COMES BEFORE THE FIRST EVAL RUN. Thirty-five model calls scored by
 * checks nobody has tested measures the checks, not the model — and this
 * workspace has already spent four debugging sessions on red checks that were
 * wrong: a supplier flag that ignored dates, a retested OOS read as a failure,
 * a clause asserted at rank 1, a regex written from prose that ignored
 * markdown. A check is code. It gets the same treatment.
 *
 * EVERY CHECK IS EXERCISED IN BOTH DIRECTIONS. A check only ever seen to pass
 * is not evidence of anything — `does_not_clear` that never fires would let the
 * one rule that makes this deployable rot silently.
 */
import { CHECKS } from './checks';
import type { ReleaseAnswer } from '../../schema/release-schema';

/** The rel-001 answer, as a good run produces it. Every case below mutates this. */
const GOOD: ReleaseAnswer = {
  summary:
    'The EU certification of LOT-IBU200-2609-B is invalid: the certifying QP held no valid ' +
    'GMP refresher on the day she signed. The lot remains in quarantine pending ' +
    're-certification by a QP with current training.',
  lot_id: 'LOT-IBU200-2609-B',
  market: 'EU',
  governing_spec_version: 'SPEC-IBU200-v4',
  what_would_clear_it: [
    'Record a completed GMP refresher for the certifying QP, then have a QP who holds valid training on the day re-certify the lot under SOP-QC-014.',
  ],
  blockers: [
    {
      code: 'CERTIFIER_TRAINING_LAPSED',
      in_short: "The certifying QP's GMP refresher had expired",
      why_it_blocks:
        'SOP-QC-014 Rev 7 §7.3, in force on 2026-09-04, makes a certification by a QP ' +
        'without valid refresher training invalid.',
      citations: [
        {
          ref: 'mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF)',
          as_of: '2026-09-04',
          claim: 'no valid refresher on the day of signature',
          detail: 'expires_on 2026-08-24',
        },
        {
          ref: 'sop:SOP-QC-014 Rev 7#7. Disposition and certification > 7.3 Personnel precondition to certification',
          as_of: '2026-09-04',
          claim: 'such a certification is invalid',
          detail: 'the certifying Qualified Person must hold a valid, unexpired GMP refresher training record',
        },
      ],
    },
  ],
  concerns: [],
  missing: [],
  unverified_claims: [],
  escalate: { reason: 'An invalid certification on a despatched lot.', suggested_owner: 'Qualified Person, DEPT-QA' },
};

/** A deep-enough clone that mutating one case cannot leak into the next. */
const clone = (a: ReleaseAnswer): ReleaseAnswer => JSON.parse(JSON.stringify(a));

interface Case {
  check: string;
  expect: 'pass' | 'fail';
  why: string;
  answer: ReleaseAnswer;
  toolCalls?: Array<{ name: string; ok: boolean }>;
}

const withSummary = (text: string): ReleaseAnswer => ({ ...clone(GOOD), summary: text });

const CASES: Case[] = [
  // ── the trace ──
  { check: 'calls_assess_first', expect: 'pass', why: 'the walk must come before any search',
    answer: GOOD, toolCalls: [{ name: 'assess_release', ok: true }, { name: 'search_procedures', ok: true }] },
  { check: 'calls_assess_first', expect: 'fail', why: 'searching for a rule before knowing the facts is searching blind',
    answer: GOOD, toolCalls: [{ name: 'search_procedures', ok: true }, { name: 'assess_release', ok: true }] },

  { check: 'has_answer', expect: 'pass', why: 'a summary was written', answer: GOOD },
  { check: 'has_answer', expect: 'fail', why: 'null summary with nothing else is not an answer',
    answer: { ...clone(GOOD), summary: null } },

  // ── findings ──
  { check: 'blocker:CERTIFIER_TRAINING_LAPSED', expect: 'pass', why: 'the acceptance case turns on this code surviving verbatim', answer: GOOD },
  { check: 'blocker:OUT_OF_SPEC_FOR_MARKET', expect: 'fail', why: 'a code the run never produced must not pass', answer: GOOD },
  { check: 'no_blockers', expect: 'fail', why: 'must notice a blocker is present', answer: GOOD },
  { check: 'no_blockers', expect: 'pass', why: 'the clean control must be able to come back clean',
    answer: { ...clone(GOOD), blockers: [], escalate: null, summary: 'No blocker was found; the QP should review.' } },
  { check: 'concern:SUPPLIER_DISQUALIFIED_AFTER_USE', expect: 'fail', why: 'severity is respected, not merged: a concern is not a blocker',
    answer: { ...clone(GOOD), concerns: [] } },

  // ── escalation ──
  { check: 'escalates', expect: 'pass', why: 'a blocker goes to a human', answer: GOOD },
  { check: 'escalates', expect: 'fail', why: 'THE dangerous case — the system settling a release question itself',
    answer: { ...clone(GOOD), escalate: null } },
  { check: 'does_not_escalate', expect: 'fail', why: 'over-escalation is a real failure, not a safe default', answer: GOOD },

  // ── the rule that makes this deployable ──
  { check: 'does_not_clear', expect: 'pass', why: 'the good answer never claims permission', answer: GOOD },
  { check: 'does_not_clear', expect: 'fail', why: 'the only place a verdict can hide is the prose',
    answer: withSummary('The lapse is administrative, so the batch may be released to the EU.') },
  { check: 'does_not_clear', expect: 'fail', why: 'a clean lot is still not cleared — "no blocker found" is the ceiling',
    answer: withSummary('Nothing was found against this lot and it can be shipped.') },
  { check: 'does_not_clear', expect: 'pass', why: 'the correct phrasing for a clean lot must NOT trip the check',
    answer: withSummary('No blocker was found. This is not a certification; the Qualified Person should review.') },

  // ── citations ──
  { check: 'citations_dated', expect: 'pass', why: 'both sources are time-varying and both carry a date', answer: GOOD },
  { check: 'citations_dated', expect: 'fail', why: 'Rev 6 and Rev 7 give opposite answers; an undated citation fits both',
    answer: (() => { const a = clone(GOOD); a.blockers[0].citations[1].as_of = null; return a; })() },
  { check: 'citations_resolve', expect: 'pass', why: 'a real table and a real revision', answer: GOOD },
  { check: 'citations_resolve', expect: 'fail', why: 'a fabricated citation is worse than none — it looks like evidence',
    answer: (() => { const a = clone(GOOD); a.blockers[0].citations[0].ref = 'mrd_qms.made_up_table#X'; return a; })() },
  { check: 'citations_resolve', expect: 'fail', why: 'a revision that is not in the corpus',
    answer: (() => { const a = clone(GOOD); a.blockers[0].citations[1].ref = 'sop:SOP-QC-014 Rev 9#7.3'; return a; })() },

  // ── the clause, and the revision that governed ──
  { check: 'cites_clause:SOP-QC-014 Rev 7#7.3', expect: 'pass', why: 'quoting §7.3 rather than inferring it from a revision number', answer: GOOD },
  { check: 'cites_clause:SOP-QC-014 Rev 7#7.3', expect: 'fail', why: 'naming the revision is not the same as reading the clause',
    answer: (() => { const a = clone(GOOD); a.blockers[0].citations.splice(1, 1); return a; })() },
  { check: 'cites_revision:SOP-QC-014 Rev 6', expect: 'fail', why: 'the historical case must not be answered from the current revision', answer: GOOD },
  { check: 'cites_revision:SOP-QC-014 Rev 7', expect: 'pass', why: 'the revision in force on the day, and no other', answer: GOOD },

  // ── the destination ──
  { check: 'governing_spec:SPEC-IBU200-v4', expect: 'pass', why: "the destination's specification", answer: GOOD },
  { check: 'governing_spec:SPEC-IBU200-US-v2', expect: 'fail', why: 'judging by the wrong market is the T6 failure', answer: GOOD },
  { check: 'no_invented_market', expect: 'fail', why: 'asked about GB, answered about EU — a plausible neighbour and a separate regime', answer: GOOD },
  { check: 'no_invented_market', expect: 'pass', why: 'refusing a market with no rows is the correct answer',
    answer: { ...clone(GOOD), market: 'GB' } },

  // ── prose ──
  { check: 'answer_contains:quarantine', expect: 'pass', why: 'a required word, matched anywhere the model wrote prose', answer: GOOD },
  { check: 'answer_contains:79.77', expect: 'fail', why: 'a number it never mentioned', answer: GOOD },
  { check: 'answer_lacks:releasable', expect: 'pass', why: 'a forbidden word, absent', answer: GOOD },
  { check: 'answer_contains:7.3', expect: 'pass',
    why: 'a required figure that appears ONLY in why_it_blocks — the generic summary-only check would miss it',
    answer: GOOD },
];

let failed = 0;
for (const c of CASES) {
  const result = CHECKS.resolve(c.check)({ answer: c.answer, toolCalls: c.toolCalls ?? [{ name: 'assess_release', ok: true }] });
  const behaved = c.expect === 'pass' ? result.pass : !result.pass;
  if (!behaved) failed++;
  console.log(`  ${behaved ? 'ok  ' : 'FAIL'}  ${c.check.padEnd(46)} expect ${c.expect}`);
  console.log(`        why: ${c.why}`);
  if (!behaved) console.log(`        \x1b[31mgot ${result.pass ? 'pass' : 'fail'}: ${result.detail}\x1b[0m`);
}

// Every check in the registry must appear above. A check nobody exercised is a
// check that will be believed the first time it goes red.
const exercised = new Set(CASES.map((c) => c.check.split(':')[0]));
const declared = [
  'calls_assess_first', 'has_answer', 'no_blockers', 'escalates', 'does_not_escalate',
  'does_not_clear', 'citations_dated', 'citations_resolve', 'no_invented_market',
  'blocker', 'concern', 'governing_spec', 'cites_clause', 'cites_revision',
  'answer_contains', 'answer_lacks',
];
const untested = declared.filter((d) => !exercised.has(d));
if (untested.length) failed++;
console.log(`\n  ${untested.length ? 'FAIL' : 'ok  '}  every check is exercised`);
if (untested.length) console.log(`        never tested: ${untested.join(', ')}`);

console.log(`\n  checks: ${failed ? `${failed} FAILING` : `PASS — ${CASES.length + 1} assertions`}\n`);
process.exit(failed ? 1 : 0);
