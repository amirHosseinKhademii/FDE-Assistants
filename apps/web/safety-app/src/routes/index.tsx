/** `/` — Calder Safety's door. The estate, the question, and what it will not answer. */
import { createFileRoute } from '@tanstack/react-router';
import { CalderLanding } from '../pages/CalderLanding';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Calder Safety — the public safety record, read for you' },
      {
        name: 'description',
        content:
          'Is this a known defect with a remedy, and is the remedy holding? Read from NHTSA complaints and recalls.',
      },
    ],
  }),
  component: CalderLanding,
});
