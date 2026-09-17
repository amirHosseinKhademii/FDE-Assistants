/**
 * Inside the index — stage 3.4, and the one line that would cost 36.6 minutes.
 *
 * ── THE FOURTH SIBLING, AND THE ANCHOR IS THE ONE LINE ─────────────────────
 *
 * 3.1's anchor is five lines of code; 3.2's is a ledger; 3.3's is a stopwatch.
 * This one's is a two-line diff, because the whole stage turns on picking the
 * right method off an object:
 *
 *     addVectors(vectors, documents)   insert what we already made
 *     addDocuments(documents)          recompute all of it, silently
 *
 * `@fde/grounding`'s `ingestDocuments` calls the second, and is right to — it
 * is for callers who have documents and no vectors. Here it would throw away
 * 36.6 minutes of work without erroring, without looking wrong, and without
 * changing the row count. There is no shape of failure that hides better.
 *
 * ── AND IT IS THE FIRST STAGE THAT LEAVES THE MACHINE ──────────────────────
 *
 * Everything before this runs on one laptop against files. This one opens a
 * connection, which makes it the first that can fail for reasons that have
 * nothing to do with our code — so the hazards section is not padding, it is
 * the new half of the stage.
 *
 * Source: `docs/safety/INDEX.md`.
 */
import { useCallback, useRef, useState } from 'react';
import { Mono, OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';

const PASSAGES = 73442;
const MB_ON_DISK = 641;
const NEON_FREE_MB = 512;

/**
 * PREDICTED AND ACTUAL, and the gap is the finding.
 *
 * 2,002 bytes a row was extrapolated from the sibling engagement, and that
 * measurement predates the full-text column. The real table is more than twice
 * the prediction because `content_ts` and its GIN index were never counted —
 * 69 MB, a quarter of the table, and the price of the keyword arm.
 */
const STORAGE = {
  predictedBytesPerRow: 2002,
  actualBytesPerRow: 4100,
  predictedMb: 140,
  actualMb: 295,
} as const;

/**
 * THREE SIZES, AND ONLY ONE OF THEM IS THE BILL.
 *
 * `pg_total_relation_size` is the table and its indexes. `pg_database_size` is
 * what Postgres reports for the database. `pg_cluster_size` is what NEON
 * BILLS, and it is the largest of the three — so a quota read off either of the
 * first two leaves you thinking there is more headroom than there is.
 *
 * It needs `create extension neon`, which is why nobody reads it by default and
 * why the number on this page was 295 for a while.
 */
const SIZES = [
  { fn: "pg_total_relation_size('document_chunks')", mb: 287, is: 'table + indexes' },
  { fn: 'pg_database_size(current_database())', mb: 296, is: 'what Postgres reports' },
  { fn: 'pg_cluster_size()', mb: 319, is: 'WHAT NEON BILLS — the quota' },
] as const;

const BILLED_MB = 319;

/** The real table, broken down. `heap 112 MB · indexes 20 MB` of a 287 MB total. */
const BREAKDOWN = [
  { what: 'vector', mb: 108, note: '384 × 4 bytes = 1,536/row, exactly as expected' },
  { what: 'content', mb: 44, note: 'the passages themselves' },
  { what: 'metadata', mb: 31, note: 'make, year, severity — what filtering reads' },
  { what: 'content_ts', mb: 52, note: 'NOT COUNTED in the estimate' },
  { what: 'fts GIN index', mb: 17, note: 'nor this' },
] as const;

const KEYS = ['line', 'table', 'stream', 'outside', 'checks'] as const;
type Key = (typeof KEYS)[number];

export function IndexModal() {
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
          Inside the index — the one method call that would quietly redo stage
          3.3, and the hazards of leaving the machine
        </span>
        <span className="font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && <IndexPanel from={from} onClose={() => setFrom(null)} />}
    </>
  );
}

