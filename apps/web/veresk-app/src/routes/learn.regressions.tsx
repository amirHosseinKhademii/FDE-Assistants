/** `/learn/regressions` — an operations lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Regressions } from '../pages/learn/Regressions';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('regressions');

export const Route = createFileRoute('/learn/regressions')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Regressions,
});
