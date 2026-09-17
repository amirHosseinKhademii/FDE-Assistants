/** `/data-flow` — where the data comes from, what is done to it, and what leaves. */
import { createFileRoute } from '@tanstack/react-router';
import { DataFlow } from '../pages/DataFlow';

export const Route = createFileRoute('/data-flow')({
  head: () => ({ meta: [{ title: 'Where the data goes · Calder Safety' }] }),
  component: DataFlow,
});
