import { createFileRoute } from '@tanstack/react-router';
import { Desk } from '../pages/Desk';

export const Route = createFileRoute('/desk')({
  head: () => ({ meta: [{ title: 'Resolve a claim · Thornbury Goods' }] }),
  component: Desk,
});
