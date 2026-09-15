/** `/learn/finetuning` — a beyond-retrieval lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Finetuning } from '../pages/learn/Finetuning';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('finetuning');

export const Route = createFileRoute('/learn/finetuning')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Finetuning,
});
