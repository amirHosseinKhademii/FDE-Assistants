/**
 *   pnpm --filter @bostad/ai ask "Kungsportsavenyen 1, Göteborg" "How far is the nearest tram stop?"
 *
 * Prints the JSON answer, any coherence errors, and one usage line. Exits 0
 * even when the answer has errors: the errors are the output, not a crash.
 */
import { askAddress } from '../agent/ask';

async function main(): Promise<void> {
  const [address, question] = process.argv.slice(2);
  if (!address || !question) {
    console.error('usage: ask.ts "<address>" "<question>"');
    process.exit(1);
  }

  const r = await askAddress(address, question, { surface: 'ask' });

  console.log(r.answer ? JSON.stringify(r.answer, null, 2) : '(no valid answer)');

  if (r.errors.length) {
    console.log(`\ncoherence errors (${r.errors.length}):`);
    for (const e of r.errors) console.log(`  - ${e}`);
  }

  const u = r.usage;
  const cost = u.costUsd === null ? 'n/a' : `$${u.costUsd.toFixed(6)}`;
  console.log(
    `\nturns=${u.turns} toolCalls=${u.toolCalls} tokens=${u.inputTokens}in/${u.outputTokens}out ` +
      `cost=${cost} wall=${(u.ms / 1000).toFixed(1)}s stopped=${u.stoppedBecause} engine=${u.engine}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
