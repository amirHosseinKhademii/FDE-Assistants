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
 * ── CORRECTED 2026-09-27 ──────────────────────────────────────────────────
 *
 *   - the diagnostic section now carries what happened when it was switched
 *     on: 0.40 before and after, and the ranks of the key's documents
 *     (INGESTION.md §3.7). It was written before that number existed;
 *   - "70,194 passages" was the complaint count; the index holds 73,442;
 *   - the fix `rerank.ts` carries is small batches AND a length sort, not the
 *     sort alone;
 *   - "off by default" now quotes the function that makes it so,
 *     `rerankerChoice`, rather than only the model id;
 *   - "~700 ms at 0.5 vCPU" has no measurement behind it in the record. It is
 *     now shown as an estimate — the measured 336 ms on one core, doubled —
 *     which is this panel's derivation, not a run. The hosted card's "3–10 s"
 *     has no source either and is marked as not measured here.
 *
 * Source: `packages/grounding/src/rerank.ts`, quoted verbatim with comments
 * trimmed; `docs/safety/INGESTION.md` §3.6b and §3.7.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { HoodButton } from '@veresk/learn/steps';
import { Because } from '@veresk/learn/steps';

/**
 * Measured on 50 real passages averaging 924 characters, pinned to one core.
 * Transcribed from the comment above the batching in `scoreAll`, where the
 * same table lives.
 */
const BATCHES = [
  { of: 'All 50 at once', ms: 1020, mb: 1523 },
  { of: 'Batches of 16', ms: 491, mb: 284 },
  { of: 'Batches of 8', ms: 473, mb: 236 },
  { of: 'Batches of 4', ms: 336, mb: 217 },
] as const;

/** The container the deployed app runs in. 1.0 GiB, and the first row exceeds it. */
const LIMIT_MB = 1024;

/** Every passage the index holds, which is what "score them all" would mean. */
const PASSAGES = 73442;

/** Where the answer key's documents sat on the keyword side — INGESTION.md §3.7. */
const KEY_RANKS = [93, 121, 1169, 1239, 2271, 3026] as const;

const n = (x: number) => x.toLocaleString('en-GB');

