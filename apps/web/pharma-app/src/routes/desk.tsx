/**
 * `/desk` — the release desk.
 *
 * It moved off `/` when the landing page took the front door. The desk is the
 * working surface: someone who has a batch waiting goes straight here and
 * should be able to bookmark it.
 */
import { createFileRoute } from '@tanstack/react-router';
import { ReleaseDesk } from '../pages/ReleaseDesk';

export const Route = createFileRoute('/desk')({
  head: () => ({ meta: [{ title: 'Release desk — Meridian Pharma' }] }),
  component: ReleaseDesk,
});
