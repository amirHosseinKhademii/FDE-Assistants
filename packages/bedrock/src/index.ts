/**
 * @fde/bedrock — Amazon Bedrock, with AWS credentials.
 *
 * A DEPLOYMENT adapter, not a domain one — the same role `@fde/foundry` plays
 * for Azure. That package's own docstring says "a customer on AWS writes a
 * sibling of this and changes nothing else." This is that sibling, and writing
 * it is how we find out whether the claim was true.
 *
 * (It was not, quite: `loop-mastra.ts` and `loop-langgraph.ts` reach for
 * `DefaultAzureCredential` directly instead of going through `@fde/foundry`,
 * so Azure is threaded through three places rather than one. Noted here
 * because the gap is the interesting part, not an embarrassment.)
 *
 * EMPTY ON PURPOSE. Step 1 is the package shell and the dependency; the
 * credential resolution and the request adapter land in steps 2 and 3.
 */
export {};
