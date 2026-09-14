/**
 * `pnpm steering:assess-all [--run] [--limit N] [--programme CR-K2-]`
 *
 * The whole bid: what has been answered, what failed, what has never been
 * attempted — and, with `--run`, the assessments that close the gap.
 *
 * ── `--run` OPTS IN TO SPENDING, AND THAT BREAKS A CONVENTION ON PURPOSE ─
 *
 * `steering:assess` and `steering:summarise` both run by default and take
 * `--dry-run` to hold back. This one is the other way round, and the reason is
 * the multiplier: those commands spend one loop, this one spends fifteen. A
 * command whose plain form costs a dollar and forty seconds of your attention
 * is a command somebody runs twice by accident.
 *
 * The default — the work list — is also the thing you want most often. You run
 * it to see where the bid stands before deciding whether to spend anything.
 *
 * ── THREE STATES, NOT TWO, AND THE THIRD IS THE ONE THAT BITES ───────────
 *
 * `steering:assess` files a FAILED run too, with `answer: null` and the reason
 * — deliberately, because a run that failed still spent tokens and still took a
 * minute. So "has a row in the history" does NOT mean "has been answered".
 *
 * A resume that treats any row as done would skip every requirement that has
 * ever failed, permanently, and would look like it was working: the list gets
 * shorter each run, the failures never come back, and the bid quietly ships
 * with holes in it. `fetchFiledAssessments` already separates the two —
 * `answered` is one row per reference with the newest answer winning, and
 * `failedSince` is the references whose NEWEST attempt failed.
 *
 * A reference can be in BOTH: an answer in force, and a later retry that
 * failed. That is not a hole — the answer is still good — so it is shown as
 * what it is rather than collapsed into either neighbour.
 *
 * ── RESUMING IS NOT A FEATURE, IT IS THE SHAPE ───────────────────────────
 *
 * Nothing here remembers a batch. The work list is recomputed from the history
 * on every invocation, so an interrupted run resumes by being run again, and a
 * requirement answered from the web desk an hour ago is simply not in the list.
 * There is no batch id, no checkpoint file and no state to get out of step —
 * the filed answers ARE the state.
 *
 * ── A FILED ROW IS CHECKED, NOT ASSUMED ─────────────────────────────────
 *
 * `recordAssessment` never throws, so a broken write path is invisible from
 * inside a batch: every loop runs, every loop is paid for, the work list is
 * identical next time and nothing says why. That is not hypothetical — it
 * happened on this command's first real run, and diagnosing it needed a
 * `select` typed by hand.
 *
 * It now reports whether the row landed, and the batch stops on the first one
 * that did not, printing the reason Postgres gave.
 *
 * ── TWO KINDS OF FAILURE, AND THEY GET DIFFERENT TREATMENT ───────────────
 *
 * `assessRequirement` RETURNS a result with no assessment when the model hit
 * the turn cap or could not satisfy the contract. That is about this
 * requirement: file it, say so, carry on. Three of those in a row stops the
 * batch, because at that point the shared cause is more likely than three hard
 * questions in sequence.
 *
 * It THROWS when something outside the requirement broke — a rate limit that
 * outlived the client's six retries, an expired token, a database that went
 * away. None of those get better by trying the next requirement, so the first
 * one stops the run. Treating a 429 as "requirement 3 was difficult" is how you
 * spend twelve more loops discovering the same thing twelve more times.
 */
import { listRequirements, DEFAULT_PROGRAMME, type Requirement } from '../answer/requirements';
import { fetchFiledAssessments, closeHistory, type FiledHistory } from '../answer/filed-assessments';
import { assessRequirement, closeAssessmentContext } from '../agent/loop/assess-requirement';
import { fileAssessment } from './file-assessment';

/**
 * The label this batch's rows and cost lines carry, in the history AND in
 * `logs/requests.jsonl`.
 *
 * NOT `steering:assess`. Two things sharing a surface label cannot be told
 * apart afterwards, and the whole measurement this step exists to produce —
 * what a requirement costs when it is one of fifteen, against what it costs
 * run by hand with a warm cache — is exactly that comparison.
 */
const SURFACE = 'steering:assess-all';

/** Consecutive per-requirement failures before the batch gives up. See the header. */
const CONSECUTIVE_FAILURE_LIMIT = 3;

const RUN = process.argv.includes('--run');

function programme(): string {
  const i = process.argv.indexOf('--programme');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : DEFAULT_PROGRAMME;
}

/** `--limit 1` is the two-cent smoke test: prove the path end to end, then commit. */
function limit(): number | undefined {
  const i = process.argv.indexOf('--limit');
  if (i < 0 || !process.argv[i + 1]) return undefined;
  const n = Number(process.argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) throw new Error('--limit takes a whole number of requirements, 1 or more.');
  return n;
}

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/**
 * What we know about one requirement, before anything is run.
 *
 * `finding` and `lastAttemptFailed` are independent on purpose — see the
 * header. Collapsing them into one status field is the bug this file exists to
 * avoid, so the shape does not allow it.
 */
