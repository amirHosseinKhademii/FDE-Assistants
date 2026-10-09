/** `/learn/orchestration` — a beyond-retrieval lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('orchestration');

const Page = LESSON_PAGES['orchestration'];

export const Route = createFileRoute('/learn/orchestration')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
