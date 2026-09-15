/**
 * Engagement lesson 3 — work the answer out by hand, before building anything.
 *
 * A READING OF `docs/steering/WALKTHROUGH.md` AND `PLAN.md` Phase A.
 *
 * IT COMES BEFORE THE TOOLS LESSON, WHICH IS THE REVERSE OF THE BUILD ORDER.
 * The three rules inside `find_comparable_work` were not designed — they fell
 * out of a person pricing the bid by hand and noticing what went wrong when
 * they did it the obvious way. Teaching the tool first would present them as
 * good engineering instincts. They are not: they are scar tissue, and the scars
 * are this page.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';

export function AnswerKey() {
  return (
    <LessonPage slug="answer-key">
      <Step n={1} title="You cannot tell whether a system is right if nobody knows the answer">
        <P>
          Before any tool existed, one requirement from the bid was priced by hand — by a person, with three
          commands that call no model — and written down. That is the{' '}
          <Term def="The answer worked out by hand, in advance, so that a system's output has something to be wrong against. Without one, a plausible answer and a correct answer are indistinguishable.">
            answer key
          </Term>
          .
        </P>
        <P>
          This sounds like an obvious step and it is the one most often skipped, because it produces nothing
          demonstrable. What it produces is the ability to say that something is wrong.
        </P>
      </Step>

      <Step n={2} title="Doing it the obvious way is wrong, and here is by how much">
        <P>
          The obvious way to price a change is to average the hours of comparable past jobs. On this set the
          average is wrong, and not subtly — one of the comparable jobs absorbed a production-line relocation
          that has nothing to do with the work being priced.
        </P>

        <Figure
          title="The same set of past jobs, averaged and taken at the median"
          sub="One outlier. The mean carries it into the quote; the median does not."
          source={
            <>
              docs/steering/WALKTHROUGH.md — the hand-worked requirement.{' '}
              <span className="text-ui-dim">pnpm steering:walk-cost</span> — free, database only, no model.
              <br />
              <strong className="text-ui-dim">Which set this is matters.</strong> The next lesson quotes 54%
              for the same effect; that is THE-TOOLS.md's gearbox comparable set, which is not this one. Two
              sets, one cause — an absorbed production-line relocation — and two magnitudes. Neither is a
              correction of the other.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'hours, per comparable job',
                value: 710,
                before: 969,
                display: '710 — median',
                beforeDisplay: '969 — mean',
                note: 'a 37% difference, from one job that absorbed a production-line move',
              },
            ]}
            max={1000}
            legend={['mean', 'median']}
            labelWidth={230}
          />
        </Figure>

        <P>
          Carried through to a price, that is{' '}
          <strong className="font-medium text-ui-fg">€109,272 against the correct figure</strong> — a quote
          you would lose money on, produced by the most natural summary statistic there is.
        </P>

        <Key>
          Median, never mean. Not as a statistical preference — because one past job in this customer's
          history absorbed a cost the next job will not, and a mean is the one summary that guarantees it
          gets passed on.
        </Key>
      </Step>

      <Step n={3} title="Three rules came out of doing it by hand">
        <P>
          None of these were designed up front. Each one is a thing that went wrong on paper, before any code
          existed to get it wrong at scale.
        </P>

        <div className="my-6 space-y-3">
          {[
            {
              n: '1',
              rule: 'Price from the median of a filtered set, never the mean.',
              why: 'Because §2. One relocation in the history is one relocation in every future quote.',
            },
            {
              n: '2',
              rule: 'Always say how many past jobs it rests on.',
              why: '€81,455 from six jobs and €81,455 from one are different claims and must not print the same.',
            },
            {
              n: '3',
              rule: 'Refuse below three comparables rather than produce a figure.',
              why: 'Two jobs is an anecdote. And the refusal carries no number anywhere — not even zero, because zero is a price.',
            },
          ].map((r) => (
            <div key={r.n} className="grid grid-cols-[2rem_1fr] gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
              <span className="font-mono text-lg" style={{ color: 'var(--lesson)' }}>
                {r.n}
              </span>
              <span>
                <span className="block max-w-[62ch] leading-relaxed text-ui-fg">{r.rule}</span>
                <span className="mt-1.5 block max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">
                  {r.why}
                </span>
              </span>
            </div>
          ))}
        </div>

        <Key>
          The product is not a price. It is the pack the meeting needs. A tool that hands over one confident
          number replaces the judgement; a tool that hands over the evidence removes the two weeks of
          searching and leaves the judgement where it belongs.
        </Key>
      </Step>

        <HowItWorks
          title="Where the threshold actually lives"
          shape="assembled"
          path="apps/ai/steering/src/answer/derive.ts:264"
          plain={[
            'Three comparables is one constant, in one file, exported.',
            'The hand-worked walk imports it. The pricing tool the model calls imports it. Neither has its own copy.',
            'That is not tidiness. Two implementations of "three comparables" is how a refusal rule quietly becomes two different refusal rules — and the failure is silent, because both halves keep working and simply stop agreeing.',
            'The same file exports median and mean, for the same reason: the sabotage test that swaps one for the other has to be swapping the thing the tool actually uses.',
          ]}
          lines={[
            'export const MIN_COMPARABLES = 3;',
            '',
            '// imported by BOTH:',
            '//   apps/ai/steering/src/answer/walk-check.ts    — the hand-worked key',
            '//   apps/ai/steering/src/tools/functions/…       — the tool the model calls',
          ]}
          mark={[0]}
          says={[
            { at: 'MIN_COMPARABLES = 3', is: 'The floor. Below this the tool refuses and returns no number at all — not even zero.' },
            { at: 'imported by BOTH', is: 'The key and the tool cannot drift apart, because there is nothing to drift.' },
          ]}
          trap="Three is a judgement, not a derived threshold — two is an anecdote, and nothing measured says three is where reliability begins. What makes it safe is that it is in one place and changing it moves both the tool and the test that checks the tool."
        />

      <Step n={4} title="A suite of only-positive assertions cannot tell you it is passing for the wrong reason">
        <P>
          <code className="font-mono text-ui-fg">pnpm steering:walk-check</code> asserts the hand-worked
          answer, 11 checks, and four of them are{' '}
          <Term def="A deliberately broken version of the system, with an assertion that the answer must change. Without one, a passing check is indistinguishable from a check that cannot fail.">
            sabotage cases
          </Term>{' '}
          — the system is deliberately broken and the answer is required to move.
        </P>

        <Data
          path="pnpm steering:walk-check — the four sabotage cases"
          note="11/11, free, no model"
          lines={[
            'sabotage                                    must change the answer',
            '─────────────────────────────────────────── ──────────────────────────────',
            'remove the "can it be ordered" condition     flips back to the obsolete part',
            'price from the mean instead of the median    €109,272 — a 37% overquote',
            'lower the refusal threshold to 1             a price appears where there',
            '                                             is no basis for one',
            'keep the outlier, use the median             the answer must NOT move — 1%,',
            '                                             against the mean’s 37%',
          ]}
          mark={[6, 7]}
        />

        <Key>
          The last row is a sabotage test that asserts <em className="not-italic">nothing changes</em>. It is
          what proves the median is doing the work rather than the filtering — and it is the only one of the
          four that could distinguish those two explanations.
        </Key>

        <P>
          And the checks assert <strong className="font-medium text-ui-fg">bands, not exact values</strong>. An
          exact assertion on €80,034 would go red the day somebody adds one past job — a change everybody wants
          to be able to make. A band goes red when the answer moves for a reason that matters.{' '}
          <strong className="font-medium text-ui-fg">Counts are exact</strong>, because a count moving means a
          filter moved.
        </P>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:walk-angle', does: 'The engineering half of the hand-worked walk — which past jobs are comparable, and why.', cost: 'free' },
          { cmd: 'pnpm steering:walk-cost', does: 'The pricing half. Median, count, spread, and the refusal where there is no basis.', cost: 'free' },
          { cmd: 'pnpm steering:walk-check', does: 'All 11 assertions including the four sabotage cases.', cost: 'free' },
          { cmd: 'pnpm steering:walk-cost -- --from-documents', does: 'The same price, computed only from what the customer’s files support. The next lesson is about the difference.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'One requirement, worked by hand, is not a benchmark.',
            body: 'It is an answer key for one question. It can say the tool is wrong about that question; it says nothing about the other 23.',
          },
          {
            claim: 'The key was worked out by the same people who built the tool.',
            body: 'That is the honest limitation of an answer key produced in-house — it can encode the same misunderstanding twice. A customer working it independently would be worth more, and has not happened.',
          },
          {
            claim: 'Bands hide small regressions on purpose.',
            body: 'A 1% move passes. That is the trade: the check survives adding a past job, and would not notice a change that shifted the answer by less than the band.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'answer key', def: 'The answer worked out by hand in advance, so a system’s output has something to be wrong against.' },
          { word: 'comparable', def: 'A past job close enough to the one being priced to inform it. Which filters decide that is the whole argument of the next lesson.' },
          { word: 'sabotage case', def: 'A deliberately broken version with an assertion that the answer must change — or, in the sharpest one, must not.' },
          { word: 'band', def: 'Asserting a range rather than an exact figure, so the check survives a change everybody wants and still catches one nobody does.' },
        ]}
      />
    </LessonPage>
  );
}
