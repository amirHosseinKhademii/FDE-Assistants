/** `/learn/credentials` — a beyond-retrieval lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Credentials } from '../pages/learn/Credentials';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('credentials');

export const Route = createFileRoute('/learn/credentials')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Credentials,
});
