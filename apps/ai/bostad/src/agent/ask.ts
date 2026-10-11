/**
 * Ask one question about one address. The entry point every surface uses
 * (the CLI now, the web route later), so they cannot answer differently.
 *
 * Order of work, and why:
 *   1. The profile is fetched BEFORE the model runs. A failed fetch costs no
 *      tokens, and the same cache answers the model's tool calls, so the
 *      address is fetched once per question.
 *   2. The loop runs with a shape-only validator, so a structurally valid
 *      answer is always returned, even when it breaks a rule.
 *   3. The coherence rules run here, against the profile that was fetched.
 *      Their messages come back as `errors`, not as a loop retry that could
 *      leave no answer to report.
 */
import '../telemetry/prices';
import { createAnswerValidator } from '@fde/schema';
import {
  ToolRegistry,
  runLoop,
  loopChoice,
  engineLabel,
  loggedModelName,
  cachedInputTokensOf,
  type LoopEvent,
} from '@fde/agent';
import { logRequest, priceOf } from '@fde/telemetry';
import { env, openaiClient } from '../foundry/client';
import { createProfileCache, getProfileSectionTool } from '../tools/get-profile-section';
import { AddressAnswerSchema, coherenceErrors, type AddressAnswer } from '../schema/address-answer';
import { ADDRESS_SYSTEM_PROMPT, buildAddressPrompt } from './prompt';

const validateShape = createAnswerValidator<AddressAnswer>({ schema: AddressAnswerSchema });

export interface AskUsage {
  model: string;
  engine: string;
  turns: number;
  toolCalls: number;
  inputTokens: number;
  /** Subset of inputTokens served from the prompt cache. Undefined when not reported. */
  cachedInputTokens?: number;
  outputTokens: number;
  /** Null when the model has no price entry. A ceiling when caching is not reported. */
  costUsd: number | null;
  ms: number;
  stoppedBecause: string;
}

export interface AskOptions {
  /** Where the question came from: 'ask' | 'eval:addr-001#1'. */
  surface?: string;
  /**
   * 'sdk' | 'mastra' | 'langgraph'. Defaults to 'sdk' here, not to the LOOP env
   * var: this app's default is the Agents SDK on Azure Foundry, and a shared
   * .env must not change that silently.
   */
  loop?: string;
  onEvent?: (e: LoopEvent) => void;
  /** Off only for callers that log the run themselves. */
  log?: boolean;
}

export interface AddressAskResult {
  /** Null when no structurally valid answer came back. */
  answer: AddressAnswer | null;
  /** Coherence errors for a valid answer. The loop failure reason when there is none. */
  errors: string[];
  usage: AskUsage;
}

export async function askAddress(address: string, question: string, opts: AskOptions = {}): Promise<AddressAskResult> {
  const started = Date.now();
  const choice = loopChoice(opts.loop ?? 'sdk');

  // One cache per question, so a cached profile never outlives the question.
  const loadProfile = createProfileCache();
  const profile = await loadProfile(address);

  const registry = new ToolRegistry([getProfileSectionTool(loadProfile)]);
  const result = await runLoop<AddressAnswer>(
    choice,
    openaiClient(),
    env.chatDeployment(),
    registry,
    buildAddressPrompt(address, question),
    {
      system: ADDRESS_SYSTEM_PROMPT,
      responseFormat: AddressAnswerSchema,
      validate: validateShape,
      agentName: 'address',
      summariseResult: (r: any) => {
        if (typeof r?.section !== 'string') return null;
        return r.status === 'ok' ? `${r.section} ok` : `${r.section} ${r.status}`;
      },
      onEvent: opts.onEvent,
    },
  );

  const answer = result.structured ?? null;
  const errors = answer
    ? coherenceErrors(answer, profile)
    : result.schemaErrors.length
      ? [...result.schemaErrors]
      : [`no valid answer (${result.stoppedBecause})`];

  const inputTokens = result.turns.reduce((a, t) => a + t.inputTokens, 0);
  const outputTokens = result.turns.reduce((a, t) => a + t.outputTokens, 0);
  const cachedInputTokens = cachedInputTokensOf(result.turns);
  const toolCalls = result.turns.reduce((a, t) => a + t.toolCalls.length, 0);
  const model = loggedModelName(env.chatDeployment());
  const usage: AskUsage = {
    model,
    engine: engineLabel(choice),
    turns: result.turns.length,
    toolCalls,
    inputTokens,
    ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
    outputTokens,
    costUsd: priceOf(model, inputTokens, outputTokens, cachedInputTokens),
    ms: Date.now() - started,
    stoppedBecause: result.stoppedBecause,
  };

  if (opts.log !== false) {
    logRequest({
      subject: address,
      question,
      model,
      engine: usage.engine,
      turns: usage.turns,
      toolCalls,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      ms: usage.ms,
      stoppedBecause: usage.stoppedBecause,
      schemaRetries: result.schemaErrors.length,
      surface: opts.surface ?? 'bostad-ask',
    });
  }

  return { answer, errors, usage };
}
