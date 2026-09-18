/**
 * One base URL in, five named databases out.
 *
 * WHY A MAP AND NOT FIVE ENV VARS. The reasoning is
 * `apps/ai/pharma/src/config/connections.ts`'s, unchanged and deliberately not
 * re-argued: five variables would be five chances to point one of them at the
 * wrong project, and deriving them from a single base makes "all five, or none"
 * the only reachable state. What is new here is `assertNotAnotherEngagement`,
 * because this repo now has five estates on four Neon projects and "the wrong
 * project" has stopped being hypothetical.
 *
 * FIVE DATABASES, NOT FIVE SCHEMAS — and that was settled by running it, not by
 * reading. `CREATE DATABASE` cannot run through pgbouncer: it is not
 * transactional and the pooler refuses it with a message about transaction
 * blocks that says nothing about poolers, which is written down in
 * `packages/estate/src/estate.ts` and is the kind of thing that costs an hour.
 * The escape is that the caveat is about the POOLED HOST, not about Neon: strip
 * `-pooler` from the hostname and the direct endpoint takes `CREATE DATABASE`
 * happily. Verified on this project on 2026-09-18 by creating and dropping a
 * probe database. So the plan's five-database layout is reachable and there is
 * no deviation to record.
 *
 * TWO THINGS LIFTED FROM PHARMA BECAUSE THEY COST SOMEBODY TIME THERE:
 *
 *   1. `import pg from 'pg'` COMPILES and is `undefined` at runtime, because
 *      the shared tsconfig sets `allowSyntheticDefaultImports` (a type-level
 *      permission) but not `esModuleInterop` (the runtime shim). Named imports
 *      only, everywhere.
 *   2. Paths resolve from THIS FILE, never `process.cwd()` — cwd is the repo
 *      root under a root script and the package directory under a workspace
 *      filter, and a path that depends on where you were standing is a bug
 *      waiting for a deployment.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { redactedConnectionString } from '@fde/grounding';

/** Two levels up from `src/config/` or `dist/config/` — the package root in both. */
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/**
 * The workspace root — where the single shared `.env` lives.
 *
 * FOUND BY WALKING UP, NOT BY COUNTING `..`, for the reason pharma's copy
 * records: `resolve(PACKAGE_ROOT, '..', '..')` encodes "this package sits two
 * levels below the root", which is false at `apps/ai/{name}` and wrong IN
 * SILENCE — `dotenv` reports nothing and the first symptom is a connection
 * string that is undefined three layers away.
 *
 * A missing workspace file is a NORMAL state, not an error: `pnpm deploy`
 * builds a standalone directory with no workspace file in it, and there is no
 * `.env` in a container either. Fall back rather than throw.
 */
function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..');
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(PACKAGE_ROOT);

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

/**
 * The five source systems, in dependency order for seeding.
 *
 * THE ORDER IS NOT COSMETIC. `thb_shop` holds the users and orders that
 * everything else points AT, and `thb_policy` is configuration that points at
 * nothing, so they bracket the list. Write the pointed-at systems first and a
 * dangling soft key is then a bug in one direction only, which halves the
 * search when `db:check` reports one.
 */
export interface System {
  /** The database name. Also the only name `assertOurs` will accept. */
  readonly db: string;
  readonly label: string;
  /** The DDL file under `db/schema/`, applied to this database and no other. */
  readonly schema: string;
}

export const SYSTEMS: readonly System[] = [
  { db: 'thb_policy', label: 'policy & config store', schema: '05-policy.sql' },
  { db: 'thb_shop', label: 'storefront & OMS', schema: '01-shop.sql' },
  { db: 'thb_wms', label: 'warehouse management', schema: '02-wms.sql' },
  { db: 'thb_fleet', label: 'transport & telematics', schema: '03-fleet.sql' },
  { db: 'thb_crm', label: 'contact centre', schema: '04-crm.sql' },
];

/** Every database this package may touch. The question `db:drop` asks. */
export const DB_NAMES = SYSTEMS.map((s) => s.db);

/**
 * The OTHER engagements' estates, by database name.
 *
 * Not a list of things to avoid touching — `assertOurs` already refuses
 * everything that is not one of the five. This exists so `env:check` can say
 * WHICH estate a mistyped URL landed on, because "thb_shop is not a Thornbury
 * database" is a confusing thing to read when the real mistake was pointing the
 * base URL at Vantis. PLAN.md §11's negative control is exactly this: point the
 * shop URL at `vst_derived` and the check must refuse.
 */
export const FOREIGN_DATABASES: Readonly<Record<string, string>> = {
  mrd_reg: 'Meridian Pharma', mrd_hcm: 'Meridian Pharma', mrd_erp: 'Meridian Pharma',
  mrd_mes: 'Meridian Pharma', mrd_qms: 'Meridian Pharma', mrd_tms: 'Meridian Pharma',
  mrd_kb: 'Meridian Pharma',
  vst_crm: 'Vantis Steering', vst_plm: 'Vantis Steering', vst_alm: 'Vantis Steering',
  vst_pmo: 'Vantis Steering', vst_derived: 'Vantis Steering',
};

