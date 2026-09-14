/**
 * The estate, opened.
 *
 * WHAT THIS IS FOR. An engagement page claims the answer is assembled out of
 * several systems that cannot see each other. The obvious next question from
 * anyone who takes that seriously is "so what is actually IN them" — and the
 * page's answer used to be a number. This is the rest of it: every table, what
 * it holds, every field, and one real value from each.
 *
 * IT SERVES BOTH ENGAGEMENTS, WHICH IS WHY IT TAKES ITS ESTATE AS A PROP.
 * Meridian Pharma has seven databases and Vantis Steering has four; the tiles,
 * the dialog, the cards and the field lists are identical and everything else
 * differs. A second copy of this file with four names swapped would be the
 * thing that drifts — one of them would get a fix and the other would not.
 *
 * IT LIVES IN `@veresk/surface` AND NOT IN `@fde/uikit`, and the line is the
 * same one the whole repo draws. `@fde/uikit` is what a customer could lift
 * into their own repository; it must not know that estates, systems of record
 * or withheld sample values exist. This does know all three, and is shared by
 * two pages of one firm's own site. See `src/index.ts` for the rest of that
 * argument, including the `@source` line it costs each consumer.
 *
 * EVERY FIGURE HERE IS MEASURED, AND THE COMMAND IS PRINTED. `estate.generated.ts`
 * is written by `pnpm pharma:estate`, which counts rows with `count(*)` against
 * the live databases and takes one sample row per table. Nothing here is typed
 * in by hand except the sentence describing each table, and that sentence is
 * typed against the generated union so a table cannot appear without one. The
 * date and the command sit under the figures for the same reason `TwoQuestions`
 * prints `pnpm db:supplier-impact SUP-04` under its table: a number a reader
 * cannot reproduce is the thing this product spends its whole design arguing
 * against.
 *
 * WHAT OF THIS IS THIS PRODUCT'S. The tile, the dialog that grows out of it,
 * the list of named values and the ramp the figures count along are `@fde/uikit`
 * — a pressable card, a dialog, a list, a number. What stayed here is
 * everything that knows what the estate IS: which seven, in what order, which
 * hue each carries, what each table holds, which values may be shown and which
 * may not. That split is the same one the rest of the repo draws, one level
 * down: buy the surface, write the judgement.
 *
 * SEVEN TILES IN A ROW, AND ONE OPENS INTO A DIALOG. Three shapes were tried.
 * A tab strip with a shared panel below made the reader hold "which one did I
 * press" in their head while reading forty field names. An accordion fixed that
 * and pushed the rest of the page a thousand pixels down. The dialog keeps the
 * seven on screen — the estate still LOOKS like seven databases side by side,
 * which is the whole point — and gives the tables the width they need.
 *
 * IT OPENS FROM THE TILE YOU PRESSED, not from the middle of the screen. The
 * panel's transform origin is the clicked tile's centre, measured at the moment
 * of the click, so the dialog grows out of the thing that summoned it and
 * shrinks back into it on the way out. That is not decoration: on a row of
 * seven near-identical tiles it is the only cue that says which one you are now
 * looking inside.
 *
 * `mrd_kb` IS NOT THE SEVENTH SYSTEM AND IS NOT DRAWN LIKE ONE. It sits after a
 * rule, with no hue, because it is a library we built and not a customer system
 * of record we read — the same boundary the nerve map draws by giving it pages
 * instead of a cylinder, and the one `db:drop` enforces the hard way. It is
 * also the one database with no sample values on show: its rows are questions
 * real people typed into this site.
 *
 * NO BARS, AND THAT IS DELIBERATE. Row counts run from 2 (`mrd_mes.sites`) to
 * 959 (`mrd_tms.telematics_readings`). A linear bar makes forty of the
 * forty-nine tables a single pixel, and a log one needs a label explaining
 * itself on a front door. The count is a monospace numeral, which is exact and
 * honest about its own precision.
 */
import { useCallback, useState } from 'react';
import { DetailCard, FieldList, Figures, OriginDialog, Tile, originOf, useCountUp } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import type { ReactNode } from 'react';

/**
 * WHAT THIS NEEDS FROM A GENERATED ESTATE, DECLARED RATHER THAN IMPORTED.
 *
 * Both `pnpm pharma:estate` and `pnpm steering:estate` emit their own
 * `estate.generated.ts` with its own table-key union, and neither generator
 * imports the other — they are deliberate siblings. So this states the shape it
 * reads, structurally, and each generated file satisfies it without the two
 * having to agree about the fields only one of them has (`isSystemOfRecord`,
 * `standsFor`). Importing one customer's generated types here would have made
 * the other customer's page depend on the first customer's database.
 */
