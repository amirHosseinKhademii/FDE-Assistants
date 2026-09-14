/**
 *   pnpm prompt:check
 *
 * Asserts the prompt and the rest of the system still agree. OFFLINE — no
 * model, no Azure, no database, no cost.
 *
 * WHAT THIS CAN AND CANNOT DO. It cannot tell you the prompt WORKS; only evals
 * with a real model can. What it catches is the class of failure that is silent
 * and embarrassing: the prompt telling the model to call a tool that was
 * renamed, or promising a market the estate does not hold, or losing the rule
 * that stops it clearing a batch. Those break nothing at compile time and
 * everything at run time.
 *
 * THE CONTROL AT THE END IS NOT DECORATION. A checker that has never been seen
 * to fail is a checker you cannot trust — so it plants a broken prompt and
 * asserts it catches its own plant, the same discipline as `leak:check`.
 */
import { RELEASE_SYSTEM_PROMPT } from './release-prompt';
import { RELEASE_TOOL_NAMES } from '../loop/release-agent';
import { ReleaseAnswerSchema } from '../../schema/release-schema';

interface Check {
  name: string;
  why: string;
  run(prompt: string): string | null;
}

/**
 * Imported, never re-listed.
 *
 * This was a local array, and it went stale the day the second tool was added:
 * the prompt named `search_procedures`, the loop had not registered it, and
 * this check passed because its own copy of the truth said there was only one
 * tool. `release-agent.ts` asserts the constant matches its registry, so this
 * check now measures the system rather than its own assumption about it.
 */
const REGISTERED = RELEASE_TOOL_NAMES;

