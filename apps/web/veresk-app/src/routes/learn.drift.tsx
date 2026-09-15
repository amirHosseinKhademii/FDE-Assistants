/** `/learn/drift` — an operations lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Drift } from '../pages/learn/Drift';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('drift');

export const Route = createFileRoute('/learn/drift')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Drift,
});
