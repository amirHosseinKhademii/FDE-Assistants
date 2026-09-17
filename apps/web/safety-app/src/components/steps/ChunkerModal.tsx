/**
 * Inside the chunker — stage 3.2's code, and the two surprises in it.
 *
 * ── A SIBLING OF `ParserModal`, AND DELIBERATELY SO ────────────────────────
 *
 * Same trigger, same panel, same pinned anchor at the top with the sections
 * scrolling under it. Two stages explained in two different shapes would make
 * the reader learn the page twice.
 *
 * WHAT DIFFERS IS WHAT IS PINNED. The parser's anchor is five lines of code,
 * because the question there is "what does it do". The question here is "what
 * did it do to the corpus", and the answer is a three-row table where two rows
 * say *nothing*. So the table is the anchor, and the sections underneath argue
 * about it.
 *
 * ── NOTHING HERE IS PREDICTED ──────────────────────────────────────────────
 *
 * Unlike the parser panel, which shipped before stage 3.1 existed, every figure
 * in this one came from running `@fde/grounding`'s chunker over the real output
 * of 3.1. The code below is still a specification — `toPassages` is not written
 * — but the numbers it will produce are already measured, which is why no badge
 * on this panel says a run has not happened.
 *
 * Source: `docs/safety/CHUNK.md`.
 */
