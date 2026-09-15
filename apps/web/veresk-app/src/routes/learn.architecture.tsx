/** `/learn/architecture` — the map. A reference, not a lesson in any track. */
import { createFileRoute } from '@tanstack/react-router';
import { Architecture } from '../pages/learn/Architecture';

export const Route = createFileRoute('/learn/architecture')({
  head: () => ({ meta: [{ title: 'Follow one requirement through the repo · Veresk' }] }),
  component: Architecture,
});
