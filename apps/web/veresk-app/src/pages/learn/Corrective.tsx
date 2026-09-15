/**
 * Patterns lesson 2 — grading what came back.
 *
 * A READING OF `docs/rag/CORRECTIVE.md`.
 *
 * THE PAGE WHERE THIS REPO DISAGREES WITH THE PAPER, AND BOTH POSITIONS GET
 * STATED. CRAG puts a scored threshold between retrieval and generation; this
 * repo has an explicit rule against exactly that and gates on facts instead.
 * Neither is presented as the right answer, because the honest finding is that
 * they fail differently — and the measured number in step 4 is the one that
 * makes the disagreement concrete rather than philosophical.
 *
 * FIG-COR-4 IS NOT A `Matrix`, THOUGH THE DOCUMENT NAMES ONE. That component
 * draws glyph states and the threshold table is four pairs of numbers; the
 * finding is the SPREAD between them, which is a bar chart. Recorded here
 * because the figure id still says Matrix in the source document.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Matrix, EITHER_OR } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Corrective() {
  return (
    <LessonPage slug="corrective">
      <Step n={1} title="Retrieval always returns something, and that is the hole">
        <P>
          A vector index asked for the top 6 passages returns 6 passages. It has no concept of “nothing here
          is relevant” — it returns the six least bad, and they arrive at the model looking exactly like six
          good ones. Same shape, same fields, same confident-looking scores.
        </P>
        <P>
          The model then does what it was told: answer from the provided context. If the context is junk the
          answer is junk assembled from junk, and it is <em>fluent</em> junk with citations attached — which
          is the worst available failure mode, because it is the one a reviewer is least likely to catch.
        </P>

        <Key>
          Corrective RAG is one idea: put a grader between retrieval and generation, and do something
          different depending on what it says. The “corrective” part is the branch, not the grade.
        </Key>

        <Figure
          title="The corrective loop, as the paper describes it"
          kind="illustration"
          sub="A drawing of the mechanism. Nothing in it was measured — the numbers that belong to it are in steps 2 and 3."
          source={
            <>
              The process is from Yan, Gu, Zhu &amp; Ling, <em>Corrective Retrieval Augmented Generation</em>,
              arXiv:2401.15884, fetched 2026-09-15.
            </>
          }
        >
          <Stages
            stages={[
              {
                verb: 'retrieve',
                out: '24 passages',
                does: 'over-fetch first, because a gate applied to 5 looks like a sparse corpus',
              },
              {
                verb: 'grade',
                out: 'Grade[] { verdict, why }',
                does: 'a small model reads each one — 0.77B in the paper, deliberately not the generator',
              },
              {
                verb: 'act',
                out: 'correct | ambiguous | incorrect',
                does: 'refine what you have · do both · throw it away and go somewhere else',
                rule: 'The branch is the pattern. A grader with one outcome is a logger.',
              },
              {
                verb: 'refine',
                out: 'the surviving strips, in order',
                does: 'cut each document into strips, score each, keep the survivors — so an 80%-irrelevant chunk contributes its 20%',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={2} title="CRAG, precisely — and the table nobody quotes beside the gains">
        <P>
          The evaluator is a T5-large, 0.77B parameters, fine-tuned to score a (query, document) pair from −1
          to +1. The training design is the interesting part: the negatives were sampled from the retriever’s
          own results — passages <em>similar to the query but not relevant</em> — so the grader is trained on
          exactly the distinction the retriever cannot make.
        </P>
        <P>
          Above the upper threshold it refines what it has. Below the lower threshold, for <em>every</em>{' '}
          document, it throws the whole retrieved set away and searches the web instead. Between the two, it
          does both.
        </P>

        <Figure
          title="The action thresholds are fitted per dataset, not constants"
          kind="cited"
          sub="Upper threshold per dataset, with the lower beside it. An upper of 0.95 on one corpus and 0.50 on another is a 45-point spread on a 2-point scale."
          source={
            <>
              CITED — Yan et al., arXiv:2401.15884, fetched 2026-09-15. These are the paper’s own tuned
              values, on the paper’s own datasets.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'Biography', value: 0.95, display: '0.95', note: 'lower −0.91' },
              { label: 'PopQA', value: 0.59, display: '0.59', note: 'lower −0.99' },
              { label: 'PubHealth', value: 0.5, display: '0.50', note: 'lower −0.91' },
              { label: 'ARC-Challenge', value: 0.5, display: '0.50', note: 'lower −0.91' },
            ]}
            labelWidth={190}
            axis="0 → 1.0 on the evaluator’s −1…+1 scale"
          />
        </Figure>

        <Key>
          These are fitted to a corpus, so shipping CRAG means either fitting them to yours — which needs
          labelled data you probably do not have — or accepting that the action selector is miscalibrated in
          an unknown direction. Anyone quoting CRAG’s gains should quote this chart beside them.
        </Key>

        <Figure
          title="Self-RAG → Self-CRAG, and the fourth row is the most useful one"
          kind="cited"
          sub="Three gains and one flat line. ARC-Challenge is multiple-choice science: the knowledge is in the weights, retrieval was not the bottleneck, and correcting a retrieval step that was not helping cannot help either."
          source={
            <>
              CITED — Yan et al., arXiv:2401.15884, LLaMA2-7B, fetched 2026-09-15. Accuracy, except Biography
              which is FactScore.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'PopQA', value: 61.8, before: 54.9, display: '61.8', beforeDisplay: '54.9', note: '+6.9 accuracy' },
              { label: 'Biography', value: 86.2, before: 81.2, display: '86.2', beforeDisplay: '81.2', note: '+5.0 FactScore' },
              { label: 'PubHealth', value: 74.8, before: 72.4, display: '74.8', beforeDisplay: '72.4', note: '+2.4 accuracy' },
              { label: 'ARC-Challenge', value: 67.2, before: 67.3, display: '67.2', beforeDisplay: '67.3', note: '−0.1 — retrieval was not the bottleneck' },
            ]}
            legend={['Self-RAG', 'Self-CRAG']}
            labelWidth={190}
          />
        </Figure>

        <Key>
          The pattern’s gain is proportional to how much your task actually depends on retrieval. That is a
          better predictor of whether it will help you than any of the three numbers above it.
        </Key>
      </Step>

      <Step n={3} title="This repo bet the other way, on purpose">
        <P>
          There is a rule in this repo that reads as a direct contradiction of CRAG’s central mechanism:{' '}
          <strong className="font-medium text-ui-fg">search has no score cutoff.</strong> It returns top-k
          even when everything is junk, and deciding “the answer is not in the corpus” is treated as reading
          comprehension that belongs to the model rather than to a threshold.
        </P>
        <P>
          The argument is not that CRAG is wrong. It is that a similarity score does not measure whether a
          passage answers a question — it measures whether the passage is <em>about the same topic</em>. The
          rideshare question retrieves the vehicle-use exclusion at a perfectly respectable similarity,
          because that clause is genuinely about vehicle use. It is topically excellent and it does not
          contain the answer, because the answer is in none of the documents. No threshold separates those
          two cases in either direction. What separates them is reading the passage.
        </P>

        <Key>
          Both bets are defensible and they fail differently. CRAG’s failure is a miscalibrated threshold
          silently discarding good retrieval. This repo’s failure is spending a generation on junk — more
          expensive per incident, and very much easier to see.
        </Key>
      </Step>

      <Step n={4} title="The correction this repo does make: gates, not scores">
        <P>
          The actual corrective step here is not scored at all. It over-fetches, then drops rows on{' '}
          <Term def="Facts recorded about a document rather than in it — its jurisdiction, its type, whether it has been superseded.">
            metadata
          </Term>{' '}
          — and the reason that is a different kind of mechanism is the number below.
        </P>

        <Figure
          title="The superseded bulletin is MORE similar to the query than its own replacement"
          sub="The taller bar is the wrong answer. That is not a fluke of one corpus: a replacement is usually broader, so it matches any single query less tightly, while the document it retired was written about exactly this situation."
          source={
            <>
              MEASURED HERE — recorded in docs/ROADMAP.md, from the insurance corpus. Nothing in the text of
              either document says which one is live; that fact is metadata.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'superseded bulletin', value: 0.654, display: '0.654', note: 'retired — must not be used' },
              { label: 'its replacement', value: 0.518, display: '0.518', note: 'live — the correct answer' },
            ]}
            labelWidth={210}
            axis="0 → 1.0 similarity to the query"
          />
        </Figure>

        <Key>
          Relevance ranking systematically prefers the stale document. A similarity threshold cannot fix this,
          because the stale document scores <em>higher</em> — it would be kept by any cutoff that kept the
          right one.
        </Key>

        <HowItWorks
          title="Over-fetch, then gate — and what an empty result has to say"
          path="apps/ai/insurance/src/tools/search-guidance.tool.ts:132–176"
          shape="assembled"
          plain={[
            'Ask for six times more rows than you intend to return, then drop them on facts. A gate applied to the top 5 turns 5 into 1 and looks like a sparse corpus; the same gate applied to the top 30 turns 30 into 5 and looks like a gate. Same code, entirely different diagnosis when it goes wrong.',
            'Jurisdiction is a hard gate rather than a ranking hint. A Texas circular does not reach an Illinois policy at ANY similarity score — there is no score at which the wrong jurisdiction becomes right, so it must not be expressible as a score.',
            'A status of "unknown" passes. A document whose status cannot be determined is not thereby dead, and silently dropping it would hide real guidance. Only an explicit retirement excludes it.',
            'And when the gate eats everything, the tool does not return an empty list. It returns an empty list AND an explanation of what empty means here, with what to try next. That is the cheapest corrective mechanism in the whole pattern.',
          ]}
          lines={[
            'const filter = doc_type ? { docType: doc_type } : undefined;',
            'const { hits: fusedHits } = await hybridSearch(store, query, want * 6, filter, …);',
            '',
            'const gated = hits',
            '  .filter(([d]) => GUIDANCE_TYPES.includes(String(d.metadata.docType) as never))',
            '  .filter(([d]) => {',
            '    const j = d.metadata.jurisdiction;',
            '    return !jurisdiction || !j || String(j) === jurisdiction;',
            '  })',
            '  .filter(([d]) => {',
            '    if (include_superseded) return true;',
            "    const st = String(d.metadata.status ?? 'unknown');",
            "    return st !== 'superseded' && st !== 'withdrawn' && st !== 'rescinded';",
            '  })',
            '  .slice(0, want);',
            '',
            'if (gated.length === 0) {',
            '  return {',
            '    results: [],',
            "    note: 'No guidance document matched those filters. This does NOT mean no '",
            "        + 'guidance exists — check whether the jurisdiction or doc_type was '",
            "        + 'too narrow, and search again before concluding the corpus is silent.',",
            '  };',
            '}',
          ]}
          mark={[1, 7, 12, 19]}
          trap="Some constraints are not preferences, and encoding them as preferences is a category error a good enough retriever will eventually exploit. Jurisdiction is the clearest case: as a ranking hint it is one very good match away from being ignored."
        />
      </Step>

      <Step n={5} title="The same finding again, from the other direction">
        <P>
          The steering retrieval suite reached the identical conclusion with a different mechanism. Case{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">ret-008</code> asks where a module’s behaviour
          is actually recorded. The answer is the test file, whose banner says the 2015 design note went stale
          and the tests are the surviving specification.
        </P>

        <P>
          {/* The same rule as the hybrid page: `/learn/retrieval` owns the chart for this run.
              ret-008 is cited here because the ARGUMENT is different — relevance against
              currency — not because the measurement is. */}
          The reranker moved it from rank 1 to rank 2 —{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">rr 1.00 → 0.50</code>, the only one of the eight
          cases it made worse. The chart for that run lives on lesson 2 of the machine track; what matters
          here is not the movement but the reason for it.
        </P>

        <Key>
          Relevance and currency are different questions, and nothing that reads only the text can tell them
          apart — not a threshold, not a reranker, not a grader. Currency is metadata, which is why the
          correction that works here is a gate.
        </Key>

        <Figure
          title="Which of the seven failure points a corrective layer actually touches"
          kind="cited"
          sub="Three of seven, and the three it cannot touch are generation problems that a better retrieval correction cannot reach."
          source={
            <>
              CITED — Barnett et al., <em>Seven Failure Points When Engineering a Retrieval Augmented
              Generation System</em>, CAIN 2024, arXiv:2401.05856, fetched 2026-09-15. The verdicts are this
              document’s reading of them.
            </>
          }
        >
          <Matrix
            rowHeader="failure point"
            marks={EITHER_OR}
            columns={['corrective RAG']}
            rows={[
              { name: 'FP1 missing content', cells: [{ state: 'live', detail: 'its best case — the only mechanism that detects it' }] },
              { name: 'FP2 missed top-ranked', cells: [{ state: 'wired', detail: 'bounded by the pool' }] },
              { name: 'FP3 not in context', cells: [{ state: 'live', detail: 'decompose-then-recompose' }] },
              { name: 'FP4 not extracted', cells: [{ state: 'refuses', detail: 'a generation problem' }] },
              { name: 'FP5 wrong format', cells: [{ state: 'refuses', detail: 'the answer contract’s job' }] },
              { name: 'FP6 wrong specificity', cells: [{ state: 'refuses', detail: 'not a retrieval correction' }] },
              { name: 'FP7 incomplete', cells: [{ state: 'refuses', detail: 'not a retrieval correction' }] },
            ]}
            footnote="Nothing in this grid is a fault, so nothing in it takes a severity colour — “no” means this pattern does not address that failure, not that something is broken."
          />
        </Figure>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm query "rental car limit" --form "PP 03 24 06 24"', does: 'one search through the gates', cost: 'money' },
          { cmd: 'pnpm steering:retrieval-eval --both', does: 'the ret-008 loss in step 5', cost: 'money' },
          { cmd: 'pnpm eval --only cov-002', does: 'the question whose answer is in none of the documents', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “So why not add the grader as well?” Because a grader is another model call on every question, and
            the failure we actually measured — a retired document outscoring its replacement — is one a grader
            would not catch either. It reads the text, and nothing in the text says which one is live.
          </>
        }
      >
        Search never says “I found nothing” — it returns the six least-bad passages and they look exactly like
        six good ones. The published fix puts a small model in front of the answer to grade what came back,
        and it works, but its thresholds are fitted per corpus and ours would need labelled data we do not
        have. So we correct a different way: we fetch six times more than we need and drop rows on facts —
        jurisdiction, document type, whether it has been retired. That gate is doing real work. In our
        corpus the superseded bulletin scores 0.654 against its own replacement’s 0.518, so without it the
        stale document wins every time.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'The CRAG numbers are not ours and not comparable to ours.',
            body: 'LLaMA2-7B on PopQA, Biography, PubHealth and ARC-Challenge, measured by the paper’s authors. Nothing in this repo has been benchmarked against Self-RAG.',
          },
          {
            claim: 'This repo has no grader at all, so the comparison is asymmetric.',
            body: 'The gate is compared against a threshold, not against CRAG’s evaluator. Whether a 0.77B grader would earn its call on this corpus is untested — the honest position is that it was never tried.',
          },
          {
            claim: 'The 0.654 / 0.518 pair is one pair of documents.',
            body: 'The argument for why it generalises — a replacement is broader and therefore matches any single query less tightly — is reasoning, not a second measurement.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'CRAG', def: 'Corrective Retrieval Augmented Generation. A small fine-tuned model grades each retrieved document, and the system branches on the grade.' },
          { word: 'knowledge refinement', def: 'Cutting each retrieved document into strips, scoring each strip, and recomposing the survivors in order — so a mostly-irrelevant chunk contributes only its relevant part.' },
          { word: 'gate', def: 'A filter on a fact rather than on a score. A document either is or is not in the right jurisdiction; there is no similarity at which that changes.' },
          { word: 'superseded', def: 'A document formally replaced by a later one. It still exists, still matches queries, and must not be answered from.' },
          { word: 'over-fetch', def: 'Asking for several times more rows than you intend to return, so that a filter applied afterwards is diagnosable rather than looking like an empty corpus.' },
        ]}
      />
    </LessonPage>
  );
}
