/**
 * STEP 4b — the same tool, pointed at the real backend.
 *
 * WHAT THIS IS SUPPOSED TO PROVE, and it is a narrow claim: that going from the
 * stub to the live API is a BASE URL CHANGE and nothing else. If anything else
 * has to change, the stub was lying, and Step 4a's six green checks were green
 * about a fiction.
 *
 * It is also the first moment four independently-green strands have to agree:
 * the estate (five Neon databases), the NestJS API on :3610, this MCP server,
 * and the case→order resolution that connects them. Each has its own passing
 * checks. None of that is evidence that they agree with each other.
 *
 *   pnpm commerce:mcp-live
 */
import { loadEnv } from '../config/env';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { Client } from '@modelcontextprotocol/client';
import { createServer } from '../server';
import { apiConfigFromEnv } from '../api/client';
import { sessionFromEnv } from '../session';
import type { Outcome } from '../api/outcome';

loadEnv();

async function connectLive(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'commerce-live', version: '0.1.0' });
  await Promise.all([
    createServer().connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

function describeConfig(): void {
  const cfg = apiConfigFromEnv();
  const session = sessionFromEnv();
  console.log('\nStep 4b — the live backend\n');
  console.log(`  api            ${cfg.baseUrl}`);
  console.log(`  service token  ${cfg.serviceToken ? `set (${cfg.serviceToken.length} chars)` : 'NOT SET — every call will refuse'}`);
  console.log(`  case           ${session.caseId}`);
  console.log(`  order          ${session.orderId}   (resolved from the case, not chosen by the model)`);
  console.log('');
}

function report(outcome: Outcome<any>, text: string): number {
  if (!outcome.ok) {
    console.log(`  REFUSED   cause=${outcome.cause}`);
    console.log(`            ${outcome.detail}\n`);
    // A refusal is a legitimate answer, not a crash — but for THIS case, with a
    // case id that does own this order, it means the strands do not agree.
    return 1;
  }
  console.log('  OK — the order came back across the boundary\n');
  console.log(text.split('\n').map((l) => `    ${l}`).join('\n'));
  console.log('');
  return 0;
}

async function main(): Promise<void> {
  describeConfig();
  const client = await connectLive();
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const outcome = result.structuredContent as Outcome<any>;
  const text = (result.content as Array<{ text?: string }>)[0]?.text ?? '';

  const failed = report(outcome, text);
  console.log(`  isError            ${result.isError ?? false}`);
  console.log(`  structuredContent  ${outcome.ok ? 'ok:true' : `ok:false cause=${outcome.cause}`}`);
  await client.close();
  process.exit(failed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
