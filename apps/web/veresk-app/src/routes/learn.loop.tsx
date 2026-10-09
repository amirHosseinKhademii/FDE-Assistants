/** `/learn/loop` — lesson 4 — One loop, three engines, two clouds. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES } from '@veresk/learn';

const Page = LESSON_PAGES['loop'];

export const Route = createFileRoute('/learn/loop')({
  head: () => ({ meta: [{ title: 'Lesson 4 — One loop, three engines, two clouds · Veresk' }] }),
  component: Page,
});
