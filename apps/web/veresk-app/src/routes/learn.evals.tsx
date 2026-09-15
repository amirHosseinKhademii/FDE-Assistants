/** `/learn/evals` — lesson 5 — Proving it works. */
import { createFileRoute } from '@tanstack/react-router';
import { Evals } from '../pages/learn/Evals';

export const Route = createFileRoute('/learn/evals')({
  head: () => ({ meta: [{ title: 'Lesson 5 — Proving it works · Veresk' }] }),
  component: Evals,
});
