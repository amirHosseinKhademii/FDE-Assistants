/**
 *   pnpm pharma:debate SUP-04
 *   pnpm pharma:debate SUP-04 --lot LOT-AMX250-2411-A
 *   pnpm pharma:debate SUP-04 --limit 3
 *   pnpm pharma:debate SUP-04 --no-rebuttal
 *
 * Watch two sub-agents disagree about one lot, and a third turn the
 * disagreement into something a Qualified Person can act on.
 *
 * COSTS MONEY — five model calls per lot with the rebuttal round, three
 * without. DEFAULTS TO ONE LOT for that reason: the first run of anything that
 * fans out should be cheap enough that finding out it was wrong does not hurt.
 * Pass `--limit` to argue about more.
 *
 * WHAT TO WATCH FOR, because the interesting part is not the conclusion:
 *
 *   CONCEDES        — the strongest point each advocate grants the other. An
 *                     advocate that concedes nothing is reciting, not arguing,
 *                     and this is where you see it.
 *   THE REBUTTAL    — compare round 2 against round 1. A rebuttal identical to
 *                     its opening means the advocate did not read the opposing
 *                     case; the concession that MOVES between rounds is the
 *                     whole value of a second round.
 *   WHERE THEY AGREE — usually the most useful line on the page, because it is
 *                     the part the human does not have to re-litigate.
 *   THE QUESTION    — `decision_for_human` ends in a question mark, enforced by
 *                     a coherence rule. The moment it reads as an answer, the
 *                     system has made a decision it is built not to make.
 */
import { openHandle } from '../tools/utils/handle';
import { DIM, OFF, BOLD, RED, YELLOW, flag, wrap as wrapAt } from './format';

/** This CLI indents its prose deeply — the arguments sit inside labelled
 *  blocks — so it binds the shared `wrap` to its own indent once. */
const wrap = (s: string, indent = 8): string => wrapAt(s, indent, 88);
import { assessSupplierImpact } from '../tools/functions/assess-supplier-impact';
import { openaiClient } from '@fde/foundry';
import { debateLot, isContested, rebuttalValue, type DebateResult } from '../agent/loop/lot-debate';
import { ToolRegistry } from '@fde/agent';
import { openStore } from '@fde/grounding';
import { searchProceduresTool } from '../agent/tool/search-procedures.tool';
import { openEmbeddings } from '../grounding/embeddings.factory';
import { KB_DB, urlFor } from '../config/connections';
import { priceDetail } from '@fde/telemetry';
import { env } from '@fde/foundry';
import '../telemetry/prices';


function show(d: DebateResult): void {
  console.log(`\n${BOLD}── ${d.lotId} ─────────────────────────────────────────────${OFF}`);

  for (const [round, args] of [['OPENING', d.opening], ['REBUTTAL', d.rebuttal]] as const) {
    if (!args.precaution && !args.proportion) continue;
    console.log(`\n  ${BOLD}${round}${OFF}`);
    for (const side of ['precaution', 'proportion'] as const) {
      const a = args[side];
      if (!a) continue;
      console.log(`\n    ${side === 'precaution' ? 'PRECAUTION' : 'PROPORTION'}`);
      console.log(wrap(a.position));
      console.log(`${DIM}      strongest:${OFF}`);
      console.log(wrap(a.strongest_point));
      if (a.holds) {
        console.log(`${DIM}      holds:${OFF}`);
        console.log(wrap(a.holds));
      }
      console.log(`${DIM}      concedes:${OFF}`);
      console.log(wrap(a.concedes));
      console.log(`${DIM}      would change its mind if:${OFF}`);
      console.log(wrap(a.what_would_change_my_mind));
    }
  }

  const j = d.adjudication;
  if (j) {
    console.log(`\n  ${BOLD}FOR THE QUALIFIED PERSON${OFF}`);
    console.log(`\n    ${BOLD}${j.decision_for_human}${OFF}`);
    console.log(`\n${DIM}      case for precaution:${OFF}`);
    console.log(wrap(j.case_for_precaution));
    console.log(`${DIM}      case for proportion:${OFF}`);
    console.log(wrap(j.case_for_proportion));
    console.log(`${DIM}      where they agree:${OFF}`);
    console.log(wrap(j.where_they_agree));
    console.log(`${DIM}      what would settle it:${OFF}`);
    console.log(wrap(j.what_would_settle_it));
    console.log(`${DIM}      owner:${OFF} ${j.suggested_owner}`);
    console.log(`${DIM}      urgency:${OFF}`);
    console.log(wrap(j.urgency_basis));
  }

  for (const e of d.errors) console.log(`\n    \x1b[31m${e}\x1b[0m`);

  // DID ROUND 2 EARN ITS KEEP? Printed every run, because the first run's
  // rebuttal made the two sides MORE alike and that was only visible by reading
  // both rounds side by side.
  //
  // THE VERDICT AND ITS WORDING COME FROM `@fde/evals`. Formatting it here
  // would mean two places deciding what counts as a collapse, which is how the
  // threshold in one drifts from the threshold in the other.
  const rv = rebuttalValue(d);
  if (rv) {
    const colour = rv.verdict === 'held' ? '' : rv.verdict === 'static' ? YELLOW : RED;
    const conceded = rv.concededAway
      ? `; conceded-away: ${rv.concededAway[0].toFixed(2)}, ${rv.concededAway[1].toFixed(2)}`
      : '';
    console.log(
      `\n${DIM}    rebuttal: overlap ${rv.openingOverlap.toFixed(2)} → ${rv.rebuttalOverlap.toFixed(2)}` +
        `  (moved: ${rv.moved[0].toFixed(2)}, ${rv.moved[1].toFixed(2)}${conceded})${OFF}` +
        `\n${DIM}    ${colour}${rv.explain}${OFF}`,
    );
  }

  const { costUsd, basis } = priceDetail(
    env.chatDeployment(), d.inputTokens, d.outputTokens, d.cachedInputTokens,
  );
  console.log(
    `\n${DIM}    ${d.calls} model calls  ${d.inputTokens}in/${d.outputTokens}out  ` +
      `${(d.ms / 1000).toFixed(0)}s  $${(costUsd ?? 0).toFixed(4)}  ${basis}${OFF}`,
  );
}

