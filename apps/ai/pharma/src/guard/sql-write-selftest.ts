/**
 *   pnpm sql:check
 *
 * Can anything on the ANSWER PATH write to the customer's systems of record?
 * OFFLINE — reads source, touches no database.
 *
 * WHY THIS IS NOT THE INSURANCE GUARD. `@fde/guard` protects an HTTP surface
 * with an API key, and pharma has no HTTP surface yet. Copying it would produce
 * a check that passes by having nothing to check — the worst kind, because the
 * green tick is indistinguishable from a real one.
 *
 * THE PROPERTY THAT MATTERS HERE IS DIFFERENT. The six `mrd_*` databases are the
 * CUSTOMER'S systems of record under GxP. Software that can alter a batch
 * disposition, a training record or an equipment qualification is not a bug — it
 * is a regulatory event, and the remediation is an audit rather than a patch.
 * The answer path is read-only TODAY because nobody wrote an INSERT. That is
 * construction, and construction changes. An assertion does not.
 *
 * SO: every SQL string reachable from `tools/`, `agent/`, `cli/`, `eval/` and
 * `guard/` must be a read. `db/` is deliberately EXEMPT — building and seeding
 * the estate is exactly what it is for, and a rule that forbade writes there
 * would forbid the thing itself.
 *
 * THE GUARANTEE IS SOURCE-LEVEL, AND SAYING SO IS PART OF IT. This proves no
 * write is WRITTEN, not that the database would refuse one. The real control is
 * a read-only Postgres role on the answer path's connection string, which the
 * estate does not have yet — logged in NEXT.md rather than implied by a green
 * tick here.
 *
 * A SECOND SCOPE, ADDED 2026-09-12, AND THE HOLE THAT FORCED IT. The web
 * surface gained one genuine write — `ask_history`, the record of what was asked
 * on the page and what came back. It lives in `apps/veresk-app/` precisely
 * BECAUSE this scan does not reach there: a `packages/pharma/src/history/`
 * holding it would have passed silently, since the walk below takes seven named
 * directories plus loose files and does not recurse into new ones.
 *
 * But "outside the scope" is not the same as "safe", and for a day it was the
 * only argument on offer. The argument that actually holds is about the
 * CONNECTION: that file resolves `urlFor(KB_DB)` and never touches
 * `tools/utils/handle.ts`, so a write physically cannot reach one of the six
 * however it is later edited. That was true and nothing asserted it — one
 * character changed to `urlFor('mrd_qms')` and every check in this repo stayed
 * green. So the second scope below checks exactly that property, with its own
 * plants: rule 20 says a checker never seen to fire is one you cannot read a
 * green tick from, and an argument never seen to fail is the same thing.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { walkSources, executableLines } from '@fde/scanner';
import { resolve } from 'node:path';
import { PACKAGE_ROOT, REPO_ROOT } from '../config/connections';

const SRC = resolve(PACKAGE_ROOT, 'src');

/** Directories whose SQL must be read-only. `db/` is absent on purpose. */
const ANSWER_PATH = ['tools', 'agent', 'cli', 'eval', 'guard', 'schema', 'telemetry'];

/**
 * ...AND the loose files directly in `src/`.
 *
 * THIS WAS A HOLE. The scan walked seven named directories, so a module sitting
 * at the root of `src/` was never read — and `src/directory.ts`, which the web
 * app calls to list lots, is exactly that. A guard with a blind spot at the top
 * of the tree is worse than no guard, because the PASS line claimed coverage it
 * did not have. Top-level files are scanned too; `config/`, `grounding/` and
 * `db/` stay out because they legitimately create and populate the estate.
 */
const SCAN_SRC_ROOT = true;

/**
 * Statements that change data or structure.
 *
 * EVERY ALTERNATIVE REQUIRES ITS OBJECT, not just its verb. The first version
 * matched a bare `grant\s+` and immediately flagged
 * `const grant = hcm.authority.find(...)` — a variable named after the thing it
 * holds. A checker that fires on ordinary code is a checker somebody disables,
 * so `grant`/`revoke` must be followed by a privilege, `update` by its `set`,
 * `insert` by its `into`. Narrower, and still catches every real statement — the
 * plants below prove it.
 */
