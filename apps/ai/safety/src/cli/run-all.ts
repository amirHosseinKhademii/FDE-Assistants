/**
 * `pnpm safety:run-all` — stage 6.6. All eight questions, paced.
 *
 * ── THIS IS NOT A SCORECARD ───────────────────────────────────────────────
 *
 * It does not check answers. Stage 7 does that, with repeat runs and severity
 * buckets. This asks one narrower question:
 *
 *   CAN THE WHOLE KEY BE ASKED, END TO END, WITHOUT THE FREE TIER KILLING IT?
 *
 * Everything before this ran three questions at a time. Eight is the first time
 * the rate limit is plausibly in play, and `docs/FREE.md` §10 is why that
 * matters more than it sounds.
 *
 * ── THE FAILURE THIS EXISTS TO PREVENT ────────────────────────────────────
 *
 * An unpaced eval run on this stack once reported ZERO WRONG ANSWERS. It had
 * not answered correctly — three of its questions never ran at all, died of
 * 429s, and were counted as nothing rather than as failures.
 *
 * A quota failure and a wrong answer are different things and must never
 * average together. So this counts them separately and says so on every line:
 * a 429 is reported as INFRASTRUCTURE, never as an answer.
 *
 * ── AND IT REPORTS WHAT IT SPENT ──────────────────────────────────────────
 *
 * Model calls, tool calls, duplicates served from cache, and wall-clock per
 * question. On a free tier the budget is the constraint, and a run that does
 * not say what it cost cannot be planned around.
 */
import { ToolRegistry, chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { SAFETY_TOOLS } from '../agent/tools';
import { SAFETY_SYSTEM_PROMPT } from '../agent/prompt';
import { recordingTools, validatorFor, type CallRecord } from '../agent/answer';
import { SafetyAnswerSchema, type SafetyAnswer } from '../schema/safety-answer';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/**
 * The eight, as `docs/safety/WALKTHROUGH.md` words them.
 *
 * Copied rather than derived, because the key is the one artefact here that is
 * deliberately not generated from code — see ARCHITECTURE.md guardrail 6.
 */
const QUESTIONS: Array<{ id: string; question: string }> = [
  { id: 'REC-001', question: 'We run 2020 F-150s. Is the transmission park problem a known defect, and is the fix holding?' },
  { id: 'REC-002', question: 'What does recall 20V197000 cover?' },
  { id: 'REC-003', question: 'Did Ford volunteer the F-250 tailgate recall, or was it pushed?' },
  { id: 'REC-004', question: 'Are there any complaints involving a death on the 2019-2020 Tesla Model 3?' },
  { id: 'REC-005', question: 'Is there a recall for the forward-collision braking on the 2019-2020 Honda Odyssey?' },
  { id: 'REC-006', question: 'What is the remedy for recall 19V864000, and has it been carried out?' },
  { id: 'REC-007', question: 'How many complaints about the 2020 F-150 transmission were filed after the recall?' },
  { id: 'REC-008', question: 'Were there complaints about the 20V197000 defect before the recall was issued?' },
];

/**
 * Milliseconds between questions.
 *
 * Named `EVAL_PACE_MS` to match what the other engagements already use.
 */
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 4000);

/**
 * Milliseconds after every model TURN — and this is the one that matters.
 *
 * ── WHY PACING BETWEEN QUESTIONS WAS THE WRONG LEVER ──────────────────────
 *
 * The free tier's limit is FIFTEEN REQUESTS PER MINUTE, counted across
 * everything, and it is the quota that stopped this run:
 *
 *   "Quota exceeded for metric: generate_content_free_tier_requests,
 *    limit: 15, model: gemini-3.5-flash-lite"
 *
 * A question is not one request. REC-003 made EIGHT tool calls, so about nine
 * model round trips — more than half the minute's budget in a single question,
 * fired as fast as the model could think. Four seconds of silence afterwards
 * does nothing about a burst that already happened.
 *
 * MEASURED across this run: 30 tool calls plus 8 answers is ~38 model requests
 * in 228 seconds. The AVERAGE is comfortably under 15/min and the run still
 * died, because an average is not a rate limit — the limit is on any window.
 *
 * So the pacing goes where the requests are: 4,500ms after each turn holds
 * roughly 13 per minute against a limit of 15, whatever shape the questions
 * take.
 */
