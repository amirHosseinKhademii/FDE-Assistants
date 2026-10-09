/** `/` — the landing page. The page itself lives in pages/Landing.tsx. */
import { createFileRoute } from '@tanstack/react-router';
import { Landing } from '../pages/Landing';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Wrap' },
      {
        name: 'description',
        content:
          'A document ingestion and retrieval pipeline built from scratch over the Vantis steering corpus, 1111 messy files.',
      },
    ],
  }),
  component: Landing,
});
