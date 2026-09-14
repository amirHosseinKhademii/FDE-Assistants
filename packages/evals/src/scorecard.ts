/**
 * The shapes a baseline is written in, and the one function that turns a set of
 * per-case reports into a scorecard.
 *
 * This file exists so that `run.ts` (which produces a baseline) and `diff.ts`
 * (which compares two of them) classify failures with the SAME code. Severity
 * bucketing used to live inline in the runner's print block, which was fine
 * while nothing else read a baseline. The moment a second reader exists, two
 * copies of the rules drift — and a drifted bucket makes the history lie in the
 * most expensive way possible: a "false answers: 0 → 2" line that reflects a
 * change in the classifier rather than a change in the model.
 *
 * Nothing here calls a model or touches the network. It is pure arithmetic over
 * JSON that already exists on disk, which is why `pnpm eval:diff` and
 * `pnpm eval:history` are free and instant while `pnpm eval` is neither.
 */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface CaseOutcome<A = unknown> {
  id: string;
  /** 1-based index of this sample within the case's N repeats. */
  run: number;
  passed: boolean;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  /**
   * Which tools ran, in order. The COUNT alone cannot answer "did it reach the
   * guidance corpus, or did search_policy return guidance chunks through a null
   * filter" — and those are different behaviours with the same number. Recorded
   * because the information exists at runtime and was being discarded.
   */
  toolNames?: string[];
  turns: number;
  stoppedBecause: string;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  answer?: A;
  error?: string;
  /**
   * A `replay` run asked for a fixture that was never recorded.
   *
   * Narrow since 2026-09-05: only `get_policyholder` is fixtured, and its
   * argument is a policy id, so this now fires only when a case names a
   * policyholder that was never recorded. The divergent-tool-path scenario
   * below applied to search, which no longer goes through this layer at all.
   *
   * This matters because flakiness and missing fixtures are the same event seen
   * twice: a divergent run takes a tool path that did not exist at record time,
   * the fixture layer hands the model an error string, and the model then fails
   * for a reason that has nothing to do with its judgment. Scored as a model
   * failure it would be exactly the misfiling PROGRESS.md §5.5 already cost us
   * once, so it gets its own category.
   */
  missingFixture: boolean;

  /**
   * A tool call came back `ok: false` — the tool itself broke.
   *
   * SAME CATEGORY OF MISTAKE, THIRD TIME. A max_turns timeout was once filed as
   * a "false answer", which sent someone rewriting a prompt when the fix was a
   * config value. `missingFixture` was carved out for the replay version of it.
   * This is the live version: a tool throws — a bad path, an expired
   * credential, an upstream 500 — the model is handed an error string, and it
   * correctly refuses to answer. That refusal is the RIGHT behaviour, and
   * scoring it as a dangerous false answer points every debugging hour at the
   * prompt.
   *
   * It really happened: a corpus directory was moved mid-run, `get_policyholder`
   * returned ENOENT for 25 of 40 runs, the model said so plainly, and the
   * scorecard reported "false answers (dangerous): 25 of 40".
   */
  toolFailed?: boolean;
}

/** Per-case aggregate across the N repeats. This is the unit that means something. */
export interface CaseReport<A = unknown> {
  id: string;
  runs: Array<CaseOutcome<A>>;
  passed: number;
  total: number;
  /** Which checks failed, and in how many of the N runs. A check that fails 5/5
   *  is a bug; one that fails 1/5 is flakiness. Different fixes. */
  flakyChecks: Array<{ name: string; failed: number }>;
}

/** A baseline file on disk. `engine` is absent in the two 2026-09-05 files,
 *  written before there was more than one loop to name. */
export interface Baseline<A = unknown> {
  at: string;
  fixtures: string;
  model: string;
  engine?: string;
  repeat: number;
  reports: Array<CaseReport<A>>;
}

