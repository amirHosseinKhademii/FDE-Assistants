/** `/learn/injection` — a beyond-retrieval lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Injection } from '../pages/learn/Injection';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('injection');

export const Route = createFileRoute('/learn/injection')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Injection,
});
