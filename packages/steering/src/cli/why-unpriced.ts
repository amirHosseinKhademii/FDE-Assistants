/**
 * `pnpm steering:why-unpriced [--programme CR-K2-]`
 *
 * Why did twenty-three of twenty-four requirements come back with no price?
 *
 * ── IT MEASURES. IT CHANGES NOTHING. ─────────────────────────────────────
 *
 * [`NEXT.md`](../../../../docs/steering/NEXT.md) §0 states a fork and refuses
 * to guess which arm it is on:
 *
 *   · the agent OVER-CONSTRAINS a history that could have answered, or
 *   · the estate genuinely holds no work of the kind being asked about
 *
 * Those need opposite fixes. One is a classification problem in the prompt; the
 * other means the refusal sentence is wrong — *"we have never done this"* is a
 * different answer from *"your filter was too narrow"*, and the second reads
 * like a fault in us rather than a fact about the company.
 *
 * So this file deliberately contains no fix. A diagnostic written alongside the
 * change it motivates cannot be trusted to have been neutral about it, and §0
 * asks for a measurement before and after — which means this gets RE-RUN, which
 * is why it is a command rather than SQL typed once into a terminal.
 *
 * ── IT IS FREE, AND IT RE-READS WORK ALREADY PAID FOR ────────────────────
 *
 * No model, no embedding, no loop. Every `find_comparable_work` call the agent
 * made is already stored in `assess_history.trace`, arguments and result
 * together, because the whole turn record is filed with the answer. The counts
 * come from `tools/departments/derived`, which is the same parameterised
 * `whereFor` the tool itself uses — so this cannot accidentally measure a
 * different query from the one that refused.
 *
 * ── THE SELECTION HERE IS NOT `sortRows`, AND THAT IS DELIBERATE ─────────
 *
 * `sortRows` is the canonical newest-answered-per-reference and is exported so
 * that nothing re-implements it. It drops `trace`, because nothing else needed
 * it. This file needs the newest answered row WITH its trace, which is a
 * different selection rather than a second copy of the same rule — said out
 * loud so the next reader does not have to work out which of the two is right.
 */
import { listAssessments, closeHistory } from '../answer/filed-assessments';
import { openDerived } from '../tools/utils/handle';
import {
  fetchComparableJobs, countPastJobs,
  type ComparableKey, type PastJob,
} from '../tools/departments/derived';
import { MIN_COMPARABLES } from '../answer/derive';
import { DEFAULT_PROGRAMME } from '../answer/requirements';

const FIND_COMPARABLE_WORK = 'find_comparable_work';

/** Rows to read. A cap on the LOG, not on requirements — re-runs and failures inflate it. */
const ROW_CAP = 500;

function programme(): string {
  const i = process.argv.indexOf('--programme');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : DEFAULT_PROGRAMME;
}

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));

// ── reading the agent's own classification back out of the trace ───────────

/**
 * The tool's arguments are snake_case (it is a model-facing schema) and the
 * department's key is camelCase. The tool's `execute` does this same mapping
 * inline and does not export it.
 *
 * REPLICATED RATHER THAN SHARED, and the reason it is safe to replicate: a
 * drift here cannot produce a wrong answer quietly. If this mapping stopped
 * matching the tool's, the counts below would stop matching the refusal
 * sentences printed beside them, which is the most visible failure available.
 */
function keyFromArgs(args: any): ComparableKey {
  return {
    changeClass: args?.change_class?.trim() || undefined,
    elementKind: args?.element_kind?.trim() || undefined,
    asil: args?.asil?.trim()?.toUpperCase() || undefined,
    safetyCaseImpact: args?.safety_case_impact,
    toolingRequired: args?.tooling_required,
  };
}

/** What the tool said back, in the three kinds that mean different things. */
type Outcome =
  | { kind: 'priced'; jobs: number; hours: number }
  | { kind: 'refused'; jobs: number }
  | { kind: 'miss'; reason: string }
  /** The trace recorded a call whose summary this file cannot parse. Never assumed. */
  | { kind: 'unknown'; summary: string };