/** The other engagements' base URLs, by env var. Read only to compare hosts. */
export const FOREIGN_URL_VARS = [
  'DATABASE_URL',
  'PHARMA_DATABASE_URL',
  'STEERING_DATABASE_URL',
  'SAFETY_DATABASE_URL',
] as const;

function base(): string {
  const raw = process.env.ECOMMERCE_DB_URL;
  if (!raw) {
    throw new Error(
      'ECOMMERCE_DB_URL is not set. It is the base URL for the five Thornbury ' +
        'databases — see .env.example and docs/commerce/PLAN.md §2.1. Note the ' +
        'name: ECOMMERCE_DB_URL, not COMMERCE_DATABASE_URL.',
    );
  }
  return raw;
}

/** The base URL with its database name swapped for `name`. */
export function urlFor(name: string): string {
  const u = new URL(base());
  u.pathname = `/${name}`;
  return u.toString();
}

/** The same URL against the non-pooled endpoint. Create/drop only. */
export function direct(url: string): string {
  return url.replace('-pooler.', '.');
}

/**
 * The admin connection: the base database, direct, used to CREATE and DROP.
 *
 * DERIVED, WITH AN OVERRIDE, and the default is the derivation on purpose.
 * Pharma's argument against extra URL variables holds — every one is another
 * chance to point at the wrong project — so `ECOMMERCE_DB_DIRECT_URL` is read
 * only when it is set, for the case where a provider's direct host is not its
 * pooled host minus the suffix. On Neon it is, and that was verified here
 * rather than assumed.
 */
export function adminUrl(): string {
  return process.env.ECOMMERCE_DB_DIRECT_URL || direct(base());
}

/**
 * The ONLY form of a connection string that may be printed.
 *
 * A WRAPPER, NOT A RE-EXPORT, AND THAT IS THE POINT — the same trap pharma
 * documents. `@fde/grounding`'s version defaults its argument to grounding's
 * OWN env lookup, which resolves to the insurance database; re-exporting it
 * would let a bare `redact()` compile and quietly print a different customer's
 * credentials. Here the argument is required, so it cannot happen.
 */
export function redact(url: string): string {
  return redactedConnectionString(url);
}

/** Guard: refuse to operate on anything that is not one of ours. */
export function assertOurs(name: string): void {
  if (!DB_NAMES.includes(name)) {
    const owner = FOREIGN_DATABASES[name];
    throw new Error(
      `Refusing to touch database "${name}" — not one of the five Thornbury ` +
        `databases (${DB_NAMES.join(', ')}).` +
        (owner ? ` That name belongs to ${owner}.` : '') +
        ' This guard exists so a drop can never reach another engagement.',
    );
  }
}

/**
 * Refuse a base URL that points at another engagement.
 *
 * TWO CHECKS, BECAUSE EITHER ALONE PASSES THE OTHER'S FAILURE.
 *
 *   by NAME  — the database in the URL's path. PLAN.md §11's negative control
 *              is "point it at `vst_derived`", which is a NAME on whatever host
 *              you like, so a host-only check waves it through.
 *   by HOST  — the endpoint. The five Thornbury databases do not exist on
 *              another engagement's project, so a URL whose host matches one of
 *              theirs would fail later anyway — but it would fail as "database
 *              thb_shop does not exist", which sends you looking for a missing
 *              database instead of a wrong host.
 *
 * `neondb` is the one name that is allowed through: it is the base database
 * every Neon project starts with and the path component of the base URL, which
 * never names one of the five. It is the admin connection, not an estate.
 */
export function assertNotAnotherEngagement(url: string): void {
  const u = new URL(url);
  const name = u.pathname.replace(/^\//, '');

  const owner = FOREIGN_DATABASES[name];
  if (owner) {
    throw new Error(
      `ECOMMERCE_DB_URL names database "${name}", which belongs to ${owner}. ` +
        'Thornbury\'s five are ' + DB_NAMES.join(', ') + '. Refusing: a create ' +
        'or a drop against this URL would reach another engagement\'s estate.',
    );
  }

  for (const v of FOREIGN_URL_VARS) {
    const other = process.env[v];
    if (!other) continue;
    let host: string;
    try {
      host = new URL(other).host;
    } catch {
      continue;
    }
    if (host === u.host) {
      throw new Error(
        `ECOMMERCE_DB_URL points at the same endpoint as ${v} (${u.host}). ` +
          'Each estate gets its own Neon project so a mistyped base URL cannot ' +
          'reach across and drop another one. Refusing.',
      );
    }
  }
}
