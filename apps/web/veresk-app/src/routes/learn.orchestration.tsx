/** `/learn/orchestration` — a beyond-retrieval lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Orchestration } from '../pages/learn/Orchestration';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('orchestration');

export const Route = createFileRoute('/learn/orchestration')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Orchestration,
});
