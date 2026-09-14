/**
 * Load the source tree and turn it into chunks ready for the same store the
 * documents go into.
 *
 * ── WHY THIS EXISTS INSTEAD OF AN EXTRA LINE IN `@fde/grounding` ─────────
 *
 * `loadDirectory` has an extension allow-list — `.md`, `.markdown`, `.txt` —
 * and adding `.c` to it takes one line. That line would have been wrong.
 *
 * The allow-list is not the only thing standing between a file and the index.
 * `ingestDocuments` sends everything it loads through `chunkAll`, the MARKDOWN
 * chunker: heading-aware, table-protecting, and completely unable to see a C
 * function. Adding the extension would have indexed 220 source files as prose,
 * successfully, with no error — 1,000 passages cut on `#` characters that
 * happen to start preprocessor directives.
 *
 * Routing code to a different chunker is a dispatch decision, and dispatching
 * on "what kind of file is this" is the domain's job — it is the same judgement
 * `STEERING_DOCUMENTS.classify` already makes. So the load happens here, the
 * chunking happens here, and `@fde/grounding` remains unedited for a third
 * domain running.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import type { Chunk, SourceDocument } from '@fde/grounding';
import { STEERING_DOCUMENTS } from '../config/steering-documents';
import { chunkCode, parseSource } from './code-chunker';

const CODE_EXTENSIONS = ['.c', '.h'];

export interface CodeUnit {
  document: SourceDocument;
  chunks: Chunk[];
}

function codeFiles(root: string, dir = root): string[] {
  return readdirSync(dir).sort().flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return codeFiles(root, full);
    return CODE_EXTENSIONS.some((e) => full.endsWith(e)) ? [full] : [];
  });
}

/**
 * `eps-steering-feel/src/damping.c` → `eps-steering-feel`.
 *
 * The repository is the only facet a source file reliably carries. It has no
 * programme: code is shared across programmes, which is the entire reason the
 * reuse question is hard, and inventing one here would answer that question
 * wrongly and invisibly.
 */
function repoOf(id: string): string | null {
  return /^(eps-[a-z-]+)\//.exec(id)?.[1] ?? null;
}

/**
 * One source file → its metadata and its chunks.
 *
 * `status` is `unknown` rather than `current`, deliberately. A file in the tree
 * is not thereby in a release, and `retiredStatuses` excludes `unknown` — so an
 * honest "we cannot tell" stays searchable, while a guessed "current" would be
 * an assertion nobody made.
 */
function unitFor(root: string, path: string): CodeUnit {
  const id = relative(root, path).split('\\').join('/');
  const text = readFileSync(path, 'utf8');
  const parsed = parseSource(text);

  return {
    document: {
      documentId: id,
      docType: STEERING_DOCUMENTS.classify(id, parsed.moduleLine, new Map()),
      title: parsed.moduleLine || id,
      body: text,
      edition: null,
      effectiveOn: null,
      expiresOn: null,
      status: 'unknown',
      facets: { programme: null, repo: repoOf(id), revision: null },
      relations: [],
      contentSha: createHash('sha256').update(text).digest('hex'),
      sourcePath: id,
    },
    chunks: chunkCode(id, text),
  };
}

/** Every `.c` and `.h` under `root`, chunked by function. */
export function loadCode(root: string): CodeUnit[] {
  return codeFiles(root).map((p) => unitFor(root, p));
}
