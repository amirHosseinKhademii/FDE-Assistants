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
import { loopChoice, engineLabel } from '@fde/agent';
import { REPO_ROOT } from '../config/connections';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { spawnMcpServer } from '../agent/mcp-client';
import { askThornbury, type AskEvent } from '../agent/ask';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const caseId = args[0]?.startsWith('CAS-') ? args.shift()! : 'CAS-90003';
  const question = args.join(' ') || 'What was ordered on this case, and has any part of it already been refunded?';

  const server = await spawnMcpServer();
  try {
    let exitCode = 0;
    let answerText = '';
    let toolOkCount = 0;

    await askThornbury({
      caseId,
      question,
      url: server.url,
      token: server.token,
      onEvent: (e: AskEvent) => {
        switch (e.type) {
          case 'start':
            console.log(`\n  engine ${engineLabel(loopChoice())} · model ${e.model} · case ${e.caseId}`);
            console.log(`  "${question}"\n`);
            break;
          case 'tool':
            console.log(`  → ${e.name}(${JSON.stringify(e.args)}) [${e.ms}ms] ${e.ok ? '✓' : '✗'}`);
            if (e.ok) toolOkCount++;
            break;
          case 'answer':
            answerText = e.text;
            console.log(`\n${e.text}\n`);
            break;
          case 'error':
            const msg = e.message;
            if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED|high demand|503/i.test(msg)) {
              console.log(`\n  PROVIDER, NOT CODE — the model endpoint refused: ${msg.slice(0, 200)}\n`);
              exitCode = 3;
            } else {
              console.log(`\n  ERROR: ${msg}\n`);
              exitCode = 1;
            }
            break;
        }
      },
    });

    // Print final status (matching the original output format)
    if (exitCode === 0) {
      const ok = toolOkCount > 0 && answerText.trim().length > 0;
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'}  the model called ${toolOkCount} tool(s) through MCP and answered\n`,
      );
      exitCode = ok ? 0 : 1;
    }

    return exitCode;
  } finally {
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