async function main(): Promise<void> {
  const supplierId = process.argv[2];
  if (!supplierId || supplierId.startsWith('--')) {
    console.log('\n  usage: pnpm pharma:debate SUP-04 [--lot LOT-ID] [--limit N] [--no-rebuttal]\n');
    process.exit(1);
  }

  const h = await openHandle();
  /**
   * Closed in `finally`, and the reason is a real defect this command shipped
   * with: the vector store the adjudicator searches through holds its own
   * connection pool, it was opened and never closed, so the process stayed
   * alive after printing everything until Neon dropped the idle connection —
   * and the command exited 1 on a run that had completely succeeded.
   *
   * A command that exits non-zero on success is worse than one that fails
   * loudly: everything downstream that checks an exit code believes the wrong
   * thing, and the output above it says otherwise.
   */
  let store: Awaited<ReturnType<typeof openStore>> | undefined;

  try {
    const dossier = await assessSupplierImpact(h, supplierId);
    if ('found' in dossier) {
      console.log(`\n  ${dossier.reason}\n`);
      process.exit(1);
    }

    // Only the contested ones. The narrowness IS the design — see `isContested`.
    let lots = dossier.affected.filter(isContested);
    const only = flag('lot');
    if (only) lots = lots.filter((l) => l.lotId === only);
    const limit = Number(flag('limit') ?? 1);
    const total = lots.length;
    lots = lots.slice(0, Math.max(1, limit));

    console.log(
      `\n  ${dossier.supplier.name} (${supplierId}), disqualified ${dossier.supplier.disqualifiedOn}` +
        `\n  ${dossier.affected.length} affected lot(s); ${total} contested` +
        `\n  arguing about ${lots.length}${total > lots.length ? ` — pass --limit ${total} for all` : ''}\n`,
    );

    if (!lots.length) {
      console.log('  Nothing contested. Every affected lot is in our control, expired, or clean.\n');
      return;
    }

    const client = openaiClient();

    // ONLY the adjudicator gets this. See the note on `speak`'s `registry`
    // parameter: the advocates argue over the brief they were handed, and two
    // advocates retrieving their own supporting passages is a debate about two
    // different documents.
    store = await openStore(openEmbeddings(client), {
      connectionString: urlFor(KB_DB),
      tableName: 'document_chunks',
    });
    const procedures = new ToolRegistry([searchProceduresTool(store)]);

    const supplier = {
      supplierId: dossier.supplier.supplierId,
      name: dossier.supplier.name,
      disqualifiedOn: dossier.supplier.disqualifiedOn,
      reason: dossier.supplier.disqualifiedReason,
    };

    // SERIAL across lots, parallel WITHIN a lot. The two advocates of one lot
    // genuinely do not depend on each other in round 1, so they run together;
    // running several lots at once as well is how you meet a rate limit, which
    // this project has already done once today.
    for (const lot of lots) {
      show(await debateLot({
        lot, supplier, client, procedures,
        rebuttal: !process.argv.includes('--no-rebuttal'),
      }));
    }
    console.log();
  } finally {
    // TEARDOWN MUST NEVER FAIL THE COMMAND. Both of these talk to a serverless
    // Postgres that may already have hung up; a close that throws here would
    // turn a successful run into a failed one for the second time.
    await Promise.allSettled([
      h.close?.(),
      (store as any)?.end?.() ?? (store as any)?.pool?.end?.(),
    ]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
