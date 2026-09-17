/**
 * `pnpm safety:eval [--repeat N]` — stage 7.
 *
 * Runs every case N times, scores the decidable checks, and separates a wrong
 * answer from a broken run. Writes a baseline carrying the model and the
 * settings, so two runs can be compared — or refused.
 *
 * ── THE THREE BUCKETS NEVER MERGE ─────────────────────────────────────────
 *
 *   WRONG      it answered, and a check failed
 *   DECLINED   it said it could not answer — sometimes the right outcome
 *   BROKEN     quota, network, or an answer the contract rejected
 *
 * A BROKEN run is not evidence about the system's judgement, and averaging it
 * into a score is how "zero wrong answers" got reported here once. Stage 6.6's
 * own detector shipped blind to a real 429 and printed PASS over it, so this
 * one refuses to start until it has proved it can see one.
 *
 * ── FLAKY IS ITS OWN RESULT ───────────────────────────────────────────────
 *
 * A case that passes twice and fails once is NOT a failing case and NOT a
 * passing one. Reported as FLAKY, because the fix for "sometimes" is different
 * from the fix for "never" — and stage 6 produced exactly this on REC-001's
 * escalation, which is the finding this stage inherits.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ToolRegistry, chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { SAFETY_TOOLS } from '../agent/tools';
import { SAFETY_SYSTEM_PROMPT } from '../agent/prompt';
import { recordingTools, validatorFor } from '../agent/answer';
import { SafetyAnswerSchema, type SafetyAnswer } from '../schema/safety-answer';
import { REPO_ROOT } from '../config/paths';
import { CASES, type Run } from '../eval/cases';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/**
 * Runs per case. `--repeat N`, then `EVAL_REPEAT`, then 3.
 *
 * WRITTEN OUT RATHER THAN CHAINED, because the one-liner it replaces had an
 * operator-precedence bug: `??` binds tighter than `?:`, so setting
 * EVAL_REPEAT made the expression read the --repeat flag instead of the
 * variable. It would have silently run the wrong number of repeats and written
 * that wrong number into the baseline, where it is the field a later comparison
 * is refused on.
 */
function repeatCount(): number {
  const i = process.argv.indexOf('--repeat');
  const fromFlag = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  if (Number.isFinite(fromFlag) && fromFlag > 0) return fromFlag;
  const fromEnv = Number(process.env.EVAL_REPEAT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 3;
}

const REPEAT = repeatCount();
const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 4000);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Recorded from a real quota failure — see run-all.ts for why it is kept. */
const RECORDED_429 = Object.assign(new Error('Too Many Requests'), {
  cause: { statusCode: 429, responseBody: '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}' },
});

function isRateLimit(e: unknown): boolean {
  const err = e as any;
  const status = err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode;
  if (status === 429) return true;
  const text = [err?.message, err?.cause?.message, err?.cause?.responseBody, String(e)]
    .filter(Boolean)
    .join(' ');
  return /\b429\b|too many requests|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(text);
}

type Outcome = { run: Run | null; broken?: string; ms: number };

async function once(question: string): Promise<Outcome> {
  const started = Date.now();
  const { tools, calls } = recordingTools(SAFETY_TOOLS);
  try {
    const result = await runLoop<SafetyAnswer>(
      loopChoice(process.env.LOOP),
      chatClient(() => openaiClient()),
      chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? ''),
      new ToolRegistry(tools),
      question,
      {
        system: SAFETY_SYSTEM_PROMPT,
        responseFormat: SafetyAnswerSchema,
        validate: validatorFor(calls),
        agentName: 'calder-safety',
        onTurn: async () => { await sleep(TURN_PACE_MS); },
      },
    );
    if (!result.structured) {
      // A REJECTED ANSWER IS BROKEN, NOT WRONG. The contract never accepted it,
      // so there is no judgement to score — only a system that could not
      // produce a valid answer, which is a different problem with a different fix.
      return { run: null, broken: `rejected: ${result.schemaErrors.at(-1) ?? 'unknown'}`, ms: Date.now() - started };
    }
    return { run: { answer: result.structured, calls }, ms: Date.now() - started };
  } catch (e) {
    return {
      run: null,
      broken: isRateLimit(e) ? 'QUOTA' : `error: ${String((e as any)?.message ?? e).slice(0, 80)}`,
      ms: Date.now() - started,
    };
  }
}

