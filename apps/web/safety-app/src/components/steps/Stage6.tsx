/**
 * Stage 6 — the loop, and the first stage whose answer is not the same twice.
 *
 * ── SIX STEPS, EACH IN THE SAME FIVE PARTS ────────────────────────────────
 *
 * Since the redesign of 2026-09-27 this file is one `PhaseHead` and six `Step`s
 * (see `kit.tsx`). It used to be laid out by topic, in nine chapters; every
 * topic now lives in the step it belongs to:
 *
 *   6.1  the menu — five tools a model can confuse, the seam checks, and the
 *        three engines (two reach the model; the default refuses it by name)
 *   6.2  the loop in plain words, the three-turn walk (`Journey`), the negative
 *        check, the four timings. `LoopModal` is its "under the hood".
 *   6.3  the contract at answer time, and the faults found by reading answers
 *   6.4  the date nobody typed, and the escalation four runs did not make
 *   6.5  REC-005: an absence proved by an empty search
 *   6.6  pacing, the detector that printed PASS, the full pass, and the
 *        model-routed recall range with its per-case record
 *
 * ── 6.5 AND 6.6 ARE BUILT, WHATEVER STAGE6.md's TABLE STILL SAYS ─────────
 *
 * STAGE6.md opens "6.6 remains" and its table marks 6.6 "next". Both are
 * stale. 6.6 ran on 2026-09-17 (`pnpm safety:run-all`, commit 2a46d8e): eight
 * asked, eight answered, no quota failure, 842s — STAGE7.md §5 quotes it. 6.5
 * never had a command of its own: REC-005 is the only question where rule 6
 * can fire, so it became 6.3's gate inside `pnpm safety:ask`, and its step
 * says so rather than implying a separate run.
 *
 * ── ONE GREEN RUN IS A SMOKE TEST, NOT A SCORE ────────────────────────────
 *
 * The same question can now give two answers and neither is a bug. The four
 * timings in 6.2 — all correct, one thirteen times slower than another — are
 * the argument, and they make it better than a sentence could. And 6.6's
 * "eight of eight answered" grades nothing: it says the key can be ASKED. It
 * must never sit where a score would.
 *
 * ── THE GAP IS THE WHOLE STAGE, AND IT IS A RANGE ─────────────────────────
 *
 * 4.5 measured a CEILING of 1.00 with the tools called by hand. A model doing
 * the routing reaches 0.17 to 0.50 — A RANGE RATHER THAN A POINT, because the
 * runs disagree and a mean would be 0.28, which nothing measured.
 *
 * THE SLOT EARNED ITS KEEP TWICE BEFORE IT WAS FILLED. It refused a number
 * nobody had, and then refused stage 7's 26-of-28 (28 of 28 by its last
 * baseline), which is an answer score rather than a retrieval one. Both are
 * large and good and about different things, which is exactly the confusion it
 * was drawn to prevent — so stage 7's numeral is never rendered on this tab,
 * only a sentence under the range saying its score is about answers.
 *
 * AND THE RANGE IS THE LEAST INTERESTING PART, so the per-case table travels
 * with it. Two of the three cases never move; all the spread is REC-004, and
 * there it is all or nothing. REC-005 scores a stable zero while answering
 * correctly every time, because it proves an absence with an empty search and
 * a measure of retrieved documents has nothing to count.
 *
 * AND IT IS DATED. Measured 2026-09-18 at 03:53, before stage 7's fix that made
 * REC-004 fetch a complaint to quote (aa22b17, 04:15), and not re-run since.
 * "Stage 7 saw the same behaviour at the same frequency" is true of the
 * baseline BEFORE that fix, and the page ties it to that baseline.
 *
 * ── AND THE DETERMINISM ENDS HERE ─────────────────────────────────────────
 *
 * Stages 1 to 5 give the same output for the same input and were each checked
 * against something sharing no code. From here the same question asked twice can
 * give two different answers and neither is a bug. The value of the five stages
 * underneath is that when something looks wrong, retrieval, counting and the
 * contract are each already known to be sound.
 *
 * Sources: `docs/safety/STAGE6.md`, `STAGE7.md`, `INGESTION.md` (the routed
 * recall), `docs/ENGINES.md`, and the commits named beside each figure.
 */
import type { ReactNode } from 'react';
import { Code, Data, Journey } from '@veresk/surface';
import { LOOP_TURNS } from '../../pages/loop-turns';
import { TITLES, WHEN } from '../../lib/steps';
import { BeforeAfter, Figure, Note, Numbers, Raw, Step, Table } from './kit';
import { PhaseHead } from './Tabs';
import { Hood, HoodSection, HoodText } from './Hood';
import { LoopModal } from './LoopModal';

export function Stage6() {
  return (
    <>
      <PhaseHead
        stage="6"
        title="Where a model is finally asked"
        what={
          <>
            <p>
              Everything up to here runs <em>without</em> a model: the search,
              the five tools, the contract that checks an answer. By the end of
              this stage a model reads a fleet analyst’s question, decides which
              tools to ask for, and writes an answer the contract accepts — for
              all eight questions in the answer key, paced so the free tier
              drops none of them.
            </p>
            <p>
              It is also the first stage whose answer is not the same twice.
              Every part it uses had already been checked. What had never been
              tested is whether a model <strong>asks for the right things</strong>.
            </p>
          </>
        }
        result={
          <>
            <p>
              On the three questions whose answers are documents to find, a
              person choosing the tools reached every one the key names: recall@6
              of <strong>1.00</strong>, stage 4’s ceiling. With the model
              choosing, three runs gave <strong>0.17 to 0.50</strong> —
              a range, not a score, and not its mean (0.28, which no run
              produced). Two of the three questions never move, and one of those
              scores zero while answering correctly. All of the spread is the
              third.
            </p>
            <p>
              Separately, all eight questions were asked end to end in one paced
              pass of 842 seconds. That shows the key can be asked. It grades
              nothing — grading is stage 7.
            </p>
          </>
        }
      />
      <div className="mt-10 grid gap-8">
        <Step61 />
        <Step62 />
        <Step63 />
        <Step64 />
        <Step65 />
        <Step66 />
      </div>
    </>
  );
}

/* ── 6.1 · THE MENU ───────────────────────────────────────────────────────── */

/**
 * The five tools are easy to confuse, and confusing them is the real risk.
 *
 * Quoted from the header of `agent/tools.ts`, which says the same thing to the
 * next person who edits a description.
 */
