/** `/learn/loop` — lesson 4 — One loop, three engines, two clouds. */
import { createFileRoute } from '@tanstack/react-router';
import { Loop } from '../pages/learn/Loop';

export const Route = createFileRoute('/learn/loop')({
  head: () => ({ meta: [{ title: 'Lesson 4 — One loop, three engines, two clouds · Veresk' }] }),
  component: Loop,
});
