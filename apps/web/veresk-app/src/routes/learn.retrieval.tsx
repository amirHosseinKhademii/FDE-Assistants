/** `/learn/retrieval` — lesson 2 — Finding the passage, and knowing you have not. */
import { createFileRoute } from '@tanstack/react-router';
import { Retrieval } from '../pages/learn/Retrieval';

export const Route = createFileRoute('/learn/retrieval')({
  head: () => ({ meta: [{ title: 'Lesson 2 — Finding the passage, and knowing you have not · Veresk' }] }),
  component: Retrieval,
});
