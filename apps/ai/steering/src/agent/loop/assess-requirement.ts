/**
 * One customer requirement in, one assessed dossier out.
 *
 * ── THE MODEL NEVER TOUCHES THE DATABASE OR THE INDEX ────────────────────
 *
 * It receives the RESULT of a search and the RESULT of a comparables query.
 * Both tools run here, in our process, over connections it cannot see. That is
 * the whole reason pillar 2 is called the tool loop rather than "give it SQL".
 *
 * ── WHY `sdk` AND NOT `langgraph`, TODAY ─────────────────────────────────
 *
 * `loopChoice` offers three engines and this file special-cases none of them —
 * `LOOP=mastra` and `LOOP=langgraph` already work. But the default is `sdk`
 * deliberately: this is one requirement and one assessment, which is the shape
 * pharma calls "one lot, one decision", and its own note says a third engine
 * there is a redundant way to do a solved job.
 *
 * LangGraph's stated fit — checkpointed per-item state where a human may act on
 * row 6 while row 19 is still running — is the TWENTY-FOUR requirement fan-out,
 * which does not exist yet. Choosing an engine for it now is choosing for a
 * program nobody has written.
 *
 * ── SMALL FUNCTIONS, AND THE REASON IS THE DEFAULT ARGUMENT ──────────────
 *
 * Everything below takes its dependencies and has one job. The connections are
 * opened once by `assessmentContext()` and reused, because a loop that opened
 * its own per call would reopen them on every turn against one Neon compute.
 */
import type OpenAI from 'openai';
import { env, openaiClient } from '@fde/foundry';
import {
  ToolRegistry, runLoop, loopChoice, engineLabel, cachedInputTokensOf,
  type LoopChoice, type TurnRecord, type LoopEvent,
} from '@fde/agent';
import { openStore } from '@fde/grounding';
import { logRequest } from '@fde/telemetry';
import '../../telemetry/prices';
import { derivedUrl } from '../../config/connections';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../../grounding/chunks';
import { openDerived, type DerivedHandle } from '../../tools/utils/handle';
import { searchDocuments } from '../../tools/departments/documents';
import { findComparableWorkTool } from '../tool/find-comparable-work.tool';
import { searchDocumentsTool, type SearchBudget } from '../tool/search-documents.tool';
import { SYSTEM_PROMPT, userPrompt } from '../prompt/assess-requirement';
import {
  RequirementAssessmentSchema, validateAssessment, type RequirementAssessment,
} from '../../schema/assessment-schema';
import { resolveCitations, type Resolution } from './resolve-citations';

// ── the shared context ─────────────────────────────────────────────────────

export interface AssessmentContext {
  client: OpenAI;
  handle: DerivedHandle;
  store: Awaited<ReturnType<typeof openStore>>;
  registry: ToolRegistry;
}

let shared: Promise<AssessmentContext> | undefined;

/**
 * Opened once per process. A CLI asks one question and exits; a server asks
 * thousands and must not open a connection per question.
 */
export function assessmentContext(): Promise<AssessmentContext> {
  if (!shared) {
    shared = (async () => {
      /**
       * MORE RETRIES THAN THE SDK'S DEFAULT OF TWO, and only here.
       *
       * The first real assessment run died on `429 ... exceeded rate limit`
       * after six tool calls — a multi-turn loop re-sends its whole context
       * every turn, so it reaches a tokens-per-minute ceiling far faster than
       * the one-shot extraction ever did. Two retries is right for a single
       * call and thin for a loop that has already spent six.
       *
       * `withOptions` rather than editing `@fde/foundry`: the token provider,
       * the endpoint and the auth are shared and correct, and this is a
       * property of THIS workload's shape, not of the deployment. The SDK
       * honours `Retry-After` on 429 and backs off exponentially otherwise.
       */
      const client = openaiClient().withOptions({ maxRetries: 6 });
      const handle = openDerived();
      const store = await openStore(openEmbeddings(client), {
        // Named explicitly. The default resolves to a different engagement's
        // database, and a store opened against the wrong one fails silently by
        // finding nothing rather than by erroring.
        connectionString: derivedUrl(),
        tableName: CHUNK_TABLE,
      });
      return {
        client,
        handle,
        store,
        // ORDER IS THE ORDER THE PROMPT USES THEM IN — read first, price second.
        //
        // Built WITHOUT a bound programme. `assessRequirement` replaces it per
        // call when it knows one, because the scope is a property of the
        // question rather than of the process — and a free-typed requirement
        // that matches no specification has no programme to bind.
        registry: new ToolRegistry([searchDocumentsTool(store), findComparableWorkTool(handle)]),
      };
    })();
  }
  return shared;
}

