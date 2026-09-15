/** `/learn` — the way into the five lessons. */
import { createFileRoute } from '@tanstack/react-router';
import { LearnIndex } from '../pages/learn/LearnIndex';

export const Route = createFileRoute('/learn/')({
  head: () => ({ meta: [{ title: 'Learn — how the machine actually works · Veresk' }] }),
  component: LearnIndex,
});
