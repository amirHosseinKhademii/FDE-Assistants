/**
 * Reading the customer's files. THE ONLY PLACE THE INGEST TOUCHES A DISK.
 *
 * `STEERING_CORPUS_DIR` NAMES WHERE THE FILES ARE. Here that is `docs/`; at a
 * real engagement it is a mount of the customer's share.
 *
 * IT USED TO SAY "BUILD-TIME ONLY, AND IF THE DEPLOYED APP RESOLVES IT THAT IS
 * A BUG." That was true while the only reader was the ingest. The assessment
 * loop broke it: `resolveCitations` opens the file a citation names to find the
 * line its sentence is really on, which is a RUNTIME read of the same corpus.
 *
 * The note is corrected rather than deleted because the underlying rule still
 * holds and is stricter than "build-time": nothing here may reach the
 * customer's DATABASES, which `derived:boundary-check` enforces. Reading their
 * documents is what this system does. The deployed image therefore ships the
 * corpus and sets this variable — see `infra/steering/Dockerfile`, which
 * explains what goes wrong when it does not.
 *
 * This file names none of the customer's systems, and nor does anything else
 * under `ingest/`. `derived:boundary-check` enforces that — including in comments,
 * which `leak:check` exempts and this deliberately does not: a commented-out
 * shortcut into the answer key looks exactly like a note explaining why there
 * isn't one. The reasoning is in `src/derived/init/boundary-check.ts`, where naming
 * them is allowed.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';

export const CORPUS_DIR = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

export interface RawFile {
  /** Corpus-relative, forward slashes. This is the `file_id` everywhere. */
  readonly path: string;
  readonly content: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly lines: number;
}

/** Every file under `prefix`, sorted, so an ingest run is order-stable. */
export function read(prefix: string): RawFile[] {
  const root = join(CORPUS_DIR, prefix);
  const out: RawFile[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const content = readFileSync(full, 'utf8');
      out.push({
        path: relative(CORPUS_DIR, full).split('\\').join('/'),
        content,
        sha256: createHash('sha256').update(content).digest('hex'),
        bytes: Buffer.byteLength(content),
        lines: content.split('\n').length,
      });
    }
  };
  if (!existsSync(root)) {
    throw new Error(
      `No corpus at ${root}. Run: pnpm steering:corpus  (or set STEERING_CORPUS_DIR)`,
    );
  }
  walk(root);
  return out;
}
