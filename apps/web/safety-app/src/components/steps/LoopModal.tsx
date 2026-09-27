/**
 * Inside the loop — stage 6, and the first time a model is asked.
 *
 * ── THE MISCONCEPTION IS THE THING WORTH REMOVING ─────────────────────────
 *
 * Everybody assumes the model queries the database. It cannot: no connection, no
 * credentials, no way to run anything. It produces text, and one shape of text
 * is a REQUEST that our code then honours. The model is not doing the work — it
 * is deciding what work to ask for.
 *
 * ── 6.1 TESTS THE SEAM, NOT THE TOOLS ─────────────────────────────────────
 *
 * Stage 4 proved the five tools work, called AS CODE, where the compiler
 * guaranteed the arguments. A model guarantees nothing: it sends a name and a
 * blob of JSON and both can be wrong. So 6.1 checks the gap between "call
 * count_complaints" and the tool running — an invented name comes back as a
 * readable message rather than a crash, and so does an argument that does not
 * fit.
 *
 * ── 6.2'S CHECK IS A NEGATIVE, AND THAT IS THE STRONGEST THING HERE ───────
 *
 * Stage 3.5 measured that SEARCHING for the campaign returns it at position 4.
 * So a model that searched instead of looking up would still produce a mostly
 * correct answer — the text would read fine and the method would be wrong. The
 * tool-call record is the only place that difference is visible. It was the
 * first check here of a method rather than an output, and stage 7 kept it.
 *
 * ── AND ONE GREEN RUN IS A SMOKE TEST — WHICH THE STAGE THEN PROVED ───────
 *
 * The same question can give two answers and neither is a bug. When the
 * model-routed recall@6 was first published it was one run, 0.50; the next run
 * of the same code gave 0.17. Repeated, it is 0.17 to 0.50 over three runs —
 * a RANGE, never averaged — and it only ever appears beside 4.5's 1.00, which
 * is a hand-routed CEILING over three cases, one of them (REC-005) already 1.00
 * because its rightness is an empty result.
 *
 * ── CORRECTED 2026-09-27 ──────────────────────────────────────────────────
 *
 * This panel was written at 6.2, with "one question answered, four steps to go"
 * and "four of the six steps are not built". Stage 6 finished (6.1–6.4 built,
 * 6.5 folded into 6.3's gate, 6.6's pacing at commit 2a46d8e: 8 answered, 0
 * quota failures, 37 tool calls, 842 s) and stage 7
 * scored it; the closing section now says what happened, from STAGE6.md,
 * STAGE7.md and INGESTION.md. Also against the code:
 *
 * - `ask.ts` no longer passes `validate: validateSafetyAnswer`. It passes
 *   `validatorFor(calls)`, which adds the rules that need the recorded tool
 *   calls, and it wraps the registry with `recordingTools`. The quote is the
 *   current block, as an excerpt without line numbers (it had moved 23 lines).
 * - "Only one of the three [engines] reaches this model" was wrong: Mastra and
 *   LangGraph both do; the Agents SDK refuses a non-Azure provider by design
 *   (`agent/engines.ts`, STAGE6.md §3).
 * - The model is named: gemini-3.5-flash-lite, the id recorded in every
 *   baseline, on a hosted OpenAI-compatible endpoint.
 * - The registry excerpt's highlight pointed at `return {` and `}`; it now
 *   points at `args: unknown` and the error message, which the prose is about.
 *
 * Restyled the same day for the `/steps` redesign: the shared trigger,
 * sentence-case labels, 1rem body text, the kit's `Table`.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from './Hood';
import { Table } from './kit';

/** Seven arguments, and each one is a stage of this engagement arriving. */
const ARGS: readonly { arg: string; is: string }[] = [
  {
    arg: 'choice',
    is: 'Which engine. Two of the three reach this model — Mastra and LangGraph; the OpenAI Agents SDK refuses it by design',
  },
  { arg: 'client()', is: 'Which cloud, read from the environment' },
  { arg: 'model', is: 'Named explicitly, never defaulted — gemini-3.5-flash-lite in every measured run' },
  { arg: 'registry', is: "Stage 4's five tools, wrapped so that every call is recorded" },
  { arg: 'question', is: "The fleet analyst's own words" },
  { arg: 'responseFormat', is: "Stage 5's schema" },
  {
    arg: 'validate',
    is: "All nine rules — stage 5's six and three added here — checked against the recorded calls",
  },
];

