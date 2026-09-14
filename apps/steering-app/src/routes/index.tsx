/**
 * `/` — Vantis Steering Systems, the engagement.
 *
 * IT IS THIS APP'S ROOT AND NOT `/steering`, because this app IS the
 * engagement. The path `/steering` existed while both customers were served by
 * one deployment; the link from the firm's page is now a link to another
 * origin, which is the honest shape — insurance has always worked that way.
 */
import { createFileRoute } from '@tanstack/react-router';
import { SteeringLanding } from '../pages/SteeringLanding';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Vantis Steering — Veresk' }] }),
  component: SteeringLanding,
});
