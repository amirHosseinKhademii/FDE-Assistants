/**
 * `/` — Meridian Pharma, the engagement.
 *
 * IT IS THIS APP'S ROOT AND NOT `/pharma`, because this app IS the engagement.
 * The path `/pharma` existed while one deployment served every customer; the
 * link from the firm's page is now a link to another origin, which is the
 * honest shape and the one steering and insurance already had.
 *
 * It was `/` until a second engagement existed. A route file says which URL
 * shows which page and nothing else; what the page IS lives in
 * `pages/PharmaLanding.tsx`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { PharmaLanding } from '../pages/PharmaLanding';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Meridian Pharma — Veresk' }] }),
  component: PharmaLanding,
});