export function LoopModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="The code that hands a question to the model, and the check that looks at which tools it used rather than what it wrote."
        onClick={open}
      />

      {from && <LoopPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function LoopPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the loop"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the loop</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 6 · built · then run three times over and scored in stage 7
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2" data-tone="quiet">
          The whole of stage 6, in one sentence
        </p>
        <p className="max-w-[54ch] text-[1.0625rem] leading-relaxed font-semibold text-ui-fg">
          The model is not doing the work. It is deciding what work to ask for.
        </p>
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What the model can and cannot do">
          <HoodText>
            This is where a model is finally asked a question. Everything before
            it — the tools, the answer contract — runs without one. The model is
            Google's gemini-3.5-flash-lite, reached over a hosted endpoint that
            speaks OpenAI's chat format.
          </HoodText>
          <Key>
            It never touches the database. No connection, no credentials, no way
            to run anything. All it can do is produce text.
          </Key>
          <HoodText>
            So it is allowed to produce one very specific kind of text: a
            request. Our code reads the request, runs the tool, and hands back
            what came out.
          </HoodText>
          <Data
            path="One turn"
            mark={[1, 3]}
            lines={[
              'we send      the question, the rules, and five tools with their arguments',
              'it replies   call count_complaints with { make: TESLA, model: MODEL 3,',
              '                                          min_deaths: 1 }',
              'we run it    and send the result back as another message',
              'repeat       until it answers instead of asking',
            ]}
          />
          <Why>
            Everything stages 3 to 5 built is the work. This stage is only the
            choosing — which is why it is last, and why it is the first one that
            can be wrong in a way no check catches.
          </Why>
        </HoodSection>

        <HoodSection title="The call itself">
          <Code
            path="apps/ai/safety/src/cli/ask.ts"
            note="Excerpt"
            lang="typescript"
            mark={[5, 6, 7]}
            lines={[
              '  const { tools, calls } = recordingTools(SAFETY_TOOLS);',
              '  const registry = new ToolRegistry(tools);',
              '  const started = Date.now();',
              '',
              '  const result = await runLoop<SafetyAnswer>(choice, client(), model, registry, question, {',
              '    system: SAFETY_SYSTEM_PROMPT,',
              '    responseFormat: SafetyAnswerSchema,',
              '    validate: validatorFor(calls),',
              "    agentName: 'calder-safety',",
              '    onEvent: (e: any) => {',
              "      if (e.type === 'tool_call') console.log(`  ${DIM}→ ${e.name}(${JSON.stringify(e.args)})${OFF}`);",
              '    },',
              '  });',
            ]}
          />
          <HoodText>
            Seven things go in, and each one is a stage of this engagement
            arriving.
          </HoodText>
          <Table
            head={['What goes in', 'What it is']}
            rows={ARGS.map((a) => [<code key={a.arg}>{a.arg}</code>, a.is])}
          />
          <Key>
            The whole engagement, in one function call. The tools came from stage
            4, the shape and the rules from stage 5, and none of them had to
            change to be handed to a model — though several changed once a
            model's answers could be read.
          </Key>
          <Why>
            The validator is the clearest case. It began as stage 5's six rules;
            it is now <code>validatorFor(calls)</code>, which runs nine — rules
            7 to 9 were added in this stage, each after reading a real answer.
            Four of the nine (6 to 9) need to see what the tools actually
            returned — whether a search came back empty, how many tools ran, what
            each count said it counted — and the answer alone cannot tell them.
          </Why>
        </HoodSection>

        <HoodSection title="6.1 does not test the tools. It tests the seam.">
          <HoodText>
            The five tools already worked — stage 4 proved it. But stage 4 called
            them <strong className="font-semibold text-ui-fg">as code</strong>,
            where the compiler guaranteed the arguments were right.
          </HoodText>
          <Key>
            A model guarantees nothing. It sends a name and a blob of JSON, and
            both can be wrong.
          </Key>
          <Data
            path="Three things that have to work in that gap"
            mark={[1]}
            lines={[
              'reach a tool by name        a string lookup, not an import',
              'a name that does not exist  the model WILL invent one',
              'arguments that do not fit   and it has to be told which one',
            ]}
          />
          <Code
            path="packages/agent/src/core/registry.ts"
            note="Excerpt"
            lang="typescript"
            mark={[0, 13]}
            lines={[
              '  async dispatch(name: string, args: unknown): Promise<ToolCallRecord> {',
              '    const started = Date.now();',
              '    const tool = this.tools.get(name);',
              '',
              '    if (!tool) {',
              '      // The model invented a tool. Tell it so, rather than crashing.',
              '      return {',
              '        name,',
              '        args,',
              '        ok: false,',
              "        cause: 'unknown_tool',",
              '        ms: Date.now() - started,',
              "        source: 'live',",
              '        error: `No tool named "${name}". Available: ${[...this.tools.keys()].join(\', \')}`,',
              '      };',
              '    }',
            ]}
          />
          <Why>
            Note <code>args: unknown</code>. That is the honest type — it came
            from a language model. And the error names the tools that do exist,
            so the model can correct itself rather than guessing twice.
          </Why>
          <Key>
            The registry looks a tool up and calls it; it does not check the
            arguments. So each tool parses its own input, and a bad argument
            becomes a message the model can read instead of a crash three layers
            down.
          </Key>
        </HoodSection>

        <HoodSection title="And 6.2's check is a negative">
          <HoodText>
            The question names a campaign number. So the check is not only that
            the right answer came back.
          </HoodText>
          <Data
            path="What the tool-call record has to show"
            mark={[1]}
            lines={[
              'get_recall           was called          ✓',
              'search_complaints    was NOT called      ✓',
            ]}
          />
          <Key>
            Searching for that campaign number returns it at position 4. So a
            model that searched instead of looking it up would still produce a
            mostly correct answer — the text would read fine and the method would
            be wrong.
          </Key>
          <Why>
            The tool-call record is the only place that difference is visible.
            It was the first check on this site of a <em>method</em> rather than
            an output, and a model that searches for a number it was handed has
            misunderstood the whole tool layer — worth catching on question one
            rather than question eight. Stage 7 kept it as one of its decided
            checks.
          </Why>
        </HoodSection>

        <HoodSection title="The first free-form run">
          <Data
            path="“Are there complaints about deaths on the Tesla Model 3?”"
            note="Unedited"
            mark={[1, 2]}
            lines={[
              '→ count_complaints({"make":"TESLA","model":"MODEL 3","min_deaths":1})',
              '→ search_complaints({"make":"TESLA","model":"MODEL 3","min_deaths":1,',
              '                     "query":"death or fatal or fatality"})',
              '',
              'Yes, there are 5 complaints involving deaths filed with NHTSA for the',
              'Tesla Model 3.',
              '',
              'count   5 — Tesla Model 3 complaints with at least 1 death reported',
              'cite    ODI 11302656   ...autopilot ALLEGEDLY failed',
              'cite    ODI 11533202   ...fatal accident and fire',
              'cite    ODI 11364724   ...ALLEGES an upper ball joint failure',
              'cite    ODI 11524321   ...two deaths, SUSPECTED unintended acceleration',
              'cite    ODI 11473666   ...veered across lanes',
            ]}
          />
          <HoodText>Four things went right, and each one was designed for.</HoodText>
          <Data
            path="And where each was specified"
            lines={[
              'it counted with the counting tool   the tool description says to, and says',
              '                                    that counting search results is wrong',
              'the vehicle went in the FILTER      the description says a vehicle name in',
              '  and only the symptom in the text  the query is matched as prose',
              'the number arrived with its filter  the contract’s rule 4',
              '“ALLEGEDLY”, “ALLEGES”, “SUSPECTED” it did not state cause',
            ]}
          />
          <Key>
            The last one is the legal edge in this corpus: a complaint is an
            allegation by a member of the public, not a finding. The contract
            requires exactly that restraint, and the model produced it.
          </Key>
          <Why>
            And the behaviour that matters most — calling the counting tool
            first — was specified in a <em>tool description</em> rather than in
            the prompt, then complied with. That is a nicer proof than any
            assertion about prompts.
          </Why>
          <Why>
            The 5 is also the corrected number. It was 12 in the answer key until
            it turned out to be a count of rows.
          </Why>
          <Why>
            Later runs did not always make the second call. Repeated, the model
            sometimes answered the same case (REC-004) from the count alone, with
            nothing to quote — which is exactly why one good run could not be the
            result.
          </Why>
        </HoodSection>

        <HoodSection title="One green run is a smoke test">
          <Key>
            The same question can give two different answers, and neither is a
            bug. So no single run belongs beside the ceiling; a number is only
            reported once every question has run with repeats.
          </Key>
          <Why>
            The stage proved it on itself. The model-routed recall@6 was first
            published from one run, at 0.50, and the next run of the same code
            gave 0.17. Repeated, it is{' '}
            <strong className="font-semibold text-ui-fg">0.17 to 0.50</strong> over
            three runs (0.50, 0.17, 0.17) — a range, because the runs disagree,
            and never an average.
          </Why>
          <Why>
            Beside it sits step 4.5's 1.00: the same three cases with the tools
            called by hand, which makes it a ceiling on what is reachable, not a
            score — and one of those cases, REC-005, was already at 1.00 because
            its right answer is an empty result.
          </Why>
          <Why>
            Stage 6 closed with pacing (6.6): all eight questions answered in one
            pass, no quota failures, 37 tool calls and 842 seconds under the free
            tier's rate limit — on the second attempt, because the first hit the
            quota and its detector printed a pass. Stage 7 then ran every
            question three times — 28 of 28 decided checks, reported beside 0 of
            3 judged ones and never added to them. The judged zero is not a
            broken judge: every control passed.
          </Why>
        </HoodSection>
      </div>
    </OriginDialog>
  );
}

/** The point — restyled on `/steps` by the `cal-key` rule in app.css. */
function Key({ children }: { children: ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

/** A reason, set in the margin — the `cal-why` rule. */
function Why({ children }: { children: ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