const CONFUSABLE: readonly { tool: string; want: string }[] = [
  { tool: 'get_recall', want: 'I know the campaign number' },
  { tool: 'find_recalls', want: 'I know the vehicle — is there a campaign?' },
  { tool: 'search_complaints', want: 'I want to read complaints' },
  { tool: 'count_complaints', want: 'I want how many, and must not count them myself' },
  { tool: 'complaints_citing', want: 'I want the complaints that name this campaign' },
];

function Step61() {
  return (
    <Step
      n="6.1"
      title={TITLES['6.1']}
      when={WHEN['6.1']}
      plain={
        <>
          <p>
            The model has no access to the database — no connection, no
            credentials, no way to run anything. All it can do is produce text,
            and one shape of that text is a <strong>request</strong>: “run{' '}
            <code>count_complaints</code> with make TESLA, model MODEL 3, at
            least one death”. Our code decides whether to honour it.
          </p>
          <p>
            This step writes the menu those requests are chosen from: five tools,
            each with a name, a sentence saying what it is for — and what it is
            not for — and a description of every argument. Then it checks the
            menu works the way a model will use it, by name and with untyped
            JSON, before any model has seen it.
          </p>
        </>
      }
      why={
        <>
          <p>
            The five tools are easy to confuse, and confusing them does not fail
            loudly. Ask the search when you meant the count and you get a number
            that is confidently wrong: the search hands back six examples, so
            counting those always gives six, whatever the real total is.
          </p>
          <p>
            And stage 4 called these tools as code, where the compiler guaranteed
            the arguments. A model guarantees nothing. It sends a name and a blob
            of JSON, both can be wrong, and both have to come back as something
            it can read and correct.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="Five tools, and the question each one answers" from="excerpt" source="apps/ai/safety/src/agent/tools.ts (its header)">
            <Table
              head={['Tool', 'Reach for it when…']}
              rows={CONFUSABLE.map((c) => [<code key="t">{c.tool}</code>, c.want])}
              lit={[3]}
            />
            <Note>
              The fix for picking the wrong one lives in how each tool describes
              itself, not in the prompt. A tool’s description is read at the
              moment of choosing; the prompt is read once, at the start.
            </Note>
          </Figure>

          <Figure caption="One tool, as the model reads it" from="excerpt" source="apps/ai/safety/src/agent/tools.ts">
            <Code
              path="apps/ai/safety/src/agent/tools.ts (two excerpts)"
              mark={[6, 7, 17]}
              lines={[
                'export const COUNT_COMPLAINTS_TOOL: Tool = {',
                '  schema: {',
                "    type: 'function',",
                "    name: 'count_complaints',",
                '    description:',
                "      'How MANY complaints match a filter. Returns a number and the filter that produced it, ' +",
                "      'and no complaints at all. USE THIS FOR EVERY NUMBER YOU REPORT — counting the results of ' +",
                "      'search_complaints gives you at most 6 and is wrong. Call it twice to separate a component ' +",
                "      'from a defect: once without `matching`, once with.',",
                '    parameters: countArgs,',
                '  },',
                '',
                '  // … and one of the filter arguments it shares with the search:',
                '  min_deaths: z',
                '    .number()',
                '    .int()',
                '    .optional()',
                `    .describe('At least this many deaths. Use 1 for "involving a death" — this is a FIELD, not a word to search for.'),`,
              ]}
            />
          </Figure>

          <Figure caption="What pnpm safety:tools checks, with no model at all" from="excerpt" source="apps/ai/safety/src/cli/tools.ts">
            <Table
              head={['The check', 'Why a model needs it']}
              rows={[
                ['All five are registered under the names the model will use', 'It asks by string, not by import'],
                ['Every tool and every argument carries a description', 'The description is the only thing telling it what to put there'],
                [<>Dispatch by name reaches <code>get_recall</code> and returns 20V197000</>, 'The model’s path, not the compiler’s'],
                [<><code>find_recalls</code> returns its empty answer, not an error</>, 'An empty result is an answer — step 6.5'],
                [<><code>count_complaints</code> returns 5 for Tesla Model 3 deaths</>, 'The answer key says 5'],
                ['An invented tool name comes back with the real names listed', 'It will invent one, and needs to be able to correct itself'],
                ['Wrong arguments come back as a message, not a crash', 'A crash three layers down teaches it nothing'],
                ['A value of the wrong type names the field that was wrong', 'The right idea in the wrong field is the likeliest mistake'],
              ]}
            />
            <Note>
              The registry looks a tool up and calls it; it does not check the
              arguments. So each tool parses its own, and a bad argument becomes
              a sentence the model can read.
            </Note>
          </Figure>

          <Figure caption="Which engine can reach the model" from="cited" source="docs/ENGINES.md §2 · measured 16 and 17 Sep 2026">
            <Table
              head={['Engine', 'With our model', 'Why']}
              rows={[
                [
                  'OpenAI Agents SDK — the default',
                  'Refuses, by name',
                  'It drives the Responses API, which only OpenAI and Azure implement. Gemini serves chat-completions, like every other OpenAI-compatible provider.',
                ],
                ['Mastra', 'Works', 'From the start: it builds its model against chat-completions.'],
                [
                  'LangGraph',
                  'Works, since 17 Sep',
                  'It used to fail. Two repairs on the wire, and the second fault was hidden behind the first.',
                ],
              ]}
            />
            <Note>
              The model is Google’s Gemini, <code>gemini-3.5-flash-lite</code>,
              reached on a hosted OpenAI-compatible endpoint. The default
              engine’s refusal is deliberate, not unfinished: it names what to
              use instead rather than failing oddly — or, worse, quietly
              answering with an engine nobody chose.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>The descriptions are the interface.</strong> “Never count
            the search results” is written into the count tool’s own
            description, “an empty result is a real answer” into{' '}
            <code>find_recalls</code>’s, and “the vehicle goes in a filter, not
            in the query” into the search’s. A vague description produces a
            tool called wrongly, which looks like a model problem and is a
            writing problem.
          </p>
          <p>
            <strong>Two of the three engines reach the model, and it took
            building three to find out why.</strong> The third was fixed on 17
            September with two repairs, and the second fault was invisible until
            the first was mended, because nobody had ever got past the first. A
            single-engine stack would have called both “the model does not
            support tools properly” and been wrong twice.
          </p>
          <p>
            And picking the cloud without picking the engine leaves the refusing
            one in place. <code>LOOP</code> is set beside{' '}
            <code>LLM_PROVIDER</code>: they are one decision, not two.
          </p>
        </>
      }
      terms={['agent', 'tool', 'loop', 'hostedModel', 'schema']}
      hood={
        <Hood
          blurb="How each tool reads its own arguments, the two repairs one engine needed, and why the picker refuses rather than substitutes"
          title="Inside step 6.1"
          sub="The seam between a model’s request and our code — and the engine that nearly didn’t work"
        >
          <HoodSection title="Each tool parses its own arguments">
            <HoodText>
              The schema is what gets <em>sent</em> to the model. The model is
              free to send something else back. So every tool’s{' '}
              <code>execute</code> parses first, and a bad argument becomes an
              error message that names the field — which goes back to the model
              as the result of its request, so it can try again.
            </HoodText>
            <Figure caption="The parse every tool runs first" from="excerpt" source="apps/ai/safety/src/agent/tools.ts">
              <Code
                path="apps/ai/safety/src/agent/tools.ts"
                mark={[5, 6]}
                lines={[
                  '/** Parse, and turn a bad argument into something the model can act on. */',
                  'function parsed<T>(schema: z.ZodType<T>, args: unknown, tool: string): T {',
                  '  const r = schema.safeParse(args);',
                  '  if (!r.success) {',
                  '    throw new Error(',
                  "      `${tool} was called with arguments it cannot use: ` +",
                  "        r.error.issues.map((i) => `${i.path.join('.') || '(root)'} — ${i.message}`).join('; '),",
                  '    );',
                  '  }',
                  '  return r.data;',
                  '}',
                ]}
              />
            </Figure>
          </HoodSection>

          <HoodSection title="The two repairs LangGraph needed">
            <HoodText>
              The first: Gemini attaches a <code>thought_signature</code> to every
              tool request it makes and requires it echoed back on the next turn.
              LangChain parses a tool call into the three fields the OpenAI spec
              defines, so the signature was dropped on the way in and could not
              be sent on the way out. The repair puts back something the provider
              itself sent.
            </HoodText>
            <HoodText>
              The second only appeared once the first was fixed. LangGraph shapes
              its final answer in a separate, extra call that replays the
              conversation — which ends with the model’s own words. Every other
              provider accepts that; Gemini requires the last turn to be the
              caller’s. The repair adds a one-word message the caller did not
              write (<code>"Continue."</code>), which is a different kind of act,
              so it runs only when <code>LLM_PROVIDER=hosted</code>.
            </HoodText>
            <Figure caption="The two errors, one after the other" from="cited" source="docs/ENGINES.md §2">
              <Data
                path="the two errors, and the request behind the second"
                mark={[0, 4]}
                lines={[
                  '400 Function call is missing a thought_signature in functionCall parts.',
                  'This is required for tools to work correctly … function call',
                  '`default_api:get_recall`, position 2.',
                  '',
                  '400 Requests ending with a model turn are not supported.',
                  '    roles: user > assistant > tool > assistant',
                  '    response_format: true · tools: 0',
                ]}
              />
            </Figure>
            <HoodText>
              Both live in <code>packages/agent/src/langgraph/hosted-round-trip.ts</code>,
              wrapped around the client’s <code>fetch</code> — the only place both
              halves of a round trip can be seen. <code>pnpm safety:round-trip</code>{' '}
              asserts them against a fake <code>fetch</code>, with a control for
              each, and needs no model call, so it cannot rot behind a quota.
            </HoodText>
          </HoodSection>

          <HoodSection title="Refused, not substituted">
            <HoodText>
              Asking for the default engine on this provider gets an error that
              says why. Quietly swapping in a working engine would answer with a
              system the person did not choose — and the answer would look
              completely fine, which is the worst shape a bug can take here.
            </HoodText>
            <Figure caption="The picker’s own check" from="excerpt" source="apps/ai/safety/src/agent/engines.ts">
              <Code
                path="apps/ai/safety/src/agent/engines.ts"
                mark={[1]}
                lines={[
                  '  if (!found.usable) {',
                  '    return { error: `${found.label} cannot serve LLM_PROVIDER=${provider()}. ${found.detail}` };',
                  '  }',
                  '',
                  "  // the Agents SDK's detail, on a hosted or local provider:",
                  "  // 'Drives the Responses API, which only OpenAI and Azure implement.",
                  "  //  It refuses by name rather than failing at the transport.'",
                ]}
              />
            </Figure>
          </HoodSection>
        </Hood>
      }
    />
  );
}

