/**
 * `pnpm steering:summary-check` — the roll-up and the summary contract, offline.
 *
 * ── WHAT IT IS ACTUALLY PROTECTING ───────────────────────────────────────
 *
 * Two rules from `docs/steering/NEXT.md` §4, which are both about a number that
 * would look perfectly reasonable on a slide:
 *
 *   a re-assessed requirement counts ONCE. The history table is a log; assess
 *   the same requirement three times and a naive tally reports a 24-requirement
 *   bid as having 26 findings in it
 *
 *   a refusal never enters a total. "Two items, EUR X, one unpriced" is the
 *   honest sentence; "EUR X" alone is the same sentence with the gap smoothed
 *   over, and nobody reading the slide can tell the difference
 *
 * ── AND THE NEGATIVE CONTROLS ────────────────────────────────────────────
 *
 * Half of these assertions feed a DELIBERATELY BAD summary to the coherence
 * rules and require them to complain. A checker that only sees good input
 * reports PASS for a rule it has stopped enforcing — which has happened in this
 * repo twice, and is written up in `leak-check.mjs` and in `assertions.ts`.
 *
 * No database, no model, no network. Every fixture below is written here.
 */
import { report, type Result } from '../../db/init/assertions';
import { sortRows } from '../../answer/filed-assessments';
import { rollUp } from './roll-up';
import { toLine } from './lines';
import { summaryCoherenceErrors, type BidSummary } from '../../schema/bid-summary-schema';
import type { RequirementAssessment } from '../../schema/assessment-schema';

// ── fixtures ───────────────────────────────────────────────────────────────

/** A minimal valid assessment. Only the fields the summary reads are varied. */
function assessment(over: Partial<RequirementAssessment> & { requirement_ref: string }): RequirementAssessment {
  return {
    finding: 'change_needed',
    reasoning: 'The requirement exists and no test report demonstrates it. Work is needed.',
    citations: [{ file: 'a.md', line: 1, quote: 'q' }],
    unverified_claims: [],
    conflicts: [],
    cost: { comparable_jobs: 8, median_hours: 100, eur: 10_000, refused_because: null },
    decisions_for_human: [],
    ...over,
  } as RequirementAssessment;
}

const refused = (ref: string, why: string, jobs: number | null = 0) =>
  assessment({
    requirement_ref: ref,
    cost: { comparable_jobs: jobs, median_hours: null, eur: null, refused_because: why },
  });

const row = (ref: string | null, ts: string, a?: RequirementAssessment) => ({
  ref,
  ts,
  answer: a ? { assessment: a, citations: { exact: 1, corrected: 0, unresolved: [] } } : null,
});

/**
 * The history the checks run against, newest first — the order the query
 * guarantees and `sortRows` depends on.
 *
 *   0101  priced, and assessed TWICE. The newer answer is the one in force.
 *   0102  refused, no test report
 *   0103  refused, no test report — the same cause, which is the theme
 *   0104  refused for a different cause, and history was never queried
 *   0105  a run that FAILED after an earlier one succeeded
 *   null  somebody typed a requirement rather than picking one
 *   junk  a row whose answer is not an assessment
 */
const HISTORY = sortRows([
  row(null, '2026-09-13T12:00:00Z', assessment({ requirement_ref: 'typed' })),
  row('CR-K2-0105', '2026-09-13T11:00:00Z'),
  row('CR-K2-0105', '2026-09-13T10:50:00Z', assessment({ requirement_ref: 'CR-K2-0105' })),
  { ref: 'CR-K2-0106', ts: '2026-09-13T10:40:00Z', answer: { assessment: { finding: 'nonsense' } } },
  row('CR-K2-0104', '2026-09-13T10:30:00Z', refused('CR-K2-0104', 'the change could not be classified', null)),
  row('CR-K2-0103', '2026-09-13T10:20:00Z', refused('CR-K2-0103', 'no test report exists')),
  row('CR-K2-0102', '2026-09-13T10:10:00Z', refused('CR-K2-0102', 'no test report exists')),
  row('CR-K2-0101', '2026-09-13T10:00:00Z', assessment({ requirement_ref: 'CR-K2-0101' })),
  row('CR-K2-0101', '2026-09-13T09:00:00Z', assessment({ requirement_ref: 'CR-K2-0101', finding: 'have_it' })),
]);

