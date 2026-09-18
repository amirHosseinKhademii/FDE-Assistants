/**
 * `pnpm commerce:api-guard-check` — unset service token means REFUSE EVERYTHING.
 *
 * WHAT IS ACTUALLY BEING TESTED, because it is narrower and more important than
 * "does the guard work". `@fde/guard`'s `authorize` has a branch this API must
 * not take: with no key configured and `isDev: true` it ALLOWS, on the sound
 * reasoning that a dev server binds loopback and the listener is what makes that
 * promise. For a service token that reasoning does not apply — the caller is
 * another service, which can be handed a token as easily in development as in
 * production — and the requirement is literal: unset means refuse everything.
 *
 * So the interesting assertion is not "does a wrong token get 401". It is:
 * `authorize` STILL ALLOWS on its dev branch, and `decideServiceToken` STILL
 * REFUSES on the same input. If someone ever threads `isDev` through, the second
 * assertion goes red while a naive happy-path test would stay green against a
 * running server that now had the hole.
 *
 * Offline. No server, no database, no network.
 */
import { authorize } from '@fde/guard';
import { decideServiceToken } from '../common/service-token.guard';
import { Checks } from './harness';

const TOKEN = 'svc_' + 'a'.repeat(48);
const checks = new Checks('commerce:api-guard-check — fail-closed service token');

const allowed = (r: { ok: boolean }) => r.ok;
const refusedWith = (r: { ok: boolean; status?: number }, status: number) =>
  !r.ok && r.status === status;

checks.section('CONFIGURED — a token is set, so the caller must present it');
checks.assert(
  'the right token is allowed',
  allowed(decideServiceToken({ configuredToken: TOKEN, presentedToken: TOKEN })),
  'the control: a guard that refused everything would pass every denial below',
);
checks.assert(
  'a wrong token of the same length is refused',
  refusedWith(
    decideServiceToken({ configuredToken: TOKEN, presentedToken: 'svc_' + 'b'.repeat(48) }),
    401,
  ),
  'same length, different bytes — the comparison must not stop at the first byte',
);
checks.assert(
  'a missing header is refused',
  refusedWith(decideServiceToken({ configuredToken: TOKEN, presentedToken: null }), 401),
  'no credential is not a weaker credential, it is none',
);
checks.assert(
  'a prefix of the token is refused',
  refusedWith(
    decideServiceToken({ configuredToken: TOKEN, presentedToken: TOKEN.slice(0, 20) }),
    401,
  ),
  'a length difference must not read as a partial match',
);

checks.section('UNSET — the branch that decides whether this API fails open');
checks.assert(
  'no token configured REFUSES, even with a token presented',
  refusedWith(decideServiceToken({ configuredToken: undefined, presentedToken: TOKEN }), 503),
  'THE REQUIREMENT, LITERALLY: an unset token must mean refuse everything',
);
checks.assert(
  'no token configured REFUSES a request presenting nothing',
  refusedWith(decideServiceToken({ configuredToken: undefined, presentedToken: null }), 503),
  'the forgotten-variable case: a deploy config missing COMMERCE_SERVICE_TOKEN',
);
checks.assert(
  'an empty string counts as unset',
  refusedWith(decideServiceToken({ configuredToken: '   ', presentedToken: TOKEN }), 503),
  'COMMERCE_SERVICE_TOKEN= in a .env file is not a secret and must not read as one',
);

checks.section('THE DEV BRANCH — present in @fde/guard, deliberately unreachable here');
const guardAllowsOnDev = authorize({
  configuredKey: undefined,
  presentedKey: null,
  isDev: true,
}).ok;
checks.assert(
  '@fde/guard still allows unset+dev (so this check is testing something real)',
  guardAllowsOnDev,
  'if this ever goes false the dependency changed and the assertion below is vacuous',
);
checks.assert(
  'this API refuses the SAME input, because it never passes isDev: true',
  refusedWith(decideServiceToken({ configuredToken: undefined, presentedToken: null }), 503),
  'the hole exists one layer down and is closed here; thread isDev through and this goes red',
);

checks.section('NEGATIVE CONTROLS — the plants');

/** Plant 1: the bug `@fde/guard` is named after, written out in full. */
function failOpenGuard(input: { configuredToken?: string; presentedToken?: string | null }) {
  if (input.configuredToken && input.presentedToken !== input.configuredToken) {
    return { ok: false, status: 401 as const, reason: 'mismatch' };
  }
  return { ok: true, reason: 'allowed' };
}
checks.control(
  'the classic fail-open implementation is caught',
  failOpenGuard({ configuredToken: undefined, presentedToken: 'anything' }).ok === true &&
    !decideServiceToken({ configuredToken: undefined, presentedToken: 'anything' }).ok,
  '`if (key && header !== key)` allows everything when the variable is unset; ' +
    'the plant must allow and the real guard must refuse, or this check proves nothing',
);

/** Plant 2: someone "helpfully" restores the dev-mode convenience branch. */
function devExemptGuard(input: { configuredToken?: string }, isDev: boolean) {
  return authorize({ configuredKey: input.configuredToken, presentedKey: null, isDev });
}
checks.control(
  'a dev-mode exemption is caught',
  devExemptGuard({ configuredToken: undefined }, true).ok === true &&
    !decideServiceToken({ configuredToken: undefined, presentedToken: null }).ok,
  'the plant allows in dev with no token; this API must refuse regardless of environment',
);

checks.done();