function outcomeOf(result: any): Outcome {
  // A MISS is not a REFUSAL. `found: false` means a value the agent supplied
  // appears in no document at all — a vocabulary mismatch. A refusal means the
  // value was understood and too few jobs carry it. Collapsing them hides a
  // prompt problem inside a data fact.
  if (result?.found === false) return { kind: 'miss', reason: String(result.reason ?? 'no match') };
  const cost = result?.cost;
  if (cost && cost.median_hours !== null && cost.median_hours !== undefined) {
    return { kind: 'priced', jobs: cost.comparable_jobs ?? 0, hours: cost.median_hours };
  }
  return { kind: 'refused', jobs: cost?.comparable_jobs ?? 0 };
}

interface Call {
  /** Absent when the trace recorded the call but not its arguments — see `callsIn`. */
  key?: ComparableKey;
  outcome: Outcome;
}

/**
 * ── TWO SHAPES LIVE IN THIS COLUMN, AND ONLY ONE WAS EXPECTED ────────────
 *
 * `assess_history.trace` holds `TurnRecord[]` when the CLI files it and
 * `LoopEvent[]` when the web desk does — `api.assess.tsx` files `events`, the
 * things it already streamed to the browser, rather than `result.turns`.
 *
 * Nothing documents that and nothing asserts it. The first version of this file
 * read only the turn shape, found no tool calls in any desk row, and reported
 * eight requirements as "never called the pricing tool". **One of them had
 * called it three times and was carrying a real price** — which this file was
 * one paragraph away from reporting as a fabricated number.
 *
 * ── WHAT EACH SHAPE CAN AND CANNOT ANSWER ───────────────────────────────
 *
 * A turn record carries the call's ARGUMENTS and its full RESULT, so the key
 * the agent chose can be counted against the estate. A loop event carries the
 * tool's name, the timing and a one-line `summary` — enough to say THAT the
 * tool was called and what it answered, not enough to say what was asked.
 *
 * So a desk row is reported as "called, arguments not recorded" rather than
 * folded in with either the refusals or the never-askeds. Both of those would
 * be a claim the data does not support.
 */
function callsIn(trace: any): Call[] {
  const items: any[] = Array.isArray(trace) ? trace : [];
  if (!items.length) return [];

  // The event shape announces itself: a turn record has no `type`.
  const isEvents = items.some((e) => typeof e?.type === 'string');
  return isEvents ? callsFromEvents(items) : callsFromTurns(items);
}

function callsFromTurns(turns: any[]): Call[] {
  const calls: Call[] = [];
  for (const turn of turns) {
    for (const c of turn?.toolCalls ?? []) {
      if (c?.name !== FIND_COMPARABLE_WORK) continue;
      calls.push({ key: keyFromArgs(c.args), outcome: outcomeOf(c.result) });
    }
  }
  return calls;
}

/**
 * The desk's shape. `summary` is written by `summarise()` in the loop, so these
 * three patterns are the only ones it produces — parsed rather than guessed,
 * and anything unrecognised is reported as unknown instead of assumed refused.
 */
function callsFromEvents(events: any[]): Call[] {
  const calls: Call[] = [];
  for (const e of events) {
    if (e?.type !== 'tool_result' || e?.name !== FIND_COMPARABLE_WORK) continue;
    calls.push({ key: undefined, outcome: outcomeFromSummary(String(e.summary ?? '')) });
  }
  return calls;
}

function outcomeFromSummary(summary: string): Outcome {
  const miss = /^miss: (.*)$/.exec(summary);
  if (miss) return { kind: 'miss', reason: miss[1] };

  const refused = /^refused: (\d+) of/.exec(summary);
  if (refused) return { kind: 'refused', jobs: Number(refused[1]) };

  const priced = /^(\d+) jobs, median ([\d.]+) h$/.exec(summary);
  if (priced) return { kind: 'priced', jobs: Number(priced[1]), hours: Number(priced[2]) };

  return { kind: 'unknown', summary };
}

