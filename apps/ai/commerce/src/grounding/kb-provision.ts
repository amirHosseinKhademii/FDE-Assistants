/**
 * `pnpm commerce:kb-provision` — the policy index's database, and the one role
 * that may read it. Idempotent; run it before AND after an ingest (`kb:build`).
 *
 * WHY A ROLE AND NOT A URL. The MCP server's defining property is that it holds
 * no credential that can change anything: a base URL, a service token, and —
 * from Step 9 — the URL of an index it can only read (PLAN.md §4.1–4.2). The
 * estate's admin URL creates and drops all five databases; deriving the index
 * URL from it, as pharma's `urlFor(KB_DB)` does, would hand the MCP process that
 * power under a different name. So the index gets:
 *
 *   a database   `thb_kb` on the commerce Neon project — not one of the five
 *   a role       `thb_kb_reader`: LOGIN, CONNECT on thb_kb, USAGE on its public
 *                schema, SELECT on KB_TABLE. Nothing else — no TEMP, no CREATE
 *   a variable   COMMERCE_KB_URL, written to the repo-root `.env` by this script
 *                and never printed. The MCP process reads it; nothing else does.
 *
 * `commerce:kb-check` then PROVES the role cannot write, rather than trusting the
 * GRANT statements below: it attempts an INSERT, a CREATE TABLE and a CREATE
 * TEMP TABLE as the reader and requires each to be refused.
 *
 * NOTHING HERE PRINTS A SECRET. Output names databases, roles and variables;
 * the password is generated here, written to `.env`, and goes nowhere else.
 *
 *   --rotate   issue the reader a new password even if `.env` already has one
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { REPO_ROOT, adminUrl, urlFor } from '../config/connections';
import { KB_DB, KB_READER_ROLE, KB_TABLE } from './kb';

const ENV_FILE = resolve(REPO_ROOT, '.env');
const VAR = 'COMMERCE_KB_URL';
const rotate = process.argv.includes('--rotate');

/** `adminUrl()` pointed at another database on the same (direct) endpoint. */
function adminOn(db: string): string {
  const u = new URL(adminUrl());
  u.pathname = `/${db}`;
  return u.toString();
}

async function withClient<T>(url: string, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

/** Identifiers here are constants from kb.ts, never input — asserted, not assumed. */
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`refusing an unsafe identifier: ${name}`);
  return name;
}

function envHas(name: string): boolean {
  if (!existsSync(ENV_FILE)) return false;
  return new RegExp(`^${name}=.+$`, 'm').test(readFileSync(ENV_FILE, 'utf8'));
}

/** Replace or append `NAME=value` in `.env`. The value is never echoed. */
function writeEnv(name: string, value: string): void {
  const body = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
  const line = `${name}=${value}`;
  const next = new RegExp(`^${name}=.*$`, 'm').test(body)
    ? body.replace(new RegExp(`^${name}=.*$`, 'm'), () => line)
    : `${body.replace(/\n?$/, '\n')}# Read-only URL for the Thornbury policy index (thb_kb) — see kb-provision.ts.\n${line}\n`;
  writeFileSync(ENV_FILE, next);
}

/** The pooled estate URL with the reader's credentials and the index's database. */
function readerUrl(password: string): string {
  const u = new URL(urlFor(KB_DB));
  u.username = KB_READER_ROLE;
  u.password = encodeURIComponent(password);
  return u.toString();
}

async function main(): Promise<void> {
  const db = ident(KB_DB);
  const role = ident(KB_READER_ROLE);
  const table = ident(KB_TABLE);

  // 1. The database. CREATE DATABASE cannot run in a transaction or through the
  //    pooler, which is why this is the DIRECT admin endpoint.
  const created = await withClient(adminUrl(), async (c) => {
    const { rowCount } = await c.query('select 1 from pg_database where datname = $1', [db]);
    if (rowCount) return false;
    await c.query(`create database ${db}`);
    return true;
  });
  console.log(`  database  ${db}: ${created ? 'CREATED' : 'exists'}`);

  // 2. The extension, and the role. CREATE ROLE is the step that was unmeasured
  //    for this Neon project; if it throws, this script stops here and says so.
  const needPassword = rotate || !envHas(VAR);
  let password: string | null = null;
  await withClient(adminOn(db), async (c) => {
    await c.query('create extension if not exists vector');
    const { rowCount } = await c.query('select 1 from pg_roles where rolname = $1', [role]);
    if (!rowCount || needPassword) password = randomBytes(24).toString('base64url');
    if (!rowCount) {
      try {
        await c.query(
          `create role ${role} login nosuperuser nocreatedb nocreaterole noreplication password '${password}'`,
        );
      } catch (e) {
        throw new Error(
          `CREATE ROLE was refused on this Neon project (${(e as Error).message}). ` +
            'Stopping: the fallback — giving the MCP server the admin URL — is exactly ' +
            'what this role exists to prevent. A separate project needs Byron.',
        );
      }
      console.log(`  role      ${role}: CREATED (login, no superuser/createdb/createrole)`);
    } else if (password) {
      await c.query(`alter role ${role} with password '${password}'`);
      console.log(`  role      ${role}: exists — password ROTATED`);
    } else {
      console.log(`  role      ${role}: exists — password kept (${VAR} already set; --rotate to reissue)`);
    }

    // 3. Privileges: take everything from PUBLIC on this database, then give the
    //    reader exactly what a query needs. REVOKE ALL removes PUBLIC's default
    //    CONNECT and TEMP; the owner is unaffected.
    await c.query(`revoke all on database ${db} from public`);
    await c.query(`grant connect on database ${db} to ${role}`);
    await c.query('revoke create on schema public from public');
    await c.query(`grant usage on schema public to ${role}`);
    const { rowCount: hasTable } = await c.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
      [table],
    );
    if (hasTable) {
      await c.query(`grant select on table ${table} to ${role}`);
      console.log(`  grants    CONNECT ${db} · USAGE public · SELECT ${table} — and nothing else`);
    } else {
      console.log(`  grants    CONNECT ${db} · USAGE public — ${table} does not exist yet; ingest, then run this again`);
    }
  });

  // 4. The URL, into `.env`, unprinted.
  if (password) {
    writeEnv(VAR, readerUrl(password));
    console.log(`  env       ${VAR} written to .env (value not shown)`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(`\nkb-provision FAILED: ${(e as Error).message}\n`);
  process.exit(1);
});
