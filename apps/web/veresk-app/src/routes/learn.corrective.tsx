/** `/learn/corrective` — a retrieval-patterns lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Corrective } from '../pages/learn/Corrective';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('corrective');

export const Route = createFileRoute('/learn/corrective')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Corrective,
});