async function main(): Promise<number> {
  if (!isRateLimit(RECORDED_429) || isRateLimit(new Error('an ordinary failure'))) {
    console.log(`\n  ${RED}refusing to run${OFF}: the quota detector is not working in both directions.\n`);
    return 1;
  }

  const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
  console.log(`\nstage 7 · evals\n`);
  console.log(`  ${DIM}${CASES.length} cases × ${REPEAT} runs · ${engineLabel(loopChoice(process.env.LOOP))} · ${model}`);
  console.log(`  ${TURN_PACE_MS}ms per turn, ${PACE_MS}ms between runs`);
  console.log(`  three repeats is a FLOOR, not a standard — the reason is a free tier, not a method.${OFF}\n`);

  const results: any[] = [];
  let broken = 0;

  for (const c of CASES) {
    const perRun: Array<{ passed: string[]; failed: string[]; broken?: string; ms: number }> = [];

    for (let i = 0; i < REPEAT; i++) {
      const o = await once(c.question);
      if (!o.run) {
        broken++;
        perRun.push({ passed: [], failed: [], broken: o.broken, ms: o.ms });
      } else {
        const passed = c.checks.filter((ck) => ck.holds(o.run!)).map((ck) => ck.name);
        const failed = c.checks.filter((ck) => !ck.holds(o.run!)).map((ck) => ck.name);
        perRun.push({ passed, failed, ms: o.ms });
      }
      await sleep(PACE_MS);
    }

    // PER CHECK, not per run: a case is only as good as its weakest check, and
    // "which check" is the actionable part.
    const usable = perRun.filter((r) => !r.broken);
    const rate = (name: string) => usable.filter((r) => r.passed.includes(name)).length;

    const lines = c.checks.map((ck) => {
      const n = rate(ck.name);
      const all = usable.length;
      const mark = all === 0 ? `${DIM}—   ${OFF}` : n === all ? `${GREEN}ok  ${OFF}` : n === 0 ? `${RED}FAIL${OFF}` : `${YEL}FLAKY${OFF}`;
      return { mark, name: ck.name, n, all, why: ck.why };
    });

    const worst = lines.some((l) => l.all > 0 && l.n === 0)
      ? `${RED}FAIL ${OFF}`
      : lines.some((l) => l.all > 0 && l.n < l.all)
        ? `${YEL}FLAKY${OFF}`
        : usable.length === 0
          ? `${RED}BROKEN${OFF}`
          : `${GREEN}pass ${OFF}`;

    console.log(`  ${worst}  ${c.id}   ${DIM}${usable.length}/${REPEAT} runs usable · ${(perRun.reduce((a, r) => a + r.ms, 0) / perRun.length / 1000).toFixed(0)}s avg${OFF}`);
    for (const l of lines) console.log(`        ${l.mark} ${l.name}  ${DIM}${l.n}/${l.all}${OFF}`);
    for (const r of perRun.filter((r) => r.broken)) console.log(`        ${RED}broken${OFF} ${r.broken}`);
    for (const u of c.unscored) console.log(`        ${DIM}unscored · ${u}${OFF}`);
    console.log();

    results.push({ id: c.id, runs: perRun, checks: lines.map(({ mark, ...rest }) => rest) });
  }

  const totalChecks = results.flatMap((r) => r.checks);
  const clean = totalChecks.filter((c: any) => c.all > 0 && c.n === c.all).length;
  const flaky = totalChecks.filter((c: any) => c.all > 0 && c.n > 0 && c.n < c.all).length;
  const failed = totalChecks.filter((c: any) => c.all > 0 && c.n === 0).length;

  console.log(`  ${'─'.repeat(66)}`);
  console.log(`  ${clean} checks always pass · ${flaky} flaky · ${failed} always fail   of ${totalChecks.length}`);
  console.log(`  ${broken} run(s) broken and excluded from every rate above`);
  console.log(
    `  ${DIM}${CASES.length} cases, ${REPEAT} runs each, on ${model}. A rate without its denominator is not a result.${OFF}`,
  );

  const dir = resolve(REPO_ROOT, 'docs/safety/evals');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `baseline-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        // RECORDED SO A COMPARISON CAN BE REFUSED. Two runs on different models
        // or repeat counts measure the setup change, not the code change —
        // insurance's eval:diff already enforces exactly this.
        model,
        engine: engineLabel(loopChoice(process.env.LOOP)),
        repeat: REPEAT,
        turnPaceMs: TURN_PACE_MS,
        recordedAt: new Date().toISOString(),
        summary: { clean, flaky, failed, broken, totalChecks: totalChecks.length },
        cases: results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  ${DIM}baseline written to ${file.replace(REPO_ROOT, '.')}${OFF}\n`);

  return failed > 0 ? 1 : 0;
}

main().then((c) => process.exit(c));
