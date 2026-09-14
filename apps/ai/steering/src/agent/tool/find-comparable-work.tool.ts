/**
 * find_comparable_work — "what did work like this cost us before?", offered to
 * the model as ONE call.
 *
 * ── WHAT THE MODEL IS NOT ALLOWED TO DO, AND WHY ─────────────────────────
 *
 * It does not query the corpus itself, and it does not decide which past jobs
 * are comparable once it has them. `findComparableWork` already filtered on the
 * comparables key, took the MEDIAN rather than the mean, refused below three
 * records, and attached the sentence behind every classification.
 *
 * A model handed the raw rows would get most of that right and would sound
 * exactly as confident on the set of two it priced anyway. The refusal is the
 * part that cannot survive being advisory: it is the whole difference between a
 * grounded number and an invented one, and a rule a caller can decline is not a
 * rule.
 *
 * ── WHY ONE CALL AND NOT A SEARCH FOLLOWED BY A PRICE ────────────────────
 *
 * The evidence comes back WITH the figure. A tool that returned a number and
 * left the model to fetch its justification separately would produce answers
 * whose citations were assembled after the fact — which is precisely the shape
 * of a plausible wrong answer, and indistinguishable from a real one in the
 * output.
 *
 * DOMAIN: steering-system engineering effort. The PATTERN transfers, and it is
 * pharma's: when a question needs a deterministic traversal plus a judgement
 * the model must not be free to overrule, hand it the result, not the ability.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { openDerived, type DerivedHandle } from '../../tools/utils/handle';
import {
  findComparableWork, DEFAULT_RATE_BASIS,
  type ComparableWork, type ComparableWorkMiss,
} from '../../tools/functions/find-comparable-work';
import type { ComparableKey } from '../../tools/departments/derived';

export const FIND_COMPARABLE_WORK = 'find_comparable_work';

interface Args {
  change_class?: string;
  element_kind?: string;
  asil?: string;
  safety_case_impact?: boolean;
  tooling_required?: boolean;
  rate_year?: number;
  rate_region?: string;
}

/**
 * TAKES A HANDLE, NOT A CONNECTION STRING, for pharma's reason: the caller owns
 * the connection and closes it, so a tool that opened its own would reopen it on
 * every call a loop makes. The default keeps the self-test and one-off scripts
 * to a single line; a real loop passes its own and closes it.
 */
export function findComparableWorkTool(
  handle?: DerivedHandle,
): Tool<Args, ComparableWork | ComparableWorkMiss> {
  const h = handle ?? openDerived();

  return {
    // Live Postgres. Deterministic for a given corpus, but external, so an eval
    // run must be fixture-backed to reproduce.
    hasUpstream: true,

    schema: {
      type: 'function',
      name: FIND_COMPARABLE_WORK,
      description:
        'Price a piece of engineering work from what similar work actually ' +
        'cost, using the company\'s own closure reports and timesheets. ' +
        'Describe the work in whatever terms you know — kind of change, part ' +
        'affected, safety level, whether the safety case must be reopened — ' +
        'and leave out anything you are unsure of; every field is optional and ' +
        'a narrower filter is not automatically a better one. Returns the ' +
        'MEDIAN hours of the matching jobs, the euro breakdown by discipline ' +
        'at approved rates, how many jobs the figure rests on, and the exact ' +
        'sentence in the exact file that says what each job was. ' +
        'IT REFUSES BELOW THREE COMPARABLE JOBS and returns a refusal sentence ' +
        'instead of a price — when that happens, say so plainly and do not ' +
        'estimate the number yourself from the jobs it did find; two jobs is ' +
        'not a small sample, it is no sample. It also does not decide what to ' +
        'quote: this is what similar work cost, not what to charge, and ' +
        'contingency, commercial position and risk are somebody else\'s call.',
      parameters: z.strictObject({
        change_class: z
          .string()
          .optional()
          .describe(
            'The kind of change, e.g. "modify_hardware", "new_function", ' +
              '"safety_case_only", "recalibrate", "validation_only". Omit if ' +
              'unsure — if the value is not one the documents use, the tool ' +
              'replies with the list it does use rather than pretending there ' +
              'is no history.',
          ),
        element_kind: z
          .string()
          .optional()
          .describe(
            'What the work is on, e.g. "gearbox", "ecu", "motor", "sensor", ' +
              '"mechanical", "software_domain". Omit if unsure.',
          ),
        asil: z
          .string()
          .optional()
          .describe(
            'Safety integrity level of the work: "QM", "A", "B", "C" or "D". ' +
              'This is the level of the WORK BEING PRICED, not the level the ' +
              'component ships at today — where those differ, the difference ' +
              'is usually the cost item. Recorded in only some closure ' +
              'reports, so filtering on it narrows the set sharply.',
          ),
        safety_case_impact: z
          .boolean()
          .optional()
          .describe(
            'True when the safety argument has to be rebuilt — requirements, ' +
              'verification evidence, tool qualification, the case itself. ' +
              'This is the single biggest cost multiplier in the history, so ' +
              'set it deliberately rather than by default.',
          ),
        tooling_required: z
          .boolean()
          .optional()
          .describe('True when tooling has to be modified and re-qualified.'),
        rate_year: z
          .number()
          .optional()
          .describe(
            `Year of the approved rate card. Defaults to ${DEFAULT_RATE_BASIS.year}. ` +
              'Use the year the work will be DONE, not the year the comparable jobs ran.',
          ),
        rate_region: z
          .string()
          .optional()
          .describe(
            `Region of the approved rate card: "EU", "NA" or "CN". Defaults to ` +
              `"${DEFAULT_RATE_BASIS.region}". Rates differ materially between them.`,
          ),
      }),
    },

    /**
     * `findComparableWork` returns an informative miss for a value that appears
     * in no document, and a refusal for a set too small to price. Neither is an
     * error, so neither throws — a throw here would be read as broken plumbing
     * and would send somebody to look at the database.
     */
    async execute(args) {
      const key: ComparableKey = {
        changeClass: args.change_class?.trim() || undefined,
        elementKind: args.element_kind?.trim() || undefined,
        asil: args.asil?.trim().toUpperCase() || undefined,
        safetyCaseImpact: args.safety_case_impact,
        toolingRequired: args.tooling_required,
      };
      return findComparableWork(h, key, {
        year: args.rate_year ?? DEFAULT_RATE_BASIS.year,
        region: args.rate_region?.trim().toUpperCase() || DEFAULT_RATE_BASIS.region,
      });
    },
  };
}
