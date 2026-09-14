/**
 * `pnpm steering:summarise [--programme CR-K2-] [--dry-run]`
 *
 * Where the bid stands, across every requirement already assessed.
 *
 * ── IT READS FILED ASSESSMENTS AND NOTHING ELSE ──────────────────────────
 *
 * Not the corpus, not the index, not the four customer databases. The one
 * estate query it makes is the LIST OF REQUIREMENTS — the denominator — and it
 * makes it here, in the CLI, so that the summariser is handed the number rather
 * than able to reach for it. Same reason the assessment loop is handed its
 * requirement text.
 *
 * ── `--dry-run` IS THE WHOLE ROLL-UP, AND IT IS FREE ─────────────────────
 *
 * Everything countable is computed in code, so a dry run prints the real mix,
 * the real total and the real refusal list, and stops before the one model call
 * that costs anything. That is worth doing first every time: if nine of
 * twenty-four are assessed, the interesting output is already on screen and the
 * paid call adds two paragraphs to it.
 */
import { listRequirements, DEFAULT_PROGRAMME } from '../answer/requirements';
import { fetchFiledAssessments, closeHistory } from '../answer/filed-assessments';
import { rollUp, NOT_THE_QUOTE, type RollUp } from '../agent/summary/roll-up';
import { toLines } from '../agent/summary/lines';
import { summariseBid } from '../agent/loop/summarise-bid';
import { SYSTEM_PROMPT, userPrompt } from '../agent/prompt/summarise-bid';
import type { BidSummary } from '../schema/bid-summary-schema';

const DRY = process.argv.includes('--dry-run');

function programme(): string {
  const i = process.argv.indexOf('--programme');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : DEFAULT_PROGRAMME;
}

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));
const eur = (n: number): string => `EUR ${Math.round(n).toLocaleString('en-GB')}`;

/** The counted half. Free, deterministic, and printed whether or not a model runs. */
function printRollUp(r: RollUp): void {
  rule();
  line(`  ${r.assessedRefs.length} of ${r.requirementCount} requirements assessed`);
  rule();
  line();

  for (const [finding, n] of Object.entries(r.mix)) {
    if (n > 0) line(`  ${String(n).padStart(3)}  ${finding.replace(/_/g, ' ')}`);
  }
  line();

  if (r.notAssessedRefs.length) {
    line(`  NOT YET ASSESSED (${r.notAssessedRefs.length}):`);
    line(`    ${r.notAssessedRefs.join(', ')}`);
    line();
  }

  // The money, and never without the two things that qualify it.
  line(
    r.priced.length
      ? `  ${r.priced.length} priced · ${r.hoursTotal.toLocaleString('en-GB')} h · ${eur(r.eurTotal)} · from ${r.jobsBehindTotal} past job(s)`
      : '  nothing is priced',
  );
  line(`  ${r.unpriced.length} unpriced${r.neverAsked ? ` (${r.neverAsked} never queried history at all)` : ''}`);
  line();
  if (r.priced.length) {
    for (const l of wrap(NOT_THE_QUOTE)) line(`  ${l}`);
    line();
  }

  for (const u of r.unpriced) line(`  ${u.ref}  unpriced — ${u.why}`);
  line();

  if (r.unexpectedRefs.length) {
    line(`  ASSESSED BUT NOT IN THIS PROGRAMME'S LIST: ${r.unexpectedRefs.join(', ')}`);
    line();
  }

  // The rows the history reader set aside. Printed, because each one is somebody
  // re-running something, or paying for a run that produced nothing.
  const h = r.history;
  const notes = [
    h.superseded ? `${h.superseded} superseded re-run(s)` : '',
    h.failedSince.length ? `newest run FAILED for ${h.failedSince.join(', ')}` : '',
    h.typed ? `${h.typed} typed requirement(s), not counted against this programme` : '',
    h.unreadableRefs.length ? `not readable as an assessment: ${h.unreadableRefs.join(', ')}` : '',
  ].filter(Boolean);
  if (notes.length) {
    line('  ALSO IN THE HISTORY:');
    for (const n of notes) line(`    · ${n}`);
    line();
  }
}