export interface Summary<A = unknown> {
  cases: number;
  runs: number;
  passedRuns: number;
  green: number;
  flaky: Array<CaseReport<A>>;
  falseAnswers: Array<CaseOutcome<A>>;
  overCaution: Array<CaseOutcome<A>>;
  noAnswer: Array<CaseOutcome<A>>;
  missingFixture: Array<CaseOutcome<A>>;
  uncategorised: Array<CaseOutcome<A>>;
  inputTokens: number;
  outputTokens: number;
  p95: number;
}

/**
 * Failure types are reported SEPARATELY and never averaged, because they are
 * not the same severity (FDE.md §4.4) and each needs a different response:
 *
 *   false answer    — asserted something unverified as if checked, or cited a
 *                     source that does not exist. The dangerous one. Destroys
 *                     trust and is what a customer remembers.
 *   over-caution    — escalated something it could have handled. Annoying,
 *                     visible immediately, cheap to fix.
 *   no answer       — hit the turn cap, blew the schema, or threw. NOT a model
 *                     judgment failure at all — it is an infrastructure or
 *                     budget failure, and the fix is a config change, not a
 *                     prompt change.
 *   missing fixture — a `replay` run took a tool path that was never recorded.
 *                     Also infrastructure, and specifically NOT evidence about
 *                     the model: re-record and re-run before reading anything
 *                     into it.
 *
 * The third category was added after the first run misfiled a max_turns
 * timeout as a "false answer". That is a misdiagnosis with a real cost: it
 * sends you rewriting a prompt when the actual fix was raising maxTurns. The
 * fourth exists so replay mode cannot reproduce that mistake one level down.
 *
 * These are counted in RUNS, not cases. With repeats a single case can land in
 * two categories across its N samples — reporting it per-case would force a
 * choice between them and lose the fact that it does both.
 */
export type Severity =
  | 'pass'
  | 'false_answer'
  | 'over_caution'
  | 'no_answer'
  | 'missing_fixture'
  | 'uncategorised';

/**
 * The bucket a single run falls in. Every consumer — the printed card, the
 * diff, the Langfuse dashboard — classifies through this one function.
 *
 * It is written as a single ordered decision rather than as four independent
 * filters so that "exactly one bucket per failed run" is true by construction
 * instead of by an assertion that the counts happen to sum. `uncategorised` is
 * the deliberate fall-through, and it is loud everywhere it appears.
 */
/**
 * Checks whose failure means the assistant STATED SOMETHING FALSE about a real
 * customer. Every one of these is a wrong answer an adjuster could act on.
 *
 * Widened 2026-09-10, and the reason is worth keeping. The baseline that day
 * had cov-001 answer "$40 per day, up to 30 days" for a customer whose
 * endorsement pays $50 for 21 — a confidently wrong dollar figure, correctly
 * formatted, cited to the wrong form. It failed `cites_form`, `answer_contains`
 * (x2), and none of those were in this list, so the worst run in the set landed
 * in `uncategorised` while the printed card reported "false answers: 1".
 *
 * That is exactly the failure `uncategorised` exists to make loud, and it
 * worked. But a bucket that has to be read in a footnote is not a bucket. The
 * rule now: if a check asserts something about WHAT THE ANSWER SAYS or WHERE IT
 * CAME FROM, failing it is dangerous.
 *
 *   escalates          did not hand over a question the corpus cannot settle
 *   citations_resolve  cited a document that does not exist
 *   cites_form         cited the wrong policy form — right clause, wrong policy
 *   cites_record       cited the wrong customer record
 *   answer_contains    the correct figure is missing from the answer
 *   answer_lacks       a forbidden figure is present in the answer
 *   policy_form_is     reported the customer as being on the wrong form
 *   has_answer         claimed an answer and gave none
 *   cites_something    asserted something with no source at all
 *   calls_record_first searched before looking up whose policy it is — the
 *                      answer may be right, but it was not grounded in the
 *                      record that decides which documents govern
 *   calls_tool         never consulted a corpus the question required
 *   flags_conflict     did not report a contradiction that is really there —
 *                      i.e. quietly picked a side, which is the worst of them
 *
 * That is every check in checks.ts except `does_not_escalate`, which is the
 * only one whose failure is merely annoying. `uncategorised` therefore now
 * means one thing only: somebody added a check and did not classify it.
 */
