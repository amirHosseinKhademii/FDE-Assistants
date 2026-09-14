/**
 * `pnpm steering:env-check` — is the wiring there? Connects to nothing.
 *
 * IT MUST NOT THROW WHEN THE VARIABLE IS ABSENT. The entire value of this
 * script is being runnable before anything is configured, so that the first
 * thing a new machine sees is a list of what is missing rather than a stack
 * trace from a config module.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SYSTEMS, haveBase, urlFor, redact, REPO_ROOT, PACKAGE_ROOT } from '../../config/connections';

const CORPUS_DIR = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

console.log('\nVantis steering — environment\n');

if (!haveBase()) {
  console.log('  MISSING  STEERING_DATABASE_URL');
  console.log('           The base URL for the four databases. Add one line to .env:\n');
  console.log('           STEERING_DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require\n');
  console.log('           The database name in the path is ignored — each of the four is derived');
  console.log('           from it by swapping the name. See src/config/connections.ts.\n');
} else {
  console.log(`  ok       STEERING_DATABASE_URL → ${redact(urlFor(SYSTEMS[0].db))}`);
  for (const { db, label } of SYSTEMS) console.log(`             ${db}  ${label}`);
  console.log('');
}

console.log(existsSync(CORPUS_DIR)
  ? `  ok       corpus present at ${CORPUS_DIR}`
  : `  MISSING  corpus — run: pnpm steering:corpus  (writes ${CORPUS_DIR})`);

console.log(`\n  schemas  ${PACKAGE_ROOT}/db/schema/  (${SYSTEMS.length} files)`);
console.log('\n  Nothing above connected to anything.\n');

// Deliberately exit 0 even when something is missing. This is a report, not a
// gate — the gates are db:check and estate-check, and a report that fails the
// build teaches people to stop running it.
