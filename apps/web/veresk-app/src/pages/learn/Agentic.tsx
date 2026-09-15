/**
 * Patterns lesson 3 — retrieval becomes a tool the model may call.
 *
 * A READING OF `docs/rag/AGENTIC.md`.
 *
 * THE COST SECTION IS THE REASON THIS PAGE EXISTS. Everything above step 3 is
 * explicable from the loop lesson in the machine track. What is not is that the
 * same question, with the same corpus, costs 27,023 tokens one time and 136,174
 * another — and that both of those are correct runs. A pattern whose cost is a
 * distribution rather than a number is a different thing to budget for, and
 * nothing else in this track has that property.
 *
 * The distribution is 893 real rows out of `logs/requests.jsonl`, not a
 * simulation, and the producer is a one-liner printed under the figure.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Matrix, EITHER_OR } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Agentic() {
  return (
    <LessonPage slug="agentic">
      <Step n={1} title="Search stops being a step and becomes a decision">
        <P>
          In everything above, retrieval happens <em>before</em> the model: search runs, passages go into the
          context window, the model answers. Agentic RAG moves the search behind a tool call, so the model
          decides whether to search, what to search for, and whether to search again after reading what came
          back.
        </P>

        <Figure
          title="One turn of the loop"
          sub="The whole conversation — system prompt, every previous tool result, every tool schema — goes up on every turn. That is the mechanism behind the cost shape in step 2."
          source="packages/agent/src/core/loop.types.ts and the three engines behind LOOP=. See docs/ENGINES.md."
        >
          <Stages
            stages={[
              { verb: 'call', out: 'Response { output[] }', does: 'system prompt + history + tool schemas go up. Every turn. All of it.' },
              { verb: 'inspect', out: 'function_call | text', does: 'the model asked for a tool, or it answered' },
              {
                verb: 'dispatch',
                out: 'registry.run(name, args)',
                does: 'our process, our connection — the model never sees a credential or touches the database',
              },
              { verb: 'append', out: 'function_call_output', does: 'the result joins the history, and is re-sent next turn' },
              {
                verb: 'repeat',
                out: 'until answered, or turn 12',
                does: 'the loop exits the moment the model answers',
                rule: 'The cap is an outcome you report, never a silent truncation. Step 4.',
              },
            ]}
          />
        </Figure>

        <Key>
          A traced run of the rideshare question made ten searches in one question, hunting for the literal
          strings “livery”, “for hire” and “transportation network” — none of which appear in the user’s
          question. The model generated the vocabulary of the corpus from the vocabulary of the question. That
          is the capability, stated as plainly as it goes: the model can search for words the user did not say.
        </Key>
      </Step>

      <Step n={2} title="What it costs is a distribution, not a number">
        <P>
          The same trace gives the price of getting it wrong: 6 tool calls and 43k tokens when the model
          routed well, 11 calls and 122k when it did not — 1.8× the calls and 2.8× the tokens, on the same
          question.
        </P>

        <Figure
          title="Tool calls per run, over 893 real loops"
          sub="The mode is 2 and the tail runs to 11. 123 of 893 runs — 13.8% — make six or more calls: not an average to plan against, a long right tail that is about one question in seven."
          source={
            <>
              MEASURED HERE — 893 single-loop rows in logs/requests.jsonl, across both engagements and both
              engines, fan-out surfaces excluded because their loop shape differs. The producer is a{' '}
              <span className="text-ui-dim">node -e</span> one-liner printed verbatim in docs/rag/AGENTIC.md §2.
            </>
          }
        >
          <BarRows
            rows={[
              { label: '0 calls', value: 45 },
              { label: '1 call', value: 131 },
              { label: '2 calls', value: 280 },
              { label: '3 calls', value: 224 },
              { label: '4 calls', value: 54 },
              { label: '5 calls', value: 36 },
              { label: '6 calls', value: 37 },
              { label: '7 calls', value: 30 },
              { label: '8 calls', value: 28 },
              { label: '9 calls', value: 10 },
              { label: '10 calls', value: 11 },
              { label: '11 calls', value: 7 },
            ]}
            labelWidth={130}
            axis="0 → 280 runs"
          />
        </Figure>

        <P>
          The tail is worse than its length suggests, because every turn re-sends the entire conversation.
          Turn 9 pays for turns 1 through 8 a second time.
        </P>

        <Figure
          title="Three times the turns bought 5.8× the tokens"
          sub="Median input tokens by turn count. Per-turn cost roughly triples between turn 3 and turn 6 — this is the re-sending effect measured rather than asserted."
          source={
            <>
              MEASURED HERE — same 893 rows, grouped by turns. n = 322, 30, 30 and 7 respectively; the
              12-turn row is seven runs and is the thinnest number on this page.
            </>
          }
        >
          <BarRows
            rows={[
              { label: '3 turns · n=322', value: 14094, display: '14,094', note: '4,698 per turn' },
              { label: '6 turns · n=30', value: 81751, display: '81,751', note: '13,625 per turn' },
              { label: '9 turns · n=30', value: 124383, display: '124,383', note: '13,820 per turn' },
              { label: '12 turns · n=7', value: 136174, display: '136,174', note: '11,348 per turn' },
            ]}
            labelWidth={170}
            axis="0 → ~136,000 median input tokens"
          />
        </Figure>

        <Key>
          One eval case — one fixed question, one fixed corpus — was logged 12 times and ranged from 6 to 12
          turns and from 27,023 to 136,174 input tokens. Five times the cost, with nothing about the question
          changed. Cost is not a number per question; it is a distribution per question, and the tail is where
          the money goes.
        </Key>
      </Step>

      <Step n={3} title="The tool description is the prompt, and it is usually written last">
        <P>
          The model chooses a tool by reading its description. Not your architecture diagram, not your
          intentions — the string in <code className="font-mono text-[0.9em] text-ui-fg">description</code>.
          So the description is not documentation. It is the routing policy, and it is where the domain
          judgment lives.
        </P>

        <HowItWorks
          title="What a tool description has to carry"
          path="apps/ai/insurance/src/tools/search-guidance.tool.ts:82–98"
          plain={[
            'It names the boundary against its sibling tool, in capitals: do NOT use this to decide what a policy pays — that is search_policy.',
            'It states a rule of legal authority the model could not infer from any single document: a bulletin binds the adjuster, not the contract, and cannot change a coverage term.',
            'It states a conditional: a prior determination is authority for a later claim only where the wording matched.',
            'And the last line is the one to steal. "A document may be dead while its own text says nothing about it" tells the model something true about the CORPUS that no individual result could reveal. A tool description is where you say what cannot be learned from one result.',
          ]}
          lines={[
            "description:",
            "  \"Search the insurer's GUIDANCE and claim HISTORY: adjuster bulletins, \" +",
            "  'Department of Insurance circulars, claims handling procedures, ' +",
            "  'underwriting manuals, prior claim determinations and coverage ' +",
            "  'opinions. ' +",
            "  'Use this for how a claim must be HANDLED, what documentation is ' +",
            "  'required, what deadlines apply, or what was decided on an earlier ' +",
            "  'claim. ' +",
            "  'Do NOT use it to decide what a policy PAYS \u2014 that is search_policy. ' +",
            "  'A bulletin binds the adjuster, not the contract, and cannot change a ' +",
            "  'coverage term. A prior determination is authority for a later claim ' +",
            "  'only where the policy in force then used the same wording as the ' +",
            "  'policy in force now. A coverage opinion is advice and binds nobody. ' +",
            "  'Pass jurisdiction whenever you know the rated state: a circular in ' +",
            "  'one state does not reach a policy issued in another. ' +",
            "  'Superseded and withdrawn documents are excluded unless you ask for ' +",
            "  'them; a document may be dead while its own text says nothing about it.',",
          ]}
          mark={[8, 9, 16]}
          trap="The same principle already has a check behind it one level up: every field of the answer schema carries a .describe() string, and pnpm schema:check fails if a field loses one, because those strings are prompt engineering rather than documentation. No equivalent check guards the tool descriptions."
        />
      </Step>

      <Step n={4} title="Two failures that look like the model and are not">
        <P>
          <strong className="font-medium text-ui-fg">A routing failure looks exactly like a reasoning
          failure.</strong> “Does a total loss settlement include sales tax?” is answered by a circular, but
          it <em>sounds</em> like a coverage question — so the model may call{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">search_policy</code> alone, read “actual cash
          value”, and never learn the circular exists.
        </P>
        <P>
          The output is a confident, well-written, wrong answer, correctly reasoned from the documents it was
          given. Every instinct says the model is dumb and the prompt needs work. The prompt is fine. The
          model never saw the document.
        </P>

        <Key>
          Which is why a <Term def="A record of which tools were called, with what arguments, in what order.">trace</Term>{' '}
          is the primary instrument in an agentic system rather than a debugging luxury. “Which tools were
          called, with what arguments” is answerable in one line. “Why did the model think that” is not
          answerable at all.
        </Key>

        <P>
          The second one is the turn cap. The symptom is an incomplete or hedged answer; the cause is a{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">while</code> loop that stopped, and nothing in
          the output says so.
        </P>

        <Figure
          title="A cap that bites is an infrastructure failure wearing a model failure’s clothes"
          sub="The rideshare case was observed finishing at 7 and 8 turns against a cap of 8 — so it was failing on the budget, not on judgment. Raising the cap to 12 costs nothing on a question that finishes in 3, because the loop exits when the model answers."
          source="MEASURED HERE — packages/agent/src/core/loop.types.ts, raised 8 → 12 on 2026-09-05, PROGRESS.md issue #2."
        >
          <Funnel
            stages={[
              { n: 12, label: 'the cap today', why: 'set by what the worst legitimate question needs' },
              { n: 8, label: 'the cap that bit', op: '←', why: 'cov-002 was observed finishing at 7 and 8' },
              { n: 3, label: 'a typical question', op: '←', why: 'the loop stops the moment the model answers' },
            ]}
            note="One cap, in one place. Two call sites with two caps would make the eval suite's central claim — that it takes exactly the path a real request takes — false, silently, in the component whose whole job is to be trustworthy."
          />
        </Figure>
      </Step>

      <Step n={5} title="Where this repo actually sits">
        <Figure
          title="The survey’s taxonomy, and which rows are honestly ours"
          kind="illustration"
          sub="The rows are the survey’s categories. The verdicts are this repo’s own reading of itself, which is an assessment rather than a measurement — nothing here came off a run."
          source={
            <>
              The taxonomy is from <em>Agentic Retrieval-Augmented Generation: A Survey</em>, arXiv:2501.09136,
              fetched 2026-09-15. The placements are docs/rag/AGENTIC.md §7.
            </>
          }
        >
          <Matrix
            rowHeader="pattern"
            marks={EITHER_OR}
            columns={['built here']}
            rows={[
              { name: 'single-agent router', cells: [{ state: 'live', detail: 'both engagements' }] },
              { name: 'multi-hop / decompose', cells: [{ state: 'wired', detail: 'emergent — 10 searches on the rideshare question' }] },
              { name: 'self-reflection', cells: [{ state: 'wired', detail: 'a contract, not learned tokens' }] },
              { name: 'corrective', cells: [{ state: 'wired', detail: 'gates, not a graded evaluator — see lesson 2' }] },
              { name: 'adaptive', cells: [{ state: 'refuses', detail: 'every question takes the same path' }] },
              { name: 'multi-agent', cells: [{ state: 'wired', detail: 'fan-out plus a summariser — two roles, not a conversation' }] },
              { name: 'hierarchical', cells: [{ state: 'refuses', detail: 'not attempted' }] },
            ]}
            footnote="Nothing in this grid is a fault, so nothing in it takes a severity colour. “No” means this repo does not do that, not that something is broken."
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:assess-all', does: 'the work list across the whole bid — spends nothing', cost: 'free' },
          { cmd: 'pnpm compliance:check', does: 'asserts store:false, no server-side state, tracing off', cost: 'free' },
          { cmd: 'pnpm steering:assess CR-K2-0101 --trace', does: 'one requirement with every tool call printed', cost: 'money' },
          { cmd: 'pnpm ask', does: 'the insurance loop against one question', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “Then how do you budget for it?” On the tail, not the average. Two tool calls is the most common
            run and about one question in seven makes six or more — so the number that matters is the 90th
            percentile, and if that is unaffordable the fix is better tool descriptions before it is a smaller
            model.
          </>
        }
      >
        Instead of searching once and handing the model whatever came back, we let it call search itself, read
        the results, and search again. On one question it ran ten searches — hunting for “livery” and “for
        hire”, words the customer never typed — and found the clause. The cost of that is the thing to
        understand: every turn re-sends the whole conversation, so three times the turns cost us 5.8 times the
        tokens. The same question, logged twelve times, ranged from 27,000 to 136,000 tokens. Nothing about
        the question changed.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: '893 runs is a lot of rows and a narrow range of questions.',
            body: 'They come from two engagements and a handful of question shapes, run mostly by an eval suite. The distribution is real; whether it is the distribution YOUR questions would produce is not something this measures.',
          },
          {
            claim: 'The 12-turn row is seven runs.',
            body: 'It is the thinnest number on the page and it is the one the "5.8×" headline leans on at the far end. The 3-turn and 6-turn rows — 322 and 30 runs — carry the claim; the last row is consistent with it rather than evidence for it.',
          },
          {
            claim: 'The taxonomy grid is self-assessment.',
            body: 'Nobody outside this repo scored those rows, and "emergent" and "nearly" are judgements about our own code. Treat it as a map of intent, not a result.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'agentic RAG', def: 'Retrieval exposed to the model as a tool it may call, rather than a step that runs before it.' },
          { word: 'turn', def: 'One trip to the model. A loop that makes four tool calls takes at least five turns, and every one of them re-sends the whole conversation.' },
          { word: 'turn cap', def: 'The maximum number of trips before the loop gives up. 12 here, raised from 8 after a case was observed failing on the budget rather than on judgment.' },
          { word: 'routing failure', def: 'The model calling the wrong tool and answering confidently from the wrong family of documents. Indistinguishable from bad reasoning without a trace.' },
          { word: 'trace', def: 'The record of which tools were called with which arguments. The first thing to read when an agentic answer is wrong.' },
        ]}
      />
    </LessonPage>
  );
}
