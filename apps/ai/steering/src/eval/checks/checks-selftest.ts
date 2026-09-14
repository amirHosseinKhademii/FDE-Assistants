/**
 * `pnpm steering:checks-check` — do the checks catch what they claim to?
 *
 * Offline, free, no model, no database. Each check is run twice: against an
 * answer that should pass it and against one that should fail it.
 *
 * ── WHY BOTH DIRECTIONS, EVERY TIME ──────────────────────────────────────
 *
 * A check that has only ever passed is indistinguishable from a check that
 * cannot fail. This repo has produced three of those and two of them in the
 * last day — a description walker reading the wrong field of a library, and an
 * evidence assertion counting the wrong table. Both were green for the wrong
 * reason, and green for the wrong reason is worse than red, because nobody
 * investigates it.
 */
import { CHECKS } from './assessment-checks';
import { report, type Result } from '../../db/init/assertions';
import type { RequirementAssessment } from '../../schema/assessment-schema';

/** Real file, real line, real sentence — verified against the corpus. */
const REAL = {
  file: 'requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md',
  line: 16,
  quote: 'The EPS assembly shall deliver at least 8000 N at the rack.',
};

/**
 * A six-row markdown table, quoted whole, from line 9 of a real file.
 *
 * ── THE REGRESSION THIS EXISTS TO PREVENT ───────────────────────────────
 *
 * `findEvidence` searched a fixed six-line window. A real eval run cited this
 * exact table, at the exact right line, and the check reported "quote not in
 * the file" — then severity filed it as `false_answer`, the bucket meaning the
 * model fabricated evidence. It had not.
 *
 * A table is a legitimate thing to quote whole: one row without its header is
 * precisely what the chunker works to prevent. So the window is sized from the
 * quote, and this case fails again the moment it is not.
 */
const TABLE = {
  file: 'requirements/PRG-KST-K2/architecture-PRG-KST-K2.md',
  line: 9,
  quote: [
    '| EL-K2-TSENS-01 | sensor | buy | D | VS-TSENS-1180-B | carryover |',
    '| EL-K2-ECU-01 | ecu | buy | D | VS-ECU-4680-A | modified |',
    '| EL-K2-MOT-01 | motor | buy | D | VS-MOT-5520-A | carryover |',
    '| EL-K2-GEAR-01 | gearbox | make | B | VS-GEAR-3301-C | modified |',
    '| EL-K2-RACK-01 | mechanical | make | B | VS-RACK-2210-A | carryover |',
    '| EL-K2-GW-01 | ecu | buy | B | — | carryover |',
  ].join('\n'),
};

const GOOD: RequirementAssessment = {
  requirement_ref: 'CR-K2-0101',
  finding: 'change_needed',
  reasoning: 'The requirement asks for 8000 N and nothing demonstrates it.',
  citations: [REAL],
  unverified_claims: [],
  conflicts: [
    {
      about: 'whether the figure is measured at the rack or at the motor',
      positions: [
        { says: 'at the rack', citation: REAL },
        { says: 'at the motor', citation: REAL },
      ],
    },
  ],
  cost: { comparable_jobs: 0, median_hours: null, eur: null, refused_because: 'no comparable history' },
  decisions_for_human: [
    { question: 'Re-test or redesign?', why_it_matters: 'A rig week against a redesign.', suggested_owner: 'engineering' },
  ],
};

const edit = (f: (a: RequirementAssessment) => void): RequirementAssessment => {
  const c = JSON.parse(JSON.stringify(GOOD)) as RequirementAssessment;
  f(c);
  return c;
};

/** A trace where the retrieval tool was called first. */
const TRACE_OK = [
  { name: 'search_documents', args: {}, ok: true, ms: 1, source: 'live' as const },
  { name: 'find_comparable_work', args: {}, ok: true, ms: 1, source: 'live' as const },
];
const TRACE_BAD = [{ name: 'find_comparable_work', args: {}, ok: true, ms: 1, source: 'live' as const }];

