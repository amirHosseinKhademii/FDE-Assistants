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
 * ── AND IT IS THE FIRST §9.6 FINDING — NOW MADE, NOT JUST WRITTEN DOWN ─────
 *
 * The change belonged in `@fde/grounding` rather than here: it is not
 * safety-specific, and insurance and steering both get faster. It is also
 * INVISIBLE at their size — 555 chunks make the padding waste a rounding error,
 * and 73,442 make it an hour. This panel used to say the change was "written
 * down before it is made". It has been made: `LocalEmbeddings.embedDocuments`
 * in `packages/grounding/src/embeddings.ts` sorts, embeds and scatters back, and
 * the panel quotes it.
 *
 * ── CORRECTED 2026-09-27 AGAINST THE CODE ──────────────────────────────────
 *
 *   - the checks are `cli/embed.ts`'s three, by name. The earlier list was
 *     EMBED.md's draft, including an "in its original order" check that does
 *     not exist: order is caught by checking MEANING, which is the point;
 *   - the real run's rate is derived — 73,442 in 36.6 minutes is 33 a second —
 *     rather than the 32 typed here before, which nothing sourced;
 *   - 0.813 is labelled as Vantis Steering's local-versus-Azure measurement on
 *     its own corpus. It is not Calder's number and is not set beside one.
 *
 * Sources: `docs/safety/EMBED.md`, `apps/ai/safety/src/cli/embed.ts`,
 * `packages/grounding/src/embeddings.ts`.
 */
