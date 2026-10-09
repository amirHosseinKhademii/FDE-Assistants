/**
 * The content of `/steps`: phases, each holding steps, each step in five parts.
 *
 * ── HOW TO FILL THIS IN ────────────────────────────────────────────────────
 *
 * Add real steps to the `steps` array of a phase and fill the fields below.
 * Nothing else needs to change: the tab bar, the progress bar, the roadmap and
 * the counts are all derived from this array.
 *
 *   status    'done'    it ran; `done` holds the date, and `learned` says what
 *                       we found (past tense)
 *             'next'    the step being worked on now (at most one)
 *             'planned' not started; `learned` says what it WILL check
 *
 * Figures carry a `from` badge so a reader can tell measured output from a plan:
 *   measured   real output from running the thing
 *   corrected  real output that changed the plan
 *   cited      taken from a named document
 *   proposed   the plan's design, not built yet (the default)
 *   excerpt    real code, shortened for the page
 *
 * The placeholder steps below are one sentence each and nothing more.
 */
import type { Lang } from '@veresk/surface';
import type { TermKey } from './glossary';

export type StepStatus = 'done' | 'next' | 'planned';

export type Provenance = 'measured' | 'corrected' | 'cited' | 'proposed' | 'excerpt';

/** The "code and what it printed" part of a step. */
export interface StepCode {
  /** What the figure shows, as a short sentence. */
  caption: string;
  /** Which badge the figure carries. */
  from: Provenance;
  /** Where the code came from, shown beside the badge. Optional. */
  source?: string;
  /** The file name or command shown above the code block. */
  path: string;
  lang: Lang;
  /** The real code, as one string with newlines. */
  code: string;
  /** What running it printed, as one string. Optional. */
  printed?: string;
}

/** The "under the hood" dialog attached to a step. */
export interface StepHood {
  title: string;
  /** The real code, as one string with newlines. */
  code: string;
  /** What it printed, as one string. */
  printed: string;
}

export interface StepDef {
  /** The step number as written on the page, e.g. '1.2'. Also the anchor id. */
  n: string;
  title: string;
  status: StepStatus;
  /** ISO date (2026-09-18) the step ran. Only meaningful when status is 'done'. */
  done?: string;
  /** What the step waits for, or 'nobody' if it can be built on a laptop. */
  needs: string;
  /** Part 1 — what the step does, in plain words. */
  plain: string;
  /** Part 2 — what would go wrong without it. */
  why?: string;
  /** Part 3 — the code and what it printed. */
  code?: StepCode;
  /** Part 4 — what we learned (done) or what it will check (planned). */
  learned?: string;
  /** Part 5 — words to know, each a key of GLOSSARY in lib/glossary.ts. */
  terms?: TermKey[];
  /** The "under the hood" dialog. Optional. */
  hood?: StepHood;
}

export interface PhaseDef {
  id: string;
  /** What the tab is called. */
  label: string;
  /** Two or three words on the tab, e.g. 'Started' or 'Not written yet'. */
  status: string;
  /** What you would have at the end of this phase that you did not have at the start. */
  what: string;
  /** What is stopping this phase, if it has not started. Omit once it can run. */
  waits?: string[];
  steps: StepDef[];
}

export const PHASES: PhaseDef[] = [
  {
    id: 'start',
    label: 'Start',
    status: 'Not written yet',
    what: 'Placeholder for the phase description. The real text comes with the content job.',
    waits: ['The content for this phase has not been written yet.'],
    steps: [
      {
        n: '0.1',
        title: 'Placeholder step',
        status: 'next',
        needs: 'nobody',
        plain: 'Placeholder: one sentence saying what this step does will go here.',
      },
    ],
  },
  {
    id: 'build',
    label: 'First build',
    status: 'Not written yet',
    what: 'Placeholder for the phase description. The real text comes with the content job.',
    waits: ['The content for this phase has not been written yet.'],
    steps: [
      {
        n: '1.2',
        title: 'Placeholder step',
        status: 'planned',
        needs: 'the steps before it',
        plain: 'Placeholder: one sentence saying what this step does will go here.',
      },
    ],
  },
];
