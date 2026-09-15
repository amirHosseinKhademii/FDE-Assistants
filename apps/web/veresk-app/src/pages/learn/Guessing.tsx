/**
 * Engagement lesson 1 — how to tell a model is guessing, with no answer key.
 *
 * A READING OF `docs/steering/SORTING.md` §"K5 at scale" AND
 * `WHAT-WE-ASK-THE-MODEL.md` §3 and §5.
 *
 * THIS IS THE PAGE THAT READS COLD. It needs nothing from the first track and
 * nothing from the rest of this one, and it teaches the only skill here that
 * transfers unchanged to a customer on day one: you can tell a model is
 * guessing from the shape of its own output, before anybody knows the answers.
 *
 * ── A NUMBER-PROVENANCE WARNING, BECAUSE THIS PAGE IS WHERE IT BITES ────────
 *
 * Two runs of this extraction exist and they are DIFFERENT SCOPES, not
 * contradictions: 203 documents (SORTING.md §K5, 2026-09-13) and 220 closure
 * reports (the run `classification.ts` records in its own header, where the
 * refusal/guess split is 137/83). Every figure below is from the 203-document
 * run and the totals prove it — 75 answered plus 128 refused is 203. Putting one
 * table's answer count beside the other's accuracy would manufacture a
 * contradiction this page would then render as fact.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';

export function Guessing() {
  return (
    <LessonPage slug="guessing">
      <Step n={1} title="Six questions, 203 documents, and one column that is noise">
        <P>
          A model reads 203 closure reports — the write-up an engineer files when a job finishes — and
          extracts six facts from each: what kind of change it was, what part, what safety level, how many
          interfaces it touched, whether the safety case was reopened, whether special tooling was needed.
          Every answer must arrive with the sentence it was read from.
        </P>
        <P>
          A seventh field was asked for too: <code className="font-mono text-ui-fg">reuse_class</code> —
          whether the work was carryover, modified, or new. Here is what came back.
        </P>

        <Figure
          title="How accurate each field was, against the hand-worked answer key"
          sub="Seven fields. Six of them land between 93% and 100%. One lands on the dashed line."
          source={
            <>
              docs/steering/SORTING.md §“K5 at scale”, run 2026-09-13 over 203 documents. Reprint with{' '}
              <span className="text-ui-dim">pnpm steering:derived-grade-facts</span> — free, no model.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'change_class', value: 100, display: '100%', note: 'answered 197 of 203 · 0 fabricated' },
              { label: 'interfaces_touched', value: 100, display: '100%', note: 'answered 166 · refused 37 · 0 fabricated' },
              { label: 'tooling_required', value: 100, display: '100%', note: 'answered 31 · refused 172 · 0 fabricated' },
              { label: 'asil', value: 100, display: '100%', note: 'answered 4 · refused 199 · 0 fabricated' },
              { label: 'safety_case_impact', value: 94, display: '94%', note: 'answered 203 · refused 0 · 0 fabricated' },
              { label: 'element_kind', value: 93, display: '93%', note: 'answered 194 · refused 9 · 0 fabricated' },
              {
                label: 'reuse_class',
                value: 36,
                display: '36%',
                note: 'answered 75 · refused 128 · 75 fabricated — every fabrication in the run',
              },
            ]}
            max={100}
            labelWidth={190}
            reference={{ at: 33, label: '33% — what three-way guessing scores' }}
            axis="0 → 100% accuracy"
          />
        </Figure>

        <Key>
          <code className="font-mono">reuse_class</code> has three possible values. Chance is 33%. It scored
          36%. It is not reading — it is guessing, on the one field no closure report in the corpus states.
        </Key>

        <P>
          That one field produced <strong className="font-medium text-ui-fg">all 75 fabrications</strong> and
          48 of the 74 wrong answers in the whole run. Everything else fabricated nothing at all.
        </P>
      </Step>

      <Step n={2} title="And the diagnosis needs no answer key at all">
        <P>
          The chart above was scored against a key somebody worked out by hand. At a real customer on day one
          you do not have one — and you do not need one, because a second signal says the same thing and it is
          visible in the output alone.
        </P>
        <P>
          Ask only: <strong className="font-medium text-ui-fg">how often did this field answer at all?</strong>
        </P>

        <Figure
          title="The same run, asking nothing but “did it answer?”"
          sub="No ground truth is used anywhere in this chart. It is the model's own refusal rate."
          source="docs/steering/SORTING.md §“K5 at scale”. The same 203-document run; answer rate is answered ÷ 203."
        >
          <BarRows
            rows={[
              { label: 'change_class', value: 97, display: '97%', note: 'healthy — nearly every report states it' },
              { label: 'safety_case_impact', value: 100, display: '100%', note: 'healthy' },
              { label: 'element_kind', value: 96, display: '96%', note: 'healthy' },
              { label: 'interfaces_touched', value: 82, display: '82%', note: 'healthy — refuses where the report is silent' },
              { label: 'tooling_required', value: 15, display: '15%', note: 'healthy — almost no report mentions tooling' },
              { label: 'asil', value: 2, display: '2%', note: 'healthy — the safety level is essentially never written down' },
              {
                label: 'reuse_class',
                value: 37,
                display: '37%',
                note: 'not healthy — a third of the time, on documents that all look alike',
              },
            ]}
            max={100}
            labelWidth={190}
            axis="0 → 100% of documents answered"
          />
        </Figure>

        <Key>
          100% and 2% are both healthy: the system knows whether it can read a field. A field answered a third
          of the time, on documents that all look the same, is a field being guessed at — and that is readable
          from the output alone, which is the property that makes it work on day one.
        </Key>

        <P>
          A second, independent signal agreed:{' '}
          <code className="font-mono text-ui-fg">reuse_class</code> kept quoting a sentence already used for a
          different field. That is exactly what inferring one fact from another looks like.
        </P>
      </Step>

      <Step n={3} title="The part most people get wrong: rewording it does nothing">
        <P>
          The obvious next move is to fix the prompt. The prompt{' '}
          <strong className="font-medium text-ui-fg">already forbade this, by name</strong>, with{' '}
          <code className="font-mono text-ui-fg">reuse_class</code> in the worked example. Given identical
          instructions and documents of the same shape, it refused 128 times and guessed 75.
        </P>

        <Key>
          Rewording is money spent to move a number that is already at chance. If a field is at the rate a coin
          would score, the instruction is not the problem — the documents are.
        </Key>

        <P>So the field was removed, and the result is the punchline.</P>

        <Figure
          title="Accuracy with the field, and without it"
          sub="Nothing downstream used the column. No filter, no price, no walk."
          source="docs/steering/SORTING.md §“K5 at scale” · apps/ai/steering/src/derived/extract/classification.ts, where REUSE_CLASS is kept unused as the record of what was withdrawn."
        >
          <BarRows
            rows={[
              {
                label: 'overall accuracy',
                value: 98,
                before: 93,
                display: '98%',
                beforeDisplay: '93%',
                note: 'five points, from asking one fewer question',
              },
            ]}
            max={100}
            legend={['with reuse_class', 'without it']}
            labelWidth={190}
          />
        </Figure>

        <P>
          And what replaced the column is worth more than the column would have been:{' '}
          <em className="not-italic text-ui-fg">
            “your closure reports do not record reuse, so nobody can tell you what carryover work costs.”
          </em>
        </P>

        <Key>
          A pipeline that asks for something the documents do not contain gets an answer, and that answer is
          noise with a citation attached — the most expensive kind of wrong, because it looks exactly like the
          others.
        </Key>
      </Step>

      <Step n={4} title="The other half: proving a quote is real, with string search and nothing else">
        <P>
          Every extracted fact carries the sentence it was read from, and that sentence is then searched for in
          the source file. Not there → the fact is discarded. This is the{' '}
          <Term def="Requiring a model to return the exact sentence it read a value from, then searching the source file for that sentence. Producing a plausible value is easy; producing one that exists word-for-word in a named file is not.">
            evidence check
          </Term>
          .
        </P>
        <P>
          Producing a plausible value is trivial. Producing a value{' '}
          <em className="not-italic text-ui-fg">and</em> a sentence that exists word-for-word in one specific
          file is not. And verifying costs nothing — it is string search. No second model, no human review, no
          list of right answers. <strong className="font-medium text-ui-fg">It works identically at a customer on day one.</strong>
        </P>

        <Figure
          title="What the check found, over 1,320 facts"
          sub="Six of 1,421 evidence strings failed the match. All six were the same em dash arriving as control bytes; the values were right."
          source={
            <>
              docs/steering/WHAT-WE-ASK-THE-MODEL.md §3.{' '}
              <span className="text-ui-dim">pnpm steering:derived-boundary-check</span> — free.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'invented sentences', value: 0, display: '0', note: 'in 1,320 facts' },
              { label: 'false positives', value: 6, display: '6 of 1,421', note: '0.4% — all one mangled character' },
              { label: 'true positives', value: 0, display: '0', note: 'the check has never yet caught a real fabrication' },
            ]}
            max={1421}
            labelWidth={190}
            axis="0 → 1,421 evidence strings"
          />
        </Figure>

        <HowItWorks
          title="How a quote is matched, in three passes"
          path="apps/ai/steering/src/derived/extract/classification.ts:196–285"
          plain={[
            'The quote is searched for three times, strictest first — so a sentence that matches exactly is never reported as a near-match just because a looser comparison would also have passed.',
            'Pass 1 ignores line wrapping only. These reports are hard-wrapped at 68 characters, so one sentence a model read is three lines in the file; comparing raw would reject every true quote and measure line width instead.',
            'Pass 2 ignores punctuation — dashes, quote marks, control bytes — because the transport mangles non-ASCII. Pass 3 keeps letters and nothing else.',
            'Anything matched below pass 1 is stored FLAGGED rather than accepted silently, so the looseness stays countable. A matcher tuned until nothing ever fails is a matcher that detects nothing.',
          ]}
          lines={[
            'for (const [tier, norm] of [[0, flat], [1, canon], [2, letters]] as const) {',
            '  const needle = norm(evidence);',
            '  if (!needle) continue;',
            '',
            '  const needleLines = evidence.split(\'\\n\').length;',
            '  const maxWindow = Math.max(6, needleLines + 2);',
            '',
            '  // Smallest window first, then earliest start, so the answer is the',
            '  // tightest span of lines that actually contains the quote.',
            '  for (let n = 1; n <= maxWindow; n++) {',
            '    for (let i = 0; i + n <= lines.length; i++) {',
            '      if (norm(lines.slice(i, i + n).join(\' \')).includes(needle)) {',
            '        return { line: i + 1, exact: tier === 0 };',
            '      }',
            '    }',
            '  }',
            '}',
            'return null;',
          ]}
          mark={[5, 9, 12]}
          says={[
            { at: 'maxWindow = Math.max(6, …)', is: 'The window is sized from the quote. It used to be a fixed six lines, and a perfectly correct citation of a six-row table was reported as "quote not in the file".' },
            { at: 'for (let n = 1; …)', is: 'Window SIZE outside, start position inside. The loops used to nest the other way, so a one-line sentence on line 9 was first matched by a six-line window starting at line 4 — and reported as line 4.' },
            { at: 'exact: tier === 0', is: 'Only the strictest pass counts as exact. Everything else is stored flagged and counted.' },
          ]}
          trap="The window bug is the sharper of the two. A check that ACCUSES is the one place a false negative is least affordable: the severity classifier filed that correct citation as `false_answer` — the bucket reserved for a model fabricating evidence. It was the fifth time in this repo that a red light turned out to be the checker rather than the thing checked."
        />

        <P>
          The line number is found by us, not supplied by the model — so a challenged figure traces to{' '}
          <code className="font-mono text-ui-fg">EFF-BULK-0067.md:14</code>, not to a row nobody can justify.
        </P>

        <Data
          path="docs/steering/WHAT-WE-ASK-THE-MODEL.md §3 — what the check could not catch"
          note="a real sentence, the wrong field, the wrong answer"
          lines={[
            'field     reuse_class',
            'value     new',
            'evidence  "New software, no predecessor to carry over."',
            '',
            'The sentence exists. It is in the file, word for word, on the line given.',
            'It is about the software, not about reuse of the WORK — and the evidence',
            'check is blind to that, because the check asks whether the quote is real,',
            'never whether it says what the value claims.',
          ]}
          mark={[4, 5, 6, 7]}
        />

        <Key>
          Two independent checks, neither sufficient alone. The evidence check catches an invented sentence and
          cannot catch a value misread from a real one. The answer-rate signal in §2 catches exactly that, and
          cannot see a fabricated quote.
        </Key>
      </Step>

      <RunIt
        items={[
          {
            cmd: 'pnpm steering:derived-grade-facts',
            does: 'Grades the extraction against the hand-worked key and prints the per-field table above.',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:derived-boundary-check',
            does: 'Re-runs the evidence check over every stored fact — string search, no model.',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:derived-extract --limit 220',
            does: 'The extraction itself. About a cent for the whole corpus.',
            cost: 'money',
          },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The answer-rate signal finds a guessed field, not a wrong one.',
            body: 'A field answered every time and wrong every time looks perfectly healthy here. It tells you the model is not reading; it cannot tell you it is reading badly.',
          },
          {
            claim: 'The evidence check has zero true positives.',
            body: 'It has never yet caught a real fabrication in this corpus, which is either because there have been none or because this model does not fabricate quotes when asked for them. Both are consistent with the data, and only one of them is a property of the check.',
          },
          {
            claim: 'Two runs of this extraction exist, at different scopes.',
            body: 'Every figure here is the 203-document run of 2026-09-13 — 75 answered plus 128 refused is 203, which is how you can tell. A 220-report run exists with a different split, recorded in classification.ts. Mixing the two manufactures a contradiction that is not there.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'extraction', def: 'Reading a specific fact out of a sentence, as opposed to parsing a column or retrieving a passage. The only one of the three that can be quietly wrong.' },
          { word: 'answer rate', def: 'How often a field came back with a value rather than a refusal. Needs no ground truth, which is what makes it usable on day one.' },
          { word: 'fabrication', def: 'A value the documents do not support. Distinct from a wrong answer read from a real sentence, and caught by a different check.' },
          { word: 'evidence check', def: 'Requiring the exact sentence a value was read from, then searching the file for it. Free, offline, and blind to a value misread from a real sentence.' },
          { word: 'null as an answer', def: '“The document does not say” is a first-class result here, not a failure. About a quarter of all answers are null, correctly.' },
        ]}
      />
    </LessonPage>
  );
}
