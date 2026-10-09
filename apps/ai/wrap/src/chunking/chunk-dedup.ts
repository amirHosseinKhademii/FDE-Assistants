/**
 * Chunk-level exact dedup (Step 2.5 fix): drop chunks whose normalised content was already seen.
 *
 * Normalisation is trim + collapse every whitespace run to one space, then sha256. Chunks are
 * visited in sorted order (source_file, then chunk_index), so the first occurrence is kept and
 * the choice is the same on every run. The kept chunk gets metadata.duplicate_count when it
 * dropped at least one copy.
 */
import { createHash } from "node:crypto";
import type { Chunk } from "./types";

export interface ChunkDedupResult {
  kept: Chunk[];
  dropped: Chunk[];
}

/** sha256 of the chunk content after trim and whitespace collapse. */
export function chunkContentHash(content: string): string {
  return createHash("sha256").update(content.trim().replace(/\s+/g, " ")).digest("hex");
}

export function dedupChunks(chunks: Chunk[]): ChunkDedupResult {
  const ordered = [...chunks].sort(
    (a, b) =>
      (a.source_file < b.source_file ? -1 : a.source_file > b.source_file ? 1 : 0) ||
      a.chunk_index - b.chunk_index,
  );
  const byHash = new Map<string, { chunk: Chunk; dups: number }>();
  const dropped: Chunk[] = [];
  for (const c of ordered) {
    const hash = chunkContentHash(c.content);
    const entry = byHash.get(hash);
    if (entry) {
      entry.dups++;
      dropped.push(c);
    } else {
      byHash.set(hash, { chunk: { ...c, metadata: { ...c.metadata } }, dups: 0 });
    }
  }
  const kept: Chunk[] = [];
  for (const { chunk, dups } of byHash.values()) {
    if (dups > 0) chunk.metadata.duplicate_count = dups;
    kept.push(chunk);
  }
  return { kept, dropped };
}
