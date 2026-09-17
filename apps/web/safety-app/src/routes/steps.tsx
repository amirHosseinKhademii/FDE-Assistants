import { createFileRoute } from '@tanstack/react-router';
import { Steps } from '../pages/Steps';

export const Route = createFileRoute('/steps')({
  component: Steps,
  head: () => ({ meta: [{ title: 'The seven stages · Calder Safety' }] }),
});
