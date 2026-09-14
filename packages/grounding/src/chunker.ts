/**
 * Split policy documents into retrievable chunks.
 *
 * Three decisions here, and together they matter far more to retrieval quality
 * than the choice of embedding model:
 *
 * 1. HEADING-AWARE FIRST. Blind N-character windows cut clauses and tables in
 *    half and strand facts from the heading that gives them meaning. Splitting
 *    on markdown headings first keeps semantically coherent units together.
 *
 * 2. EVERY CHUNK CARRIES ITS HEADING TRAIL. A retrieved fragment reading
 *    "$40 per day, for a maximum of 30 days" is worse than useless on its own —
 *    twelve near-identical policy forms in this corpus each say something like
 *    it, with different numbers. Prefixed with
 *    "PA-2023-01 — Personal Auto Policy > Part IV > 4.4 Rental Reimbursement",
 *    it is answerable AND citable. This costs a few tokens per chunk and is the
 *    single highest-leverage thing in the whole ingestion path.
 *
 * 3. TABLES ARE NEVER SPLIT ACROSS THEIR HEADER. `$1,000` in a deductible
 *    column means nothing once separated from the row that names the coverage.
 *    When a window boundary would land inside a markdown table, the table moves
 *    whole into the next chunk, and if a table alone exceeds the budget it is
 *    split with the header row repeated. This is the difference between citing
 *    "Collision — $1,000" and citing a naked number.
 *
 * WHAT IS A LIBRARY'S JOB HERE AND WHAT IS OURS. The three rules above are
 * POLICY — statements about what an insurance document is and what may not be
 * separated from what. No package will ever ship them. Deciding *which lines
 * are headings and where a table starts* is PARSING, which is commodity, and
 * used to be done here with hand-rolled regex. It is now `markdown-it`.
 *
 * That is not cosmetic. A regex of the form /^(#{1,6})\s+(.*)$/ cannot know it
 * is inside a fenced code block, so a line reading "# total" in an example
 * block becomes a heading and silently reshapes the chunk boundaries. It also
 * misses setext headings entirely. A real parser gets both right.
 *
 * `markdown-it` specifically, and not the more obvious `remark`/`unified`,
 * because those are ESM-only at v11 and this project is CommonJS. That is a
 * boring constraint that eliminated the standard choice, and it is written down
 * so nobody re-litigates it. markdown-it is also a better fit: its tokens carry
 * `map: [startLine, endLine]`, which is exactly what the windowing below needs. *
 * DOMAIN: the heading-trail and table rules encode what a POLICY DOCUMENT is.
 * Keep the shape, retune the rules for your corpus (what must never be split?).
 */
// `import MarkdownIt from 'markdown-it'` TYPECHECKS here and is `undefined` at
// runtime: tsconfig sets `allowSyntheticDefaultImports` (which satisfies the
// compiler) but not `esModuleInterop` (which would emit the interop shim), and
// markdown-it's CommonJS build exports the constructor directly with no
// `.default`. The `import … = require(…)` form is correct under both settings.
// Flipping esModuleInterop globally would change emit for every import in the
// project, which is not a change to make in passing.
import MarkdownIt = require('markdown-it');
import { sha, type Document } from './loader';

export interface Chunk {
  id: string;
  documentId: string;
  /** Heading path, e.g. ['PA-2023-01 — …', 'Part IV — …', '4.4 Rental …']. */
  headings: string[];
  /** The text actually embedded: heading trail + body. */
  text: string;
  /** The body alone, for display and citation. */
  body: string;
  hash: string;
  index: number;
  /**
   * 1-based line in the SOURCE DOCUMENT where this chunk's body begins.
   *
   * ── ADDED BECAUSE A MODEL WAS INVENTING IT ──────────────────────────────
   *
   * The first agent run over a 3,854-passage corpus was asked, by its answer
   * schema, to cite a file AND a line. The retrieved passages carried a file, a
   * heading trail and a section — and no line. So it wrote `1`, four times out
   * of five, and the citations looked exactly like real ones.
   *
   * **A required field a model cannot source is a field it will fabricate.**
   * The fix belongs here rather than in the schema: the chunker has always known
   * where a chunk starts and simply threw it away. `section.startLine` was
   * computed for the table-offset arithmetic below and never surfaced.
   *
   * NOT an approximation of the sentence's line — the chunk's. A citation
   * quoting a sentence three lines into the passage points at the passage, which
   * is what "open the document here" means and is honest about its precision.
   */
  startLine: number;
}

export interface ChunkOptions {
  /** Rough character budget per chunk. ~4 chars/token for Latin script. */
  maxChars?: number;
  /** Characters repeated between adjacent windows, so a fact spanning a
   *  boundary survives intact in at least one chunk. */
  overlapChars?: number;
}

