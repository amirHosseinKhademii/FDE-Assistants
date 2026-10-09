/** `/learn/agentic` — a retrieval-patterns lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('agentic');

const Page = LESSON_PAGES['agentic'];

export const Route = createFileRoute('/learn/agentic')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
