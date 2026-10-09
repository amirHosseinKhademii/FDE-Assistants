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
 * The right answers were at keyword ranks 93 through 3,026. The reranker was
 * handed the top 50. It reordered a pile that did not contain the answer,
 * perfectly. That is the ceiling stage 3.6b states in the abstract, arriving as
 * a measurement — and it is why the conclusion is not "get a better model".
 *
 * ── AND THE CAVEATS ARE NOT OPTIONAL ───────────────────────────────────────
 *
 * 0.40 is flattered: one of the three cases scored 1.00 against a bar of
 * "return any one of 400 documents", and the two hard cases scored 0.00 and
 * 0.20. It is n = 3, and it is counted over DOCUMENTS, not passages. A page
 * that printed 0.40 without those would be doing the thing this whole site
 * argues against. Steering's 0.813 is another corpus's number and is not set
 * beside this one anywhere in the panel.
 *
 * ── CORRECTED 2026-09-27 AGAINST THE BASELINES ─────────────────────────────
 *
 *   - "retrieval found 40% of what the key says should come back" was wrong
 *     arithmetic: 0.40 is the MEAN of three per-case scores (0.00, 0.20,
 *     1.00). Pooled, the three cases found 2 of 8 named documents;
 *   - the counting rule — documents, deduplicated by `documentId` — was never
 *     stated on the panel. It is now, beside the number;
 *   - the rank list is labelled as KEYWORD ranks, per INGESTION.md;
 *   - the two questions are quoted in full from `measure.ts` rather than
 *     shortened;
 *   - plain timings run 1.4–5.8 s (1,442 to 5,799 ms in `recall-plain.json`),
 *     not 1.5; the cross-encoder figure that stood beside them ("150 passages
 *     in 3,037 ms after a 1.5 s cold start") is in neither baseline, and is cut;
 *   - "what to build next" now says it was built: the tools of stage 4, called
 *     by hand, reach 1.00 on the same three cases (INGESTION.md §3.7).
 *
 * Sources: `apps/ai/safety/src/grounding/measure.ts`, the committed baselines
 * `docs/safety/evals/recall-{plain,reranked}.json`, `docs/safety/INGESTION.md`
 * §3.7.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Data } from '@veresk/surface';
import { HoodButton } from '@veresk/learn/steps';
import { Because, Numbers, Table } from '@veresk/learn/steps';

/** Where the answer key's documents ranked in the KEYWORD arm, each for its own question. */
const WHERE_THEY_WERE = [
  { id: '20V197000', rank: 93, what: 'the recall · REC-001' },
  { id: '11302656', rank: 121, what: 'REC-004' },
  { id: '11533202', rank: 1169, what: 'REC-004' },
  { id: '11524321', rank: 1239, what: 'REC-004' },
  { id: '11473666', rank: 2271, what: 'REC-004' },
  { id: '11353867', rank: 3026, what: 'the complaint · REC-001' },
] as const;

const POOL = 50;

const CASES = [
  {
    id: 'REC-001',
    plain: 0.0,
    reranked: 0.0,
    note: 'Both targets missing from the top 6, and from the top 50.',
  },
  {
    id: 'REC-004',
    plain: 0.2,
    reranked: 0.2,
    note: '1 of 5 death complaints: 5th without the reranker; with it, moved 3rd → 1st.',
  },
  {
    id: 'REC-005',
    plain: 1.0,
    reranked: 1.0,
    note: 'Found at position 1 both times; under reranking the hit moved 36th → 1st. No recall returned, so nothing to mis-cite — correct for a “no recall exists” question.',
  },
] as const;

const n = (x: number) => x.toLocaleString('en-GB');

