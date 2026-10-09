/**
 * The start-to-finish path through /learn, in nine phases.
 *
 * ── WHAT THIS IS, AND WHAT THE TOPIC VIEW STILL IS ─────────────────────────
 *
 * `lessons.ts` groups the 27 lessons by TOPIC: the machine, what you build
 * after it works, and so on. That view is still here and still correct, and it
 * is what the rail shows under "By topic". THIS file is the other order: the
 * order you would build the thing in, from `docs/wrap/PLAN.md` phases 0–8.
 *
 * A stop is one of three things, and the path is the flat sequence of them:
 *
 *   lesson  a page in /learn (one of the 27 in `lessons.ts`)
 *   build   a step that was built; its write-up lives on the phase page
 *   gap     a planned step that has not been built yet; it has no page
 *
 * ── THE INTERLEAVING RULE ──────────────────────────────────────────────────
 *
 * A lesson sits just before the build step it explains, where that is obvious
 * (vectors before 0.3, evals before 1.2, residency before 2.3). Otherwise the
 * lessons come first in their phase. The order is an argument, so it is
 * written down here and `pathCoverageErrors()` checks what can be checked
 * mechanically: that every lesson appears exactly once, and that every wrap
 * step appears exactly once with the status the wrap data gives it.
 *
 * ── WHY THE BUILD LABELS ARE WRITTEN OUT ───────────────────────────────────
 *
 * The wrap step titles are sentences ("Dedup: exact SHA-256 matches, then
 * MinHash near-copies"). The rail has fourteen rem and wants a noun, so the
 * short label is written here, next to the step number it names.
 */
import { LESSONS, lessonBySlug, type LessonSlug } from './lessons';
import { PHASES as WRAP_PHASES } from './wrap-steps';

export type PhaseId = 'p0' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8';

export type Stop =
  | { kind: 'lesson'; slug: LessonSlug }
  | { kind: 'build'; step: string }
  | { kind: 'gap'; step: string; title: string };

export interface PathPhase {
  id: PhaseId;
  n: number;
  title: string;
  /** One or two plain sentences: what you have at the end of the phase. */
  blurb: string;
  stops: Stop[];
}

const lesson = (slug: LessonSlug): Stop => ({ kind: 'lesson', slug });
const build = (step: string): Stop => ({ kind: 'build', step });
const gap = (step: string, title: string): Stop => ({ kind: 'gap', step, title });

/** The rail's short name for each built step. Gaps carry their own title. */
const BUILD_LABEL: Record<string, string> = {
  '0.1': 'Project and Postgres',
  '0.2': 'Make the mess',
  '0.3': 'First model calls',
  '1.1': 'Golden set',
  '1.2': 'Eval runner',
  '2.1': 'Format detection',
  '2.2': 'Dedup',
  '2.3': 'PII scrubbing',
  '2.4': 'Chunking',
  '2.5': 'Metadata',
  '2.6': 'Embed and store',
};