const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Did this failure come from the quota rather than from the answer?
 *
 * ── THIS FUNCTION SHIPPED BROKEN, AND THE BREAK WAS THE EXACT FAILURE THE
 *    FILE ABOVE EXISTS TO PREVENT ──────────────────────────────────────────
 *
 * The first version tested only the error's `message` against
 * /429|rate.?limit|RESOURCE_EXHAUSTED|quota/. Gemini's message is
 * "Too Many Requests" — none of those words — and the 429 lives on
 * `cause.statusCode`, not on the error itself.
 *
 * So a run in which REC-008 died of the quota reported:
 *
 *   quota 0 · error 1
 *   6.6: PASS — the whole key was asked without hitting the quota.
 *
 * Which is "zero wrong answers" wearing a different hat, in the very step
 * written to stop it. A detector for a failure mode is part of that failure
 * mode until something has been seen to trip it.
 *
 * Now checked THREE ways, because any one of them can be the only one present:
 * the numeric status wherever it is hiding, the provider's own wording, and the
 * HTTP reason phrase.
 */
function isRateLimit(e: unknown): boolean {
  const err = e as any;
  const status = err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode;
  if (status === 429) return true;

  // Everything the object can be made to say, including nested causes.
  const text = [err?.message, err?.cause?.message, err?.cause?.responseBody, String(e)]
    .filter(Boolean)
    .join(' ');
  return /\b429\b|too many requests|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(text);
}

interface Outcome {
  id: string;
  ms: number;
  /** 'answered' | 'declined' | 'rejected' | 'quota' | 'error' — never merged. */
  kind: 'answered' | 'declined' | 'rejected' | 'quota' | 'error';
  tools: string[];
  cached: number;
  turns: number;
  escalated: boolean;
  detail: string;
}

async function one(id: string, question: string): Promise<Outcome> {
  const started = Date.now();
  const { tools, calls } = recordingTools(SAFETY_TOOLS);
  const registry = new ToolRegistry(tools);
  const choice = loopChoice(process.env.LOOP);
  const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');

  try {
    const result = await runLoop<SafetyAnswer>(
      choice,
      chatClient(() => openaiClient()),
      model,
      registry,
      question,
      {
        system: SAFETY_SYSTEM_PROMPT,
        responseFormat: SafetyAnswerSchema,
        validate: validatorFor(calls),
        agentName: 'calder-safety',
        // PACED WHERE THE REQUESTS ARE. `onTurn` fires after each completed
        // model round trip, which is the thing being counted.
        onTurn: async () => {
          await sleep(TURN_PACE_MS);
        },
      },
    );

    const recorded: CallRecord[] = calls;
    const base = {
      id,
      ms: Date.now() - started,
      tools: recorded.map((c) => c.name),
      cached: recorded.filter((c) => c.cached).length,
      turns: result.turns.length,
    };

    if (!result.structured) {
      return {
        ...base,
        kind: 'rejected',
        escalated: false,
        detail: result.schemaErrors.at(-1) ?? 'no structured answer and no error recorded',
      };
    }
    const a = result.structured;
    return {
      ...base,
      // DECLINED IS NOT REJECTED. A null answer with an escalation is a valid
      // outcome the contract allows on purpose; a rejected one never satisfied
      // the contract at all. Folding them together would hide which of the two
      // is happening.
      kind: a.answer === null ? 'declined' : 'answered',
      escalated: !!a.escalate,
      detail: a.answer ? a.answer.slice(0, 88) : (a.escalate?.reason.slice(0, 88) ?? 'null answer'),
    };
  } catch (e) {
    return {
      id,
      ms: Date.now() - started,
      tools: calls.map((c) => c.name),
      cached: calls.filter((c) => c.cached).length,
      turns: 0,
      escalated: false,
      kind: isRateLimit(e) ? 'quota' : 'error',
      detail: String((e as any)?.message ?? e).slice(0, 120),
    };
  }
}

const MARK: Record<Outcome['kind'], string> = {
  answered: `${GREEN}answered${OFF}`,
  declined: `${YEL}declined${OFF}`,
  rejected: `${RED}rejected${OFF}`,
  quota: `${RED}QUOTA   ${OFF}`,
  error: `${RED}error   ${OFF}`,
};

