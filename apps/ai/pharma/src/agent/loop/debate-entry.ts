import { chatClient, chatModelName } from '@fde/agent';
/**
 * Argue about one lot — the one entry point every surface uses.
 *
 * WHY THIS EXISTS RATHER THAN LETTING THE ROUTE ASSEMBLE IT. `debateLot` takes
 * a lot, a supplier and a client; getting those means running the walk, picking
 * the worst contested lot and building a Foundry client. That is APPLICATION
 * ASSEMBLY, and the standing rule here is that it happens in one place — the
 * same rule `askRelease` and `askSupplierImpact` already follow. A web route
 * doing it would be a second place, and two places drift: the CLI and the page
 * would argue about different lots while both looked healthy.
 *
 * WHICH LOT, AND WHY IT IS NOT A MODEL'S CHOICE. The top of the walk's own
 * ranking among the contested ones — exposure band first, then quantity. That
 * is a sort over data already in hand, and putting a model in front of a sort
 * adds a way to be wrong and no way to be more right.
 *
 * WHAT "CONTESTED" MEANS is `isContested`, and it is narrow on purpose: the lot
 * must have LEFT our control and carry a finding. Whether a lot shipped to a
 * hospital is on file — two agents disputing it is theatre that costs money
 * like the real thing. What is arguable is what SOP-SCM-004 §7.3 leaves open.
 */
import { openaiClient, env } from '@fde/foundry';
import { priceDetail } from '@fde/telemetry';
import '../../telemetry/prices';
import { openHandle } from '../../tools/utils/handle';
import {
  assessSupplierImpact,
  type AffectedLotAssessment,
} from '../../tools/functions/assess-supplier-impact';
import { debateLot, isContested, SIDES, type DebateOptions, type DebateResult } from './lot-debate';

export interface DebateTopLotOptions {
  supplierId: string;
  loop?: string;
  onStage?: DebateOptions['onStage'];
  /** Called once the lot has been chosen, before any model call goes out. */
  onStart?: (info: {
    lot: Pick<
      AffectedLotAssessment,
      'lotId' | 'productName' | 'market' | 'exposure' | 'quantityUnits' | 'findings'
    >;
    supplier: { supplierId: string; name: string; disqualifiedOn: string | null; reason: string | null };
    sides: { precaution: string; proportion: string };
    contestedCount: number;
  }) => void;
}

export type DebateTopLotResult =
  | {
      ok: true;
      result: DebateResult;
      /** Null when no rate is published for the deployment that ran. */
      costUsd: number | null;
      costBasis: string;
    }
  | { ok: false; reason: string; because: 'not_found' | 'not_contested' };

export async function debateTopLot(
  opts: DebateTopLotOptions,
): Promise<DebateTopLotResult> {
  const handle = openHandle();
  let dossier: Awaited<ReturnType<typeof assessSupplierImpact>>;
  try {
    dossier = await assessSupplierImpact(handle, opts.supplierId);
  } finally {
    await handle.close();
  }

  if ('found' in dossier && dossier.found === false) {
    return { ok: false, reason: dossier.reason, because: 'not_found' };
  }

  const full = dossier as Exclude<typeof dossier, { found: false }>;
  const contested = full.affected.filter(isContested);
  if (!contested.length) {
    return {
      ok: false,
      because: 'not_contested',
      reason:
        `Nothing to argue about for ${opts.supplierId}. A lot is contested only when it left ` +
        'our control AND carries a finding — where the procedure genuinely leaves the next ' +
        'step open. Every affected lot here is either still ours, expired, or carries no finding.',
    };
  }

  const lot = contested[0];
  const supplier = {
    supplierId: full.supplier.supplierId,
    name: full.supplier.name,
    disqualifiedOn: full.supplier.disqualifiedOn,
    reason: full.supplier.disqualifiedReason,
  };

  opts.onStart?.({
    lot: {
      lotId: lot.lotId,
      productName: lot.productName,
      market: lot.market,
      exposure: lot.exposure,
      quantityUnits: lot.quantityUnits,
      findings: lot.findings,
    },
    supplier,
    sides: { precaution: SIDES.precaution.label, proportion: SIDES.proportion.label },
    contestedCount: contested.length,
  });

  const result = await debateLot({
    lot,
    supplier,
    client: chatClient(() => openaiClient()),
    loop: opts.loop,
    onStage: opts.onStage,
  });

  // Priced HERE rather than in the route, for the same reason the walk is
  // assembled here: a surface that computes its own cost is a second place the
  // rate can be wrong, and a cost figure that is quietly wrong is worse than no
  // cost figure at all.
  const { costUsd, basis: costBasis } = priceDetail(
    chatModelName(env.chatDeployment()),
    result.inputTokens,
    result.outputTokens,
    result.cachedInputTokens,
  );

  return { ok: true, result, costUsd, costBasis };
}
