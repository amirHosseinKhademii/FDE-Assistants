/**
 * `/learn/architecture` — follow one requirement through the repo.
 *
 * ── THE PAGE IS TWO HALVES AND IT SAYS SO ON ITSELF ────────────────────────
 *
 * THE GRAPH IS GENERATED. Every package, every edge, every line count in §1
 * comes from `architecture.generated.ts`, written by `pnpm arch:graph` out of
 * the `package.json` files and the workspace globs. A hand-kept dependency
 * graph is the drift lesson written down in advance: true when typed, false
 * after the next `pnpm add`, and nothing to say so. `pnpm arch:check` fails a
 * build on a stale one, and it has been shown to catch planted drift.
 *
 * THE WALK IS WRITTEN BY HAND, and that is a decision rather than a default.
 * Which file handles which stage of a request, what it does in plain words,
 * which excerpt is worth reading, and what went wrong there once — none of that
 * is derivable from a manifest, and a generated sentence about a package would
 * be a plausible one rather than a true one.
 *
 * NOT A LESSON IN ANY TRACK. It is a reference you come back to rather than a
 * sequence you read once, and numbering it inside a track would misrepresent
 * that. It takes the accent of the engagement it walks through.
 */
import { Link } from '@tanstack/react-router';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { GENERATED_AT, PACKAGES, type ArchPackage } from '../../lib/learn/architecture.generated';

/* ── THE FOUR LAYERS, WHICH ARE THE THREE WORKSPACE GLOBS ──────────────────
   `pnpm-workspace.yaml` splits the repo into `packages/*`, `packages/providers/*`,
   `apps/ai/*` and `apps/web/*`, and that split is the architecture. Everything
   below reads `kind` off the generated graph rather than listing names, so a
   package added tomorrow appears here without anybody editing this file.
   ────────────────────────────────────────────────────────────────────────── */
const LAYERS: Array<{ kind: ArchPackage['kind']; title: string; rule: string }> = [
  {
    kind: 'shared',
    title: 'What transfers',
    rule: 'Knows nothing about any customer. A second engagement uses it unchanged, and `pnpm leak:check` fails the build if one customer’s vocabulary appears in it.',
  },
  {
    kind: 'provider',
    title: 'How a model is reached',
    rule: 'Deployment adapters, not judgement. Two packages and not one on purpose: only one thing depends on the AWS one, and merging them would hand the AWS SDK to everything.',
  },
  {
    kind: 'judgement',
    title: 'What a customer pays for',
    rule: 'The corpus, the prompts, the tools, the schema, the eval cases. None of it transfers, and that is the point.',
  },
  {
    kind: 'surface',
    title: 'What a person sees',
    rule: 'One deployable app each, with its own port and its own entry in the deploy workflow.',
  },
];

const STEERING = PACKAGES.find((p) => p.name === '@vantis/steering')!;
const byName = (n: string) => PACKAGES.find((p) => p.name === n);

/** A package chip, carrying the real line count from the generated graph. */
function Pkg({ name }: { name: string }) {
  const p = byName(name);
  return (
    <span
      className="inline-flex items-baseline gap-2 rounded-md border px-2 py-0.5 font-mono text-[0.6875rem] whitespace-nowrap"
      style={{
        borderColor: 'color-mix(in oklab, var(--lesson) 35%, var(--color-ui-line))',
        color: 'var(--lesson)',
      }}
    >
      {name}
      {p && <span className="text-ui-faint">{p.lines.toLocaleString('en-GB')} lines</span>}
    </span>
  );
}