/**
 * Classify one failed run. **Supplied by the application, not defaulted.**
 *
 * WHICH FAILURES ARE DANGEROUS IS A DOMAIN JUDGMENT and no harness can guess
 * it. In an insurance claims corpus a citation that resolves to nothing is
 * dangerous and an unnecessary escalation is merely annoying; in a triage tool
 * the two invert. Shipping a default here would quietly impose one domain's
 * ethics on every other.
 *
 * What IS generic, and is enforced below: exactly one bucket per failed run,
 * and `uncategorised` catching anything a classifier forgot — so a new check
 * added without a severity is LOUD rather than silently counted as harmless.
 */
export type SeverityClassifier<A = unknown> = (o: CaseOutcome<A>) => Severity;


export function summarise<A>(
  reports: Array<CaseReport<A>>,
  severityOf: SeverityClassifier<A>,
): Summary<A> {
  const outcomes = reports.flatMap((r) => r.runs);
  const inBucket = (b: Severity) => outcomes.filter((o) => severityOf(o) === b);

  const missingFixture = inBucket('missing_fixture');
  const noAnswer = inBucket('no_answer');
  const falseAnswers = inBucket('false_answer');
  const overCaution = inBucket('over_caution');

  // Every failed run must land in exactly one category. It is easy to write a
  // set of buckets that silently drops runs — the first version's `falseAnswers`
  // regex matched only escalates/citations_resolve/answer_lacks, so a run
  // failing `answer_contains` fell through all four and vanished from the
  // accounting entirely. The run it swallowed was the most informative one in
  // the 2026-09-05 baseline.
  //
  // The fix is NOT a wider regex — guessing which severity an unmatched check
  // implies is how the misfiling in §5.5 happened. It is an explicit leak
  // counter, printed whenever the buckets do not sum, so an uncategorised
  // failure is loud rather than invisible.
  const uncategorised = inBucket('uncategorised');

  const latencies = outcomes.map((o) => o.ms).sort((a, b) => a - b);

  return {
    cases: reports.length,
    runs: outcomes.length,
    passedRuns: outcomes.filter((o) => o.passed).length,
    green: reports.filter((r) => r.passed === r.total).length,
    flaky: reports.filter((r) => r.passed > 0 && r.passed < r.total),
    falseAnswers,
    overCaution,
    noAnswer,
    missingFixture,
    uncategorised,
    inputTokens: outcomes.reduce((a, o) => a + o.inputTokens, 0),
    outputTokens: outcomes.reduce((a, o) => a + o.outputTokens, 0),
    p95: latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] ?? 0,
  };
}

