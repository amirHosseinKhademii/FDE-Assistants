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
 * `rrf()` and `normalise()` below are `packages/grounding/src/hybrid.ts` as it
 * is written, including its `.toFixed(3)` before display. That is why the table
 * prints 0.9840 rather than 0.9839: the fuser rounds to three decimals and the
 * CLI shows four. Reproducing the rounding rather than the number means the
 * page cannot disagree with the tool, and cannot quietly be tidier than it.
 *
 * Source: `docs/safety/INGESTION.md` §3.5 and §3.6; the fuser is quoted
 * verbatim from `packages/grounding/src/hybrid.ts`.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

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

/* ── 3.5 ─────────────────────────────────────────────────────────────────── */

export function SearchModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  return (
    <>
      <Trigger
        tone="cal-1"
        label="Inside the search — two searchers, asked the same question at the same time"
        onOpen={setFrom}
      />
      {from && <SearchPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function SearchPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside the search"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the search</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.5 · two arms, asked at the same time
          </p>
        </>
      }
    >
      <div className="grid gap-9 pb-2">
        <section>
          <P>
            You ask a question. Two different searchers answer it, at the same
            time, and each hands back its own ranked list: here is my 1st pick,
            my 2nd, my 3rd.
          </P>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              {
                name: 'the meaning searcher',
                plain: 'Finds things that SOUND LIKE what you asked, even when the words are completely different.',
                how: 'The question becomes 384 numbers with the same local model that embedded the corpus, and Postgres sorts every row by cosine distance in that space.',
                tech: 'pgvector · vector(384)',
                tone: 'var(--color-cal-1)',
              },
              {
                name: 'the keyword searcher',
                plain: 'Finds things containing the EXACT words you typed.',
                how: 'The question becomes a tsquery, and Postgres sorts by ts_rank against a column computed when the row was written.',
                tech: 'content_ts · GIN index',
                tone: 'var(--color-cal-2)',
              },
            ].map((arm) => (
              <div key={arm.name} className="rounded-lg border border-ui-line bg-ui-surface p-4">
                <p
                  className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                  style={{ color: arm.tone }}
                >
                  {arm.name}
                </p>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ui-fg/90">{arm.plain}</p>
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-ui-dim">{arm.how}</p>
                <p className="mt-3 font-mono text-[0.625rem] text-ui-faint">{arm.tech}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <H>Why both, and it goes in each direction</H>
          <P>
            A campaign number like <Mono>20V197000</Mono>{' '}
            <span className="text-ui-fg">does not mean anything. It is something.</span>{' '}
            Ask the meaning searcher for it and you get passages that look like
            they contain campaign numbers. Ask the keyword searcher and you get
            that campaign.
          </P>
          <P>
            And the reverse is just as true.{' '}
            <Mono>“car rolls away when I park it”</Mono> is a meaning question —
            no keyword in it appears in the document that answers it, which
            describes a gear display disagreeing with a gearbox.
          </P>
        </section>

        <section>
          <H>Each arm is asked for four times as much as you want</H>
          {/* VERBATIM, from :66–79. A readable paraphrase is how a quote stops
              being checkable, and this one is the only place the k × 4 decision
              is written down. */}
          <Code
            path="apps/ai/safety/src/grounding/search.ts:66–79"
            startLine={66}
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
          <Aside>
            Six results means 24 from each arm and 48 fused. Something ranked
            20th by meaning and 2nd by keywords{' '}
            <span className="text-ui-fg">has to be in the lists</span> before the
            next step can promote it — fetch only six from each and you throw it
            away before the step that would have found it.
          </Aside>
        </section>
      </div>
    </OriginDialog>
  );
}

/* ── 3.6 ─────────────────────────────────────────────────────────────────── */

