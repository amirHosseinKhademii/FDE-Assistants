/**
 * `pnpm db:release <lot-id> --to EU` — may this lot go to this market?
 *
 * SIBLING OF `db:trace`, AND THE DIFFERENCE IS THE POINT. `db:trace` shows the
 * six silos and leaves the reading to a human. This asks one question and
 * answers it — same walk underneath, judgement on top.
 *
 * A PRINTER, NOTHING MORE. Every decision below was made in
 * `tools/functions/release.ts`; this file chooses colours. That separation is
 * what lets the same assessment be handed to a model without rewriting any of
 * it — which `--json` is the proof of.
 *
 * `--json` PRINTS THE DOSSIER VERBATIM, NOT A VIEW OF IT. If the JSON needed a
 * field the human output does not have, or dropped one it does, the two would
 * be different answers to the same question. The dossier carries no `Date`
 * objects for the same reason: every date in it is already the `YYYY-MM-DD`
 * string it was judged as, so there is nothing for a serializer to decide.
 */
import { openHandle } from '../tools/utils/handle';
import { assessRelease } from '../tools/functions/assess-release';
import type { Market } from '../tools/departments/erp';

const MARKETS: Market[] = ['US', 'EU'];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const lotId = args.find((a) => !a.startsWith('--')) ?? 'LOT-IBU200-2609-B';
  const asJson = args.includes('--json');

  // `indexOf` returns -1 when the flag is absent, and `args[0]` is the lot id —
  // so reading `args[i + 1]` unguarded made `--to` effectively mandatory while
  // looking optional. Default only when the flag is genuinely not there.
  const toIdx = args.indexOf('--to');
  const to = (toIdx === -1 ? 'EU' : (args[toIdx + 1] ?? '')).toUpperCase() as Market;

  if (!MARKETS.includes(to)) {
    // No GB yet, and saying so beats answering a question about a market that
    // does not exist in the estate. See docs/pharma/NEXT.md.
    console.error(`\n  Unknown market '${to}'. Known: ${MARKETS.join(', ')}.\n`);
    process.exit(1);
  }

  const h = openHandle();
  const dossier = await assessRelease(h, lotId, to);
  if (!dossier) {
    console.error(`\n  No such lot: ${lotId}\n`);
    await h.close();
    process.exit(1);
  }

  // The machine surface. Stage 3 hands exactly this to the tool-calling loop.
  if (asJson) {
    console.log(JSON.stringify(dossier, null, 2));
    await h.close();
    return;
  }

  const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`;
  const dim = (s: string): string => `\x1b[2m${s}\x1b[0m`;

  console.log(`\n${bold(`${dossier.lotId} → ${dossier.market}`)}   ${dossier.product}`);
  console.log(dim(`  judged against ${dossier.governingSpecVersion ?? 'no specification'}\n`));

  for (const f of dossier.findings) {
    const tag = f.severity === 'blocker' ? '\x1b[31mBLOCKER\x1b[0m' : '\x1b[33mCONCERN\x1b[0m';
    console.log(`  ${tag}  ${f.code}`);
    console.log(`          ${f.summary}`);
    for (const e of f.evidence) console.log(dim(`          ${e.ref}${e.asOf ? `  as of ${e.asOf}` : ''}`));
    console.log();
  }
  for (const m of dossier.missing) console.log(dim(`  not checked: ${m}`));

  // Never "yes, ship it". The QP signs; this prepares the file they sign.
  console.log(dossier.releasable
    ? `\n  \x1b[32mNo blocker found.\x1b[0m ${dim('Not a certification — for QP review.')}`
    : `\n  \x1b[31mNot releasable to ${dossier.market}.\x1b[0m ${dim(`${dossier.findings.filter((f) => f.severity === 'blocker').length} blocker(s).`)}`);
  console.log(dim(`\n  ${h.fetches} queries across 6 databases.\n`));

  await h.close();
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
