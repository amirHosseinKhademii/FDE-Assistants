/**
 *   pnpm supplier-prompt:check
 *
 * Asserts the supplier-impact prompt and the rest of the system still agree.
 * OFFLINE — no model, no Azure, no database, no cost. Sibling of
 * `prompt-selftest.ts`; same discipline and the same limit: it cannot tell you
 * the prompt WORKS, only that it has not silently drifted from the tool
 * registry or the schema.
 */
import { SUPPLIER_IMPACT_SYSTEM_PROMPT } from './supplier-impact-prompt';
import { SUPPLIER_IMPACT_TOOL_NAMES } from '../loop/supplier-impact-agent';
import { SupplierImpactAnswerSchema } from '../../schema/supplier-impact-schema';

interface Check {
  name: string;
  why: string;
  run(prompt: string): string | null;
}

/** Imported, never re-listed — see `prompt-selftest.ts`'s note on why this matters. */
const REGISTERED = SUPPLIER_IMPACT_TOOL_NAMES;

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
      // MATCHED ON "call X", NOT ON snake_case — see release's prompt-selftest
      // for why: matching every snake_case token flags a parameter like
      // `supplier_id`, which the prompt must also name.
      const named = [...p.matchAll(/\bcalls?\s+([a-z][a-z0-9_]+)\b/gi)].map((m) => m[1]);
      const ghosts = [...new Set(named)].filter((n) => !known.includes(n));
      return ghosts.length ? `named but not registered: ${ghosts.join(', ')}` : null;
    },
  },
  {
    name: 'the no-recall rule survives',
    why:
      'the sibling of release\'s no-clearance rule — the reason this is deployable ' +
      'without validating the model is that it never decides the thing a named ' +
      'human is liable for. Grounded in SOP-SCM-004 §7.3, not just asserted.',
    // Normalized to single spaces first: the prompt is written as an array of
    // lines, so a phrase spanning a line wrap has a `\n` where this check's
    // literal has a space, and a regex without a `g`/`s` juggling act should
    // not have to know where the source happened to wrap.
    run: (p) => {
      const flat = p.replace(/\s+/g, ' ');
      return /never state, imply or recommend which of those four should apply/i.test(flat) &&
        /never use the word "recall" as an instruction/i.test(flat)
        ? null
        : 'the rule is gone or reworded past recognition';
    },
  },
  {
    name: 'row-level and estate-level escalation are both instructed',
    why:
      'the schema enforces TWO escalation rules — a row outside our control, and ' +
      'a non-empty `preventable` — and a model never told about the second one ' +
      'will pass every row check and still fail the estate-level one',
    run: (p) =>
      /A ROW escalates/.test(p) && /THE WHOLE ANSWER escalates/.test(p) && /name a specific owner/i.test(p)
        ? null
        : 'row-level escalation, estate-level escalation, or the named-owner requirement is missing',
  },
  {
    name: 'the preventable findings are called out as the priority',
    why:
      'they are not a row, so nothing about the row-by-row structure surfaces ' +
      'them on its own — the prompt has to say so explicitly or they get buried',
    run: (p) => (/preventable/i.test(p) && /stopped rather than cleaned up after/i.test(p) ? null : 'nothing marks preventable as the priority'),
  },
  {
    name: 'every required answer field is reachable from the prompt',
    why:
      'a field the prompt never motivates gets filled with something plausible, ' +
      'which is worse than left empty — same exhaustive-map discipline as ' +
      'release\'s check, so an added field breaks this until someone decides ' +
      'what motivates it',
    run: (p) => {
      const wanted: Record<keyof typeof SupplierImpactAnswerSchema.shape, RegExp | null> = {
        summary: null,
        supplier_id: null,
        supplier_name: null,
        disqualified_on: null,
        rows: /rows/i,
        preventable: /preventable/i,
        missing: null,
        unverified_claims: /state a fact only if a tool returned it/i,
        escalate: /escalat/i,
      };

      const unlisted = Object.keys(SupplierImpactAnswerSchema.shape).filter((k) => !(k in wanted));
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
    name: 'the per-row fields are motivated too',
    why:
      'the check above walks SupplierImpactAnswerSchema.shape, which is TOP-LEVEL ' +
      'ONLY — `next_action` and `in_short` live inside each row and are invisible ' +
      'to it, so a required nested field could go unmotivated forever behind a ' +
      'green tick',
    run: (p) =>
      /next_action/i.test(p) && /in_short/i.test(p)
        ? null
        : 'nothing in the prompt motivates: next_action and/or in_short',
  },
];

let failed = 0;
for (const c of CHECKS) {
  const problem = c.run(SUPPLIER_IMPACT_SYSTEM_PROMPT);
  if (problem) failed++;
  console.log(`  ${problem ? 'FAIL' : 'ok  '}  ${c.name}`);
  console.log(`        why: ${c.why}`);
  if (problem) console.log(`        \x1b[31m${problem}\x1b[0m`);
}

// The control: a prompt with the no-recall rule cut out MUST be caught.
// Same whitespace-normalizing reasoning as the check itself above.
const sabotaged = SUPPLIER_IMPACT_SYSTEM_PROMPT.replace(
  /You never state, imply or recommend which of\s+those four should apply, and never use the word "recall" as an instruction\./i,
  'You may say which outcome should apply, including recall.',
);
const caught = CHECKS.find((c) => c.name === 'the no-recall rule survives')!.run(sabotaged);
if (!caught) failed++;
console.log(`\n  ${caught ? 'ok  ' : 'FAIL'}  control: a stripped rule IS detected`);
console.log(`        ${caught ? 'removing the no-recall rule made the check fire — it can fail' : 'the checker passed a sabotaged prompt; it proves nothing'}`);

console.log(`\n  prompt: ${failed ? `${failed} FAILING` : `PASS — ${CHECKS.length + 1} checks`}\n`);
process.exit(failed ? 1 : 0);
