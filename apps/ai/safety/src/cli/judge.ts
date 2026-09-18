/**
 * `pnpm safety:judge` — the three editorial checks, judged and reported apart.
 *
 * Costs roughly 3 model calls per rubric — one for the real answer and TWO for
 * the control — plus one answer per case. On a 500/day free tier that is small,
 * and the control is what makes the rest worth anything.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chatModelName } from '@fde/agent';
import { REPO_ROOT } from '../config/paths';
import { askSafety } from '../agent/run';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolveEngine } from '../agent/engines';
import { RUBRICS, judge } from '../eval/judge';
import { CASES } from '../eval/cases';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);

/**
 * Between judge calls.
 *
 * THE JUDGE HAD NO PACING AND CRASHED ON A PER-MINUTE 429. It makes three rapid
 * calls per rubric — the failing exemplar, the passing one, the real answer —
 * on top of the answer it just generated, and fired them back to back against a
 * limit of fifteen a minute. Every other runner in this engagement paces; this
 * one was written last and inherited nothing.
 */
const JUDGE_PACE_MS = Number(process.env.JUDGE_PACE_MS ?? 4500);

/**
 * Runs per rubric.
 *
 * ONE RUN WAS ALL THIS EVER DID, while `safety:eval` beside it repeated three
 * times and said on every printing that a single run is a smoke test. The
 * judged 0-of-3 that this produced was therefore a number of exactly the kind
 * the rest of the stage refuses to quote.
 */
