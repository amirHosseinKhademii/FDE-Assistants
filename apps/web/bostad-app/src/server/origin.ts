/**
 * Same-origin check for /api routes. Behind a TLS-terminating proxy (Azure Container Apps)
 * the request URL is the internal http:// origin, so the browser's Origin header never
 * matches it. The public origin comes from X-Forwarded-Proto and X-Forwarded-Host (then Host).
 * ALLOWED_ORIGINS (optional, comma-separated, e.g. https://example.com) adds more origins.
 * Any other Origin is refused. Requests without an Origin header (curl, server-side) pass.
 */
function firstValue(v: string | null): string | null {
  const first = v?.split(',')[0]?.trim();
  return first ? first : null;
}

export function allowedOrigins(request: Request, url: URL): string[] {
  const proto = firstValue(request.headers.get('x-forwarded-proto')) ?? url.protocol.replace(/:$/, '');
  const host = firstValue(request.headers.get('x-forwarded-host')) ?? firstValue(request.headers.get('host')) ?? url.host;
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [url.origin, `${proto}://${host}`, ...extra];
}

/** True when there is no Origin header, or the Origin is one of the allowed origins. */
export function isSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return true;
  return allowedOrigins(request, url).includes(origin);
}