const WRITE =
  /\b(insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+(table|database|schema)|truncate\s+|alter\s+table|create\s+(table|database|index|schema)|(grant|revoke)\s+(all|select|insert|update|delete|usage|connect|execute|references|trigger|create)\b)/i;

interface Hit {
  file: string;
  line: number;
  text: string;
}

/**
 * `walkSources` and `executableLines` come from `@fde/scanner` now. They used
 * to be local, and the local comment-stripper CUT AT THE FIRST `//` — which
 * truncated `postgresql://host` to `postgresql:` and made this guard blind to a
 * write on any line that also held a URL:
 *
 *   const url = 'postgresql://mrd@host/db'; insert into audit values (1);
 *     before → scanned "const url = 'postgresql:"   and reported clean
 *     after  → sees the insert
 *
 * That is the same defect `scripts/leak-check.mjs` records having found and
 * fixed in itself, still live here because the two were separate copies. The
 * shared version pins it with a test; see `packages/scanner/src/selftest.ts`.
 */

/** This file. Excluded because it contains the planted violations and the pattern itself. */
const SELF = 'guard/sql-write-selftest.ts';

/**
 * A REGEX IS A PARSER, NOT A STATEMENT.
 *
 * `eval/checks/checks.ts` reads the DDL files to learn which tables exist, with
 * `matchAll(/create table (\w+)/gi)`. That is the scan READING schema, not
 * software writing to a database — and the first version of this guard flagged
 * it, which is the shape of finding that gets a checker disabled rather than
 * fixed. `@fde/scanner` blanks regex literals before matching; string literals
 * it keeps, because that is where a real query lives.
 */
function scan(): Hit[] {
  const hits: Hit[] = [];
  const files: string[] = [];

  for (const dir of ANSWER_PATH) {
    try { files.push(...walkSources(resolve(SRC, dir))); } catch { /* directory not present */ }
  }
  if (SCAN_SRC_ROOT) {
    for (const name of readdirSync(SRC)) {
      const p = resolve(SRC, name);
      if (name.endsWith('.ts') && statSync(p).isFile()) files.push(p);
    }
  }

  for (const f of files) {
    const rel = f.replace(SRC + '/', '');
    if (rel === SELF) continue;
    for (const { line, text } of executableLines(readFileSync(f, 'utf8'))) {
      if (WRITE.test(text)) hits.push({ file: rel, line, text: text.trim() });
    }
  }
  return hits;
}

let failed = 0;
const hits = scan();

console.log('\nGuard — can the answer path write to the systems of record?\n');
console.log(`  ${hits.length ? 'FAIL' : 'ok  '}  no write statement on the answer path`);
console.log(
  `        scanned src/{${ANSWER_PATH.join(',')}} and src/*.ts — db/ is exempt, it builds the estate`,
);
for (const h of hits) {
  failed = 1;
  console.log(`        \x1b[31m${h.file}:${h.line}  ${h.text.slice(0, 90)}\x1b[0m`);
}

/**
 * THE WEB SURFACE — a different question, because there IS a write there.
 *
 * The rule is not "no writes" but "no write can reach a system of record". A
 * file in `apps/veresk-app/` containing a write statement must build its
 * connection from `urlFor(KB_DB)` and nothing else: not a literal database
 * name, not the base `PHARMA_DATABASE_URL` (which points at the six), and not
 * `tools/utils/handle.ts`, whose whole job is reaching them.
 *
 * `mrd_kb` is ours — derived index plus this one durable table — and is outside
 * `SYSTEMS`, so `db:reset` cannot reach it either.
 */
const APP_SRC = resolve(REPO_ROOT, 'apps', 'veresk-app', 'src');

/** The only sanctioned way for app code to name a database. */
const KB_CONNECTION = /urlFor\(\s*KB_DB\s*\)/;

/**
 * Ways of naming a database that are NOT sanctioned here. A literal `urlFor('…')`
 * is the one-character edit this whole section exists to catch.
 */