import { useCallback, useRef, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { HoodButton } from '@veresk/learn/steps';
import { Because } from '@veresk/learn/steps';

/**
 * The controlled comparison: 320 real passages, mean 610 characters, max 2,051,
 * embedded twice in two orders. The same table is in the comment above the
 * sort in `embeddings.ts`.
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

const PASSAGES = 73442;
const DIMS = 384;

/**
 * AND THE REAL RUN, WHICH BEAT THE PROJECTION BY 22%.
 *
 * The projection was a 230× extrapolation from a twelve-second sample, and it
 * was wrong in the direction worth being wrong in. `pnpm safety:embed` sorts all
 * 73,442 passages before cutting them into slabs, so a batch of 64 is far more
 * length-uniform than one drawn from a 320-passage sort — padding waste falls
 * further at scale.
 *
 * BOTH NUMBERS STAY ON THE PANEL. A projection that came in 22% pessimistic for
 * a stated reason is a better thing to show than a number that was simply
 * right: it is the page being checkable about its own estimates rather than
 * quietly replacing them.
 *
 * The rate is derived from the minutes, not typed, so the two cannot disagree.
 */
const ACTUAL_MINUTES = 36.6;
const ACTUAL_PER_SEC = Math.round(PASSAGES / (ACTUAL_MINUTES * 60));
const UNDER = Math.round((1 - ACTUAL_MINUTES / TIMING.minutesSorted) * 100);
const SAVED = Math.round((1 - TIMING.sorted / TIMING.asCome) * 100);

const n = (x: number) => x.toLocaleString('en-GB');

/** Sections, in the order the panel reads. The key is what a pressed pill jumps to. */
const KEYS = ['what', 'finding', 'shared', 'costs', 'checks'] as const;
type Key = (typeof KEYS)[number];

const LABELS: Record<Key, string> = {
  what: 'What an embedding is',
  finding: 'Why sorting wins',
  shared: 'Where the fix went',
  costs: 'What it costs',
  checks: 'The checks',
};

export function EmbedModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  return (
    <>
      <HoodButton
        blurb={`Inside the embedder: why sorting the passages by length first makes it ${SAVED}% faster, for identical results`}
        onClick={open}
      />
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

  return (
    <OriginDialog
      from={from}
      label="Inside the embedder"
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the embedder</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.3 · {n(PASSAGES)} passages, {DIMS} numbers each
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
        <p className="cal-label pb-2" data-tone="quiet">
          The same {TIMING.sample} passages embedded twice — identical results, different order
        </p>

        <div className="grid gap-3 rounded-lg border border-ui-line bg-[var(--snip-bg)] p-3.5">
          {[
            { label: 'As they come', ms: TIMING.asCome, rate: TIMING.perSecCome, mins: TIMING.minutesCome, lit: false },
            { label: 'Sorted by length', ms: TIMING.sorted, rate: TIMING.perSecSorted, mins: TIMING.minutesSorted, lit: true },
          ].map((row) => (
            <div key={row.label} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 text-[0.875rem]">
                <span className={row.lit ? 'font-semibold text-ui-fg' : 'text-ui-dim'}>{row.label}</span>
                <span className="ml-auto font-mono text-ui-dim">{n(row.ms)} ms</span>
                {/* `0h 47m` is not a duration anybody writes. Hours only
                    appear when there are any. */}
                <span className="w-44 shrink-0 text-right text-[0.8125rem] text-ui-faint">
                  {row.rate} a second · whole corpus{' '}
                  {row.mins >= 60 ? `${Math.floor(row.mins / 60)}h ${row.mins % 60}m` : `${row.mins}m`}
                </span>
              </div>
              <div className="h-[6px] w-full rounded-full bg-ui-line">
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    width: `${(row.ms / TIMING.asCome) * 100}%`,
                    background: row.lit ? 'var(--color-cal-1)' : 'var(--color-cal-3)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="pt-2.5 text-[0.8125rem] leading-relaxed text-ui-faint">
          {SAVED}% faster on the sample.{' '}
          <span className="text-ui-fg">
            The real run took {ACTUAL_MINUTES} minutes, about {ACTUAL_PER_SEC} a second
          </span>{' '}
          — {UNDER}% under the projection, because sorting all {n(PASSAGES)} makes
          every batch more even than sorting {TIMING.sample} does.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              className={`rounded-full border px-3 py-0.5 text-[0.8125rem] transition-colors ${
                active === k
                  ? 'border-cal-sky bg-cal-sky/20 text-ui-fg'
                  : 'border-ui-line-lit text-ui-dim hover:border-cal-sky/60 hover:text-ui-fg'
              }`}
            >
              {LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <Sect k="what" title="What an embedding is, and why anyone believes it" refs={sections} active={active}>
          <p className="cal-hood-text">
            A computer cannot compare meanings. An embedding model reads a piece of
            text and produces a fixed-length list of numbers — {DIMS} here —
            arranged so that texts about similar things land near each other. Once
            every passage is a list of numbers, “find the most relevant passage”
            becomes arithmetic.
          </p>
          <Data
            path="vectors.ndjson — ODI 11353867, 615 characters in, 384 numbers out"
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
            path="Cosine similarity — one number from −1 to 1"
            note="docs/safety/EMBED.md"
            mark={[0]}
            lines={[
              '"F-150 will not go into park, transmission shift"   →  0.8504   ✓',
              '"windscreen wiper motor failure"                    →  0.5703   ✗',
            ]}
          />
          <Because>
            The model has never seen NHTSA and was never told any of this is about
            cars. The numbers carry the meaning, which is the entire claim — and it
            is measured here rather than asserted, because it is the one step of
            the pipeline a reader is most often asked to take on faith.
          </Because>
        </Sect>

        <Sect k="finding" title="Sorting by length is 58% faster, for identical results" refs={sections} active={active}>
          <p className="cal-hood-text">
            <span className="text-ui-fg">
              The model pads every text in a batch to the length of the longest one
              in that batch.
            </span>{' '}
            Put one 2,051-character passage in with 63 short ones and all 64 are
            computed as if they were 2,051 characters. The work goes into padding.
          </p>
          <p className="cal-hood-text">
            So the fix is not a faster model or a bigger batch — it is deciding{' '}
            <em>what sits next to what</em>. Sort the passages by length, batch
            them, and each batch pads to something close to its own contents.
          </p>
          <Because>
            <span className="text-ui-fg">And the order has to be restored afterwards.</span>{' '}
            <code>embedDocuments(texts)</code> promises vectors in the order the
            texts arrived. Sorting without unsorting attaches every vector to the
            wrong passage — no error, nothing that looks wrong, and retrieval that
            merely seems poor forever. Sort, embed, unsort. The shared package's
            own header already warned about this for hosted services that return
            results out of order; sorting locally is the same hazard approached
            from the other side.
          </Because>
        </Sect>

        <Sect k="shared" title="The fix went into the shared package, and that is the finding" refs={sections} active={active}>
          <p className="cal-hood-text">
            This is not safety-specific. Insurance and steering get faster too, and
            neither would have noticed:{' '}
            <span className="text-ui-fg">it is invisible at their size</span>. 555
            chunks make the padding waste a rounding error; {n(PASSAGES)} make it
            an hour.
          </p>
          <Code
            path="packages/grounding/src/embeddings.ts"
            note="LocalEmbeddings.embedDocuments · excerpt"
            mark={[0, 9]}
            lines={[
              'const order = texts.map((t, i) => i).sort((a, b) => texts[a].length - texts[b].length);',
              '',
              'const out = new Array<number[]>(texts.length);',
              'let done = 0;',
              'for (let i = 0; i < order.length; i += size) {',
              '  const slice = order.slice(i, i + size);',
              '  const vectors = await this.run(slice.map((j) => texts[j]));',
              "  // Scatter back to the caller's positions, not push in sorted order.",
              '  slice.forEach((j, k) => {',
              '    out[j] = vectors[k];',
              '  });',
              '  done += slice.length;',
              '  this.onBatch?.(done, texts.length);',
              '}',
              'return out;',
            ]}
          />
          <p className="cal-hood-text">
            The first marked line is the sort; the second is the unsort — each
            vector goes back to the position its text arrived in, not the position
            it was computed in. <code>size</code> is 64 unless{' '}
            <code>LOCAL_EMBEDDING_BATCH</code> says otherwise.
          </p>
          <Because>
            So the fourth engagement found it <em>because</em> it is the first
            corpus large enough for it to matter. That is the whole argument for
            this engagement existing — point machinery that works on a corpus we
            wrote at one nobody wrote for us, and see where it bends — arriving as
            a concrete change to a shared package rather than as a claim on a
            landing page. It was written down as a proposed change first, and then
            made; it was the first of its kind.
          </Because>
        </Sect>

        <Sect k="costs" title="What it costs, and why it runs here" refs={sections} active={active}>
          <Data
            path="The whole bill"
            mark={[3, 4]}
            lines={[
              `vectors   ${n(PASSAGES)} × ${DIMS} × 4 bytes   =   108 MB in memory`,
              'on disk   641 MB of NDJSON — a number is 20 characters of text, not 4 bytes',
              `time      ${ACTUAL_MINUTES} minutes, sorted, on this machine's processor`,
              'money     nothing',
              'egress    nothing',
            ]}
          />
          <Because>
            The last line is the one this engagement turns on. Embedding touches{' '}
            <span className="text-ui-fg">every passage</span>, and the passages are
            members of the public describing crashes, fires and 53 deaths in their
            own words. A hosted embedder means sending all of it to a third party
            to be read. Local means it never leaves.
          </Because>
          <p className="cal-hood-text">
            And no accuracy is traded away for it — though the evidence comes from
            another engagement, not this one. On{' '}
            <span className="text-ui-fg">Vantis Steering's corpus</span>, the same
            local model scored a retrieval recall of 0.813, and the paid Azure model
            scored 0.813 too. That is Steering's measurement, not Calder's, and it
            compares two embedders rather than grading this pipeline. What it
            settles is that “local” here is a decision about the data rather than
            about the bill.
          </p>
        </Sect>

        <Sect k="checks" title="The checks, and the one that matters" refs={sections} active={active}>
          <Data
            path="pnpm safety:embed — the three checks"
            note="Names from cli/embed.ts · read back off disk"
            mark={[1]}
            lines={[
              'ok    every passage got exactly one vector of 384 dimensions, on disk',
              "ok    ODI 11353867's vector is in the right place, not just present",
              'ok    no vector is all zeros',
            ]}
          />
          <Because>
            The marked one exists because of the optimisation above it. A vector
            scattered back to the wrong passage does not error and does not look
            wrong, and counting cannot catch it — {n(PASSAGES)} vectors are{' '}
            {n(PASSAGES)} vectors in any order. So the check asks about{' '}
            <span className="text-ui-fg">meaning</span> instead: REC-001's complaint
            has to sit close to a question about it and far from one about
            windscreen wipers. Without that, retrieval merely <em>seems</em> poor,
            and the obvious response is to go and change the chunker.
          </Because>
          <p className="cal-hood-text">
            All three read the file back off disk rather than trusting what was in
            memory, because the bug this command exists to prevent was entirely in
            the writing: an earlier version computed every vector and then lost
            them all turning them into one string too long for the language to
            hold.
          </p>
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
    >
      <h3
        className={`text-[1.0625rem] font-bold transition-colors ${
          lit ? 'text-cal-sky' : 'text-ui-fg'
        }`}
      >
        {title}
      </h3>
      <div className="mt-3.5 grid gap-4">{children}</div>
    </section>
  );
}
