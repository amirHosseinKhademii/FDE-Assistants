/** `/learn/cost` — an operations lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Cost } from '../pages/learn/Cost';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('cost');

export const Route = createFileRoute('/learn/cost')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Cost,
});
