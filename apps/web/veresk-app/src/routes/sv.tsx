/**
 * `/sv`: the same front page in Swedish. One layout, two copies: see
 * `lib/i18n.ts`. The title and description are Swedish here, and the root
 * route reads this path to set `<html lang="sv">`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { VereskLanding } from '../pages/VereskLanding';
import { COPY } from '../lib/i18n';

export const Route = createFileRoute('/sv')({
  head: () => ({
    meta: [
      { title: COPY.sv.title },
      { name: 'description', content: COPY.sv.description },
    ],
  }),
  component: SvLanding,
});

function SvLanding() {
  return <VereskLanding lang="sv" />;
}
