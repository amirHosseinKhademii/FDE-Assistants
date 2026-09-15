/** `/learn/graph` — a retrieval-patterns lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Graph } from '../pages/learn/Graph';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('graph');

export const Route = createFileRoute('/learn/graph')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Graph,
});