/** Safe when no context was built. A server never calls this. */
export async function closeAssessmentContext(): Promise<void> {
  if (!shared) return;
  const ctx = await shared;
  shared = undefined;
  await ctx.handle.close();
  await ctx.store.end();
}

// ── one line per tool call, for `--trace` ──────────────────────────────────

/**
 * What a tool result looked like, in one line.
 *
 * REPORTS THE FINDING, NOT THE ROW COUNT. Pharma's release agent records the
 * same choice: "4 passages" tells you the plumbing worked, "refused: 2 of 203
 * comparable" tells you what happened. A trace that only proves calls were made
 * is a trace nobody reads twice.
 */
function summarise(r: any): string {
  if (r?.found === false) return `miss: ${r.reason ?? 'no match'}`;
  if (r?.cost) {
    return r.cost.median_hours === null
      ? `refused: ${r.cost.comparable_jobs} of ${r.available ?? '?'} comparable`
      : `${r.cost.comparable_jobs} jobs, median ${r.cost.median_hours} h`;
  }
  if (Array.isArray(r?.passages)) {
    const files = [...new Set(r.passages.map((p: any) => p.sourcePath))];
    return `${r.passages.length} passage(s) from ${files.length} file(s): ${files.slice(0, 2).join(', ')}`;
  }
  return 'ok';
}

// ── the call ───────────────────────────────────────────────────────────────

export interface AssessOptions {
  requirementRef: string;
  /** The requirement text. Passed in, never looked up here — see `assess.ts`. */
  text: string;
  /**
   * The programme this requirement belongs to, when it has one.
   *
   * Narrows every search. Absent for a free-typed requirement that matches no
   * specification we hold — in which case the search is corpus-wide, and the
   * answer should be read knowing that.
   */
  programme?: string | null;
  loop?: string;
  /**
   * Live trace. `onEvent`, NOT `onTurn`, and the difference matters for a loop
   * that searches: `onTurn` fires only once a whole turn has completed, so a
   * two-second retrieval is two seconds of nothing on screen. `tool_call` fires
   * when dispatch begins, and `tool_result` carries the one-line summary.
   */
  onEvent?: (e: LoopEvent) => void;
  onTurn?: (t: TurnRecord) => void;
  surface?: string;
}

export interface AssessResult {
  assessment?: RequirementAssessment;
  /** What happened when each quote was located in its file. Absent if no answer. */
  citations?: Resolution;
  /** Kept even when a retry later succeeded — the failure rate is a number you need. */
  schemaErrors: string[];
  stoppedBecause: string;
  engine: string;
  ms: number;
  turns: TurnRecord[];
}

/**
 * The opening search, run before the loop so the model does not spend a turn on
 * it. Four passages, not ten: this is an anchor, not the evidence.
 *
 * COSTS ONE EMBEDDING CALL and saves at least one chat turn, which is the
 * better trade by an order of magnitude — an embedding is a thousandth of the
 * price of a turn that re-sends the whole context.
 */
const SEED_PASSAGES = 4;
const SEED_NOTES = 3;

