/** `/learn/answer-key` — an engagement lesson. Its number and title live in `lib/learn/lessons.ts`. */
import { createFileRoute } from '@tanstack/react-router';
import { AnswerKey } from '../pages/learn/AnswerKey';
import { lessonBySlug } from '../lib/learn/lessons';

const lesson = lessonBySlug('answer-key');

export const Route = createFileRoute('/learn/answer-key')({
  /* Built from the lesson record rather than written out again, so a retitled
     lesson cannot keep an old <title>. The five pages of the first track name
     theirs literally and predate this; both work, and this one cannot drift. */
  head: () => ({ meta: [{ title: `${lesson.title} · Veresk` }] }),
  component: AnswerKey,
});
