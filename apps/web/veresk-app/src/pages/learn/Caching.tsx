/**
 * Operations lesson 4 — two caches, and only one of them can be wrong.
 *
 * A READING OF `docs/steering/OPERATIONS.md` §4.
 *
 * ── THE ONE PAGE IN THIS SECTION WHOSE CONCLUSION IS "DO NOT BUILD IT" ──────
 *
 * That is not a hedge. §4 is written so that "no" is an allowed outcome, and a
 * measured decision not to ship is a better engineering result than an
 * unmeasured build. The page keeps that as its conclusion.
 *
 * THE THRESHOLD SWEEP IN THAT DOCUMENT IS INVENTED and is labelled illustrative
 * there. It is rendered here with `kind="illustration"` and a sentence saying
 * the numbers are the shape of a decision rather than a result — because a
 * sweep table rendered like every other figure in this section would be the
 * one place the whole section's promise breaks.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { EITHER_OR, Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Caching() {
  return (
    <LessonPage slug="caching">
      <Step n={1} title="Two things called a cache, and they are not the same thing">
        <P>
          These get confused constantly, and the difference is the entire subject: one of them cannot be
          wrong, and the other one can.
        </P>

        <Figure
          title="Prompt cache against semantic cache"
          sub="The last row is the one that decides whether you build the second one."
          source="docs/steering/OPERATIONS.md §3 and §4. The 66% figure is measured — see below."
        >
          <Matrix
            marks={EITHER_OR}
            rowHeader="the question"
            columns={['prompt cache — the provider’s', 'semantic cache — yours']}
            rows={[
              {
                name: 'What does it match on?',
                cells: [
                  { state: 'live', detail: 'an exact PREFIX of the token sequence' },
                  { state: 'live', detail: 'meaning — embedding similarity' },
                ],
              },
              {
                name: 'What does it store?',
                cells: [
                  { state: 'live', detail: "the model's internal attention state" },
                  { state: 'live', detail: 'the finished answer' },
                ],
              },
              {
                name: 'Who runs it?',
                cells: [
                  { state: 'live', detail: 'the provider, automatically' },
                  { state: 'refuses', detail: 'you do' },
                ],
              },
              {
                name: 'Can it return a wrong answer?',
                cells: [
                  { state: 'refuses', detail: 'no — identical prefix, identical computation' },
                  { state: 'live', detail: 'YES. That is its whole risk.' },
                ],
              },
              {
                name: 'What does a hit save?',
                cells: [
                  { state: 'live', detail: 'input tokens, at one tenth the price' },
                  { state: 'live', detail: 'the entire call' },
                ],
              },
            ]}
            footnote="Read the marks as “this is what this column does”, not as severity. Prompt caching is free money with no correctness risk. Semantic caching is a product decision with a failure mode — so exhaust the first before touching the second."
          />
        </Figure>

        <Figure
          title="And the first one is already working"
          sub="Nobody enabled it. Azure caches automatically."
          source={
            <>
              Measured 2026-09-15 over <span className="text-ui-dim">logs/requests.jsonl</span>. Rates from
              apps/ai/steering/src/telemetry/prices.ts, confirmed against the bill.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'input tokens served from cache', value: 66, display: '66%', note: 'at $0.025/M against $0.25/M — one tenth' },
              { label: 'steering:desk-summary', value: 25.2, display: '25.2%', note: 'the outlier — a long varying prefix. See §3.' },
            ]}
            max={100}
            labelWidth={230}
            axis="0 → 100% of input tokens"
          />
        </Figure>

        <Key>
          Two thirds of the input is already on the cheap meter, for free, with zero correctness risk. The
          remaining headroom is smaller than a cache-shaped hole looks.
        </Key>

        <HowItWorks
          title="How a prompt-cache hit is counted, and why it cannot be a guess"
          path="packages/telemetry/src/request-log.ts:94–155"
          plain={[
            'The provider tells you how many input tokens it served from its cache. That number is a SUBSET of the input count, not an addition to it — so a hit makes a request cheaper, and treating it as an addition would make a hit look more expensive.',
            'That is wrong in the direction nobody audits: cost going UP is never the surprise that prompts an investigation.',
            'The field is optional, and `undefined` is not `0`. Zero means measured and nothing was cached. Undefined means this engine does not report it — so the cost stays a CEILING rather than becoming a guess.',
            'And two facts must both hold before any discount is applied: the engine reported cached tokens, and the deployment has a confirmed cached rate. Either missing and it stays a ceiling. That is why the 66% on this page is a measurement rather than an estimate.',
          ]}
          lines={[
            '// Two independent facts have to be true before a discount is applied, and',
            '// either one missing means the figure stays a CEILING rather than becoming a',
            '// guess.',
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
          mark={[3, 4, 11]}
          says={[
            { at: 'reported / haveRate', is: 'Two facts from two different places. A discount on half the evidence understates spend, and understating spend is the direction nobody audits.' },
            { at: 'Math.min(reported, r.inputTokens)', is: 'Clamped. A provider reporting cached greater than input cannot hand back a smaller bill the more absurd the reading gets.' },
          ]}
          trap="This is also what makes the 25.2% outlier on the desk-summary path trustworthy enough to act on. A cache figure computed by guessing at the missing half would have shown that path as fine."
        />
      </Step>

      <Step n={2} title="Why prefix order decides the hit rate">
        <P>
          Because the match is on a <em className="not-italic text-ui-fg">prefix</em>, one changed token early
          in the message array invalidates everything after it. That makes ordering a free lever — and
          explains the 25% outlier above.
        </P>

        <Figure
          title="The ordering that maximises hits"
          sub="Most stable first. Anything that varies per request goes last."
          source="docs/steering/OPERATIONS.md §3. Azure and OpenAI engage the cache at ≥1,024 tokens and grow it in 128-token increments; Anthropic uses explicit cache_control breakpoints with a 5-minute TTL."
        >
          <Stages
            stages={[
              { verb: '1', out: 'tool definitions', does: 'Change only when you ship a new tool.' },
              { verb: '2', out: 'system prompt', does: 'Changes when you edit it, which is rarely and deliberately.' },
              { verb: '3', out: 'few-shot examples', does: 'Stable across requests by construction.' },
              { verb: '4', out: 'retrieved context', does: 'Varies per question — but it is the same for every turn of one question.' },
              {
                verb: '5',
                out: "the user's question",
                does: 'Varies every time, so it goes last.',
                rule: 'Put this first and the prefix is different on every single request, which is exactly a 0% hit rate from a cache that is switched on and working.',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={3} title="The semantic cache, and the threshold that is the whole product">
        <P>
          The mechanism is genuinely simple. Embed the question, find the nearest stored question, and if it
          is close enough, return the stored answer without calling the model.
        </P>

        <Data
          path="docs/steering/OPERATIONS.md §4 — the mechanism"
          note="the whole of it"
          lines={[
            'question → embed → nearest stored question by cosine similarity',
            '         → similarity ≥ threshold ?',
            '              yes → return the stored answer.  No model call.',
            '              no  → call the model, store (embedding, question, answer)',
          ]}
          mark={[1]}
        />

        <P>
          <strong className="font-medium text-ui-fg">The threshold is the entire product decision.</strong> Too
          low and the cache answers a <em className="not-italic text-ui-fg">different</em> question — a{' '}
          <Term def="A semantic cache returning a stored answer to a question that is close in embedding space but is not the same question. The dangerous failure, because the answer looks well-formed and confident.">false hit</Term>
          , which is the dangerous failure. Too high and it never hits, and you have paid for embeddings and a
          database to achieve nothing.
        </P>

        <Figure
          title="Threshold against hit rate and false hits"
          kind="proposed"
          sub="This is the SHAPE of the decision. The numbers are invented to show what the trade looks like — no sweep has been run on this workload."
          source={
            <>
              docs/steering/OPERATIONS.md §4, where this table is labelled illustrative.{' '}
              <strong className="text-ui-dim">Nothing here is a measurement.</strong> What IS defensible:
              published production practice sits at 0.92–0.97; below 0.90 false positives degrade quality;
              above 0.98 it rarely hits. Redis LangCache ships a 0.65 default, which is a demo default.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'threshold 0.90', value: 17, display: '17 of 24 false', note: 'hit rate 41% — unusable' },
              { label: 'threshold 0.95', value: 3, display: '3 of 24 false', note: 'hit rate 12%' },
              { label: 'threshold 0.97', value: 0, display: '0 false', note: 'hit rate 4%' },
              { label: 'threshold 0.99', value: 0, display: '0 false', note: 'hit rate 1%' },
            ]}
            max={24}
            labelWidth={190}
            axis="0 → 24 adversary pairs · illustrative"
          />
        </Figure>

        <Key>
          False-hit rates are measurable and tools differ a lot. On one 700-query benchmark, GPTCache produced
          233 false hits where MeanCache produced 89. That number is not a detail — it is the product.
        </Key>
      </Step>

      <Step n={4} title="And the invalidation problem that sinks naive implementations">
        <P>
          A cached answer is a function of <strong className="font-medium text-ui-fg">four</strong> things, and
          the key has to carry all four — or the cache serves an answer that was correct under conditions that
          no longer hold.
        </P>

        <Data
          path="docs/steering/OPERATIONS.md §4 — the cache key"
          note="all four, or it serves stale"
          lines={[
            'cache key = (question embedding, corpus version, prompt version, model)',
            '',
            'Change the CORPUS  → every stored answer describes a world that is gone.',
            'Change the PROMPT  → the cache keeps serving the old behaviour: the prompt',
            '                     "ships" and nothing changes, which is a maddening bug',
            '                     to chase because the deploy looks successful.',
            'Change the MODEL   → you are comparing two systems and calling it one.',
          ]}
          mark={[0]}
        />

        <Code
          path="apps/ai/steering/src/telemetry/prices.ts:47–60"
          note="why the cached rate is a separate field, and not a multiplier"
          lines={[
            'const PRICES: Record<string, Price> = {',
            "  'text-embedding-3-small': {",
            '    inputPerM: 0.02,',
            '    outputPerM: 0,',
            '  },',
            "  'gpt-5-mini': {",
            '    inputPerM: 0.25,',
            '    // The `cchd` meter — a TENTH of fresh input. Azure caches automatically and',
            '    // this rate was read off the bill, not off the published price list.',
            '    cachedInputPerM: 0.025,',
            '    outputPerM: 2.0,',
            '  },',
            '};',
          ]}
          mark={[9]}
        />

        <Key>
          Stale cache is worse than no cache. Tie the namespace to the prompt version and it flips on deploy,
          which turns the worst of those four into a non-event.
        </Key>
      </Step>

      <Step n={5} title="The conclusion here is not to build it">
        <P>
          Three specific reasons, on this workload — and a measured decision not to ship is a better
          engineering result than an unmeasured build.
        </P>

        <div className="my-6 space-y-3">
          {[
            {
              n: '1',
              t: 'The prompt cache already takes 66% of input tokens.',
              b: 'At a tenth of the price, with zero correctness risk, automatically. What is left is smaller than it looks.',
            },
            {
              n: '2',
              t: 'This workload is adversarial to semantic caching by construction.',
              b: 'The 24 K2 requirements are near-identical in phrasing and MUST produce different answers. CR-K2-0101 and CR-K2-0102 sit close in embedding space and are not interchangeable — the textbook false-hit setup. And 23 of 24 refuse, so “we have never done this kind of work” is exactly the sentence a cache would return verbatim for a requirement where it may be false.',
            },
            {
              n: '3',
              t: 'Traffic is low and the corpus changes.',
              b: "A cache's value is a hit rate, and a hit rate needs repeated questions. There are no users yet.",
            },
          ].map((x) => (
            <div key={x.n} className="grid grid-cols-[2rem_1fr] gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3">
              <span className="font-mono text-lg" style={{ color: 'var(--lesson)' }}>
                {x.n}
              </span>
              <span>
                <span className="block max-w-[62ch] leading-relaxed text-ui-fg">{x.t}</span>
                <span className="mt-1.5 block max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-dim">{x.b}</span>
              </span>
            </div>
          ))}
        </div>

        <P>
          <strong className="font-medium text-ui-fg">Where it could genuinely pay is not the assessment
          loop.</strong> Two paths take a stored row as their input, so identical requests are likely and an{' '}
          <em className="not-italic text-ui-fg">exact-match</em> key needs no embeddings and carries{' '}
          <strong className="font-medium text-ui-fg">zero</strong> false-hit risk:{' '}
          <code className="font-mono text-ui-fg">explain-assessment</code>, keyed on{' '}
          <code className="font-mono text-ui-fg">(assessmentId, promptVersion)</code>; and{' '}
          <code className="font-mono text-ui-fg">desk-summary</code>, keyed on a content hash — if the filed
          assessments have not changed, the paragraphs cannot have.
        </P>

        <Key>
          So: exact-match first, on two named paths, and semantic only if a measured miss analysis says the
          exact key is too strict. Layer exact before semantic, always — it has no correctness risk at all.
        </Key>
      </Step>

      <SaidOutLoud
        then={
          <>
            “What would change your mind?” — traffic with genuine repetition, or a miss analysis showing
            near-misses that are safely equivalent. The point is that the answer is a command rather than an
            opinion.
          </>
        }
      >
        Before building it we'd build the <strong>adversary set</strong>, because the failure mode of a
        semantic cache is that it answers a <em>different</em> question. Our workload is 24 customer
        requirements that are near-identical in wording and must produce different answers — close to the
        worst case. We'd sweep the threshold against those pairs and report hit rate against false-hit rate.
        We also found the provider's prompt cache was already serving <strong>66%</strong> of input tokens at
        a <strong>tenth</strong> of the price with no correctness risk. So the honest recommendation was
        exact-match caching on the two paths where the input is a stored row, and{' '}
        <strong>no semantic cache</strong> until a miss analysis justifies one.
      </SaidOutLoud>

      <RunIt
        items={[
          {
            cmd: 'node -e "…" logs/requests.jsonl',
            does: 'The cached-percentage column in the cost lesson. That is where the 66% and the 25% outlier come from.',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:summarise --dry-run',
            does: 'The counts the desk summary reports, computed without a model — the half of that path that is already free.',
            cost: 'free',
          },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The threshold sweep is illustrative and no sweep has been run.',
            body: 'The adversary set does not exist yet. What is defensible is the published band — 0.92 to 0.97 — and the reasoning about why this workload sits badly in it.',
          },
          {
            claim: 'No semantic cache exists, so none of its risks have been observed here.',
            body: 'Everything on this page about false hits is reasoning from the workload plus published benchmarks. It is an argument for not building something, which is the cheapest kind of claim to make and the hardest to check.',
          },
          {
            claim: 'The exact-match recommendation is also unbuilt.',
            body: 'Two named paths, zero false-hit risk, and neither is implemented. The reason to trust it more than the semantic argument is that it has no threshold to get wrong.',
          },
          {
            claim: '66% is one corpus on one day.',
            body: 'Prompt-cache hit rate is a property of how stable your prefix is. Change the prompt on every deploy and it drops.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'prompt cache', def: "The provider matching an exact prefix of your tokens and reusing its attention state. Automatic, a tenth of the price, and it cannot be wrong." },
          { word: 'semantic cache', def: 'Matching a new question to a stored one by embedding similarity and returning the stored answer. Saves the whole call, and can answer the wrong question.' },
          { word: 'false hit', def: 'A semantic cache returning a stored answer to a question that is near in embedding space but is not the same question. The dangerous failure.' },
          { word: 'adversary set', def: 'Pairs of questions deliberately chosen to be close in wording and different in answer. Built before the cache, so the threshold is chosen against evidence.' },
          { word: 'invalidation', def: 'Expiring cached answers when the corpus, the prompt or the model changes. The part that sinks naive implementations — stale cache is worse than no cache.' },
        ]}
      />
    </LessonPage>
  );
}