interface Case { spec: string; bad: RequirementAssessment; trace?: any[]; badTrace?: any[]; why: string }

const CASES: Case[] = [
  { spec: 'cites_something', why: 'an assertion with no source at all',
    bad: edit((a) => { a.citations = []; }) },

  { spec: 'citations_resolve', why: 'a file that does not exist in the corpus',
    bad: edit((a) => { a.citations[0].file = 'requirements/PRG-NOPE/invented.md'; }) },

  { spec: 'citation_lines_land', why: 'the right file, the wrong line — what two real runs produced',
    bad: edit((a) => { a.citations[0].line = 1; }) },

  { spec: 'citation_lines_land', why: 'a quote that is not in the file — a paraphrase',
    bad: edit((a) => { a.citations[0].quote = 'The assembly comfortably exceeds the requirement.'; }) },

  { spec: 'escalates', why: 'nothing put to a human',
    bad: edit((a) => { a.decisions_for_human = []; }) },

  { spec: 'no_commitment', why: 'a commercial position asserted in the reasoning',
    bad: edit((a) => { a.reasoning = 'The gearbox carries over at no cost.'; }) },

  { spec: 'refuses_price', why: 'a price where a refusal was expected',
    bad: edit((a) => { a.cost = { comparable_jobs: 6, median_hours: 722, eur: 81455, refused_because: null }; }) },

  { spec: 'counted_before_refusing', why: 'claims a count from a query it never ran',
    bad: edit((a) => { a.cost.comparable_jobs = 0; }),
    trace: [{ name: 'search_documents', args: {}, ok: true, ms: 1, source: 'live' as const },
            { name: 'find_comparable_work', args: {}, ok: true, ms: 1, source: 'live' as const }],
    badTrace: [{ name: 'search_documents', args: {}, ok: true, ms: 1, source: 'live' as const }] },

  { spec: 'priced_or_refused', why: 'neither — the cost block says nothing',
    bad: edit((a) => { a.cost = { comparable_jobs: 0, median_hours: null, eur: null, refused_because: null }; }) },

  { spec: 'no_invented_values', why: 'a figure in the prose that no citation contains',
    bad: edit((a) => { a.reasoning = 'The rig demonstrated 7600 N against the required figure.'; }) },

  { spec: 'finding:change_needed', why: 'a different finding than the case pins',
    bad: edit((a) => { a.finding = 'cannot_tell'; }) },

  { spec: 'not_finding:have_it', why: 'the expensive wrong answer',
    bad: edit((a) => { a.finding = 'have_it'; }) },

  { spec: 'conflict_about:rack', why: 'the documents disagree and it was not recorded',
    bad: edit((a) => { a.conflicts = []; }) },

  // The wrong-subject case: a conflict IS recorded, about something else.
  { spec: 'conflict_about:rack', why: 'a conflict about an unrelated subject does not satisfy it',
    bad: edit((a) => {
      a.conflicts = [{
        about: 'the delivery date',
        positions: [
          { says: 'September', citation: { ...REAL, quote: 'Start of production shall be 2028-09-01.' } },
          { says: 'October', citation: { ...REAL, quote: 'Start of production shall be 2028-09-01.' } },
        ],
      }];
    }) },

  { spec: 'calls_search_first', why: 'priced before reading anything',
    bad: GOOD, trace: TRACE_OK, badTrace: TRACE_BAD },
];