export function FuseModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  return (
    <>
      <Trigger
        tone="cal-2"
        label="Inside the fusion — two judges with different scoring habits, and the trick that combines them"
        onOpen={setFrom}
      />
      {from && <FusePanel from={from} onClose={() => setFrom(null)} />}
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
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the fusion</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.6 · pure arithmetic over two lists
          </p>
        </>
      }
    >
      <div className="grid gap-9 pb-2">
        <section>
          <H>The problem</H>
          <P>
            One searcher scores on its own scale and the other on a completely
            different one.{' '}
            <span className="text-ui-fg">
              One judge marks out of 10, the other marks in dollars.
            </span>{' '}
            You cannot add their marks together — and averaging them is worse,
            because it looks reasonable.
          </P>
        </section>

        <section>
          <H>The trick: ignore the marks, use the placings</H>
          <P>
            Do not ask “what score did you give it?”. Ask{' '}
            <span className="text-ui-fg">“where did you put it?”</span> A 1st
            place is a 1st place from either judge. Each document earns points
            for every list it appears in — more for a better placing. Add up the
            points. Sort.
          </P>
        </section>

        <section>
          <H>The deliberate part, which is the bit readers miss</H>
          <P>
            1st place is worth <span className="text-ui-fg">barely more</span>{' '}
            than 2nd — about 1.6% more, not double. That sounds wrong until you
            see what it buys.
          </P>

          <div className="mt-4 rounded-lg border border-cal-2/40 bg-[var(--snip-bg)] p-4">
            <div className="grid gap-3">
              {[
                { label: 'placed 5th by BOTH judges', v: bothFifth, lit: true },
                { label: 'placed 1st by ONE judge only', v: oneFirst, lit: false },
              ].map((row) => (
                <div key={row.label} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-[0.75rem]">
                    <span className={row.lit ? 'text-ui-fg' : 'text-ui-dim'}>{row.label}</span>
                    <span className="ml-auto text-ui-dim">{row.v.toFixed(6)}</span>
                  </div>
                  <div className="h-[5px] w-full rounded-full bg-ui-line">
                    <div
                      className="h-[5px] rounded-full"
                      style={{
                        width: `${(row.v / bothFifth) * 100}%`,
                        background: row.lit ? 'var(--color-cal-2)' : 'var(--color-cal-3)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3.5 font-mono text-[0.6875rem]" style={{ color: 'var(--color-cal-2)' }}>
              the pair wins by {(bothFifth / oneFirst).toFixed(2)}×
            </p>
          </div>

          <Aside>
            That is the entire point.{' '}
            <span className="text-ui-fg">
              One judge loving something is an opinion. Both judges noticing it,
              even lukewarmly, is evidence.
            </span>{' '}
            The tiny gaps between placings are what let agreement outweigh
            enthusiasm.
          </Aside>
        </section>

        <section>
          <H>The formula, and the numbers behind those claims</H>
          {/* VERBATIM, from :210–228, and the two marked lines are why. The
              `+=` is the whole mechanism — a document in both lists accumulates
              from both, and a paraphrase writing `=` would invert the argument
              above it. The `.toFixed(3)` is the rounding this panel reproduces
              rather than transcribes, which is why the table below prints
              0.9840 and not 0.9839. */}
          <Code
            path="packages/grounding/src/hybrid.ts:210–228"
            startLine={210}
            mark={[4, 15]}
            lines={[
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
              '  dense.forEach(([doc], i) => add(doc, i + 1, \'dense\'));',
              '  sparse.docs.forEach((doc, i) => add(doc, i + 1, \'sparse\'));',
              '',
              '  const ranked = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);',
              '  const best = ranked[0]?.score ?? 1;',
              '  for (const r of ranked) r.score = Number((r.score / best).toFixed(3));',
            ]}
          />
          <Data
            path="what a placing is worth"
            mark={[4]}
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
          <Aside>
            The {RRF_K} is what flattens the gaps. Without it 1st is{' '}
            <Mono>1/1</Mono> and 2nd is <Mono>1/2</Mono> — a landslide, and one
            arm's opinion would decide everything. Missing from a list
            contributes nothing from that list, and the last step is cosmetic:
            divide by the best score so the top reads <Mono>1.0000</Mono>.
          </Aside>
        </section>

        <section>
          <H>No model, no database, no network</H>
          <P>
            Fusion is <span className="text-ui-fg">pure arithmetic over two
            lists</span>. It is why there is no <Mono>pnpm safety:fuse</Mono>:
            3.5 and 3.6 are one command, <Mono>pnpm safety:search</Mono>, because
            asking the two searchers is the part that costs anything and
            combining their answers is a loop over 48 numbers.
          </P>
        </section>

        <section>
          <H>The worked example, with the arithmetic on screen</H>
          <Data
            path='pnpm safety:search "recall 20V197000"'
            note="6 results in 1,474 ms · each arm fetched 24"
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
          <Aside>
            Every score there is computed from the two rank columns beside it by
            the code quoted above, including its rounding to three decimals — so
            the table cannot drift from the tool, and cannot quietly be tidier
            than it.
          </Aside>
        </section>

        <section>
          <H>And the thing to point at</H>
          <P>
            <span className="text-ui-fg">
              Every row has a dot in one column.
            </span>{' '}
            Every result was found by one judge and completely missed by the
            other. The judges agreed on nothing — so there was no agreement to
            reward, and the method had nothing to do but take turns: meaning's
            1st, keyword's 1st, meaning's 2nd, keyword's 2nd. Dealing out two
            decks alternately.
          </P>
          <Aside>
            Which is why the scores come in matching pairs. It is how fusion
            behaves when the lists do not overlap, rather than anything about
            this corpus — and it is one query, not a measurement.{' '}
            <span className="text-ui-fg">Stage 3.7 is what turns it into a number.</span>
          </Aside>
        </section>
      </div>
    </OriginDialog>
  );
}

/* ── shared ──────────────────────────────────────────────────────────────── */

/**
 * The two trigger rows are identical but for their hue, and the class names are
 * WRITTEN OUT rather than interpolated. Tailwind generates classes by scanning
 * source text for literals, so `text-${tone}` produces a class that exists in
 * the markup and in no stylesheet — a row that renders with no colour at all,
 * from a build that succeeded.
 */
const TONE = {
  'cal-1': { text: 'text-cal-1', hover: 'hover:border-cal-1/50' },
  'cal-2': { text: 'text-cal-2', hover: 'hover:border-cal-2/50' },
} as const;

function Trigger({
  tone,
  label,
  onOpen,
}: {
  tone: keyof typeof TONE;
  label: string;
  onOpen: (o: Origin) => void;
}) {
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => onOpen(originOf(e.currentTarget)),
    [onOpen],
  );
  return (
    <button
      type="button"
      onClick={open}
      className={`group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors ${TONE[tone].hover}`}
    >
      <span
        className={`font-mono text-[0.6875rem] tracking-[0.08em] uppercase ${TONE[tone].text}`}
      >
        under the hood
      </span>
      <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">{label}</span>
      <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
        open →
      </span>
    </button>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[0.9375rem] text-ui-fg">{children}</h3>
  );
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
