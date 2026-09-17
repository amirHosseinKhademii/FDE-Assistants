/**
 * Inside the embedder — stage 3.3, and the hour that batch composition costs.
 *
 * ── THE THIRD SIBLING, AND THE ANCHOR IS A STOPWATCH ───────────────────────
 *
 * 3.1's anchor is five lines of code, because the question is what it does.
 * 3.2's is a ledger, because the question is what it did to the corpus. This
 * one's is two timings of the same work, because the question at 3.3 is not
 * "what is an embedding" — that is two sentences and they are on the page —
 * but "why does this take an hour, and why does it not have to".
 *
 * ── THE FINDING IS NOT ABOUT EMBEDDING ─────────────────────────────────────
 *
 * The model pads every text in a batch to the longest one in that batch, so a
 * single 2,051-character passage among 63 short ones makes all 64 cost 2,051.
 * Sorting by length before batching is 58% faster for identical vectors. That
 * is a fact about padding, not about meaning, and it is the kind of thing a
 * reader can carry to their own work — which is why it is the anchor rather
 * than the six numbers the model produces.
 *
 * ── AND IT IS THE FIRST §9.6 FINDING, WHICH IS THE POINT OF THE ENGAGEMENT ─
 *
 * The change belongs in `@fde/grounding` rather than here: it is not
 * safety-specific, and insurance and steering would both get faster. It is also
 * INVISIBLE at their size — 555 chunks make the padding waste a rounding error,
 * and 73,442 make it an hour. So the fourth engagement found it because it is
 * the first corpus large enough for it to matter, which is `PLAN.md` §1 doing
 * exactly the job it was written for. The panel says so, because a page about
 * the pipeline that never showed the pipeline teaching us something would be a
 * page about a demo.
 *
 * Source: `docs/safety/EMBED.md`.
 */