// ── what the estate actually holds, next to what was asked for ─────────────

/**
 * The fields a `PastJob` carries back, so a companion tally is possible.
 *
 * `toolingRequired` and `interfacesTouched` are in `ComparableKey` and NOT on
 * `PastJob`, so this cannot say what tooling values sit beside a change class.
 * Stated rather than silently skipped: a diagnostic that quietly omits a field
 * is one somebody will later read as evidence the field is irrelevant.
 */
const TALLYABLE = ['changeClass', 'elementKind', 'asil', 'safetyCaseImpact'] as const;
type Tallyable = (typeof TALLYABLE)[number];

const show = (v: unknown): string => (v === null || v === undefined ? '(not recorded)' : String(v));

/** `{ modify_hardware: 14, new_function: 3 }`, commonest first. */
function tally(jobs: PastJob[], field: Tallyable): string {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    const v = show(j[field]);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([v, n]) => `${v} ${n}`)
    .join(', ');
}

/**
 * THE DISCRIMINATING OUTPUT, and the reason a co-occurrence count is not enough.
 *
 * Knowing `validation_only` matches 19 alone, `mechanical` matches 17 alone and
 * the pair matches 0 tells you they never overlap. It does NOT tell you which
 * of the two was the wrong call — and that is the entire fork.
 *
 * The marginals do. If the estate's validation-only work is all on `ecu` and
 * `software_domain`, then `mechanical` is the agent's error and the history
 * could have answered. If its mechanical work is all `modify_hardware`, then
 * the company has genuinely never booked a validation-only mechanical job and
 * the refusal is a true statement about the world, badly worded.
 */
async function marginals(h: any, key: ComparableKey): Promise<string[]> {
  const out: string[] = [];
  for (const field of TALLYABLE) {
    const value = key[field];
    if (value === undefined) continue;
    const alone = await fetchComparableJobs(h, { [field]: value } as ComparableKey);
    if (!alone.length) {
      out.push(`    ${field} = ${show(value)} → no job in the estate carries this at all`);
      continue;
    }
    const others = TALLYABLE.filter((f) => f !== field && key[f] !== undefined);
    const companion = others.length ? others : TALLYABLE.filter((f) => f !== field);
    for (const c of companion) {
      out.push(
        `    of the ${alone.length} job(s) with ${field} = ${show(value)}, ${c} is: ${tally(alone, c)}`,
      );
    }
  }
  return out;
}

// ── the report ─────────────────────────────────────────────────────────────

interface Row {
  ref: string;
  calls: Call[];
}

function describeKey(key: ComparableKey): string {
  const parts = (Object.keys(key) as (keyof ComparableKey)[])
    .filter((k) => key[k] !== undefined)
    .map((k) => `${k}=${show(key[k])}`);
  return parts.length ? parts.join('  ') : '(no filter at all)';
}