/* ── 6.2 · ONE QUESTION ───────────────────────────────────────────────────── */

/**
 * The loop, as a person would describe it.
 *
 * THE THIRD LINE IS THE ONE THAT MATTERS: the model waits, and never sees the
 * database. Most people assume it queries something. It produces text, and one
 * shape of text is a request that our code then honours.
 */
const LOOP: readonly { n: string; what: string; detail?: ReactNode }[] = [
  {
    n: '1',
    what: 'We send it the question, the rules, and the menu',
    detail: 'Five tool names, what each one is for, and exactly what arguments each takes.',
  },
  {
    n: '2',
    what: 'It replies with an answer — or with a request',
    detail: (
      <>
        “Call <code>count_complaints</code> with make TESLA, model MODEL 3, at least one death.”
      </>
    ),
  },
  {
    n: '3',
    what: 'If it asked for a tool, our code runs it',
    detail: 'The model waits. It never sees the database, only what comes back.',
  },
  { n: '4', what: 'We hand the result back as another message' },
  { n: '5', what: 'Repeat until it answers instead of asking' },
  {
    n: '6',
    what: 'The answer has to satisfy the contract',
    detail: 'If it does not, the errors go back and it tries again. We never repair it ourselves.',
  },
];

/**
 * The same two questions, same model, same wording, four runs in one afternoon.
 *
 * ALL FOUR ANSWERED CORRECTLY. Recorded in commit 716b222 (17 Sep 2026), which
 * says "the same two questions" — not one. `api.ask.tsx` lists a different set
 * of latencies from the same afternoon; the two lists are not merged here,
 * because they are not the same runs.
 */
const RUNS: readonly string[] = ['85.8s', '13.7s', '6.5s', '63.5s'];

