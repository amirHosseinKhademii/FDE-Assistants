/**
 * Inside the index — stage 3.4, and the one line that would cost 36.6 minutes.
 *
 * ── THE FOURTH SIBLING, AND THE ANCHOR IS THE ONE LINE ─────────────────────
 *
 * 3.1's anchor is five lines of code; 3.2's is a ledger; 3.3's is a stopwatch.
 * This one's is a two-line diff, because the whole stage turns on picking the
 * right method off an object:
 *
 *     addVectors(vectors, docs)   insert what we already made
 *     addDocuments(docs)          recompute all of it, silently
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
 * ── CORRECTED 2026-09-27 AGAINST THE CODE AND INDEX.md ─────────────────────
 *
 *   - THE TABLE AS IT IS CREATED. The SQL used to show `vector vector(384)`.
 *     `openStore` passes no dimension to `PGVectorStore.initialize`, so the
 *     column is created UNCONSTRAINED — which is exactly why check 2 exists,
 *     and the old SQL contradicted the panel's own argument for it. The block
 *     now quotes the three places that build the table, including the
 *     `metadata->>'id'` index `loadIntoStore` adds for stage 4;
 *   - THE SIZES are INDEX.md's: 287 MB of table, 295 reported by Postgres, 318
 *     billed by Neon, so 194 MB of real headroom rather than 217. This panel
 *     carried 296 and 319 — what the reload's own printout read a little later
 *     (commit a2280e5), a megabyte either way. The page follows the document.
 *     The "actual" row of the prediction table said 295 for "table + indexes";
 *     that figure is 287;
 *   - THE CHECKS are `cli/index-cli.ts`'s five, in its order and its words, so
 *     "the one with history" is check 2 again, as in INDEX.md;
 *   - THE STREAMING CODE is quoted from `index-store.ts` rather than paraphrased;
 *   - "no vector index … and nothing else" gains the lookup index, and "before
 *     stage 3.5's numbers land" is past: 3.5 and 3.7 ran without one.
 *
 * The load time is the reload's, 147 batches in 1.2 minutes with five checks
 * green; the first load, with four checks, took 1.1.
 *
 * Sources: `docs/safety/INDEX.md`, `apps/ai/safety/src/grounding/index-store.ts`,
 * `apps/ai/safety/src/cli/index-cli.ts`.
 */
