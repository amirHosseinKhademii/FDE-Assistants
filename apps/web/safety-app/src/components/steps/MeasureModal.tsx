/**
 * Inside the measurement — stage 3.7, and why the number did not move.
 *
 * ── THE ANCHOR IS TWO IDENTICAL NUMBERS ────────────────────────────────────
 *
 * 0.40 with the reranker off and 0.40 with it on. A panel that led with the
 * mechanism would bury the only interesting thing about this stage: the
 * reranker DID work — it moved a hit from 36th to 1st — and the score did not
 * move at all. Those two facts together are a diagnosis, and neither is one
 * alone.
 *
 * ── THE DIAGNOSIS IS THE PAGE'S BEST MATERIAL ──────────────────────────────
 *
 * The right answers were at ranks 93 through 3,026. The reranker was handed the
 * top 50. It reordered a pile that did not contain the answer, perfectly. That
 * is the ceiling stage 3.6b states in the abstract, arriving as a measurement —
 * and it is why the conclusion is not "get a better model".
 *
 * ── AND THE CAVEAT IS NOT OPTIONAL ─────────────────────────────────────────
 *
 * 0.40 is flattered: one of the three cases scored 1.00 against a bar of
 * "return any one of 400 documents", and the two hard cases scored 0.00 and
 * 0.20. A page that printed 0.40 without that would be doing the thing this
 * whole site argues against.
 *
 * Sources: `apps/ai/safety/src/grounding/measure.ts`, and the committed
 * baselines under `docs/safety/evals/`.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';

/** Where the answer key's documents actually ranked, out of 73,442 passages. */
const WHERE_THEY_WERE = [
  { id: '20V197000', rank: 93, what: 'the recall' },
  { id: '11302656', rank: 121, what: '' },
  { id: '11533202', rank: 1169, what: '' },
  { id: '11524321', rank: 1239, what: '' },
  { id: '11473666', rank: 2271, what: '' },
  { id: '11353867', rank: 3026, what: 'the complaint' },
] as const;

const POOL = 50;

const CASES = [
  {
    id: 'REC-001',
    plain: 0.0,
    reranked: 0.0,
    note: 'both targets missing from the top 6 and from the top 50',
  },
  {
    id: 'REC-004',
    plain: 0.2,
    reranked: 0.2,
    note: '1 of 5 death complaints; the found one moved 3rd → 1st under reranking',
  },
  {
    id: 'REC-005',
    plain: 1.0,
    reranked: 1.0,
    note: 'found at position 1; the hit moved 36th → 1st. No recall document returned, so nothing to mis-cite — the correct behaviour for a “no recall exists” question.',
  },
] as const;

