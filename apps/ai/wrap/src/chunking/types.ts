/**
 * Chunk record shared by every chunker (plan Step 2.4).
 *
 * Token counts are an ESTIMATE: ceil(characters / 4). The plan's js-tiktoken
 * count is not used because Part A adds no npm dependencies. Swap
 * `estimateTokens` (and bump any cache key) if a real tokenizer is adopted.
 */
import { createHash } from "node:crypto";

export type ChunkType =
  | "markdown_section"
  | "code_function" // Part B (C/H chunker)
  | "code_struct" // Part B (C/H chunker)
  | "csv_row"
  | "text_paragraph";

export interface Chunk {
  /** Deterministic: first 16 hex chars of sha256(`${source_file}:${chunk_index}`). */
  id: string;
  content: string;
  /** Estimated tokens: ceil(content.length / 4). */
  tokens: number;
  type: ChunkType;
  source_file: string;
  /** 0-based position of this chunk within its file. */
  chunk_index: number;
  /** 1-based, inclusive line numbers in the original file. */
  start_line: number;
  end_line: number;
  /** Markdown only: "2 Design > 2.3 Torque limits". Absent for other types. */
  heading_path?: string;
  metadata: Record<string, unknown>;
}

export const CHUNK_SIZES = {
  /** Plan: MAX_TOKENS_PER_CHUNK, default 500. */
  maxTokens: Number(process.env.MAX_TOKENS_PER_CHUNK) || 500,
  /** Not fixed by the plan: markdown sections under this merge with a neighbour. */
  minTokens: 50,
  /** Plan: plain-text window, default 400 tokens... */
  textWindowTokens: 400,
  /** ...with 100 tokens of overlap. */
  textOverlapTokens: 100,
} as const;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkId(sourceFile: string, chunkIndex: number): string {
  return createHash("sha256").update(`${sourceFile}:${chunkIndex}`).digest("hex").slice(0, 16);
}

export interface ChunkInit {
  sourceFile: string;
  index: number;
  type: ChunkType;
  content: string;
  startLine: number;
  endLine: number;
  headingPath?: string;
  metadata?: Record<string, unknown>;
}

export function makeChunk(init: ChunkInit): Chunk {
  const chunk: Chunk = {
    id: chunkId(init.sourceFile, init.index),
    content: init.content,
    tokens: estimateTokens(init.content),
    type: init.type,
    source_file: init.sourceFile,
    chunk_index: init.index,
    start_line: init.startLine,
    end_line: init.endLine,
    metadata: init.metadata ?? {},
  };
  if (init.headingPath !== undefined) chunk.heading_path = init.headingPath;
  return chunk;
}
