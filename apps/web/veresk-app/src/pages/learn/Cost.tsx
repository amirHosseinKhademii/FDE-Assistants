/**
 * Operations lesson 3 — what it costs, and the denominator nobody picks.
 *
 * A READING OF `docs/steering/OPERATIONS.md` §3.
 *
 * THE MOST MEASURED PAGE IN THIS TRACK. Every figure came off
 * `logs/requests.jsonl` or off a price table checked against the actual Azure
 * bill, and the one-liner that reprints the table is on the figure.
 *
 * THE HEADLINE CARRIES A CAVEAT THAT MUST TRAVEL WITH IT. "The eval suite is
 * 68.5% of spend" is a property of a PRE-PRODUCTION repo — the bid ran once,
 * the suite ran through every change that built it. It inverts the day real
 * traffic exists, and a page that printed the share without that would be
 * teaching a conclusion that is wrong everywhere else.
 *
 * EVERY FIGURE HERE WAS CORRECTED ONCE, BY THE COMMAND THAT NOW PRINTS IT. The
 * first version of this page carried 74% and a $0.0177 median, both computed by
 * hand. `pnpm steering:spend` found a whole surface missing from the first and a
 * wrong grouping in the second. The page says so where it matters rather than
 * quietly shipping the better numbers — that correction IS the drift lesson at
 * the end of this track, arriving four pages early.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Data, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';

export function Cost() {
  return (
    <LessonPage slug="cost">
      <Step n={1} title="Where the money actually goes in a tool loop">
        <P>
          A multi-turn agent re-sends its entire conversation every turn. Turn 7 pays for turns 1–6 again. So
          cost grows roughly with the <strong className="font-medium text-ui-fg">square</strong> of the turn
          count, not linearly — and the two levers that matter are how much goes into the context and how many
          turns there are, not the per-token price.
        </P>

        <Figure
          title="Where the tokens are"
          sub="Averaged over the eval suite. Output is the part everybody thinks about and it is 4% of the volume."
          source={
            <>
              <span className="text-ui-dim">steering:eval</span>, measured 2026-09-15 over
              logs/requests.jsonl. docs/steering/OPERATIONS.md §3.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'input, per eval run', value: 102068, display: '102,068', note: '96% of the tokens — the conversation, re-sent every turn' },
              { label: 'output, per eval run', value: 3700, display: '~3,700', note: '4%' },
            ]}
            labelWidth={200}
            axis="0 → 102,068 tokens"
          />
        </Figure>

        <Key>
          Optimising output length is optimising 4%. The lever is the context and the turn count — which is
          why the attention lesson in the next track and this one are the same subject seen from two sides.
        </Key>
      </Step>

      <Step n={2} title="Print spend by surface, and the headline is not what anybody expects">
        <P>
          One <code className="font-mono text-ui-fg">node</code> one-liner over a log that already existed.
          Nobody had printed it.
        </P>

        <Figure
          title="Steering's entire LLM spend, by surface"
          sub="$2.4675 across 142 requests. The expensive thing is not serving customers."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:spend</span> — free, offline, no model, no
              database. It reads logs/requests.jsonl and does arithmetic. Run 2026-09-15.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'steering:eval', value: 1.6897, display: '$1.6897', note: '91 requests · 70.3% cached · measuring ourselves' },
              { label: 'steering:assess-all', value: 0.2647, display: '$0.2647', note: '15 requests · 66.5% cached' },
              { label: 'http — the web desk', value: 0.2088, display: '$0.2088', note: '19 requests · 60.6% cached' },
              { label: 'steering:assess', value: 0.1712, display: '$0.1712', note: '9 requests · 59.5% cached' },
              { label: 'steering:desk-summary', value: 0.1019, display: '$0.1019', note: '5 requests · 25.2% cached ← the odd one out, see §3' },
              { label: 'steering:summarise', value: 0.0206, display: '$0.0206', note: '2 requests' },
              { label: 'steering:index', value: 0.0106, display: '$0.0106', note: '1 request · 0% cached' },
            ]}
            labelWidth={210}
            axis="0 → $1.69 · total $2.4675"
          />
        </Figure>

        <Key>
          The eval suite is 68.5% of steering's entire LLM spend — $1.69 of $2.4675. The highest-value cost
          optimisation available is making the suite cheaper to run. Anyone who went straight to model routing
          would have optimised the other third.
        </Key>

        <P>
          <strong className="font-medium text-ui-fg">That number was 74% until the command existed.</strong>{' '}
          The first version of this table was assembled by hand and missed the{' '}
          <code className="font-mono text-ui-fg">http</code> surface entirely — the web desk, $0.2088 over 19
          rows, about 8% of the total. Turning the table into a command found the omission immediately, which
          is the last lesson in this track arriving early.
        </P>

        <P>
          <strong className="font-medium text-ui-fg">And the caveat is as important as the finding.</strong>{' '}
          That ratio is a property of a pre-production system: the log is a development history, not a traffic
          mix. The bid has been run once; the suite has been run through every change that built it.{' '}
          <em className="not-italic text-ui-fg">The moment real traffic exists the ratio inverts</em> — a
          handful of eval runs a week against thousands of assessments, and then routing and caching are where
          the money is.
        </P>

        <Key>
          The transferable lesson is not “evals are expensive”. It is that the shape of your spend is not the
          shape you assume, and one one-liner over a log you already keep tells you which regime you are in.
        </Key>
      </Step>

      <Step n={3} title="The prompt cache was already working and nobody enabled it">
        <P>
          66% of input tokens served from cache, at a tenth of the price. Azure does it automatically. The
          second finding in that table cost nothing to discover and nothing to act on.
        </P>

        <Figure
          title="The price table, checked against the bill"
          sub="Not against a published price list — against az consumption usage list."
          source={
            <>
              <span className="text-ui-dim">apps/ai/steering/src/telemetry/prices.ts</span>, meters confirmed
              against the actual Azure bill. docs/steering/OPERATIONS.md §3.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'output', value: 2.0, display: '$2.00 / M', note: '8× the price of fresh input' },
              { label: 'input, fresh', value: 0.25, display: '$0.25 / M', note: '' },
              { label: 'input, cached', value: 0.025, display: '$0.025 / M', note: 'one TENTH — and 66% of input is already on this meter' },
              { label: 'embeddings', value: 0.02, display: '$0.02 / M', note: 'text-embedding-3-small' },
            ]}
            labelWidth={170}
            axis="0 → $2.00 per million tokens"
          />
        </Figure>

        <Key>
          The commonly-published discount for Azure prompt caching is 50%. The number in this repo is 90%,
          and it came from the bill. A published price list tells you what a meter costs; only the bill tells
          you which meter you are on.
        </Key>

        <HowItWorks
          title="How a cached token is counted without understating the bill"
          path="packages/telemetry/src/request-log.ts:94–155"
          plain={[
            'Cached tokens are a SUBSET of input tokens, not an addition to them. Every provider that reports this reports it that way — and treating it as an addition would make a cache HIT look more expensive.',
            'That is wrong in the direction nobody audits. Cost going up is never the surprise that prompts an investigation.',
            'The field is optional, and `undefined` is NOT `0`. Zero means measured and nothing was cached; undefined means the engine does not report it, so the figure stays a ceiling rather than becoming a guess.',
            'Two independent facts must both hold before any discount is applied: the engine reported cached tokens, AND the deployment has a confirmed cached rate. Either one missing and it stays a ceiling.',
          ]}
          lines={[
            '// Two independent facts have to be true before a discount is applied, and',
            '// either one missing means the figure stays a CEILING rather than becoming a',
            '// guess:',
            '//',
            '//   the ENGINE reported how many tokens were cached   (r.cachedInputTokens)',
            '//   the DEPLOYMENT has a confirmed cached rate        (p.cachedInputPerM)',
            'const reported = r.cachedInputTokens;',
            'const haveRate = typeof p.cachedInputPerM === \'number\';',
            '',
            '// CLAMPED, because a cached count exceeding the input count would make the',
            '// uncached remainder negative and hand back a smaller bill the more absurd',
            '// the reading got.',
            'const cached =',
            '  typeof reported === \'number\' && haveRate',
            '    ? Math.max(0, Math.min(reported, r.inputTokens))',
            '    : 0;',
          ]}
          mark={[6, 7, 14]}
          says={[
            { at: 'reported / haveRate', is: 'Two facts, from two different places. A discount applied on half the evidence understates spend, and understating spend is the direction nobody audits.' },
            { at: 'Math.min(reported, r.inputTokens)', is: 'Clamped. A provider reporting cached > input cannot hand back a smaller bill the more absurd the reading gets.' },
          ]}
          trap="A model with no verified price logs `costUsd: null` plus a reason, never an invented figure. A precise-looking wrong number is worse than an admitted gap, because it gets quoted in a business case and nothing about it looks uncertain."
        />

        <P>
          One more thing falls out of the table for free:{' '}
          <code className="font-mono text-ui-fg">steering:desk-summary</code> caches at{' '}
          <strong className="font-medium text-ui-fg">25.2%</strong> against 66–70% everywhere else. A
          single-call path with a long varying prefix — a cache-aware-ordering candidate, visible in a table
          nobody had printed. The next lesson is about why prefix order decides that.
        </P>
      </Step>

      <Step n={4} title="And the number that decides whether any of it worked">
        <P>
          Cost per <em className="not-italic text-ui-fg">call</em> is the easiest number to compute and the
          least useful. The number that matters is{' '}
          <Term def="Spend divided by the outputs a human actually used, rather than by the number of requests made. Which outputs count as accepted is a judgement, and printing only one denominator hides that a judgement was made.">
            cost per accepted answer
          </Term>{' '}
          — and on this bid the two are 24× apart.
        </P>

        <Figure
          title="The same spend, three denominators"
          sub="Nothing about the per-request figure is wrong. It is answering a question nobody asked."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:spend --priced 1</span>, run 2026-09-15. Grouped by
              requirement across every answer surface, newest run each — the same rule the filed-assessment
              reader uses, so a re-run replaces rather than adds. Eval runs are excluded from the denominators
              and kept in the table above.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'per priced answer', value: 0.3637, display: '$0.3637', note: '1 priced of 23 — 24.1× the median' },
              { label: 'per request', value: 0.0151, display: '$0.0151', note: 'median of 23 runs — the easy number' },
              { label: 'per actionable answer', value: 0.0158, display: '$0.0158', note: 'all 23, counting a grounded refusal as an answer' },
            ]}
            labelWidth={200}
            axis="0 → $0.3637"
          />
        </Figure>

        <P>
          <strong className="font-medium text-ui-fg">23, not 24.</strong>{' '}
          <code className="font-mono text-ui-fg">CR-K2-0114</code> reached the cost log on no surface at all.
          The earlier hand-computed median of $0.0177 came from one surface; grouping across all of them and
          taking the newest run each gives $0.0151. <em className="not-italic text-ui-fg">The headline
          survived the stricter method</em> — 24.1× against the 24× the loose one gave — which is the only
          reason it is worth quoting.
        </P>

        <Key>
          The denominator is a judgement, and that is the point. A well-evidenced refusal genuinely is a
          usable answer for a bid meeting. So print all three and name the assumption — a spreadsheet cannot
          then quietly pick the flattering one.
        </Key>

        <Data
          path="docs/steering/OPERATIONS.md §3 — the failure this catches"
          note="the most common failure in this area"
          lines={[
            'An agent whose cost per CALL drops 25%',
            '        while cost per RESOLVED TASK rises 40%',
            '',
            'is the most common failure in this area — and cost-per-call',
            'reports it as a win.',
          ]}
          mark={[0, 1]}
        />
      </Step>

      <Step n={5} title="What is missing: there is a meter and no governor">
        <P>
          Everything above is measurement. Nothing reads the cost signal and acts on it. No budget ceiling, no
          per-request spend cap, no model choice — one model, everywhere — no cost-per-accepted-answer figure
          in any command, nothing watching the search budget against the outcome, and{' '}
          <code className="font-mono text-ui-fg">logs:sync</code> exists with no alert on the other end.
        </P>

        <Key>
          The word to be suspicious of is “auto”. Every lever here trades money against quality, so an
          autopilot without the previous lesson's measurement is not automation — it is an unsupervised
          quality cut.
        </Key>

        <P>
          The two named patterns, for when it is worth building:{' '}
          <strong className="font-medium text-ui-fg">routing</strong> decides before the call which model gets
          the question — one decision, no wasted work, needs a difficulty predictor.{' '}
          <strong className="font-medium text-ui-fg">A cascade</strong> tries the cheap model and escalates on
          failure — simpler and self-correcting, but a failed cheap attempt is pure waste, so the economics
          depend on how often it is right. Published figures (RouteLLM ~85% cost reduction at ~95% of quality;
          FrugalGPT up to 98%) are benchmark upper bounds, not forecasts.
        </P>
      </Step>

      <SaidOutLoud
        then={
          <>
            “So what did you actually cut?” — and the honest answer is that the first three things were free:
            fixtures for the eval suite, prompt ordering for the one path caching at 25%, and a denominator.
          </>
        }
      >
        We had per-request cost on every line from the start, with the cached-token subtlety handled — cached
        tokens are a <strong>subset</strong> of input, not an addition, so treating them as an addition makes
        a cache <em>hit</em> look more expensive, which is wrong in the direction nobody audits. But the
        useful move was printing spend by surface: <strong>68.5%</strong> of it was the eval suite, not
        production. The second was changing the denominator. Median cost per requirement was{' '}
        <strong>1.5 cents</strong> and one of 23 came back with a price, so cost per priced answer was{' '}
        <strong>36 cents</strong> — <strong>24.1×</strong>. Nothing about the per-request number was wrong; it
        was answering a question nobody asked. And both of those figures moved when I made the table a
        command instead of a hand count, which is its own lesson.
      </SaidOutLoud>

      <RunIt
        items={[
          { cmd: 'pnpm steering:spend --priced 1', does: 'Everything on this page: the by-surface table and all three denominators. Reads a log and does arithmetic.', cost: 'free' },
          { cmd: 'pnpm steering:summarise --dry-run', does: 'Counts assessments by outcome, with no model call.', cost: 'free' },
          { cmd: 'pnpm logs:sync', does: 'Ships the per-request telemetry log to Postgres.', cost: 'free' },
          { cmd: 'az consumption usage list', does: 'The actual bill — which is how the cached-input rate in prices.ts was confirmed.', cost: 'free' },
          { cmd: 'pnpm steering:assess-all --run', does: 'The whole bid. About $0.26, and it is where the per-request figures come from.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The 68.5% is a pre-production ratio and inverts with real traffic.',
            body: 'The log is a development history. Re-run the one-liner after the first week of real traffic and expect a different table — that is the point of it being a command rather than a number.',
          },
          {
            claim: 'No cost figure here is a forecast.',
            body: 'They are what was spent, on one corpus, at one price, on dated runs. The published routing and cascade savings are benchmark upper bounds and are labelled as such.',
          },
          {
            claim: 'Nothing acts on any of this.',
            body: 'There is a meter and no governor. Every number on this page is a measurement somebody reads, not a signal anything responds to.',
          },
          {
            claim: '`--priced` is an argument, not a lookup.',
            body: 'The cost log records what a request COST and deliberately nothing of what it SAID, so the tool cannot know how many answers carried a price. Without the flag it prints `unavailable` and names the command that answers it — the same rule as an unpriced model logging costUsd: null with a reason.',
          },
          {
            claim: 'One model, so routing is untested here.',
            body: 'The cheapest capable model is already the only one deployed, which means the biggest published lever is also the one with no evidence behind it on this workload.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'prompt cache', def: 'The provider matching an exact prefix of your token sequence and reusing its internal state. Automatic on Azure, a tenth of the price, and it cannot be wrong.' },
          { word: 'cost per accepted answer', def: 'Spend divided by outputs a human used, not by requests made. Which outputs count is a judgement, so print every denominator.' },
          { word: 'ceiling', def: 'A cost figure computed without applying a discount you could not fully evidence. A number you can defend, rather than one that understates.' },
          { word: 'routing', def: 'Choosing the model before the call. One decision, no wasted work, needs a difficulty predictor.' },
          { word: 'cascade', def: 'Trying the cheap model and escalating on failure. Self-correcting, but a failed cheap attempt is pure waste.' },
        ]}
      />
    </LessonPage>
  );
}
