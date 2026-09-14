/**
 * `/` — Veresk.
 *
 * THE FIRM'S DOOR, NOT A PRODUCT'S. Everything below this route is work done
 * FOR somebody: Meridian Pharma's release desk, Vantis Steering's bid team.
 * This page says what the work is and hands you to one of them.
 */
import { createFileRoute } from '@tanstack/react-router';
import { VereskLanding } from '../pages/VereskLanding';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'Veresk — forward-deployed engineering' }] }),
  component: VereskLanding,
});
