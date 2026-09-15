/**
 * Patterns lesson 1 — two searches, because one is reliably wrong.
 *
 * A READING OF `docs/rag/HYBRID.md`.
 *
 * THE ONLY PAGE IN THIS TRACK WITH A REPO RUN BEHIND EVERY CENTRAL NUMBER, and
 * it is first for that reason. Four of the five patterns are read out of other
 * people's papers; this one is 228 lines in `packages/grounding/src/hybrid.ts`
 * with a retrieval suite scoring it, so it is the page that earns the track the
 * right to talk about the other four.
 *
 * AND IT ENDS ON A FINDING AGAINST ITS OWN SUBJECT. §6 of the document is a
 * measured case where RRF — the thing this page spends four steps explaining —
 * demonstrably puts the right answer 27th. That is kept as the climax rather
 * than a footnote, because a lesson that only argues for its topic is an
 * advertisement.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Stages } from '../../components/learn/charts/Stages';

export function Hybrid() {
  return (
    <LessonPage slug="hybrid">
      <Step n={1} title="Two ways to find a passage, wrong about opposite things">
        <P>
          You have a pile of documents and a question, and you want the handful of passages that answer it.
          There are two completely different ways to get them, and the useful fact about the pair is not that
          one is better — it is that they fail in opposite directions.
        </P>
        <P>
          <strong className="font-medium text-ui-fg">Search by meaning</strong> turns every passage into a
          list of numbers and returns the ones pointing the same way as the question. It finds “what does my
          policy pay if my car is stolen” inside a passage headed <em>Comprehensive — Theft</em>, which shares
          almost none of those words. <strong className="font-medium text-ui-fg">Search by words</strong>{' '}
          builds the index a library card catalogue would, weighting rare words above common ones. It finds{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">SR-EPS-0421</code> because it is looking for the
          literal string.
        </P>

        <Key>
          Meaning-search is worst at exactly the words that matter most. An embedding is trained on ordinary
          prose, so a rare legal or technical term — <em>livery</em>, <em>subrogation</em>,{' '}
          <code className="font-mono text-[0.9em]">SR-EPS-0421</code> — has almost no neighbours in the space
          and gets encoded as “vaguely an identifier”. And word-search is worst at paraphrase: a question
          sharing no vocabulary with its answer returns nothing at all.
        </Key>

        <Figure
          title="Both arms, and the fuser that has to make one list out of two"
          sub="Each arm fetches 24 to return 6. Fusing two top-5s would mostly fuse two copies of the same five, so each arm goes four times deeper than the caller asked for."
          source="packages/grounding/src/hybrid.ts:195–225. The depth is k × overFetch, default 4, at line 195."
        >
          <Stages
            stages={[
              { verb: 'embed', out: 'float[1536]', does: 'the question becomes one vector' },
              { verb: 'dense', out: '24 hits, cosine-ranked', does: 'an ANN index over the pre-embedded chunks' },
              {
                verb: 'orQuery',
                out: 'livery | hire | vehicle',
                does: 'the question becomes a tsquery — joined with OR, not AND',
                rule: 'Every built-in converter ANDs. That is step 3, and it is the bug that shipped.',
              },
              { verb: 'sparse', out: '24 hits, ts_rank-ranked', does: 'a GIN index over a generated tsvector column' },
              {
                verb: 'fuse',
                out: '6 hits, rank-scored',
                does: 'Σ 1/(60 + rank) over the arms that found it — the magnitudes are thrown away',
                rule: 'Which is right until it is not. Step 5 is the measured case where it puts the answer 27th.',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={2} title="You cannot add the scores, and the reason is not fussiness">
        <P>
          The dense arm gives you a cosine distance: bounded, between 0 and 2, small is good, clustered for
          real corpora somewhere around 0.2–0.6. The sparse arm gives you a{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">ts_rank</code>: unbounded, big is good, on a
          scale that depends on document length and on how many query terms matched.
        </P>
        <P>
          Adding those, averaging them or taking a weighted sum is not a compromise between two opinions. It
          is <strong className="font-medium text-ui-fg">whichever arm happens to have the larger numeric
          range winning every time</strong>, and the weight you tune to correct for it is a per-corpus
          constant that goes stale the next time the corpus grows.
        </P>
        <P>
          So the standard answer throws the magnitudes away and keeps only the position.{' '}
          <Term def="Reciprocal Rank Fusion — score(d) = Σ over lists of 1/(K + rank of d in that list). K = 60 by convention, from the 2009 paper.">
            Reciprocal Rank Fusion
          </Term>{' '}
          is one line: <code className="font-mono text-[0.9em] text-ui-fg">score(d) = Σ 1 / (K + rank)</code>.
        </P>

        <Key>
          What K = 60 buys is a flattened top. Without it rank 1 scores 1/1 and rank 2 scores 1/2 — a 50%
          cliff, so whichever list happened to put something first dominates. With K = 60 the gap between
          first and second is 1.6%, which means agreement between the arms is worth more than being the best
          answer in either one. Hold onto that sentence; step 5 is the case where it is wrong.
        </Key>

        <HowItWorks
          title="How two ranked lists become one"
          path="packages/grounding/src/hybrid.ts:210–225"
          plain={[
            'Every hit from either arm goes into one map, keyed by the document. Each time an arm reports it, the document collects 1/(60 + its position in that arm) — so a document both arms found collects twice.',
            'The two rank numbers are stored on the hit even though the fusion never reads them again. They exist so that when retrieval goes wrong you can ask which arm found this, and where. That diagnostic is what produced the finding in step 5.',
            'The final scores are divided by the best one, so the leader is always 1.0. A raw RRF score has no meaning on its own — 0.0182 is not "1.8% relevant" — and normalising makes it readable as "how far behind the leader" instead.',
          ]}
          lines={[
            'const fused = new Map<string, Scored>();',
            "const add = (doc: LCDocument, rank: number, arm: 'dense' | 'sparse') => {",
            '  const key = keyOf(doc);',
            '  const prev = fused.get(key) ?? { doc, score: 0 };',
            '  prev.score += 1 / (RRF_K + rank);',
            "  if (arm === 'dense') prev.denseRank = rank;",
            '  else prev.sparseRank = rank;',
            '  fused.set(key, prev);',
            '};',
            '',
            "dense.forEach(([doc], i) => add(doc, i + 1, 'dense'));",
            "sparse.docs.forEach((doc, i) => add(doc, i + 1, 'sparse'));",
            '',
            'const ranked = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);',
            'const best = ranked[0]?.score ?? 1;',
            'for (const r of ranked) r.score = Number((r.score / best).toFixed(3));',
          ]}
          mark={[4, 5, 6, 14, 15]}
          trap="The normalised score reads like a similarity and is not one. The type comment beside it says NOT a similarity for that reason — anyone who thresholds on it is thresholding on a number whose scale changes with the best hit in the result set."
        />
      </Step>

      <Step n={3} title="The twenty lines that decide whether the arm works at all">
        <P>
          The sparse arm has to turn a sentence into a <Term def="Postgres's query type for full-text search. Built from terms joined by operators — & for AND, | for OR.">tsquery</Term>, and
          this is where the whole arm can be silently dead.
        </P>
        <P>
          <strong className="font-medium text-ui-fg">Every built-in converter ANDs its terms.</strong>{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">plainto_tsquery</code>,{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">websearch_to_tsquery</code> and{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">phraseto_tsquery</code> all require a document
          to contain <em>every</em> word of the query. A model-written query is a sentence. No chunk contains
          every word of a sentence.
        </P>

        <HowItWorks
          title="Why the tsquery is hand-built, and what happened when it was not"
          path="packages/grounding/src/hybrid.ts:116–122"
          plain={[
            'The query is lowercased, split on anything that is not a letter or a digit, single characters are dropped, duplicates are removed, and what is left is joined with OR.',
            'That is it. Six lines, and the first version of this file did not have them — it called plainto_tsquery, which ANDs, so the keyword arm returned nothing. Ever.',
            'It looked like it worked. Fusion still produced results because the dense arm carried them, and the result still reported fullText as true because no error had been thrown.',
            'Two more properties fall out of doing it by hand: ts_rank over an OR-query still favours documents matching more of the terms, so you get the AND behaviour as a ranking preference rather than as a filter — and sanitising to [a-z0-9] makes tsquery injection impossible by construction, which matters because a model writes queries full of quotes and ampersands that are a syntax error at best.',
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
          mark={[3, 5]}
          trap="A retrieval arm that silently matches nothing is worse than one that is absent. An absent arm is a missing feature somebody notices; a dead arm is a feature everybody believes they have."
        />

        <Key>
          The same instinct runs through the rest of the file. The keyword arm’s failure is caught and
          reported as <code className="font-mono text-[0.9em]">fullText: false</code> rather than swallowed,
          and the tsvector is a generated column rather than a trigger — Postgres recomputes it on every
          write, so it is <em>impossible</em> for it to disagree with the text it indexes. A trigger can be
          dropped. A generated column cannot go stale.
        </Key>
      </Step>

      <Step n={4} title="What it measures here, including the case it made worse">
        <P>
          Eight cases over 922 documents and 3,854 passages. The baseline is{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">hybridSearch</code> exactly as the tool calls
          it; the second arm adds a local cross-encoder reranker over a 50-candidate pool. Recall@6 goes from{' '}
          <strong className="font-medium text-ui-fg">0.813 to 0.938</strong> and MRR from 0.692 to 0.875.
        </P>

        <P>
          {/* NOT REDRAWN HERE, DELIBERATELY. `/learn/retrieval` already plots those four cases
              as a slope chart over ranks, from the same run. A second drawing of one
              measurement is a second place for it to go stale — which is the subject of
              `/learn/drift`, and would be a poor thing for this track to commit. */}
          The per-case movement is plotted on{' '}
          <strong className="font-medium text-ui-fg">lesson 2 of the machine track</strong>, from this same
          run, and is not redrawn here — one measurement, one chart. What belongs to this page is what that
          chart cannot show: why one of the four moved the wrong way, and the ceiling under all of them.
        </P>

        <P>
          <code className="font-mono text-[0.9em] text-ui-fg">ret-008</code> is sharper than noise. The
          question asks where a module’s behaviour is actually recorded. The answer is the test file, whose
          own banner says the 2015 design note went stale and the tests are the surviving specification. The
          reranker promoted the stale design note above the tests.
        </P>

        <Key>
          Relevance and currency are different questions, and a cross-encoder can only see the first. That
          single observation is what the next lesson in this track is built on.
        </Key>

        <Figure
          title="The ceiling a reranker cannot cross"
          sub="A reranker reorders what it was handed. Recall@6 after reranking is bounded above by recall@50 before it — so when a case is stuck, the question is whether the pool ever contained the answer."
          source={
            <>
              MEASURED HERE — the runner prints the ceiling line itself on ret-005.{' '}
              <span className="text-ui-dim">pnpm steering:retrieval-eval --both</span>.
            </>
          }
        >
          <Funnel
            stages={[
              { n: 3854, label: 'passages in the corpus', why: '922 documents' },
              { n: 50, label: 'the fused pool', op: '→', why: 'all the reranker is allowed to reorder' },
              { n: 6, label: 'shown to the model', op: '→', why: 'recall@6 here is bounded by recall@50 above' },
            ]}
            note="Without that line the obvious next move is to raise the pool from 50 to 200 and spend four times the latency discovering it changes nothing. “The retriever cannot find it” wants a wider pool or better chunking; “the retriever finds it and ranks it badly” is the only one a reranker fixes."
          />
        </Figure>
      </Step>

      <Step n={5} title="The measured case against the thing this page just explained">
        <P>
          Corroboration by a second arm is worth more than being the single best match in either. That is RRF
          working as designed, and it is usually what you want. Put numbers on it and the consequence is
          stark.
        </P>

        <Figure
          title="A document both arms rank 50th outranks one the keyword arm ranks 1st"
          sub="The two bars are almost the same length and the ordering is the entire finding — which is why both carry their arithmetic rather than a scale."
          source={
            <>
              MEASURED HERE — the arithmetic of RRF_K = 60 in packages/grounding/src/hybrid.ts, against the
              per-case ranks printed by <span className="text-ui-dim">pnpm steering:retrieval-eval --both</span>.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'keyword rank 1, dense absent',
                value: 0.0164,
                display: '1/61 = 0.0164',
                note: 'the answer, found by the only arm that could find it',
              },
              {
                label: 'both arms rank 50',
                value: 0.0182,
                display: '2/110 = 0.0182',
                note: 'wins — because two arms agreeing is read as evidence',
              },
            ]}
            labelWidth={230}
          />
        </Figure>

        <P>
          It is not what you want when the two arms are good at different things, which is the entire reason
          hybrid search exists. Two of the eight steering cases hit it, and they are the two that need the
          keyword arm — <code className="font-mono text-[0.9em] text-ui-fg">ret-003</code> is the bare
          identifier <code className="font-mono text-[0.9em] text-ui-fg">SR-EPS-0421</code>, written into the
          suite as “the case only the keyword arm can win”, because an embedding cannot separate it from{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">SR-EPS-0407</code>. The keyword arm won it at
          rank 3. The fuser put it 27th.
        </P>

        <Key>
          In both cases the answer is lexically distinctive and semantically unremarkable, the dense arm
          contributed nothing, and fusion read the dense arm’s silence as a vote against. Nothing has been
          changed about the fuser on the strength of it — it is recorded with a number, which is what the
          suite was built to make possible.
        </Key>
      </Step>

      <Step n={6} title="What the rest of the field does about it">
        <P>
          The two candidate fixes — a floor that lets each arm’s top-N survive fusion regardless of the other,
          or a lower K that sharpens the top of each list against the corroboration bonus — are both guesses
          until the suite scores them. The document writes them out and marks them PROPOSED for that reason.
        </P>
        <P>
          The other direction is to stop fixing the fuser and fix the chunk. Anthropic’s contextual retrieval
          prepends a short model-written description of where a chunk sits before embedding it, so the chunk
          carries its own context into the index.
        </P>

        <Figure
          title="Failure rate at recall@20, each stage added to the one above"
          kind="cited"
          sub="Lower is better. Hybrid is the third row — and the fourth says reranking is worth about as much again."
          source={
            <>
              CITED — Anthropic, <em>Contextual Retrieval in AI Systems</em>,{' '}
              <span className="text-ui-dim">anthropic.com/engineering/contextual-retrieval</span>, fetched
              2026-09-15. Measured on their corpora, not ours.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'baseline embeddings', value: 5.7, display: '5.7%' },
              { label: '+ contextual embeddings', value: 3.7, display: '3.7%' },
              { label: '+ contextual BM25 — hybrid', value: 2.9, display: '2.9%' },
              { label: '+ reranking', value: 1.9, display: '1.9%' },
            ]}
            labelWidth={230}
            axis="0 → 5.7% of questions where the answer was not in the top 20"
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          {
            cmd: 'pnpm steering:retrieval-scorer-check',
            does: 'the scorer against its own planted failures',
            cost: 'free',
          },
          {
            cmd: 'pnpm steering:retrieval-eval',
            does: 'the baseline — recall@6 and MRR over the 8 cases',
            cost: 'money',
          },
          {
            cmd: 'pnpm steering:retrieval-eval --both',
            does: 'both arms, and the per-case deltas drawn in step 4',
            cost: 'money',
          },
          {
            cmd: 'pnpm query "rental car limit" --form "PP 03 24 06 24"',
            does: 'one hybrid search against the insurance corpus',
            cost: 'money',
          },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “So why not just always rerank?” Because it costs about two seconds a question and it made one of
            our eight cases worse — it promoted a document that was more relevant and less current. That is a
            latency-budget decision, not a correctness one, which is why it is a flag rather than a default.
          </>
        }
      >
        We run two searches, not one, because they are bad at opposite things — the vector search cannot tell
        two part numbers apart, and the keyword search cannot handle a question phrased differently from its
        answer. We merge them by position rather than by score, because the two scores are on scales that have
        nothing to do with each other. It takes recall from 0.81 to 0.94 on our eight-case suite. And we know
        one thing that is wrong with it: a document both searches rank fiftieth beats a document the keyword
        search ranks first, so the two questions only keywords can answer come back ranked 27th and 35th.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'Eight cases is a small suite.',
            body: 'It is enough to catch a dead arm and to produce the ordering finding in step 5, and it is not enough to claim a recall number that transfers. The reranker’s +12.5 points is four cases moving out of eight.',
          },
          {
            claim: 'The numbers in step 6 are somebody else’s.',
            body: 'Anthropic measured them on their own corpora with their own embedding model. They are quoted because the SHAPE is the argument — each stage buys less than the one before — not because 2.9% would be our number.',
          },
          {
            claim: 'Nothing here was changed on the strength of the step 5 finding.',
            body: 'It is recorded, not fixed. hybridSearch is in @fde/grounding, so insurance and pharma fuse exactly the same way, and neither has a retrieval suite that could have seen it.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'dense / vector search', def: 'Finding passages whose embedding points in a similar direction to the question’s. Good at paraphrase, bad at rare identifiers.' },
          { word: 'sparse / BM25 / full-text', def: 'Finding passages containing the question’s rare words. Good at identifiers, useless on paraphrase.' },
          { word: 'RRF', def: 'Reciprocal Rank Fusion. score(d) = Σ 1/(K + rank), K = 60. Merges ranked lists by position, discarding the incomparable scores.' },
          { word: 'tsquery', def: 'Postgres’s full-text query type. Built-in converters join terms with AND, which is why this repo builds its own with OR.' },
          { word: 'over-fetch', def: 'Each arm fetching k × 4 candidates so a document ranked well by one arm and poorly by the other still has a rank in both lists.' },
          { word: 'cross-encoder', def: 'A model that scores a (question, passage) pair directly rather than comparing two independent embeddings. More accurate, far slower, and it can only reorder what it is given.' },
        ]}
      />
    </LessonPage>
  );
}
