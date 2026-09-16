/**
 * @fde/agent — the tool-calling loop, behind one contract, with three engines.
 *
 * The loop is the same everywhere: send the question, see whether the model
 * asked for something, fetch it, send it back, repeat under a cap, and check
 * the final answer is the right shape. What differs between projects is the
 * tools, the prompt and the answer contract — all three of which you supply.
 *
 * WHY THREE ENGINES, AND NOT UNIFORMLY. `loop.types.ts` has always claimed the
 * engine is replaceable. One implementation cannot test that claim; two can,
 * and the eval suite settles which is better rather than an opinion. Measured
 * on 2026-09-11 (insurance, `sdk` vs `mastra`): both correct, one steadier, one
 * cheaper on some cases and dearer on others — a difference you only see by
 * running both. `langgraph` was added later, deliberately scoped to shapes
 * that need checkpointed per-step state (many rows, not one decision) rather
 * than bolted on everywhere a second engine already settled the question — see
 * `docs/pharma/BOTTLENECK-2.md` in the insurance-claims-assistant tree.
 *
 * LAYOUT: `core/` is the shared contract (types, registry, factory) that owns
 * no framework import. `sdk/`, `mastra/`, `langgraph/` are one folder per
 * engine, each with its loop and its own compliance self-test — a compliance
 * property proved on one engine says nothing about another, because each
 * talks to a different transport.
 *
 * THREE THINGS THIS PACKAGE REFUSES TO DEFAULT:
 *
 *   the validator   a loop that invented an answer shape would be checking
 *                   against something nobody agreed to
 *   the fixture dir a package that picked a path would write files into
 *                   somebody else's repo layout
 *   the tools       obviously
 *
 * WHAT IT DOES GUARANTEE: a failed tool returns readable JSON the model can
 * recover from rather than throwing; schema failures are handed BACK to the
 * model rather than silently repaired, so the failure rate stays visible; and
 * every tool call leaves an audit record saying whether it went live or
 * replayed a fixture.
 */
export {
  DEFAULT_BEDROCK_MODEL,
  DEFAULT_MAX_TURNS,
  type LoopOptions,
  type LoopEvent,
  type LoopResult,
  type TurnRecord,
  type ValidationResult,
  loggedModelName,
  DEFAULT_LOCAL_MODEL,
  DEFAULT_LOCAL_BASE_URL,
} from './core/loop.types';

export { cachedInputTokensOf } from './core/usage';
export {
  runFanout,
  pooled,
  DEFAULT_FANOUT_CONCURRENCY,
  type FanoutSpec,
  type FanoutOutcome,
  type ItemOutcome,
} from './core/fanout';
export { ToolRegistry } from './core/registry';
export type { Tool, ToolSchema, ToolCallRecord } from './core/tool.types';

export {
  configureFixtures,
  fixtured,
  fixtureMode,
  throughFixture,
  lastSource,
  type FixtureMode,
} from './core/fixtures';

export { runLoopSdk } from './sdk/loop';
export { configureSdk } from './sdk/provider';
export { toSdkTools } from './sdk/tools';
export { runLoopMastra } from './mastra/loop';
export { buildFoundryProvider, buildBedrockProvider, selectModel } from './mastra/provider';
export { toMastraTools } from './mastra/tools';
// The two package-level self-tests. Named `*-selftest.ts` like every other one
// in this repo — `provider-switch.ts` read like a module you could import for
// its behaviour, and it is a check you run.
export { runProviderSwitchCheck } from './provider-switch-selftest';
export { runSettleCheck } from './core/settle-selftest';
export { runLoopLangGraph } from './langgraph/loop';
export {
  buildFoundryChatModel,
  buildBedrockChatModel,
  selectChatModel,
} from './langgraph/provider';
export { toLangGraphTools } from './langgraph/tools';
export { runLoop, loopChoice, engineLabel, type LoopChoice } from './core/loop.factory';

export {
  runSdkComplianceCheck,
  type ComplianceFixture,
} from './sdk/compliance-sdk';
export { runMastraComplianceCheck } from './mastra/compliance-mastra';
export { runLangGraphComplianceCheck } from './langgraph/compliance-langgraph';
