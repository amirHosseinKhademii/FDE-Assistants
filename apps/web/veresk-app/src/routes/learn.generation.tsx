/** `/learn/generation` — lesson 3 — What reaches the model, and what must come back. */
import { createFileRoute } from '@tanstack/react-router';
import { Generation } from '../pages/learn/Generation';

export const Route = createFileRoute('/learn/generation')({
  head: () => ({ meta: [{ title: 'Lesson 3 — What reaches the model, and what must come back · Veresk' }] }),
  component: Generation,
});
