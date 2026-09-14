/**
 * Where the three pipelines land — the end of the pipeline, on the same page.
 *
 * IT IS HERE BECAUSE THE PIPELINE HAD NO RESULT. The page walked a reader
 * through parsing, indexing and extraction and then stopped at the last step,
 * which leaves the obvious question unanswered: and then what is there? The
 * landing page has always shown these tables, framed as "what we made of the
 * files". Framed instead as what each step produced, the same rows close the
 * argument the three steps were making.
 *
 * GROUPED BY WHICH STEP MADE THEM, AND IN THE STEP'S OWN COLOUR, so the
 * connection is carried by the page rather than by a sentence asking the reader
 * to remember. `derived_effort` is deliberately not in any of the three: it is
 * assembled from all of them, and it is the only one a price is queried from —
 * which is the point the whole page is walking towards.
 *
 * THE TILES OPEN THE SAME DIALOG THE LANDING PAGE OPENS. One implementation in
 * `DerivedTable.tsx`, so a reader who clicks `extracted_facts` here gets the
 * same real row they would get there.
 */
import { useCallback, useState } from 'react';
import { originOf, type Origin } from '@fde/uikit';
import { DERIVED, TableDialog } from './DerivedTable';
import type { EstateTable } from '../lib/estate.generated';

interface LandedGroup {
  /** The step on this page that produced them. */
  n: number;
  label: string;
  /** What the step did to get them, in one line. */
  why: string;
  tone: string;
  tables: string[];
}

const GROUPS: LandedGroup[] = [
  {
    n: 1,
    label: 'Parsing',
    why: 'Read straight out of the spreadsheets by code. Most of the rows on the page, and the part that cannot be quietly wrong.',
    tone: 'var(--color-src-1)',
    tables: [
      'timesheet_lines',
      'document_fields',
      'quote_line_items',
      'estimate_lines',
      'rate_card_lines',
      'effort_split_lines',
      'effort_totals',
      'source_files',
    ],
  },
  {
    n: 2,
    label: 'Indexing',
    why: 'The prose, cut on its headings into passages that can be found by meaning as well as by exact words.',
    tone: 'var(--color-src-4)',
    tables: ['document_chunks'],
  },
  {
    n: 3,
    label: 'Extraction',
    why: 'The answers a model read out of the closure reports, each with the sentence it came from — and the two that were thrown away for quoting a sentence that was not in the file.',
    tone: 'var(--color-src-6)',
    tables: ['extracted_facts', 'rejected_facts'],
  },
];

/** Assembled from all three, and the only one a price comes out of. */
const ASSEMBLED = 'derived_effort';

export function Landed() {
  const [opened, setOpened] = useState<{ table: EstateTable; from: Origin } | null>(null);
  const close = useCallback(() => setOpened(null), []);

  const byName = new Map((DERIVED?.tables ?? []).map((t) => [t.name, t]));
  const open = (table: EstateTable, el: HTMLElement) =>
    setOpened({ table, from: originOf(el) });

  const assembled = byName.get(ASSEMBLED);
  const total = (DERIVED?.tables ?? []).reduce((n, t) => n + t.rows, 0);

  return (
    <section className="lift-in border-t border-ui-line pt-12 pb-16">
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        And then there is a table.
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Every step above ends in rows, in one database of ours —{' '}
        <span className="font-mono text-ui-fg">vst_derived</span>, separate from the four Vantis
        runs and the only one the product reads.{' '}
        <span className="text-ui-fg">{total.toLocaleString('en-GB')} rows</span> so far, and each
        one carries the file and the line it was read from. Open any of them to see a real row,
        column by column.
      </p>

      <div className="x-land mt-8">
        {GROUPS.map((g) => (
          <section
            key={g.label}
            className="x-land-group"
            style={{ '--ui-tone': g.tone } as React.CSSProperties}
          >
            <div className="x-land-head">
              <span className="x-land-n">{g.n}</span>
              <h3 className="x-land-label">{g.label}</h3>
              <p className="x-land-count">
                {g.tables
                  .reduce((n, name) => n + (byName.get(name)?.rows ?? 0), 0)
                  .toLocaleString('en-GB')}{' '}
                rows
              </p>
            </div>
            <p className="x-land-why">{g.why}</p>

            <ul className="x-land-grid">
              {g.tables.map((name) => {
                const t = byName.get(name);
                if (!t) return null;
                return (
                  <li key={name}>
                    <TableCard table={t} onOpen={open} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* THE JOIN, AND IT IS THE WHOLE POINT. Three separate readings are of
            no use until one row can be compared with another; this is that row,
            and it is why the three were worth doing separately. */}
        {assembled && (
          <section className="x-land-join">
            <p className="x-land-join-lead">All three, joined on the document they came from</p>
            <div className="x-land-join-table">
              <TableCard table={assembled} onOpen={open} />
            </div>
            <p className="x-land-join-why">
              One row per closure report: what kind of change, what part, what safety level, how
              many interfaces, and the hours it took. This is the table a price is actually queried
              from — and the reason the reading was worth doing at all.
            </p>
          </section>
        )}
      </div>

      {opened && <TableDialog table={opened.table} from={opened.from} onClose={close} />}
    </section>
  );
}

/**
 * One table, drawn as a table.
 *
 * A CYLINDER WOULD BE THE WRONG DRAWING. The cylinder on the estate pages means
 * a database, and there is one database here — twelve cylinders inside it would
 * say the opposite of the true thing. A header bar with the name over its first
 * columns is what a table actually looks like, and it carries real information
 * at the same time: a reader can see that `timesheet_lines` has an employee and
 * a charge code in it without opening anything.
 */
function TableCard({
  table,
  onOpen,
}: {
  table: EstateTable;
  onOpen: (table: EstateTable, el: HTMLElement) => void;
}) {
  const shown = table.columns.slice(0, 4);
  const rest = table.columns.length - shown.length;

  return (
    <button type="button" className="x-tbl" onClick={(e) => onOpen(table, e.currentTarget)}>
      <span className="x-tbl-head">
        <span className="x-tbl-name">{table.name}</span>
        <span className="x-tbl-rows">{table.rows.toLocaleString('en-GB')}</span>
      </span>
      <span className="x-tbl-cols">
        {shown.map((c) => (
          <span key={c.name} className="x-tbl-col">
            {c.name}
          </span>
        ))}
        {rest > 0 && <span className="x-tbl-col x-tbl-col--rest">+{rest}</span>}
      </span>
    </button>
  );
}
