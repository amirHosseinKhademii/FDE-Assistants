/**
 * The wash behind every page of this deployment.
 *
 * ONE DEFINITION, TWO CALLERS. `Aurora` itself is in `@veresk/surface` and takes
 * its hues as a prop, because the deployments do not share a palette — see the
 * component for the rest of that argument, including why a default inside the
 * package would render as nothing here.
 *
 * THE CLASS NAMES MUST BE LITERAL AND IN SCANNED SOURCE. Tailwind generates a
 * class only where it can see it written out. Building `bg-cal-${n}/20` would
 * produce a page with no colour at all, from a build that succeeded.
 *
 * QUIETER THAN THE OTHER THREE, deliberately. Pharma and Vantis wash a corpus
 * somebody wrote to be read; this one is other people's filings about their own
 * cars, and a page about it that glows is wearing the wrong tone.
 */
import type { AuroraTone } from '@veresk/surface';

export const AURORA: AuroraTone[] = [
  {
    className: 'bg-cal-1/16',
    size: 'h-[36rem] w-[36rem]',
    at: { top: '-13rem', left: '-9rem' },
  },
  {
    className: 'bg-cal-2/12',
    size: 'h-[32rem] w-[32rem]',
    at: { top: '-5rem', right: '-11rem' },
    delay: '-9s',
  },
  {
    className: 'bg-cal-3/10',
    size: 'h-[28rem] w-[28rem]',
    at: { top: '44rem', left: '28%' },
    delay: '-16s',
  },
];