export interface EstateColumn {
  name: string;
  /** One real value from the table. Absent where a system may not publish them. */
  sample?: string;
  kind: 'text' | 'number' | 'date' | 'flag' | 'json' | 'other';
}

export interface EstateTable {
  name: string;
  columns: EstateColumn[];
  rows: number;
}

export interface EstateLike {
  db: string;
  label: string;
  tables: EstateTable[];
}

/** One openable tile. */
export interface EstateFace {
  db: string;
  name: string;
  asks: string;
  /** Absent for anything that is not one of the customer's systems of record. */
  hue?: string;
}

export interface EstateExplorerProps {
  estate: EstateLike[];
  measuredAt: string;
  measuredBy: string;
  totalRows: number;
  /** The systems, in the order the answer walks them. */
  faces: EstateFace[];
  /** Shown after a rule: in the estate, but not one of the customer's systems. */
  aside?: EstateFace;
  /** Why that one is behind the rule. */
  asideNote?: ReactNode;
  /** Something in the estate that is NOT a database and cannot be opened. */
  asideCard?: ReactNode;
  notes: Record<string, string>;
  heading: string;
  intro: ReactNode;
  /** The drawing for a tile. */
  figure: (face: EstateFace) => ReactNode;
  /**
   * Whether a system's sample values may be shown. Pharma withholds `mrd_kb`'s,
   * because its rows are questions real people typed; steering withholds
   * nothing. It is a per-customer judgement, so it is a prop.
   */
  showSamples?: (face: EstateFace) => boolean;
}

/** Which database is open, and the point its dialog grows out of. */
interface Opened {
  face: EstateFace;
  from: Origin;
}

export function EstateExplorer(props: EstateExplorerProps) {
  const { estate, faces, aside, asideNote, asideCard, heading, intro, figure } = props;
  const byDb = new Map(estate.map((s) => [s.db, s]));
  const totalTables = estate.reduce((n, s) => n + s.tables.length, 0);
  const [opened, setOpened] = useState<Opened | null>(null);

  const open = useCallback((face: EstateFace, element: HTMLElement) => {
    setOpened({ face, from: originOf(element) });
  }, []);

  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        {heading}
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">{intro}</p>

      <EstateFigures
        databases={estate.length}
        tables={totalTables}
        rows={props.totalRows}
        at={props.measuredAt}
        by={props.measuredBy}
      />

      <div className="ui-tiles">
        {faces.map((face) => (
          <SystemTile key={face.db} face={face} system={byDb.get(face.db)!} figure={figure} onOpen={open} />
        ))}

        {/* THE RULE IS THE STATEMENT. Left of it: the customer's systems of
            record, which this only ever reads. Right of it: whatever is in the
            estate that is not one of them. */}
        {(aside || asideCard) && <span aria-hidden className="ui-tiles-divider" />}

        {aside && (
          <SystemTile face={aside} system={byDb.get(aside.db)!} figure={figure} onOpen={open} />
        )}
        {asideCard}
      </div>

      {asideNote && (
        <p className="mt-6 max-w-[64ch] text-xs leading-relaxed text-ui-faint">{asideNote}</p>
      )}

      {opened && (
        <EstateDialog
          opened={opened}
          system={byDb.get(opened.face.db)!}
          notes={props.notes}
          figure={figure}
          showSamples={props.showSamples?.(opened.face) ?? true}
          onClose={() => setOpened(null)}
        />
      )}
    </section>
  );
}

/** The three numbers, and how to get them again. */
function EstateFigures({
  databases,
  tables,
  rows,
  at,
  by,
}: {
  databases: number;
  tables: number;
  rows: number;
  at: string;
  by: string;
}) {
  return (
    <div className="mt-8">
      <Figures
        items={[
          { value: databases, label: 'databases' },
          { value: tables, label: 'tables' },
          { value: rows.toLocaleString('en-GB'), label: 'rows' },
        ]}
        note={
          <>
            counted {at} by <span className="text-ui-dim">{by}</span>
          </>
        }
      />
    </div>
  );
}

/**
 * One database in the row.
 *
 * WHAT IS ON IT AND WHAT IS NOT. The name, what it is called in conversation,
 * what it answers, and how many tables it has. The row COUNT is not here: it
 * belongs beside the tables it is spread across, and a second figure on a tile
 * this size turned the row into a scoreboard. Nor is the walk numeral — that is
 * the nerve map's job, where the order means something because there is a path
 * being walked. Here the seven are just seven.
 */