import { useCallback, useRef, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { MAX_CHARS, MEAN_CHARS, UNITS } from '../../lib/estate.generated';

/**
 * WHAT WENT IN AND WHAT CAME OUT, which is the whole stage.
 *
 * `in` is read from `estate.generated.ts` — the same counts the estate page
 * leads with, so the two cannot disagree. `out` is measured, by running the
 * real chunker over the real documents, and is written here because no file in
 * this app produces it yet.
 */
const LEDGER = [
  { source: 'complaints', out: UNITS.complaints, did: 'untouched' },
  { source: 'recalls', out: UNITS.recalls, did: 'untouched' },
  { source: 'investigations', out: 222, did: 'cut' },
] as const;

const IN_TOTAL = UNITS.complaints + UNITS.recalls + UNITS.investigations;
const OUT_TOTAL = LEDGER.reduce((n, r) => n + r.out, 0);

export function ChunkerModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

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
          Inside the chunker — what it did to the {UNITS.investigations} it cut,
          and why it declined the other {(IN_TOTAL - UNITS.investigations).toLocaleString('en-GB')}
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <ChunkerPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function ChunkerPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const [active, setActive] = useState<string | null>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});
  const sticky = useRef<HTMLDivElement>(null);

  /**
   * Press a row of the ledger, and the section arguing about it comes up.
   *
   * The offset is measured rather than a `scroll-mt` guess, for the reason
   * `ParserModal` records: the pinned block's height moves with the font, the
   * zoom and the panel width, and a fixed scroll-margin put each section's own
   * heading behind the thing it scrolled under.
   */
  const go = useCallback((key: string) => {
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
      label="Inside the chunker"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the chunker</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.2 · {IN_TOTAL.toLocaleString('en-GB')} documents in,{' '}
            {OUT_TOTAL.toLocaleString('en-GB')} passages out ·{' '}
            <Mono>docs/safety/CHUNK.md</Mono>
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS THE LEDGER, NOT THE CODE, because this stage's question
          is what it did to the corpus rather than how it is written — and the
          answer is a table where two of the three rows say "nothing". Pinned
          and opaque edge to edge, for the reason the parser panel records. */}
      <div
        ref={sticky}
        className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-3"
      >
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          in, out, and what happened · press a row
        </p>
        <div className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] p-3.5">
          <table className="w-full min-w-[30rem] border-collapse font-mono text-[0.75rem]">
            <thead>
              <tr className="text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
                <th className="pb-2 text-left font-normal">source</th>
                <th className="pb-2 text-right font-normal">in</th>
                <th className="pb-2 text-right font-normal">out</th>
                <th className="pb-2 pl-6 text-left font-normal">what happened</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((r) => {
                const went = UNITS[r.source];
                const lit = active === r.source;
                return (
                  <tr key={r.source} className="border-t border-ui-line/60">
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => go(r.source)}
                        className={`rounded px-1.5 py-0.5 transition-colors ${
                          lit ? 'bg-cal-2/25 text-ui-fg' : 'text-cal-2 hover:bg-cal-2/15'
                        }`}
                      >
                        {r.source}
                      </button>
                    </td>
                    <td className="py-1.5 text-right text-ui-dim">
                      {went.toLocaleString('en-GB')}
                    </td>
                    <td
                      className="py-1.5 text-right"
                      style={{ color: r.did === 'cut' ? 'var(--color-cal-2)' : 'var(--color-ui-dim)' }}
                    >
                      {r.out.toLocaleString('en-GB')}
                    </td>
                    <td
                      className="py-1.5 pl-6"
                      style={{ color: r.did === 'cut' ? 'var(--color-cal-2)' : 'var(--color-ui-faint)' }}
                    >
                      {r.did}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-ui-line">
                <td className="py-1.5 text-ui-faint">total</td>
                <td className="py-1.5 text-right text-ui-fg">
                  {IN_TOTAL.toLocaleString('en-GB')}
                </td>
                <td className="py-1.5 text-right text-ui-fg">
                  {OUT_TOTAL.toLocaleString('en-GB')}
                </td>
                <td className="py-1.5 pl-6 text-ui-faint">
                  +{(OUT_TOTAL - IN_TOTAL).toLocaleString('en-GB')} passages, from{' '}
                  {UNITS.investigations} documents
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pt-2 font-mono text-[0.625rem] text-ui-faint">
          {(((IN_TOTAL - UNITS.investigations) / IN_TOTAL) * 100).toFixed(2)}% of the corpus passes
          through untouched
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <Sect
          k="complaints"
          title="Not cut — and not because they are short"
          refs={sections}
          active={active}
        >
          <P>
            The obvious reason is wrong, and it is worth being precise because I
            implied it on the page before measuring it.
          </P>
          <Data
            path="measured over the real stage 3.1 output"
            note="the 1,200-character default"
            mark={[0]}
            lines={[
              'complaints over the limit:   8,121 of 70,194   (11.6%)',
              'recalls over it:                138 of  3,026',
            ]}
          />
          <P>
            Two measurements of the same thing, and they disagree about which
            impression to leave. The counts above say one document in nine is
            long enough to cut; the lengths below say the typical one is nowhere
            near it. Both are true, and printing only the second is how{' '}
            <Mono>docs/safety/INGESTION.md</Mono> §3.2 came to say recall
            campaigns run to “thousands of characters — chunk them”.
          </P>
          <Data
            path="two rulers, and the chunker only sees one of them"
            note="pnpm safety:estate · docs/safety/CHUNK.md"
            mark={[3, 8]}
            lines={[
              'WHAT THE SOURCE FIELD HOLDS        mean     longest     (before stage 3.1)',
              ...(['complaints', 'recalls', 'investigations'] as const).map(
                (k) =>
                  `  ${k.padEnd(30)}${MEAN_CHARS[k].toLocaleString('en-GB').padStart(5)}  ${MAX_CHARS[k].toLocaleString('en-GB').padStart(10)}`,
              ),
              ' ',
              'WHAT THE CHUNKER SEES              mean     longest     (the document text)',
              '  complaints                        662       2,207',
              '  recalls                           877       1,809',
              '  investigations                  2,701       6,046',
            ]}
          />
          <Aside>
            <span className="text-ui-fg">
              The gap between the two tables is stage 3.1's header.
            </span>{' '}
            <Mono>2020 FORD F-150 | POWER TRAIN | filed 2020-09-08</Mono> is
            about 66 characters on a complaint, and the{' '}
            <Mono>DEFECT:</Mono> / <Mono>CONSEQUENCE:</Mono> /{' '}
            <Mono>REMEDY:</Mono> labels are about 180 on a recall. Reasoning
            about a chunk budget from the upper table is off by exactly the thing
            the parser added to make retrieval work — so the lower one is the
            ruler that applies here, and the upper one is what the file holds.
          </Aside>
          <Aside>
            One number in the upper table is worth its own line.{' '}
            <Mono>{MAX_CHARS.complaints.toLocaleString('en-GB')}</Mono> is
            exactly <Mono>CHAR(2048)</Mono>, the size NHTSA declares for{' '}
            <Mono>CDESCR</Mono> in its own dictionary. A field that stops
            precisely where it says it will is the dictionary being honest — the
            opposite of the trap this corpus is full of, and worth saying because
            an earlier draft of these pages had it down as a defect.
          </Aside>
          <P>
            <span className="text-ui-fg">One complaint in nine is long enough to cut.</span>{' '}
            We decline anyway, and the real reason is better than the length: a
            complaint is one person's account of one incident, and cutting it
            splits the symptom from the circumstance.
          </P>
          <Data
            path="what a 400-character cut would do to ODI 11353867"
            lines={[
              'piece 1   "THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START.',
              '           ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR…"',
              '',
              'piece 2   "…DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE,',
              '           DISPLAY SHOWS REVERSE BUT THE…"',
            ]}
            mark={[3, 4]}
          />
          <Aside>
            Piece 2 has lost the word <span className="text-ui-fg">PARK</span>. A
            question about “will not go into park” now half-matches a fragment
            that no longer contains it — and a citation reading “piece 2 of
            complaint 11353867” is not a thing a person can look up. An ODI
            number is. The rule: a passage should be the smallest unit that still
            makes sense alone, and for a complaint that is the whole complaint,
            however long it runs.
          </Aside>
        </Sect>

        <Sect k="recalls" title="The same argument, for a campaign" refs={sections} active={active}>
          <P>
            138 of {UNITS.recalls.toLocaleString('en-GB')} campaigns run past the
            limit and none of them is cut, for the reason a complaint is not:{' '}
            <Mono>20V437000</Mono> is what a person quotes, files a claim about
            and looks up. “Piece 2 of campaign 20V437000” is not a citation
            anybody can act on.
          </P>
          <Aside>
            The three prose blocks a manufacturer files — the defect, what it
            could do, what the dealer will fit — are also the three things a
            reader wants together. A cut between them would separate a fault
            from its remedy, which is the one pairing this whole engagement is
            about.
          </Aside>
        </Sect>

        <Sect
          k="investigations"
          title="The 114 it does cut — and it surprised us"
          refs={sections}
          active={active}
        >
          <Data
            path="AQ25002 — a Tesla ADAS investigation, 3,318 characters"
            mark={[3]}
            lines={[
              'BEFORE   one document, 3,318 chars',
              '',
              'AFTER    piece 1     257 chars',
              '         piece 2   3,060 chars   ← still 2.5x the 1,200 limit',
            ]}
          />
          <P>
            Not three equal pieces.{' '}
            <span className="text-ui-fg">The chunker is structure-aware</span>: it
            splits on headings and line breaks first and only then on size,
            because cutting mid-sentence to hit a character budget is how you get
            a passage that says nothing.
          </P>
          <P>
            NHTSA investigation summaries are one unbroken block of prose. There
            is no structure to cut on, so the chunker leaves the block whole
            rather than slicing it arbitrarily — {UNITS.investigations} documents
            become {LEDGER[2].out}, not the ~340 a character count predicts.
          </P>
          <Aside>
            That is the chunker being right, not failing. A library that always
            hit its budget would be one that always cut mid-sentence — and the
            passage it produced would be the shape the budget wanted rather than
            the shape the meaning has.
          </Aside>
        </Sect>

        <Sect k="code" title="The code, and what is not in it" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/grounding/chunk.ts"
            mark={[4]}
            lines={[
              "import { chunkDocument } from '@fde/grounding';",
              '',
              'export function toPassages(docs: SafetyDoc[]): Passage[] {',
              '  return docs.flatMap((doc) =>',
              "    doc.kind === 'investigation'",
              '      ? chunkDocument({ sourcePath: doc.id, text: doc.text })',
              '          .map((c, i) => ({ ...c, id: `${doc.id}#${i}`, meta: doc.meta }))',
              '      : [{ id: doc.id, text: doc.text, startLine: 1, meta: doc.meta }],',
              '  );',
              '}',
            ]}
          />
          <Aside>
            <span className="text-ui-fg">Nothing new is written.</span>{' '}
            <Mono>chunkDocument</Mono> is <Mono>@fde/grounding</Mono>'s, used by
            two other engagements unchanged. The claim{' '}
            <Mono>docs/TEMPLATE.md</Mono> makes — that the shared packages
            transfer to a customer nobody wrote the corpus for — is tested here
            for the first time, and at this stage it passes quietly: the fourth
            engagement reached 3.2 without needing a line of new shared code.
          </Aside>
          <P>
            The <Mono>#0</Mono>, <Mono>#1</Mono> suffix only ever appears on
            investigations. A complaint's passage id{' '}
            <em>is</em> its ODI number, so a citation points at the filing rather
            than at our slicing of it.
          </P>
        </Sect>

        <Sect k="leverage" title="Where the leverage actually is" refs={sections} active={active}>
          <P>
            <Mono>docs/RETRIEVAL.md</Mono> calls the chunker “the
            highest-leverage file in the path”, and on a corpus of long documents
            it is — where you cut decides what can be found. Here it touches{' '}
            {UNITS.investigations} documents out of{' '}
            {IN_TOTAL.toLocaleString('en-GB')}.
          </P>
          <Aside>
            So the leverage moved <em>upstream</em>, to stage 3.1. The line that
            decides whether a question about a 2020 F-150 finds the right
            complaint is the header the <span className="text-ui-fg">parser</span>{' '}
            prepends — the narrative never says “F-150”. On this corpus the
            parser is the highest-leverage file, and a pipeline tuned by
            adjusting chunk sizes would be tuning the one stage with almost
            nothing to do.
          </Aside>
        </Sect>

        <Sect k="checks" title="The checks" refs={sections} active={active}>
          <Data
            path="what stage 3.2 asserts"
            mark={[1]}
            lines={[
              'ok  every complaint id is still an ODI number, citable on its own',
              'ok  ODI 11353867 survived as exactly one passage (REC-001)',
              'ok  no passage is empty, and none lost its metadata',
            ]}
          />
          <P>
            The marked one is the tie back to the answer key. REC-001 asks
            whether the F-150 park problem is fixed, and the passage that must
            answer it is a single filing — if this stage had cut it, the eval
            would be grading a fragment against an answer written for a whole
            complaint, and nothing would have errored.
          </P>
        </Sect>
      </div>
    </OriginDialog>
  );
}

/** One section, marked when its ledger row is the one you pressed. */
function Sect({
  k,
  title,
  refs,
  active,
  children,
}: {
  k: string;
  title: string;
  refs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  active: string | null;
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
          lit ? 'text-cal-2' : 'text-ui-fg'
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