export function MeasureModal() {
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
          Inside the measurement — why the reranker worked and the number did not
          move, and what that says to build next
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <MeasurePanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function MeasurePanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const deepest = Math.max(...WHERE_THEY_WERE.map((w) => w.rank));

  return (
    <OriginDialog
      from={from}
      label="Inside the measurement"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the measurement</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.7 · three questions, answered by hand first
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the same number twice
        </p>
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          {[
            { k: '3.7a', v: '0.40', how: 'hybrid alone' },
            { k: '3.7b', v: '0.40', how: 'the same run, reranked' },
          ].map((n) => (
            <div key={n.k}>
              <p className="font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
                {n.k} · {n.how}
              </p>
              <p className="mt-0.5 font-mono text-2xl text-ui-fg">recall@6 {n.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>The number</H>
          <P>
            Out of everything the answer key says should come back, retrieval
            found <span className="text-ui-fg">40% of it</span>.
          </P>
        </section>

        <section>
          <H>The reranker did work. It just didn't matter.</H>
          <P>It moved things a long way:</P>
          <Data
            path="what reranking changed"
            lines={['one result went from 36th  →  1st', 'another went from  3rd  →  1st']}
          />
          <P>
            And the score didn't budge. That looks like a contradiction until you
            ask where the <em>right</em> answers were sitting.
          </P>

          <div className="mt-4 rounded-lg border border-ui-line bg-[var(--snip-bg)] p-4">
            <p className="pb-3 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
              where the answer key's documents actually ranked
            </p>
            <div className="grid gap-2">
              {WHERE_THEY_WERE.map((r) => (
                <div key={r.id} className="grid gap-1">
                  <div className="flex items-baseline gap-3 font-mono text-[0.75rem]">
                    <span className="text-ui-dim">{r.id}</span>
                    {r.what && <span className="text-ui-faint">{r.what}</span>}
                    <span className="ml-auto text-ui-fg">
                      {r.rank.toLocaleString('en-GB')}
                    </span>
                  </div>
                  {/* WHAT THE RERANKER COULD REACH IS SHADED, not ticked. A
                      line at rank 50 out of 3,026 sits 1.6% from the origin and
                      is indistinguishable from the start of the bar — which
                      hides the very thing the chart is for. A band the reader
                      can see every bar overshoot says it in one look. */}
                  <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-ui-line">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 z-10"
                      style={{
                        width: `${Math.max((POOL / deepest) * 100, 1.4)}%`,
                        background: 'var(--color-cal-1)',
                        boxShadow: '0 0 6px 1px color-mix(in oklab, var(--color-cal-1) 60%, transparent)',
                      }}
                    />
                    <div
                      className="h-[6px] rounded-full"
                      style={{
                        width: `${(r.rank / deepest) * 100}%`,
                        background: 'var(--color-cal-3)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 pt-3 font-mono text-[0.625rem] text-ui-faint">
              <span
                aria-hidden
                className="inline-block h-[6px] w-4 rounded-full"
                style={{ background: 'var(--color-cal-1)' }}
              />
              <span style={{ color: 'var(--color-cal-1)' }}>
                what the reranker was handed — the top {POOL}
              </span>
              <span>· every one of these sat past it</span>
            </p>
          </div>

          <Aside>
            <span className="text-ui-fg">A reranker reorders. It cannot fetch.</span>{' '}
            So it did its job perfectly on a pile that did not contain the
            answer. The diagnosis is not “found it, ranked it badly” — it is
            “never found it”, and no reranker fixes that, nor would a better one.
          </Aside>
        </section>

        <section>
          <H>Why retrieval missed</H>
          <P>Look at what was asked.</P>
          <Data
            path="two of the three questions"
            lines={[
              '"We run 2020 F-150s. Is the transmission park problem a known defect?"',
              '"Complaints involving a death on the 2019-2020 Tesla Model 3?"',
            ]}
          />
          <P>
            <span className="text-ui-fg">
              These aren't really search questions. They're filters wearing the
              clothes of questions.
            </span>
          </P>
          <P>
            <Mono>2020 F-150</Mono>, <Mono>Tesla Model 3</Mono>,{' '}
            <Mono>involving a death</Mono> — every one of those is a structured
            field already sitting in the database. Make. Model. Year. Death
            count. And search is treating them as <em>words</em>: it looks for
            documents that say “Ford” and “park” and “problem”, the same way it
            would look for a sentiment.
          </P>
          <Aside>
            The first question matches{' '}
            <span className="text-ui-fg">54,541 documents</span> on ordinary
            vocabulary alone — “run”, “2020”, “transmission”, “problem”, “fix”.
            The right answer drowns.
          </Aside>
        </section>

        <section>
          <H>Proof, not opinion</H>
          <Data
            path="filter first, then search inside the filtered set"
            mark={[1, 5, 8]}
            lines={[
              'filter: make=TESLA, model=MODEL 3, deaths>0',
              '   →  exactly the 5 target complaints. Nothing else. Recall 1.00.',
              '',
              'filter: make=FORD, model=F-150, component=POWER TRAIN',
              'then rank by park / prndl / roll / shift',
              '   →  11353867 moves from rank 3,026 to rank 8',
              '',
              'filter: recalls on F-150 with a PRNDL component',
              '   →  20V197000. Exactly. On its own.',
            ]}
          />
          <Aside>
            Filtering first, then searching <em>inside</em> the filtered set,
            finds what searching everything could not.
          </Aside>
        </section>

        <section>
          <H>So what this really says</H>
          <P>
            The fix isn't a better embedder. It isn't a better chunker. It isn't
            a better reranker.{' '}
            <span className="text-ui-fg">
              It's that the machine needs to read “2020 F-150” as a filter, not
              as a phrase
            </span>{' '}
            — which means a tool the model can call with structured arguments,
            not a bigger pile of text to search.
          </P>
          <Aside>
            Which is the lesson the insurance engagement already carries in{' '}
            <Mono>get_policyholder</Mono>:{' '}
            <span className="text-ui-fg">
              a question with one exact answer is a lookup, not a search.
            </span>{' '}
            Reached independently here, on a completely different corpus, by
            measuring rather than by remembering.
          </Aside>
        </section>

        <section>
          <H>Per case</H>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse font-mono text-[0.8125rem]">
              <thead>
                <tr className="text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
                  <th className="pb-2 text-left font-normal">case</th>
                  <th className="pb-2 text-right font-normal">plain</th>
                  <th className="pb-2 text-right font-normal">reranked</th>
                  <th className="pb-2 pl-6 text-left font-normal">note</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((c) => (
                  <tr key={c.id} className="border-t border-ui-line align-top">
                    <td className="py-2.5 text-ui-fg">{c.id}</td>
                    <td className="py-2.5 text-right text-ui-dim">{c.plain.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-ui-dim">{c.reranked.toFixed(2)}</td>
                    <td className="max-w-[36ch] py-2.5 pl-6 font-sans text-[0.75rem] leading-relaxed text-ui-faint">
                      {c.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Aside>
            <span className="text-ui-fg">0.40 is flattered, and that has to be said.</span>{' '}
            REC-005 scored a perfect 1.00, but its bar was “return any one of 400
            documents” — nearly impossible to fail. The two hard cases scored
            0.00 and 0.20. And n=3.
          </Aside>
        </section>

        <section>
          <H>The baselines are files, not screenshots</H>
          <Data
            path="committed, and diffable against the next run"
            lines={['docs/safety/evals/recall-plain.json', 'docs/safety/evals/recall-reranked.json']}
          />
          <P>
            Timings, for what they cost: roughly 1.5–5.8 s a case plain, 2.7–4.6
            s reranked, with the cross-encoder scoring 150 passages in 3,037 ms
            after a 1.5 s cold start.
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
