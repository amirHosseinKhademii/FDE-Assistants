/**
 * Patterns lesson 4 — building a map first.
 *
 * A READING OF `docs/rag/GRAPH.md`.
 *
 * NOTHING ON THIS PAGE IS BUILT HERE, AND THE PAGE SAYS SO IN ITS FIRST STEP.
 * Every benchmark figure is `kind="cited"`. The one measured number is a
 * FAILURE — `ret-005` scoring 0.50 recall with and without a reranker — and it
 * is the honest shape of the argument: this repo has a two-hop question, in a
 * corpus it already holds, that it cannot answer, and a graph is the named
 * mechanism for answering it. That is an argument, not a result, because nobody
 * has built one and measured it.
 *
 * `Path` EXISTS FOR THE FIGURE IN STEP 3 and is the only new chart this whole
 * track needed. See its header for why it is a fixed layout rather than a graph
 * drawing — the claim is the path, not the topology.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Matrix, EITHER_OR } from '../../components/learn/charts/Matrix';
import { Path } from '../../components/learn/charts/Path';
import { Stages } from '../../components/learn/charts/Stages';

export function Graph() {
  return (
    <LessonPage slug="graph">
      <Step n={1} title="The assumption every lesson above rests on">
        <P>
          Retrieval finds passages and generation reads passages, so the whole machine works if the answer is
          sitting in some chunk somewhere. That assumption is so basic it is rarely said out loud. Now ask:{' '}
          <em>what are the main themes across these 1,069 files?</em>
        </P>
        <P>
          There is no passage that answers that — not a badly-ranked one,{' '}
          <strong className="font-medium text-ui-fg">none</strong>. The answer is a property of the whole
          corpus. Retrieval returns the six passages most similar to the phrase “main themes”, which is a
          query about a corpus matched against documents that are not about corpora, and the model summarises
          six arbitrary passages and presents it as an overview. Fluently. With citations.
        </P>

        <Key>
          A <Term def="A question answered by one or a few passages. What does form PP 03 24 06 24 pay for a rental car?">local question</Term>{' '}
          is what vector RAG is excellent at. A{' '}
          <Term def="A question answered by the shape of the whole corpus. What are the recurring causes of overrun?">global question</Term>{' '}
          is one it cannot do at all — and, worse, does not say so.
        </Key>
      </Step>

      <Step n={2} title="GraphRAG, and where its bill comes from">
        <P>
          The published answer is to read the entire corpus once, before anyone asks anything, and build a
          structured map of it. Seven stages, of which two are the expense.
        </P>

        <Figure
          title="Seven stages, and the line between 5 and 6 is the whole cost story"
          kind="illustration"
          sub="Stages 1–5 run once, at index time, and two of them make a model call per unit. Stages 6–7 run per question. Nothing in this drawing was measured."
          source={
            <>
              The process is from Edge et al. (Microsoft), <em>From Local to Global: A GraphRAG Approach to
              Query-Focused Summarization</em>, arXiv:2404.16130, fetched 2026-09-15.
            </>
          }
        >
          <Stages
            stages={[
              { verb: 'chunk', out: '600-token chunks', does: 'overlapped', rule: 'index time' },
              {
                verb: 'extract',
                out: 'entities, relationships, claims',
                does: 'AN LLM CALL PER CHUNK — this is the cost',
                rule: 'index time',
              },
              { verb: 'aggregate', out: 'nodes + edges, deduplicated', does: 'consolidated descriptions', rule: 'index time' },
              { verb: 'cluster', out: 'a hierarchy of communities', does: 'Leiden, recursive, every level a partition', rule: 'index time' },
              {
                verb: 'summarise',
                out: 'a report per community',
                does: 'AN LLM CALL PER COMMUNITY, bottom-up',
                rule: 'index time',
              },
              { verb: 'map', out: 'a partial answer per community', does: 'parallel; each scores its own usefulness', rule: 'query time' },
              { verb: 'reduce', out: 'one global answer', does: 'rank, drop the zeroes, synthesise', rule: 'query time' },
            ]}
          />
        </Figure>

        <Figure
          title="What the map buys, against plain vector RAG"
          kind="cited"
          sub="Win rate on podcast transcripts. Directness is the control and vector RAG wins it — by design, because a summary of a community is a worse answer to a narrow question than the passage is."
          source={
            <>
              CITED — Edge et al., arXiv:2404.16130, fetched 2026-09-15. Head-to-head win rates judged by an
              LLM evaluator, p &lt; .001 except where noted.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'comprehensiveness', value: 78, display: '78%', note: '72–83% across conditions' },
              { label: 'diversity', value: 79, display: '79%', note: '75–82%' },
              { label: 'empowerment', value: 50, display: '50%', note: 'mixed' },
              { label: 'directness', value: 38, display: '38%', note: 'vector RAG wins this one' },
            ]}
            labelWidth={190}
            reference={{ at: 50, label: 'even' }}
            axis="0 → 100% of head-to-head comparisons won"
          />
        </Figure>

        <P>
          Eighteen months later the same lab undercut its own indexing cost. LazyGraphRAG defers all the model
          summarisation to query time — indexing only what is cheap and deterministic, and summarising only
          the communities a specific question touches.
        </P>

        <Figure
          title="LazyGraphRAG, as a percentage of full GraphRAG"
          kind="cited"
          sub="Two numbers that are both about a thousandth. The magnitude is written into each row rather than drawn, because a log axis appearing on one figure is a reading convention taught for a single chart."
          source={
            <>
              CITED — Microsoft Research, <em>LazyGraphRAG sets a new standard for GraphRAG quality and
              cost</em>, fetched 2026-09-15. Quality reported comparable on global queries.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'indexing cost', value: 0.1, display: '0.1% — a thousandth', note: 'identical to plain vector RAG' },
              { label: 'global query cost', value: 0.14, display: '0.14% — more than 700× lower', note: 'at comparable answer quality' },
              { label: 'full GraphRAG', value: 100, display: '100%', note: 'the baseline both are measured against' },
            ]}
            labelWidth={190}
            axis="0 → 100% of full GraphRAG’s cost"
          />
        </Figure>

        <Key>
          The methodological reading is the more useful one. A published pipeline’s expensive stage turned out
          to be largely deferrable without losing quality — so the index-time / query-time boundary is a{' '}
          <em>choice</em>, not a property of the problem. Worth asking of any pipeline: what is this
          precomputing for questions nobody will ask?
        </Key>
      </Step>

      <Step n={3} title="Where a graph actually earns its keep, and it is narrower than the marketing">
        <P>
          Stage 2 extracts <em>relationships</em>, not just entities, and that is the capability neither
          vector RAG nor a summary tree has at any price: a question whose answer lives in the join between
          two documents, where neither document alone says anything is wrong.
        </P>

        <Figure
          title="Three hops, three documents, and no passage containing both ends"
          sub="K2 requires ASIL D. The 2021 assessment classified the component at ASIL B. The contradiction is the path, and there is no chunk that contains it — so no amount of retrieval returns it."
          source={
            <>
              MEASURED HERE — case ret-005 scores 0.50 recall with AND without a reranker, and the runner
              prints the ceiling itself:{' '}
              <span className="text-ui-dim">pnpm steering:retrieval-eval --both</span>,
              docs/steering/evals/RETRIEVAL.md. The hops are real files in the steering corpus.
            </>
          }
        >
          <Path
            nodes={[
              { id: 'K2', label: 'K2 requirement', type: 'requirement', x: 0.0, y: 0.5 },
              { id: 'ASIL', label: 'ASIL D', type: 'claim', x: 0.33, y: 0.5 },
              { id: 'CMP', label: 'damping component', type: 'component', x: 0.66, y: 0.5 },
              { id: 'ASMT', label: '2021: ASIL B', type: 'document', x: 1.0, y: 0.5 },
            ]}
            edges={[
              { source: 'K2', target: 'ASIL', label: 'requires', doc: 'requirements/PRG-KST-K2/…' },
              { source: 'ASIL', target: 'CMP', label: 'applies to', doc: 'requirements/PRG-KST-K2/…' },
              { source: 'CMP', target: 'ASMT', label: 'was classified by', doc: 'eps-steering-feel/…/safety-assessment-2021.md §3' },
            ]}
            caption="Answering it needs two passages from two repositories, and neither one alone says anything is wrong. The runner’s own line: “only 50% of the expected labels were in the top-50 pool at all — a reranker cannot fix that.”"
          />
        </Figure>

        <Key>
          The honest case for a graph is not “graphs make RAG better”. It is that a graph can answer a
          question whose answer is an edge. If you cannot name a question of that shape in your customer’s
          actual work, you do not need one.
        </Key>
      </Step>

      <Step n={4} title="What this repo built instead, and why it was the right call here">
        <P>
          Steering had exactly the global-question problem — 1,069 files, four databases, 24 customer
          requirements, and the question <em>where does the bid stand?</em>, whose answer is in no file. It
          was not solved with a graph. It was solved with fan-out plus a summariser, which is stages 6 and 7
          without stages 1 through 5.
        </P>

        <HowItWorks
          title="Map-reduce over the customer’s own structure"
          path="package.json — steering:assess-all and steering:summarise"
          shape="assembled"
          plain={[
            'One agent per requirement, run serially and resumably, produces 24 structured assessments each carrying its own citations. A second, smaller agent then reads the finished assessments and writes across them.',
            'The shape is identical to GraphRAG’s map-reduce. The difference is WHAT GETS MAPPED OVER: GraphRAG maps over communities discovered by clustering an extracted graph; this maps over units the customer already defined — the 24 requirements of the bid.',
            'When the customer’s own structure is the right partition, discovering a partition is work you do not need to do. A bid has requirements. A trial has sites. A factory has lines. Clustering to rediscover that is expensive, and worse, because the discovered clusters do not line up with how anybody talks about the work.',
            'Graph RAG earns its cost when there is no such given structure — a pile of transcripts, a decade of support tickets, a corpus nobody has ever organised. Then the map is genuinely new information.',
          ]}
          lines={[
            '# one agent per requirement — serial, resumable, --run opt-in',
            'pnpm steering:assess-all --run',
            '#   → 24 structured assessments, each cited',
            '',
            '# a SECOND, smaller agent reads the finished assessments',
            'pnpm steering:summarise',
            '#   → two written paragraphs across all of them',
          ]}
          lang="bash"
          mark={[1, 5]}
          trap="The derived pipeline here is stage 2 without the graph: 220 closure reports became 1,320 facts, each with its sentence, for about a cent. What was never built is the EDGE table — so the joins in step 3 are unavailable, and ret-005 still fails. The missing half is the half graph RAG is named after."
        />

        <Figure
          title="Which pattern for which question"
          kind="illustration"
          sub="A decision table, not a measurement. The verdicts are this document’s reading of the three patterns against four real question shapes from these engagements."
          source="docs/rag/GRAPH.md §7. The benchmark numbers behind the general claims are in steps 2 and 3, and are cited there."
        >
          <Matrix
            rowHeader="question"
            marks={EITHER_OR}
            columns={['vector', 'summary tree', 'graph']}
            rows={[
              {
                name: 'what does form X pay',
                cells: [
                  { state: 'live', detail: 'best' },
                  { state: 'wired', detail: 'ok' },
                  { state: 'wired', detail: 'worse' },
                ],
              },
              {
                name: 'what are the recurring themes',
                cells: [
                  { state: 'refuses', detail: 'cannot' },
                  { state: 'live', detail: 'good' },
                  { state: 'live', detail: 'best' },
                ],
              },
              {
                name: 'who is exposed to the failed part',
                cells: [
                  { state: 'refuses', detail: 'cannot' },
                  { state: 'refuses', detail: 'cannot' },
                  { state: 'live', detail: 'best — the answer is an edge' },
                ],
              },
              {
                name: 'where does the bid stand',
                cells: [
                  { state: 'refuses', detail: 'cannot' },
                  { state: 'wired', detail: 'ok' },
                  { state: 'wired', detail: 'overkill — map over the 24 requirements' },
                ],
              },
            ]}
            footnote="Nothing here is a fault, so nothing takes a severity colour. “Cannot” is a property of the pattern, not a defect."
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:assess-all', does: 'the work list — the map half, spending nothing', cost: 'free' },
          { cmd: 'pnpm steering:retrieval-eval --both', does: 'ret-005, the two-hop case that still fails', cost: 'money' },
          { cmd: 'pnpm steering:summarise', does: 'the reduce half — across finished assessments', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “So should we build one?” Only if you can name a question whose answer is a join. We have exactly
            one — a requirement demanding a safety level the component was assessed below, written in two
            repositories — and it still fails today. One question is not yet a business case, and
            LazyGraphRAG is the first thing to read if it becomes one.
          </>
        }
      >
        Everything else we have built assumes the answer is in a passage. Some questions have no passage —
        “what are the themes across these thousand files” has no chunk to find, and a vector search happily
        returns six arbitrary ones and writes a confident overview. Graph RAG reads the whole corpus once,
        up front, and builds a map: entities, the relationships between them, and summaries of each cluster.
        It costs a model call per chunk to build. We did not build one. We mapped over the 24 requirements
        the customer had already written down, because when the customer has a structure, discovering one is
        work you do not need to do.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'Every benchmark on this page is somebody else’s.',
            body: 'Win rates on podcast transcripts and news, indexing costs from a Microsoft Research blog post. Nothing here has been reproduced on this repo’s corpora, and the two engagements’ questions are mostly local, which is the condition under which those numbers are least relevant.',
          },
          {
            claim: 'The one measured number on this page is a failure, not a success.',
            body: 'ret-005 scoring 0.50 says a two-hop question fails for two-hop reasons. It does NOT say a graph would fix it — no graph was built, so the mechanism is a hypothesis with a well-documented cost.',
          },
          {
            claim: 'The comparison in step 4 is not like-for-like.',
            body: 'Fan-out over 24 requirements solved a global question cheaply BECAUSE the partition was given. That says nothing about how it would do on a corpus with no given structure, which is the case graphs are for.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'local question', def: 'One answered by a few passages. Vector RAG is better at these than a graph is.' },
          { word: 'global question', def: 'One answered by the shape of the whole corpus. No passage contains the answer.' },
          { word: 'community', def: 'A cluster of the extracted graph. GraphRAG summarises each one, recursively, bottom-up.' },
          { word: 'multi-hop', def: 'A question whose answer requires joining facts from two or more documents, where neither alone is remarkable.' },
          { word: 'map-reduce', def: 'Answer partially over each unit in parallel, then synthesise across the partial answers. GraphRAG maps over discovered communities; this repo maps over the customer’s own requirements.' },
          { word: 'RAPTOR', def: 'Recursively embed, cluster and summarise chunks into a tree. Most of the global-question benefit, no entity extraction, and a summary node drops into an existing vector store as just another chunk.' },
        ]}
      />
    </LessonPage>
  );
}
