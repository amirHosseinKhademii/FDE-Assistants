/**
 * Lesson 5 — proving it works, and what a green run is not.
 *
 * A READING OF `docs/evals/README.md` AND `docs/GUIDE.md` §6.
 *
 * ONE DELIBERATE DEPARTURE, AND IT IS FLAGGED ON THE FIGURE. That README
 * publishes the 2026-09-05 baseline — 7 cases, 30/35, `cov-003` at 0/5 — and
 * `CLAUDE.md` says not to re-derive it anywhere because it drifts with every
 * run. It has drifted: there are eighteen baselines in `docs/evals/results/`
 * and the newest is a different suite (8 cases) with a different failure. So
 * this page draws the NEWEST FILE ON DISK, computed from its raw runs, names
 * the file, and says that the README's published scorecard is an earlier run.
 *
 * Drawing the published number instead would have been quoting a figure this
 * page could not reproduce from anything it can see — which is the exact
 * failure mode §"counted, never quoted" in `docs/pharma/DESIGN.md` exists to
 * prevent.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { RunGrid } from '../../components/learn/charts/RunGrid';

export function Evals() {
  return (
    <LessonPage slug="evals">
      <Step n={1} title="A suite run once is a sample, not a measurement">
        <P>
          Every case runs five times and the card reports a pass rate. A six-case suite with two roughly
          20%-flaky cases reports anywhere from 4/6 to 6/6 with nothing having changed — so a single green run
          is the easiest number in this repo to quote by accident, and{' '}
          <code className="font-mono text-ui-fg">--repeat 1</code> prints a warning saying so.
        </P>

        <Figure
          title="Eight cases, five runs each — the newest baseline on disk"
          sub="One cell per run. A pass is grey; a failure is coloured — because the absence of bad news does not get the opposite colour."
          source={
            <>
              Computed from{' '}
              <span className="text-ui-dim">docs/evals/results/baseline-2026-09-11T15-55-29-682Z.json</span> —
              gpt-5-mini, repeat 5, fixtures off.{' '}
              <strong className="text-ui-dim">
                This is the newest file on disk, not the published scorecard:
              </strong>{' '}
              docs/evals/README.md quotes the 2026-09-05 run (7 cases, 30/35, a different failing case).{' '}
              <span className="text-ui-dim">pnpm eval:history</span> lists all eighteen, free, from disk.
            </>
          }
        >
          <RunGrid
            runs={5}
            cases={[
              { id: 'cov-001', passes: 5 },
              { id: 'cov-002', passes: 4, note: 'the rideshare question — see §3' },
              { id: 'cov-003', passes: 5 },
              { id: 'cov-004', passes: 5 },
              { id: 'cov-005', passes: 5 },
              { id: 'cov-006', passes: 5 },
              { id: 'cov-007', passes: 5 },
              { id: 'cov-008', passes: 5 },
            ]}
          />
        </Figure>

        <HowItWorks
          title="How the suite survives one case blowing up"
          path="packages/evals/src/suite.ts:84–100"
          plain={[
            'Every case runs `repeat` times, in order, serially. Serially on purpose \u2014 the model resource is shared and parallel runs would race the same rate limit, which measures the rate limit rather than the change.',
            'The part worth reading is the try. A throw is an OUTCOME, not a crash: a network blip on case three must not delete the results of cases one and two, which have already been paid for.',
            'And the throw is filed as `stoppedBecause: \u2018threw\u2019`, which lands it in the infrastructure bucket. Filing it as a model failure would send somebody rewriting a prompt to fix a bad credential.',
          ]}
          lines={[
            'for (const c of opts.cases) {',
            '  for (let run = 1; run <= opts.repeat; run++) {',
            '    opts.onStart?.(c, run, opts.repeat);',
            '',
            '    let outcome: CaseOutcome<A>;',
            '    try {',
            '      outcome = await opts.runCase(c, run);',
            '    } catch (e) {',
            "      outcome = { /* … stoppedBecause: 'threw' */ };",
            '    }',
            '  }',
            '}',
          ]}
          mark={[1, 8]}
          says={[
            { at: 'run <= opts.repeat', is: 'Five, by default. The whole reason this is a loop and not a call.' },
            { at: "stoppedBecause: 'threw'", is: 'Infrastructure, not judgement. The severity buckets in the next section are what this feeds.' },
          ]}
          trap="Aborting on the first throw loses every result already paid for — about twenty minutes of real money on a full run. It is also the shape that makes a suite feel flaky when it is the network that is flaky."
        />

        <Key>
          Green means every case passed every run. A case at 4/5 is not green — a threshold below 1.0 would
          quietly re-admit the flakiness this whole pillar exists to surface.
        </Key>
      </Step>

      <Step n={2} title="Failures are bucketed by severity, and never averaged">
        <P>
          Four failures of four different kinds need four different responses, and a single pass rate hides
          which one you have. These are counted in <em className="not-italic text-ui-fg">runs</em>, not cases,
          because with repeats one case can land in two buckets across its five samples.
        </P>

        <div className="my-8 space-y-3">
          {[
            {
              name: 'false answer',
              tone: 'var(--color-ui-danger)',
              what: 'Asserted something unverified as if checked, or cited a source that does not exist.',
              then: 'The dangerous one. Destroys trust, and is what a customer remembers.',
            },
            {
              name: 'over-caution',
              tone: 'var(--color-ui-warn)',
              what: 'Escalated something it could have handled.',
              then: 'Annoying, visible immediately, cheap to fix.',
            },
            {
              name: 'no answer',
              tone: 'var(--color-ui-info)',
              what: 'Hit the turn cap, blew the schema, or threw.',
              then: 'Not a model judgement failure at all — infrastructure or budget. The fix is a config change, not a prompt change.',
            },
            {
              name: 'missing fixture',
              tone: 'var(--color-ui-info)',
              what: 'A replay run took a tool path that was never recorded.',
              then: 'Also infrastructure, and specifically NOT evidence about the model. Re-record before reading anything into it.',
            },
          ].map((b) => (
            /* THE SEVERITY PALETTE APPEARS HERE ON PURPOSE, and this is the one
               place in the learning section where it does — because here it is
               the SUBJECT. Everywhere else these pages keep to the lesson hue
               and grey, so a reader never meets amber on a teaching page and has
               to work out whether it means anything. */
            <div key={b.name} className="rounded-lg border-l-2 border border-ui-line bg-ui-surface px-4 py-3" style={{ borderLeftColor: b.tone }}>
              <p className="font-mono text-[0.875rem]" style={{ color: b.tone }}>
                {b.name}
              </p>
              <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{b.what}</p>
              <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-faint">{b.then}</p>
            </div>
          ))}
        </div>

        <P>
          The third bucket was added after the first run misfiled a turn-cap timeout as a{' '}
          <em className="not-italic text-ui-fg">false answer</em>. That is a misdiagnosis with a real cost: it
          sends you rewriting a prompt when the actual fix was raising a number. The fourth exists so replay
          mode cannot reproduce that mistake one level down.
        </P>

        <P>
          A check added without a severity is{' '}
          <strong className="font-medium text-ui-fg">loud rather than silently counted as harmless</strong> —{' '}
          <code className="font-mono text-ui-fg">pnpm severity:check</code> fails the build for it. The fix is
          never a wider regex, because guessing which bucket an unmatched check belongs in is how the
          classifier starts lying.
        </P>
      </Step>

      <Step n={3} title="One real failure, in full">
        <P>
          <code className="font-mono text-ui-fg">cov-002</code> asks whether a driver is covered while driving
          for a rideshare platform with passengers. No document in the corpus addresses carrying passengers
          for a fee — one exclusion is about goods, another about renting the car to others — so reasoning by
          analogy from either is the dangerous failure. The correct answer is an escalation.
        </P>

        <Data
          path="docs/evals/results/baseline-2026-09-11T15-55-29-682Z.json — cov-002, run 1"
          note="the one failing run of forty"
          lines={[
            'calls_record_first   pass   called get_policyholder first',
            'escalates            pass   escalated to underwriting referral desk',
            '                            and claims desk supervisor',
            'citations_resolve    FAIL   unresolvable citation(s):',
            '                            record:DET-2024-004473-ROR',
          ]}
          mark={[3, 4]}
        />

        <P>
          It did the hard part. It refused to answer from an adjacent clause and escalated to a named owner —
          then cited a determination record that does not exist. That is a{' '}
          <strong className="font-medium text-ui-fg">false answer</strong> in the severity table above, from a
          run that got the judgement right, and it is the reason{' '}
          <code className="font-mono text-ui-fg">citations_resolve</code> is a check at all: it is offline,
          free, needs no database, and catches an invented source that reads perfectly.
        </P>

        <Key>
          The cheapest high-value check in the system is asking whether the thing it cited exists. It cannot
          tell you the cited passage was the right one — but it catches the failure that is impossible to
          spot by reading the answer.
        </Key>
      </Step>

      <Step n={4} title="A red check is a hypothesis, not a verdict">
        <P>
          When pillars 1 and 2 moved onto frameworks, one configuration looked like a clear regression: two
          fewer passes, 44% worse p95, and{' '}
          <strong className="font-medium text-ui-fg">two flaky cases where there had been none</strong>. On
          that row alone the correct-sounding conclusion was “the framework is worse, do not adopt”.
        </P>

        <Figure
          title="All four combinations, because only the other three could settle it"
          sub="7 cases × 5 runs each. The second row is the one that looked like a regression."
          source="docs/evals/README.md, “baseline — 2026-09-06, the framework migration”. Running the other three cells cost twenty minutes."
        >
          <BarRows
            rows={[
              { label: 'hand-rolled loop + hand-rolled retrieval', value: 30, display: '30/35', note: '6/7 cases · 0 flaky' },
              { label: 'Agents SDK + hand-rolled retrieval', value: 28, display: '28/35', note: '4/7 cases · 2 flaky ← looked like a regression' },
              { label: 'hand-rolled loop + LangChain retrieval', value: 30, display: '30/35', note: '6/7 cases · 0 flaky' },
              { label: 'Agents SDK + LangChain retrieval', value: 30, display: '30/35', note: '6/7 cases · 0 flaky' },
              { label: '+ Zod schemas', value: 30, display: '30/35', note: '6/7 cases · 0 flaky' },
            ]}
            max={35}
            labelWidth={300}
            axis="0 → 35 runs"
          />
        </Figure>

        <P>
          Rows 1 and 3 agree exactly, so the retrieval swap is provably neutral — which means row 2 cannot be
          blamed on retrieval either. The two cases that were flaky there are 5/5 in row 4. The latency agrees
          too: 67.2 s against 46.6 / 50.4 / 49.5 is the shape of two slow outliers in a 35-run sample, not a
          systematically slower loop.
        </P>

        <Figure
          title="The latency, drawn separately — never on the same axis as the pass count"
          sub="p95, seconds. Two measures on different scales sharing one chart is the most common way a chart lies; two charts cost nothing."
          source="docs/evals/README.md, same table. Repeats are serial on purpose — the Foundry resource is shared, and parallel runs would race the same rate limit."
        >
          <BarRows
            rows={[
              { label: 'hand-rolled + hand-rolled', value: 46.6, display: '46.6' },
              { label: 'Agents SDK + hand-rolled', value: 67.2, display: '67.2', note: 'the suspect row' },
              { label: 'hand-rolled + LangChain', value: 50.4, display: '50.4' },
              { label: 'Agents SDK + LangChain', value: 49.5, display: '49.5' },
              { label: '+ Zod schemas', value: 41.2, display: '41.2', note: 'the current configuration' },
            ]}
            unit="s"
            labelWidth={250}
            axis="p95, 0 → 67.2 s"
          />
        </Figure>

        <Key>
          Verdict: sampling noise. A suite run once is a sample — and a suite run once against{' '}
          <em className="not-italic text-ui-fg">one configuration</em> is also a sample. Twenty minutes of
          extra runs turned “the framework made it worse” into “the framework is neutral”.
        </Key>
      </Step>

      <Step n={5} title="What the harness refuses to do">
        <P>
          <code className="font-mono text-ui-fg">eval:diff</code>{' '}
          <strong className="font-medium text-ui-fg">refuses outright</strong> — exit 2 — to compare two runs
          made with a different model, fixture mode, or repeat count. That difference measures the setup, not
          the change, and a warning printed above a tidy table gets scrolled past while the number underneath
          gets quoted.
        </P>
        <P>
          A one-run difference between two baselines prints as{' '}
          <code className="font-mono text-ui-fg">MOVED</code>, never as a regression, and never fails CI. A
          report that paints every wobble red gets muted within a week.
        </P>

        <HowItWorks
          title="How the diff decides a move is noise"
          path="packages/evals/src/diff.ts:41–54"
          plain={[
            'A pass count that moves by one between two baselines is a coin flip, not a result. The diff calls that MOVED and never a regression, and never fails anything on it.',
            'The band is DERIVED from the repeat count rather than fixed at one, and that is the whole content of this function.',
            'At five repeats the two are identical, so the first version \u2014 a hard-coded 1 \u2014 looked correct. At twenty repeats a fixed 1 would call a two-run move a REGRESSION while it is comfortably inside binomial noise.',
            'Which means raising `--repeat` would make the tool more trigger-happy. That is backwards: more sampling should make it calmer, not louder.',
          ]}
          lines={[
            '/**',
            ' * A move of this many runs or fewer is inside the sampling band and is',
            ' * never called a regression or an improvement. One run in five is a coin',
            ' * flip; the repo has the scar to prove it (PROGRESS.md §10.7).',
            ' */',
            'function noiseBand(repeat: number): number {',
            '  return Math.max(1, Math.round(repeat * 0.2));',
            '}',
          ]}
          mark={[6]}
          says={[
            { at: 'repeat * 0.2', is: 'One in five. The band widens with the sample instead of staying still while the sample grows.' },
            { at: 'Math.max(1, …)', is: 'A floor of one run, so a small repeat count cannot produce a band of zero and report every wobble.' },
          ]}
          trap="The scar is real: a middle run read as a regression at 28/35 with two flaky cases, and a day went into investigating it. It was sampling noise. A tool that paints every wobble red gets muted within a week, and then it catches nothing at all."
        />

        <Code
          path="packages/evals/src/scorecard.ts:200–206"
          note="why an unmatched check is loud rather than harmless"
          lines={[
            '// The fix is NOT a wider regex — guessing which severity an unmatched',
            '// check belongs to is how a classifier starts lying. A check added',
            '// without a severity is LOUD rather than silently counted as harmless.',
          ]}
          mark={[2]}
        />

        <P>
          The runner and the dashboard share{' '}
          <em className="not-italic text-ui-fg">one</em>{' '}
          <Term def="The function that sorts a failing run into a severity bucket. One copy, shared by the runner and the dashboard, because two copies drift.">
            classifier
          </Term>
          . Two copies of the severity rules drift, and a drifted classifier makes the history lie in the
          worst available way — a “false answers 0 → 2” line that reflects a change in the classifier rather
          than in the model. The extraction is shown faithful rather than asserted:{' '}
          <code className="font-mono text-ui-fg">eval:history</code> recomputes every historical baseline from
          its raw runs and reproduces the numbers already written by hand.
        </P>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm eval:history', does: 'Every baseline on disk, one row each. Recomputed from raw runs, not read from a summary.', cost: 'free' },
          { cmd: 'pnpm eval:diff', does: 'The newest two baselines, per case and per severity bucket. Refuses across a setup change.', cost: 'free' },
          { cmd: 'pnpm severity:check', does: 'Asserts every eval check maps to a severity bucket.', cost: 'free' },
          { cmd: 'pnpm eval', does: 'The whole suite, five runs per case, serial. About twenty minutes of paid time.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'Eight cases are not a benchmark.',
            body: 'They are a regression instrument. They can say something got worse, which is the job; they cannot say the system is good.',
          },
          {
            claim: 'A green check is not proof, and a red one is not a verdict.',
            body: 'This repo has three separate cases on record where the check was wrong, not the model — including a rejected correct denial that sat red for weeks. Investigate before assuming the model regressed.',
          },
          {
            claim: 'Retrieval is not held still between runs.',
            body: 'Fixtures cover the exact-id lookup only. Search always runs live, because the model rewrites the query every time — five runs of one case produced five different queries. So a moving score cannot be cleanly attributed to your change.',
          },
          {
            claim: 'The CI workflow has never been run.',
            body: 'It exists, on demand and nightly, and the repo has no remote and none of the Azure federation configured. A suite that has never run in CI is a suite that has never had to survive somebody else\'s machine.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'case', def: 'One question plus the checks its answer must pass. Cases live in docs/evals/cases.jsonl, outside any package, because they are the customer\'s, not the code\'s.' },
          { word: 'repeat', def: 'How many times each case runs. Five, serially. A suite run once is a sample.' },
          { word: 'flaky', def: 'A case that neither always passes nor always fails. Zero-flaky matters more than the raw score, because it is what makes a disagreement diagnosable.' },
          { word: 'baseline', def: 'A committed file holding every raw run of one suite execution, with the model, fixture mode and repeat count it was made under.' },
          { word: 'severity bucket', def: 'Which kind of failure a run was: false answer, over-caution, no answer, or missing fixture. Reported separately and never averaged.' },
          { word: 'p95', def: 'The latency 95% of runs came in under. Quoted instead of a mean because the mean hides the two slow runs somebody actually waited for.' },
        ]}
      />
    </LessonPage>
  );
}
