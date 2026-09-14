/**
 * @fde/bedrock — Amazon Bedrock, with AWS credentials.
 *
 * A DEPLOYMENT adapter, not a domain one — the same role `@fde/foundry` plays
 * for Azure. That package's docstring says "a customer on AWS writes a sibling
 * of this and changes nothing else." This is that sibling, written to find out
 * whether the claim held.
 *
 * IT DID NOT, QUITE, and the gap is the useful part: `loop-mastra.ts` and
 * `loop-langgraph.ts` construct `DefaultAzureCredential` directly instead of
 * going through `@fde/foundry`, so Azure is threaded through three places
 * rather than one. A second cloud is how you find that out; a code review did
 * not.
 */
export { env, bedrockClient, credentialKind } from './client';
export { chatCompletion } from './openai-shape';
export type { ChatRequest, ChatResponse } from './openai-shape';
