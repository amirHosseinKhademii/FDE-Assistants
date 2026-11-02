/**
 * Does the guard actually deny? Offline, instant.
 *
 * WHY THIS EXISTS IN THIS SHAPE. A guard is only worth having if it can refuse,
 * and "it passed my one happy-path test" is exactly how an endpoint ships open.
 * So the cases below are mostly DENIALS, and the file fails the build if any of
 * them starts allowing.
 *
 *   pnpm guard:check
 */
import { authorize, type GuardResult } from './guard';
import { publicError } from './public-error';
import {
  clientIdFrom,
  createDemoLimiter,
  DEMO_GLOBAL_PER_DAY,
  DEMO_LIMIT_MESSAGE,
  DEMO_PER_CLIENT_PER_HOUR,
} from './demo-limit';

const SECRET = 'a'.repeat(64);

let failed = 0;
function check(name: string, got: GuardResult, want: 'allow' | number, why: string): void {
  const ok = want === 'allow' ? got.ok : !got.ok && got.status === want;
  if (!ok) failed++;
  const shown = got.ok ? `allow (${got.reason})` : `deny ${got.status} (${got.reason})`;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${shown}`);
  console.log(`        why: ${why}`);
}

console.log('\nGuard self-test — fail-closed API key (security/guard.ts)\n');

console.log('CONFIGURED — a key is set, so the request must present it');
check(
  'the right key is allowed',
  authorize({ configuredKey: SECRET, presentedKey: SECRET, isDev: false }),
  'allow',
  'the control: a guard that denied everything would pass every denial test below',
);
check(
  'a wrong key is denied',
  authorize({ configuredKey: SECRET, presentedKey: 'b'.repeat(64), isDev: false }),
  401,
  'same length, different bytes — the comparison must not stop at the first byte',
);
check(
  'a missing header is denied',
  authorize({ configuredKey: SECRET, presentedKey: null, isDev: false }),
  401,
  'no credential is not a weaker credential, it is none',
);
check(
  'a prefix of the key is denied',
  authorize({ configuredKey: SECRET, presentedKey: SECRET.slice(0, 32), isDev: false }),
  401,
  'length differences must not be treated as a partial match',
);
check(
  'dev mode does NOT bypass a configured key',
  authorize({ configuredKey: SECRET, presentedKey: 'wrong', isDev: true }),
  401,
  'a dev flag must never widen access when a secret exists',
);

console.log('\nUNCONFIGURED — the branch that decides whether this fails open');
check(
  'production with no key REFUSES to serve',
  authorize({ configuredKey: undefined, presentedKey: 'anything', isDev: false }),
  503,
  'the whole point: a forgotten variable must reduce access, never grant it',
);
check(
  'an empty string counts as unset',
  authorize({ configuredKey: '   ', presentedKey: 'anything', isDev: false }),
  503,
  'API_KEY= in a .env file is not a secret, and must not read as one',
);
check(
  'dev with no key is allowed',
  authorize({ configuredKey: undefined, presentedKey: null, isDev: true }),
  'allow',
  'the dev server binds loopback — that guarantee comes from the listener, not from here',
);

// ── public demo (PUBLIC_DEMO=true) ───────────────────────────────────────────
// Relaxes exactly one branch: a configured key with NO key presented becomes
// allowed, metered. Everything else keeps its denial.

function demoCase(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        why: ${why}`);
}

console.log('\nPUBLIC DEMO — opt-in, metered, never widens a wrong key');

const pubNoKey = authorize({ configuredKey: SECRET, presentedKey: null, isDev: false, publicDemo: true });
check(
  'public on, no key -> allowed',
  pubNoKey,
  'allow',
  'the one relaxed branch: a visitor with no key reaches the metered path',
);
demoCase(
  'public on, no key -> the result is metered',
  pubNoKey.ok && pubNoKey.metered === true,
  'the caller counts this request only if the result says so',
);
check(
  'public on, WRONG key -> still denied',
  authorize({ configuredKey: SECRET, presentedKey: 'b'.repeat(64), isDev: false, publicDemo: true }),
  401,
  'a wrong key is an attempt, not an absence of one, and must not fall through to the demo',
);
check(
  'public on, key UNSET in production -> still refused',
  authorize({ configuredKey: undefined, presentedKey: null, isDev: false, publicDemo: true }),
  503,
  'the public switch does not repair a missing secret: no config opens the door by omission',
);
check(
  'public off, no key -> unchanged (401)',
  authorize({ configuredKey: SECRET, presentedKey: null, isDev: false, publicDemo: false }),
  401,
  'without the switch the behaviour is exactly what it was before this change',
);
const pubCorrect = authorize({ configuredKey: SECRET, presentedKey: SECRET, isDev: false, publicDemo: true });
check(
  'public on, correct admin key -> allowed',
  pubCorrect,
  'allow',
  'the admin path skips the limits',
);
demoCase(
  'public on, correct admin key -> NOT metered',
  pubCorrect.ok && pubCorrect.metered === false,
  'an operator using the key must never be counted against the public quota',
);

// Fake clock: a test that depends on real time is a test that flakes.
let t = Date.UTC(2026, 10, 2, 12, 0, 0);
const limiter = createDemoLimiter({ perClientPerHour: DEMO_PER_CLIENT_PER_HOUR, globalPerDay: 1000, now: () => t });
let firstFifteenOk = true;
for (let i = 0; i < DEMO_PER_CLIENT_PER_HOUR; i++) {
  if (!limiter.admit('10.0.0.1').ok) firstFifteenOk = false;
}
demoCase('client: the first 15 model requests in an hour are admitted', firstFifteenOk, 'the cap is the spend, not the page view');