function repeatCount(): number {
  const i = process.argv.indexOf('--repeat');
  const fromFlag = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  if (Number.isFinite(fromFlag) && fromFlag > 0) return fromFlag;
  const fromEnv = Number(process.env.JUDGE_REPEAT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 3;
}
const REPEAT = repeatCount();

/**
 * How long the provider asked us to wait, in ms, or null.
 *
 * Gemini returns `RetryInfo.retryDelay` on every 429 — "28s", "42s" — and a
 * PER-MINUTE limit is transient by definition. Reporting BROKEN and moving on
 * throws away information the provider volunteered, and loses a verdict that
 * waiting forty seconds would have produced.
 *
 * A PER-DAY limit is the opposite and must not be retried: it resets on
 * Google's clock, and sleeping through it is worse than stopping.
 */
function retryAfterMs(e: unknown): number | null {
  const body = String((e as any)?.cause?.responseBody ?? (e as any)?.message ?? '');
  if (/PerDay/i.test(body)) return null;
  const m = /"retryDelay"\s*:\s*"(\d+)s"/.exec(body) ?? /retry in ([\d.]+)s/i.exec(body);
  return m ? Math.ceil(Number(m[1]) * 1000) + 2000 : null;
}

/**
 * Run something, and wait out ONE transient rate limit rather than giving up.
 *
 * Once, not repeatedly: a second 429 after honouring the provider's own delay
 * means the budget is genuinely gone, and a runner that keeps sleeping turns a
 * quota failure into a hang.
 */
async function waitingOutOneLimit<T>(what: () => Promise<T>): Promise<T> {
  try {
    return await what();
  } catch (e) {
    const wait = retryAfterMs(e);
    if (wait === null) throw e;
    console.log(`  ${DIM}rate limited — waiting ${Math.round(wait / 1000)}s, as the provider asked${OFF}`);
    await sleep(wait);
    return what();
  }
}

function isRateLimit(e: unknown): boolean {
  const err = e as any;
  const status = err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode;
  if (status === 429) return true;
  const text = [err?.message, err?.cause?.message, err?.cause?.responseBody, String(e)]
    .filter(Boolean)
    .join(' ');
  return /\b429\b|too many requests|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(text);
}

async function main(): Promise<number> {
  const resolved = resolveEngine(process.env.LOOP);
  if ('error' in resolved) {
    console.log(`\n  ${RED}${resolved.error}${OFF}\n`);
    return 1;
  }

  console.log('\neditorial checks · judged, and reported apart from the decided ones');
  console.log(`  ${DIM}three properties no regex can decide. Each rubric is controlled first:`);
  console.log(`  the judge must reject a known-bad answer and accept a known-good one`);
  console.log(`  before its opinion on the real answer counts at all.${OFF}\n`);

  const results: Array<{ caseId: string; verdicts: Array<boolean | null>; prose: string[] }> = [];
  let discarded = 0;

  for (const r of RUBRICS) {
    const c = CASES.find((x) => x.id === r.caseId)!;
    const verdicts: Array<boolean | null> = [];
    const prose: string[] = [];

    for (let i = 0; i < REPEAT; i++) {
      let run;
      try {
        run = await waitingOutOneLimit(() =>
          askSafety(c.question, { engine: resolved.engine, turnPaceMs: TURN_PACE_MS }),
        );
      } catch (e) {
        verdicts.push(null);
        discarded++;
        console.log(`  ${RED}BROKEN${OFF} ${r.caseId}  ${isRateLimit(e) ? 'QUOTA' : String((e as any)?.message).slice(0, 60)}`);
        await sleep(JUDGE_PACE_MS);
        continue;
      }

      const text = run.answer?.answer;
      if (!text) {
        verdicts.push(null);
        discarded++;
        console.log(`  ${YEL}n/a${OFF}    ${r.caseId}  no prose answer to judge`);
        await sleep(JUDGE_PACE_MS);
        continue;
      }

      prose.push(text);
      await sleep(JUDGE_PACE_MS);
      try {
        const v = await waitingOutOneLimit(() => judge(r, text));
        verdicts.push(v.passes);
        if (v.passes === null) discarded++;
      } catch (e) {
        verdicts.push(null);
        discarded++;
        console.log(`  ${RED}BROKEN${OFF} ${r.caseId}  ${isRateLimit(e) ? 'QUOTA during judging' : 'error'}`);
      }
      await sleep(JUDGE_PACE_MS);
    }

    const usable = verdicts.filter((v) => v !== null) as boolean[];
    const yes = usable.filter(Boolean).length;
    const mark =
      usable.length === 0
        ? `${RED}VOID ${OFF}`
        : yes === usable.length
          ? `${GREEN}yes  ${OFF}`
          : yes === 0
            ? `${RED}no   ${OFF}`
            : `${YEL}FLAKY${OFF}`;

    console.log(`  ${mark} ${r.caseId}  ${yes}/${usable.length}  ${DIM}${r.summary}${OFF}`);
    if (prose[0]) console.log(`        ${DIM}${prose[0].slice(0, 130)}…${OFF}`);
    console.log();

    results.push({ caseId: r.caseId, verdicts, prose: prose.map((t) => t.slice(0, 400)) });
  }

  const all = results.flatMap((r) => r.verdicts).filter((v) => v !== null) as boolean[];
  const passed = all.filter(Boolean).length;
  console.log(`  ${'─'.repeat(64)}`);
  console.log(
    `  ${passed} of ${all.length} judgements satisfied${discarded ? `, ${discarded} discarded` : ''}` +
      `   ${DIM}${RUBRICS.length} properties × ${REPEAT} runs${OFF}`,
  );
  console.log(
    `  ${DIM}JUDGED, not decided. One run each, and the judge is the same model being judged —\n` +
      `  which is a known weakness and the reason every rubric carries a control. These\n` +
      `  numbers must not be added to the 26-of-28 from safety:eval.${OFF}\n`,
  );
  // WRITTEN, SO A LATER RUN CAN BE COMPARED. safety:eval has kept a baseline
  // since its first run and this had none, so its 0-of-3 could not be set
  // against anything — including the improvement it exists to detect.
  const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
  const dir = resolve(REPO_ROOT, 'docs/safety/evals');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const file = resolve(dir, `judged-${stamp}.json`);
  writeFileSync(
    file,
    `${JSON.stringify(
      { model, repeat: REPEAT, judgePaceMs: JUDGE_PACE_MS, recordedAt: new Date().toISOString(),
        summary: { passed, judged: all.length, discarded }, cases: results },
      null,
      2,
    )}\n`,
  );
  console.log(`  ${DIM}baseline written to ${file.replace(REPO_ROOT, '.')}${OFF}\n`);

  return 0;
}

main().then((c) => process.exit(c));
