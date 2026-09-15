/** `/learn/context` — a beyond-retrieval lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Context } from '../pages/learn/Context';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('context');

export const Route = createFileRoute('/learn/context')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Context,
});
