/**
 * Engagement lesson 4 — every rule lives inside the tool.
 *
 * A READING OF `docs/steering/THE-TOOLS.md` AND `HOW-WE-SORTED-IT.md`
 * §"What it costs to be honest".
 *
 * IT FOLLOWS THE ANSWER-KEY LESSON BECAUSE THE RULES CAME FROM THERE. Read in
 * the other order these look like sensible engineering defaults; read in this
 * one they are what a person found out by pricing a bid on paper and getting it
 * wrong.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { EITHER_OR, Matrix } from '../../components/learn/charts/Matrix';

export function Tools() {
  return (
    <LessonPage slug="tools">
      <Step n={1} title="A tool is a normal function plus a description">
        <P>
          The model never sees a database, never writes a query, and never gets a connection. It picks a{' '}
          <Term def="A normal function the model may ask to have run, described in prose it can read. It fills in arguments; your code decides whether and how to answer.">
            tool
          </Term>{' '}
          and fills in arguments. Everything else is ordinary code.
        </P>

        <Key>
          A model given database access will answer every question, including the ones the data cannot
          support. Two functions with rules inside them will not — and that difference is the product.
        </Key>
      </Step>

      <Step n={2} title="Four rules, inside the function, because a rule a model can talk itself out of is not a rule">
        <div className="my-6 space-y-3">
          {[
            {
              n: '1',
              rule: 'Below three comparables it refuses — and the refusal carries no number anywhere.',
              why: 'Median, mean, total and spread all come back EMPTY, not zero. Zero is a price. If there is a number on the page, somebody will read past the sentence and use it.',
            },
            {
              n: '2',
              rule: 'Median, never mean.',
              why: 'Measured on the gearbox comparable set (THE-TOOLS.md): the mean is 54% higher than the median, because one job absorbed a production-line relocation. The previous lesson measures the same effect at 37% on the hand-worked requirement — a different set, not a different answer.',
            },
            {
              n: '3',
              rule: 'n always comes back.',
              why: '€81,455 from six past jobs and €81,455 from one are different claims, and an answer that prints them identically is hiding the only thing that distinguishes them.',
            },
            {
              n: '4',
              rule: 'A wrong argument is a MISS, not a refusal.',
              why: 'It returns "not found" plus the nine change classes the documents actually use — read from the corpus, not hardcoded. A typo and a genuine gap both match zero rows, and reporting one as the other sends somebody hunting for history that was never missing.',
            },
          ].map((r) => (
            <div key={r.n} className="grid grid-cols-[2rem_1fr] gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
              <span className="font-mono text-lg" style={{ color: 'var(--lesson)' }}>
                {r.n}
              </span>
              <span>
                <span className="block max-w-[62ch] leading-relaxed text-ui-fg">{r.rule}</span>
                <span className="mt-1.5 block max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{r.why}</span>
              </span>
            </div>
          ))}
        </div>

        <Key>
          All four could have been written into the prompt instead. A prompt is a request; a function is a
          property. The lesson on guessing is what a request is worth when the model has nothing to read.
        </Key>
      </Step>

        <HowItWorks
          title="What a refusal returns instead of a number"
          path="apps/ai/steering/src/tools/functions/find-comparable-work.ts:83–101"
          plain={[
            'When there are fewer than three comparable jobs, every numeric field comes back null. Not zero — null. Zero is a price, and somebody will read past the sentence and use it.',
            'But a bare refusal is not useful either, so it carries something a number could not: a count per field of what each filter is costing the match.',
            'That is what lets a caller see whether the FILTER is wrong or the ESTATE is empty — which are different problems with different fixes, and look identical from outside.',
            'It is also what made the drop-one measurement in the last lesson of this track possible. The diagnostic did not need new instrumentation; the tool had been printing the evidence inside its own refusals all along.',
          ]}
          lines={[
            '/**',
            ' * What each field is costing the match, when refusing. Counts, never prices.',
            ' *',
            ' * Present only on a refusal. Lets a caller see whether the FILTER or the',
            ' * estate is the problem.',
            ' */',
            'perField?: Record<string, number>;',
            '',
            '/** False when `n < MIN_COMPARABLES`. When false there is no price. */',
            'enough: boolean;',
            'refusal: string | null;',
            'medianHours: number | null;',
          ]}
          mark={[6, 11]}
          says={[
            { at: 'Counts, never prices', is: 'A refusal may carry evidence. It may not carry a figure that reads like an answer.' },
            { at: 'medianHours: number | null', is: 'Null on a refusal, and so are mean, total and spread. Every numeric field, not just the headline.' },
          ]}
          trap="The whole of the forensics lesson in the operations track rests on `perField` existing. Nobody added it for that — it was there because a refusal with no evidence is one somebody argues with rather than acts on."
        />

      <Step n={3} title="The other tool, and two failures that are exact opposites">
        <P>
          <code className="font-mono text-ui-fg">search_documents</code> is the hybrid search from the first
          track, and this corpus is where both of its arms earn their place — because the two cases that break
          it break it in opposite directions.
        </P>

        <Figure
          title="Two questions, two arms, and neither arm passes both"
          sub="Both are in the acceptance test for exactly this reason."
          source="docs/steering/THE-TOOLS.md. Reprint with pnpm steering:search-tool-check — one embedding call."
        >
          <Matrix
            marks={EITHER_OR}
            rowHeader="the question"
            columns={['dense arm — meaning', 'sparse arm — keywords']}
            rows={[
              {
                name: '“how much rack force must the assembly deliver?”',
                sub: 'shares almost no words with the requirement that answers it',
                cells: [
                  { state: 'live', detail: 'finds it — the meaning is close even though the words are not' },
                  { state: 'refuses', detail: 'finds nothing: no shared terms to match on' },
                ],
              },
              {
                name: 'SR-EPS-0421',
                sub: 'a bare identifier, one character from SR-EPS-0407',
                cells: [
                  { state: 'refuses', detail: 'cannot separate it from SR-EPS-0407 — they mean the same thing' },
                  { state: 'live', detail: 'finds it first: lexically it is unmistakable' },
                ],
              },
            ]}
            footnote="Neither of these is a fault. An embedding cannot separate two near-identical identifiers and a keyword index cannot match words that are not there — both are properties of the method, which is the entire reason there are two of them. The identifier case is also the one the first track's lesson on retrieval uses to show that rank fusion can bury a document only one arm found."
          />
        </Figure>

        <Key>
          There is no relevance threshold. The best available passages always come back, even when every one of
          them is poor — because a cutoff tuned to hide rubbish on one question hides the answer on the next,
          and it fails silently in both directions.
        </Key>
      </Step>

      <Step n={4} title="What it costs to be honest">
        <P>
          The pricing was run twice: once against tidy invented data, and once against only what the customer's
          real files support. The difference is the whole argument for building on their documents rather than
          on a demo set.
        </P>

        <Figure
          title="Three questions, asked of made-up data and of the real files"
          sub="A refusal is drawn as a refusal and not as zero — which is rule 1 from §2, made visual."
          source={
            <>
              docs/steering/HOW-WE-SORTED-IT.md §“What it costs to be honest”. Reproduce with{' '}
              <span className="text-ui-dim">pnpm steering:walk-cost -- --from-documents</span> — free.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'gearbox change',
                value: 79640,
                before: 80034,
                display: '€79,640',
                beforeDisplay: '€80,034',
                note: 'survives — half a percent out',
              },
              {
                label: 'damping safety case',
                value: null,
                before: 202853,
                display: 'refused — no basis',
                beforeDisplay: '€202,853',
                note: 'the safety level is not recorded in any closure report',
              },
              {
                label: 'brand-new safety function',
                value: null,
                before: null,
                display: 'refused',
                beforeDisplay: 'refused',
                note: 'refused by both — correctly, and by the same rule',
              },
            ]}
            max={210000}
            legend={['made-up data', 'from the real files']}
            labelWidth={230}
          />
        </Figure>

        <P>
          Then the part that makes it a lesson. They checked whether the €202,853 refusal could be avoided:
          drop the safety-level filter, price all safety-case work, and add a footnote saying the level is
          unknown. That gives <strong className="font-medium text-ui-fg">451 hours instead of 1,571</strong> —
          wrong by three and a half times, presented as an answer.
        </P>

        <Key>
          A footnote does not rescue a number that is a quarter of the truth. The refusal stays, and there is
          now a test that goes red if anybody “improves” it later.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:comparables-check', does: 'The pricing tool against its own rules — the refusal threshold, the median, the count. Database only, no model.', cost: 'free' },
          { cmd: 'pnpm steering:search-tool-check', does: 'The two-arm cases above, including the identifier neither embedding can separate.', cost: 'index' },
          { cmd: 'pnpm steering:walk-cost -- --from-documents', does: 'The three questions priced from only what the customer’s files support.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'Three comparables is a judgement, not a derived threshold.',
            body: 'It was chosen because two is an anecdote, not because anything measured says three is where reliability begins. It is in one place and is changeable; what it is not is optional.',
          },
          {
            claim: 'Rules inside the tool cannot stop a bad question.',
            body: 'They stop the tool answering without a basis. Nothing here prevents the model asking for the wrong change class in the first place — and the last lesson in this track is largely about how often it did.',
          },
          {
            claim: '“Neither arm passes both” is two cases.',
            body: 'They were chosen to be the two extremes. They demonstrate that one arm is insufficient; they do not measure how often either case occurs in real questions.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'tool', def: 'A normal function the model may ask to have run. It fills in arguments; your code decides whether to answer.' },
          { word: 'comparable', def: 'A past job close enough to inform the one being priced. Which filters decide that is the open problem in the last lesson.' },
          { word: 'refusal', def: 'A tool declining to answer because the basis is not there. Carries no number at all — not even zero, because zero is a price.' },
          { word: 'miss', def: 'A tool finding nothing because the argument named something that does not exist. Reported differently from a refusal on purpose.' },
        ]}
      />
    </LessonPage>
  );
}
