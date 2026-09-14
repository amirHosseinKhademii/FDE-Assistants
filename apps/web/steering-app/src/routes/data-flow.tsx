/**
 * `/data-flow` — what leaves the building.
 *
 * A route file says which URL shows which page and nothing else; what the page
 * IS lives in `pages/DataFlow.tsx`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { DataFlow } from '../pages/DataFlow';

export const Route = createFileRoute('/data-flow')({
  head: () => ({ meta: [{ title: 'Where your data goes — Vantis Steering' }] }),
  component: DataFlow,
});
