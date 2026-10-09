/** `/learn/credentials` — a beyond-retrieval lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('credentials');

const Page = LESSON_PAGES['credentials'];

export const Route = createFileRoute('/learn/credentials')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
