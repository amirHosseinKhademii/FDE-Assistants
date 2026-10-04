/**
 * `pnpm commerce:ask-mcp` — Step 10's check: one question, through the real
 * loop, answered from the MCP server.
 *
 * The tools the model sees are NOT defined in this process. They are listed from
 * a separate server over HTTP on 2026-07-28, filtered by the client's allowlist,
 * converted into the registry the three engines already consume — and the loop
 * does not know the difference. That is the claim; this runs it.
 *
 * A SMOKE TEST, NOT A SCORECARD. One model call on a free tier. The system text
 * below is deliberately minimal and says nothing about the traps: the judgment
 * layer (prompt, answer schema, coherence — PLAN.md §8) is not written, and
 * coaching the model here would make the eval suite measure this file. What is
 * asserted is the PLUMBING — that the model called a tool through MCP and the
 * answer came back — not the answer's quality. A 429 or quota error is
 * reported as exactly that, never as a code failure.
 *
 *   pnpm commerce:ask-mcp                          CAS-90003, the default question
 *   pnpm commerce:ask-mcp CAS-90001 "what happened to this delivery?"
 */
import { chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { REPO_ROOT } from '../config/connections';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { connectToThornbury, spawnMcpServer } from '../agent/mcp-client';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

const SYSTEM =
  "You are helping a resolutions specialist at Thornbury Goods, an online retailer. " +
  "Answer from Thornbury's own records, using the tools. Say what you found and which tool it came from.";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const caseId = args[0]?.startsWith('CAS-') ? args.shift()! : 'CAS-90003';
  const question = args.join(' ') || 'What was ordered on this case, and has any part of it already been refunded?';

  const server = await spawnMcpServer();
  const t = await connectToThornbury({ url: server.url, token: server.token, caseId });
  try {
    const choice = loopChoice();
    const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
    console.log(`\n  engine ${engineLabel(choice)} · model ${model} · case ${caseId}`);
    console.log(`  tools over MCP: [${t.gate.tools.map((x) => x.schema.name).join(', ')}]  withheld: [${t.gate.withheld.join(', ')}]`);
    console.log(`  "${question}"\n`);

    const calls: Array<{ name: string; ok: boolean }> = [];
    let result;
    try {
      result = await runLoop<string>(choice, chatClient(openaiClient), model, t.registry, question, {
        system: SYSTEM,
        onEvent: (e: any) => {
          if (e.type === 'tool_call') console.log(`  → ${e.name}(${JSON.stringify(e.args)})`);
          if (e.type === 'tool_result') calls.push({ name: e.name, ok: e.ok });
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED|high demand|503/i.test(msg)) {
        console.log(`\n  PROVIDER, NOT CODE — the model endpoint refused: ${msg.slice(0, 200)}\n`);
        return 3;
      }
      throw e;
    }

    const text = result.text;
    console.log(`\n${text}\n`);
    const throughMcp = calls.filter((c) => c.ok);
    const ok = throughMcp.length > 0 && text.trim().length > 0;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'}  the model called ${throughMcp.length} tool(s) through MCP ` +
        `[${throughMcp.map((c) => c.name).join(', ')}] and answered\n`,
    );
    return ok ? 0 : 1;
  } finally {
    await t.close();
    server.stop();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
