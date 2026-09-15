/**
 * Patterns lesson 5 — the page is not the text on the page.
 *
 * A READING OF `docs/rag/MULTIMODAL.md`.
 *
 * LAST IN THE TRACK BECAUSE IT UNDERCUTS THE OTHER FOUR. Every pattern above
 * assumes the meaning survived being turned into text. In a table, a chart or a
 * scan it did not — and no amount of better retrieval recovers information that
 * was discarded at load time.
 *
 * THE MEASURED FIGURE HERE IS THE ARGUMENT'S STRONGEST MOVE and it is not about
 * PDFs at all. 14% of this repo's passages have no usable structural label, on a
 * corpus of BORN-DIGITAL MARKDOWN — the friendliest input a loader will ever
 * get. Scanned pages are the same failure with the volume turned up, which is
 * how a page about a capability nobody here built still earns a measurement.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Matrix, EITHER_OR } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Multimodal() {
  return (
    <LessonPage slug="multimodal">
      <Step n={1} title="What a text extractor throws away, and when">
        <P>
          Every pipeline in this track so far assumes documents are text: load the file, cut it into chunks,
          embed the chunks. That is fine while the meaning is in the words. Open a real corpus and look at
          what is actually in it — a schedule of limits is a <strong className="font-medium text-ui-fg">table</strong>,
          where the limit for a coverage is defined by which row and which column a number sits in. An
          engineering change notice is a drawing with a callout. A batch record is a scanned form with
          handwriting in the margin.
        </P>
        <P>
          Run a text extractor over a table and you get{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">Collision 50,000 1,000 Comprehensive 25,000 500
          Rental 900 0</code>. Which number is the rental deductible — 0, or 900? A careful reader can
          recover it. An embedding cannot, because the embedding was computed over that flattened string and
          the spatial relationship was destroyed before anything was embedded.
        </P>

        <Key>
          No amount of better retrieval recovers information that was discarded at load time. That is the
          whole lesson, and it is the reason this one sits last: it is the failure the four patterns above it
          cannot reach.
        </Key>
      </Step>

      <Step n={2} title="Two families, and they are genuinely different bets">
        <P>
          <strong className="font-medium text-ui-fg">Family A translates to text, then does everything as
          before.</strong> Put a vision model in the ingest path: for every page, generate a description,
          transcribe the tables as markdown, state what each chart shows — and index that.
        </P>

        <Figure
          title="Family A — describe the page, then it is the ordinary pipeline"
          kind="illustration"
          sub="The shared tail is the appeal: after the caption stage, the same store, the same search, the same reranker and the same tools. Nothing downstream has to know."
          source="The process is docs/rag/MULTIMODAL.md §2. Timings are the document’s order-of-magnitude figures, not a run."
        >
          <Stages
            stages={[
              { verb: 'rasterise', out: 'page.png @ 200dpi', does: 'one image per page' },
              {
                verb: 'caption',
                out: 'markdown text',
                does: 'A VLM CALL PER PAGE, roughly 6–10 seconds',
                rule: 'Lossy, and irreversibly so: the caption chose what mattered before it knew the question.',
              },
              { verb: 'chunk', out: 'Chunk[]', does: '…and from here it is the ordinary pipeline' },
              { verb: 'embed', out: 'float[1536]', does: 'the same store, search, reranker and tools' },
            ]}
          />
        </Figure>

        <P>
          <strong className="font-medium text-ui-fg">Family B stops transcribing altogether.</strong> Encode
          the page image into many small vectors and match the query against the picture directly — no text
          is produced at any point, so nothing is chosen in advance and nothing is discarded.
        </P>

        <Figure
          title="Family B — never turn it into text at all"
          kind="illustration"
          sub="Twenty times faster to index and thirty times larger to store. The trade is not subtle and it is the whole decision."
          source="The process is docs/rag/MULTIMODAL.md §2, describing ColPali. The numbers beside it are cited in step 3."
        >
          <Stages
            stages={[
              { verb: 'rasterise', out: 'page.png', does: 'one image per page' },
              {
                verb: 'encode',
                out: '~1024 × float[128]',
                does: 'SigLIP patches through PaliGemma-3B, about half a second',
                rule: 'Nothing is transcribed, so nothing is discarded.',
              },
              {
                verb: 'store',
                out: '256 KB per page',
                does: 'multi-vector — and pgvector indexes ONE vector per row',
                rule: 'The infrastructure assumption that breaks. It is not a config change.',
              },
              { verb: 'maxsim', out: 'a score per page', does: 'Σ over query tokens of the max over patches' },
            ]}
          />
        </Figure>
      </Step>

      <Step n={3} title="The numbers, and the row that says what the win actually is">
        <Figure
          title="ViDoRe, average nDCG@5"
          kind="cited"
          sub="The first row is the ablation and it is the important one: a vision model WITHOUT late interaction scores worst of all four. The win is the matching mechanism, not “use a vision model”."
          source={
            <>
              CITED — the ViDoRe benchmark, introduced with ColPali, fetched 2026-09-15. Measured on their
              document set, not ours.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'SigLIP — no late interaction', value: 51.4, display: '51.4', note: 'the ablation: a vision model on its own' },
              { label: 'Unstructured + OCR', value: 66.1, display: '66.1' },
              { label: 'Unstructured + captioning', value: 67.0, display: '67.0', note: '+0.9 over OCR — family A’s real ceiling' },
              { label: 'ColPali', value: 81.3, display: '81.3' },
            ]}
            labelWidth={220}
            axis="0 → 100 nDCG@5"
          />
        </Figure>

        <Figure
          title="Indexing seconds per page — the counter-intuitive one"
          kind="cited"
          sub="The approach that never produces text is 10–20× faster to index, because it skips the parsing entirely. The cost has moved, not disappeared; see the next figure."
          source="CITED — same source as above, fetched 2026-09-15."
        >
          <BarRows
            rows={[
              { label: 'Unstructured + captioning', value: 10.0, display: '10.0 s' },
              { label: 'Unstructured + OCR', value: 6.0, display: '6.0 s' },
              { label: 'ColPali', value: 0.5, display: '0.5 s', note: '10–20× faster — it skips the parsing' },
            ]}
            labelWidth={220}
            axis="0 → 10 seconds per page"
          />
        </Figure>

        <Figure
          title="Kilobytes per page — the bill"
          kind="cited"
          sub="This is where the saved indexing time went. 100,000 pages is about 25 GB of vectors, and pgvector indexes one vector per row — so it is an infrastructure decision before it is a retrieval one."
          source="CITED — same source, fetched 2026-09-15. fp16."
        >
          <BarRows
            rows={[
              { label: 'BM25 — sparse', value: 3.0, display: '3.0 KB' },
              { label: 'BGE-M3 — dense', value: 8.6, display: '8.6 KB' },
              { label: 'ColPali — fp16', value: 256.0, display: '256 KB', note: 'about 30× BGE-M3 · 100k pages ≈ 25 GB' },
            ]}
            labelWidth={220}
            axis="0 → 256 KB per page"
          />
        </Figure>
      </Step>

      <Step n={4} title="The same failure, measured here, on the friendliest possible input">
        <P>
          None of this repo’s corpora contain a scan. The loader reads three extensions —{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">.md</code>,{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">.markdown</code>,{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">.txt</code> — and skips everything else rather
          than half-parsing it, which is the right call when the alternative is a half-parsed PDF entering the
          index looking like a real document.
        </P>
        <P>
          And structure is still being lost, at measurable scale, on born-digital markdown.
        </P>

        <Figure
          title="What each passage has where its heading should be"
          sub="552 of 3,854 passages — 14% — have no usable structural label. 259 of them have a decorative confidentiality banner in that slot: the loader found a heading, and the heading was a row of equals signs."
          source={
            <>
              MEASURED HERE — over all 3,854 passages of the steering corpus, recorded in
              docs/steering/evals/RETRIEVAL.md.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'a real heading trail', value: 2835, display: '2,835', note: '… > 2. Requirements > SR-ALT-08-0181' },
              { label: 'the document title alone', value: 467, display: '467' },
              { label: 'nothing at all', value: 293, display: '293', note: 'every closure report, every MISRA report' },
              { label: 'a ==== banner', value: 259, display: '259', note: 'every CRS — decoration where a heading should be' },
            ]}
            labelWidth={220}
            axis="0 → 3,854 passages"
          />
        </Figure>

        <Key>
          An unlabelled hit still occupies a top-k slot while being neither a hit nor an intruder — so it is
          invisible in a recall number. That is what losing structure costs, concretely, in a pipeline nobody
          would call multimodal.
        </Key>

        <HowItWorks
          title="Three extensions, and the exact line a multimodal branch would go on"
          path="packages/grounding/src/loader.ts:37–49"
          plain={[
            'LOADERS is a map from file extension to the thing that reads it. There are three entries and all three are text.',
            'The flag above it matters more than it looks: without UnknownHandling.Ignore, a stray .DS_Store or a PDF dropped into the corpus throws and the whole ingest dies. Skipping what cannot be read is deliberate, and losing that behaviour silently would have been a regression.',
            'So a PDF entering this corpus today is skipped rather than half-parsed — which is the right call, because a half-parsed PDF in the index looks exactly like a real document.',
            'It is also precisely where the fork is. ’.pdf’ is one more entry in this map. Everything on this page is about what has to be true before adding it.',
          ]}
          lines={[
            '/**',
            ' * Which extensions get read, and with what.',
            ' *',
            ' * `UnknownHandling.Ignore` is the important flag: without it, a stray `.DS_Store`',
            ' * or a PDF dropped into the corpus throws and the whole ingest dies. Skipping',
            ' * what we cannot read is the behaviour the hand-rolled version had via its',
            ' * extension allow-list, and losing it silently would have been a regression.',
            ' */',
            'const LOADERS = {',
            "  '.md': (p: string) => new TextLoader(p),",
            "  '.markdown': (p: string) => new TextLoader(p),",
            "  '.txt': (p: string) => new TextLoader(p),",
            '};',
          ]}
          mark={[3, 8, 12]}
          trap="The fix for the 552 unlabelled passages was not a model. It was using the file path as the label when the heading trail is empty — which is worth carrying into any multimodal design: before reaching for a vision model, check whether the structure you need is already sitting in the filename or the directory."
        />
      </Step>

      <Step n={5} title="Deciding between them">
        <Figure
          title="Which family, for which corpus"
          kind="illustration"
          sub="A decision table. The one row that is not a trade-off is “must quote the page exactly”: a caption is a paraphrase, so family A cannot support a verbatim citation at all."
          source="docs/rag/MULTIMODAL.md §6. The benchmark numbers behind the general claims are cited in step 3."
        >
          <Matrix
            rowHeader="what you have"
            marks={EITHER_OR}
            columns={['text only', 'captions', 'ColPali']}
            rows={[
              {
                name: 'meaning is in the prose',
                cells: [
                  { state: 'live', detail: 'yes' },
                  { state: 'refuses', detail: 'no — wasted' },
                  { state: 'refuses', detail: 'no — wasted' },
                ],
              },
              {
                name: 'tables where position matters',
                cells: [
                  { state: 'refuses', detail: 'no' },
                  { state: 'wired', detail: 'ok' },
                  { state: 'live', detail: 'best — +32.4 on TAT-DQA' },
                ],
              },
              {
                name: 'charts and drawings',
                cells: [
                  { state: 'refuses', detail: 'no' },
                  { state: 'wired', detail: 'ok' },
                  { state: 'live', detail: 'best' },
                ],
              },
              {
                name: 'scans, stamps, handwriting',
                cells: [
                  { state: 'refuses', detail: 'no' },
                  { state: 'wired', detail: 'ok' },
                  { state: 'live', detail: 'best' },
                ],
              },
              {
                name: 'must quote the page exactly',
                cells: [
                  { state: 'live', detail: 'yes' },
                  { state: 'refuses', detail: 'NO — a caption is a paraphrase' },
                  { state: 'live', detail: 'yes' },
                ],
              },
              {
                name: 'storage is capped',
                cells: [
                  { state: 'live', detail: 'yes' },
                  { state: 'live', detail: 'yes' },
                  { state: 'refuses', detail: 'no — 256 KB per page' },
                ],
              },
            ]}
            footnote="Nothing here is a fault and nothing takes a severity colour. “No” means this family does not serve that requirement."
          />
        </Figure>

        <Key>
          Both engagements here cite file and line, and one row of that table says a caption pipeline cannot.
          That single property would decide it for this repo before any benchmark did.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm chunks', does: 'the corpus and its chunking, including what got no heading', cost: 'free' },
          { cmd: 'pnpm steering:retrieval-eval', does: 'recall over the passages the table in step 4 counts', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “Does that mean our pipeline is losing things today?” Yes, and we have the number: 14% of passages
            have no usable heading, and 259 of them have a confidentiality banner where the heading should
            be. That is on markdown. We fixed it by falling back to the file path — no model involved — which
            is the first thing to try before anyone buys a vision model.
          </>
        }
      >
        Everything we have built assumes the meaning is in the words. In a table it is in the layout — which
        column a number is in — and a text extractor flattens that before anything gets embedded. There are
        two answers. One puts a vision model in the ingest path to describe each page, which is lossy because
        it decides what matters before it knows the question, and it cannot give you a verbatim quote. The
        other never makes text at all: it matches the query against the picture. That one indexes twenty
        times faster and costs about thirty times the storage — 256 KB a page, so 100,000 pages is 25 GB.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'Nothing in the first three steps was built or measured here.',
            body: 'ViDoRe, the indexing timings and the storage figures are the ColPali authors’ numbers on their own document set. This repo has never rasterised a page.',
          },
          {
            claim: 'The 14% is a different failure from the one the page is about.',
            body: 'Lost heading trails in markdown and lost layout in a scan share a shape — structure discarded before embedding — but they are not the same defect, and the second has not been measured here at all. The first is offered as the nearest evidence available, not as a proxy.',
          },
          {
            claim: 'The decision table is reasoning, not a result.',
            body: 'Six rows of judgement about three families, written against these two engagements’ needs. A corpus with different needs would order it differently.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'VLM', def: 'A vision-language model. Reads an image and writes text about it.' },
          { word: 'late interaction', def: 'Comparing every query token against every document patch and keeping the best match per token, rather than comparing two single summary vectors. The ablation in step 3 says this, and not the vision model, is where the win comes from.' },
          { word: 'multi-vector', def: 'Storing many vectors per document rather than one. It is what makes late interaction possible and what makes the storage bill 30×.' },
          { word: 'MaxSim', def: 'The scoring function for late interaction: for each query token take its best-matching patch, then sum.' },
          { word: 'heading trail', def: 'The chain of headings above a passage, carried as metadata so a hit can say where in the document it came from.' },
          { word: 'born-digital', def: 'A file created as a file rather than scanned from paper. The friendliest possible input to a loader — which is what makes the 14% in step 4 the sharp number it is.' },
        ]}
      />
    </LessonPage>
  );
}
