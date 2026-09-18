/**
 * Everything this app reads out of the environment, named once.
 *
 * ANYTHING ADDED HERE ALSO BELONGS IN `globalEnv` IN turbo.json. Turbo 2 runs
 * tasks in strict environment mode and strips undeclared variables before the
 * task starts — turbo.json's own header records the bug that taught this repo
 * so: "the fail-closed guard read an empty API_KEY and correctly allowed the
 * request, while the operator had set one." For a FAIL-CLOSED service token the
 * same lie inverts and gets louder: the API refuses everything and looks broken
 * while the operator is staring at a token they definitely set.
 */

/** The port PLAN.md §13 allocates to the Nest API. */
export const DEFAULT_PORT = 3610;

export function apiPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = (env.COMMERCE_API_PORT ?? '').trim();
  if (!raw) return DEFAULT_PORT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`COMMERCE_API_PORT is not a port number: ${raw}`);
  }
  return n;
}

/**
 * The shared secret the MCP server presents. Unset means REFUSE EVERYTHING —
 * see src/common/service-token.guard.ts for why there is no dev exemption.
 */
export function serviceToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.COMMERCE_SERVICE_TOKEN;
}

/** The header the token arrives in. */
export const SERVICE_TOKEN_HEADER = 'x-service-token';

/** The header carrying the session's case id. Scope comes from here, never from a body. */
export const CASE_ID_HEADER = 'x-case-id';
