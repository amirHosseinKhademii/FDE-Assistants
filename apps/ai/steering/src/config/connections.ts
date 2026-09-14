/**
 * One base URL in, four named databases out.
 *
 * The reasoning is `packages/pharma/src/config/connections.ts`'s, unchanged and
 * deliberately not re-argued: four env vars would be four chances to point one
 * at the wrong project, and deriving them from a single base makes "all four,
 * or none" the only reachable state.
 *
 * THREE THINGS LIFTED FROM PHARMA BECAUSE THEY COST SOMEBODY TIME THERE:
 *
 *   1. `CREATE DATABASE` cannot run through pgbouncer — it is not transactional
 *      and the pooler rejects it with a message about transaction blocks that
 *      says nothing about poolers. `direct()` strips `-pooler` and is used by
 *      create/drop only.
 *   2. `import pg from 'pg'` COMPILES and is `undefined` at runtime, because the
 *      shared tsconfig sets `allowSyntheticDefaultImports` (a type-level
 *      permission) but not `esModuleInterop` (the runtime shim). Named imports
 *      only, everywhere.
 *   3. Paths resolve from THIS FILE, never `process.cwd()` — cwd is the repo
 *      root under a root script and the package dir under a workspace filter.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { redactedConnectionString } from '@fde/grounding';

/** Two levels up from `src/config/` or `dist/config/` — the package root in both. */
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

export interface System {
  /** The database name. */
  readonly db: string;
  readonly label: string;
  /** The vendor a customer would actually have bought. Documentation, not code. */
  readonly standsFor: string;
  /** The DDL file under `db/schema/`, applied to this database and no other. */
  readonly schema: string;
}

/**
 * The four systems, IN SEEDING ORDER, and the order is not cosmetic.
 *
 * `vst_crm` holds the customers and programmes that everything else references;
 * `vst_pmo` references everything and is referenced by nothing. Loading in this
 * order means a partial load leaves soft keys dangling in ONE direction only,
 * which is a diagnosable state rather than a puzzle.
 *
 * Why four databases plus a file corpus, and not six (pharma) or three (the brief's SYS.1/2/3): see
 * `docs/steering/PLAN.md` §2. The short version is that SYS.1, SYS.2 and SYS.3
 * live in ONE database with real foreign keys, because in a real Tier-1 they
 * live in one tool and because the customer-requirement → system-requirement
 * edge is the spine of every coverage answer — it is the last edge that should
 * be a string nobody checks.
 */
export const SYSTEMS: readonly System[] = [
  { db: 'vst_crm', label: 'customers & programmes', standsFor: 'Salesforce', schema: '01-crm.sql' },
  { db: 'vst_plm', label: 'hardware', standsFor: 'Windchill / Teamcenter', schema: '02-plm.sql' },
  { db: 'vst_alm', label: 'requirements & architecture', standsFor: 'Codebeamer / Polarion / DOORS', schema: '03-alm.sql' },
  { db: 'vst_pmo', label: 'effort & cost actuals', standsFor: 'SAP / Clarity', schema: '04-pmo.sql' },
];

export const DB_NAMES = SYSTEMS.map((s) => s.db);

/**
 * THE SOFTWARE IS NOT ONE OF THEM, AND THAT IS THE MOST IMPORTANT LINE HERE.
 *
 * An earlier draft made `vst_scm` a fifth database with tidy `commits`,
 * `functions` and `function_params` tables. That is not what a code base is.
 * Nobody's software estate arrives as normalised rows — it arrives as a REPO:
 * C files with the parameter block in a comment, a CHANGELOG somebody stopped
 * updating, a `git log` dump, release notes in prose, a ticket export that was
 * dumped out of Jira with embedded commas.
 *
 * Modelling it as SQL would have quietly pre-solved the hardest part of the
 * job. `SWC-DAMP.asil = 'B'` as a column is a comparison; "developed to ASIL B"
 * buried in the third paragraph of a safety assessment is reading
 * comprehension, and reading comprehension is what the grounding pillar is for.
 *
 * So the software lives in `docs/steering/corpus/` as files, generated by
 * `pnpm steering:corpus`, and is chunked and searched rather than queried —
 * exactly as the insurance policy wordings are. See `db/seed/corpus.ts`.
 */
export const CORPUS_SYSTEM = 'the code base — files, not a database';

