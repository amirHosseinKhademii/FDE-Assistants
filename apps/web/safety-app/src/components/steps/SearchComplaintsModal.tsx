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
 * This panel's own claim is about one case, and "promising in isolation" and
 * "measured" are different sentences — which is why 3,026 → 1 sits here and the
 * measurements sit on their own steps. Both have now run, and each carries its
 * caveat wherever it is quoted:
 *
 *   4.5, tools called BY HAND    recall@6 0.40 → 1.00 over three cases. A
 *                                CEILING, not a score; two cases moved, and
 *                                REC-005 was already 1.00 with an EMPTY result
 *                                as its rightness.
 *   6,   tools called BY A MODEL  0.17 to 0.50 over three runs (0.50, 0.17,
 *                                0.17). A RANGE, never averaged — nearly all of
 *                                the spread is REC-004 calling this tool or not.
 *
 * ── THE TRAP IS INVISIBLE AND WORTH THE SPACE ─────────────────────────────
 *
 * The obvious build — pass the filter into the existing hybrid search — cannot
 * work, because the two arms support different filters. One would honour a
 * range and the other would ignore it, they would search different sets, fuse
 * the results, and nothing would error.
 *
 * ── CORRECTED 2026-09-27 ──────────────────────────────────────────────────
 *
 * The checks were captioned `pnpm safety:search-complaints`, a script that does
 * not exist; it is `pnpm safety:complaints`, and the listing now uses the check
 * names it prints. The trigger's "why that is not yet a measurement" predated
 * 4.5 and stage 6, and is gone. Restyled for the `/steps` redesign the same
 * day: the shared trigger, sentence-case labels, 1rem body text.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';
import type { ReactNode } from 'react';
import { HoodButton, HoodSection, HoodText } from './Hood';

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
      <HoodButton
        blurb="How narrowing to the right vehicle first moved one complaint from rank 3,026 to first place."
        onClick={open}
      />

      {from && <SearchComplaintsPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function SearchComplaintsPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  return (
    <OriginDialog
      from={from}
      label="Inside search_complaints"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">
            Inside <span className="font-mono">search_complaints</span>
          </p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Step 4.3 · built, and checked against the answer key
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS ONE MOVEMENT, and it needs no sentence beside it. */}
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          The same question, the same embeddings, the same fusion
        </p>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-[0.875rem] text-ui-faint">
              Searching all {HAYSTACK.before.toLocaleString('en-GB')} complaints
            </p>
            <p className="mt-0.5 text-2xl font-bold text-ui-dim tabular-nums">
              Rank {RANK.before.toLocaleString('en-GB')}
            </p>
          </div>
          <span className="pb-1 text-xl text-ui-faint" aria-hidden>
            →
          </span>
          <div>
            <p className="text-[0.875rem] text-ui-faint">
              Searching the {HAYSTACK.after.toLocaleString('en-GB')} the filter leaves
            </p>
            <p className="mt-0.5 text-2xl font-bold text-cal-1 tabular-nums">
              Position {RANK.after}
            </p>
          </div>
        </div>
      </div>

      <div className="pb-2 [&_.snip-frame]:my-1">
        <HoodSection title="What it does">
          <HoodText>
            Every search so far looked at all{' '}
            {HAYSTACK.before.toLocaleString('en-GB')} complaints at once. This
            one{' '}
            <strong className="font-semibold text-ui-fg">
              narrows first, then searches inside
            </strong>
            : it keeps only the complaints about the right vehicle, part and
            dates, and looks for the symptom among those.
          </HoodText>
          <Data
            path="One question, in two steps"
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
        </HoodSection>

        <HoodSection title="And the second case goes from one to all of them">
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
        </HoodSection>

        <HoodSection title="Why the filter could not simply be passed to the existing search">
          <HoodText>
            The obvious build was to hand the filter to the hybrid search from
            stage 3.5. It cannot be done, and the reason is worth a callout
            because it is{' '}
            <strong className="font-semibold text-ui-fg">invisible</strong>.
          </HoodText>
          <Data
            path="The two arms support different filters"
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
        </HoodSection>

        <HoodSection title="An accidental cross-check">
          <Data
            path="The same number, from two things that share no code"
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
            key was corrected to hours earlier when <code>awk</code> counted the
            distinct F-150 power-train complaints filed after the recall date.
            Different code, different store, same number — and the date split is
            exact, so the check that exists to catch date handling regressing
            silently confirmed the partition rather than merely passing.
          </Why>
        </HoodSection>

        <HoodSection title="What this alone does not prove">
          <Key>
            This is one case. The end-to-end number needed every tool at once —
            the question wants both the recall and the complaint, and no single
            tool returns both.
          </Key>
          <Why>
            That number has since been measured twice. With the tools called{' '}
            <strong className="font-semibold text-ui-fg">by hand</strong> (step
            4.5), recall@6 over the three retrieval cases went from 0.40 to 1.00
            — a ceiling on what is reachable, not a score. Only two of the three
            cases moved: REC-005 was already at 1.00, and what makes it right is
            an empty result.
          </Why>
          <Why>
            With a <strong className="font-semibold text-ui-fg">model</strong>{' '}
            choosing the tools (stage 6), three runs gave 0.50, 0.17 and 0.17 — a
            range of 0.17 to 0.50, reported as a range because the runs disagree.
            Nearly all of the spread is REC-004, and it is this tool: either the
            model calls <code>search_complaints</code> and gets all five death
            complaints, or it answers from the count alone and retrieves none.
          </Why>
          <Why>
            Stage 7's fix was not a line in the prompt. The count now says, in
            its own result, that a number is not a quotation and that this tool
            is how to fetch examples — and REC-004's “cites at least one
            complaint by ODI number” went from 1 of 3 runs to 3 of 3.
          </Why>
        </HoodSection>

        <HoodSection title="The checks">
          <Data
            path="pnpm safety:complaints"
            note="7 of 7"
            mark={[0, 6]}
            lines={[
              'ok  REC-001 · the complaint search could not find at all is now in the top 6',
              'ok  the filter actually narrowed the corpus',
              'ok  REC-004 · the filter alone isolates exactly the 5 death complaints',
              'ok  REC-004 · all five come back in the top 6',
              'ok  REC-008 · before and after the recall date partition the same set',
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
        </HoodSection>
      </div>
    </OriginDialog>
  );
}

/** The point — restyled on `/steps` by the `cal-key` rule in app.css. */
function Key({ children }: { children: ReactNode }) {
  return <p className="cal-key">{children}</p>;
}

/** A reason, set in the margin — the `cal-why` rule. */
function Why({ children }: { children: ReactNode }) {
  return <p className="cal-why">{children}</p>;
}
