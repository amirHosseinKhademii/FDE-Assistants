/** `/learn/caching` — an operations lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('caching');

const Page = LESSON_PAGES['caching'];

export const Route = createFileRoute('/learn/caching')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