/**
 * `vst_derived` — THE FIFTH DATABASE, AND IT IS OURS.
 *
 * NAMED FOR WHAT IT HOLDS, after a spell called `vst_kb`. That was short for
 * "knowledge base", an abbreviation that appeared in a database name, a
 * directory, eleven scripts and four documents without once being spelled out.
 * It also sat in a list beside `vst_crm`, `vst_plm`, `vst_alm` and `vst_pmo` —
 * real acronyms a steering supplier would recognise — which made an invented
 * one look like a fifth thing they were supposed to know.
 *
 * `derived` is longer and says the whole story: everything in here was DERIVED
 * from the customer's documents. The other four were given to us.
 *
 * `SYSTEMS` above is the CUSTOMER's estate — four systems Vantis bought from
 * four vendors. `vst_derived` is not one of them. It is what WE build: the parsed
 * rows, the chunks, the extracted facts and their provenance, derived from
 * `docs/steering/corpus/` and from nothing else.
 *
 * IT IS DELIBERATELY NOT A MEMBER OF `SYSTEMS`, and the reason is a scar rather
 * than a preference. `db:drop` and `db:reset` iterate `SYSTEMS`; pharma put its
 * index inside the estate and a routine reset destroyed it without a word. A
 * fifth entry in that array would reproduce that failure exactly.
 *
 * The other tempting shortcut — reaching `vst_derived` by loosening `assertOurs` —
 * would delete the guard that stops a mistyped base URL from dropping somebody
 * else's estate. So `assertOurs` is left alone and this gets its own accessor,
 * its own DDL, and its own create/migrate/drop that iterate nothing.
 *
 * See `docs/steering/SORTING.md`.
 */
export const DERIVED_DB = 'vst_derived';
export const DERIVED_SCHEMA = '05-derived.sql';

/** The connection to our own database. Never reachable through `urlFor`. */
export function derivedUrl(): string {
  const u = new URL(base());
  u.pathname = `/${DERIVED_DB}`;
  return withSsl(u).toString();
}

/**
 * The one database name this package may never touch.
 *
 * `db:drop` iterates `SYSTEMS`, so the guard below is what stops a mistyped
 * base URL from dropping the pharma estate or the insurance one. Pharma learned
 * the same lesson from the other side: its grounding probe created tables
 * inside a record database and `db:reset` destroyed them without a word.
 */
export function assertOurs(name: string): void {
  if (name === DERIVED_DB) {
    // Not an accident worth a generic message: something iterated the estate
    // and found our index in it, which is the failure this design exists to
    // prevent. Say so by name.
    throw new Error(
      `${DERIVED_DB} is OUR database, not part of the customer estate. Estate scripts ` +
        `(create/migrate/drop/seed/check) must never touch it — use derived:* instead. ` +
        `See docs/steering/SORTING.md.`,
    );
  }
  if (!DB_NAMES.includes(name)) {
    throw new Error(
      `${name} is not a Vantis database. This package may only touch ${DB_NAMES.join(', ')}.`,
    );
  }
}

function base(): string {
  const raw = process.env.STEERING_DATABASE_URL;
  if (!raw) {
    throw new Error(
      'STEERING_DATABASE_URL is not set. It is the base URL for the four Vantis ' +
        'databases — see .env.example and docs/steering/PLAN.md §11 step S1.',
    );
  }
  return raw;
}

/** Is the base URL present? For `env:check`, which must not throw. */
export function haveBase(): boolean {
  return Boolean(process.env.STEERING_DATABASE_URL);
}

/**
 * SSL mode, stated rather than left to be interpreted.
 *
 * `pg` currently treats `sslmode=require` as an alias for `verify-full`, warns
 * loudly about it on every connection, and will change the meaning in pg v9 to
 * the weaker libpq semantics. Two things wrong with leaving that alone:
 *
 *   1. The warning is eight lines and it lands in the MIDDLE of the output of
 *      any script that connects — it interrupted step 1 of `walk-cost` between
 *      its heading and its first result. A tool nobody can read the output of
 *      is a tool nobody uses.
 *   2. More seriously, a future pg upgrade would SILENTLY WEAKEN the connection
 *      from a verified certificate to an unverified one, with no warning at
 *      that point because the string would not have changed.
 *
 * Both are fixed by saying which one we mean. `verify-full` was verified to
 * connect to the Neon endpoint against the system CA store before this was
 * changed — it is the current behaviour made explicit, not a new one.
 *
 * NOT suppressed with NODE_NO_WARNINGS, which was the tempting one-liner. That
 * would have hidden the second problem along with the first.
 */
function withSsl(u: URL): URL {
  if (u.searchParams.has('sslmode')) u.searchParams.set('sslmode', 'verify-full');
  return u;
}

/** The base URL with its database name swapped for `name`. */
export function urlFor(name: string): string {
  const u = new URL(base());
  u.pathname = `/${name}`;
  return withSsl(u).toString();
}

/** The same URL against the non-pooled endpoint. Create/drop only — see the header. */
export function direct(url: string): string {
  return url.replace('-pooler.', '.');
}

/** The admin connection: the base database, direct, used to CREATE/DROP. */
export function adminUrl(): string {
  return direct(withSsl(new URL(base())).toString());
}

/**
 * The ONLY form of a connection string that may be printed.
 *
 * A WRAPPER, NOT A RE-EXPORT, and pharma's comment explains why in a sentence
 * worth repeating: `@fde/grounding`'s version defaults its argument to
 * grounding's OWN env lookup, which resolves to the insurance database. A bare
 * re-exported `redact()` would compile and quietly print a different customer's
 * credentials.
 */
export function redact(url: string): string {
  return redactedConnectionString(url);
}
