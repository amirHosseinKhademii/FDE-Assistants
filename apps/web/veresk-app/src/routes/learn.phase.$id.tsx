/** `/learn/phase/p0` … `/learn/phase/p8` — one phase of the path, every stop in order. */
import { createFileRoute } from '@tanstack/react-router';
import { PhasePage } from '@veresk/learn';

export const Route = createFileRoute('/learn/phase/$id')({
  head: ({ params }) => ({ meta: [{ title: `Phase ${params.id.replace(/^p/, '')} · Learn · Veresk` }] }),
  component: PhaseRoute,
});

function PhaseRoute() {
  const { id } = Route.useParams();
  return <PhasePage id={id} />;
}