function main(): void {
  const r: Result = { ok: [], fail: [] };

  // ── "I DID NOT LOOK" MUST BE SAYABLE ────────────────────────────────────
  //
  // A null count with no pricing call is the honest answer when the work could
  // not be classified well enough to query. It has to pass, or the only
  // expressible option is the dishonest one.
  {
    const notLooked = edit((a) => { a.cost.comparable_jobs = null; });
    const res = CHECKS.resolve('counted_before_refusing')({
      answer: notLooked,
      toolCalls: [{ name: 'search_documents', args: {}, ok: true, ms: 1, source: 'live' }],
    } as any);
    r[res.pass ? 'ok' : 'fail'].push({
      label: 'counted_before_refusing — a null count with no query is honest, not a failure',
      detail: res.pass
        ? 'null means "did not look"; 0 means "looked and found none"'
        : `FAILS THE HONEST ANSWER: ${res.detail}`,
    });
  }

  // ── A SYNONYM IN THE SUMMARY MUST STILL PASS ────────────────────────────
  //
  // Verbatim from a real run that was failed for it: the conflict was found,
  // both positions cited, the question put to a human — and the one-line
  // summary said "measurement point" where four other runs said "rack".
  //
  // Not paired with a failure case, because what it asserts is the ABSENCE of a
  // false accusation. The failure direction is the two cases below it.
  {
    const synonym = edit((a) => {
      a.conflicts = [{
        about: 'location where the 8000 N is specified (measurement point)',
        positions: [
          { says: 'measured at the rack', citation: REAL },
          { says: 'reported at the motor', citation: { ...REAL, quote: 'The rack force figure is stated at the rack in §4.1 and at the motor in §5.2.' } },
        ],
      }];
    });
    const res = CHECKS.resolve('conflict_about:rack')({ answer: synonym, toolCalls: TRACE_OK } as any);
    r[res.pass ? 'ok' : 'fail'].push({
      label: 'conflict_about — the right conflict under a different word still passes',
      detail: res.pass
        ? 'the subject is the whole record — summary, positions and quotes — not the headline'
        : `FAILS A CORRECT ANSWER on vocabulary: ${res.detail}`,
    });
  }

  // ── A MULTI-LINE QUOTE MUST RESOLVE ─────────────────────────────────────
  //
  // Not paired with a failure case like the others, because the thing being
  // asserted is the ABSENCE of a false accusation. The failure direction is
  // already covered by the paraphrase case below.
  {
    const withTable = edit((a) => { a.citations = [TABLE]; });
    const res = CHECKS.resolve('citation_lines_land')({ answer: withTable, toolCalls: TRACE_OK } as any);
    r[res.pass ? 'ok' : 'fail'].push({
      label: 'citation_lines_land — a six-row table quoted whole still resolves',
      detail: res.pass
        ? 'the search window is sized from the quote, not fixed at six lines'
        : `ACCUSES A CORRECT CITATION: ${res.detail}`,
    });
  }

  for (const c of CASES) {
    const check = CHECKS.resolve(c.spec);
    const good = check({ answer: GOOD, toolCalls: c.trace ?? TRACE_OK } as any);
    const bad = check({ answer: c.bad, toolCalls: c.badTrace ?? c.trace ?? TRACE_OK } as any);

    const correct = good.pass && !bad.pass;
    r[correct ? 'ok' : 'fail'].push({
      label: `${c.spec} — ${c.why}`,
      detail: correct
        ? `passes a good answer, fails the bad one: ${bad.detail.slice(0, 80)}`
        : `good=${good.pass} (${good.detail.slice(0, 50)}), bad=${bad.pass} (${bad.detail.slice(0, 50)})`,
    });
  }

  // Every check named by a case must actually exist. A typo in a case file is
  // otherwise a check that silently never runs.
  const named = ['calls_search_first', 'finding:change_needed', 'not_finding:have_it',
    'cites_something', 'citations_resolve', 'citation_lines_land', 'conflict_about:rack',
    'escalates', 'refuses_price', 'no_commitment', 'priced_or_refused', 'no_invented_values'];
  const unknown = named.filter((n) => {
    try { CHECKS.resolve(n); return false; } catch { return true; }
  });
  r[unknown.length ? 'fail' : 'ok'].push({
    label: 'every check named in the case file resolves',
    detail: unknown.length ? `unknown: ${unknown.join(', ')}` : `${named.length} check names, all known`,
  });

  process.exit(report('checks:check', r));
}

main();
