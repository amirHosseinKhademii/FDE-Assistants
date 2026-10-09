/** `/learn/attention` — an engagement lesson. Its number and title live in `packages/learn/src/data/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { LESSON_PAGES, lessonBySlug } from '@veresk/learn';

const lesson = lessonBySlug('attention');

const Page = LESSON_PAGES['attention'];

export const Route = createFileRoute('/learn/attention')({
  /* Built from the lesson record rather than written out again, so a retitled
     lesson cannot keep an old <title>. The five pages of the first track name
     theirs literally and predate this; both work, and this one cannot drift. */
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: Page,
});
