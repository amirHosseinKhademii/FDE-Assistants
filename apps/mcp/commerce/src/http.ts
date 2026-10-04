/**
 * STEPS 7 AND 8 — the server as a service on :3620, and the door locked.
 *
 * LANDED TOGETHER ON PURPOSE. Step 7 alone would be an HTTP listener serving a
 * customer's orders, deliveries and messages to anyone who can reach the port —
 * worse than no Step 7. So the transport and the lock arrive in one file.
 *
 * `server.ts` IS UNCHANGED. `createServer({ api, session })` already separates
 * building the server from choosing its transport (Step 3 depends on it), so
 * HTTP is a different caller of the same function, one server per request —
 * which is what `createMcpHandler` wants: a factory.
 *
 * WHAT A REQUEST HAS TO GET PAST, in order, each refusal its own status:
 *
 *   1. Host / Origin      the SDK's own validation, which it says to put in front
 *                         of a bare handler (DNS rebinding)             → 403
 *   2. the secret exists  COMMERCE_MCP_TOKEN unset refuses EVERYTHING — the
 *                         fail-open shape @fde/guard exists to name     → 503
 *   3. the bearer         a token that is not this server's             → 401
 *   4. the case           `x-case-id`, required, resolved through the API's
 *                         `GET /case`. NEVER DEFAULTED — see below       → 400
 *
 * THE CASE, AND WHY A HEADER IS ACCEPTABLE HERE. Over stdio one process is one
 * case (`sessionFromEnv`). Over HTTP one server serves many cases, so the case
 * must arrive with each request — and it may only come from the AUTHENTICATED
 * caller (the desk), never from the model. A model cannot set an HTTP header;
 * it can only choose tool arguments, and no customer-data tool takes one. The
 * case rides into the per-request factory inside `AuthInfo.extra`, and the
 * ORDER is resolved from it by the API — so `session.ts`'s claim that the
 * order is "resolved from the case, not chosen" is finally literally true.
 *
 * THE TRAP THIS FILE REFUSES TO FALL INTO. `sessionFromEnv()` defaults to
 * CAS-90001 so the stdio demos work. Reused here, a request with no case header
 * would be served T1's customer's data. `sessionFromRequest` has no default and
 * the factory throws if the gate did not supply one. `commerce:mcp-http-check`
 * plants the missing header.
 *
 *   pnpm --filter @thornbury/commerce-mcp serve:http     (:3620)
 */
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import {
  createMcpHandler,
  requireBearerAuth,
  hostHeaderValidationResponse,
  originValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type McpRequestContext,
} from '@modelcontextprotocol/server';
import { createServer, serverLog } from './server';
import { apiConfigFromEnv, getJson, type ApiConfig } from './api/client';
import { CaseScopeSchema } from './api/schemas';
import { loadEnv } from './config/env';
import type { Session } from './session';

export const CASE_HEADER = 'x-case-id';

export interface HttpOptions {
  /** The inbound secret — NOT `COMMERCE_SERVICE_TOKEN`, which is the API's. Empty refuses everything. */
  token: string;
  api: ApiConfig;
  port?: number;
  /** Loopback only, by default and in every check. */
  host?: string;
  /**
   * How 2025-era requests are served. `reject` unless measured otherwise — see
   * the header of `http-check.ts` for what the client and inspector negotiate.
   */
  legacy?: 'reject' | 'stateless';
}