interface Section {
  headings: string[];
  body: string;
  /** Line index in the source document where `body` begins. */
  startLine: number;
}

/** One markdown parser for the process. Tables are on by default. */
const md = new MarkdownIt();

interface Parsed {
  headings: Array<{ line: number; depth: number; text: string }>;
  /** Table blocks as [startLine, endLine) in document coordinates. */
  tables: Array<[number, number]>;
}

/**
 * Parse once, and take only the two facts we need: where the headings are, and
 * where the tables are. Everything else about the AST is irrelevant to us —
 * the body text is sliced out of the ORIGINAL string by line number, so what
 * gets embedded is byte-identical to the source and to what the hand-rolled
 * version produced.
 */
function parse(text: string): Parsed {
  const tokens = md.parse(text, {});
  const headings: Parsed['headings'] = [];
  const tables: Parsed['tables'] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'heading_open' && t.map) {
      const inline = tokens[i + 1];
      headings.push({
        line: t.map[0],
        depth: Number(t.tag.slice(1)),
        text: (inline?.content ?? '').trim(),
      });
    }
    if (t.type === 'table_open' && t.map) {
      tables.push([t.map[0], t.map[1]]);
    }
  }

  return { headings, tables };
}

/** Split markdown into sections, tracking the heading stack. */
function sections(text: string, parsed: Parsed): Section[] {
  const lines = text.split('\n');
  const out: Section[] = [];
  const stack: string[] = [];

  const push = (from: number, to: number): void => {
    const body = lines.slice(from, to).join('\n').trim();
    if (body) out.push({ headings: [...stack], body, startLine: from });
  };

  let cursor = 0;
  for (const h of parsed.headings) {
    push(cursor, h.line);
    const depth = h.depth;
    stack.length = Math.min(stack.length, depth - 1);
    stack[depth - 1] = h.text;
    // The 2024 plain-language forms skip heading levels (h3 straight to h5).
    // Skipped levels leave holes in the stack; fill them so the trail is still
    // a valid array, and drop the empties when it is rendered.
    for (let i = 0; i < stack.length; i++) stack[i] ??= '';
    cursor = h.line + 1;
  }
  push(cursor, lines.length);

  return out;
}

/**
 * Window an oversized body, breaking on paragraph edges and never inside a
 * table. Oversized tables are split with their header rows repeated so every
 * piece stays self-describing.
 */
function window(
  body: string,
  maxChars: number,
  overlapChars: number,
  tables: Array<[number, number]>,
): string[] {
  if (body.length <= maxChars) return [body];

  const lines = body.split('\n');
  const inTable = (lineIdx: number): [number, number] | undefined =>
    tables.find(([s, e]) => lineIdx >= s && lineIdx < e);

  const parts: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;

  const flush = (): void => {
    const joined = buf.join('\n').trim();
    if (joined) parts.push(joined);
    buf = [];
    bufLen = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const table = inTable(i);

    if (table) {
      const [s, e] = table;
      const rows = lines.slice(s, e);
      const tableText = rows.join('\n');

      // A table that fits: move it whole rather than let a boundary land in it.
      if (tableText.length <= maxChars) {
        if (bufLen + tableText.length > maxChars) flush();
        buf.push(...rows);
        bufLen += tableText.length;
      } else {
        // A table too big to fit anywhere: split it, repeating the header rows
        // (the column names and the |---| separator) on every piece.
        flush();
        const header = rows.slice(0, 2);
        const headerLen = header.join('\n').length;
        let chunkRows: string[] = [];
        let len = headerLen;
        for (const row of rows.slice(2)) {
          if (len + row.length > maxChars && chunkRows.length) {
            parts.push([...header, ...chunkRows].join('\n'));
            chunkRows = [];
            len = headerLen;
          }
          chunkRows.push(row);
          len += row.length + 1;
        }
        if (chunkRows.length) parts.push([...header, ...chunkRows].join('\n'));
      }
      i = e - 1;
      continue;
    }

    if (bufLen + lines[i].length > maxChars && bufLen > 0) {
      flush();
      // Carry the tail of the previous piece forward so a sentence spanning the
      // boundary survives whole somewhere. Never carry a table fragment.
      const prev = parts[parts.length - 1] ?? '';
      const tail = prev.slice(-overlapChars);
      if (tail && !tail.includes('|')) {
        buf.push(tail.slice(tail.indexOf('\n') + 1));
        bufLen = tail.length;
      }
    }
    buf.push(lines[i]);
    bufLen += lines[i].length + 1;
  }

  flush();
  return parts.filter(Boolean);
}

