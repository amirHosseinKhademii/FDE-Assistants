/**
 * The wash behind every page of this deployment.
 *
 * ONE DEFINITION, FIVE CALLERS. `Aurora` itself is in `@veresk/surface` and
 * takes its hues as a prop, because the two deployments do not share a palette
 * — see the component for the rest of that argument, including why a default
 * inside the package would render as nothing here.
 *
 * THE CLASS NAMES MUST BE LITERAL AND IN SCANNED SOURCE. Tailwind generates a
 * class only where it can see it written out. Building `bg-hop-${n}/20` would
 * produce a page with no colour at all, from a build that succeeded.
 */
import type { AuroraTone } from '@veresk/surface';

export const AURORA: AuroraTone[] = [
  {
    className: 'bg-ui-accent/22',
    size: 'h-[38rem] w-[38rem]',
    at: { top: '-14rem', left: '-10rem' },
  },
  {
    className: 'bg-hop-4/20',
    size: 'h-[34rem] w-[34rem]',
    at: { top: '-6rem', right: '-12rem' },
    delay: '-8s',
  },
  {
    className: 'bg-hop-5/12',
    size: 'h-[30rem] w-[30rem]',
    at: { top: '46rem', left: '30%' },
    delay: '-15s',
  },
];