function Step62() {
  return (
    <Step
      n="6.2"
      title={TITLES['6.2']}
      when={WHEN['6.2']}
      plain={
        <>
          <p>A question goes through the loop in six moves:</p>
          <ol className="my-3.5 grid gap-2.5">
            {LOOP.map((l) => (
              <li key={l.n} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
                <span
                  className="mt-0.5 grid h-7 w-7 place-items-center rounded-full border-2 border-cal-1 bg-cal-1/15 text-[0.8125rem] font-bold text-ui-fg"
                  aria-hidden
                >
                  {l.n}
                </span>
                <p>
                  <strong>{l.what}.</strong>
                  {l.detail && <> {l.detail}</>}
                </p>
              </li>
            ))}
          </ol>
          <p>
            The model is not doing the work. It is deciding what work to ask
            for.
          </p>
          <p>
            The first question it was given is REC-002, “What does recall
            20V197000 cover?” — and this step’s check is about what did{' '}
            <em>not</em> happen. The lookup has to run, and the search must not
            run at all.
          </p>
        </>
      }
      why={
        <>
          <p>
            One question before eight, because the first model call always fails
            in a way nobody predicted, and one question is the cheapest place to
            read it.
          </p>
          <p>
            The check is a negative because the positive would pass a model that
            had misunderstood the tools. Searching for that campaign number
            returns it at position 4, so a model that searched instead of looking
            it up would still write a mostly right answer — the text would read
            fine and the method would be wrong. Only the record of which tools
            ran shows the difference.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="One question through the loop, turn by turn" source="a recorded run on gemini-3.5-flash-lite · pages/loop-turns.ts">
            <Journey turns={LOOP_TURNS} />
            <Note>
              This walk is a different, free-form question — “are there
              complaints about deaths on the Tesla Model 3?” — shown because it
              takes three turns and makes plain what crosses. Turn 2 sends out
              one number. Turn 3 sends out five people’s accounts of fatal
              crashes. Those are very different things to hand to somebody else,
              so they are not drawn the same.
            </Note>
            <Note>
              We will not tell you the complaints never reach the model. They do
              — that is how the question gets answered, and anyone reviewing this
              would find out in their first question. So instead we say which
              five went, and what was in them.
            </Note>
            <Note>
              The walk was recorded when the contract had six rules. It has nine
              now — the three newest came from reading answers like this one
              (step 6.3).
            </Note>
          </Figure>

          <Figure caption="The 6.2 gate: what the record of tool calls has to show" from="excerpt" source="apps/ai/safety/src/cli/ask.ts">
            <Code
              path="apps/ai/safety/src/cli/ask.ts"
              mark={[1, 8]}
              lines={[
                '  check(',
                "    names.includes('get_recall'),",
                "    'REC-002 · the lookup ran',",
                "    names.length ? `tools called: ${names.join(', ')}` : 'no tool was called at all',",
                '  );',
                '',
                '  // THE NEGATIVE. A model that searched would still answer plausibly.',
                '  check(',
                "    !names.includes('search_complaints'),",
                "    'REC-002 · and the search did NOT run',",
                '    // …',
                '  );',
              ]}
            />
          </Figure>

          <Figure caption="The same two questions, four runs, one afternoon" source="17 Sep 2026 · commit 716b222">
            <Numbers items={RUNS.map((t) => ({ value: t, label: 'answered correctly' }))} />
            <Note>
              Same model, same wording, and all four right. One took thirteen
              times longer than another. Nothing before this stage behaved like
              that.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>The same question can now give two different answers, and
            neither is a bug.</strong> Stages 1 to 5 gave the same output for the
            same input, and each was checked against something that shared no
            code with it. From here the model picks the tools, the arguments and
            the words.
          </p>
          <p>
            That is why the five stages underneath had to be checked first. When
            an answer looks wrong, the searching, the counting and the rules are
            already known to be sound — so the model is the only thing left to
            look at. Without that, a bad answer has five possible causes and no
            way to tell them apart.
          </p>
          <p>
            And one green run is a smoke test, not a score. REC-002 passing its
            negative check was the least this stage could have shown and still
            been worth carrying on with.
          </p>
        </>
      }
      terms={['loop', 'agent', 'tool', 'hostedModel', 'answerKey']}
      hood={<LoopModal />}
    />
  );
}

/* ── 6.3 · THE CONTRACT, AT ANSWER TIME ───────────────────────────────────── */

