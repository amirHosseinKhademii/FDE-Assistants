/**
 * `/` — Wrap, the plan in one page.
 *
 * WHO ARRIVES HERE. Someone who has been sent the link and wants to know what
 * the project is and how far it has got. Not a buyer, and not a reader of the
 * code: the page says what was built, what it measured, and what is next.
 *
 * EVERY NUMBER HERE IS IN `docs/wrap/PROGRESS.md` OR `docs/wrap/PLAN.md`, and the
 * comment beside it says which. A figure that is not in one of those two files
 * is left out, not estimated. The two stub figures in the measured section are
 * labelled as a harness check, because that is what they are.
 *
 * SHARED PARTS: the wash behind the hero is `Aurora` from `@veresk/surface`,
 * given this app's two tones in `lib/aurora.ts`. The entrance is the shared
 * `lift-in` class. The progress strip, the roadmap dots and the status pills
 * are this app's own classes in `styles/app.css`, which the step pages use too.
 */
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';

/** PROGRESS.md, Step 1.2 — the stub baseline over 27 answerable cases. */
const STUB_BASELINE = [
  { metric: 'Recall@3', value: '0.037' },
  { metric: 'Recall@6', value: '0.074' },
  { metric: 'Recall@10', value: '0.222' },
  { metric: 'MRR', value: '0.045' },
  { metric: 'Hit-rate', value: '0.222' },
];

/** PROGRESS.md, "Step 0.2" to "Step 2.5". One number each, and the step it came from. */
const PIPELINE = [
  {
    n: '0.3',
    title: 'First model calls',
    fig: '0.824',
    says: 'cosine similarity of steering text to steering text. Unrelated weather text scores 0.436.',
  },
  {
    n: '1.1',
    title: 'Golden set, by hand',
    fig: '30',
    says: 'questions written before any retrieval code, each with its expected source and facts.',
  },
  {
    n: '1.2',
    title: 'Eval runner',
    fig: '27',
    says: 'answerable cases scored for recall, MRR and hit-rate, using a stub search for now.',
  },
  {
    n: '2.1',
    title: 'Format detection',
    fig: '1,111',
    says: 'files typed by reading their bytes, not their names. 6 extensions turned out to be wrong.',
  },
  {
    n: '2.2',
    title: 'Dedup',
    fig: '18',
    says: 'exact copies removed by SHA-256, and near-copies caught by hand-written MinHash.',
  },
  {
    n: '2.3',
    title: 'PII scrubbing',
    fig: '779',
    says: 'email addresses replaced with tokens. The map that restores them is kept apart.',
  },
  {
    n: '2.4',
    title: 'Type-aware chunking',
    fig: '15,795',
    says: 'chunks after exact-duplicate removal. Markdown by heading, C by function, CSV one row each.',
  },
  {
    n: '2.5',
    title: 'Metadata',
    fig: '12%',
    says: 'of chunks carry a requirement ID, so they can be filtered on it later.',
  },
];

/** PLAN.md, the phase table. Status from PROGRESS.md; step counts are the plan's. */
type PhaseStatus = 'done' | 'in progress' | 'planned';
const PHASES: { n: string; name: string; focus: string; steps: number; done: number; status: PhaseStatus }[] = [
  { n: '0', name: 'Setup & the mess', focus: 'Scaffold the workspace, make the corpus messier, first model calls.', steps: 3, done: 3, status: 'done' },
  { n: '1', name: 'Evals first', focus: 'Thirty golden questions and a runner for recall, MRR and hit-rate.', steps: 2, done: 2, status: 'done' },
  { n: '2', name: 'Ingestion from scratch', focus: 'Format detection, dedup, PII, chunking, metadata, then embed and store.', steps: 6, done: 5, status: 'in progress' },
  { n: '3', name: 'The RAG ladder', focus: 'Vector search, BM25, hybrid fusion, reranking and the variants above them.', steps: 12, done: 0, status: 'planned' },
  { n: '4', name: 'The customer’s API', focus: 'A NestJS backend with no AI in it, built to behave like a legacy system.', steps: 3, done: 0, status: 'planned' },
  { n: '5', name: 'Tools & agents', focus: 'A tool-calling loop written by hand, a tool catalogue, and guardrails.', steps: 4, done: 0, status: 'planned' },
  { n: '6', name: 'MCP', focus: 'A stdio and HTTP MCP server, with resources and prompts, and our own client.', steps: 4, done: 0, status: 'planned' },
  { n: '7', name: 'Product polish', focus: 'A streaming chat UI with citations, tracing, cost and caching, a comparison dashboard.', steps: 4, done: 0, status: 'planned' },
  { n: '8', name: 'Optional: cloud & comparison', focus: 'Azure Foundry against Bedrock, and a comparison with @fde/grounding.', steps: 3, done: 0, status: 'planned' },
];