export function chunkDocument(doc: Document, opts: ChunkOptions = {}): Chunk[] {
  const maxChars = opts.maxChars ?? 1200;
  const overlapChars = opts.overlapChars ?? 150;
  const chunks: Chunk[] = [];

  const parsed = parse(doc.text);

  for (const section of sections(doc.text, parsed)) {
    const headings = section.headings.filter(Boolean);
    // Document-coordinate table ranges, rebased onto this section's body. The
    // body was trimmed, so the offset is measured from the first non-blank line.
    const lead = section.body ? countLeadingBlank(doc.text, section.startLine) : 0;
    const base = section.startLine + lead;
    const localTables = parsed.tables
      .map(([a, b]) => [a - base, b - base] as [number, number])
      .filter(([a]) => a >= 0);

    for (const body of window(section.body, maxChars, overlapChars, localTables)) {
      const trail = headings.join(' > ');
      const text = trail ? `${trail}\n\n${body}` : body;
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        documentId: doc.id,
        headings,
        text,
        body,
        hash: sha(text),
        index: chunks.length,
        startLine: lineOf(doc.text, body, base),
      });
    }
  }
  return chunks;
}

export const chunkAll = (docs: Document[], opts?: ChunkOptions): Chunk[] =>
  docs.flatMap((d) => chunkDocument(d, opts));

/**
 * The 1-based line where `body` begins in `text`, searching from `fromLine`.
 *
 * EXACT, NOT ESTIMATED, because `body` is a verbatim slice of the document —
 * windowing cuts it but never rewrites it. Searching forward from the section's
 * own start rather than from zero means an identical paragraph appearing twice
 * in one document resolves to the right occurrence.
 *
 * Falls back to the section start if the slice cannot be located, which should
 * be impossible and would mean the windowing had begun transforming text. A
 * wrong-but-honest line beats a thrown exception in an ingest that has already
 * embedded half a corpus.
 */
function lineOf(text: string, body: string, fromLine: number): number {
  const lines = text.split('\n');
  const offset = lines.slice(0, fromLine).join('\n').length;
  const at = text.indexOf(body, Math.max(0, offset - 1));
  if (at < 0) return fromLine + 1;
  return text.slice(0, at).split('\n').length;
}

/** How many blank lines `body.trim()` removed from the front of a section. */
function countLeadingBlank(text: string, from: number): number {
  const lines = text.split('\n');
  let n = 0;
  while (from + n < lines.length && lines[from + n].trim() === '') n++;
  return n;
}

// ---------------------------------------------------------------------------
// Inspecting the chunking, offline
// ---------------------------------------------------------------------------

/**
 * A chunk that lost the context that made it citable.
 *
 * The one worth counting in markdown is a TABLE ROW SEPARATED FROM ITS HEADER
 * ROW. "$1,000" with no column name attached is not a fact anyone can cite —
 * it retrieves well, reads authoritatively, and means nothing. The test is
 * structural: the chunk starts with a pipe but contains no `|---|` divider, so
 * it is the tail of a table whose head went somewhere else.
 */
export function orphanedTableRows(chunks: Chunk[]): Chunk[] {
  return chunks.filter(
    (c) => /^\s*\|/.test(c.body.trimStart()) && !/\|\s*-{3,}/.test(c.body),
  );
}

/**
 * Sweep the chunker across several size budgets and report what breaks.
 *
 * WHY MORE THAN ONE BUDGET — this is the whole point, and it is a lesson that
 * cost real time. Run at the DEFAULT budget alone, no section in a typical
 * corpus is long enough to force a split, so the splitting path never executes
 * and the orphan count reports `0` for code that has never once run. A check
 * that cannot fail reads like evidence while proving nothing.
 *
 * So the hostile budgets are not a stress test, they are the negative control:
 * they force the split, and if orphans stay at zero even at 120 characters, the
 * orphan rule itself is broken.
 *
 * OFFLINE. No embeddings, no model, no database — just the chunker.
 */
export function inspectChunking(
  docs: Parameters<typeof chunkAll>[0],
  opts: {
    /** Descending. The first is treated as the default; the rest are forced splits. */
    budgets?: number[];
    orphans?: (chunks: Chunk[]) => Chunk[];
  } = {},
): { lines: string[]; chunks: Chunk[] } {
  const budgets = opts.budgets ?? [1200, 400, 200, 120];
  const findOrphans = opts.orphans ?? orphanedTableRows;
  const lines: string[] = [];

  for (const budget of budgets) {
    const cs = chunkAll(docs, { maxChars: budget });
    const forced = budget < budgets[0] ? ' (forced)' : '';
    lines.push(
      `  maxChars=${String(budget).padEnd(5)} chunks=${String(cs.length).padEnd(5)} ` +
        `orphans=${findOrphans(cs).length}${forced}`,
    );
  }

  return { lines, chunks: chunkAll(docs) };
}
