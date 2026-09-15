/** `/learn/hybrid` — a retrieval-patterns lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Hybrid } from '../pages/learn/Hybrid';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('hybrid');

export const Route = createFileRoute('/learn/hybrid')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Hybrid,
});