export function Architecture() {
  const edges = PACKAGES.reduce((n, p) => n + p.deps.length, 0);

  return (
    <article className="lesson" style={{ ['--lesson' as string]: '#c084fc' }}>
      <header className="border-b border-ui-line pb-8">
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          the map · not a lesson
        </p>
        <h1 className="mt-4 max-w-[24ch] font-mono text-3xl leading-[1.15] font-semibold tracking-tighter text-ui-fg md:text-4xl">
          Follow one requirement through the repo
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ui-dim">
          A customer requirement arrives at Vantis Steering and an assessed answer is filed. Every stage below
          names the package that does it and the file you can open, and every one of them opens on the real
          code with a plain reading of it.
        </p>
        <p className="mt-6 max-w-[62ch] font-mono text-xs leading-relaxed text-ui-faint">
          the graph is <span className="text-ui-dim">generated</span> from package.json by{' '}
          <span className="text-ui-dim">pnpm arch:graph</span>, last on{' '}
          <span className="text-ui-dim">{GENERATED_AT}</span> — the walk is{' '}
          <span className="text-ui-dim">written by hand</span>, because which file handles which stage is not
          derivable from a manifest
        </p>
      </header>

      <div className="py-10">
        <Step n={1} title="Nineteen packages, four layers, and the dependencies point one way">
          <P>
            The workspace is split by three globs in{' '}
            <code className="font-mono text-ui-fg">pnpm-workspace.yaml</code>, and that split{' '}
            <em className="not-italic text-ui-fg">is</em> the architecture. Nothing below was typed: it is
            read from every <code className="font-mono text-ui-fg">package.json</code> in the repo.
          </P>

          {LAYERS.map((layer) => {
            const inLayer = PACKAGES.filter((p) => p.kind === layer.kind);
            return (
              <div key={layer.kind} className="my-6 rounded-xl border border-ui-line bg-ui-surface p-4">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-sm font-medium text-ui-fg">{layer.title}</span>
                  <span className="font-mono text-[0.6875rem] text-ui-faint">
                    {inLayer.length} packages ·{' '}
                    {inLayer.reduce((n, p) => n + p.lines, 0).toLocaleString('en-GB')} lines
                  </span>
                </p>
                <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{layer.rule}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {inLayer.map((p) => (
                    <li key={p.name}>
                      <Pkg name={p.name} />
                    </li>
                  ))}
                </ul>

                {/* WHERE THE DIRECTORY AND THE LAYER DISAGREE, SAY SO. Two
                    packages live under `packages/` and belong to the surface,
                    and the first version of this page inferred the layer from
                    the directory — which put `@veresk/surface` under "a second
                    engagement uses it unchanged", the exact opposite of why
                    that package exists. */}
                {inLayer.some((p) => p.layerNote) && (
                  <dl className="mt-3 space-y-1.5 border-t border-ui-line pt-3">
                    {inLayer
                      .filter((p) => p.layerNote)
                      .map((p) => (
                        <div key={p.name} className="text-[0.75rem] leading-relaxed">
                          <dt className="inline font-mono text-ui-dim">{p.name}</dt>
                          <dd className="inline text-ui-faint">
                            {' '}
                            lives in <span className="font-mono">{p.glob}</span> — {p.layerNote}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            );
          })}

          <Figure
            title="What Vantis Steering reaches, and what reaches back"
            sub="Eight shared packages, and none of them knows what a steering rack is."
            source={
              <>
                Generated {GENERATED_AT} by <span className="text-ui-dim">pnpm arch:graph</span>.{' '}
                <span className="text-ui-dim">pnpm arch:check</span> fails a build if this disagrees with
                package.json — and it has been shown to catch planted drift, which is the only reason to
                trust it.
              </>
            }
          >
            <BarRows
              rows={PACKAGES.filter((p) => p.deps.length > 0)
                .sort((a, b) => b.deps.length - a.deps.length)
                .map((p) => ({
                  label: p.name,
                  value: p.deps.length,
                  display: `${p.deps.length}`,
                  note: p.deps.join(' · '),
                }))}
              labelWidth={210}
              unit="workspace deps"
              axis={`${PACKAGES.length} packages · ${edges} workspace edges in total`}
            />
          </Figure>

          <Key>
            Read the shape rather than the rows: every package with dependencies is an engagement or an app.
            The shared layer has almost none — <code className="font-mono">@fde/agent</code> reaches{' '}
            <code className="font-mono">@fde/foundry</code> for credentials and{' '}
            <code className="font-mono">@veresk/surface</code> reaches{' '}
            <code className="font-mono">@fde/uikit</code>, and that is all. Dependencies point one way, down.
          </Key>

          <P>
            <code className="font-mono text-ui-fg">@vantis/steering</code> is{' '}
            {STEERING.lines.toLocaleString('en-GB')} lines and reaches {STEERING.deps.length} shared packages.
            Everything else about it had to be written — which is the claim the firm's front page makes, and
            this is where you can check it.
          </P>
        </Step>

        <Step n={2} title="A requirement arrives">
          <P>
            Two doors, one path. The web desk posts to a streaming route; the CLI calls the same function. If
            those two diverged, the eval suite would be measuring something nobody uses.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@vantis/steering-app" />
            <Pkg name="@fde/guard" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            apps/web/steering-app/src/routes/api.assess.tsx · apps/ai/steering/src/cli/assess.ts
          </p>

          <HowItWorks
            title="How the write path refuses — and the one branch where it does not"
            path="packages/guard/src/guard.ts:62–84"
            plain={[
              'Every route that can cause a write or spend money goes through one function. It returns a result object rather than throwing, so a caller cannot forget to handle the failure.',
              'With a key configured, the comparison is constant-time — so a rejection does not leak how much of the credential was right.',
              'With NO key configured in production it returns 503 and refuses to serve. That is the fail-closed half, and the reason text says so at the line rather than in a doc.',
              'And with no key configured in DEVELOPMENT it allows. That is a real exception and worth understanding rather than hiding: the dev server binds loopback, so the thing being protected is not reachable from anywhere else — and the alternative, making every developer set a secret before the app will start, is how people end up committing one.',
            ]}
            lines={[
              'export function authorize(input: GuardInput): GuardResult {',
              "  const configured = (input.configuredKey ?? '').trim();",
              '',
              '  if (!configured) {',
              "    if (input.isDev) return { ok: true, reason: 'dev loopback' };",
              '    return {',
              '      ok: false,',
              '      status: 503,',
              '      reason:',
              "        'API_KEY is not configured. Refusing to serve rather than accepting ' +",
              "        'unauthenticated requests — set API_KEY, or run the dev server, which ' +",
              "        'binds loopback.',",
              '    };',
              '  }',
              '',
              "  const presented = (input.presentedKey ?? '').trim();",
              '  if (!presented) {',
              "    return { ok: false, status: 401, reason: 'missing x-api-key header' };",
              '  }',
              '  if (!sameSecret(configured, presented)) {',
              "    return { ok: false, status: 401, reason: 'x-api-key does not match' };",
              '  }',
              "  return { ok: true, reason: 'key matched' };",
              '}',
            ]}
            mark={[4, 7, 19]}
            says={[
              { at: "if (input.isDev) … 'dev loopback'", is: 'The exception. Unconfigured in development allows, because the dev server binds loopback — this is the one line a page teaching "fail closed" must not omit, and an earlier version of this walkthrough did.' },
              { at: 'status: 503', is: 'Not 401. Unconfigured is a server fault, not a bad credential, and saying so is the difference between somebody fixing their environment and somebody hunting for the right key.' },
              { at: 'sameSecret(configured, presented)', is: 'Constant-time comparison with a length check ahead of it, so a rejection does not leak how much of the credential was right.' },
            ]}
            trap="This walkthrough shipped as a PARAPHRASE, under this real path, with invented identifiers and the dev branch missing — so it taught fail-closed while omitting the one path that fails open. It was caught by somebody diffing the excerpt against the file. `HowItWorks` now marks an excerpt as verbatim or assembled for exactly that reason."
          />

        </Step>

        <Step n={3} title="The loop runs, and the model never touches anything">
          <P>
            The tool-calling loop is <code className="font-mono text-ui-fg">@fde/agent</code> — the same loop
            all three engagements use, behind one contract with three interchangeable engines. The model picks
            a tool and fills in arguments; this repo's code decides whether to answer.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@fde/agent" />
            <Pkg name="@fde/foundry" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            packages/agent/src/sdk/loop.ts · apps/ai/steering/src/agent/loop/assess-requirement.ts
          </p>

          <P>
            Credentials come from <code className="font-mono text-ui-fg">@fde/foundry</code>, which is 94
            lines — an Entra token, no static key, nothing beginning{' '}
            <code className="font-mono text-ui-fg">sk-</code>. Its sibling{' '}
            <code className="font-mono text-ui-fg">@fde/bedrock</code> is 571 lines, and 167 of those are a
            protocol translation Azure does not need. That asymmetry is why they are two packages.
          </P>

          <Key>
            <Link to="/learn/loop" className="text-ui-accent hover:opacity-80">
              Lesson 4 of the machine
            </Link>{' '}
            is this file in detail — including the two framework defaults that had to be turned off, one of
            which was shipping tool results to a second host.
          </Key>
        </Step>

        <Step n={4} title="Two tools, and every rule lives inside them">
          <P>
            The model can call exactly two things. Both are ordinary functions with descriptions; neither hands
            over a database connection.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@fde/grounding" />
            <Pkg name="@vantis/steering" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            apps/ai/steering/src/agent/tool/search-documents.tool.ts ·
            apps/ai/steering/src/tools/functions/find-comparable-work.ts
          </p>

          <HowItWorks
            title="How the pricing tool refuses, and why the rules are in the function"
            path="apps/ai/steering/src/tools/functions/find-comparable-work.ts:24–47"
            plain={[
              'Three rules: price from the median and never the mean, say how many past jobs it rests on every time, and refuse below three rather than produce a figure.',
              'They live INSIDE the function, where a caller cannot route around them. A rule in a prompt is a request the model can talk itself out of; a rule in a function is a property of the system.',
              'The threshold and the median are IMPORTED from one place, shared with the hand-worked answer key — because two implementations of "three comparables" is how a refusal rule quietly becomes two different refusal rules.',
              'And a refusal carries no number anywhere. Median, mean, total and spread all come back empty, not zero — because zero is a price, and somebody will read past the sentence and use it.',
            ]}
            lines={[
              ' * `median`, `mean`, `round` and `MIN_COMPARABLES` are imported from',
              ' * `derive.ts`, so the threshold cannot drift between the walk and the tool.',
              ' * Two implementations of "three comparables" is how a refusal rule quietly',
              ' * becomes two different refusal rules.',
              ' *',
              ' * ── THE RULES LIVE IN HERE, WHERE A CALLER CANNOT ROUTE AROUND THEM ──',
              ' *',
              ' * Price from the median, never the mean. Say `n` every time. Refuse below',
              ' * three. A caller that wanted to ignore any of those would have to reach',
              ' * past this function into the department, and `sql:check` plus the shape of',
              ' * what is returned make that a deliberate act rather than an accident.',
              ' */',
              "import { median, mean, round, MIN_COMPARABLES } from '../../answer/derive';",
            ]}
            mark={[5, 7, 11]}
            says={[
              { at: 'MIN_COMPARABLES from derive.ts', is: 'One definition, shared with the hand-worked answer key. The threshold cannot drift between the two things that enforce it.' },
              { at: 'THE RULES LIVE IN HERE', is: 'Not in the prompt. The guessing lesson is what a prompt rule is worth when the model has nothing to read.' },
              { at: 'sql:check', is: 'A separate check asserting nobody reaches past this function into the database directly.' },
            ]}
            trap="The rules were not designed. They came out of a person pricing one requirement by hand and getting it wrong: the mean was 54% higher than the median on that set, because one past job had absorbed a production-line relocation."
          />

          <Key>
            <Link to="/learn/tools" className="text-ui-accent hover:opacity-80">
              The tools lesson
            </Link>{' '}
            is these two functions in full, including the two search failures that are exact opposites and the
            reason there is no relevance threshold.
          </Key>
        </Step>

        <Step n={5} title="The answer is held to a contract">
          <P>
            Not prose that gets checked afterwards — a strict JSON schema the model decodes against, then a
            second pass for the combinations a shape check cannot express.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@fde/schema" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            apps/ai/steering/src/schema/assessment-schema.ts · packages/schema/src/verify.ts
          </p>
          <P>
            <code className="font-mono text-ui-fg">@fde/schema</code> is 304 lines and supplies the machinery;
            the rules are steering's, because what makes an assessment incoherent is a property of bids and
            not of JSON. The clearest of them: the bid summary's contract has{' '}
            <strong className="font-medium text-ui-fg">no field</strong> for a total — a model that cannot
            represent one cannot produce a wrong one.
          </P>
        </Step>

        <Step n={6} title="What it cost is written down, once, at the time">
          <P>
            One durable line per request — tokens, cached tokens, milliseconds, why it stopped, and a cost
            with the basis it was computed on.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@fde/telemetry" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            packages/telemetry/src/request-log.ts · logs/requests.jsonl
          </p>
          <Key>
            The calls that already happened are gone, and no amount of later tooling brings them back. A
            dashboard is something you add on top of a durable log, never instead of one —{' '}
            <Link to="/learn/cost" className="text-ui-accent hover:opacity-80">
              and the cost lesson
            </Link>{' '}
            is what one one-liner over that file turned up.
          </Key>
        </Step>

        <Step n={7} title="It is filed, and then it is measured">
          <P>
            The assessment is written to the derived database with its trace; the eval suite replays a fixed
            set of questions against the same path and reports a rate over five runs.
          </P>
          <p className="flex flex-wrap gap-2">
            <Pkg name="@fde/evals" />
            <Pkg name="@fde/estate" />
          </p>
          <p className="mt-2 font-mono text-[0.75rem] text-ui-faint">
            apps/ai/steering/src/cli/file-assessment.ts · packages/evals/src/suite.ts
          </p>
          <P>
            The eval calls the same function the desk calls. That is load-bearing: a suite that ran a
            different path would measure something nobody uses, and the claim that it takes exactly the path a
            real request takes is what makes its number worth quoting.
          </P>
          <Key>
            And the trace filed here is where{' '}
            <Link to="/learn/forensics" className="text-ui-accent hover:opacity-80">
              the forensics lesson
            </Link>{' '}
            found two incompatible shapes in one column — a defect that nearly reported the only priced
            answer in the bid as invented.
          </Key>
        </Step>

        <Step n={8} title="The rule that keeps the layers honest">
          <P>
            A shared package may not know what a claim, a batch or a steering rack is. That is not a
            convention —{' '}
            <code className="font-mono text-ui-fg">pnpm leak:check</code> scans every executable line of{' '}
            <code className="font-mono text-ui-fg">packages/*/src</code> and fails the build on one customer's
            vocabulary.
          </P>
          <P>
            Comments are exempt on purpose, because the reasoning in those packages is often{' '}
            <em className="not-italic text-ui-fg">about</em> the domain boundary. And the checker plants a
            synthetic leak and asserts it catches its own plant — because it once passed clean while silently
            stripping a real leaked credential URL, mistaking{' '}
            <code className="font-mono text-ui-fg">postgresql://…</code> for a trailing comment.
          </P>
          <Key>
            A checker that has never been shown to fail is not evidence of anything. That applies to this
            page's own graph too, which is why{' '}
            <code className="font-mono text-ui-fg">arch:check</code> was run against planted drift before it
            was trusted.
          </Key>
        </Step>

        <RunIt
          items={[
            { cmd: 'pnpm arch:graph', does: 'Regenerate the package graph this page draws, from every package.json.', cost: 'free' },
            { cmd: 'pnpm arch:check', does: 'Fail if the drawing disagrees with package.json. Proven to catch planted drift.', cost: 'free' },
            { cmd: 'pnpm leak:check', does: 'No customer vocabulary in the shared layer, with its own negative control.', cost: 'free' },
            { cmd: 'pnpm steering:assess <REF> --trace', does: 'One requirement through every stage above, with the full turn record kept. About 2 cents.', cost: 'money' },
          ]}
        />

        <Caveat
          items={[
            {
              claim: 'The walk is hand-written and can go stale.',
              body: 'The graph cannot — arch:check fails a build on it. But if a stage moves to a different file, nothing here notices. That asymmetry is deliberate and it is the honest state of this page.',
            },
            {
              claim: 'Line counts are a weak measure.',
              body: 'This repo writes its reasoning down, so much of every count is prose. Generated files and .d.ts are excluded; comments are not. It is shown because it is reproducible and the alternative was an adjective.',
            },
            {
              claim: 'One engagement’s path, not the only one.',
              body: 'Meridian Pharma and Meridian Mutual run through the same shared packages with different judgement on top. The stages would be the same; the files under apps/ai/ would not.',
            },
          ]}
        />
      </div>
    </article>
  );
}
