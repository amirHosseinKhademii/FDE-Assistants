import type { Lesson } from './types';

/** A lesson that is not written yet: its slug, number and title only. */
export function draftLesson(slug: string, number: string, title: string, navTitle?: string): Lesson {
  return {
    slug,
    number,
    title,
    ...(navTitle ? { navTitle } : {}),
    oneLiner: '',
    problem: { without: '', with: '' },
    steps: [],
    code: { source: '', output: '' },
    hood: { paragraphs: [] },
    mistakes: [],
    useWhen: [],
    skipWhen: [],
    words: [],
    draft: true,
  };
}
