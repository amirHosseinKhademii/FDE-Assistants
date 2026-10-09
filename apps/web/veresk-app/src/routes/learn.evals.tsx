/** `/learn/evals` — lesson 5 — Proving it works. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES } from '@veresk/learn';

const Page = LESSON_PAGES['evals'];

export const Route = createFileRoute('/learn/evals')({
  head: () => ({ meta: [{ title: 'Lesson 5 — Proving it works · Veresk' }] }),
  component: Page,
});