const FORBIDDEN_CONNECTION: Array<[RegExp, string]> = [
  [/urlFor\(\s*['"\`]/, "urlFor() with a literal database name — use KB_DB"],
  [/PHARMA_DATABASE_URL/, 'the base URL, which resolves to the six systems of record'],
  [/tools\/utils\/handle|from '@meridian\/pharma'\s*;/, "the estate handle, which reaches all six"],
];

/**
 * CAN THIS FILE ACTUALLY TALK TO POSTGRES?
 *
 * The scan finds write-looking STATEMENTS, and on the web surface that is not
 * the same question as "does this file write". `pages/release-turns.ts` is the
 * data behind the data-flow diagram, and one of its payload strings quotes the
 * very insert this guard exists to police — so the checker was reporting a
 * page's illustration of a write as a write, and going red for it.
 *
 * A red check that cannot be acted on is the failure mode this file's own
 * header warns about: somebody stops reading it. But the fix must not be "skip
 * files with no connection", because a write with no connection named is
 * exactly the `no KB_DB at all` plant below and MUST still be caught.
 *
 * So the discrimination is narrower: a file has to be able to ISSUE a query at
 * all — construct a client, or call one. Every plant does; a data file quoting
 * SQL in a string does not. `CONNECTS` is deliberately broad, and the plant
 * added below covers the case it exists for: a write that reaches a database
 * through an imported helper rather than a `new Pool` in the same file.
 */
const CONNECTS = /from '(pg|postgres)'|new\s+(Pool|Client)\b|\.query\(/;

function auditWriter(rel: string, src: string): string[] {
  const problems: string[] = [];
  const code = executableLines(src).map((l) => l.text).join('\n');
  if (!KB_CONNECTION.test(code)) {
    problems.push(`${rel}: writes, but never resolves urlFor(KB_DB)`);
  }
  for (const [pattern, why] of FORBIDDEN_CONNECTION) {
    if (pattern.test(code)) problems.push(`${rel}: reaches for ${why}`);
  }
  return problems;
}

const appFiles: string[] = [];
try { appFiles.push(...walkSources(APP_SRC)); } catch { /* the app is optional */ }

const writers: string[] = [];
const appProblems: string[] = [];
for (const f of appFiles) {
  const src = readFileSync(f, 'utf8');
  const rel = f.replace(APP_SRC + '/', '');
  const code = executableLines(src);
  if (!code.some(({ text }) => WRITE.test(text))) continue;
  // A write-shaped string in a file that cannot reach Postgres is a quotation,
  // not a write. See `CONNECTS`.
  if (!CONNECTS.test(code.map((l) => l.text).join('\n'))) continue;
  writers.push(rel);
  appProblems.push(...auditWriter(rel, src));
}
if (appProblems.length) failed = 1;

console.log(`\n  ${appProblems.length ? 'FAIL' : 'ok  '}  the web surface's writes can only reach mrd_kb`);
console.log(
  `        scanned apps/veresk-app/src — ${writers.length} file(s) write: ${writers.join(', ') || 'none'}`,
);
for (const p of appProblems) console.log(`        \x1b[31m${p}\x1b[0m`);

/**
 * The control for THAT check, in both directions. Same discipline as below: the
 * plants are the reason to believe the line above.
 */
const CONNECTION_PLANTS: Array<[string, string]> = [
  ['a literal system of record', `const pool = new Pool({ connectionString: urlFor('mrd_qms') });`],
  ['the base URL', `new Pool({ connectionString: process.env.PHARMA_DATABASE_URL });`],
  ['no KB_DB at all', `const pool = new Pool({ connectionString: someOtherUrl });`],
  // The case `CONNECTS` is broad for: no `new Pool` in this file at all, the
  // database reached through something imported. Still a write, still caught.
  ['a write through an imported helper', `await db.query('insert into product_lots values ($1)');`],
];
const missedConnections = CONNECTION_PLANTS.filter(
  ([, code]) => auditWriter('planted.ts', `insert into x values (1);\n${code}`).length === 0,
);
if (missedConnections.length) failed = 1;
console.log(`\n  ${missedConnections.length ? 'FAIL' : 'ok  '}  control: a write pointed anywhere else IS caught`);
console.log(
  missedConnections.length
    ? `        missed: ${missedConnections.map(([n]) => n).join(' | ')}`
    : `        all ${CONNECTION_PLANTS.length} plants caught — including urlFor('mrd_qms'), the one-character edit`,
);
const sanctioned = auditWriter(
  'ok.ts',
  `insert into ask_history (question) values ($1);\nconst pool = new Pool({ connectionString: urlFor(KB_DB) });`,
);
if (sanctioned.length) failed = 1;
console.log(`\n  ${sanctioned.length ? 'FAIL' : 'ok  '}  control: the sanctioned write does NOT trip it`);
console.log(
  sanctioned.length
    ? `        false positive: ${sanctioned.join(' | ')}`
    : '        ask_history through urlFor(KB_DB) passes — the check permits what it is meant to permit',
);

/**
 * THE CONTROL, and the reason to believe the line above.
 *
 * `leak:check` plants a synthetic violation and asserts it catches its own
 * plant, because it once passed clean while silently stripping a real leaked
 * credential URL. Same discipline: a scanner that has never been seen to fire
 * is a scanner you cannot read a green tick from.
 */
const PLANTS = [
  `await h.query('mrd_qms', 'update batch_dispositions set decision = $1', ['released']);`,
  `client.query('delete from training_records where employee_id = $1', [id]);`,
  `await h.query('mrd_hcm', \`insert into qualifications (kind) values ('QP')\`);`,
  `await client.query('drop table product_lots');`,
];
const missed = PLANTS.filter((p) => !WRITE.test(p));
if (missed.length) failed = 1;
console.log(`\n  ${missed.length ? 'FAIL' : 'ok  '}  control: planted writes ARE detected`);
console.log(
  missed.length
    ? `        missed: ${missed.join(' | ')}`
    : `        all ${PLANTS.length} plants caught — the scan above can fail, so its silence means something`,
);

/**
 * THE CONTROL THAT WOULD HAVE CAUGHT THE STRIPPING BUG, AND DID NOT EXIST.
 *
 * Every plant above tests the PATTERN — `WRITE.test(raw)` — and the pattern was
 * never wrong. What was wrong was the STRIPPER in front of it: the local
 * `executableLines` cut at the first `//`, so a line holding a URL arrived at
 * the pattern already truncated to `const url = 'postgresql:`. The scan was
 * blind to a write on any such line while this file printed "all 4 plants
 * caught", because the plants never went through the stripper.
 *
 * A control that exercises half the pipeline tells you about half the pipeline.
 * This one runs the real thing, in the real order, and it is the regression test
 * for the defect `@fde/scanner` was extracted to fix.
 */
const PLANTED_AFTER_A_URL =
  `const url = 'postgresql://mrd@host/db'; await client.query('insert into audit values (1)');`;
const seenThroughStripper = executableLines(PLANTED_AFTER_A_URL).some((l) => WRITE.test(l.text));
if (!seenThroughStripper) failed = 1;
console.log(`\n  ${seenThroughStripper ? 'ok  ' : 'FAIL'}  control: a write AFTER a URL survives comment-stripping`);
console.log(
  seenThroughStripper
    ? '        `//` in a URL is not a comment — the plant reaches the pattern intact'
    : `        stripped to ${JSON.stringify(executableLines(PLANTED_AFTER_A_URL)[0]?.text ?? '')} — the scan is blind`,
);

/** The other direction: ordinary reads must NOT trip it, or the check gets disabled. */
const READS = [
  `await h.query('mrd_erp', 'select * from product_lots where lot_id = $1', [lotId]);`,
  `'select count(*)::int n, min(temp_c) lo from telematics_readings where shipment_id = $1'`,
  `const updated = rows.filter((r) => r.status === 'updated');`,
  `select c.clause_id from sop_clause_links l join standard_clauses c on c.clause_id = l.clause_id`,
  // Found in the wild on 2026-09-12: a variable named for what it holds.
  `const grant = hcm.authority.find((a) => a.act === 'qp_certify');`,
  `if (!grant || !grant.heldAtAct) {`,
  `const revoked = rows.filter((r) => r.revokedOn);`,
];
const falsePositives = READS.filter((r) => WRITE.test(r));
if (falsePositives.length) failed = 1;
console.log(`\n  ${falsePositives.length ? 'FAIL' : 'ok  '}  control: ordinary reads do NOT trip it`);
console.log(
  falsePositives.length
    ? `        false positive on: ${falsePositives.join(' | ')}`
    : '        a checker that cries wolf is a checker somebody turns off',
);

console.log(
  `\n  guard: ${failed ? 'FAILING' : 'PASS'}  ` +
    '\x1b[2m— source-level. The real control is a read-only Postgres role on the\n' +
    '         answer path\'s connection string; the estate does not have one yet.\n' +
    '         The web surface\'s one write is permitted and pinned to mrd_kb.\x1b[0m\n',
);
process.exit(failed ? 1 : 0);
