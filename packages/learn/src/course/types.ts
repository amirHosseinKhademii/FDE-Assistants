/**
 * The shape of one lesson and one module. Every lesson has the same sections,
 * in the same order. Lessons that are not written yet carry `draft: true`.
 */
export type Lesson = {
  slug: string; // 'hybrid-search'
  number: string; // '4.4'
  title: string;
  navTitle?: string; // a short label for the sidebar, at most about 26 characters; falls back to title
  oneLiner: string;
  problem: { without: string; with: string };
  steps: { title: string; detail: string }[];
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
