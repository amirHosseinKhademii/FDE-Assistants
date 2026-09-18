/** `/` — Thornbury Goods' door. The contact, the estate, and the boundary. */
import { createFileRoute } from '@tanstack/react-router';
import { ThornburyLanding } from '../pages/ThornburyLanding';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Thornbury Goods — what is this customer entitled to?' },
      {
        name: 'description',
        content:
          'A resolutions assistant that reaches its facts over a protocol rather than a function call. What is owed, under which policy, and what evidence supports it.',
      },
    ],
  }),
  component: ThornburyLanding,
});
