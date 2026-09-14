/**
 *   pnpm ask "how much rental car is covered?" --policy AUT-4471
 *   pnpm ask "is he covered driving for Uber?" --policy AUT-4473
 *   pnpm ask "..." --policy AUT-4482 --trace
 *
 * The first thing in this repo that runs end to end: question in, tools called,
 * validated CoverageAnswer out.
 *
 * `--trace` prints every tool call as it happens. Keep it on while you are
 * learning — the interesting part of an agent is not the answer, it is which
 * tools it chose and in what order. A wrong answer with a sensible trace is a
 * prompt problem; a wrong answer with a nonsense trace is a tool-description
 * problem. You cannot tell those apart from the answer alone.
 */

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function render(a: CoverageAnswer): void {
  console.log('\n─── ANSWER ' + '─'.repeat(58));
  console.log(a.answer ?? '(none — escalated)');

  console.log(`\npolicy: ${a.policy_id ?? '—'}   form: ${a.policy_form ?? '—'}`);

  console.log(`\n─── CITATIONS (${a.citations.length}) ` + '─'.repeat(48));
  for (const c of a.citations) {
    console.log(`  • ${c.claim}`);
    console.log(`    ${c.source}`);
    console.log(`    "${c.detail.replace(/\s+/g, ' ').slice(0, 100)}"`);
  }
  if (!a.citations.length) console.log('  (none)');

  if (a.unverified_claims.length) {
    console.log(`\n─── UNVERIFIED (${a.unverified_claims.length}) ` + '─'.repeat(48));
    for (const u of a.unverified_claims) console.log(`  • ${u}`);
  }

  if (a.conflicts.length) {
    console.log(`\n─── CONFLICTS (${a.conflicts.length}) ` + '─'.repeat(49));
    for (const c of a.conflicts) {
      console.log(`  ${c.topic}`);
      for (const p of c.positions) console.log(`    ${p.source}  →  ${p.says}`);
      console.log(`    resolved by: ${c.resolved_by ?? 'NOTHING — must escalate'}`);
    }
  }

  if (a.escalate) {
    console.log('\n─── ESCALATE ' + '─'.repeat(56));
    console.log(`  reason: ${a.escalate.reason}`);
    console.log(`  owner : ${a.escalate.suggested_owner}`);
  }
}

import { askCoverage } from './coverage';
import { REQUEST_LOG } from './telemetry/prices';
import type { CoverageAnswer } from './schema/coverage-schema';

async function main(): Promise<void> {
  const question = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0];
  const policyId = arg('--policy');
  const trace = process.argv.includes('--trace');

  if (!question) {
    console.error('usage: ask.ts "<question>" [--policy AUT-0000] [--trace] [--loop sdk|mastra]');
    process.exit(1);
  }

  // The SAME assembly the web route uses. `ask.ts` is a renderer for the
  // terminal, nothing more — everything about how a coverage question is
  // answered lives in coverage.ts, so the CLI and the browser cannot drift.
  const result = await askCoverage({
    question,
    policyId,
    loop: arg('--loop'),
    surface: 'ask',
    onEvent: trace
      ? (e: any) => {
          if (e.type === 'turn_start') console.log(`\n[turn ${e.turn}]`);
          if (e.type === 'tool_call') {
            // The Agents SDK hands args over as a JSON string, Mastra as an
            // object. Render them identically.
            const args = typeof e.args === 'string' ? e.args : JSON.stringify(e.args);
            console.log(`  → ${e.name}(${args})`);
          }
          if (e.type === 'tool_result') {
            console.log(`  ← ${e.ok ? 'ok' : 'ERR'} ${e.ms}ms  ${e.summary}`);
          }
          if (e.type === 'schema_retry') console.log(`  ⟳ schema retry: ${e.error}`);
        }
      : undefined,
  });

  if (result.structured) {
    render(result.structured);
  } else {
    console.log(`\nNO VALID ANSWER — stopped because: ${result.stoppedBecause}`);
    console.log(result.text.slice(0, 800));
  }

  // Cost and latency are first-class. askCoverage() already wrote the durable
  // line to the request log; this is just the human-readable echo of it.
  console.log('\n─── RUN ' + '─'.repeat(61));
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
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