const CHECKS: Check[] = [
  {
    name: 'every registered tool is named in the prompt',
    why: 'a tool the prompt never mentions is one the model has no reason to call',
    run: (p) => {
      const missing = REGISTERED.filter((n) => !p.includes(n));
      return missing.length ? `not mentioned: ${missing.join(', ')}` : null;
    },
  },
  {
    name: 'the prompt names no tool that does not exist',
    why:
      'renaming a tool and forgetting the prompt sends the model after something ' +
      'that is not there — it recovers by guessing, which is the worst outcome',
    run: (p) => {
      const known: readonly string[] = REGISTERED;
      // MATCHED ON "call X", NOT ON snake_case.
      //
      // Matching every snake_case token flagged `as_of` — a tool PARAMETER the
      // prompt has to name — as a tool that does not exist. Widening the
      // exclusion list would have made this check quietly weaker every time a
      // new parameter appeared. What identifies a tool in a prompt is that the
      // prompt tells the model to CALL it, so that is what is matched.
      const named = [...p.matchAll(/\bcalls?\s+([a-z][a-z0-9_]+)\b/gi)].map((m) => m[1]);
      const ghosts = [...new Set(named)].filter((n) => !known.includes(n));
      return ghosts.length ? `named but not registered: ${ghosts.join(', ')}` : null;
    },
  },
  {
    name: 'the no-clearance rule survives',
    why:
      'the one rule that makes this deployable — the system prepares the file, a ' +
      'Qualified Person signs it',
    run: (p) =>
      /never state, imply or recommend that a batch may/i.test(p) ? null : 'the rule is gone or reworded past recognition',
  },
  {
    name: 'escalation is instructed and owners are required',
    why: 'the schema rejects a blocker with no escalation; the prompt must have said so first',
    run: (p) =>
      /WHEN TO ESCALATE/i.test(p) && /name a specific owner/i.test(p)
        ? null
        : 'escalation guidance or the named-owner requirement is missing',
  },
  {
    name: 'the as-of rule is stated',
    why:
      'the schema rejects an undated citation to a time-varying source; a model ' +
      'that was never told will fail that rule on every answer',
    run: (p) => (/as-of date/i.test(p) ? null : 'nothing tells the model to carry the date'),
  },
  {
    name: 'the prompt promises only markets the estate holds',
    why:
      'GB is a real regulator with no rows here; a prompt that implies otherwise ' +
      'invites a confident answer about a market that does not exist',
    run: (p) => {
      const claimed = p.match(/\b(GB|UK|MHRA|CH|JP)\b/g);
      return claimed ? `mentions markets with no rows: ${[...new Set(claimed)].join(', ')}` : null;
    },
  },
  {
    name: 'every required answer field is reachable from the prompt',
    why:
      'a field the prompt never motivates gets filled with something plausible, ' +
      'which is worse than left empty',
    run: (p) => {
      /**
       * THE MAP IS EXHAUSTIVE, AND THAT IS THE WHOLE CHECK. It used to filter
       * `k in wanted`, so a field ABSENT from the map was exempt rather than
       * failing — which meant the check's name ("every required answer field")
       * was true only of the five fields someone had remembered to list. It went
       * green on `what_would_clear_it` and `in_short` the day they were added, by
       * ignoring them. Now an unlisted field is itself the failure, so the map
       * cannot drift out from under the name: adding a field to the contract
       * breaks this check until someone decides what in the prompt motivates it.
       *
       * `null` means deliberately unmotivated — a field the prompt does not need
       * to argue for because the tool output or the question supplies it. Saying
       * so is a decision on the record; omitting it is an accident.
       */
      const wanted: Record<keyof typeof ReleaseAnswerSchema.shape, RegExp | null> = {
        summary: /three sentences/i,
        lot_id: null,
        market: /market/i,
        governing_spec_version: null,
        blockers: /blocker/i,
        concerns: /concern/i,
        what_would_clear_it: /what_would_clear_it/i,
        missing: /absent|missing/i,
        unverified_claims: /state a fact only if a tool returned it/i,
        escalate: /escalat/i,
      };

      const unlisted = Object.keys(ReleaseAnswerSchema.shape).filter((k) => !(k in wanted));
      if (unlisted.length) {
        return `field(s) added to the contract but never considered here: ${unlisted.join(', ')}`;
      }

      const unmotivated = Object.entries(wanted)
        .filter(([, re]) => re !== null)
        .filter(([, re]) => !re!.test(p))
        .map(([k]) => k);
      return unmotivated.length ? `nothing in the prompt motivates: ${unmotivated.join(', ')}` : null;
    },
  },

  {
    name: 'the per-finding fields are motivated too',
    why:
      'the check above walks ReleaseAnswerSchema.shape, which is TOP-LEVEL ONLY — ' +
      '`in_short` lives inside Blocker and is invisible to it, so a required ' +
      'nested field could go unmotivated forever behind a green tick',
    run: (p) => (/in_short/i.test(p) ? null : 'nothing in the prompt motivates: in_short'),
  },
];

let failed = 0;
for (const c of CHECKS) {
  const problem = c.run(RELEASE_SYSTEM_PROMPT);
  if (problem) failed++;
  console.log(`  ${problem ? 'FAIL' : 'ok  '}  ${c.name}`);
  console.log(`        why: ${c.why}`);
  if (problem) console.log(`        \x1b[31m${problem}\x1b[0m`);
}

// The control: a prompt with the no-clearance rule cut out MUST be caught.
const sabotaged = RELEASE_SYSTEM_PROMPT.replace(
  /You never state, imply or recommend that a batch may/i,
  'You may say that a batch',
);
const caught = CHECKS.find((c) => c.name === 'the no-clearance rule survives')!.run(sabotaged);
if (!caught) failed++;
console.log(`\n  ${caught ? 'ok  ' : 'FAIL'}  control: a stripped rule IS detected`);
console.log(`        ${caught ? 'removing the no-clearance rule made the check fire — it can fail' : 'the checker passed a sabotaged prompt; it proves nothing'}`);

console.log(`\n  prompt: ${failed ? `${failed} FAILING` : `PASS — ${CHECKS.length + 1} checks`}\n`);
process.exit(failed ? 1 : 0);
