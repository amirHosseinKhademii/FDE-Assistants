/**
 * WHO MAY CALL THIS API. The MCP server, holding a service token, and nobody else.
 *
 * THIS IS LOAD-BEARING, NOT BOILERPLATE. PLAN.md §4.1's entire claim rests on
 * it: the MCP server is a separate deployable so that "it holds no database
 * credential" is a property somebody can check, and the payoff is that if it is
 * compromised the blast radius is exactly what this token can reach. That
 * sentence is only worth saying if THIS file is the real control. A decorative
 * guard turns §4.1 from an argument into a diagram.
 *
 * FAIL CLOSED, AND THE DEV BRANCH IS DELIBERATELY UNREACHABLE. `@fde/guard`'s
 * `authorize` already encodes the inversion this needs — "no key configured
 * means refuse" — and it is reused rather than reimplemented because the obvious
 * reimplementation is the bug the package is named after:
 *
 *     if (process.env.API_KEY && header !== process.env.API_KEY) return 401;
 *
 * which ALLOWS EVERYTHING when the variable is unset.
 *
 * But `authorize` has one branch this API must not take. With no key configured
 * and `isDev: true` it returns `{ ok: true, reason: 'dev loopback' }`, on the
 * reasoning that a dev server binds 127.0.0.1 and the LISTENER is what makes the
 * loopback promise. That reasoning is sound for a laptop UI and wrong here, for
 * two reasons. First, the requirement is literal: an unset token must mean
 * REFUSE EVERYTHING — there is no "except in development". Second, the caller is
 * not a human at a browser, it is another service; a service token has no
 * laptop-convenience case, because the MCP server can be handed a token as
 * easily in development as in production.
 *
 * So `isDev` is passed `false` UNCONDITIONALLY. The dev branch is not
 * unreachable by accident, and `commerce:api-guard-check` asserts it stays that
 * way — otherwise the check would go green against a running server that still
 * had the hole.
 *
 * /health IS GUARDED TOO. A liveness probe therefore has to carry the token,
 * which is a small operational cost paid on purpose: "unset token → EVERY
 * request refused" is only true if it is true of every request. An exempt
 * endpoint is an endpoint the check does not cover.
 */
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { authorize } from '@fde/guard';
import { SERVICE_TOKEN_HEADER, serviceToken } from '../config/env';

export interface ServiceTokenDecision {
  ok: boolean;
  status?: 401 | 503;
  reason: string;
}

/**
 * The decision, with no Nest in it.
 *
 * Transport-agnostic for the same reason `@fde/guard` is: it lets
 * `commerce:api-guard-check` drive every branch — including the ones that must
 * DENY — offline, with no server and no database. A guard that has only ever
 * been observed allowing is a guard you are hoping about.
 */
export function decideServiceToken(input: {
  configuredToken?: string;
  presentedToken?: string | null;
}): ServiceTokenDecision {
  const result = authorize({
    configuredKey: input.configuredToken,
    presentedKey: input.presentedToken,
    // See the header. Never `true`, never derived from NODE_ENV.
    isDev: false,
  });
  return result.ok
    ? { ok: true, reason: result.reason }
    : { ok: false, status: result.status, reason: result.reason };
}

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const presented = request.headers[SERVICE_TOKEN_HEADER];

    const decision = decideServiceToken({
      configuredToken: serviceToken(),
      presentedToken: Array.isArray(presented) ? presented[0] : presented,
    });

    if (decision.ok) return true;

    // The reason is safe to publish: `@fde/guard` writes these strings itself
    // and none of them contains the token, the header value, or a hostname.
    throw new HttpException(
      { error: 'refused', reason: decision.reason },
      decision.status ?? 401,
    );
  }
}
