/** `/learn/agentic` — a retrieval-patterns lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Agentic } from '../pages/learn/Agentic';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('agentic');

export const Route = createFileRoute('/learn/agentic')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Agentic,
});
