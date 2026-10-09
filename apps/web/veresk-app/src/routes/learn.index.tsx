/** `/learn` — the path, in nine phases. The topic grouping is at `/learn/topics`. */
import { createFileRoute } from '@tanstack/react-router';
import { PathOverview } from '@veresk/learn';

export const Route = createFileRoute('/learn/')({
  head: () => ({ meta: [{ title: 'Learn — from an empty folder to a working assistant · Veresk' }] }),
  component: PathOverview,
});
