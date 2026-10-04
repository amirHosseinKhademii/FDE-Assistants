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

const API_CAUSES: readonly string[] = [
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
  return API_CAUSES.includes(raw ?? '') ? (raw as Cause) : 'upstream_unavailable';
}

export interface ApiConfig {
  readonly baseUrl: string;
  readonly serviceToken: string;
  /** Per request, body included. Absent means `DEFAULT_TIMEOUT_MS`, never "none". */
  readonly timeoutMs?: number;
}

/**
 * `fetch()` HAS NO DEFAULT TIMEOUT. A socket that accepts and never answers —
 * Neon waking from idle, a proxy that lost its upstream — hangs the tool call
 * forever, and the model turn waiting on it. Measured in Step 6; FREE.md found
 * the same on the model endpoint.
 *
 * WHY 15 SECONDS, from two measured bounds rather than a round number. Above:
 * the MCP client gives up on a request after 60s (`DEFAULT_REQUEST_TIMEOUT_MSEC`
 * in `@modelcontextprotocol/client` 2.0.0), and if it gets there first the call
 * dies UNLABELLED — so ours must fire well inside that. Below: `/health` from
 * cold took ~2.2s per pool on 2026-09-27, so a first request after idle needs
 * room to be slow without being called dead.
 */
export const DEFAULT_TIMEOUT_MS = 15_000;

export function apiConfigFromEnv(): ApiConfig {
  return {
    baseUrl: process.env.COMMERCE_API_URL ?? 'http://127.0.0.1:3610',
    // NO DEFAULT. An unset token must mean every call fails, not every call
    // succeeds unauthenticated — `packages/guard` exists because the obvious
    // implementation gets this backwards.
    serviceToken: process.env.COMMERCE_SERVICE_TOKEN ?? '',
    timeoutMs: DEFAULT_TIMEOUT_MS,
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

/** The API's envelope, recognised by its one required field. */
function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && typeof (body as { ok?: unknown }).ok === 'boolean';
}

/**
 * The API's 400: `{error, problems: [{field, rule, message}]}` (API.md §3).
 * Field and rule are kept because they are the only part that says WHICH
 * argument was wrong; the API already leaves out the offending value.
 */
function contractProblems(body: unknown): string | undefined {
  const problems = (body as { problems?: unknown })?.problems;
  if (!Array.isArray(problems)) return undefined;
  return problems
    .slice(0, 4)
    .map((p: { field?: unknown; rule?: unknown }) => `${String(p?.field)}: ${String(p?.rule)}`)
    .join('; ');
}

/**
 * Why the transfer failed, in words that send the reader to the right place.
 * `fetch` puts the useful part — ECONNREFUSED, "other side closed" — on
 * `cause`, and says only "fetch failed" on the error itself.
 */
function transferFailure(e: unknown, path: string, timeoutMs: number): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === 'TimeoutError') return `no answer for ${path} within ${timeoutMs}ms`;
  const why = err?.cause?.code ?? err?.cause?.message ?? err?.message ?? String(e);
  return `could not complete ${path}: ${why}`;
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
  return callApi(cfg, session, 'GET', path, schema);
}

/**
 * The one write. Same pipeline as `getJson` — the timeout, the transfer caught
 * as one step, every status read for what it is (Step 6) — because a write that
 * failed must be labelled at least as carefully as a read that did. Added with
 * `propose_resolution`, 2026-09-27.
 */
export async function postJson<T>(
  cfg: ApiConfig,
  session: Session,
  path: string,
  body: unknown,
  schema: ZodType<T>,
): Promise<Outcome<T>> {
  return callApi(cfg, session, 'POST', path, schema, body);
}

async function callApi<T>(
  cfg: ApiConfig,
  session: Session,
  method: 'GET' | 'POST',
  path: string,
  schema: ZodType<T>,
  payload?: unknown,
): Promise<Outcome<T>> {
  if (!cfg.serviceToken) {
    return fail('unauthorized', 'COMMERCE_SERVICE_TOKEN is not set; refusing to call the API.');
  }

  // THE TRANSFER, BODY INCLUDED, IS ONE STEP AND IS CAUGHT AS ONE. A refused
  // connection rejects `fetch`; a response cut off mid-body rejects the read;
  // a hang is ended by the signal, which covers both. All three are the
  // upstream failing. Left to `guarded()` they were labelled `threw` — "the
  // tool itself raised" — which points at this package when the fault is a
  // process that is not running. Measured in Step 6, `commerce:mcp-break`.
  const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method,
      headers: payload === undefined ? headers(cfg, session) : { ...headers(cfg, session), 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
  } catch (e) {
    return fail('upstream_unavailable', transferFailure(e, path, timeoutMs));
  }

  if (isPlumbing(res.status)) {
    return fail('upstream_unavailable', `the API answered ${res.status} for ${path}`);
  }

  // 401 carries `{error, reason}`, never the envelope. Its `reason` is NOT
  // passed on: the API reuses @fde/guard, whose text names an `x-api-key`
  // header this API does not use, and repeating it would send the reader to
  // look for the wrong header. Ours names the variable that is actually wrong.
  if (res.status === 401) {
    return fail('unauthorized', `the API refused our service token for ${path} — check COMMERCE_SERVICE_TOKEN`);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail('malformed_response', `${path} answered ${res.status} with a body that is not JSON`);
  }

  const problems = res.status === 400 ? contractProblems(body) : undefined;
  if (problems !== undefined) {
    return fail('invalid_request', `${path} did not match the API's contract — ${problems}`);
  }

  // Anything else without the envelope is the API and this client disagreeing
  // about the contract — a route that is not there, a status nobody documented.
  // Filing it as `upstream_unavailable` says "try again later", which never works.
  if (!isEnvelope(body)) {
    return fail('malformed_response', `${path} answered ${res.status} with a body that is not the API's envelope`);
  }

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
