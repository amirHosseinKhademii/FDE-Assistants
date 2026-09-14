/**
 * One base URL in, six named databases out.
 *
 * WHY A MAP AND NOT SIX ENV VARS. The six systems are siblings on one Neon
 * branch: same host, same role, different database name. Six variables would
 * be six chances to point one of them at the wrong project — and the one that
 * matters is the insurance project, which has real work in it. Deriving them
 * from a single base makes "all six, or none" the only reachable state.
 *
 * THE POOLER CAVEAT IS NOT A FOOTNOTE. `CREATE DATABASE` cannot run through
 * pgbouncer: it is not transactional and the pooler rejects it. So `direct()`
 * strips `-pooler` from the host and is used by create/drop only. Everything
 * else goes through the pooled endpoint, which is what a deployed app would
 * use. Getting this wrong fails with a message about transaction blocks that
 * tells you nothing about poolers.
 *
 * A NOTE ON HOW `pg` IS IMPORTED IN THIS PACKAGE, because it cost a confusing
 * half-hour. The shared tsconfig sets `allowSyntheticDefaultImports` but NOT
 * `esModuleInterop`: the first is a type-level permission, the second is the
 * runtime shim. So `import pg from 'pg'` COMPILES CLEANLY and is `undefined`
 * when it runs — `Cannot read properties of undefined (reading 'Client')`.
 * Named imports (`import { Client } from 'pg'`) work under both, which is why
 * every file here and in `@fde/grounding` uses them.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { redactedConnectionString } from '@fde/grounding';

/**
 * Resolved from THIS FILE, never from `process.cwd()`.
 *
 * The same reasoning as `packages/insurance/src/config/paths.ts`: cwd is
 * wherever the process was started — the repo root under `pnpm db:seed`, the
 * package directory under a workspace filter — and a path that depends on where
 * you were standing is a bug waiting for a deployment. Two levels up from
 * `src/config/` or `dist/config/` is the package root in both cases, which is
 * why one expression works built and unbuilt.
 */
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');

/** The workspace root, where the single shared `.env` lives. */
/**
 * The workspace root — where the single shared `.env` lives.
 *
 * FOUND BY WALKING UP, NOT BY COUNTING `..`. It used to be
 * `resolve(PACKAGE_ROOT, '..', '..')`, which encoded "this package sits two
 * levels below the root" — true at `packages/{name}`, false the moment it moved
 * to `apps/ai/{name}`, and WRONG IN SILENCE: `.env` simply would not be found,
 * `dotenv` reports nothing, and the first symptom is a connection string that
 * is undefined three layers away.
 *
 * `pnpm-workspace.yaml` is the thing that actually defines the root, so look
 * for it. A move cannot break this, and if one ever does it throws here with
 * the path it searched instead of failing somewhere else.
 */
function findWorkspaceRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    // NOT FOUND IS A NORMAL STATE, AND MAKING IT FATAL BROKE PRODUCTION.
    //
    // This threw for one day. `pnpm deploy` builds a STANDALONE directory —
    // /app holds dist, node_modules and package.json and nothing else, no
    // workspace file — so the throw fired on the first import inside the
    // container. `GET /` served static and passed; `GET /desk` touched this
    // module and returned 500, and the deploy gate failed on exactly that.
    //
    // There is no `.env` in a container either, and there should not be:
    // configuration arrives as real environment variables. So a missing
    // workspace root is not an error to report, it is the deployed case. Fall
    // back to where the package sits and let `dotenv` find nothing, which is
    // what it did for a year before any of this.
    if (up === dir) return resolve(from, '..', '..');
    dir = up;
  }
}

export const REPO_ROOT = findWorkspaceRoot(PACKAGE_ROOT);

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

/**
 * The six systems, in dependency order for seeding.
 *
 * The order is not cosmetic: `mrd_reg` and `mrd_hcm` hold the things everything
 * else points AT (procedures, people), so they are written first and a dangling
 * soft key is then a bug in one direction only.
 */
export interface System {
  /** The database name. Also the only name `assertOurs` will accept. */
  readonly db: string;
  readonly label: string;
  /** The DDL file under `db/schema/`, applied to this database and no other. */
  readonly schema: string;
}

