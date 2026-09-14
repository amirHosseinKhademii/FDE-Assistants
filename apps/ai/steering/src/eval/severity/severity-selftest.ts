/**
 * `pnpm steering:severity-check` — is every bucket reachable, and does each
 * failure land in the right one?
 *
 * Offline, free. The point is narrow and worth stating: a classifier that can
 * only ever return two of its five values is a taxonomy nobody has tested, and
 * the whole reason for having buckets is that a pass rate treats an invented
 * price and a turn-cap timeout as the same event.
 */
import { severityOf, type Outcome } from './assessment-severity';
import { report, type Result } from '../../db/init/assertions';

const base = (over: Partial<Outcome>): Outcome => ({
  id: 'asr-001', run: 1, passed: false, ms: 1,
  inputTokens: 0, outputTokens: 0, toolCalls: 1, turns: 1,
  stoppedBecause: 'model_finished', checks: [], missingFixture: false,
  answer: {} as any,
  ...over,
});

const failing = (name: string) => [{ name, pass: false, detail: 'x' }];

interface Case { name: string; outcome: Outcome; expect: string; why: string }

const CASES: Case[] = [
  { name: 'a passing run', expect: 'pass', outcome: base({ passed: true }),
    why: 'the control — if this is not `pass`, nothing below means anything' },

  { name: 'reported work as already done', expect: 'false_answer',
    outcome: base({ checks: failing('not_finding:have_it') }),
    why: 'the expensive wrong answer: a bid line somebody quotes' },

  { name: 'cited a line the sentence is not on', expect: 'false_answer',
    outcome: base({ checks: failing('citation_lines_land') }),
    why: 'looks exactly like real provenance, which is what makes it dangerous' },

  { name: 'committed the company to a price', expect: 'false_answer',
    outcome: base({ checks: failing('no_commitment') }),
    why: 'a quotation is a contract and a named person signs it' },

  { name: 'neither priced nor refused', expect: 'over_caution',
    outcome: base({ checks: failing('priced_or_refused') }),
    why: 'annoying and cheap to fix — and NOT safe, because a tool that says nothing is dropped' },

  { name: 'hit the turn cap', expect: 'no_answer',
    outcome: base({ answer: undefined, stoppedBecause: 'max_turns' }),
    why: 'infrastructure. Scoring it against judgement points every debugging hour at the prompt' },

  { name: 'a tool threw', expect: 'no_answer', outcome: base({ toolFailed: true } as any),
    why: 'plumbing, not a judgement' },

  { name: 'a replay wanted a fixture nobody recorded', expect: 'missing_fixture',
    outcome: base({ missingFixture: true }),
    why: 'a gap in the recording, not in the answer' },

  { name: 'a failure no rule names', expect: 'uncategorised',
    outcome: base({ checks: failing('some_future_check') }),
    why: 'a new check must not land silently in a bucket it was never assigned to' },
];

function main(): void {
  const r: Result = { ok: [], fail: [] };

  for (const c of CASES) {
    const got = severityOf(c.outcome);
    r[got === c.expect ? 'ok' : 'fail'].push({
      label: `${c.expect} — ${c.name}`,
      detail: got === c.expect ? c.why : `classified as ${got}, expected ${c.expect}`,
    });
  }

  // Every bucket must be reachable by SOME case above. A value that no test can
  // produce is a value the classifier will never return in practice either.
  const reached = new Set(CASES.map((c) => severityOf(c.outcome)));
  const all = ['pass', 'false_answer', 'over_caution', 'no_answer', 'missing_fixture', 'uncategorised'];
  const unreachable = all.filter((s) => !reached.has(s as any));
  r[unreachable.length ? 'fail' : 'ok'].push({
    label: 'every severity is reachable',
    detail: unreachable.length ? `never produced: ${unreachable.join(', ')}` : all.join(', '),
  });

  process.exit(report('severity:check', r));
}

main();