/**
 * The second seeded search: what the programme already knows is unresolved.
 *
 * ── WHY A SEPARATE SEARCH AND NOT A BIGGER `k` ──────────────────────────
 *
 * Review notes do not talk like requirements. A requirement says "shall deliver
 * at least 8000 N"; the note about it says "these are not the same number and
 * the document does not say which governs". A similarity search on the
 * requirement's own text may or may not reach that, and raising `k` on the
 * first search just returns more things that DO talk like requirements.
 *
 * ── A TEST FAILURE PROMPTED THIS, WHICH IS WORTH ADMITTING ──────────────
 *
 * One eval run in five recorded no conflict at all on a requirement whose
 * review note states one plainly. That run made four tool calls where the
 * passing ones made five to eight — it simply never retrieved the notes.
 *
 * Fixing a behaviour because a test caught it is how you end up fitting the
 * test. The reason this is defensible anyway: **it is how a person works.** You
 * read the specification and you read the review notes, every time, because
 * review notes are where a programme writes down what it already knows is
 * ambiguous. That argument is the same one that justified seeding the first
 * search, and it was made before any test existed.
 *
 * What would make it test-fitting: if the question below named rack force, or
 * the requirement, or anything specific to the case that failed. It does not —
 * it asks the programme what is unresolved, which is worth asking about every
 * requirement in it.
 */
async function seedNotes(ctx: AssessmentContext, programme?: string | null) {
  if (!programme) return [];
  const { passages } = await searchDocuments(
    ctx.store,
    'open points, ambiguities and disagreements recorded at review',
    SEED_NOTES,
    { programme, docType: 'review_notes' },
  );
  // `body`, never `text`. The heading trail is handed over separately as a
  // label so the model knows where the passage sits WITHOUT it becoming part of
  // something it might quote.
  return passages.map((p) => ({
    sourcePath: p.sourcePath, startLine: p.startLine, text: p.body, section: p.section,
  }));
}


async function seedContext(ctx: AssessmentContext, text: string, programme?: string | null) {
  const { passages } = await searchDocuments(ctx.store, text, SEED_PASSAGES, {
    programme: programme ?? undefined,
  });
  return passages.map((p) => ({
    sourcePath: p.sourcePath, startLine: p.startLine, text: p.body, section: p.section,
  }));
}

