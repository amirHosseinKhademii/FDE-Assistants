/**
 * Inside the loop — stages 6.1 and 6.2, and the first time a model is asked.
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
 * tool-call record is the only place that difference is visible, and nothing
 * else on this site checks a method rather than an output.
 *
 * ── AND ONE GREEN RUN IS A SMOKE TEST ─────────────────────────────────────
 *
 * The same question can now give two answers and neither is a bug. No number
 * from here belongs beside 4.5's ceiling until every question runs with repeats.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/** Six arguments, and each one is a stage of this engagement arriving. */
const ARGS: readonly { arg: string; is: string }[] = [
  { arg: 'choice', is: 'which engine — only one of the three reaches this model' },
  { arg: 'client()', is: 'which cloud, read from the environment' },
  { arg: 'model', is: 'named explicitly, never defaulted' },
  { arg: 'registry', is: "stage 4's five tools" },
  { arg: 'question', is: "the fleet manager's own words" },
  { arg: 'responseFormat', is: "stage 5's schema" },
  { arg: 'validate', is: "stage 5's six rules" },
];

export function LoopModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-cal-2/50"
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-cal-2 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">
          Inside the loop — the code that sends it, and the check that looks at
          which tools it used rather than what it wrote
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <LoopPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function LoopPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the loop"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the loop</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stages 6.1 and 6.2 · one question answered, four steps to go
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the whole of stage 6, in one sentence
        </p>
        <p className="max-w-[54ch] font-mono text-[0.9375rem] leading-relaxed text-ui-fg sm:text-base">
          The model is not doing the work. It is deciding what work to ask for.
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What the model can and cannot do</H>
          <Key>
            It never touches the database. No connection, no credentials, no way
            to run anything. All it can do is produce text.
          </Key>
          <P>
            So it is allowed to produce one very specific kind of text: a
            request. Our code reads the request, runs the tool, and hands back
            what came out.
          </P>
          <Data
            path="one turn"
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
        </section>

        <section>
          <H>The call itself</H>
          <Code
            path="apps/ai/safety/src/cli/ask.ts:64–72"
            lang="typescript"
            startLine={64}
            mark={[1, 2, 3]}
            lines={[
              '  const result = await runLoop<SafetyAnswer>(choice, client(), model, registry, question, {',
              '    system: SAFETY_SYSTEM_PROMPT,',
              '    responseFormat: SafetyAnswerSchema,',
              '    validate: validateSafetyAnswer,',
              "    agentName: 'calder-safety',",
              '    onEvent: (e: any) => {',
              "      if (e.type === 'tool_call') console.log(`  ${DIM}→ ${e.name}(${JSON.stringify(e.args)})${OFF}`);",
              '    },',
              '  });',
            ]}
          />
          <P>Seven things go in, and each one is a stage of this engagement arriving.</P>
          <div className="cal-panel grid gap-2">
            {ARGS.map((a) => (
              <div key={a.arg} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
                <span className="w-36 shrink-0 font-mono text-[0.75rem] text-ui-dim">{a.arg}</span>
                <span className="text-[0.8125rem] text-ui-dim">{a.is}</span>
              </div>
            ))}
          </div>
          <Key>
            The whole engagement, in one function call. The tools came from stage
            4, the shape and the rules from stage 5, and none of them had to
            change to be handed to a model.
          </Key>
        </section>

        <section>
          <H>6.1 does not test the tools. It tests the seam.</H>
          <P>
            The five tools already worked — stage 4 proved it. But stage 4 called
            them <span className="text-ui-fg">as code</span>, where the compiler
            guaranteed the arguments were right.
          </P>
          <Key>
            A model guarantees nothing. It sends a name and a blob of JSON, and
            both can be wrong.
          </Key>
          <Data
            path="three things that have to work in that gap"
            mark={[1]}
            lines={[
              'reach a tool by name        a string lookup, not an import',
              'a name that does not exist  the model WILL invent one',
              'arguments that do not fit   and it has to be told which one',
            ]}
          />
          <Code
            path="packages/agent/src/core/registry.ts:24–39"
            lang="typescript"
            startLine={24}
            mark={[6, 15]}
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
            Note <Mono>args: unknown</Mono>. That is the honest type — it came
            from a language model. And the error names the tools that do exist,
            so the model can correct itself rather than guessing twice.
          </Why>
          <Key>
            The registry looks a tool up and calls it; it does not check the
            arguments. So each tool parses its own input, and a bad argument
            becomes a message the model can read instead of a crash three layers
            down.
          </Key>
        </section>

        <section>
          <H>And 6.2's check is a negative</H>
          <P>
            The question names a campaign number. So the check is not only that
            the right answer came back.
          </P>
          <Data
            path="what the tool-call record has to show"
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
            Nothing else on this site checks a <em>method</em> rather than an
            output, and a model that searches for a number it was handed has
            misunderstood the whole tool layer — worth catching on question one
            rather than question eight.
          </Why>
        </section>

        <section>
          <H>The first free-form run</H>
          <Data
            path="“are there complaints about deaths on the Tesla Model 3?”"
            note="unedited"
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
          <P>Four things went right, and each one was designed for.</P>
          <Data
            path="and where each was specified"
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
        </section>

        <section>
          <H>One green run is a smoke test</H>
          <Key>
            The same question can now give two different answers and neither is a
            bug. Nothing here belongs beside the ceiling until every question
            runs, with repeats.
          </Key>
          <Why>
            Four of the six steps are not built. One question was answered well,
            which is the least this stage could have shown and still been worth
            continuing.
          </Why>
        </section>
      </div>
    </OriginDialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-mono text-[0.9375rem] text-ui-fg">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}

function Key({ children }: { children: React.ReactNode }) {
  return <p className="cal-key mt-3.5">{children}</p>;
}

function Why({ children }: { children: React.ReactNode }) {
  return <p className="cal-why mt-3.5">{children}</p>;
}
