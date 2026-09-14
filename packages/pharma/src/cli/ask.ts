/**
 *   pnpm ask "may LOT-IBU200-2609-B be released to the EU?"
 *   pnpm ask "..." --trace
 *   pnpm ask "..." --loop mastra
 *
 * The first thing in this package that runs end to end: question in, tool
 * called, validated ReleaseAnswer out. The first step that costs money.
 *
 * KEEP `--trace` ON WHILE LEARNING. The interesting part of an agent is not the
 * answer, it is which tools it chose and in what order. A wrong answer with a
 * sensible trace is a PROMPT problem; a wrong answer with a nonsense trace is a
 * TOOL DESCRIPTION problem. The answer alone cannot tell you which.
 *
 * A RENDERER, NOTHING MORE. Every decision about how a release question is
 * answered lives in `release-agent.ts`, so a CLI and a future web route cannot
 * drift into answering differently while both look healthy.
 */
import { askRelease, closeReleaseContext } from '../agent/loop/release-agent';
import type { ReleaseAnswer, ReleaseBlocker } from '../schema/release-schema';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function findings(title: string, items: ReleaseBlocker[]): void {
  if (!items.length) return;
  console.log(`\n─── ${title} (${items.length}) ` + '─'.repeat(Math.max(0, 56 - title.length)));
  for (const b of items) {
    // `in_short` first, because it is the line a reader scans; the code stays
    // beside it because it is what the assessment actually emitted, and the
    // prose beneath it is the rule rather than the fact.
    console.log(`  ${b.in_short}`);
    console.log(`    \x1b[2m${b.code}\x1b[0m`);
    console.log(`    ${b.why_it_blocks}`);
    for (const c of b.citations) {
      console.log(`    ${c.ref}${c.as_of ? `  as of ${c.as_of}` : '  \x1b[33m(no as-of)\x1b[0m'}`);
      console.log(`      "${c.detail.replace(/\s+/g, ' ').slice(0, 100)}"`);
    }
  }
}

function render(a: ReleaseAnswer): void {
  console.log('\n─── SUMMARY ' + '─'.repeat(57));
  console.log(a.summary ?? '(none — escalated)');
  console.log(`\nlot: ${a.lot_id}   market: ${a.market}   spec: ${a.governing_spec_version ?? '—'}`);

  findings('BLOCKERS', a.blockers);

  // The gates, in order — and the heading says "WOULD HAVE TO HAPPEN FIRST"
  // rather than "TO RELEASE IT", because the second phrasing quietly promises
  // an outcome this system does not get to promise. A QP still decides after
  // every one of them is met.
  if (a.what_would_clear_it.length) {
    console.log(
      `\n─── WOULD HAVE TO HAPPEN FIRST (${a.what_would_clear_it.length}) ` + '─'.repeat(28),
    );
    a.what_would_clear_it.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  }

  findings('CONCERNS', a.concerns);

  if (a.missing.length) {
    console.log(`\n─── NOT CHECKED (${a.missing.length}) ` + '─'.repeat(45));
    for (const m of a.missing) console.log(`  • ${m}`);
  }
  if (a.unverified_claims.length) {
    console.log(`\n─── UNVERIFIED (${a.unverified_claims.length}) ` + '─'.repeat(46));
    for (const u of a.unverified_claims) console.log(`  • ${u}`);
  }
  if (a.escalate) {
    console.log('\n─── ESCALATE ' + '─'.repeat(56));
    console.log(`  reason: ${a.escalate.reason}`);
    console.log(`  owner : ${a.escalate.suggested_owner}`);
  }

  // Said once, at the end, every time. The schema forbids the model claiming
  // otherwise; this is the human-facing half of the same rule.
  console.log('\n  \x1b[2mThis is not a certification. A Qualified Person decides.\x1b[0m');
}

async function main(): Promise<void> {
  const question = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0];
  const trace = process.argv.includes('--trace');

  if (!question) {
    console.error('usage: ask.ts "<question>" [--trace] [--loop sdk|mastra]');
    process.exit(1);
  }

  const result = await askRelease({
    question,
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
          if (e.type === 'tool_result') console.log(`  ← ${e.ok ? 'ok' : 'ERR'} ${e.ms}ms  ${e.summary}`);
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

  console.log('\n─── RUN ' + '─'.repeat(61));
  console.log(
    `  turns=${result.turns.length}  toolCalls=${result.toolCalls}  ` +
      `tokens=${result.inputTokens}in/${result.outputTokens}out  ` +
      `wall=${(result.ms / 1000).toFixed(1)}s  stopped=${result.stoppedBecause}  engine=${result.engine}`,
  );
  // Cost, printed every time and never on request. A number you have to ask for
  // is a number nobody asks for — and this is the one that decides whether an
  // idea is worth running a hundred times.
  //
  // A CEILING: cached input bills at one tenth and is not modelled, so real
  // spend is at or below this. Said here rather than in a footnote, because the
  // number will be quoted.
  console.log(
    result.costUsd === null
      ? '  cost: unknown — no verified rate for this model'
      : `  cost: $${result.costUsd.toFixed(4)}  \x1b[2m${result.costBasis ?? ''}\x1b[0m`,
  );
  console.log(`  \x1b[2mlogged to logs/requests.jsonl\x1b[0m`);
  if (result.schemaErrors.length) {
    console.log(`  schema retries: ${result.schemaErrors.length}`);
    for (const e of result.schemaErrors) console.log(`    - ${e}`);
  }

  // Without this the six pg clients keep the event loop alive and the CLI
  // prints its answer, then hangs.
  await closeReleaseContext();
}

main().catch(async (e) => {
  console.error('FAILED:', e?.message ?? e);
  await closeReleaseContext();
  process.exit(1);
});
