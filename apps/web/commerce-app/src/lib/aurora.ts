/**
 * The wash behind every page of this deployment.
 *
 * ONE DEFINITION, TWO CALLERS. `Aurora` itself is in `@veresk/surface` and takes
 * its hues as a prop, because the deployments do not share a palette — see the
 * component for the rest of that argument, including why a default inside the
 * package would render as nothing here.
 *
 * THE CLASS NAMES MUST BE LITERAL AND IN SCANNED SOURCE. Tailwind generates a
 * class only where it can see it written out. Building `bg-thb-${n}/20` would
 * produce a page with no colour at all, from a build that succeeded.
 *
 * TWO FIELDS, NOT THREE, because this palette has two colours. The other
 * deployments' third field is their third source; there is no third side to a
 * line.
 */
import type { AuroraTone } from '@veresk/surface';

export const AURORA: AuroraTone[] = [
  {
    className: 'bg-thb-1/14',
    size: 'h-[36rem] w-[36rem]',
    at: { top: '-14rem', left: '-10rem' },
  },
  {
    className: 'bg-thb-2/12',
    size: 'h-[32rem] w-[32rem]',
    at: { top: '-4rem', right: '-12rem' },
    delay: '-11s',
  },
];