export const PATH: PathPhase[] = [
  {
    id: 'p0',
    n: 0,
    title: 'Setup & the mess',
    blurb:
      'A database that can hold vectors, a deliberately messy copy of the data to work on, and a first call to the model. The repo map is a reference, not a step: come back to it whenever you lose track of where a file lives.',
    stops: [lesson('pipelines'), lesson('vectors'), build('0.1'), build('0.2'), build('0.3')],
  },
  {
    id: 'p1',
    n: 1,
    title: 'Evals first',
    blurb:
      'Write the answer key before building anything, so you can tell when the system is wrong. Then run it, and learn why a green run is not proof.',
    stops: [lesson('answer-key'), lesson('evals'), lesson('regressions'), lesson('guessing'), build('1.1'), build('1.2')],
  },
  {
    id: 'p2',
    n: 2,
    title: 'Ingestion from scratch',
    blurb:
      'Turn a folder of mixed files into clean, searchable chunks with metadata, and store them. Each build step is one part of that pipeline, written by hand.',
    stops: [
      lesson('multimodal'),
      lesson('residency'),
      lesson('drift'),
      build('2.1'),
      build('2.2'),
      build('2.3'),
      build('2.4'),
      build('2.5'),
      build('2.6'),
    ],
  },
  {
    id: 'p3',
    n: 3,
    title: 'The RAG ladder',
    blurb:
      'Climb from naive vector search through keyword, hybrid, reranking and graph retrieval, measuring every rung against the same questions. These rungs are planned and not yet built.',
    stops: [
      lesson('retrieval'),
      lesson('hybrid'),
      lesson('attention'),
      lesson('context'),
      lesson('corrective'),
      lesson('graph'),
      gap('3.1', 'Naive vector RAG'),
      gap('3.2', 'Metadata filtering'),
      gap('3.3', 'BM25'),
      gap('3.4', 'Hybrid RRF'),
      gap('3.5', 'Reranking'),
      gap('3.6', 'Multi-query'),
      gap('3.7', 'HyDE'),
      gap('3.8', 'Parent–child'),
      gap('3.9', 'Contextual compression'),
      gap('3.10', 'Corrective RAG'),
      gap('3.11', 'Text-to-SQL'),
      gap('3.12', 'Graph RAG lite'),
    ],
  },
  {
    id: 'p4',
    n: 4,
    title: 'The customer’s API (no AI)',
    blurb:
      'Build the legacy API the agent will call, without any model in it, so the agent has something real to work against. Its boundaries are the lesson.',
    stops: [lesson('credentials'), gap('4.1', 'NestJS API scaffold'), gap('4.2', 'Legacy API behaviour'), gap('4.3', 'Typed client and contract test')],
  },
  {
    id: 'p5',
    n: 5,
    title: 'Tools and agents',
    blurb:
      'Let the model call tools in a loop, with the rules living inside the tools and a guard around every write.',
    stops: [
      lesson('generation'),
      lesson('loop'),
      lesson('tools'),
      lesson('agentic'),
      lesson('injection'),
      lesson('orchestration'),
      gap('5.1', 'Tool-calling loop'),
      gap('5.2', 'Tool catalogue'),
      gap('5.3', 'Agentic RAG router'),
      gap('5.4', 'Guardrails'),
    ],
  },
  {
    id: 'p6',
    n: 6,
    title: 'MCP',
    blurb:
      'Expose the tools through the Model Context Protocol so other clients can use them, then write a client of our own to check the server from the other side.',
    stops: [gap('6.1', 'Stdio MCP server'), gap('6.2', 'Resources and prompts'), gap('6.3', 'HTTP transport and auth'), gap('6.4', 'Custom MCP client')],
  },
  {
    id: 'p7',
    n: 7,
    title: 'Product polish',
    blurb:
      'Make it fast, observable and affordable: stream the answers, trace every call, and measure what each question costs.',
    stops: [
      lesson('forensics'),
      lesson('cost'),
      lesson('caching'),
      gap('7.1', 'Streaming chat UI'),
      gap('7.2', 'Tracing and observability'),
      gap('7.3', 'Cost analysis and caching'),
      gap('7.4', 'RAG comparison dashboard'),
    ],
  },
  {
    id: 'p8',
    n: 8,
    title: 'Cloud & comparison',
    blurb:
      'Run the same evals on two cloud providers, compare the build with the shared grounding library on the same questions, and write up what was built and what went wrong.',
    stops: [
      lesson('finetuning'),
      lesson('ceiling'),
      gap('8.1', 'Multi-provider eval'),
      gap('8.2', 'Compare with @fde/grounding'),
      gap('8.3', 'Interview case study'),
    ],
  },
];

// ── Reading the path ───────────────────────────────────────────────────────

/** A stop's key: its slug for a lesson, its step number for a build or gap. */
export const stopKey = (s: Stop): string => (s.kind === 'lesson' ? s.slug : s.step);

/** Flat, in path order. */
export function pathOrder(): Stop[] {
  return PATH.flatMap((p) => p.stops);
}

/** Index of a lesson slug or a step number in the flat path, or -1. */
export function stopIndexOf(key: LessonSlug | string): number {
  return pathOrder().findIndex((s) => stopKey(s) === key);
}

/** The phase a lesson slug or a step number sits in. */
export function phaseOf(key: LessonSlug | string): PathPhase | undefined {
  return PATH.find((p) => p.stops.some((s) => stopKey(s) === key));
}

/** Where a stop sits inside its phase: 1-based, out of the phase's total. */
export function stopPosition(key: LessonSlug | string): { phase: PathPhase; stop: number; of: number } | undefined {
  const phase = phaseOf(key);
  if (!phase) return undefined;
  const i = phase.stops.findIndex((s) => stopKey(s) === key);
  return { phase, stop: i + 1, of: phase.stops.length };
}

export function nextStop(key: LessonSlug | string): Stop | undefined {
  const i = stopIndexOf(key);
  return i < 0 ? undefined : pathOrder()[i + 1];
}

export function prevStop(key: LessonSlug | string): Stop | undefined {
  const i = stopIndexOf(key);
  return i <= 0 ? undefined : pathOrder()[i - 1];
}

/**
 * The neighbours a reader can actually land on. A gap has no page, so it is
 * skipped: "next" from the end of retrieval goes to hybrid, not to 3.1.
 * A build is reachable, as an anchor on its phase page.
 */