export function RerankModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="Inside the reranker: what reading a question and a passage together buys, what it cannot do, and why it runs on this machine"
        onClick={open}
      />
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
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the reranker</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.6b · optional, and off unless switched on
          </p>
        </>
      }
    >
      {/* THE CEILING IS PINNED, because it is the sentence that changes what a
          reader does with a disappointing result. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-1.5" data-tone="quiet">
          The one thing to take away
        </p>
        <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed font-semibold text-ui-fg">
          A reranker cannot <em>find</em> anything. It can only reorder what it
          was handed.
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <p className="cal-hood-text">
          Search so far is quick and a little blunt. A reranker is a second,
          slower model that re-reads the top results with your question in view
          and puts them in a better order. It runs on this machine, and only when
          it is switched on.
        </p>

        <section className="grid gap-4">
          <H>The shortcut everything so far relies on</H>
          <p className="cal-hood-text">
            Every passage was turned into 384 numbers{' '}
            <span className="text-ui-fg">once</span>, long before your question
            existed. Your question becomes 384 numbers too, and the database finds
            the closest. That is fast because the hard work was done in advance —
            and blunt, because the passage was summarised without knowing what you
            would ask.
          </p>
        </section>

        <section className="grid gap-4">
          <H>What a reranker does differently</H>
          <p className="cal-hood-text">
            It reads your question and one passage{' '}
            <span className="text-ui-fg">together, as a pair</span>, and answers
            one question: how well does this actually answer that?
          </p>
          <Data
            path="A cross-encoder, one pair at a time"
            lines={['question + passage  →  one relevance number']}
          />
          <p className="cal-hood-text">
            Much better judgement. Far too slow for all {n(PASSAGES)} passages —
            that would be {n(PASSAGES)} readings for every question asked.
          </p>
        </section>

        <section className="grid gap-4">
          <H>So it goes second</H>
          <ol className="grid gap-2.5">
            {[
              ['1', 'Cheap search finds 50 candidates', 'fast, indexed, a bit blunt'],
              ['2', 'The reranker reads all 50 properly', 'slow, no index, sharp'],
              ['3', 'Keep the best 6', 'what the model sees'],
            ].map(([k, what, how]) => (
              <li key={k} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="w-5 shrink-0 text-right text-[0.9375rem] font-semibold text-ui-faint tabular-nums">
                  {k}
                </span>
                <span className="w-64 shrink-0 text-[0.9375rem] font-semibold text-ui-fg">{what}</span>
                <span className="text-[0.9375rem] text-ui-dim">{how}</span>
              </li>
            ))}
          </ol>
          <Because>
            50 and not 6, deliberately.{' '}
            <span className="text-ui-fg">
              The whole value is promoting something the first pass ranked below
              the cut
            </span>{' '}
            — rerank only what you would have shown anyway and you have measured
            nothing.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Which makes it a diagnostic as much as a fix</H>
          <p className="cal-hood-text">
            If the right passage is not among those 50, no amount of re-reading
            puts it in the top 6. So what happens when you turn it on tells you
            which problem you have.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                when: 'If reranking helps',
                then: 'The problem was “found it, ranked it badly” — and this is the fix.',
                tone: undefined,
              },
              {
                when: 'If reranking does not',
                then: 'The problem was “never found it”. The fix is upstream — a wider pool, better chunking or, as it turned out here, a filter — not a smarter scorer.',
                tone: 'quiet',
              },
            ].map((b) => (
              <div key={b.when} className="rounded-xl border border-ui-line bg-ui-surface p-4">
                <p className="cal-label" data-tone={b.tone}>
                  {b.when}
                </p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ui-dim">{b.then}</p>
              </div>
            ))}
          </div>
          <p className="cal-hood-text">
            <span className="text-ui-fg">On this corpus, it did not help.</span>{' '}
            Stage 3.7 measured recall@6 over three questions, counted by document:
            0.40 without the reranker and 0.40 with it — a number flattered by one
            easy question, which scored 1.00 while the two hard ones scored 0.00
            and 0.20. It was working all the same — it moved
            one hit from 36th to 1st and another from 3rd to 1st — but the
            documents the answer key names were somewhere else entirely.
          </p>
          <Data
            path="Where the key's documents ranked on the keyword side"
            note="docs/safety/INGESTION.md §3.7"
            lines={[KEY_RANKS.map((r) => n(r)).join('   ·   '), '', 'what the reranker was handed: the top 50']}
          />
          <Because>
            Not one of them was in the pile. So the diagnosis is the second card:
            never found it. A better reranker would not have moved these either —
            what moved them was treating “2020 F-150” as a filter rather than as
            words to match, which is what stage 3.7's panel is about.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Smaller batches are faster and lighter, which reads as a mistake</H>
          <Data
            path="50 real passages, mean 924 characters, one core"
            note="From the comment above the batching in rerank.ts"
            mark={[0]}
            lines={BATCHES.map(
              (b) => `${b.of.padEnd(18)}${n(b.ms).padStart(6)} ms    peak memory ${n(b.mb).padStart(5)} MB`,
            )}
          />
          <div className="grid gap-2.5">
            {BATCHES.map((b) => (
              <div key={b.of} className="grid gap-1">
                <div className="flex items-baseline gap-3 text-[0.875rem]">
                  <span className={b.mb > LIMIT_MB ? 'font-semibold text-ui-fg' : 'text-ui-dim'}>{b.of}</span>
                  <span className="ml-auto font-mono text-ui-faint">{n(b.mb)} MB</span>
                </div>
                <div className="h-[6px] w-full rounded-full bg-ui-line">
                  <div
                    className="h-[6px] rounded-full"
                    style={{
                      width: `${(b.mb / worst) * 100}%`,
                      background: b.mb > LIMIT_MB ? 'var(--color-cal-3)' : 'var(--color-cal-1)',
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[0.8125rem] text-ui-faint">
              The container the app runs in has {n(LIMIT_MB)} MB. The first row is
              over it.
            </p>
          </div>
          <Because>
            <span className="text-ui-fg">
              Every passage in a batch is padded to the longest one in it.
            </span>{' '}
            One 1,400-character complaint among three short ones makes all four
            cost 1,400, and a batch of fifty pads to the longest of fifty every
            time. This is the same finding stage 3.3 turned into 36.6 minutes from
            an hour and 47 — arriving a second time, in a different file, for the
            same reason.
          </Because>
          <Because>
            And 1,523 MB against a 1.0 GiB container is not a slow path. It is the
            process being killed with no error message, which is why the fix is
            small batches, sorted by length first, rather than a larger machine.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Why it runs here and not somewhere else</H>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                name: 'A local cross-encoder',
                tone: undefined,
                rows: [
                  'about 700 ms at half a processor — an estimate: the measured 336 ms on one core, doubled',
                  '217 MB',
                  'no rate limit',
                  'nothing leaves the machine',
                  '+200 MB image',
                ],
              },
              {
                name: 'A hosted model as reranker',
                tone: 'quiet',
                rows: [
                  '3–10 s (not measured here)',
                  'free-tier limits already hit with 429s',
                  'output is text, to be parsed',
                  'ships 50 complaints instead of 6',
                ],
              },
            ].map((c) => (
              <div key={c.name} className="rounded-xl border border-ui-line bg-ui-surface p-4">
                <p className="cal-label" data-tone={c.tone}>
                  {c.name}
                </p>
                <ul className="mt-3 grid gap-1.5">
                  {c.rows.map((r) => (
                    <li key={r} className="text-[0.9375rem] text-ui-dim">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Because>
            The last line is the decisive one.{' '}
            <span className="text-ui-fg">
              Today six passages go to a model provider, at answer time.
            </span>{' '}
            A hosted reranker ships fifty — and they are members of the public
            describing crashes, fires and 53 deaths. Local adds no vendor, no data
            leaving the building and no new credential to hold.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Off by default</H>
          <Code
            path="packages/grounding/src/rerank.ts"
            note="Three excerpts · comments trimmed"
            mark={[5]}
            lines={[
              "export const DEFAULT_RERANK_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';",
              '',
              'export const DEFAULT_POOL = 50;',
              '',
              'export function rerankerChoice(): RerankerChoice {',
              "  return (process.env.RERANK ?? '').toLowerCase() === 'local' ? 'local' : 'none';",
              '}',
            ]}
          />
          <p className="cal-hood-text">
            It is switched on by a setting in the environment rather than by an
            argument in the code, so the measurement cannot take a different code
            path and call it a different pipeline. <code>RERANK=local</code> is the
            only difference between the two numbers stage 3.7 reports.
          </p>
        </section>
      </div>
    </OriginDialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[1.0625rem] font-bold text-ui-fg">{children}</h3>;
}
