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
 * THE SKELETON IS A SKETCH, AND SAYS SO. It is PARSE.md's shape of the parser,
 * not the file — the real write happens in `cli/parse.ts`, and the real loop
 * trims and counts. Every section underneath quotes the real code.
 *
 * ── IT HAS RUN, AND EVERY QUOTE IS FROM THE FILE ───────────────────────────
 *
 * This panel was first written as a specification, before the code, and said
 * so ("nothing here has run"). That stopped being true on 2026-09-17: stage 3.1
 * is `apps/ai/safety/src/grounding/parse.ts`, and `pnpm safety:parse` has run.
 * Re-checked on 2026-09-27:
 *
 *   - every `Code` block is quoted from `grounding/parse.ts`, with its doc
 *     comments trimmed. The earlier blocks were PARSE.md's draft code under a
 *     path that did not exist (`src/parse.ts`) and had drifted from the file —
 *     `type Doc`, a merge that `return`ed, a header built by one template string;
 *   - the run's output is rebuilt from `cli/parse.ts`'s own format strings,
 *     which print FOUR checks, not the three PARSE.md drafted. Every value in it
 *     was checked against `documents.json` and against `awk` over the raw slice;
 *   - "42 real instances" of investigation → recall is corrected by
 *     INGESTION.md's graph measurement: 42 name a campaign, 14 resolve to one
 *     this slice holds.
 *
 * The corpus counts still come from `estate.generated.ts` rather than being
 * typed, so the page and this panel cannot disagree about them.
 */