export async function assessRequirement(opts: AssessOptions): Promise<AssessResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const ctx = await assessmentContext();
  const [seed, notes] = await Promise.all([
    seedContext(ctx, opts.text, opts.programme),
    seedNotes(ctx, opts.programme),
  ]);

  /**
   * A registry PER CALL, always — not only when a programme is known.
   *
   * The search budget has to be per assessment, and a registry shared across
   * the process would carry one run's spend into the next. The store and the
   * handle are still shared; only the binding and the counter are new, and both
   * are properties of THIS question.
   */
  const budget: SearchBudget = { spent: 0 };
  const registry = new ToolRegistry([
    searchDocumentsTool(ctx.store, opts.programme, budget),
    findComparableWorkTool(ctx.handle),
  ]);

  const result = await runLoop<RequirementAssessment>(
    choice,
    ctx.client,
    env.chatDeployment(),
    registry,
    userPrompt(opts.requirementRef, opts.text, seed, opts.programme, notes),
    {
      system: SYSTEM_PROMPT,
      responseFormat: RequirementAssessmentSchema,
      validate: validateAssessment,
      agentName: 'assess-requirement',
      summariseResult: summarise,
      /**
       * ── EIGHT, NOT THE DEFAULT TWELVE ─────────────────────────────────
       *
       * Two runs died on `429 exceeded rate limit`, the second after EIGHT
       * searches for one requirement — and search three had already returned
       * zero passages. It was not making progress; it was re-phrasing the same
       * question at a corpus that does not contain a rack-force test report.
       *
       * A loop re-sends everything it has gathered on every turn, so turn nine
       * carries eight searches' worth of passages and reads the newest through
       * the noise of the oldest. The rate limit is tokens-per-minute, and a
       * loop that will not stop reaches it on volume it created itself.
       *
       * The cap is a backstop, not the fix — the fix is the instruction in the
       * prompt that an empty result is an ANSWER. But a backstop that ends a
       * run with a partial answer beats one that ends it with an exception.
       */
      /**
       * ── TEN, AFTER EIGHT PROVED TOO TIGHT ─────────────────────────────
       *
       * Twelve was the default and two runs died on a rate limit. Eight stopped
       * the flailing and then stopped the ANSWER: a run made six searches,
       * reached `find_comparable_work`, and hit the cap before it could write
       * anything down. Six tool calls of real spend, no output.
       *
       * A cap has to leave room for the conclusion. Roughly: four searches as
       * the prompt asks, one comparables call, a little slack, and a turn to
       * answer in. Ten.
       *
       * The cap is still a backstop rather than the fix — the fix is the
       * instruction that an empty result is an ANSWER, which is what stops the
       * search count climbing in the first place.
       */
      /**
       * ── TWELVE, WITH THE FIRST SEARCH ALREADY DONE ────────────────────
       *
       * The history of this number is the history of the wrong fix. Twelve
       * (the default) hit a rate limit. Eight stopped the flailing and stopped
       * the ANSWER. Ten was reached after ten tool calls — seven searches and
       * three pricing attempts — with nothing written down.
       *
       * Raising it a fourth time would have been paying more to flail longer.
       * What changed instead is that the opening search is now done for it and
       * handed over, so the budget starts with the obvious turn already spent.
       * Twelve, with a cheaper opening, is a different setting from twelve
       * without one.
       */
      maxTurns: 12,
      onEvent: opts.onEvent,
      onTurn: opts.onTurn,
    },
  );

  logAssessment(opts, result, choice, Date.now() - started);

  // AFTER validation, never before. The schema decides whether the shape is
  // acceptable; this only corrects a number inside an answer already accepted.
  // Running it first would mean repairing an answer on its way to being
  // rejected, which is work spent to make a failure look tidier.
  const citations = result.structured ? resolveCitations(result.structured) : undefined;

  return {
    assessment: result.structured,
    citations,
    schemaErrors: result.schemaErrors,
    stoppedBecause: result.stoppedBecause,
    engine: engineLabel(choice),
    ms: Date.now() - started,
    turns: result.turns,
  };
}

/**
 * The cost line, written whether the answer validated or not.
 *
 * A RUN THAT FAILED ITS SCHEMA STILL COST MONEY. Logging only successes makes
 * the bill look smaller than it is and hides the runs worth investigating,
 * which are exactly the ones that failed.
 */
function logAssessment(
  opts: AssessOptions,
  result: { turns: TurnRecord[]; stoppedBecause: string; schemaErrors: string[] },
  choice: LoopChoice,
  ms: number,
): void {
  const sum = (pick: (t: TurnRecord) => number | undefined): number =>
    result.turns.reduce((a, t) => a + (pick(t) ?? 0), 0);

  logRequest({
    subject: opts.requirementRef,
    question: `assess ${opts.requirementRef}`,
    model: env.chatDeployment(),
    engine: engineLabel(choice),
    turns: result.turns.length,
    toolCalls: result.turns.reduce((a, t) => a + (t.toolCalls?.length ?? 0), 0),
    inputTokens: sum((t) => t.inputTokens),
    // Passed through, never defaulted: 0 claims a measurement and absence
    // admits there was not one. Pharma's loop reports ~87% cached because each
    // turn re-sends the prompt and the schemas; this should too, and that is
    // the first steering number where the cache actually has something to bite.
    cachedInputTokens: cachedInputTokensOf(result.turns),
    outputTokens: sum((t) => t.outputTokens),
    ms,
    stoppedBecause: result.stoppedBecause,
    schemaRetries: result.schemaErrors.length,
    surface: opts.surface ?? 'steering:assess',
  });
}
