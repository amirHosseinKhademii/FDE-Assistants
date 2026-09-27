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
 * ── IT HAS RUN, AND THE CODE IS NOW THE REAL CODE ──────────────────────────
 *
 * Every figure here came from running `@fde/grounding`'s chunker over the real
 * output of 3.1, and `pnpm safety:chunk` has since run for real and written
 * `passages.json`. This header used to say `toPassages` was "not written" and
 * the code block quoted CHUNK.md's draft — `chunkDocument`, and a `#i` suffix
 * on every investigation. The file that exists,
 * `apps/ai/safety/src/grounding/chunk.ts`, differs on both counts, and the
 * block now quotes it:
 *
 *   - it calls `chunkAll`, the package's public export. `chunkDocument` is not
 *     exported from `@fde/grounding`'s index, and reaching past it would be
 *     this engagement quietly widening another package's surface;
 *   - `passageId` adds the suffix only when a document produced MORE THAN ONE
 *     passage, which is why 6 of the 114 keep their own id — the draft code
 *     contradicted the panel's own prose about them.
 *
 * The check names are `cli/chunk.ts`'s, and the ledger, the 108 and the 6 were
 * re-counted from `passages.json` on 2026-09-27.
 *
 * Source: `docs/safety/CHUNK.md`.
 */
