/**
 * THE ONLY WAY OUT OF THIS PROCESS.
 *
 * Look at what this file needs and, more importantly, at what it does not: a
 * base URL and a service token. **No connection string, no `pg`, no ORM.** That
 * emptiness is the deliverable of the whole engagement — if this process is
 * compromised, the damage is bounded by what one token can reach, and that is a
 * sentence about the API's authorization, which is a thing with tests.
 *
 * Inside the NestJS app the same claim would be unverifiable, because the
 * process it lived in would hold five database pools. See PLAN.md §4.1.
 */
import type { ZodType } from 'zod';
import { fail, ok, type Cause, type Outcome } from './outcome';
import type { Session } from '../session';

/** The API's own envelope, as the backend session built it. */
interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  cause?: string;
  detail?: string;
}

const CAUSES: readonly string[] = [
  'out_of_scope',
  'not_found',
  'invalid_request',
  'upstream_unavailable',
];

/**
 * An unrecognised cause becomes `upstream_unavailable`, never `ok`.
 *
 * A new cause the API grows and we have not heard of is an unknown state, and
 * an unknown state is not a success. Defaulting the other way is the fail-open
 * shape `@fde/guard` exists to name.
 */
function narrowCause(raw: string | undefined): Cause {
  return CAUSES.includes(raw ?? '') ? (raw as Cause) : 'upstream_unavailable';
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly serviceToken: string;
}

export function apiConfigFromEnv(): ApiConfig {
  return {
    baseUrl: process.env.COMMERCE_API_URL ?? 'http://127.0.0.1:3610',
    // NO DEFAULT. An unset token must mean every call fails, not every call
    // succeeds unauthenticated — `packages/guard` exists because the obvious
    // implementation gets this backwards.
    serviceToken: process.env.COMMERCE_SERVICE_TOKEN ?? '',
  };
}

function headers(cfg: ApiConfig, session: Session): Record<string, string> {
  return {
    'x-service-token': cfg.serviceToken,
    // The case, from the session. Never from a tool argument. See session.ts.
    'x-case-id': session.caseId,
    accept: 'application/json',
  };
}

/** A 5xx means plumbing — a property the backend session guarantees on its side. */
function isPlumbing(status: number): boolean {
  return status >= 500;
}

/**
 * Fetch, then PARSE. The schema is required, and that is the point.
 *
 * The previous signature was `getJson<T>(...)` with `T` supplied at the call
 * site and nothing checking it — a cast, which the compiler is obliged to
 * believe. Step 4b returned `ok: true` with every scalar `undefined` and no
 * layer complained. Taking a schema instead of a type parameter makes the
 * check impossible to skip: there is no overload that omits it.
 */
export async function getJson<T>(
  cfg: ApiConfig,
  session: Session,
  path: string,
  schema: ZodType<T>,
): Promise<Outcome<T>> {
  if (!cfg.serviceToken) {
    return fail('invalid_request', 'COMMERCE_SERVICE_TOKEN is not set; refusing to call the API.');
  }

  const res = await fetch(`${cfg.baseUrl}${path}`, { headers: headers(cfg, session) });

  if (isPlumbing(res.status)) {
    return fail('upstream_unavailable', `the API answered ${res.status} for ${path}`);
  }

  const body = (await res.json()) as ApiEnvelope<unknown>;
  if (!body.ok || body.data === undefined) {
    return fail(narrowCause(body.cause), body.detail ?? `the API refused ${path}`);
  }

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    // NAME THE FIELDS. "Validation failed" sends the next person back to the
    // network tab; the path and the expectation send them to the line.
    const issues = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    return fail('malformed_response', `${path} answered ok but not the shape we parse — ${issues}`);
  }

  return ok(parsed.data);
}
