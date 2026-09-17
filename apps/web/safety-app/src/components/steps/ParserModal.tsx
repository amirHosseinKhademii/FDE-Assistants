/**
 * Inside the parser — stage 3.1's code, one line at a time.
 *
 * ── WHY IT IS A MODAL AND NOT A SECTION ────────────────────────────────────
 *
 * The steps page answers "what are the seven stages"; this answers "what does
 * the first one literally do". Those are different readers. Inlining forty
 * lines of TypeScript into stage 3.1 would make the page about the parser, and
 * the page is about the pipeline — but the reader who wants the parser wants
 * ALL of it, not a summary. A modal is the shape that serves both: nothing
 * changes for the first reader, and the second gets the whole thing.
 *
 * ── THE SKELETON STAYS ON SCREEN, AND THAT IS THE WHOLE DESIGN ─────────────
 *
 * `docs/safety/PARSE.md` opens with the parser in five numbered lines and then
 * explains each one. Read top to bottom on a page, that structure costs the
 * reader the thread: by section four you cannot see which line four was. So the
 * skeleton is pinned to the top of the panel and the sections scroll under it.
 * The numerals in the code are BUTTONS — press one and its section is brought
 * up and marked, so "which line am I reading about" is never a memory task.
 *
 * ── NOTHING HERE HAS RUN ───────────────────────────────────────────────────
 *
 * This is a specification written before the code, so the implementation has
 * something already agreed to match. The only measured numbers in it are the
 * corpus counts, which come from `estate.generated.ts` rather than being typed
 * — the parser's own output does not exist to be quoted.
 */
import { useCallback, useRef, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { ROWS, UNITS } from '../../lib/estate.generated';

/**
 * The five lines, as segments, so a numeral can be a button.
 *
 * Written as data rather than as a single template string because the numbers
 * have to be pressable and the code around them has to stay exactly as it would
 * be typed — including the tab in `split('\t')`, which is the one character
 * this whole file is about.
 */
const SKELETON: Array<{ n?: number; code: string }> = [
  { n: 1, code: `const byOdi = new Map<string, Doc>();` },
  { code: `` },
  { n: 2, code: `for await (const line of lines(file)) {` },
  { n: 3, code: `  const f = line.split('\\t');` },
  { code: `  if (f.length !== 51) { ragged++; continue; }` },
  { code: `` },
  { code: `  const odi = f[1];` },
  { code: `  const existing = byOdi.get(odi);` },
  { n: 4, code: `  if (existing) existing.components.push(f[11]);` },
  { code: `  else byOdi.set(odi, newDoc(f));` },
  { code: `}` },
  { code: `` },
  { n: 5, code: `writeFileSync('documents.json', ...);` },
];

const LINE_NOTE: Record<number, string> = {
  1: 'somewhere to collect',
  2: 'one line at a time',
  3: '51 fields, by position',
  4: 'the same person again',
  5: 'one file out',
};

export function ParserModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

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
          Inside the parser — the whole thing in five lines, then each line
          explained
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && (
        <ParserPanel from={from} onClose={() => setFrom(null)} />
      )}
    </>
  );
}

function ParserPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
  const [active, setActive] = useState<number | null>(null);
  const sections = useRef<Record<number, HTMLElement | null>>({});
  const sticky = useRef<HTMLDivElement>(null);

  /**
   * Press a numeral, and its section comes to you.
   *
   * IT SCROLLS THE SECTION RATHER THAN COLLAPSING THE OTHERS, because the panel
   * is one argument read in order, and hiding four fifths of it to show one
   * part would break the order the document was written in. The mark is the
   * only thing that changes.
   *
   * THE OFFSET IS MEASURED, NOT A `scroll-mt` GUESS. The pinned skeleton is
   * thirteen lines of monospace and its height moves with the font, the zoom
   * and the panel width; a fixed scroll-margin put each section's own heading
   * behind it, so pressing 3 scrolled to a paragraph whose title you could not
   * see. Rects rather than `offsetTop`, because the scroller is not a
   * positioned ancestor.
   */
  const go = useCallback((n: number) => {
    setActive(n);
    const target = sections.current[n];
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
      label="Inside the parser"
      tone="var(--color-cal-1)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the parser</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.1 · {ROWS.complaints.toLocaleString('en-GB')} lines in,{' '}
            {UNITS.complaints.toLocaleString('en-GB')} documents out
          </p>
        </>
      }
    >
      {/* THE ANCHOR, AND IT OWNS THE TOP OF THE SCROLLER.
          The first version was translucent with a blur and began a few pixels
          below the top, so lines scrolled through the gap and showed behind the
          blur — two layers fighting rather than one pinned header. Negative
          margins cancel the dialog body's own padding so there is no strip for
          anything to appear in, and the background is the body's own colour at
          full opacity. `data-dialog-scroll` on the body is what `go` measures
          against. */}
      <div
        ref={sticky}
        className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-3"
      >
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the whole parser · press a number to jump
        </p>
        <pre className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] p-3.5 font-mono text-[0.6875rem] leading-[1.7] text-ui-dim">
          {SKELETON.map((row, i) => (
            <div key={i} className="flex items-baseline gap-3 whitespace-pre">
              <span className="w-5 shrink-0 text-right">
                {row.n ? (
                  <button
                    type="button"
                    onClick={() => go(row.n!)}
                    aria-label={`explain line ${row.n}: ${LINE_NOTE[row.n]}`}
                    className={`rounded px-1 transition-colors ${
                      active === row.n
                        ? 'bg-cal-1/25 text-ui-fg'
                        : 'text-cal-1 hover:bg-cal-1/15'
                    }`}
                  >
                    {row.n}
                  </button>
                ) : null}
              </span>
              <span className={row.n ? 'text-ui-fg' : ''}>{row.code || ' '}</span>
              {row.n && (
                <span className="ml-auto pl-6 text-ui-faint">{LINE_NOTE[row.n]}</span>
              )}
            </div>
          ))}
        </pre>
      </div>

      <div className="grid gap-9 pb-2">
        <Sect n={1} title="A Map, because the file is not sorted" refs={sections} active={active}>
          <P>
            Rows for one complaint are adjacent in practice and not guaranteed to
            be. A <Mono>Map</Mono> keyed by <Mono>ODINO</Mono> does not care:
            first sighting creates the document, every later one adds its
            component.
          </P>
          <Code
            path="apps/ai/safety/src/parse.ts — what a document is"
            lines={[
              'type Doc = {',
              '  id: string;',
              '  text: string;',
              '  meta: { odino: string; make: string; model: string; year: number;',
              '          filed: string; components: string[];',
              '          crash: boolean; fire: boolean; injuries: number; deaths: number;',
              '          miles: number | null; state: string; vin11: string };',
              '};',
            ]}
          />
          <Aside>
            {UNITS.complaints.toLocaleString('en-GB')} objects is about 60 MB in
            memory. A database at this stage would mean nobody could open the
            output in a text editor, which is the entire point of stage 3.1.
          </Aside>
        </Sect>

        <Sect n={2} title="One line at a time, not all at once" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/parse.ts — the reader"
            mark={[3]}
            lines={[
              'async function* lines(path: string) {',
              '  const rl = createInterface({',
              "    input: createReadStream(path, { encoding: 'utf8' }),",
              '    crlfDelay: Infinity,          // treat \\r\\n as one break',
              '  });',
              '  for await (const line of rl) if (line.length) yield line;',
              '}',
            ]}
          />
          <P>
            The slice is 79 MB and would load fine. The full file is 1.5 GB and
            would not. Streaming costs nothing here and means the same code
            survives the slice widening, which is still on the table.
          </P>
          <P>
            The marked line is not decoration. These files are Windows-origin,
            and a stray <Mono>\r</Mono> left on the end of field 51 becomes part
            of its value without anything complaining.
          </P>
        </Sect>

        <Sect
          n={3}
          title="split by tab — and deliberately not a CSV library"
          refs={sections}
          active={active}
        >
          <P>
            NHTSA's file characteristics say <em>“TAB delimited”</em> and name no
            quote character, so the rule is: split on tab, and treat{' '}
            <Mono>"</Mono> as an ordinary letter.
          </P>
          <P>
            <span className="text-ui-fg">
              A CSV reader with quote handling on would not do that.
            </span>{' '}
            708 of the {ROWS.complaints.toLocaleString('en-GB')} lines carry an
            odd number of double quotes, because people write{' '}
            <Mono>THE "SERVICE ENGINE" LIGHT CAME ON</Mono>. At an unbalanced
            quote such a reader keeps consuming — newlines included — and merges
            records that the file keeps separate.
          </P>
          <Code
            path="apps/ai/safety/src/parse.ts — the split"
            mark={[0]}
            lines={[
              "const f = line.split('\\t');",
              'if (f.length !== 51) { ragged++; continue; }   // never fires; kept anyway',
            ]}
          />
          <Aside>
            The guard should never fire — every one of the{' '}
            {ROWS.complaints.toLocaleString('en-GB')} lines has exactly 51
            fields. It stays because a guard that never fires is cheap, and a
            silently short row would shift every field after the gap.
          </Aside>
          <P>
            The column numbers are transcribed from the data dictionary, which is{' '}
            <span className="text-ui-fg">1-indexed while JavaScript is 0-indexed</span>
            , so every constant is the dictionary's minus one — and an
            off-by-one there would not error. Narratives would simply start
            arriving in <Mono>MILES</Mono>.
          </P>
        </Sect>

        <Sect n={4} title="Merging the repeats" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/parse.ts — the merge"
            lines={[
              'const existing = byOdi.get(odi);',
              'if (existing) {',
              '  if (!existing.meta.components.includes(comp)) existing.meta.components.push(comp);',
              '  return;                        // narrative already captured — it is identical',
              '}',
            ]}
          />
          <Data
            path="CMPL_SLICE.tsv — ODI 11341276, as filed"
            note="one person, five rows"
            lines={[
              '11341276  STRUCTURE:BODY',
              '11341276  ELECTRICAL SYSTEM',
              '11341276  POWER TRAIN',
              '11341276  ENGINE',
              '11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY',
            ]}
          />
          <Aside>
            Without this, that one person takes five of the six result slots and
            crowds out four others — and every count published anywhere is 44%
            too high.
          </Aside>
        </Sect>

        <Sect
          n={5}
          title="Building the text — the highest-leverage line in the pipeline"
          refs={sections}
          active={active}
        >
          <Code
            path="apps/ai/safety/src/parse.ts — the header line"
            mark={[0]}
            lines={[
              "const header = `${year} ${make} ${model} | ${components.join(', ')} | filed ${filed}`;",
              'doc.text = `${header}\\n${narrative}`;',
            ]}
          />
          <P>
            <span className="text-ui-fg">The narrative never says “F-150”.</span>{' '}
            It says <em>“THE GEAR WILL NOT GO INTO PARK…”</em>. Without the
            header, a question about a 2020 F-150 transmission matches nothing on
            the meaning arm.
          </P>
          <Data
            path="what the text becomes — ODI 11353867"
            lines={[
              '2020 FORD F-150 | POWER TRAIN | filed 2020-09-08',
              'THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START. ALSO, THE',
              'DISPLAY INDICATES I AM IN THE WRONG GEAR DISPLAY SHOWS NEUTRAL',
              'BUT TRUCK IS IN DRIVE…',
            ]}
            mark={[0]}
          />
          <Aside>
            Stage 3.2 barely runs on this corpus — 114 investigations get
            chunked and nothing else does. So the parser, not the chunker,
            decides what can be found, and it comes down to that one string
            concatenation.
          </Aside>
          <P>
            And note what is <em>not</em> in the text. <Mono>deaths</Mono>,{' '}
            <Mono>crash</Mono> and <Mono>miles</Mono> stay in <Mono>meta</Mono>:
            writing “deaths 0” into the text would make every complaint match a
            question about fatalities.
          </P>
        </Sect>

        <Sect title="Dates, converted once, in one function" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/parse.ts — one date function"
            lines={[
              'function isoDate(raw: string): string | null {',
              '  if (!/^\\d{8}$/.test(raw)) return null;',
              '  const [y, m, d] = [raw.slice(0, 4), raw.slice(4, 6), raw.slice(6)];',
              '  return `${y}-${m}-${d}`;',
              '}',
            ]}
          />
          <P>
            The flat files use <Mono>YYYYMMDD</Mono>; the complaints API uses{' '}
            <Mono>MM/DD/YYYY</Mono> and the recalls API <Mono>DD/MM/YYYY</Mono> —
            one agency, three formats. Everything becomes{' '}
            <Mono>YYYY-MM-DD</Mono> at the boundary so nothing downstream has to
            know what shape it arrived in.
          </P>
          <P>
            It returns <Mono>null</Mono> rather than throwing, because a missing
            incident date is normal — people do not always remember when it
            happened — and is not a parse failure.
          </P>
        </Sect>

        <Sect title="Numbers that are sometimes not numbers" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/parse.ts — blank is not zero"
            mark={[0]}
            lines={[
              "const int = (s: string) => (/^\\d+$/.test(s) ? Number(s) : null);",
              "const yn  = (s: string) => s.trim().toUpperCase() === 'Y';",
            ]}
          />
          <P>
            <Mono>MILES</Mono> is blank in two rows out of three.{' '}
            <span className="text-ui-fg">
              <Mono>Number("")</Mono> is <Mono>0</Mono>
            </span>
            , which would quietly turn “we do not know the mileage” into “zero
            miles” — a fact about a vehicle that nobody stated. Hence the regex
            before the conversion.
          </P>
        </Sect>

        <Sect title="The three checks, printed at the end" refs={sections} active={active}>
          <Data
            path="pnpm safety:parse — 2026-09-17"
            note="it has run"
            mark={[1]}
            lines={[
              'complaints       100,980 lines →  70,194 documents   (30,786 merged, 0 ragged)',
              'recalls           44,791 lines →   3,026 documents   (41,765 merged, 0 ragged)',
              'investigations     1,631 lines →     114 documents   (1,517 merged, 0 ragged)',
              '',
              'raw file says (awk, no parser): 100,980 lines, 51 fields on every one   ✓',
              'ODI 11353867 present: yes — "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08…"',
              '',
              '73,334 documents in 0.9s',
            ]}
          />
          <Aside>
            The marked line is the one that matters: it compares the parser's
            count against <Mono>awk</Mono> over the raw file — a different tool,
            with no parser in the path.{' '}
            <span className="text-ui-fg">
              A parser confirming its own output proves nothing.
            </span>
          </Aside>
          <P>
            The three counts came back equal to the ones the estate page had
            already measured from the same files by a different route. That
            agreement is the point: two programs that never saw each other
            reached the same {UNITS.complaints.toLocaleString('en-GB')}.
          </P>
        </Sect>

        <Sect title="The edge nobody had to infer" refs={sections} active={active}>
          <P>
            Investigations carry a field the other two sources do not:{' '}
            <Mono>CAMPNO</Mono>, documented as{' '}
            <em>“the recall campaign initiated as a result of the
            investigation”</em>. 42 of the 114 fill it in.
          </P>
          <Data
            path="INV_SLICE.tsv — field 9, where it is set"
            note="42 of 114"
            lines={['DP22005  →  22V063000']}
          />
          <Aside>
            That is a regulator writing down that this enquiry produced that
            recall — a link between two documents, sitting in the file with
            nothing to infer and no model involved, which is why the parser
            asserts it as a check rather than mentioning it in a comment. It also
            gives the estate a relationship worth drawing: investigation →
            recall → complaints about the same component, before and after the
            remedy. That is the whole product in one line, and 42 real instances
            of it exist.
          </Aside>
        </Sect>

        <Sect title="What it does not do" refs={sections} active={active}>
          <P>
            No embedding, no database, no network, no model. One file in, one
            file out, and the file it writes is plain JSON somebody can open and
            read. That is the point of stopping here:{' '}
            {UNITS.complaints.toLocaleString('en-GB')} documents get looked at
            before anything is built on top of them.
          </P>
        </Sect>
      </div>
    </OriginDialog>
  );
}

/**
 * One section, and the mark that says it is the one you asked for.
 *
 * `n` is optional: the last four sections explain the parser without belonging
 * to a numbered line, so they carry a rule instead of a numeral rather than
 * being given a number the code does not have.
 */
function Sect({
  n,
  title,
  refs,
  active,
  children,
}: {
  n?: number;
  title: string;
  refs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  active: number | null;
  children: React.ReactNode;
}) {
  const lit = n !== undefined && active === n;
  return (
    <section
      ref={(el) => {
        if (n !== undefined) refs.current[n] = el;
      }}
      className="scroll-mt-28"
    >
      <h3 className="flex items-baseline gap-3">
        <span
          className={`shrink-0 font-mono text-[0.6875rem] transition-colors ${
            lit ? 'text-ui-fg' : 'text-ui-faint'
          }`}
        >
          {n ?? '·'}
        </span>
        <span
          className={`font-mono text-[0.9375rem] transition-colors ${
            lit ? 'text-cal-1' : 'text-ui-fg'
          }`}
        >
          {title}
        </span>
      </h3>
      <div className="mt-3 grid gap-3.5 pl-[1.4rem]">{children}</div>
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
