/**
 * STAGE 3.2 — documents become passages, and most of them do not move.
 *
 * Read `docs/safety/CHUNK.md` first; it is the specification this matches, and
 * it carries the measurements behind every decision here.
 *
 * ── WHAT THIS STAGE DOES TO THE CORPUS ────────────────────────────────────
 *
 *   complaints       70,194  →  70,194     untouched
 *   recalls           3,026  →   3,026     untouched
 *   investigations      114  →     222     cut
 *                    ───────     ───────
 *                     73,334      73,442
 *
 * 114 of 73,334 documents are affected. **99.84% passes straight through.**
 *
 * ── WHY COMPLAINTS ARE NOT CUT, AND IT IS NOT THAT THEY ARE SHORT ─────────
 *
 * 8,121 of 70,194 complaints exceed the chunker's 1,200-character default —
 * one in nine is long enough to cut. We decline anyway.
 *
 * A complaint is ONE PERSON'S ACCOUNT OF ONE INCIDENT. Cut ODI 11353867 and the
 * second piece loses the word PARK, so a question about "will not go into park"
 * half-matches a fragment that no longer contains it. And a citation reading
 * "piece 2 of complaint 11353867" is not something a reader can look up, while
 * an ODI number is. A passage should be the smallest unit that still makes
 * sense alone; for a complaint that is the whole complaint, however long.
 *
 * Same argument for a recall campaign: `20V437000` is what a person quotes.
 *
 * ── AND THE CHUNKER IS STRUCTURE-AWARE, WHICH LOOKS LIKE A FAILURE ────────
 *
 * `AQ25002` is 3,318 characters and becomes two pieces of 257 and 3,060 — the
 * second still 2.5x the limit. The chunker splits on headings and line
 * breaks BEFORE size, and NHTSA investigation summaries are one unbroken block
 * of prose with no structure to cut on. So 114 documents become 222 passages,
 * not the ~340 a character count predicts.
 *
 * That is the chunker being right. A library that always hit its budget would
 * be one that always cut mid-sentence.
 */
import { chunkAll, sha, type Document } from '@fde/grounding';
import type { SafetyDoc } from './parse';

/**
 * What stages 3.3 and 3.4 consume. Deliberately flat: an embedder wants text,
 * an index wants an id and some metadata, and neither should have to know which
 * of three sources this came from beyond the `kind` tag.
 */
export interface Passage {
  /** A complaint's id IS its ODI number — see `passageId`. */
  id: string;
  /** The document this came from, for citation. */
  documentId: string;
  kind: SafetyDoc['kind'];
  text: string;
  /** 1-based line in the source document. 1 for everything not cut. */
  startLine: number;
  meta: SafetyDoc['meta'];
}

export interface ChunkReport {
  documents: number;
  passages: number;
  /** Per kind: how many went in, how many came out. */
  byKind: Record<SafetyDoc['kind'], { docs: number; passages: number }>;
  /** Documents that produced more than one passage. Only investigations should. */
  split: number;
}

/**
 * THE ONLY DOCUMENTS THAT ARE CUT.
 *
 * Kept as a named predicate rather than inlined, so the rule is one thing to
 * change if a later stage measures that it should be different — and so the
 * reason lives beside the decision.
 */
function needsChunking(doc: SafetyDoc): boolean {
  return doc.kind === 'investigation';
}

/**
 * A passage id that a human can act on.
 *
 * For a complaint or a recall the id is the document's own — `11353867`,
 * `20V437000` — so a citation points at the thing itself and someone can open
 * NHTSA's site and read it. The `#0`, `#1` suffix appears ONLY on the 114
 * investigations that were cut, because there the document alone is not enough
 * to locate the quote.
 */
function passageId(doc: SafetyDoc, index: number, total: number): string {
  return total > 1 ? `${doc.id}#${index}` : doc.id;
}

/**
 * Documents in, passages out. No embedding, no database, no network.
 *
 * `chunkAll` is `@fde/grounding`'s PUBLIC export, used unchanged — the same
 * function insurance and steering call. `chunkDocument` is not exported, and
 * reaching past the index to it would be this engagement quietly widening
 * another package's surface. Nothing new was written here, which is
 * `docs/safety/PLAN.md` §9.6's test passing quietly.
 */
export function toPassages(docs: SafetyDoc[]): { passages: Passage[]; report: ChunkReport } {
  const passages: Passage[] = [];
  const report: ChunkReport = {
    documents: docs.length,
    passages: 0,
    byKind: {
      complaint: { docs: 0, passages: 0 },
      recall: { docs: 0, passages: 0 },
      investigation: { docs: 0, passages: 0 },
    },
    split: 0,
  };

  // Pass 1: everything that is NOT cut, in order. Recorded first so the output
  // keeps the corpus's own ordering rather than the chunker's.
  const toCut: Document[] = [];
  const cutMeta = new Map<string, SafetyDoc>();

  for (const doc of docs) {
    report.byKind[doc.kind].docs++;

    if (!needsChunking(doc)) {
      passages.push({
        id: doc.id,
        documentId: doc.id,
        kind: doc.kind,
        text: doc.text,
        startLine: 1,
        meta: doc.meta,
      });
      report.byKind[doc.kind].passages++;
      continue;
    }

    // `Document` wants an id, a path, the text and a hash. The path is the id
    // here because these came from a flat file rather than a tree — there is no
    // directory for an investigation to live in.
    toCut.push({
      id: doc.id,
      path: doc.id,
      text: doc.text,
      hash: sha(doc.text),
      bytes: Buffer.byteLength(doc.text),
    });
    cutMeta.set(doc.id, doc);
  }

  // Pass 2: the 114. Grouped back by `documentId` so a document producing one
  // chunk keeps its own id and only a genuinely split one gets a #suffix.
  const byDoc = new Map<string, ReturnType<typeof chunkAll>>();
  for (const c of chunkAll(toCut)) {
    const list = byDoc.get(c.documentId) ?? [];
    list.push(c);
    byDoc.set(c.documentId, list);
  }

  for (const [documentId, chunks] of byDoc) {
    const doc = cutMeta.get(documentId);
    if (!doc) continue;
    if (chunks.length > 1) report.split++;

    for (const [i, c] of chunks.entries()) {
      passages.push({
        id: passageId(doc, i, chunks.length),
        documentId,
        kind: doc.kind,
        // `c.text` is the heading trail plus the body — what the chunker
        // intends to be embedded, not the body alone.
        text: c.text,
        startLine: c.startLine,
        meta: doc.meta,
      });
      report.byKind[doc.kind].passages++;
    }
  }

  report.passages = passages.length;
  return { passages, report };
}
