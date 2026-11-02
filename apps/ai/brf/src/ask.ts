/**
 * pnpm brf:ask: one board question, answered from the BRF index.
 *
 *   pnpm brf:ask "Får man ha grill på balkongen?"
 *   pnpm brf:ask "..." --trace          print every tool call as it happens
 *   pnpm brf:ask "..." --loop mastra    choose the engine for this run
 *
 * Keep --trace on while learning the application. A wrong answer with a sensible trace
 * points at the prompt. A wrong answer with a nonsense trace points at the tool. The
 * answer alone cannot tell the two apart.
 */
import './config/env';
import { askBrf, closeBrfContext } from './answer';
import { REQUEST_LOG } from './telemetry/request-log';
import type { BrfAnswer } from './schema/answer-schema';

const argv = process.argv.slice(2);

function arg(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

/** The first argument that is neither a flag nor the value of one. */
function questionFrom(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--loop') {
      i++;
      continue;
    }
    if (args[i].startsWith('--')) continue;
    return args[i];
  }
  return undefined;
}

function render(a: BrfAnswer): void {
  console.log('\nANSWER');
  console.log(a.answer ?? '(none, escalated)');

  console.log(`\nCITATIONS (${a.citations.length})`);
  for (const c of a.citations) {
    console.log(`  - ${c.file} ${c.section}: ${c.claim}`);
    console.log(`    "${c.detail.replace(/\s+/g, ' ').slice(0, 120)}"`);
  }
  if (!a.citations.length) console.log('  (none)');

  if (a.unverified_claims.length) {
    console.log(`\nUNVERIFIED (${a.unverified_claims.length})`);
    for (const u of a.unverified_claims) console.log(`  - ${u}`);
  }

  if (a.conflicts.length) {
    console.log(`\nCONFLICTS (${a.conflicts.length})`);
    for (const c of a.conflicts) {
      console.log(`  ${c.topic}`);
      for (const p of c.positions) console.log(`    ${p.file} ${p.section}: ${p.says}`);
      console.log(`    resolved by: ${c.resolved_by ?? 'NOTHING. It must be escalated.'}`);
    }
  }

  if (a.escalate) {
    console.log('\nESCALATE');
    console.log(`  reason: ${a.escalate.reason}`);
    console.log(`  owner : ${a.escalate.suggested_owner}`);
  }
}

async function main(): Promise<void> {
  const question = questionFrom(argv);
  const trace = argv.includes('--trace');

  if (!question) {
    console.error('usage: ask.ts "<question>" [--trace] [--loop mastra|sdk|langgraph]');
    process.exit(1);
  }

  // The same assembly every surface uses. This file only renders.
  const result = await askBrf({
    question,
    loop: arg('--loop'),
    surface: 'ask',
    onEvent: trace
      ? (e: any) => {
          if (e.type === 'turn_start') console.log(`\n[turn ${e.turn}]`);
          if (e.type === 'tool_call') {
            // The Agents SDK passes arguments as a JSON string, Mastra as an object.
            const args = typeof e.args === 'string' ? e.args : JSON.stringify(e.args);
            console.log(`  -> ${e.name}(${args})`);
          }
          if (e.type === 'tool_result') {
            console.log(`  <- ${e.ok ? 'ok' : 'ERR'} ${e.ms}ms  ${e.summary}`);
          }
          if (e.type === 'schema_retry') console.log(`  retry: schema ${e.error}`);
        }
      : undefined,
  });

  if (result.structured) {
    render(result.structured);
  } else {
    console.log(`\nNO VALID ANSWER, stopped because: ${result.stoppedBecause}`);
    console.log(result.text.slice(0, 800));
  }

  // The request log line is written before anything is rendered. This echoes it.
  console.log('\nRUN');
  console.log(
    `  turns=${result.turns.length}  toolCalls=${result.toolCalls}  ` +
      `tokens=${result.inputTokens}in/${result.outputTokens}out  wall=${(result.ms / 1000).toFixed(1)}s  ` +
      `stopped=${result.stoppedBecause}  engine=${result.engine}`,
  );
  console.log(`  logged to ${REQUEST_LOG}`);
  if (result.schemaErrors.length) {
    console.log(`  schema retries: ${result.schemaErrors.length}`);
    for (const e of result.schemaErrors) console.log(`    - ${e}`);
  }

  await closeBrfContext();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.message ?? e);
  await closeBrfContext().catch(() => undefined);
  process.exit(1);
});
