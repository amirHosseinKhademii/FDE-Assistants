/**
 * `/desk` — assess one customer requirement.
 *
 * A route file says which URL shows which page and nothing else; what the page
 * IS lives in `pages/BidDesk.tsx`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { BidDesk } from '../pages/BidDesk';

export const Route = createFileRoute('/desk')({
  head: () => ({ meta: [{ title: 'Assess a requirement — Vantis Steering' }] }),
  component: BidDesk,
});