export function printScorecard<A>(
  reports: Array<CaseReport<A>>,
  s: Summary<A>,
  repeat: number,
): void {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  PASS RATE BY CASE (${repeat} run${repeat > 1 ? 's' : ''} each)`);
  for (const r of reports) {
    const rate = r.passed / r.total;
    const mark = rate === 1 ? '✓' : rate === 0 ? '✗' : '~';
    const detail = r.flakyChecks.length
      ? `   ${r.flakyChecks.map((f) => `${f.name} ${f.failed}/${r.total}`).join(', ')}`
      : '';
    console.log(`    ${mark} ${r.id}  ${r.passed}/${r.total}${detail}`);
  }

  const ids = (o: CaseOutcome[]) => [...new Set(o.map((x) => x.id))].join(' ');
  console.log(`\n  runs passed               : ${s.passedRuns}/${s.runs}`);
  console.log(`  cases green (N/N)         : ${s.green}/${s.cases}`);
  console.log(`  cases flaky (some, not all): ${s.flaky.length}  ${s.flaky.map((r) => `${r.id}:${r.passed}/${r.total}`).join(' ')}`);
  console.log(`  false answers (dangerous) : ${s.falseAnswers.length} of ${s.runs} runs  ${ids(s.falseAnswers)}`);
  console.log(`  over-caution (annoying)   : ${s.overCaution.length} of ${s.runs} runs  ${ids(s.overCaution)}`);
  console.log(`  no answer (infra/budget)  : ${s.noAnswer.length} of ${s.runs} runs  ${s.noAnswer.map((o) => `${o.id}#${o.run}:${o.stoppedBecause}`).join(' ')}`);
  console.log(`  missing fixture (infra)   : ${s.missingFixture.length} of ${s.runs} runs  ${ids(s.missingFixture)}`);
  if (s.uncategorised.length) {
    console.log(
      `  UNCATEGORISED             : ${s.uncategorised.length} of ${s.runs} runs  ` +
        s.uncategorised.map((o) => `${o.id}#${o.run}`).join(' '),
    );
    console.log('      these failed but matched no severity bucket — the checks they failed');
    console.log('      are not in any category rule. Classify them before reading the card.');
    for (const o of s.uncategorised) {
      const failed = o.checks.filter((r) => !r.pass).map((r) => r.name).join(', ');
      console.log(`      ${o.id}#${o.run}: ${failed}`);
    }
  }
  console.log(`  tokens                    : ${s.inputTokens} in / ${s.outputTokens} out`);
  console.log(`  p95 latency               : ${(s.p95 / 1000).toFixed(1)}s  (over ${s.runs} runs)`);
}

/** Where baselines are written. The APP owns this path, not the package. */
export let RESULTS_DIR = '';
export function setResultsDir(dir: string): void {
  RESULTS_DIR = dir;
}

/** Every baseline on disk, oldest first, ordered by the `at` INSIDE the file
 *  rather than by filename or mtime. Filenames are derived from `at` today, but
 *  a file copied or checked out fresh has a useless mtime and the ordering is
 *  what the whole history view rests on. */
export async function listBaselines<A = unknown>(): Promise<
  Array<{ path: string; baseline: Baseline<A> }>
> {
  const files = (await readdir(RESULTS_DIR)).filter(
    (f) => f.startsWith('baseline-') && f.endsWith('.json'),
  );
  const loaded = await Promise.all(
    files.map(async (f) => {
      const path = resolve(RESULTS_DIR, f);
      return { path, baseline: JSON.parse(await readFile(path, 'utf8')) as Baseline<A> };
    }),
  );
  return loaded.sort((a, b) => a.baseline.at.localeCompare(b.baseline.at));
}

/**
 * Resolve a baseline from a path, a filename, or any unambiguous fragment of
 * one — `12-42` is enough to name `baseline-2026-09-06T12-42-58-417Z.json`.
 *
 * The fragment form exists because the filenames are ISO timestamps with the
 * colons replaced, which nobody types correctly twice. An ambiguous fragment
 * fails loudly with the candidates rather than picking the newest match: this
 * tool's entire job is comparing two specific runs, and quietly diffing a
 * different pair than the one asked for is the worst thing it could do.
 */
export async function loadBaseline<A = unknown>(
  nameOrPath: string,
): Promise<{ path: string; baseline: Baseline<A> }> {
  if (nameOrPath.includes('/') || nameOrPath.endsWith('.json')) {
    const path = nameOrPath.includes('/')
      ? resolve(nameOrPath)
      : resolve(RESULTS_DIR, nameOrPath);
    return { path, baseline: JSON.parse(await readFile(path, 'utf8')) as Baseline<A> };
  }

  const all = await listBaselines<A>();
  const hits = all.filter((b) => b.path.includes(nameOrPath));
  if (hits.length === 1) return hits[0];
  if (!hits.length) {
    throw new Error(
      `no baseline matching "${nameOrPath}". available:\n  ` +
        all.map((b) => b.path.split('/').pop()).join('\n  '),
    );
  }
  throw new Error(
    `"${nameOrPath}" matches ${hits.length} baselines — be more specific:\n  ` +
      hits.map((b) => b.path.split('/').pop()).join('\n  '),
  );
}
