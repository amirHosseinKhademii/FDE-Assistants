/**
 * Two under-the-hood panels: 3.5's two searchers, and 3.6's two judges.
 *
 * ── ONE FILE, BECAUSE THEY ARE ONE COMMAND ────────────────────────────────
 *
 * There is no `pnpm safety:fuse`. `pnpm safety:search` asks both arms and fuses
 * what comes back, so the two stages are one program and the panels share their
 * worked example rather than each inventing one. That is also the answer to the
 * question a reader arrives with — *how does fuse work, I did not run
 * anything?* — and it is stated on 3.6 rather than left to be inferred.
 *
 * ── THE ARITHMETIC IS RUN, NOT TRANSCRIBED ────────────────────────────────
 *
 * `points()` and `normalise()` below are `packages/grounding/src/hybrid.ts`'s
 * `fuseByRank` as it is written, including its `.toFixed(3)` before display.
 * That is why the table prints 0.9840 rather than 0.9839: the fuser rounds to
 * three decimals and the CLI shows four. Reproducing the rounding rather than
 * the number means the page cannot disagree with the tool, and cannot quietly
 * be tidier than it.
 *
 * ── CORRECTED 2026-09-27 ──────────────────────────────────────────────────
 *
 * Both code blocks claimed line ranges (`search.ts:66–79`, `hybrid.ts:210–228`)
 * and both were wrong — the files had grown since. They now name the function
 * instead of a range, because a gutter promises "the file says this at that
 * line" and these files move. The fuser quote had also drifted: it read
 * `dense.forEach(([doc], i) …` and `sparse.docs.forEach(…)`, from an older
 * shape of the function; the real lines take the two lists directly.
 *
 * The two arms were drawn in indigo and lavender — `cal-1` against `cal-2`,
 * ΔE 11, too close to carry two meanings. The keyword arm is sky now.
 *
 * And 3.6's closing line said 3.7 "is what turns it into a number". 3.7 has
 * run: 0.40, counted over documents, n = 3. It says so.
 *
 * Source: `docs/safety/INGESTION.md` §3.5 and §3.6; the code is quoted from
 * `apps/ai/safety/src/grounding/search.ts` and `packages/grounding/src/hybrid.ts`.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { HoodButton } from './Hood';
import { Because } from './kit';

/** The fuser's constant, as named in `hybrid.ts`. */
const RRF_K = 60;
const points = (rank: number) => 1 / (RRF_K + rank);

/** `hybrid.ts` divides by the best score and rounds to three decimals. */
const normalise = (score: number, best: number) => Number((score / best).toFixed(3));

/**
 * THE REAL RUN, and the only thing typed in is the ranks.
 *
 * `pnpm safety:search "recall 20V197000"` — 6 results in 1,474 ms, each arm
 * having fetched 24. Every score below is computed from the two rank columns.
 */
const HITS = [
  { id: '11416775', meaning: 1, keyword: null, what: '2020 Lincoln Corsair' },
  { id: '11592935', meaning: null, keyword: 1, what: '2020 Ford Ranger' },
  { id: '19V620000', meaning: 2, keyword: null, what: 'a recall' },
  { id: '20V197000', meaning: null, keyword: 2, what: 'the recall asked for' },
  { id: '20V425000', meaning: 3, keyword: null, what: 'a recall' },
  { id: '11624180', meaning: null, keyword: 3, what: '2020 Ford Expedition' },
].map((h) => ({
  ...h,
  raw: (h.meaning ? points(h.meaning) : 0) + (h.keyword ? points(h.keyword) : 0),
}));
const BEST = Math.max(...HITS.map((h) => h.raw));

/** Opens a panel from the button that was pressed. */
function useOrigin() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);
  return { from, open, close: () => setFrom(null) };
}

/* ── 3.5 ─────────────────────────────────────────────────────────────────── */

export function SearchModal() {
  const { from, open, close } = useOrigin();
  return (
    <>
      <HoodButton
        blurb="Inside the search: two searchers, asked the same question at the same time"
        onClick={open}
      />
      {from && <SearchPanel from={from} onClose={close} />}
    </>
  );
}

function SearchPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the search"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the search</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.5 · two searchers, asked at the same time
          </p>
        </>
      }
    >
      <div className="grid gap-9 pb-2">
        <section className="grid gap-5">
          <p className="cal-hood-text">
            You ask a question. Two different searchers answer it, at the same
            time, and each hands back its own ranked list: here is my 1st pick, my
            2nd, my 3rd.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                name: 'The meaning searcher',
                plain: 'Finds things that sound like what you asked, even when the words are completely different.',
                how: 'The question becomes 384 numbers with the same local model that turned the passages into numbers, and Postgres sorts every row by how close its numbers are.',
                tech: 'pgvector · cosine distance',
                tone: undefined,
              },
              {
                name: 'The keyword searcher',
                plain: 'Finds things containing the exact words you typed.',
                how: 'The question becomes a list of search terms, and Postgres ranks rows by how well they match a column of words it prepared when the row was written.',
                tech: 'content_ts · GIN index · ts_rank',
                tone: 'learn',
              },
            ].map((arm) => (
              <div key={arm.name} className="rounded-xl border border-ui-line bg-ui-surface p-4">
                <p className="cal-label" data-tone={arm.tone}>
                  {arm.name}
                </p>
                <p className="mt-2.5 text-[1rem] leading-relaxed text-ui-fg">{arm.plain}</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ui-dim">{arm.how}</p>
                <p className="mt-3 font-mono text-[0.8125rem] text-ui-faint">{arm.tech}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <H>Why both, and it goes in each direction</H>
          <p className="cal-hood-text">
            A campaign number like <code>20V197000</code>{' '}
            <span className="text-ui-fg">does not mean anything. It is something.</span>{' '}
            Ask the meaning searcher for it and you get passages that look like
            they contain campaign numbers. Ask the keyword searcher and you get
            that campaign.
          </p>
          <p className="cal-hood-text">
            And the reverse is just as true. <em>“Car rolls away when I park it”</em>{' '}
            is a meaning question — no word in it appears in the complaint that
            answers it, which describes a gear display disagreeing with a gearbox.
          </p>
        </section>

        <section className="grid gap-4">
          <H>Each searcher is asked for four times as much as you want</H>
          <p className="cal-hood-text">
            A question wants six results. Each searcher is asked for 24, and the
            48 that come back are combined into the final six.
          </p>
          {/* VERBATIM, and named by function rather than by line range: a range
              drifted once already. A readable paraphrase is how a quote stops
              being checkable, and this comment is the only place the k × 4
              decision is written down. */}
          <Code
            path="apps/ai/safety/src/grounding/search.ts"
            note="search() — its comment and signature"
            mark={[3]}
            lines={[
              '/**',
              ' * One question, both arms, fused.',
              ' *',
              ' * NOTE THE OVER-FETCH. `hybridSearch` asks each arm for `k * 4`, so `k = 6`',
              ' * fetches 24 per arm and fuses 48. A passage ranked 20th by meaning and 2nd by',
              ' * keywords has to be IN the lists before fusion can promote it — fetching only',
              ' * 6 from each would throw it away before the step that would have found it.',
              ' */',
              'export async function search(',
              '  store: PGVectorStore,',
              '  connectionString: string,',
              '  query: string,',
              '  k: number = DEFAULT_K,',
              '): Promise<SearchResult> {',
            ]}
          />
          <Because>
            Something ranked 20th by meaning and 2nd by keywords{' '}
            <span className="text-ui-fg">has to be in the lists</span> before the
            next step can promote it — fetch only six from each and you throw it
            away before the step that would have found it.
          </Because>
          <p className="cal-hood-text">
            With the reranker switched on (stage 3.6b), the same function asks for
            50 results rather than 6, so each searcher fetches 200 — a reranker
            can only reorder what it is handed, so it has to be handed more.
          </p>
        </section>
      </div>
    </OriginDialog>
  );
}

/* ── 3.6 ─────────────────────────────────────────────────────────────────── */

export function FuseModal() {
  const { from, open, close } = useOrigin();
  return (
    <>
      <HoodButton
        blurb="Inside the fusion: two judges with different scoring habits, and the trick that combines them"
        onClick={open}
      />
      {from && <FusePanel from={from} onClose={close} />}
    </>
  );
}

function FusePanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const bothFifth = points(5) + points(5);
  const oneFirst = points(1);

  return (
    <OriginDialog
      from={from}
      label="Inside the fusion"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the fusion</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.6 · plain arithmetic over two lists
          </p>
        </>
      }
    >
      <div className="grid gap-9 pb-2">
        <section className="grid gap-4">
          <H>The problem</H>
          <p className="cal-hood-text">
            One searcher scores on its own scale and the other on a completely
            different one.{' '}
            <span className="text-ui-fg">
              One judge marks out of 10, the other marks in dollars.
            </span>{' '}
            You cannot add their marks together — and averaging them is worse,
            because it looks reasonable.
          </p>
        </section>

        <section className="grid gap-4">
          <H>The trick: ignore the marks, use the placings</H>
          <p className="cal-hood-text">
            Do not ask “what score did you give it?”. Ask{' '}
            <span className="text-ui-fg">“where did you put it?”</span> A 1st place
            is a 1st place from either judge. Each document earns points for every
            list it appears in — more for a better placing. Add up the points.
            Sort.
          </p>
        </section>

        <section className="grid gap-4">
          <H>The deliberate part, which is the bit readers miss</H>
          <p className="cal-hood-text">
            1st place is worth <span className="text-ui-fg">barely more</span> than
            2nd — about 1.6% more, not double. That sounds wrong until you see what
            it buys.
          </p>

          <div className="rounded-xl border border-ui-line bg-[var(--snip-bg)] p-4">
            <div className="grid gap-3">
              {[
                { label: 'Placed 5th by both judges', v: bothFifth, lit: true },
                { label: 'Placed 1st by one judge only', v: oneFirst, lit: false },
              ].map((row) => (
                <div key={row.label} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 text-[0.9375rem]">
                    <span className={row.lit ? 'font-semibold text-ui-fg' : 'text-ui-dim'}>{row.label}</span>
                    <span className="ml-auto font-mono text-[0.875rem] text-ui-dim">{row.v.toFixed(6)}</span>
                  </div>
                  <div className="h-[6px] w-full rounded-full bg-ui-line">
                    <div
                      className="h-[6px] rounded-full"
                      style={{
                        width: `${(row.v / bothFifth) * 100}%`,
                        background: row.lit ? 'var(--color-cal-1)' : 'var(--color-cal-3)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-[0.9375rem] font-semibold text-ui-fg">
              The pair wins, by {(bothFifth / oneFirst).toFixed(2)}×
            </p>
          </div>

          <Because>
            That is the entire point.{' '}
            <span className="text-ui-fg">
              One judge loving something is an opinion. Both judges noticing it,
              even lukewarmly, is evidence.
            </span>{' '}
            The tiny gaps between placings are what let agreement outweigh
            enthusiasm.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>The formula, and the numbers behind those claims</H>
          <p className="cal-hood-text">
            This is the whole of it, from the shared package. The two marked lines
            are the mechanism: <code>+=</code> is how a document in both lists
            collects points from both, and the last line divides by the best score
            and rounds to three decimals.
          </p>
          {/* VERBATIM, and the two marked lines are why. The `+=` is the whole
              mechanism — a document in both lists accumulates from both, and a
              paraphrase writing `=` would invert the argument above it. The
              `.toFixed(3)` is the rounding this panel reproduces rather than
              transcribes, which is why the table below prints 0.9840 and not
              0.9839. Named by function, not line range: a range drifted once. */}
          <Code
            path="packages/grounding/src/hybrid.ts"
            note="fuseByRank"
            mark={[5, 16]}
            lines={[
              'export function fuseByRank(dense: LCDocument[], sparse: LCDocument[], k: number): Scored[] {',
              '  const fused = new Map<string, Scored>();',
              "  const add = (doc: LCDocument, rank: number, arm: 'dense' | 'sparse') => {",
              '    const key = keyOf(doc);',
              '    const prev = fused.get(key) ?? { doc, score: 0 };',
              '    prev.score += 1 / (RRF_K + rank);',
              "    if (arm === 'dense') prev.denseRank = rank;",
              '    else prev.sparseRank = rank;',
              '    fused.set(key, prev);',
              '  };',
              '',
              "  dense.forEach((doc, i) => add(doc, i + 1, 'dense'));",
              "  sparse.forEach((doc, i) => add(doc, i + 1, 'sparse'));",
              '',
              '  const ranked = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);',
              '  const best = ranked[0]?.score ?? 1;',
              '  for (const r of ranked) r.score = Number((r.score / best).toFixed(3));',
              '  return ranked;',
              '}',
            ]}
          />
          <Data
            path="What a placing is worth"
            mark={[5]}
            lines={[
              ` 1st   1/${RRF_K + 1}  = ${points(1).toFixed(6)}`,
              ` 2nd   1/${RRF_K + 2}  = ${points(2).toFixed(6)}    ${(((points(1) - points(2)) / points(1)) * 100).toFixed(1)}% behind 1st`,
              ` 3rd   1/${RRF_K + 3}  = ${points(3).toFixed(6)}`,
              `50th   1/${RRF_K + 50} = ${points(50).toFixed(6)}    still over half of 1st`,
              '',
              ` 5th in BOTH lists      = ${bothFifth.toFixed(6)}`,
              ` 1st in ONE list only   = ${oneFirst.toFixed(6)}`,
            ]}
          />
          <Because>
            The {RRF_K} is what flattens the gaps. Without it 1st is{' '}
            <code>1/1</code> and 2nd is <code>1/2</code> — a landslide, and one
            searcher's opinion would decide everything. Missing from a list
            contributes nothing from that list, and the last step is cosmetic:
            divide by the best score so the top reads <code>1.0000</code>.
          </Because>
          <Because>
            <code>keyOf</code> decides which entries in the two lists are the same
            passage, and it reads the <code>chunkId</code> stage 3.4 writes into
            every row. That is why the index checks for it: without one, passages
            that open with the same line would be counted as one, and their points
            would add.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>No model, no database, no network</H>
          <p className="cal-hood-text">
            Fusion is <span className="text-ui-fg">plain arithmetic over two lists</span>
            . It is why there is no <code>pnpm safety:fuse</code>: 3.5 and 3.6 are
            one command, <code>pnpm safety:search</code>, because asking the two
            searchers is the part that costs anything and combining their answers
            is a loop over 48 numbers.
          </p>
        </section>

        <section className="grid gap-4">
          <H>The worked example, with the arithmetic on screen</H>
          <Data
            path='pnpm safety:search "recall 20V197000"'
            note="Condensed · 6 results in 1,474 ms · each arm fetched 24"
            mark={[4]}
            lines={[
              '                meaning  keywords    score',
              ...HITS.map((h, i) => {
                const m = h.meaning === null ? '·' : String(h.meaning);
                const kw = h.keyword === null ? '·' : String(h.keyword);
                return `${String(i + 1).padStart(2)}. ${h.id.padEnd(11)}${m.padStart(4)}${kw.padStart(10)}${normalise(h.raw, BEST).toFixed(4).padStart(10)}   ${h.what}`;
              }),
            ]}
          />
          <Because>
            Every score there is computed from the two rank columns beside it by
            the code quoted above, including its rounding to three decimals — so
            the table cannot drift from the tool, and cannot quietly be tidier than
            it.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>And the thing to point at</H>
          <p className="cal-hood-text">
            <span className="text-ui-fg">Every row has a dot in one column.</span>{' '}
            Every result was found by one judge and completely missed by the other.
            The judges agreed on nothing — so there was no agreement to reward, and
            the method had nothing to do but take turns: meaning's 1st, keyword's
            1st, meaning's 2nd, keyword's 2nd. Dealing out two decks alternately.
          </p>
          <Because>
            Which is why the scores come in matching pairs. It is how fusion
            behaves when the lists do not overlap, rather than anything about this
            corpus — and it is one question, not a measurement.{' '}
            <span className="text-ui-fg">Stage 3.7 is the measurement</span>: three
            questions with answers written by hand beforehand, counted over
            documents rather than passages. It scored a recall@6 of 0.40 —
            flattered by one easy question that scored 1.00 while the two hard
            ones scored 0.00 and 0.20 — and what it found is that fusion was not
            the problem — the documents the key
            names sat far below anything fusion is handed, the best of them 93rd
            on the keyword side.
          </Because>
        </section>
      </div>
    </OriginDialog>
  );
}

/* ── shared ──────────────────────────────────────────────────────────────── */

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[1.0625rem] font-bold text-ui-fg">{children}</h3>;
}
