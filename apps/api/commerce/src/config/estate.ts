/**
 * WHERE THE FIVE DATABASES ARE. The only file that turns one environment
 * variable into five connection strings.
 *
 * FIVE REAL DATABASES, NOT FIVE SCHEMAS — settled empirically by
 * fde-assistants-2d on 2026-09-18 rather than assumed. The estate URL in the
 * repo root `.env` is Neon's POOLED endpoint, and `packages/estate/src/estate.ts`
 * warns that `CREATE DATABASE` cannot run through pgbouncer. That warning is
 * about the POOLED HOST only: dropping `-pooler` from the hostname gives the
 * direct endpoint, where `create database` succeeds. So the five-database layout
 * PLAN.md §2.1 asks for is reachable, and there is no deviation to record.
 *
 * Every table lives in `public` of its OWN database. There is no `search_path`
 * and no schema qualifier anywhere in this app — if you find yourself writing
 * `thb_shop.orders` as a qualified name, something has gone wrong.
 *
 * THE DIRECT ENDPOINT IS CREATE/DROP-ONLY and must never be what the API dials.
 * That is not a style rule: the pooled endpoint is what keeps five pools from
 * becoming five times the connection count against a database that meters them.
 * `assertNotTheAdminEndpoint` below is the enforcement, and it is written as an
 * EQUALITY against the declared admin URL rather than a hostname pattern,
 * because a check that greps for `-pooler` encodes Neon into an app that should
 * not know who hosts it.
 */

/** The five source systems, in the order PLAN.md §2.1 lists them. */
export const SYSTEMS = ['shop', 'wms', 'fleet', 'crm', 'policy'] as const;

export type SystemName = (typeof SYSTEMS)[number];

/** The database each system's tables live in. */
export const DATABASE_NAME: Record<SystemName, string> = {
  shop: 'thb_shop',
  wms: 'thb_wms',
  fleet: 'thb_fleet',
  crm: 'thb_crm',
  policy: 'thb_policy',
};

/** What a system stands for, for `/health` and for error text. */
export const STANDS_FOR: Record<SystemName, string> = {
  shop: 'storefront and order management',
  wms: 'warehouse management',
  fleet: 'transport and telematics',
  crm: 'contact centre',
  policy: 'policy and configuration store',
};

export class EstateConfigError extends Error {}

/**
 * Refuse to serve rather than quietly dial the admin endpoint.
 *
 * Same shape of reasoning as `@fde/guard`: a misconfiguration must reduce what
 * happens, never silently widen it.
 */
function assertNotTheAdminEndpoint(base: string, env: NodeJS.ProcessEnv): void {
  const direct = (env.ECOMMERCE_DB_DIRECT_URL ?? '').trim();
  if (direct && direct === base) {
    throw new EstateConfigError(
      'ECOMMERCE_DB_URL is the same as ECOMMERCE_DB_DIRECT_URL. The direct ' +
        'endpoint exists to create and drop databases; the API must use the ' +
        'pooled one. Refusing to start.',
    );
  }
}

/** The one variable this app reads for data. Throws rather than defaulting. */
export function estateBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.ECOMMERCE_DB_URL ?? '').trim();
  if (!base) {
    throw new EstateConfigError(
      'ECOMMERCE_DB_URL is not set. Note the spelling — it is E-commerce, not ' +
        'COMMERCE. Under Turbo, also check `globalEnv` in turbo.json: strict ' +
        'environment mode strips variables that are not declared there, and a ' +
        'stripped variable looks exactly like an unset one.',
    );
  }
  assertNotTheAdminEndpoint(base, env);
  return base;
}

/**
 * One system's connection string: the estate URL with the database name swapped.
 *
 * Query parameters are preserved deliberately — `sslmode` and `channel_binding`
 * are on the base URL and dropping them would downgrade the connection while
 * everything still appeared to work.
 */
export function systemUrl(
  system: SystemName,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const url = new URL(estateBaseUrl(env));
  url.pathname = `/${DATABASE_NAME[system]}`;
  return url.toString();
}

/** All five, for `/health` and for the checks. */
export function allSystemUrls(
  env: NodeJS.ProcessEnv = process.env,
): Record<SystemName, string> {
  return Object.fromEntries(
    SYSTEMS.map((s) => [s, systemUrl(s, env)]),
  ) as Record<SystemName, string>;
}