const sixteenth = limiter.admit('10.0.0.1');
demoCase(
  'client: the 16th in the hour is refused with 429',
  !sixteenth.ok && sixteenth.status === 429 && sixteenth.scope === 'client',
  'over the per-client limit must be a 429 scoped to the client, not a generic failure',
);
demoCase(
  'client: the refusal carries the friendly message',
  !sixteenth.ok && sixteenth.error === DEMO_LIMIT_MESSAGE && DEMO_LIMIT_MESSAGE.includes('khademi@veresk.se'),
  'the visitor must be told what to do next',
);
demoCase(
  'client: retry-after is positive and at most an hour',
  !sixteenth.ok && sixteenth.retryAfterSeconds > 0 && sixteenth.retryAfterSeconds <= 3600,
  'a 429 with no wait time leaves the visitor guessing',
);
demoCase(
  'client: a different client is not affected by the first',
  limiter.admit('10.0.0.2').ok === true,
  'one visitor exhausting their quota must not lock out everyone',
);
t += 3600_001;
demoCase(
  'client: an hour later the quota has rolled over',
  limiter.admit('10.0.0.1').ok === true,
  'a rolling window that never frees a slot is a permanent ban',
);

const tight = createDemoLimiter({ perClientPerHour: 100, globalPerDay: 3, now: () => t });
tight.admit('a');
tight.admit('b');
tight.admit('c');
const fourth = tight.admit('d');
demoCase(
  'global: the 4th model request of the UTC day is refused, whoever sent it',
  !fourth.ok && fourth.status === 429 && fourth.scope === 'global',
  'the daily cap is the real spend ceiling and must hold across clients',
);
const nextDay = Math.floor(t / 86_400_000 + 1) * 86_400_000;
t = nextDay + 1000;
demoCase(
  'global: the next UTC day starts again',
  tight.admit('e').ok === true,
  'a cap that never resets stops the demo for good on day two',
);

demoCase(
  'the shipped caps are 15 per client per hour and 300 per UTC day',
  DEMO_PER_CLIENT_PER_HOUR === 15 && DEMO_GLOBAL_PER_DAY === 300,
  'the numbers the learner asked for; a change here is a decision, not a refactor',
);

demoCase(
  'client key: the first forwarded address wins, and a missing header is one shared bucket',
  clientIdFrom({ get: (n) => (n === 'x-forwarded-for' ? '203.0.113.7, 10.0.0.9' : null) }) === '203.0.113.7' &&
    clientIdFrom({ get: () => null }) === 'unknown',
  'the key decides who shares a quota, so it must be deterministic',
);

// ── the way out ──────────────────────────────────────────────────────────────
// A guard that refuses the wrong callers and then hands the right one a
// connection string in an error body has moved the leak, not closed it.

console.log('\nOUTBOUND — what an exception is allowed to tell the caller');

/**
 * The shape the routes actually leak: a driver naming the host it dialled.
 *
 * SYNTHETIC, and that is not pedantry — the first draft of this file pasted the
 * real hostname in from a scan, which would have committed the exact string the
 * function exists to keep out of responses. A fixture for a disclosure bug is
 * the one place a real value is most likely to be typed and least likely to be
 * noticed.
 */
const DRIVER_THROW = new Error(
  'getaddrinfo ENOTFOUND ep-example-0000000-pooler.c-0.example-region.example.invalid',
);
const SECRETS = ['ep-example', 'example.invalid', 'getaddrinfo', 'ENOTFOUND'];

function outbound(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        why: ${why}`);
}

let logged: unknown = null;
const captured = publicError(DRIVER_THROW, {
  context: 'POST /api/assess',
  sink: (_line, cause) => {
    logged = cause;
  },
});

outbound(
  'the hostname does not reach the caller',
  !SECRETS.some((s) => captured.error.includes(s)),
  'this is the entire finding: a DB outage must not publish where the DB is',
);
outbound(
  'the real error still reaches the log',
  logged === DRIVER_THROW,
  'redaction that also destroys the evidence just moves the outage to the operator',
);
outbound(
  'the caller gets a reference that joins the two',
  /^[0-9a-f]{8}$/.test(captured.ref) && captured.error.includes(captured.ref),
  'without a ref, "an error occurred" is unactionable and someone re-adds e.message',
);
outbound(
  'two failures are told apart',
  publicError(DRIVER_THROW, { sink: () => {} }).ref !==
    publicError(DRIVER_THROW, { sink: () => {} }).ref,
  'a shared ref makes the log ambiguous exactly when it is being read under pressure',
);

// A caller-supplied message is the escape hatch for text that IS safe. It must
// not become a way to pass the exception through by habit.
const overridden = publicError(DRIVER_THROW, {
  message: 'The assessment could not be completed.',
  sink: () => {},
});
outbound(
  'an explicit message is used verbatim and still carries a ref',
  overridden.error === 'The assessment could not be completed.' &&
    /^[0-9a-f]{8}$/.test(overridden.ref),
  'routes need to say something specific without that meaning "say the exception"',
);

console.log(
  failed === 0
    ? '\nguard: PASS — every denial branch denies, the allow branches still allow, and no exception text crosses the boundary\n'
    : `\nguard: FAIL — ${failed} problem(s)\n`,
);
process.exit(failed === 0 ? 0 : 1);
