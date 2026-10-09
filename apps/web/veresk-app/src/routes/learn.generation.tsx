/** `/learn/generation` — lesson 3 — What reaches the model, and what must come back. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES } from '@veresk/learn';

const Page = LESSON_PAGES['generation'];

export const Route = createFileRoute('/learn/generation')({
  head: () => ({ meta: [{ title: 'Lesson 3 — What reaches the model, and what must come back · Veresk' }] }),
  component: Page,
});
