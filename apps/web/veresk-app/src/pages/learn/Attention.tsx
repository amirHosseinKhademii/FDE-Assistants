/**
 * Engagement lesson 5 — the limit is attention, not the context window.
 *
 * A READING OF `docs/steering/CONCEPTS.md` §"Context engineering" AND
 * `THE-SUMMARY.md`.
 *
 * THIS IS THE ONE THAT EXTENDS THE FIRST TRACK RATHER THAN SITTING BESIDE IT.
 * Lesson 3 of the machine says what is in the context window. This says what
 * happens when there is too much of it — which is a question the first two
 * engagements could not ask, because five files and ninety-seven files do not
 * have enough in them to bury anything.
 *
 * IT ALSO CARRIES A PREDICTION THAT WAS WRONG, and keeps it. `CONCEPTS.md`
 * predicted 28× compression and measured 2.4×. Deleting the prediction would
 * make the page tidier and would remove the only part of it that shows what
 * estimating costs.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { EITHER_OR, Matrix } from '../../components/learn/charts/Matrix';

export function Attention() {
  return (
    <LessonPage slug="attention">
      <Step n={1} title="The instinct is that the limit is the window. It is not.">
        <P>
          A model handed sixty passages does not read them equally. It reads the beginning and the end
          properly, and the middle turns to mush. Filling the window does not add information — past a point it{' '}
          <em className="not-italic text-ui-fg">removes</em> it, by burying the passage that mattered among
          fifty that did not.
        </P>

        <Key>
          More context can make the answer worse. That is the whole subject in one sentence, and it is why
          this is engineering rather than housekeeping.
        </Key>

        <P>
          It had nothing to bite on before this engagement, and the three corpora say why.
        </P>

        <Figure
          title="Why this is the first engagement where it is forced"
          sub="Two of the three corpora are small enough that every passage fits comfortably and nothing can be buried."
          source="docs/steering/CONCEPTS.md §“Context engineering”, and docs/RETRIEVAL.md §8 for the passage counts."
        >
          <BarRows
            rows={[
              { label: 'Vantis Steering', value: 3854, display: '3,854 passages', note: '1,069 files — a bid response' },
              { label: 'Meridian Mutual', value: 700, display: '~700 passages', note: '97 files — insurance claims' },
              { label: 'Meridian Pharma', value: 75, display: '75 passages', note: '5 files — batch release' },
            ]}
            labelWidth={190}
            axis="0 → 3,854 indexed passages"
          />
        </Figure>
      </Step>

      <Step n={2} title="The arithmetic, and the coupling that is easy to miss">
        <P>
          3,854 passages, averaging 137 tokens each, and 24 requirements each doing its own retrieval. What
          does asking for more passages actually cost?
        </P>

        <Figure
          title="Evidence tokens, per requirement and across the whole bid"
          sub="Any one question needs roughly 1,000 tokens of the material it is handed."
          source="docs/steering/CONCEPTS.md §“Context engineering”, measured 2026-09-13 over the indexed corpus."
        >
          <BarRows
            rows={[
              { label: 'k = 5', value: 16500, display: '~16,500', note: '~687 tokens per requirement' },
              { label: 'k = 8', value: 26400, display: '~26,400', note: '~1,100 per requirement — what ships' },
              { label: 'k = 20', value: 66000, display: '~66,000', note: '~2,749 per requirement' },
            ]}
            labelWidth={140}
            axis="0 → ~66,000 tokens across all 24 requirements"
          />
        </Figure>

        <Key>
          Because poor passages always come back by design — there is no score cutoff — raising k from 5 to 20
          adds fifteen passages that are, by construction, the worst fifteen available. You pay more in order
          to think worse.
        </Key>

        <P>
          That coupling does not appear at five documents. It appears at 3,854, and it is the reason{' '}
          <Term def="Deciding what goes into the context window and what stays out: write, select, compress, isolate. Distinct from prompt engineering, which is about the wording of what you already decided to send.">
            context engineering
          </Term>{' '}
          is a discipline and not a tidying habit. Of its four verbs — write, select, compress, isolate —{' '}
          <strong className="font-medium text-ui-fg">select</strong> is the 66,000 → 1,000 move and the single
          largest lever.
        </P>
      </Step>

      <Step n={3} title="Compress, measured — and the prediction was wrong">
        <P>
          The plan predicted that summarising a finished assessment down to a line for the bid-wide view would
          compress it <strong className="font-medium text-ui-fg">28×</strong>. Measured on a real filed
          assessment: 4,710 characters became 1,992. <strong className="font-medium text-ui-fg">2.4×.</strong>
        </P>
        <P>
          The estimate assumed a resolved requirement becomes a one-line triage entry. The line that actually
          works keeps the stated refusal reason and every question put to a human — because grouping refusals
          and spotting repeated questions is the entire job of the thing reading those lines, and it cannot do
          either from a reference and a finding.
        </P>

        <P>
          But on <em className="not-italic text-ui-fg">tokens</em> it is far better than 28×, and the character
          ratio understates it badly.
        </P>

        <Figure
          title="Input tokens: one requirement assessed, against the whole bid summarised"
          sub="Sixty times less input for a page about twenty-four requirements than for one of them."
          source="docs/steering/THE-SUMMARY.md, measured on a real filed assessment. One requirement: 5,447 output tokens in 64 s. The summary: 2,423 output in 26 s."
        >
          <BarRows
            rows={[
              { label: 'one requirement assessed', value: 188115, display: '188,115', note: '8 turns, each re-sending 20 passages and 8 tool results' },
              { label: 'the whole bid summarised', value: 3159, display: '3,159', note: 'no tools — it sends its material once' },
            ]}
            labelWidth={230}
            axis="0 → 188,115 input tokens"
          />
        </Figure>

        <Key>
          An assessment's cost is not its dossier. It is the twenty retrieved passages and eight tool results
          re-sent on every one of its eight turns. That is what <em className="not-italic">isolate</em> buys,
          and it is only visible in tokens.
        </Key>
      </Step>

        <HowItWorks
          title="How a contract makes a wrong total impossible rather than forbidden"
          path="apps/ai/steering/src/schema/bid-summary-schema.ts:13–35"
          plain={[
            'The bid summary reads across every filed assessment and writes two paragraphs. It is not allowed to report a count, a total, or a finding.',
            'That rule is not in the prompt. There is simply NO FIELD for any of them in the schema the model decodes against — no `finding`, no `total`, no `count`, no `eur`, anywhere in it.',
            'A model that cannot represent a total cannot total a refusal into one. The mix, the money and the evidence counts are computed in code, from the filed rows, and printed beside the paragraphs.',
            'Both rules could have been written into the prompt. A prompt is a request; a schema is a property. Same argument as the tools lesson, applied to the output instead of the input.',
          ]}
          lines={[
            ' * There is no `finding`, no `total`, no `count` and no `eur` anywhere',
            ' * below, and that is the rule rather than an omission. The mix, the money',
            ' * and the evidence counts are computed in code from the filed rows.',
            ' *',
            ' * A model that cannot represent a total cannot total a refusal into one,',
            ' * and a model that cannot name a finding cannot invent one.',
            ' *',
            ' * A summary is allowed to GROUP refusals; it is not allowed to COUNT them.',
          ]}
          mark={[0, 4, 7]}
          says={[
            { at: 'no `total`, no `count`', is: 'Absence as a control. The strictObject rejects unknown keys, so one cannot be smuggled in as an extra field either.' },
            { at: 'allowed to GROUP … not to COUNT', is: 'The line between reading and arithmetic, drawn in the type rather than in an instruction.' },
          ]}
          trap="This is the cheapest version of a safety rule there is, and it only works on outputs whose shape you control. It says nothing about whether the two paragraphs are any good — which is what an eval suite is for, and that suite does not cover this path yet."
        />

      <Step n={4} title="Which half is a model, and which half is arithmetic">
        <P>
          The bid-wide summary reads across every finished assessment. Deciding what it is allowed to compute
          is the safety argument, and it is a clean split.
        </P>

        <Figure
          title="Who does what, in the summary"
          sub="Counting and adding are arithmetic. Noticing what refusals have in common is reading."
          source="docs/steering/THE-SUMMARY.md. Assert it with pnpm steering:summary-check — free."
        >
          <Matrix
            marks={EITHER_OR}
            rowHeader="what the summary says"
            columns={['done by code', 'done by the model']}
            rows={[
              {
                name: 'how many assessed',
                cells: [
                  { state: 'live', detail: 'counting' },
                  { state: 'refuses', detail: 'no field exists for it to put one in' },
                ],
              },
              {
                name: 'the finding mix, the totals, which are unpriced',
                cells: [
                  { state: 'live', detail: 'counting and adding' },
                  { state: 'refuses', detail: 'same — the contract has no field' },
                ],
              },
              {
                name: 'what the refusals have in common',
                cells: [
                  { state: 'refuses', detail: 'not arithmetic' },
                  { state: 'live', detail: 'that is reading' },
                ],
              },
              {
                name: 'which questions repeat, and the headline',
                cells: [
                  { state: 'refuses', detail: 'not arithmetic' },
                  { state: 'live', detail: 'reading again' },
                ],
              },
            ]}
            footnote="Both rules could have been written into the prompt — and a prompt is a request. The summary's answer contract has NO FIELD for a finding, a count or a total: a model that cannot represent a total cannot produce a wrong one."
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:summarise --dry-run', does: 'Every count the summary will report, computed by code, with no model call at all.', cost: 'free' },
          { cmd: 'pnpm steering:summary-check', does: 'Asserts the summary contract has no field a total could be smuggled into.', cost: 'free' },
          { cmd: 'pnpm steering:summarise', does: 'The two written paragraphs. One model call.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: '“The middle turns to mush” is not measured here.',
            body: 'It is a well-established property of long contexts and this engagement did not re-measure it. What is measured here is the token arithmetic and the compression ratio — the reason to care, not the effect itself.',
          },
          {
            claim: 'k = 8 was not chosen by a sweep.',
            body: 'It is the value that ships, and the arithmetic above says what 5 and 20 would cost. Nobody has measured answer quality at each k on this corpus, so the case for 8 is cost and the no-cutoff coupling, not a measured optimum.',
          },
          {
            claim: 'The 28× prediction is kept because it was wrong.',
            body: 'A page that quietly replaced it with the measured 2.4× would read as though somebody had simply measured well. The gap between the estimate and the measurement is the only part of this section that says what estimating is worth.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'context engineering', def: 'Deciding what goes into the window and what stays out — write, select, compress, isolate. Not the same as prompt engineering, which is the wording of what you already chose to send.' },
          { word: 'k', def: 'How many passages a search returns to the model. Raising it adds, by construction, the worst passages available.' },
          { word: 'isolate', def: 'Giving a job its own context rather than extending an existing one. The summary has no tools, so it sends its material once instead of on every turn.' },
          { word: 'compression ratio', def: 'How much smaller a summary is than what it summarises. Measured in characters it was 2.4×; in input tokens, about 60×.' },
        ]}
      />
    </LessonPage>
  );
}