interface WorkItem {
  requirement: Requirement;
  /** The finding in force, or undefined when nothing has ever been answered. */
  finding?: string;
  lastAttemptFailed: boolean;
  /** A row exists whose stored answer this code cannot read. Named, never counted. */
  unreadable: boolean;
}

/** In force means answered. A later failed retry does not un-answer it. */
const isDone = (w: WorkItem): boolean => w.finding !== undefined;

function workList(requirements: Requirement[], history: FiledHistory): WorkItem[] {
  const answered = new Map(history.answered.map((a) => [a.ref, a]));
  const failed = new Set(history.failedSince);
  const unreadable = new Set(history.unreadableRefs);

  return requirements.map((requirement) => ({
    requirement,
    finding: answered.get(requirement.ref)?.assessment.finding,
    lastAttemptFailed: failed.has(requirement.ref),
    unreadable: unreadable.has(requirement.ref),
  }));
}

function printWorkList(work: WorkItem[], history: FiledHistory): void {
  if (history.noHistory) {
    line('  Nothing has ever been assessed — the history table does not exist yet.');
    line('  It is created by the first run that files something.');
    line();
  }

  for (const w of work) {
    const state = isDone(w)
      ? `${w.finding!.replace(/_/g, ' ')}${w.lastAttemptFailed ? '  (a later retry failed)' : ''}`
      : w.lastAttemptFailed
        ? 'attempted, failed'
        : 'not attempted';

    line(`  ${w.requirement.ref}  ${isDone(w) ? '·' : '→'}  ${state}`);
    line(`      ${w.requirement.title}`);
    // Named rather than counted, for the reason `filed-assessments.ts` gives:
    // a count makes the row vanish from every tally while reporting only that
    // something was odd. The reference is the part that is actionable.
    if (w.unreadable) line('      a filed row for this reference cannot be read');
  }
  line();

  // Rows that belong to no requirement in this programme. Worth saying out
  // loud: they were paid for, and a work list that silently omits them reads
  // as though the history holds only what is on screen.
  if (history.typed) {
    line(`  ${history.typed} filed run(s) have no reference — requirements typed by hand, not in this list.`);
  }
  if (history.superseded) {
    line(`  ${history.superseded} older answer(s) replaced by a newer one.`);
  }
  if (history.typed || history.superseded) line();
}

/** A run that returned no assessment. Filed, reported, and counted toward the breaker. */
function printFailure(ref: string, stoppedBecause: string, schemaErrors: string[]): void {
  line(`  ${ref}  ✗  no answer — stopped because ${stoppedBecause}`);
  for (const e of schemaErrors) line(`         ${e}`);
}

async function run(work: WorkItem[]): Promise<void> {
  const started = Date.now();
  let answered = 0;
  let failed = 0;
  let consecutive = 0;
  const mix = new Map<string, number>();

  for (const [i, w] of work.entries()) {
    const { ref } = w.requirement;
    line(`  [${i + 1}/${work.length}] ${ref} — ${w.requirement.title}`);

    // NOT hoisted out of the loop. The programme binds every search this
    // requirement makes, and it is a property of the question rather than of
    // the batch — a run that reused one programme for all fifteen would
    // reopen the cross-programme bug NEXT.md §1 took three rounds to close.
    const result = await assessRequirement({
      requirementRef: ref,
      text: w.requirement.text,
      programme: w.requirement.programme,
      surface: SURFACE,
    });

    const filing = await fileAssessment(ref, w.requirement.text, result, SURFACE);

    if (result.assessment) {
      answered++;
      consecutive = 0;
      const f = result.assessment.finding;
      mix.set(f, (mix.get(f) ?? 0) + 1);
      const { cost } = result.assessment;
      const price =
        cost.median_hours === null
          ? 'no price'
          : `EUR ${cost.eur?.toLocaleString('en-GB')} from ${cost.comparable_jobs} job(s)`;
      line(`         ${f.replace(/_/g, ' ')} · ${price} · ${result.turns.length} turn(s) · ${secs(result.ms)}`);
    } else {
      failed++;
      consecutive++;
      printFailure(ref, result.stoppedBecause, result.schemaErrors);
    }

    /**
     * A ROW THAT DID NOT LAND STOPS THE BATCH, ON ANY REQUIREMENT.
     *
     * Not just the first. A connection dies mid-run as easily as it starts
     * dead, and requirement seven vanishing is the same loss as requirement
     * one — the assessment was produced, it was paid for, and there is now no
     * record that it ever happened. Carrying on would buy more of exactly that.
     *
     * The reason is printed rather than guessed at, because the two kinds want
     * opposite responses: a payload Postgres will not accept never gets better
     * on a retry, and a dead connection gets better on the next run.
     */
    if (!filing.filed) {
      line();
      line(`  STOPPED — ${ref} was assessed and paid for, and its row was not filed.`);
      line(`    ${filing.error}`);
      line();
      line('  The assessment is lost: it exists nowhere but the lines above. Running');
      line('  this again re-runs it, and will cost the same again, so it is worth');
      line('  knowing why it failed before you do.');
      line();
      return;
    }

    if (consecutive >= CONSECUTIVE_FAILURE_LIMIT) {
      line();
      line(`  STOPPED — ${consecutive} requirements in a row produced no answer. At that`);
      line('  point a shared cause is likelier than three hard questions in sequence.');
      line('  Nothing is lost: the ones that succeeded are filed, and running this');
      line('  again picks up exactly where it left off.');
      line();
      break;
    }
  }

  line();
  rule();
  line(`  ${answered} answered, ${failed} with no answer, ${secs(Date.now() - started)} total`);
  rule();
  line();

  /**
   * THE MEASUREMENT, not decoration.
   *
   * NEXT.md §5a suspects the `finding` field has stopped discriminating —
   * fifteen eval runs across three requirements all returned `change_needed`,
   * and so did all nine answered on the desk. This batch adds a dozen
   * genuinely different subjects: lifetime, piece price, NVH, start of
   * production. If every one of them comes back `change_needed` too, a field
   * with four values is a boolean, demonstrated rather than suspected. If any
   * other value appears even once, §5a is wrong and should be struck.
   */
  if (mix.size) {
    line('  Findings this run:');
    for (const [finding, n] of [...mix].sort((a, b) => b[1] - a[1])) {
      line(`    ${String(n).padStart(3)}  ${finding.replace(/_/g, ' ')}`);
    }
    if (mix.size === 1) {
      line();
      line('  One value across the whole run. NEXT.md §5a is about exactly this —');
      line('  a field that always answers the same carries no information.');
    }
    line();
  }

  // No cost figure, deliberately: `@fde/telemetry` exports a writer and no
  // reader, and a number this file estimated would be a guess printed next to
  // measured ones. The real figures are one grep away, which is what the
  // surface label is for.
  line(`  What this cost:  grep '"surface":"${SURFACE}"' logs/requests.jsonl`);
  line('  Where the bid stands now:  pnpm steering:summarise --dry-run');
  line();
}