async function main(): Promise<void> {
  const prefix = programme();
  const rows = await listAssessments(ROW_CAP);

  // Newest answered row per reference, WITH its trace. See the header on why
  // this is not `sortRows`. Rows arrive newest first, so the first win.
  const seen = new Set<string>();
  const latest: Row[] = [];
  for (const r of rows) {
    if (!r.ref || !r.ref.startsWith(prefix) || r.answer === null) continue;
    if (seen.has(r.ref)) continue;
    seen.add(r.ref);
    latest.push({ ref: r.ref, calls: callsIn(r.trace) });
  }
  latest.sort((a, b) => a.ref.localeCompare(b.ref));

  if (!latest.length) {
    throw new Error(`No filed assessments for "${prefix}". Run pnpm steering:assess-all --run first.`);
  }

  const h = openDerived();
  const total = await countPastJobs(h);

  line();
  rule();
  line(`  ${prefix} — why the prices are missing`);
  line(`  ${latest.length} assessed · ${total} past jobs in the estate with attributable hours`);
  rule();
  line();

  /** Four buckets. Each is a DIFFERENT problem, and three of them are not the estate's. */
  const neverAsked: string[] = [];
  const missed: string[] = [];
  const refused: string[] = [];
  const priced: string[] = [];
  /** Called the tool, but the trace did not keep what it was asked. */
  const notRecorded: string[] = [];

  for (const row of latest) {
    if (!row.calls.length) {
      neverAsked.push(row.ref);
      continue;
    }

    const last = row.calls[row.calls.length - 1];
    if (last.outcome.kind === 'priced') priced.push(row.ref);
    else if (last.outcome.kind === 'miss') missed.push(row.ref);
    else if (last.outcome.kind === 'unknown') notRecorded.push(row.ref);
    else refused.push(row.ref);

    const blind = row.calls.some((c) => c.key === undefined);
    line(`  ${row.ref}   ${row.calls.length} call(s)${blind ? '   — arguments not recorded (web desk)' : ''}`);
    for (const [i, call] of row.calls.entries()) {
      const o = call.outcome;
      const said =
        o.kind === 'priced' ? `${o.jobs} job(s), median ${o.hours} h`
        : o.kind === 'miss' ? `MISS — ${o.reason.slice(0, 80)}`
        : o.kind === 'unknown' ? `unrecognised summary: ${o.summary.slice(0, 60)}`
        : `${o.jobs} job(s) — below the floor of ${MIN_COMPARABLES}`;
      line(`    ${i + 1}. ${call.key ? describeKey(call.key) : '(arguments not recorded)'}`);
      line(`       -> ${said}`);
    }
    // Only when the matter ended in a refusal AND the trace kept what was asked.
    // A marginal tally without the key would be a number about a query nobody made.
    if (last.outcome.kind === 'refused' && last.key) {
      for (const l of await marginals(h, last.key)) line(l);
    }
    line();
  }

  rule();
  line('  WHERE THE MISSING PRICES ACTUALLY COME FROM');
  rule();
  line();
  line(`  ${priced.length.toString().padStart(3)}  priced`);
  line(`  ${refused.length.toString().padStart(3)}  asked, understood, too few comparable jobs — a fact about the ESTATE`);
  line(`  ${missed.length.toString().padStart(3)}  asked with a value no document uses — a VOCABULARY mismatch`);
  line(`  ${neverAsked.length.toString().padStart(3)}  never called the pricing tool at all — a PROMPT problem, not a data one`);
  line(`  ${notRecorded.length.toString().padStart(3)}  called it, arguments not kept by the trace — UNKNOWN, see below`);
  line();
  if (neverAsked.length) line(`  never asked: ${neverAsked.join(', ')}`);
  if (missed.length) line(`  vocabulary:  ${missed.join(', ')}`);
  if (notRecorded.length) {
    line(`  not recorded: ${notRecorded.join(', ')}`);
    line();
    line('  Those were assessed on the web desk, which files the STREAMED EVENTS as its');
    line('  trace where the CLI files the turn records. The events carry a tool name and');
    line('  a one-line summary and no arguments, so what was asked of the pricing tool on');
    line('  those runs cannot be recovered. Re-run them from the CLI to include them.');
  }
  line();

  /**
   * The one number §0 asks for, and the reason the buckets above are separate:
   * only the middle bucket is evidence about the COMPANY. The other two are
   * evidence about us.
   */
  rule();
  line('  Read the marginals above per requirement. For each refusal they say');
  line('  what the estate carries BESIDE the value the agent chose — which is');
  line('  what tells an over-narrow filter apart from work never done here.');
  line();
  line('  Nothing was changed and nothing was spent.');
  rule();
  line();

  await h.close();
}

/** Guarded, like every entry point here — importing one must not run it. */
if (require.main === module) {
  main()
    .catch((e: unknown) => {
      console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeHistory();
    });
}
