/**
 * Engagement lesson 2 — a corpus is three different problems.
 *
 * A READING OF `docs/steering/HOW-WE-SORTED-IT.md` (the plain version) AND
 * `SORTING.md` (the engineering one).
 *
 * THE ORDERING IS BY RISK AND THAT IS THE LESSON. These are not three steps of
 * one process — they are three different problems that happen to share a
 * folder, and exactly one of them can be quietly wrong. That one goes last and
 * carries more safeguards than the other two put together.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { Caveat, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Stages } from '../../components/learn/charts/Stages';

export function Pipelines() {
  return (
    <LessonPage slug="pipelines">
      <Step n={1} title="Three problems, ordered by which one can lie to you">
        <P>
          1,069 files arrived from the customer: timesheets, rate cards, quotes, design notes, review minutes,
          closure reports, source code. The instinct is one pipeline that ingests all of it. That is wrong,
          because the three kinds of file fail in three different ways.
        </P>

        <Figure
          title="Three pipelines, in the order their risk demands"
          sub="Not three steps. Three problems, and only the last one can produce a confident wrong answer that nothing downstream notices."
          source="docs/steering/HOW-WE-SORTED-IT.md and SORTING.md. Throughput from the 2026-09-14 handover in docs/steering/NEXT.md."
        >
          <Stages
            stages={[
              {
                verb: 'parse',
                out: '131 CSV/JSON files → ~11,500 rows',
                does: 'Files that already have columns — timesheets, rate cards, quoted lines. Plain code. No model is involved at any point.',
                rule: 'It fails LOUDLY. A column that is not there throws; it cannot be quietly wrong. Free, and it takes four seconds.',
              },
              {
                verb: 'index',
                out: '922 documents → 3,854 passages',
                does: 'Prose and source code — design rationale, review notes, C files. Cut into findable pieces, each remembering its file and line.',
                rule: 'Its failure mode is a MISS: retrieval can fail to find the passage. That is visible as an unanswered question, not as a wrong answer. About one cent.',
              },
              {
                verb: 'extract',
                out: '220 closure reports → 1,320 facts',
                does: 'Facts buried inside sentences, which only reading comprehension can get at. A model reads them.',
                rule: 'THE ONLY ONE THAT CAN BE QUIETLY WRONG — so it is last, and it carries the evidence check, the answer-rate signal and a hand-worked key. About a cent.',
              },
            ]}
          />
        </Figure>

        <Key>
          The ordering is the design. If a file can be handled by the pipeline above it, it is — because
          moving a file up a rung swaps a failure you can see for one you cannot.
        </Key>

        <Figure
          title="What each pipeline actually processed"
          sub="Volume runs the opposite way to risk: the pipeline with no model in it handles the most, and the one that reads sentences handles the least."
          source={
            <>
              docs/steering/NEXT.md handover, 2026-09-14. Reprint the counts with{' '}
              <span className="text-ui-dim">pnpm steering:inventory</span> and{' '}
              <span className="text-ui-dim">pnpm steering:corpus-check</span> — both free.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'parse — rows', value: 11500, display: '~11,500', note: '131 files · no model · 4 seconds · free' },
              { label: 'index — passages', value: 3854, display: '3,854', note: '922 documents, including 1,027 code chunks · ~1¢' },
              { label: 'extract — facts', value: 1320, display: '1,320', note: '220 closure reports · the only model-read stage · ~1¢' },
            ]}
            labelWidth={190}
            axis="0 → ~11,500 units produced"
          />
        </Figure>
      </Step>

      <Step n={2} title="Code had to be cut by function, not by heading">
        <P>
          The chunker from the first track splits markdown on its headings. Source code has no headings, and
          cutting it the same way produces pieces that compile to nothing meaningful.
        </P>
        <P>
          Cutting by function is the obvious fix and is still not enough. In this corpus the constants a
          function depends on are written once at the top of the file — so a naive cut gives you{' '}
          <strong className="font-medium text-ui-fg">functions with no settings, and a settings table
          belonging to nobody</strong>.
        </P>

        <Key>
          1,027 of the 3,854 passages are code. They went through a second chunker, and the count above only
          became true on 2026-09-14 — the walkthrough written the day before still lists source files as a
          known gap at 702 documents and 2,827 pieces. Both numbers are right about their own day.
        </Key>
      </Step>

      <Step n={3} title="Silence is not “no”">
        <P>
          If a closure report never mentions tooling, the answer is{' '}
          <em className="not-italic text-ui-fg">“the document does not say”</em> — not{' '}
          <em className="not-italic text-ui-fg">“no tooling was needed”</em>. A pipeline that reads absence as
          a negative will confidently report that 172 jobs needed no tooling when nobody ever wrote about it.
        </P>

        <Key>
          <code className="font-mono">null</code> is a first-class answer. About a quarter of all answers are
          null, correctly — and roughly four questions in ten come back “the document does not say”. That is
          not the system failing. Those documents genuinely do not say.
        </Key>

        <P>
          This is one idea in three places, which is the kind of thing a teaching page can say and a code
          comment cannot:
        </P>

        <div className="my-6 space-y-3">
          {[
            {
              where: 'here',
              what: 'a field with no sentence behind it is null, never a default',
              why: '“no tooling needed” and “nobody wrote it down” are different claims about a job.',
            },
            {
              where: '@fde/telemetry',
              what: 'cachedInputTokens is undefined when the engine did not say, and 0 when it said none',
              why: 'Defaulting the first to the second makes an engine that never reports look like one on which caching never helps.',
            },
            {
              where: 'search',
              what: 'no score cutoff — the top k comes back even when all of it is poor',
              why: 'A low similarity is not evidence the answer is absent. Deciding that is reading comprehension.',
            },
          ].map((r) => (
            <div key={r.where} className="rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
              <p className="font-mono text-[0.8125rem]" style={{ color: 'var(--lesson)' }}>
                {r.where}
              </p>
              <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-fg">{r.what}</p>
              <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">{r.why}</p>
            </div>
          ))}
        </div>

        <Key>
          Three unrelated parts of this system, one rule: <Term def="The principle that a missing value and a negative value are different facts, and collapsing them invents information nobody recorded.">absence is not a value</Term>.
          Every one of them was written after the collapsed version shipped.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:inventory', does: 'What is in the estate, by kind — which pipeline each file goes to and why.', cost: 'free' },
          { cmd: 'pnpm steering:corpus-check', does: 'Fingerprints everything the vector store would receive, from two sources, and asserts they agree.', cost: 'free' },
          { cmd: 'pnpm steering:code-chunk-check', does: 'Asserts the code chunker keeps each function with the settings it depends on.', cost: 'free' },
          { cmd: 'pnpm steering:derived-reconcile', does: 'What the parse produced against the answer key. 195 efforts, residual 0.0 h.', cost: 'free' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The counts move with every re-ingest.',
            body: '922 documents and 3,854 passages are the 2026-09-14 figures, after code chunking landed. The plain-language walkthrough written one day earlier says 702 and 2,827 and is right about the day it was written. Carry the date.',
          },
          {
            claim: '“Parse cannot be quietly wrong” is about the parse, not about the data.',
            body: 'It throws on a missing column. It has nothing to say about a timesheet that was filled in wrong, and the last lesson in this track is largely about exactly that.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'parse', def: 'Reading a file that already has columns, with plain code and no model. Fails loudly.' },
          { word: 'index', def: 'Cutting prose and code into findable pieces and embedding them. Fails by missing.' },
          { word: 'extract', def: 'Reading a fact out of a sentence with a model. The only stage that can be confidently wrong.' },
          { word: 'absence is not a value', def: 'A document that does not mention something has not said no. Collapsing the two invents information nobody recorded.' },
        ]}
      />
    </LessonPage>
  );
}