/** The written half. */
function printSummary(s: BidSummary): void {
  rule();
  line('  WHERE THE BID STANDS');
  rule();
  line();
  for (const l of wrap(s.headline)) line(`  ${l}`);
  line();

  if (s.refusal_themes.length) {
    line('  WHAT THE UNPRICED REQUIREMENTS ARE WAITING ON:');
    for (const t of s.refusal_themes) {
      line(`    ${t.theme}  (${t.requirement_refs.length})`);
      line(`      ${t.requirement_refs.join(', ')}`);
      for (const l of wrap(`would be settled by: ${t.what_would_settle_it}`)) line(`      ${l}`);
    }
    line();
  }

  if (s.repeated_questions.length) {
    line('  ASKED ON MORE THAN ONE REQUIREMENT:');
    for (const q of s.repeated_questions) {
      for (const l of wrap(q.question)) line(`    ${l}`);
      line(`      ${q.suggested_owner} · ${q.requirement_refs.join(', ')}`);
    }
    line();
  }
}

function wrap(s: string, width = 74): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(/\s+/)) {
    if ((`${cur} ${w}`).trim().length > width) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}

async function main(): Promise<void> {
  const prefix = programme();
  const [requirements, history] = await Promise.all([
    listRequirements(prefix),
    fetchFiledAssessments(),
  ]);

  if (history.noHistory) {
    line('\n  No assessment has ever been filed — `assess_history` does not exist yet.');
    line('  Assess a requirement on the desk, or with `pnpm steering:assess`, first.\n');
    return;
  }
  if (!history.answered.length) {
    line(`\n  ${history.typed} typed and ${history.failedSince.length} failed run(s) on file, and no answered assessment.\n`);
    return;
  }

  const r = rollUp(history, requirements.map((q) => q.ref));
  line();
  printRollUp(r);

  if (DRY) {
    const lines = toLines(history.answered);
    const prompt = userPrompt(r, lines);
    line(`  dry run: nothing above needed a model.`);
    line(`  the paid call would send ${SYSTEM_PROMPT.length} + ${prompt.length} characters,`);
    line(`  compressed from ${JSON.stringify(history.answered).length} characters of dossier.\n`);
    return;
  }

  const result = await summariseBid({ rollUp: r, filed: history.answered });

  if (!result.summary) {
    line(`  NO SUMMARY — stopped because ${result.stoppedBecause}`);
    for (const e of result.schemaErrors) line(`    ${e}`);
    line();
  } else {
    printSummary(result.summary);
  }

  /**
   * PRINTED EVEN WHEN THE ANSWER ARRIVED, and this line was missing.
   *
   * The first real run reported `2 turn(s)` and nothing else. It had in fact
   * failed its contract once and repaired it on the second attempt — visible
   * only in `logs/requests.jsonl` afterwards. The assessment CLI keeps its
   * retries for exactly this reason and the sentence is worth repeating: how
   * often the contract is missed is a number you need, and a retry that
   * succeeded is the easiest one to lose.
   */
  for (const e of result.schemaErrors) line(`  schema retry: ${e}`);
  if (result.schemaErrors.length) line();

  const { dossiers, lines: compressed } = result.compression;
  const per = (n: number): string => Math.round(n / history.answered.length).toLocaleString('en-GB');
  line(
    `  ${result.engine} · ${result.turns.length} turn(s) · ${result.ms}ms · ` +
      `${per(compressed)} characters per requirement summarised, against ${per(dossiers)} per full dossier`,
  );
  line();
}

// Guarded: importing this file must not run it. An earlier CLI in this package
// called `main()` at module scope and re-indexed the corpus when a tool
// imported a constant from it.
if (require.main === module) {
  main()
    .finally(closeHistory)
    .then(
      () => process.exit(0),
      (e) => {
        console.error(e);
        process.exit(1);
      },
    );
}