function Step63() {
  return (
    <Step
      n="6.3"
      title={TITLES['6.3']}
      when={WHEN['6.3']}
      plain={
        <>
          <p>
            When the model answers instead of asking, the answer goes through
            stage 5’s contract before anybody sees it: it must parse, have the
            right shape, and break none of the rules. If it fails, the errors go
            back to the model as a sentence and it tries again. We never repair
            it ourselves.
          </p>
          <p>
            What is new is that some rules cannot be decided from the answer
            alone. “Cite no campaign when the recall search found nothing” is
            only wrong if the search <em>did</em> find nothing. So every tool
            call is recorded the moment it returns, and the checker reads that
            record alongside the answer.
          </p>
        </>
      }
      why={
        <p>
          Without the record, that rule — stage 5’s rule 6 — was written and
          tested and never called. Asking the model to report it instead would
          not work: a model that reaches for an unrelated campaign will also
          tick a box saying it did not.
        </p>
      }
      code={
        <>
          <Figure caption="The checker, built around what the tools returned" from="excerpt" source="apps/ai/safety/src/agent/answer.ts">
            <Code
              path="apps/ai/safety/src/agent/answer.ts"
              mark={[5, 6]}
              lines={[
                'export function validatorFor(calls: CallRecord[]) {',
                '  return (raw: string): ValidationResult<SafetyAnswer> => {',
                '    const base = validateSafetyAnswer(raw);',
                '    if (!base.ok || !base.value) return base;',
                '',
                '    const errs = evidenceErrors(base.value, evidenceFrom(calls));',
                "    if (errs.length) return { ok: false, errors: `internally inconsistent: ${errs.join('; ')}` };",
                '',
                '    return base;',
                '  };',
                '}',
              ]}
            />
            <Note>
              Stage 5’s rules run first, because a malformed answer has no list
              of campaigns to inspect. Then the rules that need the record.
            </Note>
          </Figure>

          <Figure caption="The four rules that read the record" from="excerpt" source="apps/ai/safety/src/schema/safety-answer.ts · agent/answer.ts">
            <Table
              head={['Rule', 'Rejects', 'Reads from the record']}
              rows={[
                ['6', 'A campaign cited after the recall search found none', <>the last <code>find_recalls</code> result</>],
                ['7', 'An absence claimed with no search named as its evidence', 'the same'],
                ['8', 'Escalating or declining without calling a single tool', 'how many calls were made'],
                ['9', 'A number captioned in words the tool did not use', <>each count’s own <code>describes</code></>],
              ]}
            />
          </Figure>

          <Figure caption="Faults found while building 6.2 to 6.4" from="cited" source="docs/safety/STAGE6.md §5">
            <Table
              head={['What broke', 'What it did']}
              lit={[1, 5]}
              rows={[
                ['Rule 4 fired on “F-150”', 'A hyphen is a word boundary, so the 150 in a model name read as a number with no tool behind it.'],
                [
                  'Rule 4 fired on “April 27, 2020”',
                  'ISO dates were stripped and prose ones were not — and the model obeyed, filing “27 — day of the month owners were notified” as a count.',
                ],
                [
                  'The prompt contradicted the schema',
                  <>
                    It still said numbers come from <code>count_complaints</code> after the schema was widened to any tool.
                  </>,
                ],
                [
                  'The absence check required every search to be empty',
                  'A model that narrowed from vehicle to component was scored as never having been told “none” (step 6.5).',
                ],
                ['The dependency check read the first date in any result', 'Which tests the order tools were called in, not the dependency (step 6.4).'],
                ['Rule 4 had no opinion on captions', '6 correct complaints labelled “power-train complaints”. The power-train figure is 351.'],
              ]}
            />
            <Note>STAGE6.md counts nine faults for these three steps and names these six.</Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Every fault was found by reading a real answer, not by
            review</strong> — and most were in the checking apparatus rather than
            in the system being checked. Three were in fixes made an hour
            earlier.
          </p>
          <p>
            The worst kind was not the rule that rejected a good answer: that is
            loud, and somebody looks. It was the rule that accepted one and bent
            it — the model obeyed and filed “27 — day of the month owners were
            notified” as a number. A rule that deforms a good answer can sit
            there indefinitely, because everything still passes.
          </p>
          <p>
            <strong>One open question was closed by measurement.</strong> The
            plan guessed that a model asked to restate its own arguments would
            paraphrase them. It does: a run captioned 6 complaints in{' '}
            <code>POWER TRAIN:AUTOMATIC TRANSMISSION</code> as “power-train”, a
            sentence that reads like 351 — with the number, its source and its
            filter all correct. So the tools now write their own captions, and
            rule 9 compares them word for word.
          </p>
        </>
      }
      terms={['contract', 'coherence', 'schema', 'tool']}
      hood={
        <Hood
          blurb="The recording in full, why a repeated call is made only once, and what happens to a rejected answer"
          title="Inside step 6.3"
          sub="The record the rules read — and the retry budget nobody chose"
        >
          <HoodSection title="Every call, recorded as it returns">
            <HoodText>
              The loop’s checker takes one argument, the answer’s text, and giving
              it more would mean changing all three engines. So instead the tools
              are wrapped to record what they return, and the checker is built
              around that record.
            </HoodText>
            <HoodText>
              Wrapping the tools rather than reading the engine’s own turn records
              is deliberate: those arrive after a turn completes, and the answer
              is checked while it is completing — so they would be one turn stale
              exactly when they are needed.
            </HoodText>
            <Figure caption="The wrapper" from="excerpt" source="apps/ai/safety/src/agent/answer.ts">
              <Code
                path="apps/ai/safety/src/agent/answer.ts"
                mark={[13, 19]}
                lines={[
                  'export function recordingTools(tools: Tool[]): { tools: Tool[]; calls: CallRecord[] } {',
                  '  const calls: CallRecord[] = [];',
                  '  const seen = new Map<string, unknown>();',
                  '',
                  '  return {',
                  '    calls,',
                  '    tools: tools.map((t) => ({',
                  '      ...t,',
                  '      execute: async (args: unknown) => {',
                  '        const key = `${t.schema.name}:${JSON.stringify(args ?? null)}`;',
                  '',
                  '        if (seen.has(key)) {',
                  '          const result = seen.get(key);',
                  '          calls.push({ name: t.schema.name, args, result, cached: true });',
                  '          return result;',
                  '        }',
                  '',
                  '        const result = await t.execute(args);',
                  '        seen.set(key, result);',
                  '        calls.push({ name: t.schema.name, args, result });',
                  '        return result;',
                  '      },',
                  '    })),',
                  '  };',
                  '}',
                ]}
              />
            </Figure>
          </HoodSection>

          <HoodSection title="A repeated call is made once — and still written down">
            <HoodText>
              A real run called <code>get_recall</code> for 20V197000 twice, with
              identical arguments. Nothing errored and nothing charged for it,
              which is exactly why it would have kept happening: a wasted call is
              invisible in the answer and visible only in the quota.
            </HoodText>
            <HoodText>
              These tools only read, and the data is a frozen snapshot, so the
              same arguments cannot give a different answer within one
              conversation. That is what makes caching safe here. The repeat is
              still recorded, marked <code>cached</code>, because “it asked the
              same thing twice” is a fact about the model worth keeping. And the
              cache is per conversation: one shared across questions would be
              faster and would make stage 7’s repeat runs meaningless.
            </HoodText>
          </HoodSection>

          <HoodSection title="What happens to a rejected answer">
            <HoodText>
              The errors go back to the model and it gets one more try. If that
              answer is rejected too, the run is reported as rejected — never as
              an answer, and never quietly repaired, because a repaired answer
              is a failure nobody counts.
            </HoodText>
            <Figure caption="The budget" from="excerpt" source="packages/agent/src/core/settle.ts">
              <Code path="packages/agent/src/core/settle.ts" mark={[0]} lines={['  let retriesLeft = opts.structuredRetries ?? 1;']} />
            </Figure>
            <HoodText>
              One is the shared loop’s default, and this engagement never set it.
              STAGE6.md §7 still lists the retry budget as an open decision: every
              retry is another request against a limit of fifteen a minute, and
              an unbudgeted one is how a free allowance disappears in an
              afternoon.
            </HoodText>
          </HoodSection>
        </Hood>
      }
    />
  );
}

/* ── 6.4 · TWO CALLS, IN ORDER ────────────────────────────────────────────── */

