/**
 * The two rows: what arrived, and what we made of it.
 *
 * IT IS TWO ROWS OF OPENABLE TILES AND NOT A DIAGRAM, because the question a
 * reader actually has is "what is IN that?" — and a panel of adjectives cannot
 * answer it. The top row opens onto the customer's real files, first fourteen
 * lines and all, with the `#` comments and the quoted commas still in them. The
 * bottom row opens onto the tables those files became, with a real value in
 * every column. Same interaction as the estate section above, because it is the
 * same question asked of a different kind of thing.
 *
 * THE TOP ROW IS THE HARDER ONE AND THE REASON THIS EXISTS. A database knows
 * its own shape, so the estate section can just ask it. A directory does not,
 * so `pnpm steering:corpus-web` measures it and takes an excerpt, and the tile
 * hands that over. Describing a timesheet export cannot convey that the year a
 * rate card applies to lives in a comment above the header; fourteen lines of
 * the file convey it instantly.
 *
 * FOUR OF THE EIGHT TOP TILES PRODUCE NOTHING YET, and they are drawn as such —
 * dashed, and saying so on the face. Requirements, source, releases and tickets
 * are 738 of the 1,069 files and not one row has been read out of them. A row
 * that quietly omitted them would make the reading look four times further
 * along than it is.
 *
 * NO COLOUR ON EITHER ROW. Colour on this page means "which of the customer's
 * four databases", and neither of these is one of those. What is encoded
 * instead is state: read or not read, which is the only distinction the section
 * is making.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { OriginDialog, Tile, originOf, type Origin } from '@fde/uikit';
import { CylinderGlyph, PagesGlyph } from '@veresk/surface';
import {
  CORPUS,
  MEASURED_BY as CORPUS_BY,
  TOTAL_BYTES,
  TOTAL_FILES,
  type CorpusGroup,
} from '../lib/corpus.generated';
import { MEASURED_BY as ESTATE_BY, type EstateTable } from '../lib/estate.generated';
import { DERIVED, HUE, SOURCE_OF, TableDialog } from './DerivedTable';

type Opened =
  | { kind: 'file'; group: CorpusGroup; from: Origin }
  | { kind: 'table'; table: EstateTable; from: Origin };

export function BeforeAfter() {
  const [opened, setOpened] = useState<Opened | null>(null);
  const close = useCallback(() => setOpened(null), []);

  const tables = [...(DERIVED?.tables ?? [])].sort((a, b) => b.rows - a.rows);
  const rows = tables.reduce((n, t) => n + t.rows, 0);

  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[36ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        What they gave us, and what we made of it.
      </h2>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
        A customer hands over a directory, not a schema. Open anything on the top row to read the
        actual files; open anything on the bottom row to see the table they became and a real value
        in every column.
      </p>

      {/* ── BEFORE ─────────────────────────────────────────────────────── */}
      <RowHead
        label="before"
        title="Eight kinds of file"
        figure={`${TOTAL_FILES.toLocaleString('en-GB')} files · ${Math.round(TOTAL_BYTES / 1024).toLocaleString('en-GB')} KB`}
        note={CORPUS_BY}
        sub="Everything Vantis handed over, sorted by what kind of thing it is. Four of the eight have been read so far; the other four are the next two stages of the work."
      />

      <div className="ui-tiles ba-tiles">
        {CORPUS.map((group, i) => (
          <Tile
            key={group.id}
            tone={HUE[group.id]}
            className={group.produces ? 'estate-land' : 'estate-land ba-unread'}
            style={{ animationDelay: `${i * 45}ms` }}
            figure={<PagesGlyph />}
            title={group.name}
            subtitle={`${group.files.toLocaleString('en-GB')} files`}
            detail={group.what}
            meta={group.produces ? `read → ${group.produces}` : 'not read yet'}
            onOpen={(el) => setOpened({ kind: 'file', group, from: originOf(el) })}
          />
        ))}
      </div>

      {/* The crossing. A rule and a word: the thing it stands for takes four
          seconds and is the least glamorous part of the work. */}
      <div aria-hidden className="ba-cross">
        <span className="ba-cross-line" />
        <span className="ba-cross-word">read, with the line it came from</span>
        <span className="ba-cross-line" />
      </div>

      {/* ── AFTER ──────────────────────────────────────────────────────── */}
      <RowHead
        label="after"
        title="Six tables in vst_derived"
        figure={`${rows.toLocaleString('en-GB')} rows`}
        note={ESTATE_BY}
        sub={
          <>
            <span className="font-mono text-ui-fg">vst</span> is the prefix on every Vantis
            database — <span className="font-mono">vst_crm</span>,{' '}
            <span className="font-mono">vst_plm</span>, <span className="font-mono">vst_alm</span>{' '}
            and <span className="font-mono">vst_pmo</span> are theirs.{' '}
            <span className="font-mono text-ui-fg">kb</span> is short for{' '}
            <span className="text-ui-fg">knowledge base</span>. So this is the Vantis knowledge
            base: the one database in the estate that was written rather than handed over, and the
            only one the product is allowed to read.
          </>
        }
      />

      <div className="ui-tiles ba-tiles">
        {tables.map((table, i) => (
          <Tile
            key={table.name}
            tone={HUE[table.name]}
            className="estate-land"
            style={{ animationDelay: `${i * 45}ms` }}
            figure={<CylinderGlyph />}
            title={table.name}
            subtitle={`${table.rows.toLocaleString('en-GB')} rows`}
            detail={`${table.columns.length} columns`}
            meta={SOURCE_OF.get(table.name) ? `from ${SOURCE_OF.get(table.name)}` : 'from every file read'}
            onOpen={(el) => setOpened({ kind: 'table', table, from: originOf(el) })}
          />
        ))}
      </div>

      <p className="mt-8 max-w-[68ch] text-xs leading-relaxed text-ui-faint">
        738 of the 1,069 files — the requirements, the source repositories, the releases and the
        ticket export — have produced no rows at all. Those are the four dashed tiles above, and
        they are the next two stages of the work rather than an omission.
      </p>

      {opened?.kind === 'file' && <FileDialog group={opened.group} from={opened.from} onClose={close} />}
      {opened?.kind === 'table' && <TableDialog table={opened.table} from={opened.from} onClose={close} />}
    </section>
  );
}