async function main(): Promise<void> {
  const prefix = programme();
  const [requirements, history] = await Promise.all([
    listRequirements(prefix),
    // The row cap, not a requirement cap: 200 rows of a log with re-runs in it
    // is far more than two dozen requirements. `listAssessments` is the wrong
    // door here — it caps at 50 rows and would start silently losing the
    // oldest answers as soon as the history had a few retries in it.
    fetchFiledAssessments(),
  ]);

  if (!requirements.length) {
    throw new Error(`No in-force requirements start with "${prefix}" in vst_alm.`);
  }

  const work = workList(requirements, history);
  const done = work.filter(isDone);
  const outstanding = work.filter((w) => !isDone(w));
  const n = limit();
  const toRun = n === undefined ? outstanding : outstanding.slice(0, n);

  line();
  rule();
  line(`  ${prefix}  —  ${requirements.length} requirements, ${done.length} answered, ${outstanding.length} to run`);
  rule();
  line();

  printWorkList(work, history);

  rule();
  if (!outstanding.length) {
    line('  Nothing to run — every requirement in this programme has an answer in force.');
    rule();
    line();
    return;
  }
  line(`  To run: ${toRun.map((w) => w.requirement.ref).join(', ')}`);
  if (n !== undefined && n < outstanding.length) {
    line(`          (${outstanding.length - toRun.length} more outstanding, held back by --limit ${n})`);
  }
  rule();
  line();

  if (!RUN) {
    // The suggested command carries the flags that produced THIS list. Printing
    // a bare `--run` under a list shortened by `--limit` offers to spend
    // fifteen loops beneath a line that says one.
    const flags =
      (prefix === DEFAULT_PROGRAMME ? '' : ` --programme ${prefix}`) +
      (n === undefined ? '' : ` --limit ${n}`);
    line('  Nothing was run and nothing was spent.');
    line(`  To assess ${toRun.length === 1 ? 'it' : `these ${toRun.length}`}:  pnpm steering:assess-all --run${flags}`);
    if (n === undefined && outstanding.length > 1) {
      line(`  To try one first:  pnpm steering:assess-all --run --limit 1${flags}`);
    }
    line();
    return;
  }

  await run(toRun);
}

/** Guarded, like every entry point here — importing one must not run it. */
if (require.main === module) {
  main()
    .catch((e: unknown) => {
      // A THROW ENDS THE BATCH, and the message says so rather than leaving it
      // to be inferred from a stack trace: everything already assessed is
      // filed, so the fix is to run the command again, not to start over.
      console.error(`\n  ${e instanceof Error ? e.message : String(e)}`);
      console.error('\n  The batch stopped here. Assessments already filed are kept —');
      console.error('  run the command again to pick up the rest.\n');
      process.exitCode = 1;
    })
    // Opened once for the whole batch and closed once, at the end. Closing per
    // requirement would reopen the pool, the index store and the embedding
    // client fifteen times against one Neon compute.
    .finally(async () => {
      await closeAssessmentContext();
      await closeHistory();
    });
}
