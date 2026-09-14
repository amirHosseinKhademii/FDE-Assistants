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

console.log(
  failed === 0
    ? '\nguard: PASS — every denial branch denies, and the allow branches still allow\n'
    : `\nguard: FAIL — ${failed} problem(s)\n`,
);
process.exit(failed === 0 ? 0 : 1);
