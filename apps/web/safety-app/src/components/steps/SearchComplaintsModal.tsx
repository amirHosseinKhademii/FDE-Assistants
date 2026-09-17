/**
 * Inside `search_complaints` — stage 4.3, and the number that justifies stage 4.
 *
 * ── THE ANCHOR IS ONE MOVEMENT ────────────────────────────────────────────
 *
 * Rank 3,026 to position 1, on the same question with the same embeddings and
 * the same fusion. Nothing about the search changed except how much of the
 * corpus it was pointed at. That is the whole argument for a filter being a
 * filter rather than a phrase, and it needs no prose beside it.
 *
 * ── AND THE CAVEAT IS AS PROMINENT AS THE NUMBER ──────────────────────────
 *
 * 4.5 has now run and recall@6 went 0.40 to 1.00 over the three retrieval
 * cases. The caveat did not go away, it changed shape: the routing is written
 * by hand, so that is a CEILING rather than a score. This panel's own claim is
 * still only about one case, and "promising in isolation" and "measured" remain
 * different sentences — which is why 3,026 → 1 sits here and the measurement
 * sits on the tab, rather than this panel quoting 1.00 as if it earned it.
 *
 * ── THE TRAP IS INVISIBLE AND WORTH THE SPACE ─────────────────────────────
 *
 * The obvious build — pass the filter into the existing hybrid search — cannot
 * work, because the two arms support different filters. One would honour a
 * range and the other would ignore it, they would search different sets, fuse
 * the results, and nothing would error.
 */
import { useCallback, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';

const HAYSTACK = { before: 70194, after: 1057 };
const RANK = { before: 3026, after: 1 };

export function SearchComplaintsModal() {
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
          Inside <Mono>search_complaints</Mono> — rank 3,026 to position 1, and
          why that is not yet a measurement
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <SearchComplaintsPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function SearchComplaintsPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside search_complaints"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside search_complaints</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 4.3 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS ONE MOVEMENT, and it needs no sentence beside it. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the same question · the same embeddings · the same fusion
        </p>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <div>
            <p className="font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
              searching all {HAYSTACK.before.toLocaleString('en-GB')}
            </p>
            <p className="mt-0.5 font-mono text-2xl text-ui-dim">
              rank {RANK.before.toLocaleString('en-GB')}
            </p>
          </div>
          <span className="font-mono text-xl text-ui-faint">→</span>
          <div>
            <p className="font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
              searching {HAYSTACK.after.toLocaleString('en-GB')}
            </p>
            <p className="mt-0.5 font-mono text-2xl" style={{ color: 'var(--color-cal-2)' }}>
              position {RANK.after}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <section>
          <H>What it does</H>
          <P>
            Every search so far looked at all{' '}
            {HAYSTACK.before.toLocaleString('en-GB')} complaints at once. This
            one <span className="text-ui-fg">narrows first, then searches
            inside</span>.
          </P>
          <Data
            path="one question, in two steps"
            mark={[0]}
            lines={[
              '"2020 F-150, power train, filed after the recall"   →  1,057 complaints',
              'then search those for "will not go into park"',
            ]}
          />
          <Why>
            Stage 3 asked the same question the old way and the complaint that
            answers it came back at rank {RANK.before.toLocaleString('en-GB')} —
            not in the top 6, not in the top 50 — because “2020 F-150” was being
            treated as words to match, competing with 54,541 documents containing
            ordinary language like “run”, “2020” and “problem”.
          </Why>
          <Key>
            It is not words. It is a filter. Apply it as one and the answer is
            first.
          </Key>
        </section>

        <section>
          <H>And the second case goes from one to all of them</H>
          <Data
            path="REC-004 — complaints involving a death on the 2019–2020 Tesla Model 3"
            mark={[1]}
            lines={[
              'unfiltered   1 of 5 death complaints',
              'filtered     5 of 5 — the filter alone leaves exactly 5',
            ]}
          />
          <Why>
            The filter is not narrowing the field so search can do better here —
            it has isolated the answer on its own. Which is the shape of the
            whole finding: some of these questions were never search questions.
          </Why>
        </section>

        <section>
          <H>Why the filter could not simply be passed to the existing search</H>
          <P>
            The obvious build was to hand the filter to the hybrid search from
            stage 3.5. It cannot be done, and the reason is worth a callout
            because it is <span className="text-ui-fg">invisible</span>.
          </P>
          <Data
            path="the two arms support different filters"
            mark={[1, 3]}
            lines={[
              'the MEANING arm    filters through the vector store',
              '                   supports  in, >=, <=, ranges',
              'the KEYWORD arm    filters by matching a JSON fragment',
              '                   supports  equality only',
            ]}
          />
          <Key>
            So a filter saying “at least one death”, or a date range, or a
            component prefix would be honoured by one arm and ignored by the
            other. The two halves would search different sets, fuse the results,
            and nothing would error — you would get a worse answer and blame the
            ranking.
          </Key>
          <Why>
            So the filter resolves to one explicit set first and both arms are
            restricted to exactly that. There is a check whose only job is to
            fail if they ever diverge:{' '}
            <em>every fused hit satisfies the filter, both arms searched one
            universe</em>.
          </Why>
        </section>

        <section>
          <H>An accidental cross-check</H>
          <Data
            path="the same number, from two things that share no code"
            mark={[0, 1]}
            lines={[
              'awk over the raw flat file        1,057',
              'SQL over the Postgres index       1,057',
              '',
              '20 before the recall date + 1,057 after  =  1,077, the complete set',
            ]}
          />
          <Why>
            The filter reported 1,057 candidates, which is the number the answer
            key was corrected to hours earlier when <Mono>awk</Mono> counted the
            distinct F-150 power-train complaints filed after the recall date.
            Different code, different store, same number — and the date split is
            exact, so the check that exists to catch date handling regressing
            silently confirmed the partition rather than merely passing.
          </Why>
        </section>

        <section>
          <H>What this alone does not prove</H>
          <Key>
            This is one case. The end-to-end number is stage 4.5, and it needed
            every tool at once — the question wants both the recall and the
            complaint, and no single tool returns both.
          </Key>
          <Why>
            It has since run: recall@6 went from 0.40 to 1.00 across the three
            retrieval cases, with the tools called{' '}
            <span className="text-ui-fg">by hand</span> — a ceiling on what is
            reachable, not a score for what a model would ask. Two cases looking
            dramatically better in isolation was still a different claim from a
            measurement, and it is the difference this site exists to insist on.
          </Why>
        </section>

        <section>
          <H>The checks</H>
          <Data
            path="pnpm safety:search-complaints"
            note="7 of 7"
            mark={[0, 6]}
            lines={[
              'ok  the complaint search could not find at all is now in the top 6',
              'ok  the filter actually narrowed the corpus — 1,057 from 70,194',
              'ok  the filter alone isolates exactly the 5 death complaints',
              'ok  all five come back in the top 6',
              'ok  before and after the recall date partition the same set',
              'ok  an impossible filter returns nothing, and does not silently widen',
              'ok  every fused hit satisfies the filter — both arms searched one universe',
            ]}
          />
          <Why>
            The last one is the guard against the invisible failure above. The
            sixth matters too: a filter that matches nothing has to say so rather
            than quietly relaxing itself, because a search that widens when it
            finds nothing is a search that always finds something.
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
