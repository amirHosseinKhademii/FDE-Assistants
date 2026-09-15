/**
 * Operations lesson 1 — the model moves underneath you.
 *
 * A READING OF `docs/steering/OPERATIONS.md` §1.
 *
 * WHAT IS BUILT AND WHAT IS ARGUED IS MARKED THROUGHOUT, because most of this
 * section is built and a few of the best parts are not. `@fde/evals` already
 * does repeat runs, severity buckets, the noise band and the setup refusal;
 * steering has no diff command wired to them, and nothing reports negative
 * flips. Both of those are said where they fall, not collected in a footnote.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { RunGrid } from '../../components/learn/charts/RunGrid';

export function Regressions() {
  return (
    <LessonPage slug="regressions">
      <Step n={1} title="A single run is not a measurement">
        <P>
          An ordinary test is <code className="font-mono text-ui-fg">expect(f(x)).toBe(y)</code> — run it
          twice, get the same answer. A model does not work that way.{' '}
          <code className="font-mono text-ui-fg">gpt-5-mini</code> takes{' '}
          <strong className="font-medium text-ui-fg">no temperature parameter at all</strong>, and even where
          temperature 0 exists it reduces variation rather than removing it. Providers do not guarantee
          determinism at zero.
        </P>

        <Key>
          So the unit of measurement is not a run, it is a rate over N runs. Four consecutive runs of one
          requirement made 4, 6, 7 and 8 searches; two of them ended at the turn cap. Nothing changed between
          them.
        </Key>

        <Figure
          title="The steering suite, as it stands"
          sub="Three cases, five repeats each. Small — and the next section is about what it costs to make it bigger."
          source={
            <>
              baseline <span className="text-ui-dim">2026-09-13T22-23-39-484Z</span>, gpt-5-mini on the Agents
              SDK, <span className="text-ui-dim">fixtures: live</span>. Recorded in
              docs/steering/OPERATIONS.md §1.
            </>
          }
        >
          <RunGrid
            runs={5}
            cases={[
              { id: 'asr-001', passes: 5 },
              { id: 'asr-002', passes: 5 },
              { id: 'asr-003', passes: 5 },
            ]}
          />
        </Figure>

        <Figure
          title="Every baseline on disk, which nothing could read until today"
          sub="Four runs on one afternoon. The first one is what a suite looks like before the harness is right."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:eval-history</span> — free, reads the committed
              baselines. It did not exist until 2026-09-15; four baselines sat unreadable because steering had
              never been wired to <span className="text-ui-dim">@fde/evals</span>' history reader.
            </>
          }
        >
          <Data
            path="pnpm steering:eval-history"
            note="verbatim"
            lines={[
              'when              engine      fixt   ×      runs  green flaky false     p95',
              '─────────────────────────────────────────────────────────────────────────────',
              '2026-09-13 19:59  agents-sdk  live   5      9/15    0/3     3     0  394.4s',
              '2026-09-13 21:02  agents-sdk  live   5     14/15    2/3     1     1   67.7s',
              '2026-09-13 21:22  agents-sdk  live   5     14/15    2/3     1     1   61.1s',
              '2026-09-13 22:23  agents-sdk  live   5     15/15    3/3     0     0   61.9s',
            ]}
            mark={[2, 5]}
          />
        </Figure>

        <Key>
          Read the <code className="font-mono">false</code> column before the pass rate. A run that gains
          passing runs <em className="not-italic">and</em> gains a false answer got worse — the dangerous
          bucket outranks the total, and a table sorted on the total would report that backwards.
        </Key>

        <P>
          15/15, zero flaky — and the honest reading of that is not “it works”. It is that three cases over one
          loop is the smallest suite that can be called one, and{' '}
          <code className="font-mono text-ui-fg">fixtures: live</code> means it is not reproducible offline, so
          a number that moves cannot be attributed.
        </P>
      </Step>

      <Step n={2} title="A difference between two rates might be nothing at all">
        <P>
          If a case goes 5/5 → 4/5, that is one flipped coin. Calling it a regression sends somebody to spend a
          day investigating sampling variance — and this repo has the scar: a middle run read as a regression
          at 28/35 with two flaky cases, a day went into it, and it was noise.
        </P>
        <P>
          So a <Term def="How far a pass count may move between two baselines before the tool is willing to call it a change. Derived from the repeat count, not fixed, so more sampling makes the tool calmer rather than louder.">noise band</Term>{' '}
          is required — and it has to widen with the sample.
        </P>

        <Figure
          title="A real run that refuses to call itself an improvement"
          sub="14/15 → 15/15 between the two newest baselines. The tool declines to report it as a result."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:eval-diff</span>, run 2026-09-15 over the two
              newest committed baselines. Free — it reads files already on disk and calls nothing.
            </>
          }
        >
          <Data
            path="pnpm steering:eval-diff"
            note="verbatim"
            lines={[
              'case        before   after  Δ      note',
              'asr-001        4/5     5/5   +1   MOVED up 1 run — inside the noise band, not a result',
              'asr-002        5/5     5/5   ·   green, held',
              'asr-003        5/5     5/5   ·   green, held',
              '',
              'false answers (dangerous)      1 →   0 of 15  ▼  better',
              '',
              'VERDICT',
              'No case moved by more than the noise band. On this evidence the change',
              'is NEUTRAL — which for a refactor is the result you want, and for a fix',
              'means it did not work.',
            ]}
            mark={[1, 9, 10]}
          />
        </Figure>

        <Key>
          A pass rate that went up, reported as neutral. That is the band doing its job in the direction
          nobody builds for — it is easy to write a tool that refuses to cry regression, and harder to write
          one that also refuses to claim credit.
        </Key>

        <HowItWorks
          title="How the diff decides a move is noise"
          path="packages/evals/src/diff.ts:41–54"
          plain={[
            'A move of this many runs or fewer is inside the sampling band and is never called a regression or an improvement. It prints as MOVED.',
            'The band is DERIVED from the repeat count rather than fixed at one, and that is the whole content of this function.',
            'At five repeats the two are identical, so the first version — a hard-coded 1 — looked correct. At twenty repeats a fixed 1 would call a two-run move a REGRESSION while it is comfortably inside binomial noise.',
            'Which means raising --repeat would make the tool more trigger-happy. That is backwards: more sampling should make it calmer, not louder.',
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
            { at: 'repeat * 0.2', is: 'One run in five. The band widens with the sample instead of staying still while the sample grows.' },
            { at: 'Math.max(1, …)', is: 'A floor of one run, so a small repeat count cannot produce a band of zero and report every wobble.' },
          ]}
          trap="A tool that paints every wobble red gets muted within a week, and then it catches nothing at all. The failure mode of a noisy alarm is not false positives — it is that the alarm stops being read."
        />
      </Step>

      <Step n={3} title="A comparison is only valid if everything except the change was held still">
        <P>
          Compare a run on model A against a run on model B and you have measured the model swap, not your
          prompt edit. Compare five repeats against twenty and the bucket counts are not on the same scale.
        </P>

        <HowItWorks
          title="How the diff refuses, rather than warns"
          path="packages/evals/src/diff.ts:74–92"
          plain={[
            'Before comparing anything, it checks that the two baselines were produced the same way: same model, same fixture mode, same repeat count, same engine.',
            'If any of those differ it REFUSES — exit 2 — rather than printing a warning above the table.',
            'That is the whole design decision. A printed warning above a pretty table gets scrolled past, and the number underneath it gets quoted in a meeting a week later with the warning long gone.',
            'One subtlety worth copying: a MISSING engine name is not a mismatch. The two oldest baselines predate there being more than one loop to name, and refusing to read them would make the tool useless on exactly the history it exists to read.',
          ]}
          lines={[
            'function comparable<A>(a: Baseline<A>, b: Baseline<A>): string[] {',
            '  const problems: string[] = [];',
            '  const cmp = (field: string, x: unknown, y: unknown) => {',
            '    if (x !== y) problems.push(`${field}: ${String(x)} → ${String(y)}`);',
            '  };',
            '  cmp(\'model\', a.model, b.model);',
            '  cmp(\'fixtures\', a.fixtures, b.fixtures);',
            '  cmp(\'repeat\', a.repeat, b.repeat);',
            '  // engine is absent in the two 2026-09-05 baselines, written before there was',
            '  // more than one loop to name. Absent is not a mismatch; a DIFFERENT name is.',
            '  if (a.engine && b.engine) cmp(\'engine\', a.engine, b.engine);',
            '  return problems;',
            '}',
          ]}
          mark={[5, 6, 7, 10]}
          says={[
            { at: 'cmp(\'model\', …)', is: 'The three keys that decide whether two baselines are the same experiment.' },
            { at: 'if (a.engine && b.engine)', is: 'Absent is not a mismatch. A stricter rule would have refused to read the repo’s own oldest baselines.' },
          ]}
          trap="It used to be a warning. The reason it is a refusal is that nobody has ever scrolled up to read one."
        />

        <Key>
          Which raises the obvious problem: if the diff refuses across models, there is no supported way to
          answer “did upgrading the model break anything?” — the literal job this lesson is named after.
        </Key>
      </Step>

      <Step n={4} title="So how do you ever compare two models? — and this part is not built">
        <P>
          The refusal is right and must not be weakened. So a model swap gets its{' '}
          <em className="not-italic text-ui-fg">own</em> comparison, with its own name, that is honest about
          measuring the setup.
        </P>

        <Figure
          title="What a model-comparison command would print"
          kind="proposed"
          sub="Three things the ordinary diff deliberately does not do."
          source={
            <>
              docs/steering/OPERATIONS.md §1 step 4. <strong className="text-ui-dim">Not built.</strong> No
              such command exists; this is the shape argued for, not a result.
            </>
          }
        >
          <div className="space-y-3">
            {[
              {
                t: 'Discordant pairs only',
                b: 'Cases where A and B disagree. Cases both got right, or both got wrong, carry no evidence about which model is better — including them dilutes the comparison with agreement.',
              },
              {
                t: "McNemar's exact test over those pairs",
                b: 'With the honest sentence at small N: “3 discordant pairs — this cannot distinguish a regression from noise. Raise --repeat or add cases.”',
              },
              {
                t: 'Cost and latency deltas alongside',
                b: 'A model swap is always a three-way trade. Reporting only quality hides two thirds of it.',
              },
              {
                t: 'And never PASS or FAIL',
                b: 'A model swap is a judgement somebody makes with a number in hand, not a gate.',
              },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
                <p className="font-medium text-ui-fg">{x.t}</p>
                <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{x.b}</p>
              </div>
            ))}
          </div>
        </Figure>

        <P>
          The fourth idea the field has converged on and this repo does not have is the{' '}
          <Term def="An item that was correct before a change and wrong after it. Aggregate accuracy can rise while flips accumulate — and users only ever feel the flips.">negative flip</Term>
          . Aggregate accuracy can rise while flips accumulate, and users only ever feel the flips: the thing
          that worked yesterday and does not today. Aggregate-only reporting hides them by construction.
        </P>

        <Data
          path="docs/steering/OPERATIONS.md §1 step 3 — what a per-case line would add"
          note="proposed. The scorecard prints the rate; nothing names the runs that changed direction."
          lines={[
            'asr-002    4/5 → 4/5   ·  1 flip out of 5  (run 3 passed → failed: citations_resolve)',
            '',
            'A case at the same rate with flips inside it is a different system from',
            'one that is genuinely stable — and today they print identically.',
          ]}
          mark={[0]}
        />
      </Step>

      <Step n={5} title="Growing the suite is affordable and it is not free">
        <P>
          The suite is three cases. It should be ten — and the cases should come from the paths that{' '}
          <em className="not-italic text-ui-fg">failed</em>, which the 24-requirement bid run already handed
          over as a ready-made list. Most people write cases for the paths that work.
        </P>

        <Figure
          title="What the suite costs, per run and in total"
          sub="At $0.0186 a run, measured. The next lesson is why this number is the one that matters here."
          source={
            <>
              <span className="text-ui-dim">91 eval runs = $1.6897</span>, measured 2026-09-15 over
              logs/requests.jsonl. docs/steering/OPERATIONS.md §1 step 2 and §3.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'today — 3 cases × 5', value: 0.28, display: '$0.28', note: '15 runs' },
              { label: 'proposed — 10 cases × 5', value: 0.93, display: '$0.93', note: '50 runs · 3.3× the single largest line of steering’s spend' },
            ]}
            labelWidth={220}
            axis="0 → $0.93 per suite run"
          />
        </Figure>

        <Key>
          So grow it 3 → 6 → 10 rather than all at once, adding the “never called the pricing tool” case and
          the one priced case first, because those two cover the failure classes the next lesson works on.
        </Key>
      </Step>

      <SaidOutLoud
        then={
          <>
            “So how do you ever compare two models?” — a separate command, discordant pairs only, McNemar,
            cost and latency printed alongside, and no pass/fail verdict. It is step 4 above and it is not
            built.
          </>
        }
      >
        We ran each case <strong>five times, not once</strong>, because the system is not deterministic —
        gpt-5-mini takes no temperature parameter, and four consecutive runs of the same requirement made{' '}
        <strong>4, 6, 7 and 8</strong> searches. Then the diff tool refuses to compare two baselines made with
        a different model, fixture mode or repeat count, because that measures the setup change and not
        yours. And a single-run move inside a five-run sample prints as <strong>MOVED</strong>, never as a
        regression — we have a day in the log that went to investigating a coin flip, and a tool that renders
        every wobble in red teaches everyone to ignore it.
      </SaidOutLoud>

      <RunIt
        items={[
          { cmd: 'pnpm steering:eval-history', does: 'Every committed baseline, one row each. Recomputed from raw runs, not read from a summary.', cost: 'free' },
          { cmd: 'pnpm steering:eval-diff', does: 'The two newest baselines, per case and per severity bucket, with the noise band applied.', cost: 'free' },
          { cmd: 'pnpm steering:eval', does: 'The suite: 3 cases, 5 repeats, serial. About $0.28.', cost: 'money' },
          { cmd: 'pnpm steering:retrieval-scorer-check', does: 'The retrieval scorer, with its planted failures. Offline.', cost: 'free' },
          { cmd: 'pnpm severity:check', does: 'Asserts every check maps to a severity bucket — a check with none is loud, not harmless.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The first replay-backed baseline will start a new series, and the diff will exit 2.',
            body: 'Every baseline on disk ran fixtures: live. The moment fixtures land, the setup key changes and nothing before it compares to anything after it. That is the guard working exactly as designed, and it is worth expecting rather than debugging.',
          },
          {
            claim: 'fixtures: live means nothing is held still.',
            body: 'The suite calls the model and the retriever for real on every run. A moved number cannot be cleanly attributed to your change, which is the thing this whole lesson is for.',
          },
          {
            claim: 'Three cases cover one loop.',
            body: 'summarise-bid and explain-assessment both call the model and neither is in any suite.',
          },
          {
            claim: 'Nothing here runs in CI.',
            body: 'Every check is run by hand. The free ones belong on every push; the ones that spend money do not.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'noise band', def: 'How far a pass count may move before the tool calls it a change. max(1, repeat × 0.2), so more sampling makes it calmer rather than louder.' },
          { word: 'setup key', def: 'Model, engine, fixture mode and repeat count. Two baselines differing in any of them are measuring the setup, not your change.' },
          { word: 'negative flip', def: 'An item correct before a change and wrong after it. Aggregate accuracy can rise while flips accumulate.' },
          { word: 'discordant pair', def: 'A case where two versions disagree. The only cases that carry evidence about which is better.' },
          { word: "McNemar's test", def: 'The statistical test for binary pass/fail on the same items. Looks only at discordant pairs; under the null they should split evenly.' },
        ]}
      />
    </LessonPage>
  );
}
