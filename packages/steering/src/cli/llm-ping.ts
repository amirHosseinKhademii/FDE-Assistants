/**
 * `pnpm steering:ping` — one model call through OUR stack, not the AWS CLI.
 *
 * WHY A SEPARATE COMMAND RATHER THAN WIRING A REAL CALL SITE. `extract/run.ts`
 * is the obvious first caller, and pointing it at a provider that has never
 * answered once would mean debugging the extraction pipeline and the transport
 * at the same time. This does the smallest thing that can fail: one turn, one
 * sentence, no tools, no schema, no corpus. If this works the transport is
 * sound and every later failure belongs to the caller.
 *
 * IT SPENDS REAL MONEY — a fraction of a cent on Haiku, and the banner says so
 * before it does. Every other `*:check` in this repo is free; this one is not,
 * and a command that quietly costs money is a command people run by accident.
 *
 *   pnpm steering:ping                                  # azure (the default)
 *   LLM_PROVIDER=bedrock AWS_PROFILE=bedrock pnpm steering:ping
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { completion, describeProvider, provider } from '../llm/provider';

// THE SHARED `.env`, LOADED THE WAY `config/connections.ts` LOADS IT — resolved
// from this file rather than `process.cwd()`, because cwd is the repo root
// under a root script and the package dir under a workspace filter. Skipping
// this is not a silent degradation: the first run of this command reported
// `FOUNDRY_CHAT_DEPLOYMENT is unset` on a machine where it was plainly set.
config({ path: resolve(__dirname, '..', '..', '..', '..', '.env'), quiet: true });

const PROMPT = 'Reply with exactly: OK';

async function main(): Promise<void> {
  console.log(`\n  provider : ${describeProvider()}`);
  console.log('  spends   : yes — one short call, a fraction of a cent\n');

  const startedAt = Date.now();
  const res = await completion({
    messages: [
      { role: 'system', content: 'You answer in as few words as possible.' },
      { role: 'user', content: PROMPT },
    ],
    // ── NOT 64, AND THE NUMBER IS THE WHOLE LESSON ─────────────────────
    //
    // The first version set 64 — plenty for the word "OK". It passed once and
    // then failed with `stopped: length`, `out 64`, `answer: ""`.
    //
    // `gpt-5-mini` is a REASONING model: output tokens are spent thinking
    // before any visible text is produced. A cap sized for the answer is a cap
    // that sometimes fits the reasoning and sometimes does not, so the same
    // command passes and fails on identical input. The repo already knows this
    // model is unusual — `extract/run.ts` documents it rejecting `temperature`
    // outright — and this is the same fact wearing a different symptom.
    //
    // 2000 is not a considered budget; it is "far more than a one-word answer
    // can need", which is the right shape of number for a liveness check. The
    // model is billed for what it generates, not for the ceiling.
    max_tokens: 2000,
  });
  const ms = Date.now() - startedAt;

  const text = res.choices[0]?.message?.content ?? '';
  const stop = res.choices[0]?.finish_reason ?? 'unknown';
  const u = res.usage;

  console.log(`  answer   : ${JSON.stringify(text)}`);
  console.log(`  stopped  : ${stop}`);
  console.log(`  tokens   : in ${u?.prompt_tokens ?? '?'}, out ${u?.completion_tokens ?? '?'}`);

  // Absent and zero are different facts; say which one this is rather than
  // printing 0 for both. Same rule as `logRequest`.
  console.log(
    `  cached   : ${
      u?.prompt_tokens_details === undefined
        ? 'not reported by this provider'
        : `${u.prompt_tokens_details.cached_tokens} token(s)`
    }`,
  );
  console.log(`  latency  : ${ms}ms\n`);

  // The point of the ping is the transport, so the only failure it asserts on
  // is an empty answer. A model that replies something other than "OK" has
  // still proved every link in the chain.
  //
  // AND WHEN IT IS EMPTY, SAY WHY. "answered with no text" was the first
  // message here, and it is true and useless: it reads as a broken provider
  // when the actual cause was a cap this file set on itself. A diagnostic that
  // names the wrong culprit is worse than none, because it is believed.
  if (!text.trim()) {
    console.log(
      stop === 'length'
        ? `  ping: FAIL — hit the max_tokens ceiling before writing any text.\n` +
            `         The transport WORKED (${u?.completion_tokens ?? '?'} tokens were generated);\n` +
            `         a reasoning model spent them all thinking. Raise max_tokens.\n`
        : `  ping: FAIL — ${provider()} returned no text, and not because of the token cap ` +
            `(stopped: ${stop})\n`,
    );
    process.exit(1);
  }
  console.log(`  ping: PASS — ${provider()} answered\n`);
}

/**
 * Pull whatever identifies this failure at the provider — and print it.
 *
 * WHY THIS IS NOT DECORATION. A 429 from Bedrock on a zero-quota account is an
 * AWS-side provisioning defect, and the only route to a fix is a support case.
 * The first thing support asks for is `x-amzn-requestid` from failed calls. The
 * first version of this file printed `e.message` and discarded the error
 * object, so every failure threw away the one piece of evidence that could
 * resolve it — a diagnostic that looks complete and is useless at the moment it
 * matters.
 *
 * The SDK surfaces these differently (a `request_id` field, a `requestId`, or
 * an `x-amzn-requestid` response header), so read all three and say which was
 * found rather than guessing at one shape.
 */
function requestIds(e: unknown): string[] {
  const out: string[] = [];
  const any = e as Record<string, any> | null;
  if (!any || typeof any !== 'object') return out;

  for (const k of ['request_id', 'requestId']) {
    if (typeof any[k] === 'string') out.push(`${k}=${any[k]}`);
  }
  const hdr = any.headers;
  const fromHeader =
    typeof hdr?.get === 'function' ? hdr.get('x-amzn-requestid') : hdr?.['x-amzn-requestid'];
  if (typeof fromHeader === 'string') out.push(`x-amzn-requestid=${fromHeader}`);

  // Some errors carry it only inside the serialised body.
  const m = /"request_id"\s*:\s*"([^"]+)"/.exec(String(any.message ?? ''));
  if (m && !out.some((s) => s.includes(m[1]))) out.push(`request_id=${m[1]}`);
  return out;
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { status?: number })?.status;
  console.error(`\n  ping: FAIL — ${msg}`);

  const ids = requestIds(e);
  console.error(
    ids.length
      ? `\n  request id(s), for a provider support case:\n${ids.map((s) => `    ${s}`).join('\n')}`
      : '\n  request id: none found on the error object',
  );

  // A zero-quota 429 is not a rate limit you can wait out; say so here rather
  // than letting someone retry for an afternoon.
  if (status === 429) {
    console.error(
      '\n  NOTE: a 429 on an account with ~zero usage is usually an AWS provisioning\n' +
        '        defect, not a rate limit — quotas initialised to 0 instead of the\n' +
        '        default. `request-service-quota-increase` is REJECTED in that state\n' +
        '        ("must be greater than the default"). The route is an AWS Support\n' +
        '        case quoting the request id above. See docs/BEDROCK.md.',
    );
  }
  console.error('');
  process.exitCode = 1;
});
