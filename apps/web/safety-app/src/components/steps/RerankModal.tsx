/**
 * Inside the reranker — stage 3.6b, and the thing it cannot do.
 *
 * ── THE ANCHOR IS THE CEILING, NOT THE MECHANISM ───────────────────────────
 *
 * How a cross-encoder works is one sentence: it reads the question and one
 * passage together instead of comparing two summaries made separately. The
 * sentence worth pinning is the limit — a reranker cannot FIND anything, it can
 * only reorder what it was handed. That turns it from a fix into a diagnostic,
 * and it is the only thing on this page that tells a reader what to do when it
 * does not help.
 *
 * ── THE BATCHING NUMBERS ARE THE SAME LESSON AS 3.3 ────────────────────────
 *
 * Smaller batches are faster AND lighter, because every passage in a batch is
 * padded to the longest one in it. That is the finding stage 3.3 turned into
 * 36.6 minutes from an hour and 47, arriving a second time in a different file.
 * The panel says so rather than presenting it as new, because a reader who met
 * it once should recognise it.
 *
 * ── AND WHY IT RUNS HERE, WHICH WAS ASKED TWICE ────────────────────────────
 *
 * The decisive argument is not latency or cost. A hosted reranker would ship 50
 * passages where today six go out at answer time, and these are members of the
 * public describing crashes and 53 deaths.
 *
 * Source: `packages/grounding/src/rerank.ts`, quoted verbatim.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/**
 * Measured on 50 real passages averaging 924 characters, pinned to one core.
 * Transcribed from the comment above `scoreAll`, where the same table lives.
 */
const BATCHES = [
  { of: 'all 50 at once', ms: 1020, mb: 1523 },
  { of: 'batches of 16', ms: 491, mb: 284 },
  { of: 'batches of 8', ms: 473, mb: 236 },
  { of: 'batches of 4', ms: 336, mb: 217 },
] as const;

/** The container the deployed app runs in. 1.0 GiB, and the first row exceeds it. */
const LIMIT_MB = 1024;

