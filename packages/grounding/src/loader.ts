/**
 * Walk a directory and read text documents — now LangChain's job, not ours.
 *
 * WHAT THIS FILE USED TO BE: 58 lines of `readdir`, `readFile`, extension
 * filtering and recursion. All generic, all replaceable, and now replaced by
 * `DirectoryLoader` + `TextLoader` from `@langchain/classic`.
 *
 * WHAT IS LEFT is the part LangChain does not do: a **stable content hash**.
 * LangChain's `Document` has `pageContent` and `metadata` and no notion of
 * identity across runs. We need one, because the chunk id is derived from it
 * and a chunk id that changes when nothing changed makes an index impossible to
 * diff. That is three lines, and it is the whole reason this file still exists.
 *
 * The old contract is preserved deliberately: `chunker.ts` consumes `Document`
 * and knows nothing about LangChain. Keeping the seam here means the day a real
 * insurance corpus arrives — mostly scanned PDF — swapping `TextLoader` for a
 * PDF loader changes this file and nothing downstream.
 */
import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';

export interface Document {
  /** Stable across runs: the path relative to the corpus root. */
  id: string;
  path: string;
  text: string;
  /** Content hash. Drives chunk identity. */
  hash: string;
  bytes: number;
}

export const sha = (s: string): string =>
  createHash('sha256').update(s).digest('hex').slice(0, 16);

/**
 * Which extensions get read, and with what.
 *
 * `UnknownHandling.Ignore` is the important flag: without it, a stray `.DS_Store`
 * or a PDF dropped into the corpus throws and the whole ingest dies. Skipping
 * what we cannot read is the behaviour the hand-rolled version had via its
 * extension allow-list, and losing it silently would have been a regression.
 */
const LOADERS = {
  '.md': (p: string) => new TextLoader(p),
  '.markdown': (p: string) => new TextLoader(p),
  '.txt': (p: string) => new TextLoader(p),
};

export async function loadDirectory(root: string): Promise<Document[]> {
  const loader = new DirectoryLoader(root, LOADERS, true, 'ignore');
  const lcDocs = await loader.load();

  return lcDocs
    .map((d) => {
      const path = String(d.metadata.source ?? '');
      const text = d.pageContent;
      return {
        id: relative(root, path),
        path,
        text,
        hash: sha(text),
        bytes: Buffer.byteLength(text, 'utf8'),
      };
    })
    // DirectoryLoader does not promise an order. Sorting keeps chunk indices —
    // and therefore chunk ids — identical between runs on an unchanged corpus.
    .sort((a, b) => a.id.localeCompare(b.id));
}
