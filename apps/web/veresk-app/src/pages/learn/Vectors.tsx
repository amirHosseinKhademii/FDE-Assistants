/**
 * Lesson 1 — an embedding is a list of numbers.
 *
 * A READING OF `docs/RETRIEVAL.md` APPENDIX A, which is the from-scratch half
 * of that document. Everything numeric below is from there or from the run it
 * records; nothing on this page was measured by this page.
 *
 * WHY THIS IS LESSON ONE. Every other lesson assumes you know what "similar"
 * means to a machine. Without it, "the dense arm returned nothing" is a
 * sentence about magic, and lesson 2 is the one that matters.
 *
 * THE ONE INVENTED THING ON THE PAGE IS THE VECTOR LAB, and it is labelled as
 * an illustration where every other figure is labelled with the command that
 * reprints it. See the component's own header.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { VectorLab } from '../../components/learn/charts/VectorLab';

export function Vectors() {
  return (
    <LessonPage slug="vectors">
      <Step n={1} title="A passage goes in, a fixed-length list of numbers comes out">
        <P>
          You hand a passage to an embedding model and it hands back a list of numbers. Always the same
          length, whether the passage is six words or six hundred. That list is the{' '}
          <Term def="The fixed-length list of numbers a model produces for a passage. Its direction carries the meaning; no single number in it means anything.">
            embedding
          </Term>
          .
        </P>
        <P>
          <strong className="font-medium text-ui-fg">No individual number means anything.</strong> There is
          no “cost” dimension or “vehicle” dimension you could look up. What carries the meaning is the
          direction the whole list points in, taken together — which is why the width below is a property of
          the model you chose and not of your documents.
        </P>

        <Figure
          title="How many numbers, per passage"
          sub="The two models this repo can embed with. Width is fixed by the model, not by the length of the passage."
          source={
            <>
              docs/RETRIEVAL.md § A.1. The hosted model is the default;{' '}
              <span className="text-ui-dim">bge-small</span> is the local one, used where nothing may leave
              the machine.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'text-embedding-3-small', value: 1536, display: '1,536', note: 'hosted · the default' },
              { label: 'local bge-small', value: 384, display: '384', note: 'on-machine · nothing leaves' },
            ]}
            unit="numbers"
            labelWidth={220}
          />
        </Figure>

        <HowItWorks
          title="How a pile of passages becomes a pile of vectors"
          shape="assembled"
          path="packages/grounding/src/embeddings.ts:74–92"
          plain={[
            'Embedding is a network call, and a corpus is thousands of passages. Sending them one at a time would be thousands of round trips; sending them all at once would be one request too large to accept.',
            'So they go in batches of 96. That number is the only thing this file decides — everything else is bookkeeping around somebody else\u2019s API.',
            'The bookkeeping that matters is ORDER. A provider returns a batch\u2019s vectors as a list, and if that list is stitched back in the wrong order, every passage gets somebody else\u2019s embedding. Nothing errors. Search simply returns the wrong passage, plausibly, forever.',
            'Tokens are added up across batches rather than read off the last reply, because the last reply only knows about the last 96.',
          ]}
          lines={[
            'for (let i = 0; i < texts.length; i += this.batchSize) {',
            '  const res = await this.call(texts.slice(i, i + this.batchSize));',
            '  this.onBatch?.(res.promptTokens);',
            '  out.push(...res.vectors);',
            '}',
          ]}
          mark={[1, 3]}
          says={[
            { at: 'i += this.batchSize', is: '96 at a time, which is a default this file owns rather than inherits.' },
            { at: 'texts.slice(i, i + …)', is: 'The slice keeps the input order, and push keeps the output order. The two together are the whole correctness argument.' },
            { at: 'this.onBatch?.(…)', is: 'Prompt tokens are reported PER BATCH and accumulated by the caller.' },
          ]}
          trap="A caller that read the token count off the final response undercounted the whole ingest by every batch but the last — a cost figure that was wrong in the safe-looking direction, which is the direction nobody checks."
        />

        <Key>
          The width is a decision about where the model runs, not about what the documents say. Four times the
          numbers is four times the storage and none of the meaning.
        </Key>
      </Step>

      <Step n={2} title="“Search” becomes: which of these arrows points most like mine">
        <P>
          Once every passage is an arrow, a question is just another arrow — embed it the same way — and
          searching means finding the nearest arrows. Nearest by <em className="not-italic text-ui-fg">angle</em>,
          not by length: a long passage and a short one about the same thing produce arrows of different
          lengths but similar direction, and measuring length would rank by how much text there is.
        </P>

        <Figure
          title="Drag the question. The ranking underneath reorders."
          sub="Three passages, placed by hand, and one question you can move. The number is cosine similarity — 1.000 is the same direction, 0.000 is at right angles."
          kind="illustration"
          source={
            <>
              The three passages were placed by hand at angles chosen to make the idea visible; nothing here
              was embedded and no model was called. The arithmetic is real — it is the cosine definition — and
              the positions are not. Every other figure in this section is a number the repo measured, with
              the command that reprints it underneath.
            </>
          }
        >
          <VectorLab
            passages={[
              { label: 'rental reimbursement $40/day', v: [0.80, 0.60] },
              { label: 'we pay for a hire car while yours is repaired', v: [0.66, 0.75] },
              { label: 'collision deductible $1,000', v: [0.99, 0.14] },
            ]}
          />
        </Figure>

        <P>
          The first two sentences share almost no words and point almost the same way. The third shares the
          shape of a policy clause and points somewhere else entirely. That is the whole trick, and it was
          trained into the model long before your corpus existed.
        </P>

        <Data
          path="docs/RETRIEVAL.md § A.2 — the distance scale"
          note="cosine distance, as pgvector reports it"
          lines={[
            'cosine distance = 0.0   same direction          → as good as identical',
            '                = 0.3   pointing roughly alike  → related',
            '                = 1.0   at right angles         → unrelated',
            '                = 2.0   opposite                → (rare in practice)',
          ]}
          mark={[2]}
        />
      </Step>

      <Step n={3} title="In Postgres it is one ordinary query">
        <P>
          There is no separate search engine here. The vectors are a column in a Postgres table, cosine
          distance is an operator, and “vector search” is <code className="font-mono text-ui-fg">ORDER BY … LIMIT</code>{' '}
          — the same shape as any query you have ever written.
        </P>

        <Code
          path="packages/grounding/src/hybrid.ts:195–197"
          note="the dense arm, in full"
          lines={[
            'const depth = k * (opts.overFetch ?? 4);',
            '',
            'const densePromise = store.similaritySearchWithScore(query, depth, filter);',
          ]}
          mark={[2]}
        />

        <Code
          path="docs/RETRIEVAL.md § A.2"
          note="what that call issues underneath — pgvector, not us"
          lines={[
            'SELECT content, metadata',
            '  FROM document_chunks',
            ' ORDER BY vector <=> $1      -- $1 is the question’s 1536 numbers',
            ' LIMIT 120;',
          ]}
          mark={[2]}
        />

        <P>
          The tool reports <code className="font-mono text-ui-fg">1 - distance</code> so that bigger means
          closer, because a number that goes <em className="not-italic text-ui-fg">down</em> as things get
          better reads backwards to everyone.
        </P>

        <Figure
          title="What that looks like on a real question"
          sub="“Rental car limit”, against the insurance corpus. Five forms, five near-identical scores — which is the problem lesson 2 opens with."
          source={
            <>
              docs/evals/README.md — “retrieval equivalence, checked directly”. Reproduced exactly across the
              hand-rolled → LangChain swap, which is what made that swap provably neutral.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'PA-2023-01', value: 0.569, display: '0.569', note: 'Part IV > 4.4 Rental Reimbursement' },
              { label: 'PA-2021-07', value: 0.562, display: '0.562', note: 'Part IV > 4.4 Rental Reimbursement' },
              { label: 'PA-2023-01-CA', value: 0.559, display: '0.559', note: 'Part IV > 4.4 Rental Reimbursement' },
              { label: 'PA-2022-04', value: 0.559, display: '0.559', note: 'Part IV > 4.4 Rental Reimbursement' },
              { label: 'PA-2023-01-FL', value: 0.550, display: '0.550', note: 'Part IV > 4.4 Rental Reimbursement' },
            ]}
            max={0.6}
            labelWidth={150}
            axis="0 → 0.600 similarity"
          />
        </Figure>

        <Key>
          Nineteen thousandths separate the best match from the fifth. Similarity ranks how topical a passage
          is; it has no opinion about which of five near-identical forms actually governs this policyholder.
        </Key>
      </Step>

      <Step n={4} title="So what is a “vector database”?">
        <P>
          A column, an operator, and — optionally — an index over it. This repo has the first two and has
          deliberately not built the third, and the reason is measured rather than believed.
        </P>

        <Figure
          title="Exact scan against an approximate index — one run, and the timings are the stable half"
          sub="Steering's corpus: 3,854 passages, 23 MB of vectors. The exact scan is the ground truth, so its recall is 100% by definition."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:index-bench</span> — one run, 2026-09-14, recorded
              in docs/RETRIEVAL.md § A.4.2. The benchmark copies the chunk table, builds HNSW three times and
              reports the spread; the live table is read and never written.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'exact scan — what ships', value: 19.2, display: '19.2', note: '100% recall, by definition' },
              { label: 'HNSW ef_search=40 (default)', value: 0.9, display: '0.9', note: '98.4% recall on this build' },
              { label: 'HNSW ef_search=64', value: 1.1, display: '1.1', note: '99.7%' },
              { label: 'HNSW ef_search=128', value: 1.5, display: '1.5', note: '100.0%' },
            ]}
            unit="ms"
            labelWidth={240}
            axis="server-side time, 0 → 19.2 ms"
          />
        </Figure>

        <P>
          Twenty times faster, and it still does not earn its place — because the 18 ms saved sits behind a{' '}
          <strong className="font-medium text-ui-fg">118 ms network floor</strong> to the database. It is 15%
          of one query, inside a request that also spends an embedding call and a model turn. Nobody can
          perceive it.
        </P>

        <P>
          And the recall is not free, not stable, and the table above is a good day. Across{' '}
          <strong className="font-medium text-ui-fg">14 controlled builds over byte-identical rows</strong>,
          recall at the default <code className="font-mono text-ui-fg">ef_search</code> ranged from 67.2% to
          97.9% — and only 4 of the 14 cleared 86%.
        </P>

        <Figure
          title="The same index, rebuilt: where the recall actually lands"
          sub="Worst–best across 14 builds over identical rows. A rebuild is not a rare event — it is what happens after every re-ingest."
          source={
            <>
              docs/RETRIEVAL.md § A.4.2. Ruled out as a cause: parallel build — forcing{' '}
              <span className="text-ui-dim">max_parallel_maintenance_workers = 0</span> left the spread
              unchanged. The verdict does not depend on the mechanism, only on the spread.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'HNSW, default ef_search',
                value: 82.6,
                display: '67.2 – 97.9',
                range: [67.2, 97.9],
                note: 'only 4 of 14 builds cleared 86%',
              },
              { label: 'exact scan', value: 100, display: '100', note: 'the same every time' },
            ]}
            max={100}
            unit="% recall@32"
            labelWidth={220}
            axis="0 → 100% recall@32"
          />
        </Figure>

        <HowItWorks
          title="How the benchmark avoids proving what it set out to prove"
          shape="assembled"
          path="packages/grounding/src/index-bench.ts"
          plain={[
            'A benchmark is code, and it fails the same ways other code fails. This one was wrong four separate times before it was right, and every failure was in the measurement rather than in the thing measured.',
            'It copies the chunk table, pins the vector dimension ON THE COPY, builds the index three times, and drops the copy in a finally. The live table is read and never written.',
            'Three builds, because one build is a sample of one presented as a property of the index — and the recall column turned out to be the unstable one.',
            'The verdict is computed from the two thresholds that decide it, so the command will say BUILD IT on its own the day they move, rather than restating today\u2019s conclusion forever.',
          ]}
          lines={[
            '-- what the bench does NOT do any more, and why:',
            '',
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS …   -- ← removed',
            '  a failed CONCURRENTLY build leaves an INVALID index in the',
            '  catalogue (pg_index.indisvalid = false). The next run sees the',
            '  NAME, skips, and RETURNS SUCCESS.',
            '',
            'SET enable_seqscan = off;                   -- ← a measuring instrument',
            '  without it the planner chose a sequential scan, so "HNSW recall"',
            '  was measured against HNSW-shaped seq scans and came out 100%.',
          ]}
          mark={[2, 7]}
          says={[
            { at: 'CREATE INDEX CONCURRENTLY', is: 'Reported "IVFFlat built fine" for an index that had not built at all. Plain CREATE INDEX now, with the reason at the line.' },
            { at: 'enable_seqscan = off', is: 'Leaving it out made a test that could only pass. A check that cannot fail reads like evidence and proves nothing.' },
          ]}
          trap="Two more: a script running Promise.all over ONE pg client pipelined queries onto a connection that cannot interleave them, and produced \u201cthe planner refuses the index\u201d \u2014 it does not. And \u201cgraph construction varies because of parallel workers\u201d was a plausible mechanism attached to a real observation that the run data did not support. Four wrong readings, one real finding."
        />

        <Key>
          Approximate search trades correctness for speed. Buy that trade when you have the scale problem, not
          before — and the reason this is a conclusion rather than an opinion is that a command prints it and
          will say <em className="not-italic text-ui-fg">build it</em> on its own the day the thresholds move.
        </Key>
      </Step>

      <Step n={5} title="The size of the thing being scanned, for scale">
        <P>
          Three corpora, all exactly scanned, none of them large. The arithmetic is rows × 1,536 floats × 4
          bytes, and the largest is 23 MB.
        </P>

        <Figure
          title="Vectors held, per corpus"
          sub="An exact scan reads all of it. 3,854 rows is 19 ms; the other two are not measurable."
          source={
            <>
              docs/RETRIEVAL.md § 8 and § A.4.2, re-measured 2026-09-14 with{' '}
              <span className="text-ui-dim">pnpm --filter &lt;pkg&gt; chunks</span> — offline, free, nothing
              embedded.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'steering', value: 23, display: '≈ 23 MB', note: '3,854 passages · 922 documents' },
              { label: 'insurance', value: 3.4, display: '≈ 3.4 MB', note: '555 passages · 79 documents' },
              { label: 'pharma', value: 0.5, display: '≈ 0.5 MB', note: '75 passages · 5 documents' },
            ]}
            labelWidth={130}
            axis="0 → 23 MB of vectors"
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          {
            cmd: 'pnpm --filter @claims/insurance chunks',
            does: 'Chunks the corpus at four budgets and prints the counts. Nothing is embedded.',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:index-bench',
            does: 'The exact-vs-HNSW benchmark above, including the verdict computed from the two thresholds that decide it.',
            cost: 'index',
          },
          {
            cmd: 'pnpm query "rental car limit" --form "PP 03 24 06 24"',
            does: 'One real hybrid search, printing what came back and at what score.',
            cost: 'money',
          },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'The arrows in the lab are drawn, not embedded.',
            body: 'Three hand-placed 2-D vectors. A real embedding of those three sentences lands somewhere else, in 1,536 dimensions, and nobody can draw it. The cosine arithmetic is the real formula; the positions are a teaching aid.',
          },
          {
            claim: 'A high similarity is not evidence the answer is present.',
            body: 'Measured directly on the predecessor system: an unanswerable question scored 0.572 while an answerable one scored 0.472. That is why there is no score cutoff anywhere in this pipeline — see lesson 2.',
          },
          {
            claim: 'The index benchmark is one corpus on one day.',
            body: 'The verdict is “not yet, at this size, at this distance” — not “approximate indexes are bad”. A corpus 10× this one, or co-located compute that removes the 118 ms round trip, flips it.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'embedding', def: 'The fixed-length list of numbers a model produces for a passage. 1,536 for text-embedding-3-small, 384 for local bge-small.' },
          { word: 'cosine distance', def: 'The angle between two embeddings, ignoring their lengths. 0 is the same direction, 1 is at right angles. Postgres writes it <=>.' },
          { word: 'pgvector', def: 'The Postgres extension that adds a vector column type and the distance operators. Not a separate database.' },
          { word: 'HNSW', def: 'An approximate nearest-neighbour index. Much faster, and it returns an approximation — which is what makes it a trade rather than a free win.' },
          { word: 'recall@k', def: 'Of the passages that should have been in the top k, how many were. The exact scan is 100% by definition, because it is the ground truth.' },
        ]}
      />
    </LessonPage>
  );
}
