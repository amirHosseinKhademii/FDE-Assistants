/**
 * One real assessment, captured and written into the app.
 *
 * `pnpm steering:worked-example [CR-K2-0101]` runs the loop once and writes
 * `apps/steering-app/src/lib/worked-example.generated.ts` — the requirement, the
 * finding, the citations, what it refused, and what it did to get there.
 *
 * ── WHY A PAGE SHOULD CARRY ONE ──────────────────────────────────────────
 *
 * The desk can answer, and a visitor who has not pressed the button has no way
 * to know that. A screenshot would prove nothing and a description even less;
 * what settles it is the actual output, with the citations that can be opened
 * and the refusal that a marketing page would never write. It also means a
 * reader sees the product without paying for a run — the assessment costs a
 * minute and a few cents, and asking everyone who visits to spend that is how a
 * demo ends up being a page nobody clicks.
 *
 * ── IT IS GENERATED AND COMMITTED, LIKE THE ESTATE FILES ─────────────────
 *
 * Same rule as `estate-web.ts`: a figure a reader cannot reproduce is worse
 * than no figure. This file records the command that produced it and the date,
 * and the page prints both. A worked example typed out by hand would be a claim
 * about an answer rather than an answer.
 *
 * ── IT IS ONE RUN, AND THE PAGE SAYS SO ──────────────────────────────────
 *
 * The loop is not deterministic. This is what it said on one occasion, not what
 * it always says, and presenting it as a specimen rather than as a guarantee is
 * the difference between evidence and a promise. The eval suite is where "does
 * it do this reliably" is answered — `docs/steering/evals/`.
 *
 * ── IT COSTS MONEY, SO IT IS ITS OWN COMMAND ─────────────────────────────
 *
 * Not wired into `build` and not run by CI. Regenerating it is a decision
 * somebody takes, on a day they want the page to show a newer answer.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';
import { fetchRequirement } from '../answer/requirements';
import { assessRequirement, closeAssessmentContext } from '../agent/loop/assess-requirement';

const TARGET = resolve(REPO_ROOT, 'apps/steering-app/src/lib/worked-example.generated.ts');

/** The acceptance case: 8000 N claimed by analysis, 7600 N demonstrated on a rig. */
const DEFAULT_REF = 'CR-K2-0101';

function requirementRef(): string {
  return (process.argv.slice(2).find((a) => /^CR-/i.test(a)) ?? DEFAULT_REF).toUpperCase();
}

async function main(): Promise<void> {
  const ref = requirementRef();
  const requirement = await fetchRequirement(ref);
  if (!requirement) throw new Error(`${ref} is not an in-force customer requirement in vst_alm.`);

  console.log(`\n  ${ref} — ${requirement.title}`);
  console.log(`  "${requirement.text}"\n`);
  console.log('  running the loop — this costs a few cents and takes tens of seconds…\n');

  /**
   * THE TRACE IS CAPTURED AS IT HAPPENS, and it is the same event stream the
   * web route sends. A worked example that showed only the answer would leave
   * out the part a sceptical reader cares about most: how many searches it
   * took, what each one returned, and how long it spent.
   */
  const steps: Array<{ name: string; summary?: string; ms?: number; ok?: boolean }> = [];

  const result = await assessRequirement({
    requirementRef: requirement.ref,
    text: requirement.text,
    surface: 'worked-example',
    onEvent: (e: any) => {
      if (e.type === 'tool_call') {
        steps.push({ name: e.name });
        console.log(`  → ${e.name}`);
      } else if (e.type === 'tool_result') {
        for (let i = steps.length - 1; i >= 0; i--) {
          if (steps[i].name === e.name && steps[i].ms === undefined) {
            steps[i] = { name: e.name, summary: e.summary, ms: e.ms, ok: e.ok };
            break;
          }
        }
        console.log(`    ${e.ok ? e.summary : 'FAILED'}   ${e.ms}ms`);
      }
    },
  });

  if (!result.assessment) {
    // NOT WRITTEN. A run that produced nothing is a real outcome and belongs in
    // the history table, but a worked example is a specimen of the thing
    // working — publishing a failure as one would be a different page.
    throw new Error(
      `no valid answer — stopped because ${result.stoppedBecause}. Nothing was written; run it again.`,
    );
  }

  const example = {
    ref: requirement.ref,
    requirement,
    assessment: result.assessment,
    citations: result.citations,
    run: {
      turns: result.turns.length,
      toolCalls: result.turns.reduce((a, t) => a + (t.toolCalls?.length ?? 0), 0),
      ms: result.ms,
      engine: result.engine,
      stoppedBecause: result.stoppedBecause,
      schemaRetries: result.schemaErrors.length,
    },
    trace: steps,
    measuredBy: `pnpm steering:worked-example ${ref}`,
    measuredAt: new Date().toISOString().slice(0, 10),
  };

  const body = `/**
 * ONE REAL ASSESSMENT, CAPTURED. Generated — do not edit by hand.
 *
 * Written by \`${example.measuredBy}\` on ${example.measuredAt}. It is what the
 * loop said on ONE occasion, not what it always says; the eval suite under
 * \`docs/steering/evals/\` is where reliability is answered.
 */
import type { WorkedExample } from './worked-example';

export const WORKED: WorkedExample | null = ${JSON.stringify(example, null, 2)};
`;

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, body);

  console.log(`\n  ${result.assessment.finding} · ${result.assessment.citations.length} citation(s)`);
  console.log(`  written to ${TARGET.replace(REPO_ROOT + '/', '')}\n`);
}

/** Guarded, like every entry point here — importing one must not run it. */
if (require.main === module) {
  main()
    .catch((e: unknown) => {
      console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    })
    .finally(closeAssessmentContext);
}
