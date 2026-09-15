/**
 * Beyond lesson 1 — the window is a budget.
 *
 * A READING OF `docs/beyond-retrieval/CONTEXT.md`.
 *
 * FIG-CTX-2 IS NOT DRAWN HERE, AND THAT IS THE POINT OF THE OMISSION. It is the
 * same measurement as FIG-AGT-6 on `/learn/agentic` — 893 runs, median input
 * tokens by turn count. Drawing it twice would be two renderings of one number,
 * which is the FIG-HYB-2 mistake the RAG track already made and removed. The
 * step points across instead.
 *
 * FIG-CTX-3 IS AN `illustration` AND NOT A `cited` FIGURE, which looks wrong
 * until you read the source note: Liu et al. report the U-curve across several
 * settings rather than as one canonical five-point series, so the SHAPE is
 * theirs and the five points are this page's reading of it. Badging it `cited`
 * would claim a precision the paper does not offer for these exact values —
 * which is the failure `cited` was added to prevent, pointed the other way.
 */
import { Link } from '@tanstack/react-router';
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Context() {
  return (
    <LessonPage slug="context">
      <Step n={1} title="Not what you write, but what is in the window at all">
        <P>
          Prompt engineering is writing a good instruction. Context engineering is deciding what is in the
          window at all — and, increasingly, what to take out. It became its own discipline because of one
          empirical fact that contradicts what everyone assumed when windows started growing:{' '}
          <strong className="font-medium text-ui-fg">a bigger window is not a proportionally better one.</strong>
        </P>
        <P>
          You cannot treat the context as a bucket that holds N tokens equally well. It holds them{' '}
          <em>unevenly</em>, it holds them <em>worse as it fills</em>, and both effects have been measured.
        </P>

        <Figure
          title="What is in the window, every single turn"
          kind="illustration"
          sub="Four things, and only the last one moves. A drawing of the insurance loop — the counts beside it are real, but the shape is the teaching."
          source="packages/agent/src/core/loop.types.ts and the insurance prompt at apps/ai/insurance/src/prompts/coverage-prompt.ts, 148 lines."
        >
          <Stages
            stages={[
              { verb: 'system', out: '148 lines', does: 'the prompt. Fixed. Not why your bill is large.' },
              { verb: 'tools', out: '3 schemas', does: 'every field’s .describe() string ships every turn' },
              { verb: 'contract', out: 'CoverageAnswerSchema', does: 'the shape the answer must satisfy' },
              {
                verb: 'history',
                out: 'grows every turn',
                does: 'THE WHOLE CONVERSATION, RE-SENT',
                rule: 'This is the one that moves. Steering’s prompts are 242, 87 and 77 lines and are not the reason either.',
              },
            ]}
          />
        </Figure>

        <Key>
          The growth is all in the fourth row.{' '}
          <Link to="/learn/agentic" className="underline decoration-ui-line underline-offset-4 hover:text-ui-fg">
            Lesson 3 of the patterns track
          </Link>{' '}
          draws that measurement — 3× the turns bought 5.8× the tokens over 893 logged runs — and it is not
          redrawn here, because one measurement gets one chart.
        </Key>
      </Step>

      <Step n={2} title="Two findings that should change how you build">
        <P>
          <strong className="font-medium text-ui-fg">Lost in the middle.</strong> Across multi-document QA
          and key-value retrieval, performance is highest when the relevant information sits at the beginning
          or the end of the input, and degrades significantly when the model has to find it in the middle —
          and it falls as the context grows, <em>even for explicitly long-context models</em>.
        </P>

        <Figure
          title="Where the answer sits decides how well it is read"
          kind="illustration"
          sub="The trough in the middle is the finding. These five points are a reading of the shape, not a table from the paper — see the source line."
          source={
            <>
              The shape is Liu et al., <em>Lost in the Middle: How Language Models Use Long Contexts</em>,
              TACL 2024, arXiv:2307.03172, fetched 2026-09-15. The paper reports the U-curve across several
              settings rather than as one canonical five-point series, so these values illustrate its shape
              rather than quoting it — which is why this figure is not badged as a citation.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'answer 1st of 20', value: 100, display: '100', note: 'the strongest position' },
              { label: 'answer 5th', value: 76, display: '76' },
              { label: 'answer 10th', value: 71, display: '71', note: 'the trough — the middle is worst' },
              { label: 'answer 15th', value: 78, display: '78' },
              { label: 'answer 20th', value: 92, display: '92', note: 'recency recovers most of it' },
            ]}
            labelWidth={190}
            axis="relative accuracy, best position = 100"
          />
        </Figure>

        <Key>
          The consequence is blunt: the order you paste retrieved passages in is a design decision, not a
          formatting detail. If six passages come back and one of them is the answer, putting it fourth is
          worse than putting it first — and your retriever’s ranking is what decides that.
        </Key>

        <P>
          <strong className="font-medium text-ui-fg">Context rot.</strong> Eighteen frontier models tested,
          and every one degraded on longer inputs — including on trivially easy copy-and-retrieve tasks where
          difficulty was held constant and only length changed. The finding that should unsettle you most:{' '}
          <strong className="font-medium text-ui-fg">models performed better on shuffled haystacks than on
          logically coherent documents</strong>, across all eighteen. Nobody has a satisfying explanation,
          and it directly contradicts the intuition that a well-organised context is an easier one.
        </P>

        <Key>
          The mechanism offered for it is an attention budget: a transformer creates n² pairwise
          relationships for n tokens, so as context lengthens the ability to capture them gets stretched thin
          — a performance gradient rather than a hard cliff. Treat the window as a budget you are spending,
          not a container you are filling. Every token you add makes every other token slightly less
          effective.
        </Key>
      </Step>

      <Step n={3} title="The best lesson here is not about size at all">
        <P>
          Every engine ran the same twenty-five lines to decide when the loop was finished, ending in the
          same retry sentence — written out three times.
        </P>

        <HowItWorks
          title="Why a retry sentence lives in one file"
          path="packages/agent/src/core/settle.ts:1–22"
          plain={[
            'When the model returns something that does not satisfy the schema, it gets told so and asked again. That sentence is the same for all three engines, and it used to exist as three copies.',
            'A sentence that reaches the model is a PROMPT, whatever file it lives in. Three copies means one of them can be improved, typo-fixed, or reworded by a find-and-replace that misses a file.',
            'And from that moment an engine comparison is partly measuring a prompt difference while reporting it as an engine difference. eval:diff cannot catch it, because the engine is part of the setup key and the two runs are never compared directly.',
            'What is deliberately NOT shared is how the retry gets back to the model — the three engines genuinely do three different things there, so each keeps its own line. It just no longer keeps its own copy of the sentence.',
          ]}
          lines={[
            '/**',
            ' * When is the loop finished, and what does a schema failure cost?',
            ' *',
            ' * WHY THIS IS SHARED AND NOT COPIED, and it is a correctness argument rather',
            ' * than a tidiness one. Every engine ran the same twenty-five lines here, ending',
            ' * in the same retry sentence written out three times:',
            ' *',
            ' *     "Your previous response did not satisfy the required schema: …"',
            ' *',
            ' * That sentence is a PROMPT. Three copies means one of them can be improved, or',
            ' * typo-fixed, or reworded by a find-and-replace that misses a file — and from',
            ' * then on an engine comparison is partly measuring a prompt difference while',
            ' * reporting it as an engine difference. `eval:diff` would not catch it: the',
            ' * engine is part of the setup key, so the two runs are never compared directly.',
            ' * The whole reason three engines exist is that a diff between them means',
            ' * something, and this is the single place that claim was quietly untrue.',
            ' *',
            ' * WHAT IS DELIBERATELY *NOT* HERE: how the retry gets back to the model. The',
            ' * Agents SDK appends a user message to `result.history`, Mastra re-sends one',
            ' * string, LangGraph pushes a `HumanMessage` onto the accumulated list. Those',
            ' * are genuinely three different things, so each engine keeps its own line — it',
            ' * just no longer keeps its own copy of the sentence.',
          ]}
          mark={[9, 11, 13]}
          trap="A duplicated prompt string is a measurement bug rather than a style problem. Two copies drift, and from then on the A/B is partly measuring the drift while reporting it as the thing you meant to compare."
        />

        <Key>
          Every string that reaches the model is a prompt — error messages, tool descriptions, empty-result
          notes, retry instructions. None of those look like prompt engineering in a code review, and all of
          them change behaviour. The empty-result note in the guidance tool is the same idea one level out,
          and it costs about forty tokens.
        </Key>
      </Step>

      <Step n={4} title="Four techniques, and which of them are actually here">
        <Figure
          title="The long-horizon techniques, against what is running"
          kind="illustration"
          sub="A self-assessment, not a measurement. Two of the four are simply absent, and the reason the first is absent is that something else stops the loop sooner."
          source={
            <>
              The technique list is Anthropic, <em>Effective context engineering for AI agents</em>, fetched
              2026-09-15. The verdicts are docs/beyond-retrieval/CONTEXT.md §5.
            </>
          }
        >
          <Matrix
            rowHeader="technique"
            marks={{
              live: { glyph: '●', word: 'built here', colour: 'var(--lesson)' },
              wired: { glyph: '◐', word: 'partly', colour: 'var(--color-ui-faint)' },
              refuses: { glyph: '—', word: 'not built', colour: 'var(--color-ui-faint)' },
            }}
            columns={['in this repo']}
            rows={[
              {
                name: 'compaction',
                cells: [{ state: 'refuses', detail: 'the 12-turn cap stops the loop first' }],
                explain: {
                  what: [
                    'When the conversation is about to outgrow the window, you stop, ask the model to summarise everything that has happened so far, throw the transcript away, and start again from the summary.',
                    'The agent keeps going with a much smaller history. What it loses is detail: anything the summary left out is gone for good, and the model cannot know what it no longer knows.',
                    'It is the technique that buys the longest-running agents, and it is the one that quietly discards evidence — which is why it belongs to tasks that run for hours rather than to a question answered in three turns.',
                  ],
                  example: {
                    caption: 'what compaction would look like in this loop',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      'if (estimateTokens(history) > COMPACT_AT) {',
                      '  const summary = await model.summarise(history);',
                      '  // the transcript is gone from here on — only this survives',
                      '  history = [systemPrompt, { role: \'assistant\', content: summary }];',
                      '}',
                    ],
                  },
                  why: 'Nothing here runs long enough to need it. The loop stops at 12 turns, and the longest run measured — 12 turns, 136,174 input tokens — is a fraction of the window it is sent to. Compaction solves a problem the turn cap reaches first.',
                },
              },
              {
                name: 'structured note-taking',
                cells: [{ state: 'refuses', detail: 'no external memory anywhere' }],
                explain: {
                  what: [
                    'The agent writes notes to a file outside the conversation, and reads them back when it needs them. The window holds what is being worked on now; the file holds everything else.',
                    'It is the difference between remembering a whole meeting and keeping minutes. The notes survive the context being cleared, and they can outlive the session entirely.',
                    'It also turns memory into something you can inspect — a file a person can open and read is a very different debugging surface from a transcript inside a model’s context.',
                  ],
                  example: {
                    caption: 'the shape of an external note store',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      '// the agent is given two more tools, and the file is the memory',
                      "tool('write_note', { key: z.string(), body: z.string() })",
                      "tool('read_note',  { key: z.string() })",
                      '',
                      '// NOTES.md after three turns of a long-running task:',
                      '//   ## ruled out',
                      '//   - supplier B: no shipments in the affected window',
                    ],
                  },
                  why: 'There is no external memory anywhere in this repo. Every run starts cold and ends when it answers — nothing is carried between questions, by design, because nothing here is a long-running task.',
                },
              },
              {
                name: 'sub-agent windows',
                cells: [{ state: 'live', detail: 'fanout.ts — lesson 4 of this track' }],
                explain: {
                  what: [
                    'Instead of one agent reading everything in one window, several agents each work in their own window on one piece, and return a short result.',
                    'The parent never sees the raw material the children read — only what each one hands back. Twenty-four requirements can be assessed without any window ever holding twenty-four requirements’ worth of evidence.',
                    'It is the only one of these four techniques that is running here, and it is the subject of lesson 4 of this track.',
                  ],
                  example: {
                    caption: 'packages/agent/src/core/fanout.ts — the real shape',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: [
                      '# one agent per requirement, each in its own window',
                      'pnpm steering:assess-all --run',
                      '#   → 24 structured assessments, each cited',
                      '',
                      '# a second, smaller agent reads only the finished assessments',
                      'pnpm steering:summarise',
                    ],
                  },
                  why: 'Measured: a fan-out turn costs 1,439 tokens against a single loop’s 11,348, because fan-out turns do not accumulate a shared history. Lesson 4 has the numbers.',
                },
              },
              {
                name: 'prompt caching',
                cells: [{ state: 'wired', detail: 'cachedInputTokensOf measures it; not enabled' }],
                explain: {
                  what: [
                    'The first part of what you send is identical on every turn — the system prompt, the tool schemas, the contract. The provider can keep it and charge you less for re-sending it.',
                    'It matches on an exact prefix, so it cannot return a wrong answer: either the bytes are identical and it is reused, or they are not and nothing happens. That is what makes it the safe cache.',
                    'It is an economic technique rather than an attention one. It does not make the window hold more or read it better — it makes re-sending it cheaper.',
                  ],
                  example: {
                    caption: 'packages/agent/src/core/usage.ts — what is measured today',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      '// returns undefined when no turn reported any — NOT 0,',
                      '// because "the engine does not say" is not "the cache never helped"',
                      'cachedInputTokensOf(run)   // → undefined | number',
                    ],
                  },
                  why: '“Partly” because the measurement exists and the feature does not. The reading is wired through the telemetry and nothing turns caching on, so every number this repo reports is a ceiling rather than a bill.',
                },
              },
            ]}
            footnote="Nothing in this grid is a fault, so nothing takes a severity colour. “Not built” is a description of this repo, not a defect in it."
          />
        </Figure>

        <HowItWorks
          title="What a cache measurement does when the engine says nothing"
          path="packages/agent/src/core/usage.ts:12–31"
          plain={[
            'Not every engine reports how many input tokens came from a cache. The interesting part of this function is what it does when none of them did.',
            'If no turn reported any, it returns undefined — meaning "this engine does not say" — rather than 0. Returning 0 would claim the cache never helped, which is a finding about an engine rather than the absence of one.',
            'If some turns reported and others did not, it sums the ones that did and counts the silent ones as zero. That understates the cache and therefore OVERSTATES the cost, deliberately.',
            'The direction of the error is the design: a cost that is too high gets questioned, and a cost that is too low gets quoted.',
          ]}
          lines={[
            '/**',
            ' * Cached input tokens across a run, or `undefined` if no turn reported any.',
            ' *',
            ' * THE RULE, and the direction it errs in:',
            ' *',
            ' *   no turn reported    → `undefined`, meaning "this engine does not say".',
            ' *                         The cost stays a ceiling. Returning 0 here would',
            ' *                         claim the cache never helped, which is a finding',
            ' *                         about an engine rather than the absence of one.',
            ' *',
            ' *   some turns reported → the sum of those that did, counting the silent ones',
            ' *                         as zero. That UNDERSTATES the cache, and therefore',
            ' *                         OVERSTATES the cost. Deliberate: a partial reading',
            ' *                         should land on the side of the ceiling, because a',
            ' *                         cost that is too high gets questioned and a cost',
            ' *                         that is too low gets quoted.',
            ' *',
            ' * Turn 1 legitimately reports 0 on every engine — nothing has been sent yet, so',
            ' * there is nothing to reuse. A run whose total is 0 across a SINGLE turn says',
            ' * nothing about whether caching works; the signal lives in turn 2 onward.',
          ]}
          mark={[5, 11, 15]}
          trap="A run whose cached total is 0 across a single turn says nothing at all about whether caching works — turn 1 has nothing to reuse by definition. The signal only exists from turn 2 onward, and reading the first number as evidence is the mistake this comment exists to stop."
        />
      </Step>

      <Step n={5} title="Just in time, rather than up front">
        <Figure
          title="Why pre-loading was never an option here"
          kind="illustration"
          sub="A drawing of the shape, with real counts on it. The last two rows hold the same number and that is the point — what reaches the window is re-sent on every subsequent turn."
          source="docs/beyond-retrieval/CONTEXT.md §6. Passage count from docs/steering/evals/RETRIEVAL.md."
        >
          <Funnel
            stages={[
              { n: 3854, label: 'passages in the corpus', why: 'pre-loading is not an option at this size' },
              { n: 24, label: 'fetched by the fuser', op: 'over-fetch' },
              { n: 6, label: 'returned by the tool', op: 'gate + top-k' },
              { n: 6, label: 'in the window', why: 'and re-sent on every subsequent turn' },
            ]}
          />
        </Figure>

        <P>
          The agent decides what to pull in and when, rather than receiving everything a question might need
          before it has read the question. That is the same argument as{' '}
          <Term def="Retrieval exposed to the model as a tool it may call, rather than a step that runs before it.">
            agentic retrieval
          </Term>
          , seen from the cost side instead of the capability side.
        </P>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm chunks', does: 'the corpus and its chunking, offline', cost: 'free' },
          { cmd: 'pnpm compliance:check', does: 'what actually goes up in a request', cost: 'free' },
          { cmd: 'pnpm ask', does: 'one question, and the history that accumulates behind it', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “So should we buy the bigger window?” It will not hurt, and it is not the lever. The measured
            gradient says quality falls as you fill whatever window you have, so the thing to spend on is
            fewer and better passages in a good order — and the thing actually filling ours is the
            conversation history, not the prompt.
          </>
        }
      >
        A bigger context window is not a proportionally better one. Two separate studies say so: where a
        passage sits in the window changes how well it is read — first and last are strong, the middle is the
        trough — and every one of eighteen models tested got worse as the input got longer, even on trivial
        tasks. One of them found models did better on shuffled text than on well-organised documents, which
        nobody can explain. So the order we paste passages in is a design decision. And what fills our window
        is not the prompt — ours is 148 lines — it is the conversation being re-sent on every single turn.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'Both headline findings are other people’s measurements.',
            body: 'Liu et al. on their benchmarks, Chroma on theirs. Nothing in this repo has reproduced either, and the position effect has not been tested against our own six-passage context.',
          },
          {
            claim: 'The U-curve figure is a reading of a shape, not a table.',
            body: 'The paper reports the effect across several settings rather than one canonical series. The five points illustrate it; they are not quotable as the paper’s numbers, which is why the figure is badged as a drawing.',
          },
          {
            claim: 'The technique grid is self-assessment.',
            body: 'Nobody outside this repo scored those rows. “Not built” means we did not build it, not that it would not help.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'context engineering', def: 'Curating what occupies the context window during inference — system instructions, tools, external data, history — as distinct from writing a good prompt.' },
          { word: 'lost in the middle', def: 'The measured effect where information at the start or end of a long input is used better than information in the middle.' },
          { word: 'context rot', def: 'The measured degradation of output quality as input length grows, holding task difficulty constant.' },
          { word: 'compaction', def: 'Summarising a conversation at the context limit and reinitialising from the summary. Not built here — the turn cap arrives first.' },
          { word: 'prompt caching', def: 'Paying less for the prefix you re-send every turn. Measured here, not enabled.' },
        ]}
      />
    </LessonPage>
  );
}
