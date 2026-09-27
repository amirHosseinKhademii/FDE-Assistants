/**
 * Every step on `/steps`, its name, and when it runs — the ONE list.
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * Three things on the page read the same list: the roadmap near the top, the
 * tab bar's counts, and the step cards themselves. The step cards live in five
 * different files (`pages/Steps.tsx` for stages 1–3, `components/steps/Stage4`
 * to `Stage7` for the rest), so a title typed in a card and again in the
 * roadmap is two places holding one fact. Every card takes its title from
 * `TITLES`, and every count on the page is derived from `STAGES`.
 *
 * ── EVERY STEP HAS RUN ─────────────────────────────────────────────────────
 *
 * Unlike Thornbury's page, there is no "up next" and nothing dashed: all seven
 * stages are built and measured (docs/safety/STAGE4.md–STAGE7.md). So there is
 * no DONE list — a list with everything in it would be a second place to say
 * "all of them", and the first place to go stale if a stage is ever reopened.
 * If one is, THIS is the file to grow a state in.
 *
 * The numbering is the documents' own — `3.6b`, `4.4b` — because that is how
 * `docs/safety/` and the code refer to each step, and how the next person will
 * search for it.
 */

/** When a step does its work. Shown as a pill on each step. */
export type When = 'once, offline' | 'every question' | 'on demand';

export interface StageDef {
  id: string;
  /** The stage number, as the documents write it. */
  stage: string;
  label: string;
  /** The step numbers this stage holds, in order. */
  holds: string[];
}

export const STAGES: StageDef[] = [
  { id: 'corpus', stage: '1', label: 'The data', holds: ['1'] },
  { id: 'key', stage: '2', label: 'The answer key', holds: ['2'] },
  {
    id: 'grounding',
    stage: '3',
    label: 'Search',
    holds: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.6b', '3.7'],
  },
  { id: 'tools', stage: '4', label: 'The tools', holds: ['4.1', '4.2', '4.3', '4.4', '4.4b', '4.5'] },
  { id: 'contract', stage: '5', label: 'The answer contract', holds: ['5.1', '5.2', '5.3'] },
  { id: 'loop', stage: '6', label: 'The loop', holds: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6'] },
  { id: 'evals', stage: '7', label: 'Evals', holds: ['7.1', '7.2', '7.3', '7.4'] },
];

/** Every step's name, in plain words. Used by the roadmap and by the step itself. */
export const TITLES: Record<string, string> = {
  '1': 'Find out what the data actually is',
  '2': 'Write the answers down before anything can grade itself',

  '3.1': 'Turn lines of a file into documents',
  '3.2': 'Cut documents into passages — or mostly don’t',
  '3.3': 'Turn words into numbers',
  '3.4': 'Put every passage in one table',
  '3.5': 'Search two ways at once',
  '3.6': 'Merge two lists that don’t share a scale',
  '3.6b': 'Re-read the best fifty properly',
  '3.7': 'Measure: did it find what we already knew?',

  '4.1': 'Look up a recall by its number',
  '4.2': 'Find the recalls for a vehicle',
  '4.3': 'Search complaints, filtered first',
  '4.4': 'Count, so the model never has to',
  '4.4b': 'Find the complaints that name a recall',
  '4.5': 'Measure again, through the tools',

  '5.1': 'Write down the shape an answer must have',
  '5.2': 'Six rules for answers that fit the shape and are still wrong',
  '5.3': 'A good and a bad answer for every question',

  '6.1': 'Register the tools, with no model yet',
  '6.2': 'One question, end to end',
  '6.3': 'Check the model’s answer against the contract',
  '6.4': 'The hard question: two calls, in order',
  '6.5': 'The negative question: proving something isn’t there',
  '6.6': 'All eight questions, paced',

  '7.1': 'Check every answer mechanically',
  '7.2': 'Ask three times, and call a wobble “flaky”',
  '7.3': 'Save each run so the next can be compared',
  '7.4': 'The number, and the one it is never shown without',
};

/** When each step does its work. Stages 1 and 2 are reading, not running. */
export const WHEN: Record<string, When | undefined> = {
  '3.1': 'once, offline',
  '3.2': 'once, offline',
  '3.3': 'once, offline',
  '3.4': 'once, offline',
  '3.5': 'every question',
  '3.6': 'every question',
  '3.6b': 'every question',
  '3.7': 'on demand',
  '4.1': 'every question',
  '4.2': 'every question',
  '4.3': 'every question',
  '4.4': 'every question',
  '4.4b': 'every question',
  '4.5': 'on demand',
  '5.1': 'every question',
  '5.2': 'every question',
  '5.3': 'on demand',
  '6.1': 'every question',
  '6.2': 'every question',
  '6.3': 'every question',
  '6.4': 'every question',
  '6.5': 'every question',
  '6.6': 'on demand',
  '7.1': 'on demand',
  '7.2': 'on demand',
  '7.3': 'on demand',
  '7.4': 'on demand',
};

/** Every step, in order. */
export const ALL_STEPS: string[] = STAGES.flatMap((s) => s.holds);

/** Which stage holds a given step, so a link to one can open the other. */
export const STAGE_OF = new Map(STAGES.flatMap((s) => s.holds.map((step) => [step, s.id] as const)));

/** A count as a word, for sentences. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];
export const inWords = (n: number) => WORDS[n] ?? String(n);
