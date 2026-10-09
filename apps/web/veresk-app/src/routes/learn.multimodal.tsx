/** `/learn/multimodal` — a retrieval-patterns lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('multimodal');

const Page = LESSON_PAGES['multimodal'];

export const Route = createFileRoute('/learn/multimodal')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
