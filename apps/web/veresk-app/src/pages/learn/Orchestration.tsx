/**
 * Beyond lesson 4 — one loop is not always the shape.
 *
 * A READING OF `docs/beyond-retrieval/ORCHESTRATION.md`.
 *
 * FIG-ORC-2 IS A CHART THAT READS BACKWARDS IF THE LABELS ARE LAZY. The fan-out
 * bar is SHORTER and represents MORE work — 24 turns against 12 — because the
 * quantity is cost per turn and fan-out turns do not accumulate a history. Both
 * rows therefore carry their total as well as their rate, and the figure's
 * subtitle says which direction is good, because "shorter bar, more work" is
 * not a thing a reader should have to infer from a legend.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Orchestration() {
  return (
    <LessonPage slug="orchestration">
      <Step n={1} title="Many small agents, then one that reads all of them">
        <P>
          One agent per item, each seeing only its own. Then an assembler that sees every result and writes
          the part no individual agent could — the patterns across items, the findings that belong to no
          single one.
        </P>

        <Figure
          title="Fan out, then assemble"
          kind="illustration"
          sub="A drawing of the shape. The rule under each stage is the part that was learned rather than designed."
          source="packages/agent/src/core/fanout.ts. The counts beside it — 24 requirements, 220 reports — are real units from the two engagements."
        >
          <Stages
            stages={[
              {
                verb: 'split',
                out: 'N items',
                does: 'the customer’s own units — 24 requirements, 220 closure reports',
                rule: 'if they are not independent, stop: this is a pipeline, not a fan-out',
              },
              {
                verb: 'brief',
                out: 'one prompt per item',
                does: 'briefFor() — the most important function you will write',
                rule: '“the evidence never reached the prompt” looks exactly like bad reasoning',
              },
              {
                verb: 'fan out',
                out: 'N judgements',
                does: 'concurrency 4. NO TOOLS — the brief carries the facts.',
                rule: 'isolation by what an agent is GIVEN, not by what it is allowed',
              },
              {
                verb: 'assemble',
                out: 'the across-items part only',
                does: 'one agent reads all N',
                rule: 'its schema MUST NOT contain the items — it may not rewrite what it did not judge',
              },
            ]}
          />
        </Figure>

        <Key>
          An agent judging item 6 alone cannot notice that items 6, 11 and 19 all name the same customer. The
          assembler exists because that is the honest cost of isolation, made visible rather than wished away.
        </Key>
      </Step>

      <Step n={2} title="The industry argued for a year and converged">
        <P>
          Two labs published opposite advice about multi-agent systems within months of each other, and ten
          months later had converged on one rule. The convergence is more useful than either original
          position.
        </P>

        <Figure
          title="The published disagreement, and where this repo sits"
          kind="illustration"
          sub="A reading of four positions. Press a row for what the claim actually means and what it costs to get wrong."
          source={
            <>
              The positions are Anthropic’s multi-agent research post and Cognition’s{' '}
              <em>Don’t Build Multi-Agents</em> and its 2026 follow-up, fetched 2026-09-15. The fourth column
              is this repo’s own code.
            </>
          }
        >
          <Matrix
            rowHeader="claim"
            marks={{
              live: { glyph: '●', word: 'yes', colour: 'var(--lesson)' },
              wired: { glyph: '◐', word: 'conditionally', colour: 'var(--color-ui-faint)' },
              refuses: { glyph: '—', word: 'no', colour: 'var(--color-ui-faint)' },
            }}
            columns={['Anthropic 2025', 'Cognition 2025', 'Cognition 2026', 'here']}
            rows={[
              {
                name: 'subagents may READ in parallel',
                cells: [
                  { state: 'live', detail: 'yes' },
                  { state: 'wired', detail: 'with care' },
                  { state: 'live', detail: 'yes' },
                  { state: 'live', detail: 'concurrency 4' },
                ],
                explain: {
                  what: [
                    'Several agents each read a different part of the material at the same time, and none of them changes anything.',
                    'Nobody actually disputes this, and it is where almost all of the wall-clock saving in a fan-out comes from.',
                    'Reading is safe to parallelise for the same reason it is safe in a database: two readers cannot disagree about what they read.',
                  ],
                  example: {
                    caption: 'twenty-four requirements, four at a time',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: ['pnpm steering:assess-all --run   # concurrency 4, serial-resumable'],
                  },
                  why: 'Running here, and it is the ordinary case rather than the interesting one.',
                },
              },
              {
                name: 'subagents may WRITE in parallel',
                cells: [
                  { state: 'refuses', detail: 'no' },
                  { state: 'refuses', detail: 'no' },
                  { state: 'refuses', detail: 'no' },
                  { state: 'refuses', detail: 'enforced by schema' },
                ],
                explain: {
                  what: [
                    'Two agents both deciding to change the same thing, at the same time, with no way to reconcile the two decisions.',
                    'This is the one point every published position agrees on, and it has a name outside this field: the single-writer principle.',
                    'The failure is not a race condition in the usual sense. It is two plausible, well-argued, incompatible outcomes, each produced by an agent that could not see the other.',
                  ],
                  example: {
                    caption: 'how the fan-out makes it impossible rather than discouraged',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      '// the workers have NO tools — they cannot reach anything to write to',
                      'const judgements = await fanout(items, briefFor, { tools: [] });',
                      '',
                      '// and the assembler schema has no field for an item-level verdict,',
                      '// so it cannot overwrite a judgement it did not make',
                      'const SummarySchema = z.strictObject({ across: z.string(), risks: z.array(z.string()) });',
                    ],
                  },
                  why: 'Unanimous in the literature and enforced here by construction rather than by convention — the workers have no tools and the assembler has no field to write into.',
                },
              },
              {
                name: 'subagents share full traces',
                cells: [
                  { state: 'refuses', detail: 'no' },
                  { state: 'live', detail: 'yes' },
                  { state: 'live', detail: 'yes' },
                  { state: 'refuses', detail: 'brief only' },
                ],
                explain: {
                  what: [
                    'Whether each agent sees the whole conversation so far — every other agent’s reasoning — or only a brief written for it.',
                    'This is the one real disagreement left. Sharing everything means no agent misses context; it also means every agent pays for every other agent’s history on every turn, which is precisely the accumulation that makes a single loop expensive.',
                    'Here each worker gets a brief and nothing else. That is why a fan-out turn costs a fraction of a single-loop turn — and it is also why the assembler has to exist.',
                  ],
                  example: {
                    caption: 'the brief is the isolation boundary',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      '// each worker sees THIS and nothing else — no sibling output, no shared trace',
                      'briefFor(item) → { requirement, evidence[], rules }',
                    ],
                  },
                  why: 'A live disagreement, and this repo has taken the cheaper side of it deliberately. The cost of that choice is the row below.',
                },
              },
              {
                name: 'an assembler writes across items',
                cells: [
                  { state: 'live', detail: 'yes' },
                  { state: 'refuses', detail: 'no' },
                  { state: 'live', detail: 'yes' },
                  { state: 'live', detail: 'summarise-bid' },
                ],
                explain: {
                  what: [
                    'A second, smaller agent reads all the finished judgements and writes the part that belongs to no single one of them.',
                    'It exists because isolation has a cost: an agent that only saw item 6 cannot tell you that items 6, 11 and 19 all point at the same supplier.',
                    'Its schema deliberately has no field for an item-level verdict, so it can describe what it saw across the set without being able to overwrite any individual judgement.',
                  ],
                  example: {
                    caption: 'the second agent, and what it is not allowed to contain',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: [
                      'pnpm steering:summarise   # reads 24 finished assessments',
                      '#   → two written paragraphs about the set',
                      '#   → and NO per-requirement verdicts: it may not rewrite what it did not judge',
                    ],
                  },
                  why: 'fanout.ts calls this the honest cost of isolation, made visible. The alternative is pretending the isolated agents saw the whole picture.',
                },
              },
            ]}
            footnote="Nothing here is a severity. “No” is a position somebody argued for, not a defect."
          />
        </Figure>
      </Step>

      <Step n={3} title="The measured surprise: twice the turns, a quarter of the tokens">
        <Figure
          title="Cost per turn, and why the shorter bar is doing more work"
          sub="Lower is better here, and the fan-out row has TWICE the turns of the row above it. A single loop re-sends its whole history every turn; fan-out turns do not accumulate, so each agent starts fresh."
          source={
            <>
              MEASURED HERE — the same telemetry log behind lesson 3 of the patterns track, with the fan-out
              surfaces included rather than excluded. Producer in docs/beyond-retrieval/ORCHESTRATION.md §4.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'single loop, 12 turns',
                value: 11348,
                display: '11,348 per turn',
                note: 'median 136,174 tokens in total — every turn re-sends the whole history',
              },
              {
                label: 'fan-out, 24 turns',
                value: 1439,
                display: '1,439 per turn',
                note: 'median 34,533 tokens in total — nothing accumulates; each agent starts fresh',
              },
            ]}
            labelWidth={200}
            axis="0 → ~11,350 input tokens per turn"
          />
        </Figure>

        <Key>
          A 24-turn fan-out is cheaper in total than a 12-turn single loop — 34,533 against 136,174 — which
          is the opposite of what “twice as many agent turns” sounds like. The quantity that grows is not
          turns, it is history, and a fan-out has none to grow.
        </Key>

        <P>
          The second measured fact is about isolation rather than cost:{' '}
          <strong className="font-medium text-ui-fg">all sixteen fan-out runs made zero tool calls.</strong>{' '}
          Not because a policy forbade it — because the workers were given no tools, and the brief carried
          the facts they needed.
        </P>

        <HowItWorks
          title="What the fan-out refuses to decide for you"
          path="packages/agent/src/core/fanout.ts:11–27"
          plain={[
            'Twenty-three independent calls will not all succeed forever. This reports exactly which items failed and which were never attempted — and it does NOT decide whether what is left is usable.',
            'That is a judgement about your domain. A work list short of the lots it should contain was a lie of omission about patient exposure in one caller; somewhere else the same gap is a rounding error.',
            'The failure that motivated saying so out loud: a --limit flag intended as a cheap first look produced a four-row list under a summary describing all twenty-three, because "skipped" and "failed" were conflated and skipped items counted as neither.',
            'So notAttempted and failed are separate fields. One was a choice and the other was an error, and they read completely differently to a human.',
          ]}
          lines={[
            ' * ══ WHAT THIS PACKAGE REFUSES TO DECIDE ═══════════════════════════════════',
            ' *',
            ' * WHAT A PARTIAL RESULT MEANS.',
            ' *',
            ' * Twenty-three independent calls will not all succeed forever. This reports',
            ' * exactly which items failed and which were never attempted — it does NOT',
            ' * decide whether what is left is usable. In the caller this was extracted from,',
            ' * a work list short of the lots it should contain was a lie of omission about',
            ' * patient exposure; somewhere else it is a rounding error. That is a judgement',
            ' * about YOUR domain and it stays with you.',
            ' *',
            ' * The failure that motivated saying so: a `--limit` flag intended as a cheap',
            ' * first look produced a four-row list under a summary describing all',
            ' * twenty-three, because "skipped" and "failed" were conflated and skipped items',
            ' * were counted as neither. Hence `notAttempted` and `failed` are SEPARATE',
            ' * fields here — one was a choice, the other an error, and they read differently',
            ' * to a human.',
          ]}
          mark={[5, 11, 14]}
          trap="A summary describing twenty-three items over a four-row list is not wrong about the four. It is wrong about the nineteen it never mentions, which is the harder kind of wrong to notice."
        />

        <Figure
          title="The bug that named two fields"
          sub="The summary was not wrong about what it showed. It was wrong about what it did not show, which is why “skipped” and “failed” had to stop being one thing."
          source="MEASURED HERE — packages/agent/src/core/fanout.ts and the --limit incident it records."
        >
          <Funnel
            stages={[
              { n: 23, label: 'items in the bid', op: 'the list', why: 'the 24-requirement work list' },
              { n: 4, label: 'returned by --limit', op: 'a CHOICE', why: 'notAttempted — not a failure' },
              {
                n: 4,
                label: 'described by the summary',
                why: 'which said twenty-three. It was not wrong about the four; it was wrong about the nineteen it never mentioned.',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={4} title="What the shape costs">
        <Figure
          title="Token cost of the orchestrator-worker shape"
          kind="cited"
          sub="Against a single-agent chat as the baseline. The same report has it beating single-agent Opus 4 by 90.2% on their internal research eval — the cost and the capability are both real."
          source={
            <>
              CITED — Anthropic, on building a multi-agent research system, fetched 2026-09-15. Their
              workload, not ours.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'single-agent chat', value: 1, display: '1×', note: 'baseline' },
              {
                label: 'multi-agent research system',
                value: 15,
                display: '≈15×',
                note: 'and it beat single-agent Opus 4 by 90.2% on their internal research eval',
              },
            ]}
            labelWidth={230}
            axis="0 → ~15× the tokens of a single-agent chat"
          />
        </Figure>

        <Key>
          Which does not contradict the measurement in step 3. Theirs is a research agent that fans out to
          explore an open question; ours fans out over{' '}
          <Term def="Units the customer already defined — 24 requirements, 220 closure reports — rather than units discovered by clustering.">
            units the customer already defined
          </Term>
          . The first multiplies the work; the second divides it.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:assess-all', does: 'the whole 24-requirement work list — spends nothing', cost: 'free' },
          { cmd: 'pnpm pharma:fanout-check', does: 'asserts the fan-out’s own contract', cost: 'free' },
          { cmd: 'pnpm steering:assess-all --run --limit 1', does: 'one requirement, for real', cost: 'money' },
          { cmd: 'pnpm steering:summarise', does: 'the assembler, across finished assessments', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “If it is cheaper, why is anything still a single loop?” Because fan-out needs the items to be
            genuinely independent. If judging item 7 requires knowing what item 3 concluded, you do not have
            a fan-out, you have a pipeline pretending to be one — and the brief for item 7 would be a lie.
          </>
        }
      >
        Two labs published opposite advice about multi-agent systems and converged on one rule ten months
        later: agents may read in parallel, and writes stay single-threaded. Our fan-out had already enforced
        that, not by policy but by construction — the workers have no tools at all, so there is nothing for
        them to write to. The surprise was the cost. A fan-out with twenty-four turns is cheaper in total
        than a single loop with twelve, because a single loop re-sends its whole conversation every turn and
        fan-out turns have no conversation to re-send.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'The per-turn comparison is not like-for-like work.',
            body: 'A fan-out turn answers one requirement from a prepared brief; a single-loop turn is mid-conversation and may be doing anything. The 7.9× is real and it is a comparison of two different shapes, not of one shape run two ways.',
          },
          {
            claim: 'Sixteen fan-out runs is a small sample.',
            body: 'Enough to say the workers made zero tool calls — that follows from having no tools — and not enough to characterise a distribution the way the 893 single-loop runs do.',
          },
          {
            claim: 'The 15× figure is somebody else’s workload.',
            body: 'An open-ended research agent, measured by its authors. It is quoted for the shape of the trade, not as a number that would transfer to a bid response.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'fan-out', def: 'One agent per item, run independently, each seeing only its own brief.' },
          { word: 'assembler', def: 'A second agent that reads every finished judgement and writes only the part that spans them.' },
          { word: 'single-writer principle', def: 'At most one thing may change a given piece of state. The one point every published position on multi-agent systems agrees about.' },
          { word: 'brief', def: 'The prompt written for one worker, carrying the facts it needs because it has no tools to fetch them.' },
          { word: 'notAttempted', def: 'An item deliberately skipped, kept as a separate field from one that failed — a choice and an error read differently to a human.' },
        ]}
      />
    </LessonPage>
  );
}
