/** `/learn/vectors` — lesson 1 — An embedding is a list of numbers. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES } from '@veresk/learn';

const Page = LESSON_PAGES['vectors'];

export const Route = createFileRoute('/learn/vectors')({
  head: () => ({ meta: [{ title: 'Lesson 1 — An embedding is a list of numbers · Veresk' }] }),
  component: Page,
});
