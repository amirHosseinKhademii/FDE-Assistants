/** `/learn/architecture` — the map. A reference, not a lesson in any track. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES } from '@veresk/learn';

const Page = LESSON_PAGES['architecture'];

export const Route = createFileRoute('/learn/architecture')({
  head: () => ({ meta: [{ title: 'Follow one requirement through the repo · Veresk' }] }),
  component: Page,
});