const STATUS_TONE: Record<PhaseStatus, 'done' | 'next' | 'planned'> = {
  done: 'done',
  'in progress': 'next',
  planned: 'planned',
};

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        {/* 1. HERO — the promise, the corpus, and who does what. */}
        <section className="pt-12 pb-16 md:pt-20 md:pb-20">
          <h1
            className="lift-in title-spectrum text-[3.25rem] leading-none font-bold tracking-tight md:text-[4.5rem]"
            style={{ animationDelay: '60ms' }}
          >
            Wrap
          </h1>
          <p
            className="lift-in mt-6 max-w-[40ch] text-[1.375rem] leading-snug font-semibold text-ui-fg md:text-[1.625rem]"
            style={{ animationDelay: '160ms' }}
          >
            A document ingestion and retrieval pipeline, built from scratch. Every piece is hand-rolled and measured.
          </p>
          <p
            className="lift-in mt-5 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ui-dim"
            style={{ animationDelay: '260ms' }}
          >
            The corpus is the Vantis steering estate: 1,111 deliberately messy files, with flaws planted before any code
            touches them. The learner writes the code. Claude tutors the AI concepts from first principles.
          </p>
          <div className="lift-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '360ms' }}>
            <Link
              to="/steps"
              className="rounded-xl bg-wrap-1 px-6 py-3 font-medium text-ui-bg transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-wrap-1/40 focus-visible:outline-none"
            >
              How it works
            </Link>
            <p className="text-sm text-ui-faint">Phases 0 and 1 are done. Phase 2 is in progress.</p>
          </div>
        </section>

        {/* 2. THE MESS — what the pipeline has to survive. Counts from PROGRESS.md, Steps 0.2, 1.1, 2.1–2.3. */}
        <section className="mt-4" aria-labelledby="mess-title">
          <h2 id="mess-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The mess we start from
          </h2>
          <p className="mt-2 mb-8 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Before any code runs, a script plants flaws in a copy of the corpus. The seed is fixed, so the same flaws
            appear on every run.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Flaw fig="41" label="planted flaws in 1,111 files, from seed 42." />
            <Flaw fig="6" label="extension mismatches the detector catches by reading the bytes. Example: a Markdown file named .c." />
            <Flaw fig="4" label="files in Windows-1252 encoding, and only one of them has the high bytes that give it away." />
            <Flaw fig="10" label="exact copies: 5 originals, each with two `_copy_N_of_` files." />
            <Flaw fig="10" label="near-copies, `_v2` files edited in two to five lines each." />
            <Flaw fig="779 · 937" label="email addresses and handles to scrub. Also 15 phone numbers and 15 person names." />
            <Flaw fig="3" label="traps: an empty file, a huge file of repeated text, and a scanned document." />
          </dl>
        </section>

        {/* 3. THE PIPELINE SO FAR — one real number per finished step, each linking to its page. */}
        <section className="mt-20" aria-labelledby="pipe-title">
          <h2 id="pipe-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The pipeline so far
          </h2>
          <p className="mt-2 mb-8 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Each finished step, with the one figure it produced. The step page has the code, the commands and what
            went wrong.
          </p>
          <ol className="grid gap-3 md:grid-cols-2">
            {PIPELINE.map((s) => (
              <li key={s.n} className="wrap-card flex gap-4">
                <span className="wrap-dot mt-0.5 shrink-0" data-state="done" aria-hidden>
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-[1.25rem] font-bold text-wrap-1">{s.fig}</span>
                    <span className="font-semibold text-ui-fg">
                      <span className="sr-only">Step {s.n}: </span>
                      {s.title}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ui-dim">{s.says}</p>
                  <Link to="/steps" className="wrap-a mt-2 inline-block text-[0.9375rem]">
                    Step {s.n} →
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. MEASURED, NOT GUESSED — the scoreboard, and the honest state of its numbers. */}
        <section className="mt-20" aria-labelledby="measure-title">
          <h2 id="measure-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            Measured, not guessed
          </h2>
          <p className="mt-2 mb-6 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Every retrieval change is scored the same way: recall at 3, 6 and 10, MRR and hit-rate over the golden
            questions. The compare step refuses to diff two runs made with a different model, fixture mode or repeat
            count, because that would measure the setup and not the code.
          </p>
          <div className="wrap-card max-w-xl">
            <p className="wrap-label" data-tone="quiet">
              Stub baseline, 27 answerable cases
            </p>
            <table className="wrap-table mt-4">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {STUB_BASELINE.map((row) => (
                  <tr key={row.metric}>
                    <td>{row.metric}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="wrap-note">
              <strong>These are not retrieval scores.</strong> The stub search places the right document in the top 10
              for about one query in three, on purpose. The numbers prove the harness works. The real baseline arrives
              when real retrieval replaces the stub.
            </p>
          </div>
        </section>

        {/* 5. THE ROAD AHEAD — all nine phases from the plan, with status from the progress log. */}
        <section className="mt-20" aria-labelledby="road-title">
          <h2 id="road-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The road ahead
          </h2>
          <p className="mt-2 mb-8 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Nine phases, each with its steps in the plan. The status is what the progress log says today.
          </p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PHASES.map((p) => (
              <li key={p.n} className="wrap-card flex flex-col gap-2" data-state={p.status}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[1.0625rem]">
                    <span className="text-ui-faint">{p.n}. </span>
                    {p.name}
                  </h3>
                  <span className="wrap-pill shrink-0" data-tone={STATUS_TONE[p.status]}>
                    {p.status}
                  </span>
                </div>
                <p className="text-[0.9375rem] leading-relaxed text-ui-dim">{p.focus}</p>
                <p className="mt-auto pt-2 text-[0.8125rem] text-ui-faint">
                  {p.done} of {p.steps} steps done
                </p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-20 text-[0.9375rem] text-ui-faint">
          Wrap is a learning project. The plan and the progress log live in the repository under{' '}
          <code>docs/wrap/</code>.
        </p>
      </main>
    </div>
  );
}

function Flaw({ fig, label }: { fig: string; label: string }) {
  return (
    <div className="wrap-card">
      <dt className="text-[1.5rem] font-bold text-wrap-2">{fig}</dt>
      <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-ui-dim">{label}</dd>
    </div>
  );
}
