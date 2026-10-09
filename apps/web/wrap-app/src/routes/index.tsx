/** `/` — the landing page. Short on purpose: the content job writes the rest. */
import { createFileRoute, Link } from '@tanstack/react-router';

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

function Landing() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-16 pb-24 sm:px-6">
      <h1 className="text-[2.25rem] leading-[1.15] font-bold tracking-tight text-ui-fg md:text-[2.75rem]">
        Wrap — a document ingestion &amp; retrieval pipeline built from scratch over the Vantis steering corpus (1111 messy files)
      </h1>
      <p className="mt-8 text-[1.0625rem]">
        <Link to="/steps" className="wrap-a">
          How it works →
        </Link>
      </p>
    </main>
  );
}
