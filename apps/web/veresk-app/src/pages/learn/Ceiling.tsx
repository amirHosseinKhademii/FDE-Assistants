/**
 * Engagement lesson 7 — what the customer's own paperwork cannot tell you.
 *
 * A READING OF `docs/steering/HOW-WE-SORTED-IT.md`, `NEXT.md` §0 AND
 * `CONCEPTS.md`.
 *
 * IT CLOSES THE TRACK ON AN OPEN PROBLEM, WHICH IS THE POINT. 23 of 24
 * requirements price to nothing and the engagement is not finished. A closing
 * page that summarised achievements would be the one page on this site that
 * behaves like a brochure — and the finding underneath the open problem is
 * better than a success anyway: most of what is missing is missing from the
 * CUSTOMER'S FILES, and that is a deliverable rather than a defect.
 *
 * THE DATE IS SAID LOUDLY HERE. `CONCEPTS.md` carries a status table that said
 * three pillars were "not started" for a day after they were built. A page
 * about what is and is not possible today is exactly the kind of artefact that
 * goes stale silently.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';

export function Ceiling() {
  return (
    <LessonPage slug="ceiling">
      <Step n={1} title="Only a third of completed work has a closure report">
        <P>
          The closure report carries the charge code, and the charge code is the only link between a week of
          somebody's time and a piece of engineering. Where there is no report, there is no link.
        </P>

        <Figure
          title="640 jobs, 220 closure reports, and the hours that fall out"
          sub="A hard ceiling on anything built from these files — and it is better to know it now than in front of the customer."
          source={
            <>
              docs/steering/HOW-WE-SORTED-IT.md and SORTING.md §K1. Reprint with{' '}
              <span className="text-ui-dim">pnpm steering:inventory</span> — free.
            </>
          }
        >
          <Funnel
            stages={[
              { n: 640, label: 'completed jobs', why: 'what the timesheets account for' },
              {
                n: 220,
                label: 'have a closure report — and can be attributed',
                op: '34%',
                why: 'the closure report carries the charge code, and the charge code is the only link between booked time and a piece of engineering',
              },
              {
                n: 420,
                label: 'cannot be attributed to any engineering work',
                op: '640 − 220',
                why: 'the 293,019 booked hours behind them belong to work no document names',
              },
            ]}
            note="Where a closure report exists and the quarter was exported, the parse reconciles exactly: 195 efforts, residual 0.0 hours. The gap is not a parsing error — it is paperwork that was never filed. (420 is 640 − 220; the hour figure is counted separately and is not this bar's unit.)"
          />
        </Figure>

        <Key>
          293,019 booked hours belong to work no document names. No amount of engineering on our side recovers
          them, because the information was never written down.
        </Key>
      </Step>

      <Step n={2} title="Three questions their files cannot answer, and one that was fixed with a line">
        <div className="my-6 space-y-3">
          {[
            {
              t: 'The safety level is never written next to the cost.',
              b: 'Not once, in 220 reports, in usable form. So “what does an ASIL D safety case cost?” — a €200,000 question — cannot be answered from their documents at all.',
            },
            {
              t: 'Reuse is not recorded anywhere.',
              b: 'The first lesson in this track arrived at this from the other direction: a model asked for it scored 36% against a 33% chance rate, because there was nothing to read.',
            },
            {
              t: 'A quoted line cannot be traced to the requirement it priced.',
              b: 'That link is in neither the files nor their four databases. It is the join everybody assumed existed.',
            },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
              <p className="max-w-[62ch] font-medium text-ui-fg">{x.t}</p>
              <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{x.b}</p>
            </div>
          ))}
        </div>

        <Key>
          One of those was fixed with one line added to a report template, and a question worth roughly
          €190,000 went from unanswerable to answered. That is the deliverable — not the software.
        </Key>
      </Step>

      <Step n={3} title="And the live open problem: 23 of 24 requirements price to nothing">
        <P>
          The whole bid was assessed: 24 requirements, about 55 seconds each,{' '}
          <strong className="font-medium text-ui-fg">$0.26 in total</strong>, 66% of input served from the
          provider's cache. One came back with a price. Twenty-three did not.
        </P>

        <Figure
          title="Why each of the 23 produced no price"
          sub="Classified by re-reading the stored traces. No model is involved, and it costs nothing."
          source={
            <>
              docs/steering/NEXT.md §0, 2026-09-14.{' '}
              <span className="text-ui-dim">pnpm steering:why-unpriced</span> — free, re-reads traces already
              on disk.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'the estate', value: 13, display: '13', note: 'asked properly, understood, and too few comparable jobs exist' },
              { label: 'the prompt — ours', value: 7, display: '7', note: 'never called the pricing tool at all' },
              { label: 'unknowable', value: 4, display: '4', note: 'called it, and the trace did not keep the arguments' },
              { label: 'vocabulary mismatch', value: 0, display: '0', note: 'asked with a value no document uses — none' },
            ]}
            max={13}
            labelWidth={190}
            axis="0 → 13 of the 23 unpriced requirements"
          />
        </Figure>

        <P>
          The obvious reading of the first bar is that the agent is over-constraining — asking for too narrow
          a set of past jobs. That was the team's hypothesis for a day. One measurement settled it: for each
          refusal, would dropping exactly one filter have found enough jobs?
        </P>

        <Figure
          title="Drop-one: would removing a single filter have crossed the floor of three?"
          sub="For twelve of the thirteen, no single filter was the difference."
          source="docs/steering/NEXT.md §0, measured 2026-09-14 over the stored traces. Free."
        >
          <BarRows
            rows={[
              { label: 'drop change_class', value: 1, display: '1 of 13', note: 'would have crossed the floor' },
              { label: 'drop element_kind', value: 1, display: '1 of 12', note: 'would have crossed' },
              { label: 'drop safety_case_impact', value: 0, display: '0 of 13', note: 'none' },
              { label: 'drop asil', value: 0, display: '0 of 10', note: 'none' },
              { label: 'drop tooling_required', value: 0, display: '0 of 12', note: 'none' },
            ]}
            max={13}
            labelWidth={220}
            axis="0 → 13 refusals"
          />
        </Figure>

        <Key>
          Twelve of thirteen were not one field away from anything. The agent is not over-constraining —
          Vantis has booked exactly two validation-only mechanical jobs, ever. The history is genuinely not
          there.
        </Key>

        <P>
          Which changes what to build.{' '}
          <strong className="font-medium text-ui-fg">The fix is the sentence, not the filter.</strong>{' '}
          <em className="not-italic text-ui-fg">“We have never done this kind of work”</em> is a finding a bid
          meeting can act on. <em className="not-italic text-ui-fg">“Your filter matched 0”</em> reads like a
          tooling failure and gets ignored.
        </P>

        <Data
          path="docs/steering/NEXT.md §0 — the reading that was wrong, and why"
          note="a true fact that is not the cause"
          lines={[
            'The first reading blamed `asil`, and the reasoning was sound:',
            '  40% of usable history has no ASIL recorded.',
            '',
            'That number is TRUE. It is also not the cause — dropping `asil`',
            'alone would have rescued 0 of 10.',
            '',
            '"This field is often missing" does not imply "this field is why the',
            'query returned nothing". Only the drop-one counts can tell them apart.',
          ]}
          mark={[6, 7]}
        />
      </Step>

      <Step n={4} title="The four that are unknowable, and the defect underneath them">
        <P>
          Four of the 23 cannot be classified at all, and the reason is a real defect worth knowing about
          because it is a shape rather than an incident.
        </P>
        <P>
          <code className="font-mono text-ui-fg">assess_history.trace</code> holds{' '}
          <strong className="font-medium text-ui-fg">two incompatible structures</strong>. The CLI files
          turn records, with tool arguments and results; the web desk files loop events — name, timing and a
          summary, with no arguments. Nothing documented it and nothing asserted it.
        </P>

        <Key>
          The first version of the diagnostic read only the turn shape, found no tool calls in any desk row,
          and was about to report the one requirement in the bid that carries a price as having invented it.
          It had called the pricing tool three times.
        </Key>

        <P>
          A column holding two structures with no discriminator is a trap for everything that reads it later —
          and the thing that nearly went wrong here is the same shape as a check that accuses: the most
          expensive place for a false negative is a tool whose output is an accusation.
        </P>
      </Step>

        <HowItWorks
          title="How the drop-one measurement was possible at all"
          path="apps/ai/steering/src/cli/why-unpriced.ts:246–269"
          shape="assembled"
          plain={[
            'For each refusal, the question is: which ONE field, dropped, would have taken this key over the floor of three?',
            'The diagnostic does not guess. It asks the estate — counting how many past jobs match if each filter in turn is removed — using the same function the pricing tool already calls to build its own refusal.',
            'That shared function is why this was an afternoon rather than a project. Nothing new had to be instrumented: the evidence was already being computed inside every refusal and thrown away.',
            'And when every count still falls under the floor it says so in words rather than printing zeros, because "dropping any one field still leaves it under the floor" is a finding and a row of zeros is a table.',
          ]}
          lines={[
            '/**',
            ' * Which ONE field, dropped, would have taken this key over the floor?',
            ' *',
            ' * `countWithoutEachField` is what the tool itself prints inside its refusal,',
            ' * so this asks the estate the same question the tool already asked.',
            ' */',
            'const counts = await countWithoutEachField(h, key);',
            '',
            '// …when no single field clears the floor:',
            "//   'dropping any ONE field still leaves it under the floor — not a near miss'",
          ]}
          mark={[6, 9]}
          says={[
            { at: 'countWithoutEachField', is: 'Shared with the tool. Two implementations of "what would this filter have cost" would eventually disagree, and the disagreement would be invisible.' },
            { at: 'not a near miss', is: 'A sentence, not a zero. Twelve of thirteen printed this, and that is what reversed the team\u2019s hypothesis.' },
          ]}
          trap="`walk-check` asserts that dropping `asil` on a safety-case question produces a specific result — so the diagnostic that reads these counts is itself covered by the hand-worked answer key. A forensics tool nobody checks is a forensics tool that quietly starts lying."
        />

      <Step n={5} title="Check a status table's date before trusting it">
        <P>
          Steering is <Term def="The eight things this practice claims to do on every engagement: grounding, the tool-calling loop, the answer contract, evals, cost, credentials, escalation, deployment.">complete on all eight pillars</Term>{' '}
          and is the most complete of the three engagements. That table was refreshed on 2026-09-14 — and the
          version before it said three pillars were “not started”. All three had been built the previous day,
          and the table simply was not updated.
        </P>

        <Key>
          A page that says “here is where we are” is exactly the kind of artefact that goes stale silently.
          That is why every lesson on this site names the document it is a reading of and says the document
          wins — and why this one says its date most loudly of all.
        </Key>

        <P>
          Worth reading in the same breath: what was deliberately{' '}
          <em className="not-italic text-ui-fg">not</em> built, and why. Result caching, because there are no
          repeat questions — there are no users, and building it now is building for a load that does not
          exist. A shared context-engineering package, because one fan-out is not a pattern. Teaching what was
          declined, with the reason, is rarer and more useful than teaching what was built.
        </P>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:why-unpriced', does: 'Classifies every unpriced requirement by re-reading traces already on disk. No model, no cost.', cost: 'free' },
          { cmd: 'pnpm steering:assess-all', does: 'The work list for the whole bid. Spends nothing without --run.', cost: 'free' },
          { cmd: 'pnpm steering:derived-reconcile --sabotage', does: 'The reconciliation with a planted error, to prove it can fail.', cost: 'free' },
          { cmd: 'pnpm steering:assess-all --run', does: 'Assesses all 24 requirements for real. About $0.26.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'Every number on this page is dated 2026-09-14 or earlier.',
            body: 'The open problem is open. The classification of the 23 is one run of one diagnostic on one day, and the four unknowable ones will move the moment the trace defect is fixed.',
          },
          {
            claim: 'Four of the 23 are unclassified, not classified as fine.',
            body: 'They are counted in their own bar rather than distributed across the other three, because assigning them would be inventing a distribution to make a chart add up.',
          },
          {
            claim: '“Complete on eight pillars” is a claim about coverage, not quality.',
            body: 'Every pillar has something behind it. It says nothing about how good any of them is, and this page is mostly a list of things that are not good enough yet.',
          },
          {
            claim: 'The estate finding is about this customer.',
            body: '“A third of jobs have a closure report” is a fact about Vantis’s paperwork. The transferable part is the method — reconcile first, and find the ceiling before you promise anything under it.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'attributable hours', def: 'Booked time that can be linked to a piece of engineering, via a charge code carried on a closure report. 293,019 hours here cannot be.' },
          { word: 'drop-one', def: 'Asking, for each refusal, whether removing exactly one filter would have found enough comparable jobs. What distinguishes over-constraining from a genuinely empty history.' },
          { word: 'reconciliation', def: 'Checking that what the documents say and what the answer key says are the same number. 195 efforts, residual 0.0 hours.' },
          { word: 'pillar', def: 'One of the eight things this practice claims to do on every engagement. A status table of them is the artefact most likely to be stale.' },
        ]}
      />
    </LessonPage>
  );
}