export function MeasureModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => setFrom(originOf(e.currentTarget)),
    [],
  );

  return (
    <>
      <HoodButton
        blurb="Inside the measurement: why the reranker worked and the number did not move, and what that says to build next"
        onClick={open}
      />
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
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the measurement</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.7 · three questions, answered by hand first
          </p>
        </>
      }
    >
      <div className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-4">
        <p className="cal-label pb-2.5" data-tone="quiet">
          The same number twice
        </p>
        <Numbers
          items={[
            { value: '0.40', label: 'recall@6, hybrid search alone (3.7a)' },
            { value: '0.40', label: 'recall@6, the same run reranked (3.7b)' },
          ]}
        />
        <p className="pt-2.5 text-[0.8125rem] text-ui-faint">
          Three questions · counted over documents, not passages
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <section className="grid gap-4">
          <H>The number</H>
          <p className="cal-hood-text">
            Before any of the pipeline existed, three questions were answered by
            hand from the raw files: which documents a good answer has to rest on.
            This stage asks the same three questions and checks whether those
            documents come back in the top six.
          </p>
          <p className="cal-hood-text">
            Each question is scored on its own — the share of its documents that
            came back — and the three scores are averaged.{' '}
            <span className="text-ui-fg">0.00, 0.20 and 1.00 average to 0.40.</span>{' '}
            It is counted over <span className="text-ui-fg">documents, not passages</span>
            : an investigation cut into two pieces counts once, because the key
            names filings a person can look up, not our slicing of them.
          </p>
        </section>

        <section className="grid gap-4">
          <H>The reranker did work. It just didn't matter.</H>
          <p className="cal-hood-text">It moved things a long way:</p>
          <Data
            path="What reranking changed"
            note="recall-reranked.json · movedFrom"
            lines={['REC-005   one result went from 36th  →  1st', 'REC-004   another went from   3rd  →  1st']}
          />
          <p className="cal-hood-text">
            And the score didn't budge. That looks like a contradiction until you
            ask where the <em>right</em> answers were sitting.
          </p>

          <div className="rounded-xl border border-ui-line bg-[var(--snip-bg)] p-4">
            <p className="cal-label pb-3" data-tone="quiet">
              Where the answer key's documents ranked on the keyword side, each for
              its own question
            </p>
            <div className="grid gap-2.5">
              {WHERE_THEY_WERE.map((r) => (
                <div key={r.id} className="grid gap-1">
                  <div className="flex items-baseline gap-3 text-[0.875rem]">
                    <span className="font-mono text-ui-dim">{r.id}</span>
                    <span className="text-ui-faint">{r.what}</span>
                    <span className="ml-auto font-mono text-ui-fg">{n(r.rank)}</span>
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
            <p className="flex flex-wrap items-center gap-x-2 pt-3 text-[0.8125rem] text-ui-faint">
              <span
                aria-hidden
                className="inline-block h-[6px] w-4 rounded-full"
                style={{ background: 'var(--color-cal-1)' }}
              />
              <span className="text-cal-1">What the reranker was handed — the top {POOL}.</span>
              <span>Every one of these sat past it.</span>
            </p>
          </div>

          <Because>
            <span className="text-ui-fg">A reranker reorders. It cannot fetch.</span>{' '}
            So it did its job perfectly on a pile that did not contain the answer.
            The diagnosis is not “found it, ranked it badly” — it is “never found
            it”, and no reranker fixes that, nor would a better one.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Why search missed</H>
          <p className="cal-hood-text">Look at what was asked.</p>
          <Data
            path="apps/ai/safety/src/grounding/measure.ts — two of the three questions"
            lines={[
              'REC-001  We run 2020 F-150s. Is the transmission park problem a known defect,',
              '         and is the fix holding?',
              '',
              'REC-004  Are there any complaints involving a death on the 2019-2020 Tesla Model 3?',
            ]}
          />
          <p className="cal-hood-text">
            <span className="text-ui-fg">
              These aren't really search questions. They're filters wearing the
              clothes of questions.
            </span>
          </p>
          <p className="cal-hood-text">
            <code>2020 F-150</code>, <code>Tesla Model 3</code>,{' '}
            <code>involving a death</code> — every one of those is a labelled field
            already sitting in the database. Make. Model. Year. Death count. And
            search is treating them as <em>words</em>: it looks for documents that
            say “Ford” and “park” and “problem”, the same way it would look for a
            feeling.
          </p>
          <Because>
            The first question matches{' '}
            <span className="text-ui-fg">{n(54541)} documents</span> on ordinary
            vocabulary alone — “run”, “2020”, “transmission”, “problem”, “fix”. The
            right answer drowns.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>Proof, not opinion</H>
          <Data
            path="Filter first, then search inside what is left"
            note="docs/safety/INGESTION.md §3.7"
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
          <Because>
            Filtering first, then searching <em>inside</em> the filtered set, finds
            what searching everything could not.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>So what this really says</H>
          <p className="cal-hood-text">
            The fix isn't a better embedder. It isn't a better chunker. It isn't a
            better reranker.{' '}
            <span className="text-ui-fg">
              It's that the machine needs to read “2020 F-150” as a filter, not as
              a phrase
            </span>{' '}
            — which means a tool the model can call with structured arguments, not
            a bigger pile of text to search.
          </p>
          <Because>
            Which is the lesson the insurance engagement already carries in{' '}
            <code>get_policyholder</code>:{' '}
            <span className="text-ui-fg">
              a question with one exact answer is a lookup, not a search.
            </span>{' '}
            Reached independently here, on a completely different corpus, by
            measuring rather than by remembering.
          </Because>
          <p className="cal-hood-text">
            <span className="text-ui-fg">Those tools were then built</span>, in
            stage 4. Called by hand with the right arguments, they bring back
            everything the key names on all three questions — 1.00, every time.
            How often the model itself calls them well is a separate and noisier
            number, and it belongs to the stages that follow.
          </p>
        </section>

        <section className="grid gap-4">
          <H>Per question</H>
          <Table
            head={['Case', 'Plain', 'Reranked', 'What happened']}
            numeric={[1, 2]}
            rows={CASES.map((c) => [c.id, c.plain.toFixed(2), c.reranked.toFixed(2), c.note])}
          />
          <Because>
            <span className="text-ui-fg">0.40 is flattered, and that has to be said.</span>{' '}
            REC-005 scored a perfect 1.00, but its bar was “return any one of 400
            documents” — nearly impossible to fail. The two hard cases scored 0.00
            and 0.20. And n = 3: enough to say search alone tops out here, not
            enough for anything finer.
          </Because>
        </section>

        <section className="grid gap-4">
          <H>The baselines are files, not screenshots</H>
          <Data
            path="Committed, and diffable against the next run"
            note="Recorded 2026-09-17"
            lines={['docs/safety/evals/recall-plain.json', 'docs/safety/evals/recall-reranked.json']}
          />
          <p className="cal-hood-text">
            Timings, for what they cost: 1.4 to 5.8 seconds a question without the
            reranker, 2.7 to 4.6 seconds with it.
          </p>
        </section>
      </div>
    </OriginDialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[1.0625rem] font-bold text-ui-fg">{children}</h3>;
}
