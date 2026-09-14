/**
 * `/supplier` — the supplier-impact desk.
 *
 * A route file names a page and does nothing else. What the page IS lives in
 * `pages/SupplierDesk.tsx`.
 */
import { createFileRoute } from '@tanstack/react-router';
import { SupplierDesk } from '../pages/SupplierDesk';

export const Route = createFileRoute('/supplier')({
  head: () => ({ meta: [{ title: 'Supplier impact — Meridian Pharma' }] }),
  component: SupplierDesk,
});
