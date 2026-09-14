/**
 * `pnpm steering:assess CR-K2-0101 [--trace] [--loop mastra]`
 *
 * The first thing in this package that asks a model to REASON rather than to
 * read. Everything before it was deterministic or a single extraction call.
 *
 * COSTS A MULTI-TURN LOOP — a few cents. `--dry-run` prints the requirement, the
 * tools and the prompt and stops, which is worth doing first: the run that
 * spends money should not be the run that tells you the requirement id was
 * wrong.
 *
 * WHERE THE REQUIREMENT TEXT COMES FROM. `answer/requirements.ts`, which the
 * web desk also calls — the "in force, not latest" clause is load-bearing and
 * two copies of it is how one of them quietly loses it. The query used to be
 * inlined here; its two original bugs are recorded in that file's header.
 */
import { fetchRequirement } from '../answer/requirements';
import { recordAssessment, closeHistory } from '../answer/filed-assessments';
import { assessRequirement, closeAssessmentContext } from '../agent/loop/assess-requirement';
import { SYSTEM_PROMPT } from '../agent/prompt/assess-requirement';
import type { RequirementAssessment } from '../schema/assessment-schema';
import type { AssessResult } from '../agent/loop/assess-requirement';

const DRY = process.argv.includes('--dry-run');
const TRACE = process.argv.includes('--trace');

function requirementRef(): string {
  const ref = process.argv.slice(2).find((a) => /^CR-/i.test(a));
  if (!ref) throw new Error('Name a requirement: pnpm steering:assess CR-K2-0101');
  return ref.toUpperCase();
}

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));

function printAssessment(a: RequirementAssessment): void {
  rule();
  line(`  ${a.requirement_ref} — ${a.finding.replace(/_/g, ' ').toUpperCase()}`);
  rule();
  line();
  line(`  ${a.reasoning}`);
  line();

  for (const c of a.citations) {
    line(`  ${c.file}:${c.line}`);
    line(`    "${c.quote}"`);
  }
  line();

  if (a.conflicts.length) {
    line('  DOCUMENTS DISAGREE:');
    for (const c of a.conflicts) {
      line(`    ${c.about}`);
      for (const p of c.positions) line(`      · ${p.says}   — ${p.citation.file}:${p.citation.line}`);
    }
    line();
  }

  if (a.unverified_claims.length) {
    line('  STATED WITHOUT A CITATION:');
    for (const u of a.unverified_claims) line(`    · ${u}`);
    line();
  }

  const { cost } = a;
  line(
    cost.median_hours === null
      ? `  NO PRICE — ${cost.refused_because} (${cost.comparable_jobs} comparable job(s))`
      : `  ${cost.median_hours} h · EUR ${cost.eur?.toLocaleString()} · from ${cost.comparable_jobs} comparable job(s)`,
  );
  line();

  line('  FOR A PERSON TO DECIDE:');
  for (const d of a.decisions_for_human) {
    line(`    ${d.question}`);
    line(`      why it matters: ${d.why_it_matters}`);
    line(`      owner:          ${d.suggested_owner}`);
  }
  line();
}

async function main(): Promise<void> {
  const ref = requirementRef();
  const req = await fetchRequirement(ref);
  if (!req) throw new Error(`${ref} is not an in-force customer requirement in vst_alm.`);

  line(`\n  ${ref}  (spec revision ${req.revision}, in force` +
    (req.programme ? `, ${req.programme}` : '') + ')');
  line(`  "${req.text}"${req.unit ? `  [${req.unit}]` : ''}\n`);

  if (DRY) {
    line('  tools: search_documents, find_comparable_work');
    line(`  prompt: ${SYSTEM_PROMPT.length} characters\n`);
    line('dry-run: no model was called.\n');
    return;
  }

  const result = await assessRequirement({
    requirementRef: ref,
    text: req.text,
    programme: req.programme,
    // Live, as it happens. A retrieval takes a second or two and a trace that
    // only reports it afterwards leaves you watching a still cursor.
    onEvent: TRACE
      ? (e) => {
          if (e.type === 'tool_call') line(`  → ${e.name}(${JSON.stringify(e.args).slice(0, 70)})`);
          if (e.type === 'tool_result') line(`    ${e.ok ? e.summary : 'FAILED'}   ${e.ms}ms`);
          if (e.type === 'schema_retry') line(`  ↻ schema retry: ${e.error.slice(0, 90)}`);
        }
      : undefined,
  });

  if (!result.assessment) {
    line(`\n  NO VALID ANSWER — stopped because ${result.stoppedBecause}`);
    if (result.stoppedBecause === 'max_turns') {
      // Said plainly, because the run was not free and the bill will not show
      // it: the SDK throws on the cap and its exception carries no token usage,
      // so the logged cost for this run is a floor and not a measurement.
      line('    The turn cap was reached before an answer was written. Tool calls are');
      line('    recorded; token counts are NOT — the cap throws, and nothing in the');
      line('    exception reports usage. Treat the logged cost of this run as a floor.');
    }
    // Printed, never swallowed. A schema failure is the number that says whether
    // the contract is too hard, the prompt unclear, or the model wrong for it.
    for (const e of result.schemaErrors) line(`    ${e}`);
    line();
  } else {
    printAssessment(result.assessment);
  }

  const c = result.citations;
  if (c) {
    line(
      `  citations: ${c.exact} exact, ${c.corrected} line corrected to the quoted sentence` +
        (c.unresolved.length ? `, ${c.unresolved.length} NOT FOUND in the file cited` : ''),
    );
    // Named individually. An unfound quote is either a paraphrase or the wrong
    // file, and both are worth reading rather than counting.
    for (const u of c.unresolved) line(`    ${u.file}: "${u.quote}…"`);
  }

  line(`  ${result.engine} · ${result.turns.length} turn(s) · ${result.ms}ms` +
    (result.schemaErrors.length ? ` · ${result.schemaErrors.length} schema retry(s)` : ''));
  line();

  await file(ref, req.text, result);
}

/**
 * File the assessment, the same way the web desk does.
 *
 * ── WHY THIS WAS MISSING, AND WHAT IT COST ───────────────────────────────
 *
 * Only the app filed anything, so a day of command-line assessments left a
 * history holding ONE answer — written by the desk. The assessments themselves
 * were printed and gone. Nothing was wrong with them; they were simply never
 * written down, and `pnpm steering:summarise` had nothing to read.
 *
 * ── A FAILED RUN IS FILED TOO ────────────────────────────────────────────
 *
 * With `answer: null` and the reason, which is the rule the table's header
 * already states: a run that failed still spent tokens and still took a
 * minute, and dropping those rows makes the history quietly cheaper and more
 * reliable than the system is.
 *
 * `surface` says `steering:assess`, never the desk's label. Where an assessment
 * was made is part of what it is.
 */
async function file(ref: string, text: string, result: AssessResult): Promise<void> {
  const run = {
    engine: result.engine,
    turns: result.turns.length,
    ms: result.ms,
    stoppedBecause: result.stoppedBecause,
  };
  await recordAssessment({
    ref,
    text,
    loop: result.engine,
    surface: 'steering:assess',
    answer: result.assessment ? { assessment: result.assessment, citations: result.citations } : null,
    failure: result.assessment
      ? null
      : { message: result.schemaErrors.join(' | ') || 'no valid answer', stoppedBecause: result.stoppedBecause, run },
    run,
    trace: result.turns,
  });
}

/** Guarded, like every entry point here — importing one must not run it. */
if (require.main === module) {
  main()
    .catch((e: unknown) => {
      console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeAssessmentContext();
      await closeHistory();
    });
}