import { useCallback, useRef, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

/**
 * The controlled comparison: 320 real passages, mean 610 characters, max 2,051,
 * embedded twice in two orders.
 */
const TIMING = {
  sample: 320,
  asCome: 29179,
  sorted: 12369,
  perSecCome: 11,
  perSecSorted: 26,
  minutesCome: 107,
  minutesSorted: 47,
} as const;

/**
 * AND THE REAL RUN, WHICH BEAT THE PROJECTION BY 22%.
 *
 * The projection was a 230× extrapolation from a twelve-second sample, and it
 * was wrong in the direction worth being wrong in. The full run sorts all
 * 73,442 passages, so a batch of 64 is far more length-uniform than one drawn
 * from a 320-passage sort — padding waste falls further at scale.
 *
 * BOTH NUMBERS STAY ON THE PANEL. A projection that came in 22% pessimistic for
 * a stated reason is a better thing to show than a number that was simply
 * right: it is the page being checkable about its own estimates rather than
 * quietly replacing them.
 */
const ACTUAL = { minutes: 36.6, perSec: 32 } as const;

const PASSAGES = 73442;
const DIMS = 384;

/** Sections, in the order the panel reads. The key is what a pressed row jumps to. */
const KEYS = ['what', 'finding', 'shared', 'died', 'costs', 'checks'] as const;
type Key = (typeof KEYS)[number];

export function EmbedModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  const saved = Math.round((1 - TIMING.sorted / TIMING.asCome) * 100);

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
          Inside the embedder — why sorting the passages first makes this {saved}%
          faster, for identical vectors
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <EmbedPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function EmbedPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const [active, setActive] = useState<Key | null>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});
  const sticky = useRef<HTMLDivElement>(null);

  const go = useCallback((key: Key) => {
    setActive(key);
    const target = sections.current[key];
    if (!target) return;
    const scroller = target.closest<HTMLElement>('[data-dialog-scroll]');
    if (!scroller) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const gap = (sticky.current?.offsetHeight ?? 0) + 16;
    const delta = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({ top: scroller.scrollTop + delta - gap, behavior: 'smooth' });
  }, []);

  const saved = Math.round((1 - TIMING.sorted / TIMING.asCome) * 100);

  return (
    <OriginDialog
      from={from}
      label="Inside the embedder"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the embedder</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.3 · {PASSAGES.toLocaleString('en-GB')} passages → {DIMS} numbers each ·{' '}
            <Mono>docs/safety/EMBED.md</Mono>
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS THE STOPWATCH. Same work, same vectors, two orders — and
          the bar is drawn to scale, so the gap is read before the numbers are. */}
      <div
        ref={sticky}
        className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-3"
      >
        <p className="pb-2.5 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the same {TIMING.sample} passages, twice · identical vectors
        </p>

        <div className="grid gap-2.5 rounded-lg border border-ui-line bg-[var(--snip-bg)] p-3.5">
          {[
            { label: 'as they come', ms: TIMING.asCome, rate: TIMING.perSecCome, mins: TIMING.minutesCome, lit: false },
            { label: 'sorted by length', ms: TIMING.sorted, rate: TIMING.perSecSorted, mins: TIMING.minutesSorted, lit: true },
          ].map((row) => (
            <div key={row.label} className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-[0.75rem]">
                <span className={row.lit ? 'text-ui-fg' : 'text-ui-dim'}>{row.label}</span>
                <span className="ml-auto text-ui-dim">
                  {row.ms.toLocaleString('en-GB')} ms
                </span>
                {/* `0h 47m` is not a duration anybody writes. Hours only
                    appear when there are any. */}
                <span className="w-32 shrink-0 text-right text-ui-faint">
                  {row.rate}/sec ·{' '}
                  {row.mins >= 60 ? `${Math.floor(row.mins / 60)}h ${row.mins % 60}m` : `${row.mins}m`}
                </span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-ui-line">
                <div
                  className="h-[5px] rounded-full"
                  style={{
                    width: `${(row.ms / TIMING.asCome) * 100}%`,
                    background: row.lit ? 'var(--color-cal-1)' : 'var(--color-cal-3)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-2.5 font-mono text-[0.625rem]">
          <span className="text-ui-faint">{saved}% faster, on the sample</span>
          <span className="text-ui-faint">·</span>
          <span style={{ color: 'var(--color-cal-1)' }}>
            the real run came in at {ACTUAL.minutes} min, {ACTUAL.perSec}/sec
          </span>
          <span className="text-ui-faint">
            — 22% under the projection, because sorting all{' '}
            {PASSAGES.toLocaleString('en-GB')} makes every batch more uniform than
            sorting {TIMING.sample} does
          </span>
        </div>
        <p className="pt-2 font-mono text-[0.625rem] text-ui-faint">press a section below</p>

        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {(
            [
              ['what', 'what an embedding is'],
              ['finding', 'why sorting wins'],
              ['shared', 'where the fix belongs'],
              ['died', 'two ways it died'],
              ['costs', 'what it costs'],
              ['checks', 'the checks'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.625rem] transition-colors ${
                active === k
                  ? 'border-cal-1 bg-cal-1/20 text-ui-fg'
                  : 'border-ui-line text-ui-faint hover:border-cal-1/50 hover:text-ui-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <Sect k="what" title="What an embedding is, and why anyone believes it" refs={sections} active={active}>
          <P>
            A computer cannot compare meanings. An embedding model reads a piece
            of text and produces a fixed-length list of numbers — {DIMS} here —
            arranged so that texts about similar things land near each other.
            Once every passage is a list of numbers, “find the most relevant
            passage” becomes arithmetic.
          </P>
          <Data
            path="ODI 11353867 — 615 characters in, 384 numbers out"
            mark={[4]}
            lines={[
              '2020 FORD F-150 | POWER TRAIN | filed 2020-09-08',
              'THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START…',
              '',
              '→',
              '-0.0357, -0.0272, 0.0568, 0.0164, -0.0230, 0.0981   … 378 more',
            ]}
          />
          <Data
            path="cosine similarity — one number from −1 to 1"
            mark={[0]}
            lines={[
              '"F-150 will not go into park, transmission shift"   →  0.8504   ✓',
              '"windscreen wiper motor failure"                    →  0.5703   ✗',
            ]}
          />
          <Aside>
            The model has never seen NHTSA and was never told any of this is
            about cars. The numbers carry the meaning, which is the entire claim
            — and it is measured here rather than asserted, because it is the one
            step of the pipeline a reader is most often asked to take on faith.
          </Aside>
        </Sect>

        <Sect k="finding" title="Sorting by length is 58% faster, for identical vectors" refs={sections} active={active}>
          <P>
            <span className="text-ui-fg">
              The model pads every text in a batch to the length of the longest
              one in that batch.
            </span>{' '}
            Put one 2,051-character passage in with 63 short ones and all 64 are
            computed as if they were 2,051 characters. The work goes into
            padding.
          </P>
          <P>
            So the fix is not a faster model or a bigger batch — it is deciding{' '}
            <em>what sits next to what</em>. Sort the passages by length, batch
            them, and each batch pads to something close to its own contents.
          </P>
          <Aside>
            <span className="text-ui-fg">
              And the order has to be restored afterwards.
            </span>{' '}
            <Mono>embedDocuments(texts)</Mono> promises vectors in the order the
            texts arrived. Sorting without unsorting attaches every vector to the
            wrong passage — no error, nothing that looks wrong, and retrieval
            that merely seems poor forever. Sort, embed, unsort.{' '}
            <Mono>@fde/grounding</Mono>'s own header already warns about this for
            hosted APIs that return results out of order; sorting locally is the
            same hazard approached from the other side.
          </Aside>
        </Sect>

        <Sect k="shared" title="The fix belongs in the shared package, and that is the finding" refs={sections} active={active}>
          <P>
            This is not safety-specific. Insurance and steering would both get
            faster, and neither would notice:{' '}
            <span className="text-ui-fg">
              it is invisible at their size
            </span>
            . 555 chunks make the padding waste a rounding error.{' '}
            {PASSAGES.toLocaleString('en-GB')} make it an hour.
          </P>
          <Aside>
            So the fourth engagement found it <em>because</em> it is the first
            corpus large enough for it to matter. That is the whole argument for
            this engagement existing — point machinery that works on a corpus we
            wrote at one nobody wrote for us, and see where it bends — arriving
            as a concrete change to a shared package rather than as a claim on a
            landing page.
          </Aside>
          <P>
            It is written down before it is made, which is{' '}
            <Mono>docs/safety/PLAN.md</Mono> §9.6: every time this engagement
            reaches for a change to a shared package, the reach gets recorded
            rather than quietly taken. This is the first one.
          </P>
        </Sect>

        <Sect k="died" title="Two ways this died — one before starting, one after finishing" refs={sections} active={active}>
          <Data
            path="the first attempt — all passages handed over in one call"
            mark={[1]}
            lines={[
              'the library does not batch internally: it built one tensor for the lot',
              'Failed to allocate memory for requested buffer of size 35571892224',
            ]}
          />
          <P>
            Insurance's 555 chunks fit. Steering's 2,827 did not. The failure is
            not gradual — fine, fine, fine, then a hard allocation error — and it
            landed <em>after</em> the ingest had already emptied the table, so a
            crash took the index with it.
          </P>
          <Aside>
            Fixed by batching at 64. The sorting above is the second act of the
            same story:{' '}
            <span className="text-ui-fg">
              batch size stops it dying, batch composition decides how long it
              takes.
            </span>
          </Aside>

          <P>
            <span className="text-ui-fg">
              And then it died at the other end, which cost more.
            </span>{' '}
            The next attempt computed every vector and then threw them all away.
          </P>
          <Data
            path="the second attempt — 37.9 minutes of finished work"
            mark={[1]}
            lines={[
              `${PASSAGES.toLocaleString('en-GB')} vectors of ${DIMS} dimensions in 37.9 min`,
              'RangeError: Invalid string length',
            ]}
          />
          <P>
            <Mono>JSON.stringify</Mono> over every record builds{' '}
            <span className="text-ui-fg">one string</span>, and V8 caps a string
            at 512 MB. A record is 9,101 characters, so the whole file is 637 MB
            — because a float serialises as{' '}
            <Mono>0.019854292273521423</Mono>, twenty characters of double
            precision out of a model that computed a float32.
          </P>
          <Aside>
            The estimate beforehand said 346 MB and{' '}
            <span className="text-ui-fg">would have passed review</span>, because
            it assumed a short float. Nothing about the arithmetic was careless;
            the wrong number went into it, and it was wrong by less than a factor
            of two — which is exactly the size of error a plausibility check does
            not catch.
          </Aside>
          <Aside>
            The fix is NDJSON, flushed every 4,000 records and resumable from
            whatever is on disk — and the format is the smaller half of it. The
            work had completed and the <em>write</em> destroyed it, which is the
            same shape as the ingest emptying the table before it embeds.{' '}
            <span className="text-ui-fg">
              Write expensive work down as you produce it.
            </span>{' '}
            Thirty-eight minutes of finished vectors should never be one
            unhandled call away from nothing.
          </Aside>
        </Sect>

        <Sect k="costs" title="What it costs, and why it runs here" refs={sections} active={active}>
          <Data
            path="the whole bill"
            mark={[3, 4]}
            lines={[
              `vectors   ${PASSAGES.toLocaleString('en-GB')} × ${DIMS} × 4 bytes   =   108 MB in memory`,
              'on disk   641 MB of NDJSON — a float is 20 characters, not 4 bytes',
              `time      ${ACTUAL.minutes} minutes, sorted, on this CPU`,
              'money     nothing',
              'egress    nothing',
            ]}
          />
          <Aside>
            The last line is the one this engagement turns on. Embedding touches{' '}
            <span className="text-ui-fg">every passage</span>, and the passages
            are members of the public describing crashes, fires and 53 deaths in
            their own words. A hosted embedder means sending all of it to a third
            party to be read. Local means it never leaves.
          </Aside>
          <P>
            And there is nothing traded away for that:{' '}
            <Mono>docs/FREE.md</Mono> §8c measured local <Mono>bge-small</Mono>{' '}
            at recall@k <span className="text-ui-fg">0.813</span> against the
            paid Azure model's <span className="text-ui-fg">0.813</span> on the
            sibling corpus. The same number. So “local” here is a decision about
            the data rather than about the bill, and it costs no accuracy to make.
          </P>
        </Sect>

        <Sect k="checks" title="The checks, and the one that matters" refs={sections} active={active}>
          <Code
            path="what stage 3.3 asserts"
            lang="text"
            mark={[1]}
            lines={[
              `${PASSAGES.toLocaleString('en-GB')} passages → ${PASSAGES.toLocaleString('en-GB')} vectors of ${DIMS} dimensions`,
              'ok  every passage got exactly one vector, in its original order',
              "ok  ODI 11353867's vector is nearest the REC-001 question (0.85)",
              'ok  no vector is all zeros — a silent failure mode for a truncated input',
            ]}
          />
          <Aside>
            The marked one is the important one, and it is the check that exists
            because of the optimisation above it. A vector attached to the wrong
            passage does not error, does not look wrong, and makes retrieval
            merely <em>seem</em> poor — which is the most expensive kind of bug
            available in this layer, because the obvious response to it is to go
            and change the chunker.
          </Aside>
        </Sect>
      </div>
    </OriginDialog>
  );
}

function Sect({
  k,
  title,
  refs,
  active,
  children,
}: {
  k: Key;
  title: string;
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  active: Key | null;
  children: React.ReactNode;
}) {
  const lit = active === k;
  return (
    <section
      ref={(el) => {
        refs.current[k] = el;
      }}
      className="scroll-mt-28"
    >
      <h3
        className={`font-mono text-[0.9375rem] transition-colors ${
          lit ? 'text-cal-1' : 'text-ui-fg'
        }`}
      >
        {title}
      </h3>
      <div className="mt-3 grid gap-3.5">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[66ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}

function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[64ch] border-l-2 border-cal-2/50 py-0.5 pl-3.5 text-[0.875rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}
