/** `/learn/forensics` — an operations lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { Forensics } from '../pages/learn/Forensics';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('forensics');

export const Route = createFileRoute('/learn/forensics')({
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Forensics,
});
