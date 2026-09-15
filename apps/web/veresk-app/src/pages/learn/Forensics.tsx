/**
 * Operations lesson 2 — why it failed, and how many kinds of failure you have.
 *
 * A READING OF `docs/steering/OPERATIONS.md` §2 AND `NEXT.md` §0.
 *
 * IT OVERLAPS THE `ceiling` LESSON IN THE ENGAGEMENT TRACK AND THE SPLIT IS
 * DELIBERATE. That page reports the finding — 23 of 24 unpriced, and most of it
 * is the customer's paperwork. This one is about the METHOD that produced it:
 * classify before you debug, count the buckets, and keep the record at the time
 * because a trace you did not keep is a trace you cannot analyse.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Stages } from '../../components/learn/charts/Stages';

export function Forensics() {
  return (
    <LessonPage slug="forensics">
      <Step n={1} title="Four causes, one symptom">
        <P>
          An assessment that refuses to price could be any of four things. From the outside they look
          identical: no price.
        </P>

        <Figure
          title="The same symptom, four first causes — and four different fixes"
          sub="Each is several steps upstream of where you noticed."
          source="docs/steering/OPERATIONS.md §2. The classification is the output; the debugging comes after."
        >
          <Stages
            stages={[
              {
                verb: 'retrieval',
                out: 'the document never came back',
                does: 'The search did not return it at any rank.',
                rule: 'Fix: chunking, or a second query. Nothing about the prompt will help.',
              },
              {
                verb: 'ranking',
                out: 'it came back at rank 35, below the cut',
                does: 'Retrieval found it and fusion buried it.',
                rule: 'Fix: the fuser, or a reranker. Measured in the retrieval lesson: RRF discards single-arm hits.',
              },
              {
                verb: 'reasoning',
                out: 'it was read, and a filter was chosen that matches nothing',
                does: 'The model had the document and asked the wrong question of the tool.',
                rule: 'Fix: the arguments, or the estate. Which of those it is takes a measurement — see §3.',
              },
              {
                verb: 'prompt',
                out: 'the tool answered, and there was no path to recover',
                does: 'Nothing told the model what to do with a refusal.',
                rule: 'Fix: ours, entirely. Seven of 24 never called the pricing tool at all.',
              },
            ]}
          />
        </Figure>

        <Key>
          So forensics is a classification problem before it is a debugging problem. The output is not “here
          is the bug” — it is which kind this is, and how many of each kind you have. One instance is an
          anecdote. A bucket count is a work plan.
        </Key>
      </Step>

      <Step n={2} title="The record has to be captured at the time">
        <P>
          A trace you did not keep is a trace you cannot analyse. The request log carries{' '}
          <code className="font-mono text-ui-fg">stoppedBecause</code>,{' '}
          <code className="font-mono text-ui-fg">schemaRetries</code>,{' '}
          <code className="font-mono text-ui-fg">turns</code>,{' '}
          <code className="font-mono text-ui-fg">toolCalls</code>,{' '}
          <code className="font-mono text-ui-fg">ms</code> and a cost on every line, and the assessment
          history carries the answer body and the trace.
        </P>

        <Code
          path="packages/telemetry/src/request-log.ts"
          note="one line per request, written at the time"
          lines={[
            'interface RequestRecord {',
            '  inputTokens: number;',
            '  cachedInputTokens?: number;   // optional — undefined is NOT 0',
            '  outputTokens: number;',
            '  ms: number;',
            '  stoppedBecause: string;       // model_finished | max_turns | threw',
            '  schemaRetries: number;',
            "  /** 'ask' | 'eval' | whatever calls it. Keeps real traffic separable. */",
            '  surface: string;',
            '}',
          ]}
          mark={[5, 8]}
        />

        <P>
          <code className="font-mono text-ui-fg">stoppedBecause</code> is the field that makes the first
          bucket in the next section possible, and <code className="font-mono text-ui-fg">surface</code> is
          what let the cost lesson separate the eval suite from real traffic. Neither was added for the
          analysis that used it — both were there first, which is the only way that works.
        </P>

        <Key>
          The calls that already happened are gone, and no amount of later tooling brings them back. A
          dashboard is something you add on top of a durable log, never instead of one.
        </Key>
      </Step>

      <Step n={3} title="What a bucket count actually bought">
        <P>
          <code className="font-mono text-ui-fg">why-unpriced</code> re-reads the stored tool calls, counts
          each key against the estate, and for every refusal prints what the estate carries beside the value
          the agent chose. Free, no model, re-runnable. Its output{' '}
          <em className="not-italic text-ui-fg">is</em> a failure taxonomy.
        </P>

        <Figure
          title="23 unpriced requirements, classified"
          sub="Not one bug. Four kinds, in very different proportions, and only one of them is ours."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:why-unpriced</span>, 2026-09-14. Free, no model,
              re-reads traces already on disk.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'the estate', value: 13, display: '13', note: 'asked properly, understood, too few comparable jobs exist' },
              { label: 'the prompt — ours', value: 7, display: '7', note: 'never called the pricing tool at all' },
              { label: 'unknowable', value: 4, display: '4', note: 'called it, and the trace did not keep the arguments — §4' },
              { label: 'vocabulary mismatch', value: 0, display: '0', note: 'asked with a value no document uses — none at all' },
            ]}
            max={13}
            labelWidth={190}
            axis="0 → 13 of 23"
          />
        </Figure>

        <P>
          The obvious reading of the first bar is that the agent is over-constraining. That was the team's
          hypothesis for a day. One measurement settled it — for each refusal, would dropping exactly one
          filter have found enough jobs?
        </P>

        <Figure
          title="Drop-one: was any refusal a single field away from an answer?"
          sub="Twelve of thirteen were not."
          source="docs/steering/NEXT.md §0, measured 2026-09-14 over the stored traces. Free."
        >
          <BarRows
            rows={[
              { label: 'drop change_class', value: 1, display: '1 of 13', note: 'would have crossed the floor of three' },
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
          That is what good forensics produces — a reclassification of the problem, not a patch. The agent is
          not over-constraining; Vantis has booked exactly two validation-only mechanical jobs, ever. So the
          fix is the sentence, not the filter.
        </Key>

        <Data
          path="docs/steering/NEXT.md §0 — the reading that was wrong"
          note="a true fact that is not the cause"
          lines={[
            'The first reading blamed `asil`, and the reasoning was sound:',
            '  40% of usable history has no ASIL recorded.',
            '',
            'That number is TRUE. It is also not the cause — dropping `asil` alone',
            'would have rescued 0 of 10.',
            '',
            '"This field is often missing" does not imply "this field is why the',
            'query returned nothing". Only the drop-one counts can tell them apart.',
          ]}
          mark={[6, 7]}
        />
      </Step>

      <Step n={4} title="The live defect underneath the four unknowable ones">
        <P>
          One column holds two incompatible shapes, nothing documents it, and nothing asserts it.
        </P>

        <HowItWorks
          title="How one column came to hold two structures"
          shape="assembled"
          path="apps/ai/steering/src/cli/file-assessment.ts:79 · the desk route"
          lang="json"
          plain={[
            'Two writers file into the same `assess_history.trace` column. The CLI writes the loop’s turn records — every tool call with its arguments and its full result. The web desk writes loop events — a tool name, a timing, and a one-line summary, with no arguments at all.',
            'Both are valid JSON. Both are plausible. Neither carries a discriminator saying which one it is.',
            'The first version of the why-unpriced diagnostic read only the turn shape. It found no tool calls in any desk-written row — and was about to report the one requirement in the whole bid that carries a price as having invented it. It had called the pricing tool three times.',
            'That is also why four of the 23 refusals are classified as unknowable rather than distributed across the other three buckets: the evidence for them was never written down in a shape the reader could see.',
          ]}
          lines={[
            '// what the CLI files — TurnRecord[]',
            '{ "turns": [',
            '    { "toolCalls": [',
            '        { "name": "find_comparable_work",',
            '          "arguments": { "change_class": "validation_only", … },',
            '          "result":    { "n": 0, "median": null, … } } ] } ] }',
            '',
            '// what the web desk files — LoopEvent[]',
            '{ "events": [',
            '    { "kind": "tool", "name": "find_comparable_work",',
            '      "ms": 412, "summary": "no comparable work found" } ] }',
            '                                    // ↑ no arguments, anywhere',
          ]}
          mark={[4, 11]}
          says={[
            { at: '"arguments": { … }', is: 'What the diagnostic needs. It is what the agent actually asked for, and it is the difference between "the estate is empty" and "we asked the wrong question".' },
            { at: 'no arguments, anywhere', is: 'The desk shape records that a tool ran and what it concluded, never what it was asked. A reader cannot reconstruct the query.' },
          ]}
          trap="A column holding two structures with no discriminator is a trap for everything that reads it later — and the near-miss is the sharpest part. A tool whose output is an ACCUSATION is the place a false negative costs most, and this one was one commit from accusing the only correct answer in the bid."
        />
      </Step>

      <Step n={5} title="What the field does, and what is missing here">
        <P>
          <Term def="The Multi-Agent System Failure Taxonomy — 14 failure modes in 3 categories, built from 150 hand-annotated traces at inter-annotator agreement κ = 0.88.">MAST</Term>{' '}
          is the published version of the argument on this page: failures cluster into a small number of
          kinds, and counting them is what tells you where to spend. The specific 14 matter less than that.
          Alongside it: trace-based localisation, deterministic replay — “VCR for agents” — and the
          OpenTelemetry GenAI conventions, which are the answer to “how do you avoid vendor lock-in on
          observability”.
        </P>
        <P>
          One detail of those conventions is worth knowing because it is a privacy control rather than a
          naming one: prompts go in <strong className="font-medium text-ui-fg">span events</strong>, not
          attributes, so a collector can drop them without an application change.
        </P>
        <P>
          Missing here: the two trace shapes are not reconciled, there is no replay, nothing emits
          OpenTelemetry, and the classification only covers one failure mode of one loop.
        </P>
      </Step>

      <SaidOutLoud
        then={
          <>
            “How did you know it wasn't the agent being too strict?” — the drop-one counts. For each refusal,
            would removing exactly one filter have found enough jobs? Twelve of thirteen: no. That is a
            measurement, and it is what turned a day of argument into a decision.
          </>
        }
      >
        Twenty-three of twenty-four requirements came back without a price, and the useful question was not
        why one of them failed — it was <strong>how many kinds of failure that was</strong>. We wrote a
        diagnostic that re-reads the stored tool calls and counts each key against the estate: free, no model.
        It came back <strong>13</strong> the customer's own history, <strong>7</strong> our prompt never
        calling the tool, <strong>4</strong> unknowable because the trace did not keep the arguments, and{' '}
        <strong>0</strong> vocabulary mismatch. Only the seven were ours. And the one that nearly went wrong
        is the one I'd tell you about: the first version of that diagnostic read only one of the two trace
        shapes in that column, and was about to report the single requirement that <em>did</em> carry a price
        as having invented it.
      </SaidOutLoud>

      <RunIt
        items={[
          { cmd: 'pnpm steering:why-unpriced', does: 'The classification above, re-read from traces already on disk. No model, no cost.', cost: 'free' },
          { cmd: 'pnpm steering:assess-all', does: 'The work list for the bid — what would be assessed, spending nothing.', cost: 'free' },
          { cmd: 'pnpm steering:assess <REF> --trace', does: 'One requirement with its full turn record kept. About 2 cents.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The taxonomy covers one failure mode of one loop.',
            body: 'why-unpriced classifies refusals to price. Nothing classifies a wrong price, a schema failure, or anything in the summary and explain paths.',
          },
          {
            claim: 'Four of 23 are unclassified, not classified as fine.',
            body: 'They are counted in their own bucket rather than distributed, because assigning them would be inventing a distribution to make the chart add up. Fixing the trace defect moves them; nothing else will.',
          },
          {
            claim: 'There is no replay.',
            body: 'Every investigation still starts by re-running the question and hoping it fails the same way — for everything except the one path this diagnostic covers.',
          },
          {
            claim: 'A bucket count is not a root cause.',
            body: 'It tells you where to spend. It does not tell you what is wrong inside the bucket, and the 13 in the largest one were only understood after a second, different measurement.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'forensics', def: 'Going back after a bad answer and saying exactly why — from a record captured at the time, not from a re-run.' },
          { word: 'first cause', def: 'The earliest step that went wrong. Usually several steps upstream of where the symptom appeared.' },
          { word: 'bucket count', def: 'How many failures of each kind. One instance is an anecdote; the counts are a work plan.' },
          { word: 'drop-one', def: 'Asking, per refusal, whether removing exactly one filter would have succeeded. What distinguishes over-constraining from an empty history.' },
          { word: 'MAST', def: 'A published failure taxonomy for multi-agent systems — 14 modes, from 150 annotated traces. The point is that failures cluster, not the specific 14.' },
        ]}
      />
    </LessonPage>
  );
}