/**
 * A row's heading — and `sub` exists because of a question a reader asked.
 *
 * "Six tables in vst_derived" told somebody who had not read the plan precisely
 * nothing. A database name is a name, not an explanation, and this one is made
 * of two abbreviations a reader has no way to expand: `vst` is the prefix on
 * every Vantis database and `kb` is short for knowledge base. Both are obvious
 * from the inside and invisible from outside, which is the whole failure mode
 * of writing about your own system.
 */
function RowHead({
  label,
  title,
  figure,
  note,
  sub,
}: {
  label: string;
  title: string;
  figure: string;
  note: string;
  sub?: ReactNode;
}) {
  return (
    <div className="mt-10 mb-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="ba-row-label">{label}</span>
        <h3 className="font-mono text-base font-medium text-ui-fg">{title}</h3>
        <p className="font-mono text-[0.6875rem] text-ui-faint">{figure}</p>
        <p className="ml-auto font-mono text-[0.6875rem] text-ui-faint">counted by {note}</p>
      </div>
      {sub && <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ui-dim">{sub}</p>}
    </div>
  );
}

/**
 * One pile of files, opened.
 *
 * THE EXCERPT IS VERBATIM, TABS AND ALL. Tidying it would be the page doing the
 * one thing the parser must not, and the untidiness is the whole argument: the
 * `#` preamble, the quoted comma in a name, the empty approval column.
 */
function FileDialog({
  group,
  from,
  onClose,
}: {
  group: CorpusGroup;
  from: Origin;
  onClose: () => void;
}) {
  return (
    <OriginDialog
      from={from}
      tone={HUE[group.id]}
      label={`${group.name}, ${group.files} files`}
      onClose={onClose}
      header={
        <>
          <PagesGlyph />
          <div className="min-w-0">
            <p className="font-mono text-base font-medium text-ui-fg">{group.name}</p>
            <p className="text-sm text-ui-dim">{group.what}</p>
          </div>
          <p className="ui-dialog-figs">
            <span>
              <span className="font-mono text-ui-fg">{group.files.toLocaleString('en-GB')}</span> files
            </span>
            <span>
              <span className="font-mono text-ui-fg">{Math.round(group.bytes / 1024).toLocaleString('en-GB')}</span> KB
            </span>
          </p>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-5">
          <div>
            <p className="ba-dialog-label">what is in it</p>
            <ul className="mt-2 grid gap-1.5">
              {group.kinds.map((k) => (
                <li key={k.ext} className="flex items-baseline gap-3 text-xs">
                  <span className="w-12 font-mono text-ui-dim">.{k.ext}</span>
                  <span className="font-mono text-ui-fg">{k.n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="ba-dialog-label">what makes it hard</p>
            <p className="mt-2 text-sm leading-relaxed text-ui-dim">{group.snag}</p>
          </div>

          <div>
            <p className="ba-dialog-label">what it becomes</p>
            <p className="mt-2 text-sm leading-relaxed text-ui-dim">
              {group.produces ? (
                <>
                  Parsed into <span className="font-mono text-ui-fg">{group.produces}</span>, one row
                  per line, each carrying this file and its line number.
                </>
              ) : (
                'Nothing yet. This is prose and code, so it belongs to the chunking and extraction stages, which are not built.'
              )}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="ba-dialog-label">
            one file, first {group.example.lines.length} lines, exactly as it is on disk
          </p>
          <p className="mt-1 font-mono text-[0.6875rem] break-all text-ui-faint">
            {group.example.path}
          </p>
          <pre className="ba-excerpt">
            {group.example.lines.map((line, i) => (
              <span key={i} className="ba-excerpt-line">
                <span className="ba-excerpt-n">{i + 1}</span>
                <span>{line || ' '}</span>
              </span>
            ))}
          </pre>
        </div>
      </div>
    </OriginDialog>
  );
}

