/** `/learn/vectors` — lesson 1 — An embedding is a list of numbers. */
import { createFileRoute } from '@tanstack/react-router';
import { Vectors } from '../pages/learn/Vectors';

export const Route = createFileRoute('/learn/vectors')({
  head: () => ({ meta: [{ title: 'Lesson 1 — An embedding is a list of numbers · Veresk' }] }),
  component: Vectors,
});