function IndexPanel({ from, onClose }: { from: Origin; onClose: () => void }) {
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
      label="Inside the index"
      tone="var(--color-cal-2)"
      onClose={onClose}
      header={
        <>
          <p className="font-mono text-sm text-ui-fg">Inside the index</p>
          <p className="mt-0.5 text-[0.75rem] text-ui-faint">
            stage 3.4 · {MB_ON_DISK} MB on disk → one Postgres table
          </p>
        </>
      }
    >
      {/* THE ANCHOR IS THE DIFF, because the stage turns on picking one method
          over another and the wrong one costs 36.6 minutes without erring. */}
      <div
        ref={sticky}
        className="sticky -top-3.5 z-20 -mx-5 -mt-3.5 mb-7 border-b border-ui-line bg-ui-bg px-5 pt-3.5 pb-3"
      >
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          the whole stage, in the choice of one method
        </p>
        <pre className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] p-3.5 font-mono text-[0.6875rem] leading-[1.8]">
          <div className="flex gap-3 whitespace-pre">
            <span style={{ color: 'var(--color-cal-1)' }}>✓</span>
            <span className="text-ui-fg">
              await store.addVectors(vectors, documents);
            </span>
            <span className="ml-auto pl-6 text-ui-faint">insert what we made</span>
          </div>
          <div className="flex gap-3 whitespace-pre opacity-70">
            <span className="text-ui-faint">✗</span>
            <span className="text-ui-dim">await store.addDocuments(documents);</span>
            <span className="ml-auto pl-6 text-ui-faint">re-embeds — 36.6 min, silently</span>
          </div>
        </pre>

        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {(
            [
              ['line', 'why that line matters'],
              ['table', 'the table'],
              ['stream', 'streamed in'],
              ['outside', 'leaving the machine'],
              ['checks', 'the checks'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.625rem] transition-colors ${
                active === k
                  ? 'border-cal-2 bg-cal-2/20 text-ui-fg'
                  : 'border-ui-line text-ui-faint hover:border-cal-2/50 hover:text-ui-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-9 pb-2">
        <Sect k="line" title="Why one method call is the whole stage" refs={sections} active={active}>
          <P>
            <Mono>@fde/grounding</Mono>'s <Mono>ingestDocuments</Mono> calls{' '}
            <Mono>addDocuments</Mono>, which embeds as it inserts. That is
            correct, and it is correct for the callers it was written for: they
            have documents and no vectors.
          </P>
          <P>
            Here we have {PASSAGES.toLocaleString('en-GB')} vectors that cost
            36.6 minutes to produce. Calling <Mono>addDocuments</Mono> would
            compute every one of them a second time.
          </P>
          <Aside>
            <span className="text-ui-fg">
              And it would not error, would not look wrong, and would be
              invisible in the row count.
            </span>{' '}
            The table would end up with exactly the right number of exactly the
            right rows. The only evidence would be thirty-six minutes on a clock
            nobody was watching — which is the same shape as a green check
            covering an assertion that never ran.
          </Aside>
        </Sect>

        <Sect k="table" title="One table, two indexes over the same words" refs={sections} active={active}>
          <Code
            path="the whole store"
            lang="sql"
            mark={[3, 4]}
            lines={[
              'CREATE TABLE document_chunks (',
              '  id        uuid PRIMARY KEY,',
              '  content   text,          -- the passage, for reading and quoting',
              '  vector    vector(384),   -- for MEANING   → 3.5 arm A',
              '  metadata  jsonb          -- for FILTERING → make, year, deaths',
              ');',
              '',
              'ALTER TABLE document_chunks ADD COLUMN content_ts tsvector',
              "  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;",
              '',
              'CREATE INDEX document_chunks_fts_idx ON document_chunks USING gin (content_ts);',
            ]}
          />
          <Aside>
            <Mono>content_ts</Mono> is a <span className="text-ui-fg">generated
            column, not a trigger</span>. Postgres recomputes it whenever{' '}
            <Mono>content</Mono> changes, so it cannot drift out of step with the
            text it describes. A trigger can be dropped; a generated column
            cannot be forgotten.
          </Aside>
          <P>
            This one table is the entire hybrid idea. <Mono>vector</Mono> and{' '}
            <Mono>content_ts</Mono> are two indexes over the <em>same</em> words,
            kept because they fail at different things — and this corpus is full
            of what the vector arm is worst at: <Mono>20V197000</Mono>,{' '}
            <Mono>11353867</Mono>, <Mono>P0219A</Mono>, <Mono>PRNDL</Mono>.
          </P>
        </Sect>

        <Sect k="stream" title="Streamed in, because 641 MB will not fit in a string" refs={sections} active={active}>
          <P>
            <Mono>JSON.parse(readFileSync(…))</Mono> on a {MB_ON_DISK} MB file
            builds the whole thing as one string on the way in, and{' '}
            <span className="text-ui-fg">V8 caps a string at 512 MB</span>. The
            same ceiling applies writing it, which is why stage 3.3 emits NDJSON
            in the first place.
          </P>
          <Code
            path="line by line, in batches"
            mark={[2]}
            lines={[
              'for await (const line of lines(VECTORS_NDJSON)) {',
              '  batch.push(JSON.parse(line));',
              '  if (batch.length === 500) await flush();',
              '}',
            ]}
          />
          <Aside>
            NDJSON is not tidier than JSON — it is a file you can read a piece
            at a time, in both directions. That is the whole reason stage 3.3
            writes it and this one can read it.
          </Aside>
        </Sect>

        <Sect k="outside" title="The first stage that leaves this machine" refs={sections} active={active}>
          <P>
            Everything before this ran on one laptop against files.{' '}
            <span className="text-ui-fg">
              This one opens a connection
            </span>
            , which makes it the first that can fail for reasons that have
            nothing to do with our code.
          </P>
          <Data
            path="storage — predicted, then measured"
            note="the prediction was 2.1x out"
            mark={[3]}
            lines={[
              `                       predicted        actual`,
              `per row            ${String(STORAGE.predictedBytesPerRow).padStart(6)} bytes   ~${String(STORAGE.actualBytesPerRow).padStart(5)} bytes`,
              `table + indexes    ${String(STORAGE.predictedMb).padStart(6)} MB      ${String(STORAGE.actualMb).padStart(6)} MB`,
              `what Neon bills                     ${String(BILLED_MB).padStart(6)} MB   → ${Math.round((BILLED_MB / NEON_FREE_MB) * 100)}% of the free tier`,
            ]}
          />
          <P>
            And <span className="text-ui-fg">three numbers describe this table</span>,
            of which only the last is the bill.
          </P>
          <Data
            path="ask the right function"
            note="pg_cluster_size needs `create extension neon`"
            mark={[2]}
            lines={SIZES.map((x) => `${x.fn.padEnd(44)}${String(x.mb).padStart(4)} MB   ${x.is}`)}
          />
          <Aside>
            A quota read off either of the first two leaves you believing in
            headroom that is not there — 216 MB rather than the real{' '}
            {NEON_FREE_MB - BILLED_MB} MB. The one that bills is the one nobody
            reads by default, because it needs an extension installed before it
            answers at all.
          </Aside>
          <P>
            The prediction came from the sibling engagement's 2,002 bytes a row,
            and{' '}
            <span className="text-ui-fg">
              that measurement predates the full-text column
            </span>
            . The real table says where it went:
          </P>
          <Data
            path="the table, broken down"
            note="287 MB · heap 112 · indexes 20"
            mark={[3, 4]}
            lines={BREAKDOWN.map(
              (b) => `${b.what.padEnd(16)}${String(b.mb).padStart(4)} MB   ${b.note}`,
            )}
          />
          <Aside>
            <span className="text-ui-fg">
              The keyword arm costs 69 MB — a quarter of the table.
            </span>{' '}
            This panel has been saying that <Mono>vector</Mono> and{' '}
            <Mono>content_ts</Mono> are two indexes over the same words, which is
            true, and leaving the impression that the second one is free, which
            is not. The hybrid design has a price and this is the first corpus
            here big enough to see it.
          </Aside>
          <Aside>
            <span className="text-ui-fg">And there is no vector index.</span>{' '}
            The table carries <Mono>document_chunks_pkey</Mono> and the full-text
            GIN index and nothing else — <Mono>openStore</Mono> creates neither
            HNSW nor IVFFlat, so the meaning arm is a sequential scan over{' '}
            {PASSAGES.toLocaleString('en-GB')} rows. Workable at this size and
            worth knowing before stage 3.5's numbers land: if the dense arm is
            slow, that is why, and it is a property of the store rather than of
            the corpus. Adding one costs storage that is now 58% spent, so the
            right order is to measure 3.5 without it and let the number decide —
            the same argument as the reranker being a delta rather than a
            default.
          </Aside>

          <P>
            Two hazards come with the connection and both are already guarded.
            Neon suspends an idle connection, and a pooler that stops answering
            without a FIN leaves the process waiting forever —{' '}
            <Mono>PG_OPTIONS</Mono> sets <Mono>keepAlive</Mono> and timeouts
            after that cost an hour on the sibling engagement. And a partial load
            looks exactly like a complete one: die at row 40,000 and the table
            has 40,000 rows and no error anywhere.
          </P>
          <Aside>
            A third arrived with the reload.{' '}
            <span className="text-ui-fg">
              <Mono>DELETE</Mono> does not return the space
            </span>{' '}
            — it marks 73,442 rows dead and autovacuum decides when, so a reload
            would want a second 287 MB against a 512 MB ceiling. It is{' '}
            <Mono>TRUNCATE</Mono> now, and the loader reads{' '}
            <Mono>pg_cluster_size()</Mono> afterwards and{' '}
            <em>refuses to start</em> if the space has not come back. A load that
            runs out of room halfway looks exactly like a dropped connection.
          </Aside>
        </Sect>

        <Sect k="checks" title="The checks, and the one with history" refs={sections} active={active}>
          <Code
            path="pnpm safety:index — all five green"
            lang="text"
            note="it has run — 147 batches, 1.2 min"
            mark={[2, 6]}
            lines={[
              `${PASSAGES.toLocaleString('en-GB')} rows in document_chunks, in 1.2 min`,
              '',
              'ok  the row count matches the file, counted with wc -l and not by the loader',
              'ok  ODI 11353867 is in the table, 615 characters intact',
              'ok  content_ts is populated on every row',
              'ok  one dimension group: 384. Not two.',
              'ok  73,442 present, 73,442 distinct chunkIds, of 73,442 rows',
            ]}
          />
          <Aside>
            <span className="text-ui-fg">The last one has history.</span>{' '}
            <Mono>PGVectorStore</Mono> creates an <em>unconstrained</em>{' '}
            <Mono>vector</Mono> column, so rows of different dimensions insert
            happily and fail only at query time, somewhere else, later. Insurance
            hit it when <Mono>EMBEDDINGS</Mono> changed underneath an existing
            index; pharma hit it again on the deployed app with{' '}
            <Mono>different vector dimensions 1536 and 384</Mono>. One group, or
            the load is wrong.
          </Aside>
          <Aside>
            And the first uses <Mono>wc -l</Mono> rather than the loader's own
            tally — the same rule as stage 3.1's <Mono>awk</Mono> cross-check.{' '}
            <span className="text-ui-fg">
              A loader confirming its own row count proves nothing.
            </span>
          </Aside>
          <Aside>
            The fifth is newer than the rest and exists because of what stage 3.6
            found: it asks <span className="text-ui-fg">Postgres, in SQL</span>,
            whether every row carries a distinct <Mono>chunkId</Mono>. The loader
            writes that field and is not consulted about whether it did.
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