import { useCallback, useRef, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import { Code, Data } from '@veresk/surface';
import { HoodButton } from '@veresk/learn/steps';
import { Because } from '@veresk/learn/steps';

const PASSAGES = 73442;
const MB_ON_DISK = 641;
const NEON_FREE_MB = 512;

/**
 * PREDICTED AND ACTUAL, and the gap is the finding.
 *
 * 2,002 bytes a row was extrapolated from the sibling engagement, and that
 * measurement predates the full-text column. The real table is about twice the
 * prediction because `content_ts` and its GIN index were never counted — 69 MB,
 * a quarter of the table, and the price of the keyword arm.
 */
const STORAGE = {
  predictedBytesPerRow: 2002,
  actualBytesPerRow: 4100,
  predictedMb: 140,
  actualMb: 287,
} as const;

/**
 * THREE SIZES, AND ONLY ONE OF THEM IS THE BILL.
 *
 * `pg_total_relation_size` is the table and its indexes. `pg_database_size` is
 * what Postgres reports for the database. `pg_cluster_size` is what NEON
 * BILLS, and it is the largest of the three — so a quota read off either of the
 * first two leaves you thinking there is more headroom than there is.
 *
 * It needs `create extension neon`, which is why nobody reads it by default.
 * Figures are `docs/safety/INDEX.md`'s.
 */
const SIZES = [
  { fn: "pg_total_relation_size('document_chunks')", mb: 287, is: 'the table and its indexes' },
  { fn: 'pg_database_size(current_database())', mb: 295, is: 'what Postgres reports' },
  { fn: 'pg_cluster_size()', mb: 318, is: 'WHAT NEON BILLS — the quota' },
] as const;

const BILLED_MB = 318;
const DB_MB = 295;

/** The real table, column by column. */
const BREAKDOWN = [
  { what: 'vector', mb: 108, note: '384 × 4 bytes = 1,536 a row, exactly as expected' },
  { what: 'content', mb: 44, note: 'the passages themselves' },
  { what: 'metadata', mb: 31, note: 'make, year, severity — what filtering reads' },
  { what: 'content_ts', mb: 52, note: 'NOT COUNTED in the estimate' },
  { what: 'fts GIN index', mb: 17, note: 'nor this' },
] as const;

const BREAKDOWN_MB = BREAKDOWN.reduce((a, b) => a + b.mb, 0);

const n = (x: number) => x.toLocaleString('en-GB');

const KEYS = ['line', 'table', 'stream', 'outside', 'checks'] as const;
type Key = (typeof KEYS)[number];

const LABELS: Record<Key, string> = {
  line: 'Why that line matters',
  table: 'The table',
  stream: 'Streamed in',
  outside: 'Leaving the machine',
  checks: 'The checks',
};

export function IndexModal() {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  return (
    <>
      <HoodButton
        blurb="Inside the index: the one method call that would quietly redo stage 3.3, and what changes once the data leaves this machine"
        onClick={open}
      />
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
      tone="var(--color-cal-sky)"
      onClose={onClose}
      header={
        <>
          <p className="text-[1rem] font-semibold text-ui-fg">Inside the index</p>
          <p className="mt-0.5 text-[0.875rem] text-ui-faint">
            Stage 3.4 · a {MB_ON_DISK} MB file on disk into one Postgres table
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
        <p className="cal-label pb-2" data-tone="quiet">
          The whole stage, in the choice of one method
        </p>
        <pre className="overflow-x-auto rounded-lg border border-ui-line bg-[var(--snip-bg)] px-3.5 py-3 font-mono text-[0.8125rem] leading-[1.8]">
          <div className="flex gap-3 whitespace-pre">
            <span className="text-cal-1" aria-label="right">
              ✓
            </span>
            <span className="text-ui-fg">await store.addVectors(vectors, docs);</span>
            <span className="ml-auto pl-6 font-sans text-ui-faint">insert what we made</span>
          </div>
          <div className="flex gap-3 whitespace-pre">
            <span className="text-ui-faint" aria-label="wrong">
              ✗
            </span>
            <span className="text-ui-dim line-through decoration-ui-faint/60">
              await store.addDocuments(docs);
            </span>
            <span className="ml-auto pl-6 font-sans text-ui-faint">re-embeds — 36.6 min, silently</span>
          </div>
        </pre>

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
        <div className="grid gap-4">
          <p className="cal-hood-text">
            Stage 3.3 left {n(PASSAGES)} lists of numbers in a file. Finding the
            one closest to a question means comparing it against all of them —
            fine once, hopeless for every question anybody asks.
          </p>
          <p className="cal-hood-text">
            This stage moves each passage and its numbers into{' '}
            <span className="text-ui-fg">one row of one database table</span>, so
            the same row can be searched two ways: by meaning, using the numbers,
            and by keyword, using the words. It is also the first stage that sends
            anything off this machine.
          </p>
        </div>

        <Sect k="line" title="Why one method call is the whole stage" refs={sections} active={active}>
          <p className="cal-hood-text">
            The shared package's <code>ingestDocuments</code> calls{' '}
            <code>addDocuments</code>, which works out each passage's numbers as
            it inserts it. That is correct for the callers it was written for:
            they have documents and no numbers yet.
          </p>
          <p className="cal-hood-text">
            Here we have {n(PASSAGES)} sets of numbers that took 36.6 minutes to
            produce. Calling <code>addDocuments</code> would compute every one of
            them a second time.
          </p>
          <Because>
            <span className="text-ui-fg">
              And it would not error, would not look wrong, and would be invisible
              in the row count.
            </span>{' '}
            The table would end up with exactly the right number of exactly the
            right rows. The only evidence would be thirty-six minutes on a clock
            nobody was watching — the same shape as a green check covering an
            assertion that never ran.
          </Because>
        </Sect>

        <Sect k="table" title="One table, two indexes over the same words" refs={sections} active={active}>
          <Code
            path="document_chunks — the statements that build it, from three places"
            lang="sql"
            mark={[5, 9, 10, 11]}
            lines={[
              '-- 1. PGVectorStore.initialize, called by openStore (packages/grounding/src/store.ts)',
              'CREATE TABLE IF NOT EXISTS document_chunks (',
              '  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,',
              '  "content" text,',
              '  "metadata" jsonb,',
              '  "vector" vector',
              ');',
              '',
              '-- 2. ensureFullTextIndex (packages/grounding/src/hybrid.ts)',
              'alter table document_chunks add column if not exists content_ts tsvector',
              "  generated always as (to_tsvector('english', content)) stored;",
              'create index if not exists document_chunks_fts_idx on document_chunks using gin (content_ts);',
              '',
              "-- 3. loadIntoStore, for stage 4's exact lookups (apps/ai/safety/src/grounding/index-store.ts)",
              "create index if not exists document_chunks_id_idx on document_chunks ((metadata->>'id'));",
            ]}
          />
          <p className="cal-hood-text">
            Four columns: the passage itself, its labels as JSON, its 384 numbers,
            and — added afterwards — <code>content_ts</code>, the same words broken
            into a form keyword search can use.
          </p>
          <Because>
            <code>content_ts</code> is a{' '}
            <span className="text-ui-fg">generated column, not a trigger</span>.
            Postgres recomputes it whenever <code>content</code> changes, so it
            cannot drift out of step with the text it describes. A trigger can be
            dropped; a generated column cannot be forgotten.
          </Because>
          <Because>
            <span className="text-ui-fg">Note that the vector column has no size.</span>{' '}
            <code>openStore</code> passes no dimension, so Postgres will accept a
            row of 1,536 numbers beside rows of 384 and fail only later, at query
            time, somewhere else. That is why the second check below exists.
          </Because>
          <p className="cal-hood-text">
            This one table is the entire hybrid idea. <code>vector</code> and{' '}
            <code>content_ts</code> are two indexes over the <em>same</em> words,
            kept because they fail at different things — and this corpus is full
            of what the meaning side is worst at: <code>20V197000</code>,{' '}
            <code>11353867</code>, <code>P0219A</code>, <code>PRNDL</code>.
          </p>
        </Sect>

        <Sect k="stream" title="Streamed in, because 641 MB will not fit in a string" refs={sections} active={active}>
          <p className="cal-hood-text">
            Reading the whole {MB_ON_DISK} MB file in one go builds it as a single
            string on the way in, and{' '}
            <span className="text-ui-fg">the JavaScript engine caps a string at 512 MB</span>
            . The same ceiling applies when writing it, which is why stage 3.3
            writes one record per line in the first place.
          </p>
          <Code
            path="apps/ai/safety/src/grounding/index-store.ts"
            note="One record a line"
            mark={[6]}
            lines={[
              'async function* records(path: string): AsyncGenerator<VectorRecord> {',
              '  const rl = createInterface({',
              "    input: createReadStream(path, { encoding: 'utf8' }),",
              '    crlfDelay: Infinity,',
              '  });',
              '  for await (const line of rl) {',
              '    if (line.trim()) yield JSON.parse(line) as VectorRecord;',
              '  }',
              '}',
            ]}
          />
          <Code
            path="apps/ai/safety/src/grounding/index-store.ts"
            note="Inside loadIntoStore · comments trimmed · BATCH is 500"
            mark={[6, 15]}
            lines={[
              'for await (const rec of records(path)) {',
              '  vectors.push(rec.vector);',
              '  docs.push(',
              '    new Document({',
              '      pageContent: rec.text,',
              '      metadata: {',
              '        chunkId: rec.id,',
              '        id: rec.id,',
              '        documentId: rec.documentId,',
              '        kind: rec.kind,',
              '        startLine: rec.startLine,',
              '        ...rec.meta,',
              '      },',
              '    }),',
              '  );',
              '  if (vectors.length >= BATCH) await flush();',
              '}',
              'await flush();',
            ]}
          />
          <Because>
            One record a line is not tidier than one big JSON array — it is a file
            you can read a piece at a time, in both directions. That is the whole
            reason stage 3.3 writes it that way and this one can read it. The
            marked <code>chunkId</code> line is the one the checks come back to.
          </Because>
        </Sect>

        <Sect k="outside" title="The first stage that leaves this machine" refs={sections} active={active}>
          <p className="cal-hood-text">
            Everything before this ran on one laptop against files.{' '}
            <span className="text-ui-fg">This one opens a connection</span>, which
            makes it the first that can fail for reasons that have nothing to do
            with our code.
          </p>
          <Data
            path="Storage — predicted, then measured"
            note="Out by a factor of two"
            mark={[3]}
            lines={[
              `                       predicted        actual`,
              `per row            ${n(STORAGE.predictedBytesPerRow).padStart(6)} bytes   ~${n(STORAGE.actualBytesPerRow).padStart(5)} bytes`,
              `table + indexes    ${String(STORAGE.predictedMb).padStart(6)} MB      ${String(STORAGE.actualMb).padStart(6)} MB`,
              `what Neon bills                     ${String(BILLED_MB).padStart(6)} MB   → ${Math.round((BILLED_MB / NEON_FREE_MB) * 100)}% of the free tier`,
            ]}
          />
          <p className="cal-hood-text">
            And <span className="text-ui-fg">three numbers describe this table</span>,
            of which only the last is the bill.
          </p>
          <Data
            path="Ask the right function"
            note="docs/safety/INDEX.md · pg_cluster_size needs `create extension neon`"
            mark={[2]}
            lines={SIZES.map((x) => `${x.fn.padEnd(44)}${String(x.mb).padStart(4)} MB   ${x.is}`)}
          />
          <Because>
            A quota read off either of the first two leaves you believing in
            headroom that is not there — {NEON_FREE_MB - DB_MB} MB rather than the
            real {NEON_FREE_MB - BILLED_MB} MB. The one that bills is the one nobody
            reads by default, because it needs an extension installed before it
            answers at all.
          </Because>
          <p className="cal-hood-text">
            The prediction came from the sibling engagement's 2,002 bytes a row,
            and{' '}
            <span className="text-ui-fg">that measurement predates the full-text column</span>
            . The real table says where it went:
          </p>
          <Data
            path="The table, column by column"
            note={`${BREAKDOWN_MB} of the ${STORAGE.actualMb} MB`}
            mark={[3, 4]}
            lines={BREAKDOWN.map((b) => `${b.what.padEnd(16)}${String(b.mb).padStart(4)} MB   ${b.note}`)}
          />
          <Because>
            <span className="text-ui-fg">The keyword side costs 69 MB — a quarter of the table.</span>{' '}
            This panel has been saying that <code>vector</code> and{' '}
            <code>content_ts</code> are two indexes over the same words, which is
            true, and leaving the impression that the second one is free, which is
            not. The hybrid design has a price, and this is the first corpus here
            big enough to see it.
          </Because>
          <Because>
            <span className="text-ui-fg">And there is no vector index.</span> The
            table carries its primary key, the full-text index and — since stage 4
            — the index on <code>metadata-&gt;&gt;'id'</code> for exact lookups,
            and nothing else. <code>openStore</code> creates neither HNSW nor
            IVFFlat, so the meaning side reads all {n(PASSAGES)} rows on every
            question. Stages 3.5 and 3.7 ran that way. Adding one costs storage
            that is now {Math.round((BILLED_MB / NEON_FREE_MB) * 100)}% spent by
            what Neon bills — and, because the column has no fixed size, a rewrite
            of the whole column first, since pgvector will not index a column
            whose size it does not know. So it stays an option to measure rather
            than a default — the same argument as the reranker being a
            before-and-after rather than a habit.
          </Because>

          <p className="cal-hood-text">
            Two hazards come with the connection and both are guarded. Neon
            suspends an idle connection, and a pooler that stops answering without
            closing the socket leaves the process waiting forever —{' '}
            <code>PG_OPTIONS</code> sets <code>keepAlive</code> and timeouts after
            that cost an hour on the sibling engagement. And a partial load looks
            exactly like a complete one: die at row 40,000 and the table has 40,000
            rows and no error anywhere.
          </p>
          <Because>
            A third arrived with the reload.{' '}
            <span className="text-ui-fg">
              <code>DELETE</code> does not return the space
            </span>{' '}
            — it marks {n(PASSAGES)} rows dead and autovacuum decides when, so a
            reload would want a second 287 MB against a 512 MB ceiling. It is{' '}
            <code>TRUNCATE</code> now, and the loader reads{' '}
            <code>pg_cluster_size()</code> afterwards and <em>refuses to start</em>{' '}
            if the space has not come back. A load that runs out of room halfway
            looks exactly like a dropped connection.
          </Because>
        </Sect>

        <Sect k="checks" title="The checks, and the one with history" refs={sections} active={active}>
          <Data
            path="pnpm safety:index — the reload, all five green"
            note="Names and order from cli/index-cli.ts · the first load took 1.1 min"
            mark={[4, 10]}
            lines={[
              `${n(PASSAGES)} rows in 147 batches, 1.2 min`,
              '',
              'ok    every line in the file became a row, counted by wc -l and not by the loader',
              `      wc -l says ${n(PASSAGES)}; the table holds ${n(PASSAGES)}`,
              'ok    one dimension group, 384 — not two',
              `      384 dims × ${n(PASSAGES)}`,
              'ok    ODI 11353867 is in the table with its text intact',
              '      615 chars',
              'ok    content_ts is populated — the keyword arm has something to search',
              `      ${n(PASSAGES)} of ${n(PASSAGES)} rows`,
              'ok    every row carries a distinct chunkId — what fusion deduplicates on',
              `      ${n(PASSAGES)} present, ${n(PASSAGES)} distinct, of ${n(PASSAGES)} rows`,
            ]}
          />
          <Because>
            <span className="text-ui-fg">The second check has history.</span> The
            vector column has no fixed size, so rows of different sizes insert
            happily and fail only at query time, somewhere else, later. Insurance
            hit it when its embedding model changed underneath an existing index;
            pharma hit it again on the deployed app with{' '}
            <code>different vector dimensions 1536 and 384</code>. One group, or
            the load is wrong.
          </Because>
          <Because>
            The first check uses <code>wc -l</code> rather than the loader's own
            tally — the same rule as stage 3.1's <code>awk</code> cross-check.{' '}
            <span className="text-ui-fg">A loader confirming its own row count proves nothing.</span>
          </Because>
          <Because>
            The fifth is newer than the rest and exists because of what stage 3.6
            found: search uses <code>chunkId</code> to tell passages apart, and
            without it 174 different complaints with the same opening line were
            merged into one result. So the check asks{' '}
            <span className="text-ui-fg">Postgres, in SQL</span>, whether every
            row carries a distinct one. The loader writes that field and is not
            consulted about whether it did.
          </Because>
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
