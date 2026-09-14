/**
 * Embeddings from an OpenAI-shaped client — the part that is the same for
 * everybody.
 *
 * ── WHY THIS MOVED HERE, AND WHAT THE EVIDENCE WAS ───────────────────────
 *
 * It lived twice, in `packages/insurance/src/grounding/embeddings.factory.ts`
 * and `packages/pharma/src/grounding/embeddings.factory.ts`, and the pharma
 * copy carried its own trigger: *"If a third domain arrives, this file is the
 * candidate to lift into a shared package. Two copies is not yet evidence; it
 * is a note to self."*
 *
 * A third domain arrived, and the two copies turned out to be byte-identical
 * apart from an import path and one comment. That is the evidence the note was
 * waiting for.
 *
 * ── WHAT STAYED BEHIND, WHICH IS THE WHOLE DESIGN ────────────────────────
 *
 * This file knows nothing about Azure, Entra, or which cloud anyone is on. It
 * takes a client and a deployment name. That is deliberate: this package's
 * header states it has no opinion about which cloud you are on, and an
 * `@fde/foundry` import here would have made that false.
 *
 * So each domain keeps a three-line factory that says *where its client comes
 * from* — the only thing that was ever domain-specific — and the batching,
 * ordering, usage accounting and the local fallback live here, once.
 *
 * ── THE ONE THING A CALLER MUST NOT FORGET ───────────────────────────────
 *
 * A hosted model and a local one are NOT comparable. 1536 dimensions against
 * 384, different training. Switching means re-ingesting the whole corpus, and
 * any retrieval measurement taken under one is meaningless against the other.
 */
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { BatchedEmbeddings, LocalEmbeddings } from './embeddings';

/** The minimum of an OpenAI client this needs. Structural, so any shape fits. */
export interface EmbeddingsClient {
  embeddings: {
    create(args: { model: string; input: string[] }): Promise<{
      data: Array<{ index: number; embedding: number[] | unknown }>;
      usage?: { prompt_tokens?: number };
    }>;
  };
}

export interface OpenAiEmbeddingsOptions {
  client: EmbeddingsClient;
  /** Deployment or model name. The caller resolves it; this does not guess. */
  deployment: string;
  /** Called once per batch with that request's prompt tokens. */
  onUsage?(promptTokens: number): void;
  /** 96 is Azure's practical cap for one embeddings request. */
  batchSize?: number;
}

export function openAiEmbeddings(opts: OpenAiEmbeddingsOptions): EmbeddingsInterface {
  return new BatchedEmbeddings({
    batchSize: opts.batchSize ?? 96,
    onUsage: opts.onUsage,
    async embed(texts: string[]) {
      const res = await opts.client.embeddings.create({ model: opts.deployment, input: texts });
      return {
        data: res.data.map((d) => ({ index: d.index, embedding: d.embedding as number[] })),
        promptTokens: res.usage?.prompt_tokens ?? 0,
      };
    },
  });
}

export type EmbeddingsChoice = 'hosted' | 'local';

/**
 * Which provider the environment asks for. `EMBEDDINGS=local` or anything else.
 *
 * Read here rather than in three domain files so the spelling cannot drift —
 * a domain that checked `EMBEDDING=local` would silently use the hosted model
 * and nothing would look wrong until a bill or a dimension mismatch.
 */
export function embeddingsChoice(): EmbeddingsChoice {
  return (process.env.EMBEDDINGS ?? 'hosted').trim().toLowerCase() === 'local' ? 'local' : 'hosted';
}

/** The provider named by `EMBEDDINGS`, with the hosted one built from `opts`. */
export function chooseEmbeddings(opts: OpenAiEmbeddingsOptions): EmbeddingsInterface {
  return embeddingsChoice() === 'local' ? new LocalEmbeddings() : openAiEmbeddings(opts);
}
