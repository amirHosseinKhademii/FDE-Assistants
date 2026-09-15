/**
 * Lesson 2 — finding the passage, and knowing you have not.
 *
 * A READING OF `docs/RETRIEVAL.md` §2–§5 AND `docs/steering/evals/RETRIEVAL.md`.
 * The second of those is the only measured retrieval evaluation in the repo, so
 * every recall number on this page is steering's; insurance has none, and the
 * caveat at the foot says so rather than borrowing one.
 *
 * WHY THE RERANKER SECTION KEEPS ITS LOSS. `ret-008` got worse. It is drawn in
 * the same hue as the two gains, differing only in the direction of its line,
 * because it is the honest cost of a stage that is off by default — and a page
 * that showed only the two wins would be advertising a stage this repo decided
 * not to ship.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Data, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Slope } from '../../components/learn/charts/Slope';
import { Stages } from '../../components/learn/charts/Stages';

export function Retrieval() {
  return (
    <LessonPage slug="retrieval">
      <Step n={1} title="Before anything is searched, it is cut up">
        <P>
          A document is not searchable. A <Term def="A passage of roughly 1,200 characters, carrying the trail of headings above it and the line it starts on.">chunk</Term>{' '}
          is. The pipeline below runs once per ingest, and every rule in it was set by something that went
          wrong.
        </P>

        <Figure
          title="Ingest — what comes out of each stage"
          sub="The verbs are on the left; the boxes are the shape of the data between them, which is the part that is hard to picture."
          source="docs/RETRIEVAL.md §2–§3. The chunker is the highest-leverage file in the path and is deliberately not a library's."
        >
          <Stages
            stages={[
              {
                verb: 'load',
                out: 'Document { id, text, hash }',
                does: 'An allow-list of extensions; anything unreadable is skipped rather than half-parsed.',
                rule: 'id is the path and hash is the content — so a re-ingest can tell "changed" from "moved".',
              },
              {
                verb: 'parse',
                out: 'SourceDocument { docType, status, effectiveOn, facets }',
                does: 'A markdown AST gives where the headings are and where the tables are. A blockquote banner gives the precedence metadata.',
                rule: 'Those fields are nullable, and both gates later let null pass. A missing value is not evidence of the wrong type.',
              },
              {
                verb: 'chunk',
                out: 'Chunk { text = "trail\\n\\nbody", headings[], startLine }',
                does: 'Split on headings first, then window at ~1,200 characters. A table is never split from its header row.',
                rule: 'startLine is recorded so a citation can point at a line. It was once written as 1, four times out of five, because the parse knew where a chunk started and threw it away.',
              },
              {
                verb: 'embed',
                out: 'number[] + metadata',
                does: 'Batches of 96, one vector per chunk. Lesson 1 is what this produces.',
              },
              {
                verb: 'index',
                out: 'document_chunks — vector, content, metadata, content_ts',
                does: 'One Postgres table. The dense arm reads the vector column; the keyword arm reads a generated tsvector with a GIN index on it.',
                rule: 'The keyword arm IS indexed and the vector arm is not — the asymmetry is measured, not an oversight. See lesson 1.',
              },
            ]}
          />
        </Figure>

        <HowItWorks
          title="How a chunk keeps track of where it came from"
          path="packages/grounding/src/chunker.ts"
          plain={[
            'A document is split on its headings first, because a heading is the author\u2019s own statement about where one idea ends. Only if a section is still too long is it windowed at about 1,200 characters.',
            'Every chunk carries the TRAIL of headings above it, and the text that gets embedded is that trail followed by the body. So \u201c4.4 Rental Reimbursement\u201d is searchable even when the paragraph underneath never repeats the words.',
            'A table is never split from its header row. A row of numbers with no column names is worse than no row at all, because it reads as an answer.',
            'And the line the chunk starts on is recorded, so a citation can point at a line rather than at a document.',
          ]}
          lines={[
            'export interface Chunk {',
            '  headings: string[];',
            '  /** The text actually embedded: heading trail + body. */',
            '  text: string;',
            '  body: string;',
            '  startLine: number;',
            '}',
            '',
            'const maxChars = opts.maxChars ?? 1200;',
          ]}
          mark={[3, 5]}
          says={[
            { at: 'text: string', is: 'Trail plus body. This, not `body`, is what is embedded — which is why a section heading is findable from a question that only uses its words.' },
            { at: 'startLine: number', is: 'Where the chunk begins in the original file. It is what makes a citation openable.' },
            { at: 'maxChars ?? 1200', is: 'About 300 tokens for Latin script. A budget, not a target — most sections never reach it.' },
          ]}
          trap="`startLine` was written as 1, four times out of five. The parse knew exactly where each chunk started and threw the number away, so every citation pointed at the top of the file — which looks right until somebody follows one."
        />
      </Step>

      <Step n={2} title="Two arms, because embeddings are worst at exactly the words that matter">
        <P>
          A rare legal term has few neighbours in embedding space, so “livery” retrieves nothing closer than
          general prose. An identifier is worse: nothing in a vector can separate{' '}
          <code className="font-mono text-ui-fg">SR-EPS-0421</code> from{' '}
          <code className="font-mono text-ui-fg">SR-EPS-0407</code>. So every search runs two arms —{' '}
          <Term def="Vector search. Embeds the question and orders by cosine distance. Good at meaning, bad at rare words and identifiers.">dense</Term>{' '}
          and{' '}
          <Term def="Keyword search. Postgres full-text over a tsvector column with a GIN index. Good at exactly the words the dense arm is worst at.">sparse</Term>{' '}
          — and fuses them.
        </P>

        <Code
          path="packages/grounding/src/hybrid.ts:153–163"
          note="the keyword arm, and the bug in its header"
          lines={[
            "let where = `content_ts @@ to_tsquery('english', $1)`;",
            'if (filter && Object.keys(filter).length) {',
            '  params.push(JSON.stringify(filter));',
            '  where += ` and metadata @> $3::jsonb`;',
            '}',
            'const { rows } = await client.query(',
            '  `select content, metadata',
            '     from ${table}',
            '    where ${where}',
            "    order by ts_rank(content_ts, to_tsquery('english', $1)) desc",
            '    limit $2`,',
            '  params,',
            ');',
          ]}
          mark={[0]}
        />

        <P>
          <strong className="font-medium text-ui-fg">
            Every built-in query converter ANDs its terms.
          </strong>{' '}
          <code className="font-mono text-ui-fg">plainto_tsquery</code>,{' '}
          <code className="font-mono text-ui-fg">websearch_to_tsquery</code> and{' '}
          <code className="font-mono text-ui-fg">phraseto_tsquery</code> all require a document to contain
          every word. A model writes questions, not keyword lists, so this arm returned{' '}
          <em className="not-italic text-ui-fg">nothing, ever</em>, and looked like it was working. The terms
          are now OR-ed by hand and <code className="font-mono text-ui-fg">ts_rank</code> favours the passage
          that has more of them.
        </P>

        <Key>
          An arm that quietly returns less than it should, while everything above it reports success, is the
          failure shape to watch for in a retrieval stack. It has happened twice in this repo and neither time
          did anything turn red.
        </Key>
      </Step>

      <Step n={3} title="The fetch arithmetic, which is larger than it looks">
        <P>
          Asking for five passages does not fetch five. Each arm over-fetches so that a document ranked well
          by one arm and poorly by the other still has a rank in both lists — fusing two top-fives would
          mostly fuse two copies of the same five.
        </P>

        <HowItWorks
          title="How the keyword half of the search is built"
          path="packages/grounding/src/hybrid.ts:105–122"
          plain={[
            'Postgres full-text search needs a query object, not a sentence. Every converter Postgres ships for that job ANDs its terms together — the document must contain every word.',
            'A model does not write keyword lists. It writes \u201cis the driver covered while driving for a rideshare platform with passengers?\u201d, and no document contains all of that.',
            'So this arm returned nothing, ever, and looked like it was working. The fix is four lines: lower-case it, split on anything that is not a letter or digit, drop one-character fragments, and join with OR.',
            'ts_rank then does the ranking, and it already favours a passage containing more of the terms — so ORing them loses nothing that ANDing was providing.',
          ]}
          lines={[
            'function orQuery(raw: string): string {',
            '  const terms = raw',
            '    .toLowerCase()',
            '    .split(/[^a-z0-9]+/)',
            '    .filter((t) => t.length > 1);',
            "  return [...new Set(terms)].join(' | ');",
            '}',
          ]}
          mark={[5]}
          says={[
            { at: "join(' | ')", is: "` | ` is to_tsquery's OR. This one character is the whole bug fix." },
            { at: 'filter((t) => t.length > 1)', is: 'Single characters match almost everything and rank nothing.' },
            { at: 'new Set(terms)', is: 'A repeated word would otherwise weight itself.' },
          ]}
          trap="`to_tsquery` has real syntax and the model writes questions full of quotes, hyphens and apostrophes. Passing a raw question through would not return nothing — it would THROW, mid-search. Splitting on non-alphanumerics removes the syntax and the injection surface in the same line."
        />

        <Figure
          title="What “k = 5” actually costs"
          sub="Drawn to linear scale on purpose: the last bar is 2% of the first, and that is the point."
          source={
            <>
              docs/RETRIEVAL.md §4. The two multipliers are real constants —{' '}
              <span className="text-ui-dim">packages/grounding/src/hybrid.ts:195</span> holds the{' '}
              <span className="text-ui-dim">× 4</span>.
            </>
          }
        >
          <Funnel
            stages={[
              { n: 5, label: 'asked for', why: 'k, the default' },
              { n: 30, label: 'after the gate allowance', op: '× 6', why: 'search_policy over-fetches, because the gates below drop rows' },
              { n: 120, label: 'per arm', op: '× 4', why: "hybridSearch's overFetch, so one arm's good ranking survives the other's silence" },
              { n: 240, label: 'candidates fused', op: '× 2 arms', why: 'dense and sparse, run concurrently' },
              { n: 5, label: 'shown to the model', op: 'gate, slice', why: 'document type ∈ contract types; status ∉ {superseded, withdrawn, rescinded}' },
            ]}
            note="Both gates let null and unknown pass. A missing value is not evidence of the wrong type, and a document whose status cannot be read is not thereby dead."
          />
        </Figure>
      </Step>

      <Step n={4} title="Fuse by rank, and throw the scores away">
        <P>
          A cosine distance and a <code className="font-mono text-ui-fg">ts_rank</code> are different units on
          different scales. Adding or averaging them is meaningless and whichever has the larger range wins.{' '}
          <Term def="Reciprocal Rank Fusion. Each arm contributes 1/(60 + rank) for every document it returned; the magnitudes of the two scores are discarded entirely.">
            Reciprocal rank fusion
          </Term>{' '}
          uses only position.
        </P>

        <Code
          path="packages/grounding/src/hybrid.ts:47, 211–222"
          note="the whole fuser"
          lines={[
            'const RRF_K = 60;',
            '',
            'const add = (doc: LCDocument, rank: number, arm: \'dense\' | \'sparse\') => {',
            '  const key = keyOf(doc);',
            '  const prev = fused.get(key) ?? { doc, score: 0 };',
            '  prev.score += 1 / (RRF_K + rank);',
            '  if (arm === \'dense\') prev.denseRank = rank;',
            '  else prev.sparseRank = rank;',
            '  fused.set(key, prev);',
            '};',
            '',
            'dense.forEach(([doc], i) => add(doc, i + 1, \'dense\'));',
            'sparse.docs.forEach((doc, i) => add(doc, i + 1, \'sparse\'));',
          ]}
          mark={[5]}
        />

        <P>
          <code className="font-mono text-ui-fg">K = 60</code> is the original paper's value; it flattens rank
          1 against rank 2 so one list cannot dominate. Put numbers on what that means and something
          uncomfortable falls out.
        </P>

        <Figure
          title="A document both arms rank 50th outranks one the keyword arm ranks 1st"
          sub="Fused score is the sum of 1/(60 + rank) over the arms that found it. An arm that did not return a document contributes nothing — which is not the same as contributing zero evidence."
          source={
            <>
              docs/steering/evals/RETRIEVAL.md — “the finding underneath the finding”. Recorded, and nothing
              about the fuser has been changed on the strength of it.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'both arms rank it 50th',
                value: 0.0182,
                display: '2/110 = 0.0182',
                note: 'corroboration by a second arm',
              },
              {
                label: 'keyword arm 1st, dense arm silent',
                value: 0.0164,
                display: '1/61 = 0.0164',
                note: 'the single best lexical match in the corpus',
              },
            ]}
            max={0.02}
            labelWidth={260}
            axis="0 → 0.0200 fused score"
          />
        </Figure>

        <Key>
          Fusion reads the dense arm's silence as a vote against. That is RRF working as designed — agreement
          is evidence — and it is exactly wrong when the two arms are good at different things, which is the
          entire reason there are two of them.
        </Key>
      </Step>

      <Step n={5} title="What a reranker bought, and what it cost">
        <P>
          A <Term def="A cross-encoder that re-scores a pool of already-retrieved passages by reading each one together with the question. It cannot retrieve — it can only reorder what it was handed.">reranker</Term>{' '}
          was added last, not first, because the baseline had to exist before the delta could mean anything.
          Eight cases over 922 documents and 3,854 passages.
        </P>

        <Figure
          title="Baseline against reranked — 8 cases, one run each"
          sub="Xenova/ms-marco-MiniLM-L-6-v2, local, CPU, in-process, over a 50-candidate pool."
          source={
            <>
              <span className="text-ui-dim">pnpm steering:retrieval-eval --both</span> — run 2026-09-14,
              docs/steering/evals/RETRIEVAL.md. 400 passages re-scored in 15.8 s: about 2 s of added latency
              per question. The stage is <strong className="text-ui-dim">off by default</strong>;{' '}
              <span className="text-ui-dim">RERANK=local</span> turns it on.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'recall@6', value: 0.938, before: 0.813, display: '0.938', beforeDisplay: '0.813', note: '+12.5 points' },
              { label: 'MRR', value: 0.875, before: 0.692, display: '0.875', beforeDisplay: '0.692', note: '+18.3 points' },
              { label: 'cases passing', value: 7, before: 6, display: '7 of 8', beforeDisplay: '6 of 8' },
            ]}
            max={8}
            legend={['baseline — hybridSearch as the tool calls it', 'reranked — cross-encoder over a 50-candidate pool']}
            labelWidth={150}
          />
        </Figure>

        <P>
          Averages hide what moved. Three cases account for the whole delta, and one of them moved the wrong
          way.
        </P>

        <Figure
          title="Where each case landed"
          sub="Position of the correct passage in the fused list, before and after. Rank 1 is the top."
          source={
            <>
              docs/steering/evals/RETRIEVAL.md. <span className="text-ui-dim">ret-008</span> is printed rather
              than buried because it is the honest cost, and it is a sharper cost than “noise”.
            </>
          }
        >
          <Slope
            labels={['hybrid search', '+ reranker']}
            worst={35}
            rows={[
              { id: 'ret-007', from: 35, to: 1, note: 'the contaminated charge code — recall 0.00 → 1.00' },
              { id: 'ret-003', from: 5, to: 2, note: 'the exact identifier SR-EPS-0421' },
              { id: 'ret-008', from: 1, to: 2, note: 'a real loss — the stale design note overtook the tests' },
            ]}
          />
        </Figure>

        <P>
          <code className="font-mono text-ui-fg">ret-008</code> asks where the behaviour of a module is
          actually recorded. The answer is the test file, whose own banner says the 2015 design note has gone
          stale and the tests are the surviving specification.{' '}
          <strong className="font-medium text-ui-fg">
            The reranker promoted the stale design note above the tests.
          </strong>{' '}
          That is not tie-breaking between two correct passages — it is a relevance model preferring the
          document this corpus specifically marks as out of date. Relevance and currency are different
          questions, and a cross-encoder can only see the first.
        </P>

        <Data
          path="pnpm steering:retrieval-eval --both — the diagnostic on ret-005"
          note="the case the reranker could not fix, and the useful one"
          lines={[
            'ceiling: only 50% of the expected labels were in the top-50 pool at all',
            '         — a reranker cannot fix that',
          ]}
          mark={[0, 1]}
        />

        <Key>
          A reranker cannot retrieve. Recall after it is bounded above by recall into it — so a case that
          fails with the correct passage outside the pool is a retrieval problem, not a ranking one. Without
          that line printed, the obvious next move is to raise the pool from 50 to 200 and spend four times
          the latency discovering it changes nothing.
        </Key>
      </Step>

      <Step n={6} title="Nothing is dropped for scoring low">
        <P>
          Search returns its top k even when everything in it is junk. There is no score cutoff anywhere, and
          that is the load-bearing decision on this page.
        </P>

        <P>
          Similarity ranks <em className="not-italic text-ui-fg">topical relevance</em>. It cannot tell you
          whether the answer is present. Measured directly: an unanswerable question scored{' '}
          <strong className="font-medium text-ui-fg">0.572</strong> while an answerable one scored{' '}
          <strong className="font-medium text-ui-fg">0.472</strong>. A threshold would have rejected the real
          question and admitted the impossible one.
        </P>

        <Figure
          title="The case that settles it"
          sub="“Is a rideshare driver covered?” — retrieves a high-scoring exclusion about transporting goods for a fee, because that is the most topically adjacent clause in the corpus. It is also not the answer."
          source="docs/RETRIEVAL.md §4, “no score cutoff — on purpose”. Rideshare appears in none of the 79 documents."
        >
          <BarRows
            rows={[
              {
                label: 'unanswerable question',
                value: 0.572,
                display: '0.572',
                note: 'nothing in the corpus addresses it',
              },
              {
                label: 'answerable question',
                value: 0.472,
                display: '0.472',
                note: 'the answer is right there',
              },
            ]}
            max={0.6}
            labelWidth={200}
            axis="0 → 0.600 similarity"
          />
        </Figure>

        <Key>
          Whether a retrieved clause <em className="not-italic">applies</em> is reading comprehension. It
          belongs to the model, not to a number — and deciding “the answer isn't in the corpus” is the
          product, not a threshold pretending to be arithmetic.
        </Key>
      </Step>

      <RunIt
        items={[
          {
            cmd: 'pnpm steering:retrieval-scorer-check',
            does: 'Does the scorer itself work? Plants known-bad rankings and requires the counters to move.',
            cost: 'free',
          },
          {
            cmd: 'pnpm chunks',
            does: 'The chunker over the corpus at four budgets, including three hostile ones that force the split path to run.',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:retrieval-eval --both',
            does: 'Baseline and reranked arms, and the delta between them. About 100 embedding tokens.',
            cost: 'money',
          },
          {
            cmd: 'pnpm query "rental car limit" --form "PP 03 24 06 24"',
            does: 'One hybrid search, with the form-id filter applied in SQL rather than after ranking.',
            cost: 'money',
          },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'Eight cases cannot say a retriever is good.',
            body: 'They can say it got worse, which is the job. It is a regression instrument, not a benchmark.',
          },
          {
            claim: 'Insurance has no recall number at all.',
            body: 'Every recall figure on this page is steering\'s. Insurance\'s only retrieval signal is whether a cited document exists — which catches an invented source and says nothing about whether the right passage was ranked first, or retrieved at all.',
          },
          {
            claim: 'The RRF finding has not been acted on.',
            body: 'It is recorded with a number and the fuser is unchanged. A floor that keeps each arm\'s top few, or a lower K, are both guesses until the suite scores them — the same rule the reranker was held to.',
          },
          {
            claim: 'One run, not five.',
            body: 'Deliberate, and the opposite of the answer suite in lesson 5. Every stage here is deterministic — a fixed index, deterministic embeddings, RRF over ranks, an fp32 CPU cross-encoder — so repeats would measure nothing and cost money.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'chunk', def: 'A passage of roughly 1,200 characters carrying the trail of headings above it and the line it starts on, so a citation can point at something.' },
          { word: 'dense arm', def: 'Vector search — embed the question, order by cosine distance. Good at meaning.' },
          { word: 'sparse arm', def: 'Postgres full-text search over a tsvector column with a GIN index. Good at rare words and identifiers.' },
          { word: 'RRF', def: 'Reciprocal rank fusion. Each arm contributes 1/(60 + rank); the two incomparable score scales are discarded.' },
          { word: 'over-fetch', def: 'Asking each arm for k × 4 rows, so a document one arm ranked well still has a rank in both lists.' },
          { word: 'reranker', def: 'A cross-encoder that re-scores an already-retrieved pool by reading each passage with the question. It reorders; it cannot retrieve.' },
          { word: 'MRR', def: 'Mean reciprocal rank — 1/(position of the first correct passage), averaged. Sensitive to the top of the list in a way recall is not.' },
        ]}
      />
    </LessonPage>
  );
}