/** Compare without leaking length or position — the same three lines as @fde/guard's. */
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const refuse = (status: number, reason: string): Response =>
  new Response(JSON.stringify({ error: 'refused', reason }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * case → order, through the API, cached briefly: every JSON-RPC message is a
 * request here, and `tools/list` should not cost an API round trip each time.
 * Only SUCCESSFUL resolutions are cached, so a case the API refuses is asked
 * about again rather than refused from memory.
 */
const CASE_TTL_MS = 60_000;

function caseResolver(api: ApiConfig) {
  const cache = new Map<string, { session: Session; at: number }>();
  return async (caseId: string): Promise<{ session: Session } | { status: number; reason: string }> => {
    const hit = cache.get(caseId);
    if (hit && Date.now() - hit.at < CASE_TTL_MS) return { session: hit.session };
    const scope = await getJson(api, { caseId, orderId: '' }, '/case', CaseScopeSchema);
    if (!scope.ok) {
      const ours = scope.cause === 'invalid_request' || scope.cause === 'out_of_scope';
      return { status: ours ? 400 : 502, reason: `the case could not be resolved: ${scope.detail}` };
    }
    // A case with no order is served — its history is still readable — and the
    // order tools will report that there is nothing to read.
    const session: Session = { caseId: scope.data.caseId, orderId: scope.data.orderRef ?? '' };
    cache.set(caseId, { session, at: Date.now() });
    return { session };
  };
}

/** The session the gate put in `AuthInfo.extra`. No default, ever. */
export function sessionFromRequest(ctx: McpRequestContext): Session {
  const s = ctx.authInfo?.extra?.session as Session | undefined;
  if (!s?.caseId) throw new Error('no case on this request — refusing rather than defaulting');
  return s;
}

/** The web-standard handler, gate included. Exported so a check can drive it without a socket. */
export function createHttpHandler(opts: HttpOptions, publicUrl: string) {
  const handler = createMcpHandler((ctx) => createServer({ api: opts.api, session: sessionFromRequest(ctx) }), {
    legacy: opts.legacy ?? 'reject',
    onerror: (e) => serverLog('http:', e.message),
  });
  const resolveCase = caseResolver(opts.api);
  const expected = opts.token.trim();
  const gate = requireBearerAuth({
    verifier: {
      async verifyAccessToken(token: string): Promise<AuthInfo> {
        if (!expected || !sameSecret(token, expected)) {
          throw new OAuthError(OAuthErrorCode.InvalidToken, 'this token is not recognised by this server');
        }
        return {
          token,
          clientId: 'thornbury-desk',
          scopes: [],
          // The SDK rejects a token with no expiry. A static shared secret has
          // none, so the verification itself is what expires: one hour.
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          // RFC 8707: the resource this token is valid for is THIS server.
          resource: new URL(publicUrl),
        };
      },
    },
  });

  async function fetch(request: Request): Promise<Response> {
    // Allow additional hostnames from COMMERCE_MCP_ALLOWED_HOSTS env var.
    // Entries are comma-separated, trimmed, lowercased. Entries with * are ignored
    // (never allow wildcard). Port is stripped.
    const allowedHosts = new Set(localhostAllowedHostnames());
    const extra = (process.env.COMMERCE_MCP_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter((h) => h && !h.includes('*'))
      .map((h) => h.replace(/:\d+$/, '')); // strip :port
    extra.forEach((h) => allowedHosts.add(h));

    const hostOrOrigin =
      hostHeaderValidationResponse(request, Array.from(allowedHosts)) ??
      originValidationResponse(request, localhostAllowedOrigins());
    if (hostOrOrigin) return hostOrOrigin;

    if (!expected) {
      return refuse(503, 'COMMERCE_MCP_TOKEN is not set; this server refuses every request rather than serving unauthenticated ones');
    }

    const auth = await gate(request);
    if (auth instanceof Response) return auth;

    const caseId = request.headers.get(CASE_HEADER)?.trim();
    if (!caseId) {
      return refuse(400, `${CASE_HEADER} is required: the case comes from the desk with every request, and is never defaulted`);
    }
    const resolved = await resolveCase(caseId);
    if ('status' in resolved) return refuse(resolved.status, resolved.reason);

    return handler.fetch(request, { authInfo: { ...auth, extra: { ...(auth.extra ?? {}), session: resolved.session } } });
  }

  return { fetch, close: () => handler.close() };
}

// ── node:http, without a dependency ─────────────────────────────────────────
//
// `@modelcontextprotocol/node` exists to do this; it is not installed, and the
// whole adapter is two functions. The one property that matters: the response
// body is STREAMED, because `responseMode: 'auto'` upgrades to SSE when a tool
// emits anything before its result, and buffering would swallow that.

function toRequest(req: IncomingMessage, base: string): Request {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(new URL(req.url ?? '/', base), {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
    duplex: 'half',
  } as RequestInit);
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return void res.end();
  const reader = response.body.getReader();
  res.on('close', () => void reader.cancel().catch(() => undefined));
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}

export async function startHttpServer(opts: HttpOptions): Promise<{ url: string; server: Server; close(): Promise<void> }> {
  const host = opts.host ?? '127.0.0.1';
  let app: ReturnType<typeof createHttpHandler> | undefined;
  const server = createHttpServer((req, res) => {
    const base = `http://${req.headers.host ?? host}`;
    app!
      .fetch(toRequest(req, base))
      .then((r) => send(res, r))
      .catch((e) => {
        serverLog('http: unhandled', e instanceof Error ? e.message : String(e));
        if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal' }));
      });
  });
  await new Promise<void>((r) => server.listen(opts.port ?? 0, host, r));
  const { port } = server.address() as AddressInfo;
  const url = `http://${host}:${port}/mcp`;
  app = createHttpHandler(opts, url);
  return {
    url,
    server,
    async close() {
      await app!.close();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

async function main(): Promise<void> {
  loadEnv();
  const { url } = await startHttpServer({
    token: process.env.COMMERCE_MCP_TOKEN ?? '',
    api: apiConfigFromEnv(),
    port: Number(process.env.COMMERCE_MCP_PORT ?? 3620),
    host: process.env.HOST ?? '127.0.0.1',
  });
  if (!(process.env.COMMERCE_MCP_TOKEN ?? '').trim()) {
    serverLog('COMMERCE_MCP_TOKEN is not set — listening, and refusing every request (fail closed).');
  }
  serverLog(`listening on ${url}`);
}

if (require.main === module) {
  main().catch((e) => {
    serverLog('fatal:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