import { useCallback, useRef, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { ROWS, UNITS } from '../../lib/estate.generated';
import { HoodButton } from '@veresk/learn/steps';
import { Because } from '@veresk/learn/steps';

const n = (x: number) => x.toLocaleString('en-GB');

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
      <HoodButton
        blurb="Inside the parser: the whole thing in five lines, then each line explained"
        onClick={open}
      />
      {from && <ParserPanel from={from} onClose={() => setFrom(null)} />}
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
  const go = useCallback((k: number) => {
    setActive(k);
    const target = sections.current[k];
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
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the parser</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.1 · {n(ROWS.complaints)} complaint lines in, {n(UNITS.complaints)} documents
            out
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
        <p className="cal-label pb-2" data-tone="quiet">
          The whole parser, sketched — press a number to jump to the real code for it
        </p>
        <pre className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] px-3.5 py-3 font-mono text-[0.8125rem] leading-[1.6] text-ui-dim">
          {SKELETON.map((row, i) =>
            row.code === '' ? (
              <div key={i} className="h-2" aria-hidden />
            ) : (
              <div key={i} className="flex items-baseline gap-3 whitespace-pre">
                <span className="w-6 shrink-0 text-right">
                  {row.n ? (
                    <button
                      type="button"
                      onClick={() => go(row.n!)}
                      aria-label={`Explain line ${row.n}: ${LINE_NOTE[row.n]}`}
                      className={`rounded px-1 font-semibold transition-colors ${
                        active === row.n
                          ? 'bg-cal-sky/25 text-ui-fg'
                          : 'text-cal-sky hover:bg-cal-sky/15'
                      }`}
                    >
                      {row.n}
                    </button>
                  ) : null}
                </span>
                <span className={row.n ? 'text-ui-fg' : ''}>{row.code}</span>
                {row.n && (
                  <span className="ml-auto pl-6 font-sans text-ui-faint">{LINE_NOTE[row.n]}</span>
                )}
              </div>
            ),
          )}
        </pre>
      </div>

      <div className="grid gap-9 pb-2">
        <div className="grid gap-4">
          <p className="cal-hood-text">
            NHTSA publishes its complaints as one enormous text file with no header
            row. The slice used here is {n(ROWS.complaints)} lines, each cut into
            51 columns by tab characters, where a column means something only
            because of its position. The parser reads it a line at a time, glues together the
            lines that describe the same complaint, and writes out{' '}
            {n(UNITS.complaints)} records — each with{' '}
            <span className="text-ui-fg">text to search</span> and{' '}
            <span className="text-ui-fg">labelled fields to filter on</span>.
          </p>
          <p className="cal-hood-text">
            The recall and investigation files go through the same treatment, so{' '}
            {n(UNITS.complaints + UNITS.recalls + UNITS.investigations)} documents
            come out in all. Nothing is embedded, stored or sent anywhere: the
            output is a plain file somebody can open and read.
          </p>
        </div>

        <Sect k={1} title="A Map, because the file is not sorted" refs={sections} active={active}>
          <p className="cal-hood-text">
            Rows for one complaint are next to each other in practice, and nothing
            in the format promises it. A <code>Map</code> keyed by the complaint
            number, <code>ODINO</code>, does not care about order: the first
            sighting creates the document, and every later one adds its component.
          </p>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="What a complaint becomes · comments trimmed"
            lines={[
              'export interface ComplaintDoc {',
              '  id: string;',
              "  kind: 'complaint';",
              '  text: string;',
              '  meta: {',
              '    odino: string;',
              '    manufacturer: string;',
              '    make: string;',
              '    model: string;',
              '    year: number | null;',
              '    filed: string | null;',
              '    failed: string | null;',
              '    components: string[];',
              '    crash: boolean;',
              '    fire: boolean;',
              '    injuries: number;',
              '    deaths: number;',
              '    miles: number | null;',
              '    state: string;',
              '    vin11: string;',
              '  };',
              '}',
            ]}
          />
          <Because>
            {n(UNITS.complaints)} objects is about 60 MB in memory. A database at
            this stage would mean nobody could open the output in a text editor,
            which is the entire point of stage 3.1.
          </Because>
        </Sect>

        <Sect k={2} title="One line at a time, not all at once" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="The reader"
            mark={[5]}
            lines={[
              'async function* lines(path: string): AsyncGenerator<string> {',
              '  const rl = createInterface({',
              "    input: createReadStream(path, { encoding: 'utf8' }),",
              '    // These files are Windows-origin. Without this a stray \\r rides along on',
              "    // the last field's value and compares unequal to everything.",
              '    crlfDelay: Infinity,',
              '  });',
              '  for await (const line of rl) if (line.length > 0) yield line;',
              '}',
            ]}
          />
          <p className="cal-hood-text">
            The slice is 79 MB and would load fine. The full file is 1.5 GB and
            would not. Streaming costs nothing here and means the same code
            survives the slice widening, which is still on the table.
          </p>
          <p className="cal-hood-text">
            The marked line is not decoration. These files come from Windows, and
            a stray <code>\r</code> left on the end of the last field becomes part
            of its value without anything complaining.
          </p>
        </Sect>

        <Sect
          k={3}
          title="Split by tab — and deliberately not a CSV library"
          refs={sections}
          active={active}
        >
          <p className="cal-hood-text">
            NHTSA's own description of the file says <em>“TAB delimited”</em> and
            names no quote character, so the rule is: split on tab, and treat{' '}
            <code>"</code> as an ordinary letter.
          </p>
          <p className="cal-hood-text">
            <span className="text-ui-fg">A CSV reader with quote handling on would not do that.</span>{' '}
            708 of the {n(ROWS.complaints)} lines carry an odd number of double
            quotes, because people write{' '}
            <code>THE "SERVICE ENGINE" LIGHT CAME ON</code>. At an unbalanced quote
            such a reader keeps consuming — newlines included — and merges records
            that the file keeps separate.
          </p>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="The split, inside parseComplaints"
            mark={[0]}
            lines={[
              "const f = line.split('\\t');",
              'if (f.length !== EXPECTED_FIELDS) {',
              '  report.ragged++;',
              '  continue;',
              '}',
            ]}
          />
          <Because>
            The guard should never fire — every one of the {n(ROWS.complaints)}{' '}
            lines has exactly 51 fields, and <code>EXPECTED_FIELDS</code> is 51. It
            stays because a guard that never fires is cheap, and a silently short
            row would shift every field after the gap.
          </Because>
          <p className="cal-hood-text">
            The column numbers are copied from NHTSA's data dictionary, which{' '}
            <span className="text-ui-fg">counts from 1 while JavaScript counts from 0</span>
            , so every constant is the dictionary's number minus one — and an
            off-by-one there would not error. Narratives would simply start
            arriving in <code>MILES</code>.
          </p>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="The columns used, named once"
            lines={[
              'const F = {',
              '  ODINO: 1,',
              '  MFR: 2,',
              '  MAKE: 3,',
              '  MODEL: 4,',
              '  YEAR: 5,',
              '  CRASH: 6,',
              '  FAILDATE: 7,',
              '  FIRE: 8,',
              '  INJURED: 9,',
              '  DEATHS: 10,',
              '  COMPDESC: 11,',
              '  CITY: 12,',
              '  STATE: 13,',
              '  VIN: 14,',
              '  LDATE: 16,',
              '  MILES: 17,',
              '  CDESCR: 19,',
              '} as const;',
            ]}
          />
        </Sect>

        <Sect k={4} title="Merging the repeats" refs={sections} active={active}>
          <p className="cal-hood-text">
            NHTSA writes <span className="text-ui-fg">one row per component</span>,
            so a complaint that names five parts of the car appears five times,
            with the same account each time.
          </p>
          <Data
            path="CMPL_SLICE.tsv — ODI 11341276, as filed"
            note="One person, five rows"
            lines={[
              '11341276  STRUCTURE:BODY',
              '11341276  ELECTRICAL SYSTEM',
              '11341276  POWER TRAIN',
              '11341276  ENGINE',
              '11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY BRAKING',
            ]}
          />
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="The merge"
            mark={[7, 8]}
            lines={[
              'const odino = f[F.ODINO].trim();',
              'const component = f[F.COMPDESC].trim();',
              'const existing = byOdi.get(odino);',
              '',
              'if (existing) {',
              '  report.merged++;',
              '  if (component && !existing.meta.components.includes(component)) {',
              '    existing.meta.components.push(component);',
              "    existing.text = buildText(existing.meta, narrativeOf.get(odino) ?? '');",
              '  }',
              '  continue;',
              '}',
            ]}
          />
          <p className="cal-hood-text">
            The first row's account is kept and the components are collected.
            Because the line at the top of the text lists the components, the text
            is rebuilt each time a new one arrives — so the merged complaint reads{' '}
            <code>2019 GMC ACADIA | STRUCTURE:BODY, ELECTRICAL SYSTEM, …</code>{' '}
            with all five.
          </p>
          <Because>
            Without this, that one person takes five of the six result slots and
            crowds out four others — and every count published anywhere is 44% too
            high: {n(ROWS.complaints)} rows are {n(UNITS.complaints)} complaints.
          </Because>
        </Sect>

        <Sect
          k={5}
          title="Building the text — the highest-leverage line in the pipeline"
          refs={sections}
          active={active}
        >
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="The header line"
            mark={[2, 3, 4, 8]}
            lines={[
              "function buildText(meta: ComplaintDoc['meta'], narrative: string): string {",
              '  const head = [',
              "    [meta.year, meta.make, meta.model].filter(Boolean).join(' '),",
              "    meta.components.join(', '),",
              '    meta.filed ? `filed ${meta.filed}` : null,',
              '  ]',
              '    .filter(Boolean)',
              "    .join(' | ');",
              '  return `${head}\\n${narrative.trim()}`;',
              '}',
            ]}
          />
          <p className="cal-hood-text">
            <span className="text-ui-fg">The account never says “F-150”.</span> It
            says <em>“THE GEAR WILL NOT GO INTO PARK…”</em>. Without the line on
            top, a question about a 2020 F-150 transmission matches nothing on the
            meaning side of search, however good the model is.
          </p>
          <Data
            path="documents.json — ODI 11353867, the text it became"
            lines={[
              '2020 FORD F-150 | POWER TRAIN | filed 2020-09-08',
              'THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START. ALSO, THE',
              'DISPLAY INDICATES I AM IN THE WRONG GEAR DISPLAY SHOWS NEUTRAL',
              'BUT TRUCK IS IN DRIVE…',
            ]}
            mark={[0]}
          />
          <Because>
            Stage 3.2 barely runs on this corpus — only the 114 investigations get
            cut up, and nothing else does. So the parser, not the chunker, decides
            what can be found, and it comes down to that one string concatenation.
            Recalls and investigations get the same treatment: their text opens
            with the campaign or case number, the component and the vehicles.
          </Because>
          <p className="cal-hood-text">
            And note what is <em>not</em> in the text. <code>deaths</code>,{' '}
            <code>crash</code> and <code>miles</code> stay in <code>meta</code>:
            writing “deaths 0” into the text would make every complaint match a
            question about fatalities.
          </p>
        </Sect>

        <Sect title="Dates, converted once, in one function" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="One date function"
            lines={[
              'export function isoDate(raw: string): string | null {',
              '  const s = raw.trim();',
              '  if (!/^\\d{8}$/.test(s)) return null;',
              '  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`;',
              '}',
            ]}
          />
          <p className="cal-hood-text">
            The files use <code>YYYYMMDD</code>; NHTSA's complaints API uses{' '}
            <code>MM/DD/YYYY</code> and its recalls API <code>DD/MM/YYYY</code> —
            one agency, three formats. Everything becomes <code>YYYY-MM-DD</code>{' '}
            at the boundary, so nothing downstream has to know what shape it
            arrived in. Eval case REC-008 exists to catch this going wrong, because
            a misread date shifts every before-and-after answer and nothing errors.
          </p>
          <p className="cal-hood-text">
            It returns <code>null</code> rather than throwing, because a missing
            incident date is normal — people do not always remember when it
            happened — and is not a parse failure.
          </p>
        </Sect>

        <Sect title="Numbers that are sometimes not numbers" refs={sections} active={active}>
          <Code
            path="apps/ai/safety/src/grounding/parse.ts"
            note="Blank is not zero"
            mark={[2]}
            lines={[
              'function int(raw: string): number | null {',
              '  const s = raw.trim();',
              '  return /^\\d+$/.test(s) ? Number(s) : null;',
              '}',
              '',
              'function yn(raw: string): boolean {',
              "  return raw.trim().toUpperCase() === 'Y';",
              '}',
            ]}
          />
          <p className="cal-hood-text">
            <code>MILES</code> is blank in two rows out of three.{' '}
            <span className="text-ui-fg">
              <code>Number("")</code> is <code>0</code>
            </span>
            , which would quietly turn “we do not know the mileage” into “zero
            miles” — a fact about a vehicle that nobody stated. Hence the pattern
            check before the conversion.
          </p>
        </Sect>

        <Sect title="The four checks, printed at the end" refs={sections} active={active}>
          <Data
            path="pnpm safety:parse — the run of 2026-09-17"
            note="Rebuilt from cli/parse.ts's own format strings"
            mark={[8, 9]}
            lines={[
              ...(['complaints', 'recalls', 'investigations'] as const).map(
                (k) =>
                  `${k.padEnd(15)} ${n(ROWS[k]).padStart(8)} lines → ${n(UNITS[k]).padStart(7)} documents   (${n(ROWS[k] - UNITS[k])} merged, 0 ragged)`,
              ),
              '',
              `${n(UNITS.complaints + UNITS.recalls + UNITS.investigations)} documents total, in 0.9s`,
              '',
              'ok    every row had the 51 fields CMPL.txt declares',
              '      no short rows — nothing was silently shifted into the wrong column',
              'ok    the raw file agrees, checked by awk with no parser in the path',
              `      awk says 51 fields × ${n(ROWS.complaints)}; the parser read ${n(ROWS.complaints)} lines`,
              'ok    ODI 11353867 is present and reads correctly (eval case REC-001)',
              '      2020 FORD F-150, filed 2020-09-08',
              'ok    investigations carry the recall they led to (the graph edge, already in the data)',
              `      42 of ${UNITS.investigations} name a CAMPNO — e.g. DP22005 → 22V063000`,
            ]}
          />
          <Because>
            The marked check is the one that matters: it compares the parser's
            count against <code>awk</code> over the raw file — a different tool,
            with no parser in the path.{' '}
            <span className="text-ui-fg">A parser confirming its own output proves nothing.</span>
          </Because>
          <p className="cal-hood-text">
            The counts came back equal to the ones the estate page had already
            measured from the same files by a different route. That agreement is
            the point: two programs that never saw each other reached the same{' '}
            {n(UNITS.complaints)}.
          </p>
        </Sect>

        <Sect title="The link nobody had to infer" refs={sections} active={active}>
          <p className="cal-hood-text">
            Investigations carry a field the other two sources do not:{' '}
            <code>CAMPNO</code>, documented as{' '}
            <em>“the recall campaign initiated as a result of the investigation”</em>
            . 42 of the {UNITS.investigations} fill it in.
          </p>
          <Data
            path="INV_SLICE.tsv — field 9, where it is set"
            note="42 of 114"
            lines={['DP22005  →  22V063000']}
          />
          <Because>
            That is a regulator writing down that this enquiry produced that recall
            — a link between two documents, sitting in the file with nothing to
            infer and no model involved, which is why the command checks for it
            (the fourth check above).
          </Because>
          <p className="cal-hood-text">
            <span className="text-ui-fg">It turned out shallower than it looked.</span>{' '}
            When the links were counted later, only 14 of those 42 campaigns are in
            the recall slice this engagement holds. The more useful link was one
            nobody planned: owners typing a campaign number into their own
            complaint, which reaches 563 campaigns — and for REC-001 turns up seven
            complaints naming its recall directly.
          </p>
        </Sect>

        <Sect title="What it does not do" refs={sections} active={active}>
          <p className="cal-hood-text">
            No embedding, no database, no network, no model. Three files in, one
            file out, and the file it writes is plain JSON somebody can open and
            read. That is the point of stopping here:{' '}
            {n(UNITS.complaints + UNITS.recalls + UNITS.investigations)} documents
            get looked at before anything is built on top of them.
          </p>
        </Sect>
      </div>
    </OriginDialog>
  );
}

/**
 * One section, and the mark that says it is the one you asked for.
 *
 * `k` is optional: the later sections explain the parser without belonging to
 * a numbered line, so they carry a dot instead of a numeral rather than being
 * given a number the code does not have.
 */
function Sect({
  k,
  title,
  refs,
  active,
  children,
}: {
  k?: number;
  title: string;
  refs: React.MutableRefObject<Record<number, HTMLElement | null>>;
  active: number | null;
  children: React.ReactNode;
}) {
  const lit = k !== undefined && active === k;
  return (
    <section
      ref={(el) => {
        if (k !== undefined) refs.current[k] = el;
      }}
    >
      <h3 className="flex items-baseline gap-3">
        <span
          className={`w-6 shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums transition-colors ${
            lit ? 'text-cal-sky' : 'text-ui-faint'
          }`}
          aria-hidden={k === undefined}
        >
          {k ?? '·'}
        </span>
        <span
          className={`text-[1.0625rem] font-bold transition-colors ${
            lit ? 'text-cal-sky' : 'text-ui-fg'
          }`}
        >
          {title}
        </span>
      </h3>
      <div className="mt-3.5 grid gap-4 sm:pl-9">{children}</div>
    </section>
  );
}