export function linkableNeighbours(key: LessonSlug | string): { prev?: Stop; next?: Stop } {
  const all = pathOrder();
  const i = stopIndexOf(key);
  if (i < 0) return {};
  const prev = all.slice(0, i).reverse().find((s) => s.kind !== 'gap');
  const next = all.slice(i + 1).find((s) => s.kind !== 'gap');
  return { prev, next };
}

/** Where a stop links. Lessons have a page; builds and gaps point into their phase. */
export function stopHref(s: Stop, base: string): string {
  if (s.kind === 'lesson') return `${base}/${s.slug}`;
  const phase = phaseOf(s.step);
  return `${base}/phase/${phase?.id ?? 'p0'}#step-${s.step}`;
}

/** The short label a stop carries in the rail and in the prev/next cards. */
export function stopLabel(s: Stop): string {
  if (s.kind === 'lesson') return lessonBySlug(s.slug).short;
  if (s.kind === 'build') return `Build · ${s.step} ${BUILD_LABEL[s.step]}`;
  return `Planned · ${s.step} ${s.title}`;
}

/** The full title a stop links under: the lesson's own, or the wrap step's. */
export function stopTitle(s: Stop): string {
  if (s.kind === 'lesson') return lessonBySlug(s.slug).title;
  if (s.kind === 'gap') return s.title;
  for (const p of WRAP_PHASES) {
    const found = p.steps.find((st) => st.n === s.step);
    if (found) return found.title;
  }
  return s.step;
}

/** Lessons and builds, counted per phase, for the "4 lessons · 6 builds" line. */
export function phaseCounts(phase: PathPhase): { lessons: number; builds: number; planned: number } {
  return {
    lessons: phase.stops.filter((s) => s.kind === 'lesson').length,
    builds: phase.stops.filter((s) => s.kind === 'build').length,
    planned: phase.stops.filter((s) => s.kind === 'gap').length,
  };
}

// ── The check ──────────────────────────────────────────────────────────────

/**
 * Everything the path can get wrong that a typecheck cannot see. An empty array
 * is a pass. `path-selftest.ts` runs this and fails on any message.
 */
export function pathCoverageErrors(): string[] {
  const errors: string[] = [];
  const all = pathOrder();

  // Every lesson exactly once, and nothing that is not a lesson.
  const lessonCount = new Map<string, number>();
  for (const s of all) {
    if (s.kind === 'lesson') lessonCount.set(s.slug, (lessonCount.get(s.slug) ?? 0) + 1);
  }
  for (const l of LESSONS) {
    const c = lessonCount.get(l.slug) ?? 0;
    if (c !== 1) errors.push(`lesson "${l.slug}" appears ${c} times in PATH (want exactly 1)`);
  }
  for (const slug of lessonCount.keys()) {
    if (!LESSONS.some((l) => l.slug === slug)) errors.push(`PATH names unknown lesson "${slug}"`);
  }

  // Every wrap step exactly once, phase-prefixed correctly, with a status that
  // matches what the wrap data says: a build is not planned, a gap is.
  const wrapStatus = new Map<string, string>();
  for (const p of WRAP_PHASES) for (const s of p.steps) wrapStatus.set(s.n, s.status);

  const stepCount = new Map<string, number>();
  for (const phase of PATH) {
    for (const s of phase.stops) {
      if (s.kind === 'lesson') continue;
      stepCount.set(s.step, (stepCount.get(s.step) ?? 0) + 1);
      if (!s.step.startsWith(`${phase.n}.`)) {
        errors.push(`step ${s.step} sits in phase ${phase.id}, which is phase ${phase.n}`);
      }
      const status = wrapStatus.get(s.step);
      if (status === undefined) errors.push(`step ${s.step} is not in wrap-steps.ts`);
      else if (s.kind === 'build' && status === 'planned') errors.push(`build ${s.step} is still planned in wrap-steps.ts`);
      else if (s.kind === 'gap' && status !== 'planned') errors.push(`gap ${s.step} is ${status} in wrap-steps.ts, not planned`);
    }
  }
  for (const step of wrapStatus.keys()) {
    const c = stepCount.get(step) ?? 0;
    if (c !== 1) errors.push(`wrap step ${step} appears ${c} times in PATH (want exactly 1)`);
  }

  // Phase ids are unique and numbered 0..8.
  const ids = PATH.map((p) => p.id);
  if (new Set(ids).size !== ids.length) errors.push('phase ids are not unique');
  PATH.forEach((p, i) => {
    if (p.n !== i) errors.push(`phase ${p.id} has n=${p.n}, want ${i}`);
  });

  return errors;
}