/** The programme asked for: six requirements, of which one was never assessed. */
const ASKED = ['CR-K2-0101', 'CR-K2-0102', 'CR-K2-0103', 'CR-K2-0104', 'CR-K2-0105', 'CR-K2-0107'];
const R = rollUp(HISTORY, ASKED);

/** A summary that should pass every rule. */
const GOOD: BidSummary = {
  headline:
    'Most of the programme is understood and blocked on evidence rather than on design. ' +
    'Only one requirement carries a figure; the rest are waiting on documents that do not exist yet.',
  refusal_themes: [
    {
      theme: 'no test report exists for the requirement',
      requirement_refs: ['CR-K2-0102', 'CR-K2-0103'],
      what_would_settle_it: 'the rack force test report from the 2021 validation campaign, if it exists',
    },
    {
      theme: 'the change could not be classified well enough to price',
      requirement_refs: ['CR-K2-0104'],
      what_would_settle_it: 'a decision on whether this is a software or a hardware change',
    },
  ],
  repeated_questions: [
    {
      question: 'Who produces the missing verification evidence, us or the customer?',
      requirement_refs: ['CR-K2-0102', 'CR-K2-0103'],
      suggested_owner: 'systems engineering',
    },
  ],
};

const clone = (s: BidSummary): BidSummary => JSON.parse(JSON.stringify(s));

// ── the checks ─────────────────────────────────────────────────────────────

function check(r: Result, label: string, pass: boolean, detail: string): void {
  (pass ? r.ok : r.fail).push({ label, detail });
}

/** A negative control: this summary MUST produce an error containing `needle`. */
function rejects(r: Result, label: string, mutate: (s: BidSummary) => void, needle: string): void {
  const bad = clone(GOOD);
  mutate(bad);
  const errors = summaryCoherenceErrors(bad, R);
  const hit = errors.find((e) => e.includes(needle));
  check(r, label, Boolean(hit), hit ?? `not caught — errors were: ${errors.join(' | ') || 'none'}`);
}

