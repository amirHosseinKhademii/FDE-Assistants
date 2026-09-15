/** `/learn/multimodal` — a retrieval-patterns lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Multimodal } from '../pages/learn/Multimodal';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('multimodal');

export const Route = createFileRoute('/learn/multimodal')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Multimodal,
});
