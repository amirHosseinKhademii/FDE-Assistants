/**
 * The shape of one lesson and one module. Every lesson has the same sections,
 * in the same order. Lessons that are not written yet carry `draft: true`.
 */
/**
 * A picture for one "How it works" block. Each kind has its own renderer in
 * ui/StepVisual.tsx. Keep numbers real and consistent with the prose.
 */
export type StepVisual =
  | { kind: 'bars'; caption: string; unit?: string; rows: { label: string; value: number; highlight?: boolean }[] }
  | {
      kind: 'points';
      caption: string;
      points: { label: string; x: number; y: number; group?: string; highlight?: boolean }[];
      link?: boolean; // dashed line from each highlighted point to its nearest other point
    }
  | { kind: 'table'; caption: string; columns: string[]; rows: string[][]; highlightRow?: number }
  | { kind: 'flow'; caption: string; nodes: string[] }
  | { kind: 'chips'; caption: string; items: { text: string; note?: string; highlight?: boolean }[] }
  | { kind: 'compare'; caption: string; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | {
      kind: 'line';
      caption: string;
      xLabel: string;
      yLabel: string;
      series: { name: string; points: { x: number; y: number }[] }[]; // up to 3
    };

export type Lesson = {
  slug: string; // 'hybrid-search'
  number: string; // '4.4'
  title: string;
  navTitle?: string; // a short label for the sidebar, at most about 26 characters; falls back to title
  oneLiner: string;
  problem: { without: string; with: string };
  // "How it works" blocks: each is one idea with a plain subheading. Not a forced sequence.
  steps: { title: string; detail: string; visual?: StepVisual }[];
  diagram?: string[]; // box labels, drawn left to right
  code: { source: string; output: string };
  hood: {
    paragraphs: string[];
    example?: { label: string; value: string }[];
    code?: { source: string; output?: string }; // optional second snippet, shown after the main code
  };
  mistakes: string[];
  useWhen: string[];
  skipWhen: string[];
  words: { term: string; meaning: string }[];
  draft?: boolean; // true while the lesson is a stub: the page says "being written"
};

export type Module = {
  slug: string;
  number: number;
  title: string;
  summary: string;
  lessons: Lesson[];
};
