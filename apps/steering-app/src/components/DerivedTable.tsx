import { OriginDialog, type Origin } from '@fde/uikit';
import { CylinderGlyph } from '@veresk/surface';
import { CORPUS } from '../lib/corpus.generated';
import { ESTATE, type EstateTable } from '../lib/estate.generated';
import { PLAIN } from '../lib/plainly';

/**
 * The one derived table, opened — and the colour rule both pages share.
 *
 * IT LIVES ON ITS OWN BECAUSE TWO PAGES OPEN THE SAME THING. The landing page
 * shows these tables as "what we made of the files"; the data-flow page shows
 * them as what the three pipelines produced. Two framings of one set of rows,
 * and a reader who clicks a table name must get the same answer either way —
 * so the dialog, the hues and the file-to-table map are defined once here
 * rather than copied into the second caller and quietly drifting.
 */
/**
 * A HUE PER PAIR, AND THE PAIR IS WHAT IT MEANS.
 *
 * `Timesheets` and `timesheet_lines` are the same colour because one was read
 * out of the other, and that is the only thing worth encoding here — a reader
 * can run their eye down the page and see which pile became which table without
 * being told. The four sources nothing reads yet get no hue at all, which is the
 * same rule the estate section follows for things that are not in the set.
 *
 * THE SCALE IS COOL AND THE CUSTOMER'S IS WARM. `--color-vst-1..4` are green,
 * lime, orange and red-orange and mean "which of Vantis's four systems". These
 * are cyan through pink and mean "read out of the files by us". Two scales that
 * cannot be confused for each other, carrying two claims that must not be.
 */
export const HUE: Record<string, string> = {
  timesheets: 'var(--color-src-1)',
  'closure-reports': 'var(--color-src-2)',
  quotes: 'var(--color-src-3)',
  estimates: 'var(--color-src-4)',
  'rate-cards': 'var(--color-src-5)',
  timesheet_lines: 'var(--color-src-1)',
  document_fields: 'var(--color-src-2)',
  quote_line_items: 'var(--color-src-3)',
  estimate_lines: 'var(--color-src-4)',
  rate_card_lines: 'var(--color-src-5)',
  source_files: 'var(--color-src-6)',
};

/** The derived side. One database, and the only one the product may read. */
export const DERIVED = ESTATE.find((s) => s.db === 'vst_derived');

/** Which group of files each derived table was read out of. */
export const SOURCE_OF = new Map(CORPUS.filter((g) => g.produces).map((g) => [g.produces, g.name]));

/**
 * One derived table, opened — and rewritten because the first version was a
 * column list with a sample beside each name, which explained nothing.
 *
 * WHAT WAS WRONG WITH IT. It showed `charge_code_raw` and `charge_code_key`
 * with two identical-looking values next to each other and left the reader to
 * work out why there were two. That difference — the code as the file wrote it,
 * and the same code in one consistent form — is the entire reason both columns
 * exist. A database name is for a query; a person needs a sentence.
 *
 * SO IT IS NOW THREE PLAIN ANSWERS AND ONE REAL ROW. What this is, where it
 * came from, what it makes answerable — then every column with its real value
 * AND what that column means. The names are still there, in the smaller type,
 * because somebody will want to write the query.
 */
export function TableDialog({
  table,
  from,
  onClose,
}: {
  table: EstateTable;
  from: Origin;
  onClose: () => void;
}) {
  const source = SOURCE_OF.get(table.name);
  const plain = PLAIN[table.name];
  const tone = HUE[table.name];

  return (
    <OriginDialog
      from={from}
      tone={tone}
      label={`${table.name}, ${table.rows} rows`}
      onClose={onClose}
      header={
        <>
          <CylinderGlyph />
          <div className="min-w-0">
            <p className="font-mono text-base font-medium text-ui-fg">{table.name}</p>
            <p className="text-sm text-ui-dim">{plain?.is}</p>
          </div>
          <p className="ui-dialog-figs">
            <span>
              <span className="font-mono text-ui-fg">{table.rows.toLocaleString('en-GB')}</span> rows
            </span>
            <span>
              <span className="font-mono text-ui-fg">{table.columns.length}</span> columns
            </span>
          </p>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-10">
        <div className="grid content-start gap-5">
          <div className="ba-plain">
            <p className="ba-plain-head">where it came from</p>
            <p className="mt-2 text-sm leading-relaxed text-ui-dim">{plain?.from}</p>
          </div>

          <div className="ba-plain">
            <p className="ba-plain-head">what you can ask now</p>
            <p className="mt-2 text-sm leading-relaxed text-ui-dim">{plain?.lets}</p>
          </div>

          {source && (
            <p className="text-xs leading-relaxed text-ui-faint">
              Read out of <span className="text-ui-dim">{source}</span> by{' '}
              <span className="font-mono">pnpm derived:parse</span>. No model was involved and the run
              costs nothing, which is why it can be thrown away and redone whenever the files change.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="ba-plain-head">one row, column by column</p>
          <p className="mt-1 text-xs text-ui-faint">
            A real row from the table. The value on the right is what is actually stored.
          </p>

          <ul className="mt-4 grid gap-px overflow-hidden rounded-xl border border-ui-line bg-ui-line">
            {table.columns.map((column) => (
              <li key={column.name} className="grid gap-1 bg-ui-bg px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-mono text-xs text-ui-fg">{column.name}</span>
                  <span className="font-mono text-xs break-all text-ui-dim">
                    {column.sample ?? <span className="text-ui-faint italic">empty</span>}
                  </span>
                </div>
                {plain?.columns[column.name] && (
                  <p className="max-w-[66ch] text-xs leading-relaxed text-ui-faint">
                    {plain.columns[column.name]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </OriginDialog>
  );
}