export const SYSTEMS: readonly System[] = [
  { db: 'mrd_reg', label: 'standards & policies', schema: '06-reg.sql' },
  { db: 'mrd_hcm', label: 'personnel & departments', schema: '03-hcm.sql' },
  { db: 'mrd_erp', label: 'products & materials', schema: '01-erp.sql' },
  { db: 'mrd_mes', label: 'facilities & manufacturing', schema: '02-mes.sql' },
  { db: 'mrd_qms', label: 'quality', schema: '04-qms.sql' },
  { db: 'mrd_tms', label: 'distribution & fleet', schema: '05-tms.sql' },
];

/**
 * The knowledge base — OUTSIDE `SYSTEMS`, and that is the whole point of it.
 *
 * `db:drop` iterates `SYSTEMS`, so anything living in one of the six record
 * databases is in the path of every `pnpm db:reset`. The `documents` tables the
 * grounding probe created inside `mrd_reg` were destroyed exactly that way,
 * without a word — which is a good demonstration of why the index does not
 * belong there.
 *
 * The boundary it draws is also the right one on its own terms. The six are the
 * CUSTOMER'S systems of record, which we read and never invent. `mrd_kb` is
 * OURS. Losing it never costs the company; losing `mrd_qms` does.
 *
 * IT IS NO LONGER ALL DISPOSABLE, and this paragraph used to say it was. The
 * chunk index still is — rebuildable from the documents by one `pnpm ingest`.
 * `ask_history` is not: it records what was asked on the web surface and what
 * came back, and nothing can reconstruct a question nobody wrote down. It lives
 * here because it is ours and because `db:drop` cannot reach it, not because it
 * is cheap to lose. Its DDL and the reasoning are in
 * `apps/veresk-app/src/server/ask-history.ts`; there is no retention rule yet.
 */
export const KB_DB = 'mrd_kb';

/**
 * Every database this package may touch — the six systems plus the knowledge
 * base. `SYSTEMS` answers "which are the record systems"; this answers "is this
 * one of ours", which is the question the drop guard asks.
 */
export const DB_NAMES = [...SYSTEMS.map((s) => s.db), KB_DB];

function base(): string {
  const raw = process.env.PHARMA_DATABASE_URL;
  if (!raw) {
    throw new Error(
      'PHARMA_DATABASE_URL is not set. It is the base URL for the six Meridian ' +
        'databases — see .env.example and docs/PHARMA-PLAN.md.',
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

/** The admin connection: the base database, direct, used to CREATE/DROP. */
export function adminUrl(): string {
  return direct(base());
}

/**
 * The ONLY form of a connection string that may be printed.
 *
 * This WAS a copy of `@fde/grounding`'s `redactedConnectionString` — same regex,
 * byte for byte, with a comment admitting the lift. That function exists because
 * a live Neon password once reached a terminal from a one-liner that had drifted
 * out of step with its neighbours, so keeping a second copy was reproducing the
 * exact hazard the original documents. Now it calls the original.
 *
 * IT IS A WRAPPER, NOT A RE-EXPORT, AND THAT IS THE POINT. The package version
 * defaults its argument to `connectionString()` — grounding's OWN env lookup,
 * which resolves to the insurance database. Re-exporting it would let a bare
 * `redact()` compile and quietly print the wrong customer's credentials. That
 * failure mode is not hypothetical: `corpus:load` wrote into the insurance
 * database and pruned 79 rows because one call site didn't forward a connection
 * string it was supposed to. Here the argument is required, so it can't happen.
 *
 * Host and database survive redaction, because the whole point of printing it is
 * to see which cluster you are about to rebuild.
 */
export function redact(url: string): string {
  return redactedConnectionString(url);
}

/** Guard: refuse to operate on anything that is not one of ours. */
export function assertOurs(name: string): void {
  if (!DB_NAMES.includes(name)) {
    throw new Error(
      `Refusing to touch database "${name}" — not one of the six Meridian ` +
        `databases (${DB_NAMES.join(', ')}). This guard exists so a drop can ` +
        `never reach neondb.`,
    );
  }
}