function SystemTile({
  face,
  system,
  figure,
  onOpen,
}: {
  face: EstateFace;
  system: EstateLike;
  figure: (face: EstateFace) => ReactNode;
  onOpen: (face: EstateFace, element: HTMLElement) => void;
}) {
  return (
    <Tile
      tone={face.hue}
      figure={figure(face)}
      title={face.db}
      subtitle={face.name}
      detail={face.asks}
      meta={`${system.tables.length} tables`}
      onOpen={(element) => onOpen(face, element)}
    />
  );
}

/**
 * The dialog, and the three ways out of it.
 *
 * CLICK OUTSIDE, ESCAPE, OR THE CLOSE BUTTON. All three, because each is the
 * first thing a different person tries, and a panel that traps someone who
 * guessed wrong is worse than no panel.
 *
 * THE EXIT IS ANIMATED, WHICH MEANS UNMOUNTING IS DELAYED. `closing` runs the
 * reverse of the entrance and the parent is told 200ms later. That duration is
 * written twice — once here, once in the stylesheet — which is worth knowing
 * about rather than hiding: shorten one and the panel either vanishes mid-flight
 * or leaves a ghost behind.
 */
function EstateDialog({
  opened,
  system,
  notes,
  figure,
  showSamples,
  onClose,
}: {
  opened: Opened;
  system: EstateLike;
  notes: Record<string, string>;
  figure: (face: EstateFace) => ReactNode;
  showSamples: boolean;
  onClose: () => void;
}) {
  const { face, from } = opened;
  const progress = useCountUp(face.db);

  const rows = system.tables.reduce((n, t) => n + t.rows, 0);
  const tables = [...system.tables].sort((a, b) => b.rows - a.rows);

  return (
    <OriginDialog
      from={from}
      tone={face.hue}
      label={`${face.db}, ${face.name}`}
      onClose={onClose}
      header={
        <>
          {figure(face)}
          <div className="min-w-0">
            <p className="font-mono text-base font-medium text-ui-fg">{face.db}</p>
            {/* `face.name` and the generated label say the same thing for four
                of the seven — "Quality — quality" — so the second line carries
                what the database ANSWERS, which nothing else here does. */}
            <p className="text-sm text-ui-dim">
              {face.name} · {face.asks}
            </p>
          </div>
          <p className="ui-dialog-figs">
            <span>
              <span className="font-mono text-ui-fg">{system.tables.length}</span> tables
            </span>
            <span>
              <span className="font-mono text-ui-fg">{rows.toLocaleString('en-GB')}</span> rows
            </span>
          </p>
        </>
      }
    >
      <p className="pb-3 text-xs text-ui-faint">
        {showSamples
          ? 'Largest tables first · every column as deployed, with one real value from each'
          : 'Largest tables first · values are not shown — these rows are questions people asked'}
      </p>
      <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {tables.map((table, i) => (
          <TableCard
            key={table.name}
            note={notes[`${system.db}.${table.name}`]}
            table={table}
            progress={progress}
            index={i}
          />
        ))}
      </ul>
    </OriginDialog>
  );
}

function TableCard({
  note,
  table,
  progress,
  index,
}: {
  note: string;
  table: EstateTable;
  progress: number;
  index: number;
}) {
  return (
    <DetailCard
      title={table.name}
      figure={Math.round(table.rows * progress).toLocaleString('en-GB')}
      unit="rows"
      description={note}
      /* The cascade is the panel arriving in reading order. Capped, because a
         twelve-table system would otherwise take a second and a half to finish
         appearing, and a reader who has already started on card one does not
         want card twelve still animating. */
      className="estate-land"
      style={{ animationDelay: `${Math.min(index, 8) * 38}ms` }}
    >
      {/* THE EXAMPLE IS THE EXPLANATION. `LOT-IBU200-2609-B` says more about
          `lot_ref` than the word "text" ever could — the shape of an identifier
          IS what a reader needs. The kind word is only the fallback for columns
          with nothing to show: empty tables, and everything in `mrd_kb`. */}
      <FieldList
        fields={table.columns.map((column) => ({
          name: column.name,
          value: column.sample,
          kind: column.kind,
        }))}
        fallback={(kind) => KIND_WORD[kind]}
      />
    </DetailCard>
  );
}

/**
 * What each kind of column is called in the interface.
 *
 * Plain words, not Postgres types. `character varying(64)` is true and useless;
 * somebody reading this wants to know they will get text back. The mark beside
 * the name says the same thing as a shape, and shapes are used rather than
 * colours because colour on this page already means which system a fact came
 * from.
 */
const KIND_WORD: Record<string, string> = {
  text: 'text',
  number: 'number',
  date: 'date',
  flag: 'yes/no',
  json: 'json',
  other: 'other',
};