function Step64() {
  return (
    <Step
      n="6.4"
      title={TITLES['6.4']}
      when={WHEN['6.4']}
      plain={
        <>
          <p>
            REC-001 asks: “We run 2020 F-150s. Is the transmission park problem a
            known defect, and is the fix holding?” That is two questions, and the
            second cannot be asked until the first is answered — “after the
            recall” means nothing until you know when the recall was.
          </p>
          <p>
            So the model has to find the campaign, read the date owners were
            notified, and use that date as the filter on the complaints it looks
            at next. Nobody types the date. It comes out of one call and becomes
            part of the next.
          </p>
        </>
      }
      why={
        <p>
          This is the one thing stage 4 had to write by hand to measure its
          ceiling. If a model cannot carry one tool’s answer into the next tool’s
          question, the ceiling is out of reach by construction — and every “is
          the fix holding” question on this corpus has this shape.
        </p>
      }
      code={
        <>
          <Figure caption="One run: the date is not in the question" source="pnpm safety:ask · REC-001 · one run, five tool calls, condensed">
            <Raw>
              {'find_recalls    F-150, 2020, power train automatic transmission\n'}
              {'get_recall      20V197000        → owners notified 2020-04-27\n'}
              {'count / search  '}
              <mark>filed_after: 2020-04-27</mark>
              {'   ← from the line above'}
            </Raw>
            <Note>
              Nobody typed that date. It came out of the lookup and became the
              filter on the calls after it.
            </Note>
          </Figure>

          <Figure caption="The check follows the campaign the answer cites" from="excerpt" source="apps/ai/safety/src/cli/ask.ts">
            <Code
              path="apps/ai/safety/src/cli/ask.ts"
              mark={[4, 12]}
              lines={[
                '  const cited = new Set(ha?.campaigns ?? []);',
                '  const notifiedDates = new Set(',
                '    hc',
                '      .flatMap((c) => /* every recall in every tool result */)',
                '      .filter((r: any) => r?.owners_notified && (cited.size === 0 || cited.has(r.campaign_number)))',
                '      .map((r: any) => r.owners_notified as string),',
                '  );',
                '  const dated = hc.filter((c) => (c.args as any)?.filed_after);',
                '',
                '  check(',
                '    notifiedDates.size > 0 &&',
                '      dated.length > 0 &&',
                '      dated.every((c) => notifiedDates.has((c.args as any).filed_after)),',
                "    'REC-001 · the complaint filter used the date the CITED RECALL returned',",
                '    // …',
                '  );',
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>The first version of this check failed a run that behaved
            perfectly.</strong> It took the first notification date it could find
            in any result. The model had called <code>find_recalls</code> for the
            F-150 first, which returns every campaign on the vehicle, so the first
            date was 2019-06-03 — an unrelated recall — while the model had
            correctly used 20V197000’s own 2020-04-27. A check that reads “the
            first date anywhere” tests the order the tools were called in, not
            the dependency. It now follows the campaign the answer cites.
          </p>
          <p>
            <strong>And the answer did not escalate, four runs out of
            four.</strong> The key requires it: whether a given vehicle actually
            had the repair is recorded nowhere in this corpus, so “is the fix
            holding” has to go to a person. The prompt says almost exactly that.
            Four consecutive runs, four times no escalation — reproducible
            behaviour, not chance.
          </p>
          <p>
            It was reported rather than made a gate. 6.4 asks a mechanical
            question — can the model chain one call into the next — and that
            passes. What the answer <em>says</em> is content, and content on a
            system that varies is measured with repeats, in stage 7. A check that
            is always red is one people learn to scroll past. (Stage 7 fixed it
            without touching the prompt: the fact was moved into the tool’s
            result, where it is read at the moment it is needed.)
          </p>
        </>
      }
      terms={['tool', 'filter', 'campaign', 'loop', 'eval']}
    />
  );
}

/* ── 6.5 · THE NEGATIVE QUESTION ──────────────────────────────────────────── */

function Step65() {
  return (
    <Step
      n="6.5"
      title={TITLES['6.5']}
      when={WHEN['6.5']}
      plain={
        <>
          <p>
            REC-005 asks: “Is there a recall for the forward-collision braking on
            the 2019-2020 Honda Odyssey?” The right answer is no, and{' '}
            <strong>an absence is an answer, not a refusal</strong>. The model
            has to ask <code>find_recalls</code> about that exact component, get
            nothing back, and say so plainly — naming that empty search as its
            evidence, because there is no document to cite for something that
            does not exist.
          </p>
          <p>
            This question has no command of its own. It is the only one of the
            eight where rule 6 can fire, so it became 6.3’s gate, and it runs in
            the same <code>pnpm safety:ask</code>, straight after REC-002.
          </p>
        </>
      }
      why={
        <>
          <p>
            The Odyssey has 22 recalls. A model that reads all 22 and decides
            none of them is about forward collision is reading, not checking — it
            is deciding from component <em>names</em> rather than from the record.
            An absence established by a search can be checked; one inferred from
            a list is a judgement wearing a fact’s clothes.
          </p>
          <p>
            And the pull towards a near miss is real. Offer a different Odyssey
            campaign as close enough, and a fleet manager acts on a recall that
            does not cover their problem.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="What the model actually did" source="the run recorded in apps/ai/safety/src/agent/answer.ts">
            <Data
              path="find_recalls, called twice"
              mark={[1]}
              lines={[
                'find_recalls({ make: HONDA, model: ODYSSEY })                    → 22',
                'find_recalls({ make: HONDA, model: ODYSSEY, component: FCA })    → 0',
              ]}
            />
            <Note>
              It looked at the vehicle, then narrowed to the component — the
              sensible thing. The first version of the check required{' '}
              <em>every</em> search to be empty, so it scored this conversation as
              never having been told “none”, and the rules built for exactly this
              question stood down.
            </Note>
          </Figure>

          <Figure caption="The last search is the one the answer rests on" from="excerpt" source="apps/ai/safety/src/agent/answer.ts">
            <Code
              path="apps/ai/safety/src/agent/answer.ts"
              mark={[1, 3]}
              lines={[
                'export function evidenceFrom(calls: CallRecord[]): Evidence {',
                "  const last = [...calls].reverse().find((c) => c.name === 'find_recalls');",
                '  return {',
                '    recallSearchWasEmpty: !!last && ((last.result as any)?.matches?.length ?? 0) === 0,',
                '    toolCalls: calls.length,',
                '    // …',
                '  };',
                '}',
              ]}
            />
            <Note>
              A conversation that never searched is still not an absence: it
              cannot have been told “none” by a question it did not ask.
            </Note>
          </Figure>

          <Figure caption="The four REC-005 checks" from="excerpt" source="apps/ai/safety/src/cli/ask.ts">
            <Table
              head={['Check', 'What it rules out']}
              rows={[
                ['The recall search ran', 'An answer from memory'],
                ['The absence was proven by a search, not inferred from a list', 'Reading 22 recalls and deciding'],
                ['It says so in words', 'A null answer with an escalation — which passed until this check was added'],
                ['No campaign is cited', 'A near miss offered as close enough (rule 6)'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>We could prove an absence and had no way to say one.</strong>{' '}
            Before rule 7, the contract had no field for “I looked, and there is
            nothing”. So the model composed “NHTSA recall database lookup for make
            HONDA, model ODYSSEY…” and filed it as a citation — a sentence, not a
            document. The fault was ours: the answer got bent to fit the form. It
            now goes in <code>searches_that_found_nothing</code>, and rule 7
            requires it.
          </p>
          <p>
            <strong>And a correct answer can score zero.</strong> Measured by
            recall@6 in step 6.6, this question scores a stable 0.00 while its
            answer is right every time — it never needs a complaint, so a
            measure of retrieved documents has nothing to count.
          </p>
        </>
      }
      terms={['campaign', 'tool', 'contract', 'coherence', 'recallAtK']}
    />
  );
}

/* ── 6.6 · ALL EIGHT, PACED ───────────────────────────────────────────────── */

/**
 * recall@6 with the model doing the routing, three runs.
 *
 * ── A RANGE, AND IT MUST NOT BECOME A POINT ───────────────────────────────
 *
 * The mean of 0.50, 0.17 and 0.17 is 0.28, which is a figure no run produced.
 * The gap between the runs IS the result.
 *
 * ── AND THE PER-CASE RECORD IS THE ACTUAL FINDING ─────────────────────────
 *
 * Two of the three cases never move. All the spread is REC-004, and there it is
 * binary — it either calls the complaint search and gets all five, or answers
 * from the count alone and retrieves nothing. Stage 7's baseline of the time
 * measured that same behaviour from the opposite side at the same frequency.
 *
 * ── TWO OF THE THREE SHORTFALLS ARE THE METRIC, NOT THE MODEL ─────────────
 *
 * REC-005 scores a stable 0.00 and answers perfectly: it proves the absence
 * with a search that returns nothing and never needs a complaint. It took the
 * shorter, stronger route and a fixed-k metric charged it for that. REC-001
 * loses half for a cousin of the same reason.
 *
 * Source: `pnpm safety:measure-model`, 2026-09-18, as `INGESTION.md` records it.
 */
const ROUTED: readonly { id: string; runs: readonly number[]; note: string }[] = [
  {
    id: 'REC-001',
    runs: [0.5, 0.5, 0.5],
    note: 'Never moves. Finds the campaign every time, then cites the complaints that name it — arguably better evidence — rather than the one the key names.',
  },
  {
    id: 'REC-004',
    runs: [1, 0, 0],
    note: 'All of the spread, and all or nothing: it either reads the five death complaints or answers from the count alone and fetches none.',
  },
  {
    id: 'REC-005',
    runs: [0, 0, 0],
    note: 'Never moves — and its answer is right every time. It proves the absence with a search that returns nothing, so there is no complaint to count.',
  },
];

/** Per run, averaged across the three cases — the spread is over whole runs. */
const PER_RUN = [0, 1, 2].map((i) => ROUTED.reduce((a, c) => a + c.runs[i], 0) / ROUTED.length);

function Step66() {
  return (
    <Step
      n="6.6"
      title={TITLES['6.6']}
      when={WHEN['6.6']}
      plain={
        <>
          <p>
            Ask every question in the answer key, one after another, slowly
            enough that the free tier does not cut any of them off. The run
            grades nothing — that is stage 7. It asks one narrower question:{' '}
            <strong>can the whole key be asked, end to end?</strong>
          </p>
          <p>
            A question that dies because the quota ran out is counted as a hole
            in the run, never as an answer. The run passes only if there are no
            holes.
          </p>
        </>
      }
      why={
        <p>
          The free allowance cuts you off without saying so. An unpaced run on
          this stack once reported <strong>zero wrong answers</strong> — because
          three of the questions never ran at all. So pacing is not tidying up:
          it is the difference between a number and a fiction.
        </p>
      }
      code={
        <>
          <Figure caption="The first run: out of quota, and PASS" source="pnpm safety:run-all · first run · 17 Sep 2026">
            <Data
              path="the last two lines it printed"
              mark={[1]}
              lines={['quota 0 · error 1', '6.6: PASS — the whole key was asked without hitting the quota.']}
            />
            <Note>
              REC-008 had died of the quota. The detector looked for words like
              “rate limit” or “quota” in the error’s message; Gemini’s message
              said <em>Too Many Requests</em>, and the 429 sat one level down. So
              a quota failure was filed as an ordinary error, and the one thing
              this step asserts came back green — in the step written to prevent
              exactly that.
            </Note>
          </Figure>

          <Figure caption="The detector now, and the test it must pass before anything is spent" from="excerpt" source="apps/ai/safety/src/cli/run-all.ts">
            <Code
              path="apps/ai/safety/src/cli/run-all.ts (two excerpts)"
              mark={[2, 9, 13, 16]}
              lines={[
                'function isRateLimit(e: unknown): boolean {',
                '  const err = e as any;',
                '  const status = err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode;',
                '  if (status === 429) return true;',
                '',
                '  // Everything the object can be made to say, including nested causes.',
                '  const text = [err?.message, err?.cause?.message, err?.cause?.responseBody, String(e)]',
                '    .filter(Boolean)',
                "    .join(' ');",
                '  return /\\b429\\b|too many requests|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(text);',
                '}',
                '',
                '  // in main(), before the first question:',
                '  if (!isRateLimit(RECORDED_429)) {',
                '    return 1; // refusing to run: it cannot see a real, recorded 429',
                '  }',
                "  if (isRateLimit(new Error('the model returned an invalid answer'))) {",
                '    return 1; // refusing to run: it calls an ordinary error a quota failure',
                '  }',
              ]}
            />
          </Figure>

          <Figure caption="Why an average is not a rate limit" from="cited" source="the failing run and the fix, as the comment in apps/ai/safety/src/cli/run-all.ts records them">
            <Raw>
              {'the limit        15 requests a minute — in any minute\n'}
              {'one question     REC-003: eight tool calls, about nine requests,\n'}
              {'                 over half a minute’s budget, as fast as it could think\n'}
              {'the whole run    ~38 requests in 228 seconds: under 15 a minute\n'}
              {'                 '}
              <mark>on average, and it still died</mark>
              {'\nthe fix          4.5 seconds after every model turn — about 13 a minute'}
            </Raw>
          </Figure>

          <Figure caption="The callback nobody waited for" from="excerpt" source="packages/agent/src/mastra/loop.ts · before and after commit 2a46d8e">
            <BeforeAfter
              before={<Code path="packages/agent/src/mastra/loop.ts" mark={[0]} lines={['    for (const t of turns) opts.onTurn?.(t);']} />}
              after={<Code path="packages/agent/src/mastra/loop.ts" mark={[0]} lines={['    for (const t of turns) await opts.onTurn?.(t);']} />}
            />
            <Note>
              The pacing sleeps inside <code>onTurn</code>. It was typed as
              returning nothing, so all three engines called it without waiting:
              the sleep finished after the next request had already gone out. The
              run would have looked paced and hit the quota anyway. The same
              one-word change went into all three.
            </Note>
          </Figure>

          <Figure caption="The pass that finished" source="pnpm safety:run-all · 17 Sep 2026 · commit 2a46d8e">
            <Numbers
              items={[
                { value: '8 of 8', label: 'answered — none declined, none rejected' },
                { value: '0', label: 'died of the quota' },
                { value: '37', label: 'tool calls, 3 of them repeats served from memory' },
                { value: '842s', label: 'wall clock, pacing included — about fourteen minutes' },
              ]}
            />
            <Note>
              Nothing here is a score. It says the key can be asked; whether the
              answers are right is stage 7’s question.
            </Note>
          </Figure>

          <Figure
            caption="recall@6: a person choosing the tools, then the model"
            source="pnpm safety:measure-model · 3 questions × 3 runs · 18 Sep 2026 · docs/safety/INGESTION.md"
          >
            <Numbers
              items={[
                { value: '1.00', label: 'tools called by hand — stage 4.5’s ceiling' },
                { value: '0.17–0.50', label: `the model choosing, three runs: ${PER_RUN.map((v) => v.toFixed(2)).join(', ')}` },
              ]}
            />
            <div className="mt-5">
              <Table
                head={['Question', 'Run 1', 'Run 2', 'Run 3', 'What it means']}
                numeric={[1, 2, 3]}
                lit={[1]}
                rows={[
                  ...ROUTED.map((r) => [r.id, ...r.runs.map((v) => v.toFixed(2)), r.note]),
                  ['All three', ...PER_RUN.map((v) => v.toFixed(2)), 'The range the headline quotes. Not the mean: that would be 0.28, which no run produced.'],
                ]}
              />
            </div>
            <Note>
              Stage 7’s score is not one of these numbers: it counts checks on{' '}
              <strong>answers</strong>, not documents retrieved. This was
              measured before stage 7’s fix that made REC-004 fetch a complaint
              to quote, and has not been re-run since.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>A detector for a failure is part of that failure until
            something has been seen to trip it.</strong> The real 429 is now kept
            and tested before the run spends anything, in both directions: the
            detector must recognise the recorded quota error, and must not call
            an ordinary error a quota failure. If either test fails the run
            refuses to start, because every result would be trustworthy except
            the one that matters.
          </p>
          <p>
            <strong>The range is the least interesting part of the recall
            number.</strong> Two of the three questions never move. All of the
            spread is REC-004, and it is all or nothing. Stage 7’s baseline of the
            same night saw that behaviour from the other side: REC-004’s “cites at
            least one complaint by ODI number” passed 1 of 3. Two measurements,
            one behaviour.
          </p>
          <p>
            <strong>And two of the three shortfalls are the metric, not the
            model.</strong> REC-005 scores 0.00 while answering correctly every
            time: it took the shorter, stronger route, and a measure that counts
            retrieved documents charged it for that. REC-001 loses half for a
            cousin of the same reason.
          </p>
          <p>
            The first version of the measurement ran once and said 0.50. The next
            run of the same code said 0.17. It now repeats, and refuses to print
            a single headline when the runs disagree.
          </p>
        </>
      }
      terms={['recallAtK', 'ceiling', 'answerKey', 'eval', 'hostedModel']}
      hood={
        <Hood
          blurb="What this stage proved and what it did not, the decisions still open, and what one run looks like from stage 7"
          title="Inside step 6.6"
          sub="Where stage 6 leaves things, before stage 7 turns them into numbers"
        >
          <HoodSection title="Proved, measured, and not">
            <Table
              head={['Where', 'What it shows']}
              rows={[
                ['Proved in stage 4', 'The right documents can be found — when a person chooses the tools.'],
                ['Proved in stage 5', 'A right answer can be checked.'],
                ['Measured here', 'Whether a model asks for the right things: 0.17 to 0.50 over three runs. A range, not a verdict.'],
                ['Not here at all', 'Whether the answers are any good. That is stage 7, with repeats.'],
              ]}
            />
            <HoodText>
              When 6.2 first passed, the honest summary was “one question
              answered well — the least this stage could have shown and still
              been worth carrying on with”. That is still the right way to read
              any single run.
            </HoodText>
            <HoodText>
              This is also the first part that costs money, and the first that
              can be wrong in a way no check catches. Which is why it comes last.
            </HoodText>
          </HoodSection>

          <HoodSection title="Two decisions still open — and one that was closed">
            <div className="cal-open">
              <p className="font-semibold text-ui-fg">Which model</p>
              <p className="mt-1.5">
                Two runs on different models cannot be compared, so the model
                that produced a number is written down beside it — here,{' '}
                <code>gemini-3.5-flash-lite</code>. The loop reads the name from
                the environment and never defaults, because Google retires
                product names.
              </p>
            </div>
            <div className="cal-open">
              <p className="font-semibold text-ui-fg">What to do with a rejected answer</p>
              <p className="mt-1.5">
                Today: the shared loop’s default — the errors go back, one retry,
                then the answer is reported as rejected. Nobody on this engagement
                chose that number, and every retry is another request against
                fifteen a minute.
              </p>
            </div>
            <div className="cal-panel max-w-[66ch] text-[1rem] leading-[1.7]">
              <p className="font-semibold text-ui-fg">Closed: who records where a number came from</p>
              <p className="mt-1.5 text-ui-dim">
                The tools do. A model asked to restate its own arguments reworded
                them, so each count now carries its own caption and rule 9
                compares it literally — step 6.3.
              </p>
            </div>
          </HoodSection>

          <HoodSection title="What one run tells you, from stage 7’s side">
            <Figure caption="The same questions across stage 6, every run correct-looking" from="cited" source="docs/safety/STAGE7.md §1">
              <Data
                path="what stage 6 saw, one run at a time"
                lines={[
                  'escalated without calling a single tool          once',
                  'called six tools and did not escalate            four times',
                  'answered in 3.9 seconds                          once',
                  'answered in 131.3 seconds                        once',
                  'made 8 tool calls                                once',
                  'made 10 tool calls, same question, same prompt   once',
                ]}
              />
            </Figure>
            <HoodText>
              None of those is a number. A single green run is a smoke test, and
              stage 7 is where the reading of tea leaves stops: repeats, a
              severity bucket that keeps a quota failure apart from a wrong
              answer, and a baseline on disk that the next run can be compared
              against — or refused.
            </HoodText>
          </HoodSection>
        </Hood>
      }
    />
  );
}
