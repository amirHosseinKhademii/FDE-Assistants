/**
 * Limits for the public demo. In memory, per container, transport-agnostic.
 *
 * WHAT IT COUNTS. Only requests that reach the model. The list endpoints are
 * free and are not metered; a route calls `admit` only on the path that spends
 * money, and only when `authorize` said the request is metered.
 *
 * TWO CAPS, CHECKED IN THIS ORDER. The global daily cap first, so a refused
 * request never consumes a per-client slot. Both counters move only on admit.
 *
 *   per client  15 model requests in any rolling hour
 *   per container  300 model requests per UTC day
 *
 * WHAT IT CANNOT DO. The map lives in one process. Two replicas each get their
 * own 300, and a restart resets both. The per-client key is the first entry of
 * `x-forwarded-for`, which a client can set to anything, so the per-client cap
 * is a courtesy against honest visitors. The global cap is the real ceiling.
 */

export const DEMO_LIMIT_MESSAGE =
  'Demo limit reached, try again later or contact khademi@veresk.se';

export const DEMO_PER_CLIENT_PER_HOUR = 15;
export const DEMO_GLOBAL_PER_DAY = 300;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface DemoLimitConfig {
  perClientPerHour: number;
  globalPerDay: number;
  /** Epoch milliseconds. Injected so the self-test can move time. */
  now: () => number;
}

export type DemoLimitResult =
  | { ok: true }
  | {
      ok: false;
      status: 429;
      error: string;
      scope: 'client' | 'global';
      retryAfterSeconds: number;
    };

export interface DemoLimiter {
  admit(clientId: string): DemoLimitResult;
}

export function createDemoLimiter(
  config: Partial<DemoLimitConfig> = {},
): DemoLimiter {
  const perClient = config.perClientPerHour ?? DEMO_PER_CLIENT_PER_HOUR;
  const globalCap = config.globalPerDay ?? DEMO_GLOBAL_PER_DAY;
  const now = config.now ?? Date.now;

  let day = '';
  let dayCount = 0;
  const hits = new Map<string, number[]>();

  function rollDay(t: number): void {
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      dayCount = 0;
    }
  }

  /** Forget clients whose whole hour has passed. Keeps the map bounded. */
  function sweep(t: number): void {
    if (hits.size < 1000) return;
    for (const [id, stamps] of hits) {
      if (!stamps.length || t - stamps[stamps.length - 1] >= HOUR_MS) hits.delete(id);
    }
  }

  return {
    admit(clientId) {
      const t = now();
      rollDay(t);
      sweep(t);

      if (dayCount >= globalCap) {
        const tomorrow = Math.floor(t / DAY_MS + 1) * DAY_MS;
        return {
          ok: false,
          status: 429,
          error: DEMO_LIMIT_MESSAGE,
          scope: 'global',
          retryAfterSeconds: Math.ceil((tomorrow - t) / 1000),
        };
      }

      const recent = (hits.get(clientId) ?? []).filter((x) => t - x < HOUR_MS);
      if (recent.length >= perClient) {
        hits.set(clientId, recent);
        return {
          ok: false,
          status: 429,
          error: DEMO_LIMIT_MESSAGE,
          scope: 'client',
          retryAfterSeconds: Math.ceil((recent[0] + HOUR_MS - t) / 1000),
        };
      }

      recent.push(t);
      hits.set(clientId, recent);
      dayCount += 1;
      return { ok: true };
    },
  };
}

const SHARED = Symbol.for('@fde/guard/demo-limiter');

/**
 * One limiter per process, stored on globalThis. A module-level `let` is not
 * enough: route chunks can each bundle their own copy of this module, and each
 * copy would then grant its own 300 a day.
 */
export function sharedDemoLimiter(): DemoLimiter {
  const g = globalThis as unknown as Record<symbol, DemoLimiter | undefined>;
  if (!g[SHARED]) g[SHARED] = createDemoLimiter();
  return g[SHARED];
}

/**
 * The client key: first entry of `x-forwarded-for`, else a shared bucket.
 * The socket address is not reachable from a TanStack server handler, so the
 * fallback is one bucket for every header-less caller. Container Apps always
 * sets the header, so in deployment the fallback is not reached.
 */
export function clientIdFrom(headers: { get(name: string): string | null }): string {
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (first || 'unknown').slice(0, 64);
}
