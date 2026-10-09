/** `/learn/topics` — the lessons grouped by topic. The "By topic" index. */
import { createFileRoute } from '@tanstack/react-router';
import { LearnIndex } from '@veresk/learn';

export const Route = createFileRoute('/learn/topics')({
  head: () => ({ meta: [{ title: 'Learn by topic · Veresk' }] }),
  component: LearnIndex,
});