/**
 * The real 429, recorded from the run that exposed the broken detector.
 *
 * KEPT AS A FIXTURE BECAUSE A DETECTOR IS UNTESTED UNTIL SOMETHING TRIPS IT,
 * and the only thing that ever tripped this one was an actual quota failure —
 * which is not a thing to rely on being available. The shape is what matters:
 * a generic message, with the status and the provider's words nested one level
 * down under `cause`.
 */
const RECORDED_429 = Object.assign(new Error('Too Many Requests'), {
  cause: {
    statusCode: 429,
    responseBody:
      '[{"error":{"code":429,"message":"You exceeded your current quota... Quota exceeded for ' +
      'metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 15",' +
      '"status":"RESOURCE_EXHAUSTED"}}]',
  },
});

async function main(): Promise<number> {
  // ASSERTED BEFORE ANYTHING IS SPENT. If the detector cannot see a real 429,
  // every outcome below is unreliable in one specific direction: a run with a
  // hole in it reports clean. That happened once, here, and printed PASS.
  if (!isRateLimit(RECORDED_429)) {
    console.log(
      `\n  ${RED}refusing to run${OFF}: the rate-limit detector does not recognise a recorded ` +
        'real 429.\n  Every result would be trustworthy except the one that matters.\n',
    );
    return 1;
  }
  if (isRateLimit(new Error('the model returned an invalid answer'))) {
    console.log(`\n  ${RED}refusing to run${OFF}: the detector calls an ordinary error a quota failure.\n`);
    return 1;
  }

  const choice = loopChoice(process.env.LOOP);
  console.log(`\nstage 6.6 · all eight questions, paced`);
  console.log(
    `  ${DIM}engine ${engineLabel(choice)} · ${TURN_PACE_MS}ms after every model turn, ` +
      `${PACE_MS}ms between questions`,
  );
  console.log(`  ${DIM}the free tier allows 15 requests per minute, and a question is not one request.${OFF}`);
  console.log(`  this asks whether the key can be ASKED, not whether it is answered well.`);
  console.log(`  scoring is stage 7.${OFF}\n`);

  const out: Outcome[] = [];
  const wall = Date.now();

  for (const [i, q] of QUESTIONS.entries()) {
    const r = await one(q.id, q.question);
    out.push(r);
    console.log(
      `  ${MARK[r.kind]}  ${r.id}  ${String((r.ms / 1000).toFixed(1)).padStart(5)}s  ` +
        `${String(r.tools.length).padStart(2)} tool call(s)` +
        `${r.cached ? ` (${r.cached} cached)` : ''}` +
        `${r.escalated ? `  ${YEL}escalated${OFF}` : ''}`,
    );
    console.log(`        ${DIM}${r.tools.join(' → ') || 'none'}${OFF}`);
    console.log(`        ${DIM}${r.detail}${OFF}`);
    if (i < QUESTIONS.length - 1) await sleep(PACE_MS);
  }

  const by = (k: Outcome['kind']) => out.filter((o) => o.kind === k).length;
  const quota = by('quota');
  const totalTools = out.reduce((a, o) => a + o.tools.length, 0);
  const cached = out.reduce((a, o) => a + o.cached, 0);

  console.log(`\n  ${'─'.repeat(64)}`);
  console.log(
    `  answered ${by('answered')} · declined ${by('declined')} · rejected ${by('rejected')} · ` +
      `quota ${quota} · error ${by('error')}   of ${out.length}`,
  );
  console.log(
    `  ${totalTools} tool calls (${cached} served from cache) · ` +
      `${((Date.now() - wall) / 1000).toFixed(0)}s wall clock including pacing`,
  );

  // THE ONLY THING THIS RUN ASSERTS. Everything else is reported for stage 7 to
  // turn into numbers; a quota failure is the one outcome that invalidates the
  // run rather than describing it.
  console.log(
    quota === 0
      ? `\n  6.6: ${GREEN}PASS${OFF} — the whole key was asked without hitting the quota.\n` +
          `  ${DIM}Nothing above is a score. Repeat runs and severity buckets are stage 7.${OFF}\n`
      : `\n  6.6: ${RED}FAIL${OFF} — ${quota} question(s) died of rate limits and were NOT answered.\n` +
          `  ${DIM}Raise EVAL_PACE_MS and re-run. Do not read the other outcomes as a result:\n` +
          `  a run with a hole in it is exactly how "zero wrong answers" got reported once.${OFF}\n`,
  );
  return quota === 0 ? 0 : 1;
}

main().then((f) => process.exit(f));
