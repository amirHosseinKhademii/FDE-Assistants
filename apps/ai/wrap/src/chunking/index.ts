/**
 * Chunker router (plan Step 2.4): picks the splitter from the detected format.
 *
 * Formats come from ingest/format-detector.ts. BINARY and UNKNOWN yield no chunks.
 */
import { Format } from "../ingest/format-detector";
import { chunkC } from "./c-code";
import { chunkCsv } from "./csv";
import { chunkMarkdown } from "./markdown";
import { chunkText } from "./text";
import type { Chunk } from "./types";

export type { Chunk, ChunkType } from "./types";
export { CHUNK_SIZES } from "./types";

/**
 * Split one decoded file into chunks.
 *
 * @param sourceFile path relative to the corpus root (stored in every chunk)
 * @param text       the file decoded to UTF-8 (see decodeToUtf8)
 * @param format     the format detectFormat() reported for the bytes
 */
export function chunkFile(sourceFile: string, text: string, format: Format): Chunk[] {
  switch (format) {
    case Format.MARKDOWN:
      return chunkMarkdown(text, sourceFile);
    case Format.C_SOURCE:
    case Format.C_HEADER:
      return chunkC(text, sourceFile);
    case Format.CSV:
      return chunkCsv(text, sourceFile);
    case Format.JSON:
    case Format.TEXT:
      return chunkText(text, sourceFile);
    case Format.BINARY:
    case Format.UNKNOWN:
      return [];
  }
}
