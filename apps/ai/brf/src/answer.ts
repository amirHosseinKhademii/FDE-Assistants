/**
 * Answer a board question. The one entry point every surface uses.
 *
 * The CLI, and any web route built later, both call askBrf(), so two surfaces cannot
 * answer differently. Everything about how a question is answered lives here.
 *
 * Azure is reached only when LLM_PROVIDER=azure, and its client and deployment name
 * are built inside that branch. A hosted or local run reads no FOUNDRY_* variable.
 * Embeddings follow the same rule through EMBEDDINGS.
 */
import './config/env';
import type OpenAI from 'openai';
import type { PGVectorStore } from '@langchain/pgvector';
import {
  ToolRegistry,
  runLoop,
  loopChoice,
  engineLabel,
  chatClient,
  chatModelName,
  cachedInputTokensOf,
  loggedModelName,
  type LoopChoice,
  type LoopEvent,
  type TurnRecord,
} from '@fde/agent';
import { logRequest } from '@fde/telemetry';
import './telemetry/request-log';
import { openEmbeddings } from './grounding/embeddings.factory';
import { openBrfStore } from './grounding/store';
import { searchDocumentsTool } from './tools/search-documents.tool';
import { BRF_SYSTEM_PROMPT, buildUserPrompt } from './tools/answer-prompt';
import { ANSWER_FORMAT, validateBrfAnswer, type BrfAnswer } from './schema/answer-schema';

/** The engine when neither the flag nor LOOP names one. The Agents SDK engine reaches Azure only. */
export const DEFAULT_LOOP = 'mastra';

function llmProvider(): string {
  return (process.env.LLM_PROVIDER ?? '').trim().toLowerCase();
}

/**
 * The Azure client, built only when LLM_PROVIDER=azure.
 *
 * chatClient() calls this for "azure", and also for an unset LLM_PROVIDER, because the
 * package reads unset as Azure. This application does not take that default silently.
 * An unset provider is refused, and the message names the fix.
 */
function azureClientOnly(): OpenAI {
  if (llmProvider() !== 'azure') {
    throw new Error(
      `LLM_PROVIDER is "${llmProvider() || 'unset'}", so no Azure client was built. ` +
        'Set LLM_PROVIDER to hosted, local or azure in .env.',
    );
  }
  const { azureClient } = require('./foundry/client') as typeof import('./foundry/client');
  return azureClient();
}

/** The model id the provider expects. An Azure deployment name means nothing to Gemini, and the reverse holds too. */
function chatModel(): string {
  if (llmProvider() !== 'azure') return chatModelName('');
  const { azureChatDeployment } = require('./foundry/client') as typeof import('./foundry/client');
  return azureChatDeployment();
}

export interface BrfContext {
  client: OpenAI;
  /** The model id for the provider in use. */
  model: string;
  /** The one store behind search_documents. */
  store: PGVectorStore;
  registry: ToolRegistry;
}

let shared: Promise<BrfContext> | undefined;

/**
 * Built once per process. A fresh connection pool for every question is fine at one
 * question and ruinous at fifty.
 */
export function brfContext(): Promise<BrfContext> {
  if (!shared) {
    shared = (async () => {
      const client = chatClient(azureClientOnly);
      const model = chatModel();
      const store = await openBrfStore(openEmbeddings());
      return { client, model, store, registry: new ToolRegistry([searchDocumentsTool(store)]) };
    })();
  }
  return shared;
}

/**
 * Closes the connection pool, for processes that are meant to end. A long-running
 * server never calls this. A batch job must, because an open pool keeps the event loop
 * alive. A no-op when no context was ever built.
 */
export async function closeBrfContext(): Promise<void> {
  if (!shared) return;
  const pending = shared;
  shared = undefined;
  const ctx = await pending.catch(() => undefined);
  await ctx?.store.end();
}

export interface AskOptions {
  question: string;
  /** 'mastra', 'sdk' or 'langgraph'. Falls back to the LOOP variable, then to mastra. */
  loop?: string;
  /** Where the question came from, e.g. 'ask' or 'eval:brf-001#2'. */
  surface: string;
  /** An eval run may pass its own registry. Everything else uses the shared one. */
  registry?: ToolRegistry;
  onEvent?: (e: LoopEvent) => void;
  onTurn?: (t: TurnRecord) => void;
  /** Turn logging off only for callers that log the run themselves. */
  log?: boolean;
}

export interface AskResult {
  structured?: BrfAnswer;
  text: string;
  turns: TurnRecord[];
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  engine: string;
  stoppedBecause: string;
  schemaErrors: string[];
}

export async function askBrf(opts: AskOptions): Promise<AskResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop ?? process.env.LOOP ?? DEFAULT_LOOP);
  const ctx = await brfContext();
  const registry = opts.registry ?? ctx.registry;

  const result = await runLoop<BrfAnswer>(
    choice,
    ctx.client,
    ctx.model,
    registry,
    buildUserPrompt(opts.question),
    {
      system: BRF_SYSTEM_PROMPT,
      responseFormat: ANSWER_FORMAT,
      // Required, not optional. The agent package ships no default validator, because a
      // loop that invented an answer shape would be checking against something nobody
      // agreed to. Leaving it out would let raw text pass as if it had been checked.
      validate: validateBrfAnswer,
      // What the agent is called on the wire and in traces.
      agentName: 'brf-board',
      // The one-line summary a tool result gets in the --trace output.
      summariseResult: (r: any) =>
        Array.isArray(r?.results) ? `${r.results.length} passage(s)` : null,
      onEvent: opts.onEvent,
      onTurn: opts.onTurn,
      // maxTurns is deliberately not set. Every surface gets the same cap.
    },
  );

  const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
  const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
  const cachedInputTokens = cachedInputTokensOf(result.turns);
  const toolCalls = result.turns.reduce((a, t) => a + t.toolCalls.length, 0);
  const ms = Date.now() - started;
  const engine = engineLabel(choice);

  if (opts.log !== false) {
    logRequest({
      subject: null,
      question: opts.question,
      model: loggedModelName(ctx.model),
      engine,
      turns: result.turns.length,
      toolCalls,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      ms,
      stoppedBecause: result.stoppedBecause,
      schemaRetries: result.schemaErrors.length,
      surface: opts.surface,
    });
  }

  return {
    structured: result.structured,
    text: result.text,
    turns: result.turns,
    toolCalls,
    inputTokens,
    outputTokens,
    ms,
    engine,
    stoppedBecause: result.stoppedBecause,
    schemaErrors: result.schemaErrors,
  };
}