export function RerankModal() {
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
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-cal-1/50"
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">
          Inside the reranker — what reading a pair buys, what it cannot do, and
          why it runs on this machine
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <RerankPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function RerankPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const worst = Math.max(...BATCHES.map((b) => b.mb));

  return (
    <OriginDialog
      from={from}
      label="Inside the reranker"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the reranker</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.6b · optional, off by default · <Mono>packages/grounding/src/rerank.ts</Mono>
          </p>
        </>
      }
    >
      {/* THE CEILING IS PINNED, because it is the sentence that changes what a
          reader does with a disappointing result. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the one thing to take away
        </p>
        <p className="max-w-[58ch] font-mono text-[0.9375rem] leading-relaxed text-ui-fg">
          A reranker cannot <em>find</em> anything. It can only reorder what it
          was handed.
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>The shortcut everything so far relies on</H>
          <P>
            Every passage was turned into 384 numbers{' '}
            <span className="text-ui-fg">once</span>, long before your question
            existed. Your question becomes 384 numbers too, and the database
            finds the closest. That is fast because the hard work was done in
            advance — and blunt, because the passage was summarised without
            knowing what you would ask.
          </P>
        </section>

        <section>
          <H>What a reranker does differently</H>
          <P>
            It reads your question and one passage{' '}
            <span className="text-ui-fg">together, as a pair</span>, and answers
            one question: how well does this actually answer that?
          </P>
          <Data path="a cross-encoder, one pair at a time" lines={['question + passage  →  one relevance number']} />
          <P>
            Much better judgement. Far too slow for{' '}
            {(70194).toLocaleString('en-GB')} passages — that would be{' '}
            {(70194).toLocaleString('en-GB')} readings for every question asked.
          </P>
        </section>

        <section>
          <H>So it goes second</H>
          <ol className="grid gap-2.5">
            {[
              ['1', 'cheap search finds 50 candidates', 'fast, indexed, a bit blunt'],
              ['2', 'the reranker reads all 50 properly', 'slow, no index, sharp'],
              ['3', 'keep the best 6', 'what the model sees'],
            ].map(([n, what, how]) => (
              <li key={n} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="w-4 shrink-0 text-right font-mono text-[0.75rem] text-ui-faint">
                  {n}
                </span>
                <span className="w-56 shrink-0 font-mono text-[0.8125rem] text-ui-fg">{what}</span>
                <span className="text-[0.8125rem] text-ui-dim">{how}</span>
              </li>
            ))}
          </ol>
          <Aside>
            50 and not 6, deliberately.{' '}
            <span className="text-ui-fg">
              The whole value is promoting something the first pass ranked below
              the cut
            </span>{' '}
            — rerank only what you would have shown anyway and you have measured
            nothing.
          </Aside>
        </section>

        <section>
          <H>Which makes it a diagnostic as much as a fix</H>
          <P>
            If the right passage is not among those 50, no amount of re-reading
            puts it in the top 6. So what happens when you turn it on tells you
            which problem you have.
          </P>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                when: 'reranking helps',
                then: 'the problem was “found it, ranked it badly” — and this is the fix',
                tone: 'var(--color-cal-1)',
              },
              {
                when: 'reranking does not',
                then: 'the problem was “never found it”. Better chunking or a wider pool, not a smarter scorer.',
                tone: 'var(--color-cal-3)',
              },
            ].map((b) => (
              <div key={b.when} className="rounded-lg border border-ui-line bg-ui-surface p-4">
                <p
                  className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                  style={{ color: b.tone }}
                >
                  {b.when}
                </p>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ui-dim">{b.then}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <H>Smaller batches are faster and lighter, which reads as a mistake</H>
          <Data
            path="50 real passages, mean 924 characters, one core"
            note="ms-marco-MiniLM-L-6-v2, on this machine"
            mark={[0]}
            lines={BATCHES.map(
              (b) =>
                `${b.of.padEnd(18)}${b.ms.toLocaleString('en-GB').padStart(6)} ms    peak RSS ${b.mb.toLocaleString('en-GB').padStart(5)} MB`,
            )}
          />
          <div className="mt-4 grid gap-2">
            {BATCHES.map((b) => (
              <div key={b.of} className="grid gap-1">
                <div className="flex items-baseline gap-3 font-mono text-[0.6875rem]">
                  <span className={b.mb > LIMIT_MB ? 'text-ui-fg' : 'text-ui-dim'}>{b.of}</span>
                  <span className="ml-auto text-ui-faint">
                    {b.mb.toLocaleString('en-GB')} MB
                  </span>
                </div>
                <div className="h-[5px] w-full rounded-full bg-ui-line">
                  <div
                    className="h-[5px] rounded-full"
                    style={{
                      width: `${(b.mb / worst) * 100}%`,
                      background:
                        b.mb > LIMIT_MB ? 'var(--color-cal-3)' : 'var(--color-cal-1)',
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 font-mono text-[0.625rem] text-ui-faint">
              the container is {LIMIT_MB.toLocaleString('en-GB')} MB — the first
              row is over it
            </p>
          </div>
          <Aside>
            <span className="text-ui-fg">
              Every passage in a batch is padded to the longest one in it.
            </span>{' '}
            One 1,400-character narrative among three short ones makes all four
            cost 1,400, and a batch of fifty pads to the longest of fifty every
            time. This is the same finding stage 3.3 turned into 36.6 minutes
            from an hour and 47 — arriving a second time, in a different file,
            for the same reason.
          </Aside>
          <Aside>
            And 1,523 MB against a 1.0 GiB container is not a slow path. It is a
            kill with no stack trace, which is why the fix is sorting by length
            before batching rather than a larger instance.
          </Aside>
        </section>

        <section>
          <H>Why it runs here and not somewhere else</H>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: 'a local cross-encoder',
                tone: 'var(--color-cal-1)',
                rows: [
                  '~700 ms at 0.5 vCPU',
                  '217 MB',
                  'no rate limit',
                  'nothing leaves the machine',
                  '+200 MB image',
                ],
              },
              {
                name: 'a hosted model as reranker',
                tone: 'var(--color-cal-3)',
                rows: [
                  '3–10 s',
                  'free-tier limits already hit with 429s',
                  'output is text, to be parsed',
                  'ships 50 narratives instead of 6',
                ],
              },
            ].map((c) => (
              <div key={c.name} className="rounded-lg border border-ui-line bg-ui-surface p-4">
                <p
                  className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                  style={{ color: c.tone }}
                >
                  {c.name}
                </p>
                <ul className="mt-3 grid gap-1.5">
                  {c.rows.map((r) => (
                    <li key={r} className="font-mono text-[0.75rem] text-ui-dim">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Aside>
            The last line is the decisive one.{' '}
            <span className="text-ui-fg">
              Today six passages go to a model provider, at answer time.
            </span>{' '}
            A hosted reranker ships fifty — and they are members of the public
            describing crashes, fires and 53 deaths. Local adds no vendor, no
            egress and no new credential to hold.
          </Aside>
        </section>

        <section>
          <H>Off by default</H>
          <Code
            path="packages/grounding/src/rerank.ts"
            lang="text"
            lines={[
              "export const DEFAULT_RERANK_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';",
            ]}
          />
          <P>
            It is read from the environment rather than passed as a flag, so the
            measurement harness cannot take a different code path and call it a
            different pipeline. <Mono>RERANK=local</Mono> is the only difference
            between the two numbers stage 3.7 reports.
          </P>
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

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3.5 max-w-[64ch] border-l-2 border-cal-2/50 py-0.5 pl-3.5 text-[0.875rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}
