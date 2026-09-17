/**
 * STAGE 3.3 — passages become vectors, on this machine.
 *
 * Read `docs/safety/EMBED.md` first; it is the specification this matches.
 *
 * ── WHY IT RUNS HERE AND NOT IN A CLOUD ───────────────────────────────────
 *
 * `docs/safety/ARCHITECTURE.md` guardrail 4. Embedding touches EVERY passage,
 * and these passages are real people's accounts of crashes, fires and 53
 * deaths. Local means they never leave the machine.
 *
 * And nothing is traded for it: `docs/FREE.md` §8c measured local `bge-small`
 * at recall@k 0.813 against the paid Azure model's 0.813 on the steering
 * corpus. The same number. There is no accuracy argument on the other side,
 * which is what makes this a data decision rather than a cost one.
 *
 * ── THE SLOW PART, AND WHAT MAKES IT LESS SLOW ────────────────────────────
 *
 * ~73,442 passages at roughly 26/second is about 47 minutes. It was 1h47m
 * before `@fde/grounding` learned to sort a batch by length: the extractor pads
 * every text in a batch to the longest one in it, so one 2,051-character
 * passage among 63 short ones makes all 64 cost 2,051. Identical vectors, less
 * than half the time. See that package's `embedDocuments`.
 */
import { LocalEmbeddings } from '@fde/grounding';
import type { Passage } from './chunk';

/** A passage and its vector, kept together so nothing can drift apart. */
export interface Embedded {
  id: string;
  documentId: string;
  kind: Passage['kind'];
  text: string;
  startLine: number;
  meta: Passage['meta'];
  /** 384 numbers. bge-small's dimension — see CORPUS.md §6 for why not 1536. */
  vector: number[];
}

export interface EmbedReport {
  passages: number;
  dimensions: number;
  ms: number;
  /** Vectors that came back all zeros — a silent failure on a truncated input. */
  zeroVectors: number;
}

/**
 * Embed every passage, in order.
 *
 * THE ORDER IS THE WHOLE CONTRACT. `embedDocuments` returns vectors in the
 * order the texts went in, and this function zips them back by index. If that
 * ever slips, every vector attaches to the wrong passage — no error, no crash,
 * and retrieval that merely looks mediocre. `@fde/grounding`'s header calls it
 * the single most expensive mistake available in this layer, and it is the
 * reason the sorting added for speed scatters results back rather than pushing
 * them in sorted order.
 */
export async function embedPassages(
  passages: Passage[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ embedded: Embedded[]; report: EmbedReport }> {
  const embedder = new LocalEmbeddings();
  if (onProgress) embedder.onBatch = onProgress;

  const started = Date.now();
  const vectors = await embedder.embedDocuments(passages.map((p) => p.text));
  const ms = Date.now() - started;

  if (vectors.length !== passages.length) {
    // Not a warning. A length mismatch means the zip below would attach vectors
    // to the wrong passages from here on, and every number downstream would be
    // about something else.
    throw new Error(
      `embedder returned ${vectors.length} vectors for ${passages.length} passages — ` +
        'refusing to zip them, because the result would be silently wrong',
    );
  }

  const embedded: Embedded[] = passages.map((p, i) => ({ ...p, vector: vectors[i] }));

  return {
    embedded,
    report: {
      passages: embedded.length,
      dimensions: vectors[0]?.length ?? 0,
      ms,
      zeroVectors: vectors.filter((v) => v.every((x) => x === 0)).length,
    },
  };
}

/** Cosine similarity. Both vectors are normalised, so this is just the dot product. */
export function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
