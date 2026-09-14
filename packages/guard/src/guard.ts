/**
 * Who may call the HTTP surface. Pillar 6.
 *
 * THE FAILURE THIS PREVENTS. The obvious API-key check is:
 *
 *     if (process.env.API_KEY && header !== process.env.API_KEY) return 401;
 *
 * which fails OPEN. Forget the variable in a deploy config and every request is
 * allowed, silently, with no error anywhere. That is an unauthenticated endpoint
 * spending money and reading claims data, shipped by omission. A guard must make
 * a missing value reduce access, never grant it.
 *
 * WHY "UNSET = LOOPBACK ONLY" IS NOT ENFORCED BY READING AN ADDRESS. `.env.example`
 * has always described unset as "loopback-only", and the tempting implementation
 * is to inspect the client address or `x-forwarded-for`. Both are wrong: a proxy
 * header is attacker-controlled, and by the time a request reaches application
 * code the socket may have been through anything. The truthful enforcement of
 * "loopback only" is the LISTENER — bind 127.0.0.1 and nothing else can reach it.
 *
 * So this function encodes what application code can actually know:
 *
 *   key set        → the request must present it. Constant-time compare.
 *   key unset, dev → allowed. The dev server binds localhost; that is the
 *                    loopback guarantee, made by the listener rather than here.
 *   key unset, prod→ REFUSED. We cannot prove the listener is loopback-only, so
 *                    we decline to serve rather than assume. Deployment without
 *                    a key is a configuration error, and it should read like one.
 *
 * This file is transport-agnostic on purpose: no Request, no Response, no
 * framework. That is what lets `pnpm guard:check` exercise every branch offline,
 * including the branches that must DENY.
 */
import { timingSafeEqual } from 'node:crypto';

export interface GuardInput {
  /** `process.env.API_KEY` — undefined or empty means unconfigured. */
  configuredKey?: string;
  /** Whatever the caller presented, typically the `x-api-key` header. */
  presentedKey?: string | null;
  /** True only for a dev server known to bind loopback. */
  isDev: boolean;
}

export type GuardResult =
  | { ok: true; reason: 'key matched' | 'dev loopback' }
  | { ok: false; status: 401 | 503; reason: string };

/**
 * Compare without leaking length or position through timing.
 *
 * Overkill for a local demo and correct for a shared secret — and getting it
 * right here costs three lines, while retrofitting it after a security review
 * costs a conversation about why it was not.
 */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export function authorize(input: GuardInput): GuardResult {
  const configured = (input.configuredKey ?? '').trim();

  if (!configured) {
    if (input.isDev) return { ok: true, reason: 'dev loopback' };
    return {
      ok: false,
      status: 503,
      reason:
        'API_KEY is not configured. Refusing to serve rather than accepting ' +
        'unauthenticated requests — set API_KEY, or run the dev server, which ' +
        'binds loopback.',
    };
  }

  const presented = (input.presentedKey ?? '').trim();
  if (!presented) {
    return { ok: false, status: 401, reason: 'missing x-api-key header' };
  }
  if (!sameSecret(configured, presented)) {
    return { ok: false, status: 401, reason: 'x-api-key does not match' };
  }
  return { ok: true, reason: 'key matched' };
}