function main(): void {
  const r: Result = { ok: [], fail: [] };

  // ── the history reader ───────────────────────────────────────────────
  check(
    r,
    'a re-assessed requirement counts once, newest answer in force',
    HISTORY.answered.filter((a) => a.ref === 'CR-K2-0101').length === 1 &&
      HISTORY.answered.find((a) => a.ref === 'CR-K2-0101')?.assessment.finding === 'change_needed',
    `${HISTORY.superseded} superseded run(s) set aside; 0101 reads change_needed, not the older have_it`,
  );
  check(
    r,
    'a failed run does not erase the answer it followed, and is reported',
    HISTORY.answered.some((a) => a.ref === 'CR-K2-0105') && HISTORY.failedSince.includes('CR-K2-0105'),
    'CR-K2-0105 keeps its earlier answer and is listed as having failed since',
  );
  check(
    r,
    'a typed requirement is counted but never attributed to the programme',
    HISTORY.typed === 1 && !HISTORY.answered.some((a) => a.ref === 'typed'),
    '1 typed run, absent from the programme tally',
  );
  check(
    r,
    'a row that is not an assessment is named, not coerced',
    HISTORY.unreadableRefs.join() === 'CR-K2-0106',
    `unreadable: ${HISTORY.unreadableRefs.join(', ')} — the reference survives, so it can be re-run`,
  );

  // ── the arithmetic ───────────────────────────────────────────────────
  check(
    r,
    'the denominator is what was asked for, not what was answered',
    R.requirementCount === 6 && R.assessedRefs.length === 5 && R.notAssessedRefs.join() === 'CR-K2-0107',
    '5 of 6 assessed; CR-K2-0107 named as outstanding',
  );
  check(
    r,
    'a refusal never enters the total',
    R.eurTotal === 20_000 && R.priced.length === 2 && R.unpriced.length === 3,
    `EUR ${R.eurTotal} over 2 priced item(s), 3 unpriced — the three refusals contribute nothing`,
  );
  check(
    r,
    '"never queried" is not "queried and found none"',
    R.neverAsked === 1 && R.unpriced.filter((u) => u.jobs === 0).length === 2,
    '1 unpriced item never ran a comparables query; 2 ran one and found nothing',
  );
  check(
    r,
    'the evidence count travels with the money',
    R.jobsBehindTotal === 16,
    `${R.jobsBehindTotal} past job(s) behind ${R.priced.length} priced item(s)`,
  );
  check(
    r,
    'the finding mix is over requirements, not over runs',
    R.mix.change_needed === 5 && R.mix.have_it === 0,
    `change_needed ${R.mix.change_needed}, have_it ${R.mix.have_it} — the superseded have_it is not counted`,
  );

  // ── compression ──────────────────────────────────────────────────────
  const line = toLine(HISTORY.answered[1]);
  check(
    r,
    'a compressed line keeps the finding and the stated refusal, and drops the quotes',
    line.includes('no test report exists') && line.includes('change_needed') && !line.includes('"q"'),
    line.split('\n').join(' / '),
  );

  // ── the contract, on good input ──────────────────────────────────────
  const good = summaryCoherenceErrors(GOOD, R);
  check(r, 'an honest summary passes every coherence rule', good.length === 0, good.join(' | ') || 'no errors');

  // ── the contract, on bad input ───────────────────────────────────────
  rejects(
    r,
    'a requirement that was never assessed cannot be named',
    (s) => s.refusal_themes[1].requirement_refs.push('CR-K2-0199'),
    'not among the filed assessments',
  );
  rejects(
    r,
    'a priced requirement cannot be swept into a refusal theme',
    (s) => s.refusal_themes[1].requirement_refs.push('CR-K2-0101'),
    'which was priced',
  );
  rejects(
    r,
    'a refusal may be grouped, never dropped',
    (s) => s.refusal_themes.pop(),
    'appears in no theme',
  );
  rejects(
    r,
    'a requirement cannot be filed under two causes at once',
    (s) => s.refusal_themes[1].requirement_refs.push('CR-K2-0102'),
    'more than one refusal theme',
  );
  rejects(
    r,
    'no commitment reaches the page',
    (s) => (s.headline = 'The remaining items carry over at no cost to the customer.'),
    'commits on behalf of the company',
  );
  rejects(
    r,
    'no money figure is retyped into prose',
    (s) => (s.headline = 'The assessed work comes to EUR 20,000 so far.'),
    'money figure in prose',
  );
  check(
    r,
    'a standard number in an honest sentence is not mistaken for a count',
    summaryCoherenceErrors(
      {
        ...GOOD,
        headline:
          'The programme is blocked on ISO/SAE 21434 evidence and on an 8000 N rack force ' +
          'figure that ISO 26262 work has never demonstrated.',
      },
      R,
    ).length === 0,
    '21434, 8000 and 26262 read as what they are — none of them is doing a count\'s job',
  );
  rejects(
    r,
    'a count that contradicts the roll-up is caught',
    (s) => (s.headline = 'All 17 requirements have been assessed, and 9 of 11 are priced.'),
    'which is not a count the roll-up made',
  );
  check(
    r,
    'a count that AGREES with the roll-up is allowed through',
    summaryCoherenceErrors(
      { ...GOOD, headline: '5 of 6 requirements are assessed, and 3 of them carry no figure.' },
      R,
    ).length === 0,
    '"5 of 6 … 3 of them" passes — 5, 6 and 3 are all counts the roll-up made',
  );

  process.exit(report('summary:check', r));
}

if (require.main === module) main();