import { useCallback, useRef, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { MAX_CHARS, MEAN_CHARS, UNITS } from '../../lib/estate.generated';
import { HoodButton } from './Hood';
import { Because } from './kit';

/**
 * WHAT WENT IN AND WHAT CAME OUT, which is the whole stage.
 *
 * `in` is read from `estate.generated.ts` — the same counts the estate page
 * leads with, so the two cannot disagree. `out` is what `pnpm safety:chunk`
 * wrote to `passages.json`, typed here because no file in this app carries it.
 */
const LEDGER = [
  { source: 'complaints', out: UNITS.complaints, did: 'untouched' },
  { source: 'recalls', out: UNITS.recalls, did: 'untouched' },
  { source: 'investigations', out: 222, did: 'cut' },
] as const;

/**
 * How many investigations were actually CUT, which is not how many went in.
 *
 * All 114 pass through the chunker; 6 produce a single chunk and keep their own
 * id. So "114 → 222" counts passages produced and "108 split" counts documents
 * affected, and they are different questions with different answers — the same
 * shape as rows against records one stage earlier. `cli/chunk.ts` prints the
 * 108 as `report.split`.
 */
const SPLIT = 108;

const IN_TOTAL = UNITS.complaints + UNITS.recalls + UNITS.investigations;
const OUT_TOTAL = LEDGER.reduce((a, r) => a + r.out, 0);
const n = (x: number) => x.toLocaleString('en-GB');

export function ChunkerModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  return (
    <>
      <HoodButton
        blurb={`Inside the chunker: what it did to the ${UNITS.investigations} documents it cut, and why it left the other ${n(IN_TOTAL - UNITS.investigations)} whole`}
        onClick={open}
      />
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
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the chunker</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.2 · {n(IN_TOTAL)} documents in, {n(OUT_TOTAL)} passages out
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
        <p className="cal-label pb-2" data-tone="quiet">
          In, out, and what happened — press a source to read about it
        </p>
        <div className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] px-3.5 py-3">
          <table className="w-full min-w-[30rem] border-collapse text-[0.875rem]">
            <thead>
              <tr className="text-[0.8125rem] text-ui-faint">
                <th className="pb-2 text-left font-semibold">Source</th>
                <th className="pb-2 text-right font-semibold">In</th>
                <th className="pb-2 text-right font-semibold">Out</th>
                <th className="pb-2 pl-6 text-left font-semibold">What happened</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((r) => {
                const went = UNITS[r.source];
                const lit = active === r.source;
                const cut = r.did === 'cut';
                return (
                  <tr key={r.source} className="border-t border-ui-line/60">
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => go(r.source)}
                        className={`-ml-1.5 rounded px-1.5 py-0.5 font-semibold transition-colors ${
                          lit ? 'bg-cal-sky/25 text-ui-fg' : 'text-cal-sky hover:bg-cal-sky/15'
                        }`}
                      >
                        {r.source[0].toUpperCase() + r.source.slice(1)}
                      </button>
                    </td>
                    <td className="py-1.5 text-right font-mono text-ui-dim">{n(went)}</td>
                    <td className={`py-1.5 text-right font-mono ${cut ? 'text-ui-fg' : 'text-ui-dim'}`}>
                      {n(r.out)}
                    </td>
                    <td className={`py-1.5 pl-6 ${cut ? 'font-semibold text-ui-fg' : 'text-ui-faint'}`}>
                      {cut ? 'Cut' : 'Untouched'}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-ui-line">
                <td className="py-1.5 text-ui-faint">Total</td>
                <td className="py-1.5 text-right font-mono text-ui-fg">{n(IN_TOTAL)}</td>
                <td className="py-1.5 text-right font-mono text-ui-fg">{n(OUT_TOTAL)}</td>
                <td className="py-1.5 pl-6 text-ui-faint">
                  +{n(OUT_TOTAL - IN_TOTAL)} passages, from {UNITS.investigations} documents
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pt-2 text-[0.8125rem] text-ui-faint">
          {(((IN_TOTAL - UNITS.investigations) / IN_TOTAL) * 100).toFixed(2)}% of the corpus is
          never handed to the chunker at all.
        </p>
      </div>

      <div className="grid gap-9 pb-2">
        <div className="grid gap-4">
          <p className="cal-hood-text">
            Search hands back pieces, not whole files. A 40-page manual has to be
            cut up, or a question about one paragraph drags in the other
            thirty-nine pages — so a chunker's job is to decide{' '}
            <span className="text-ui-fg">where to cut</span>.
          </p>
          <p className="cal-hood-text">
            On this corpus its real job is deciding{' '}
            <span className="text-ui-fg">where not to</span>. Every complaint and
            every recall stays exactly as it is; only the {UNITS.investigations}{' '}
            long investigation reports are cut into pieces. Press a source in the
            table above to read why.
          </p>
        </div>

        <Sect
          k="complaints"
          title="Not cut — and not because they are short"
          refs={sections}
          active={active}
        >
          <p className="cal-hood-text">
            The obvious reason is wrong, and it is worth being precise because an
            earlier version of this page implied it before measuring it.
          </p>
          <Data
            path="documents.json — the real stage 3.1 output"
            note="Against the chunker's 1,200-character default"
            mark={[0]}
            lines={[
              'complaints over the limit:   8,121 of 70,194   (11.6%)',
              'recalls over it:                138 of  3,026',
            ]}
          />
          <p className="cal-hood-text">
            Two measurements of the same thing, and they disagree about which
            impression to leave. The counts above say one document in nine is long
            enough to cut; the lengths below say the typical one is nowhere near
            it. Both are true, and printing only the second is how the plan came
            to say recall campaigns run to thousands of characters and should be
            cut up.
          </p>
          <Data
            path="Two rulers, and the chunker only sees one of them"
            note="pnpm safety:estate · docs/safety/CHUNK.md"
            mark={[1, 6]}
            lines={[
              'WHAT THE SOURCE FIELD HOLDS        mean     longest     (before stage 3.1)',
              ...(['complaints', 'recalls', 'investigations'] as const).map(
                (k) =>
                  `  ${k.padEnd(30)}${n(MEAN_CHARS[k]).padStart(5)}  ${n(MAX_CHARS[k]).padStart(10)}`,
              ),
              ' ',
              'WHAT THE CHUNKER SEES              mean     longest     (the document text)',
              '  complaints                        662       2,207',
              '  recalls                           877       1,809',
              '  investigations                  2,701       6,046',
            ]}
          />
          <Because>
            <span className="text-ui-fg">
              The gap between the two tables is the line stage 3.1 adds to the top
              of every document.
            </span>{' '}
            <code>2020 FORD F-150 | POWER TRAIN | filed 2020-09-08</code> is about
            66 characters on a complaint, and the <code>DEFECT:</code> /{' '}
            <code>CONSEQUENCE:</code> / <code>REMEDY:</code> labels add about 180
            to a recall. Reasoning about a chunk budget from the upper table is off
            by exactly the thing the parser added to make search work — so the
            lower one is the ruler that applies here, and the upper one is what
            the file holds.
          </Because>
          <Because>
            One number in the upper table is worth its own line.{' '}
            <code>{n(MAX_CHARS.complaints)}</code> is exactly{' '}
            <code>CHAR(2048)</code>, the size NHTSA declares for the complaint text
            in its own dictionary. A field that stops precisely where it says it
            will is the dictionary being honest — worth saying because an earlier
            draft of these pages had it down as a defect.
          </Because>
          <p className="cal-hood-text">
            <span className="text-ui-fg">One complaint in nine is long enough to cut.</span>{' '}
            We decline anyway, and the real reason is better than the length: a
            complaint is one person's account of one incident, and cutting it
            splits the symptom from the circumstance.
          </p>
          <Data
            path="What a 400-character cut would do to ODI 11353867"
            lines={[
              'piece 1   "THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START.',
              '           ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR…"',
              '',
              'piece 2   "…DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE,',
              '           DISPLAY SHOWS REVERSE BUT THE…"',
            ]}
            mark={[3, 4]}
          />
          <Because>
            Piece 2 has lost the word <span className="text-ui-fg">PARK</span>. A
            question about “will not go into park” now half-matches a fragment that
            no longer contains it — and a citation reading “piece 2 of complaint
            11353867” is not a thing a person can look up. An ODI number is. The
            rule: a passage should be the smallest unit that still makes sense
            alone, and for a complaint that is the whole complaint, however long it
            runs.
          </Because>
        </Sect>

        <Sect k="recalls" title="The same argument, for a campaign" refs={sections} active={active}>
          <p className="cal-hood-text">
            138 of {n(UNITS.recalls)} campaigns run past the limit and none of them
            is cut, for the reason a complaint is not: <code>20V437000</code> is
            what a person quotes, files a claim about and looks up. “Piece 2 of
            campaign 20V437000” is not a citation anybody can act on.
          </p>
          <Because>
            The three blocks of prose a manufacturer files — the defect, what it
            could do, what the dealer will fit — are also the three things a reader
            wants together. A cut between them would separate a fault from its
            remedy, which is the one pairing this whole engagement is about.
          </Because>
        </Sect>

        <Sect
          k="investigations"
          title="The 114 it does cut, and how it cuts them"
          refs={sections}
          active={active}
        >
          <Data
            path="passages.json — AQ25002, a Tesla driver-assistance investigation"
            mark={[3]}
            lines={[
              'BEFORE   one document, 3,318 chars',
              '',
              'AFTER    AQ25002#0     257 chars',
              '         AQ25002#1   3,060 chars   ← still 2.5x the 1,200 limit',
            ]}
          />
          <p className="cal-hood-text">
            Not three equal pieces.{' '}
            <span className="text-ui-fg">The chunker looks for structure first</span>
            : it splits on headings and line breaks, and only then on size, because
            cutting mid-sentence to hit a character budget is how you get a
            passage that says nothing.
          </p>
          <p className="cal-hood-text">
            NHTSA's investigation summaries are one unbroken block of prose. There
            is no structure to cut on, so the chunker leaves the block whole rather
            than slicing it arbitrarily — {UNITS.investigations} documents become{' '}
            {LEDGER[2].out}, not the ~340 a character count predicts.
          </p>
          <Because>
            And <span className="text-ui-fg">{SPLIT} of the {UNITS.investigations}</span>{' '}
            were actually split. All {UNITS.investigations} went through the
            chunker; {UNITS.investigations - SPLIT} came out as a single piece and
            kept their own id with no <code>#</code> suffix. “{UNITS.investigations}{' '}
            → {LEDGER[2].out}” and “{SPLIT} split” are both true and count
            different things — the first is passages produced, the second is
            documents affected, the same distinction as rows against records one
            stage earlier.
          </Because>
          <Because>
            That is the chunker being right, not failing. A library that always hit
            its budget would be one that always cut mid-sentence — and the passage
            it produced would be the shape the budget wanted rather than the shape
            the meaning has.
          </Because>
        </Sect>

        <Sect k="code" title="The code, and what is not in it" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/grounding/chunk.ts"
            note="Three excerpts · comments trimmed"
            mark={[3, 7]}
            lines={[
              "import { chunkAll, sha, type Document } from '@fde/grounding';",
              '',
              'function needsChunking(doc: SafetyDoc): boolean {',
              "  return doc.kind === 'investigation';",
              '}',
              '',
              'function passageId(doc: SafetyDoc, index: number, total: number): string {',
              '  return total > 1 ? `${doc.id}#${index}` : doc.id;',
              '}',
            ]}
          />
          <p className="cal-hood-text">
            <code>toPassages</code> walks every document once. Anything{' '}
            <code>needsChunking</code> says no to — every complaint and recall — is
            copied straight through as one passage whose id is the document's own.
            The {UNITS.investigations} investigations are handed to{' '}
            <code>chunkAll</code> together, and the pieces are grouped back by the
            document they came from, so that <code>passageId</code> can tell a
            genuinely split report from one that came out whole.
          </p>
          <Because>
            <span className="text-ui-fg">Nothing new is written.</span>{' '}
            <code>chunkAll</code> is the shared package's public function, used by
            two other engagements unchanged. The claim that shared code transfers
            to a customer nobody wrote the corpus for is tested here for the first
            time, and at this stage it passes quietly: the fourth engagement reached
            3.2 without a line of new shared code.
          </Because>
          <p className="cal-hood-text">
            The <code>#0</code>, <code>#1</code> suffix only ever appears on
            investigations that were split. A complaint's passage id <em>is</em>{' '}
            its ODI number, so a citation points at the filing rather than at our
            slicing of it.
          </p>
        </Sect>

        <Sect k="leverage" title="Where the leverage actually is" refs={sections} active={active}>
          <p className="cal-hood-text">
            Where you cut normally decides what can be found, which is why chunking
            is usually the highest-leverage step in the whole pipeline. Here it
            touches {UNITS.investigations} documents out of {n(IN_TOTAL)}.
          </p>
          <Because>
            So the leverage moved <em>upstream</em>, to stage 3.1. The line that
            decides whether a question about a 2020 F-150 finds the right complaint
            is the one the <span className="text-ui-fg">parser</span> puts on top —
            the account itself never says “F-150”. On this corpus the parser is the
            highest-leverage file, and a pipeline tuned by adjusting chunk sizes
            would be tuning the one stage with almost nothing to do.
          </Because>
        </Sect>

        <Sect k="checks" title="The checks" refs={sections} active={active}>
          <Data
            path="pnpm safety:chunk — the three checks"
            note="Names from cli/chunk.ts · details re-counted from passages.json"
            mark={[2, 3]}
            lines={[
              'ok    only investigations were split — every complaint id is still an ODI number',
              '      kinds carrying a #suffix: investigation',
              'ok    ODI 11353867 survived as exactly one passage (REC-001)',
              '      id 11353867, 615 chars, unsplit',
              'ok    no passage is empty and none lost its metadata',
              `      0 empty, 0 without meta, of ${n(OUT_TOTAL)}`,
            ]}
          />
          <p className="cal-hood-text">
            The marked one is the tie back to the answer key. REC-001 asks whether
            the F-150 park problem is fixed, and the passage that must answer it is
            a single filing — if this stage had cut it, the eval would be grading a
            fragment against an answer written for a whole complaint, and nothing
            would have errored.
          </p>
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
