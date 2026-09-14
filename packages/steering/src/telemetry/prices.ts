/**
 * WHAT A TOKEN COSTS on THIS deployment.
 *
 * ── A THIRD COPY, DELIBERATELY, AND THE REASON MATTERS ───────────────────
 *
 * Insurance and pharma each hold one of these, and this is the third. Two turns
 * ago a different third copy — the embeddings factory — was extracted into
 * `@fde/grounding` precisely BECAUSE it had reached three. So the two decisions
 * have to be told apart, or the next person will apply the wrong one.
 *
 *   the embeddings factory was MECHANISM: batching, ordering, a provider
 *   switch. Identical in three places because the problem is identical. Three
 *   copies of that is a smell and extraction was overdue.
 *
 *   a price is POLICY: a property of a contract, a region and a model. The
 *   three copies happen to agree TODAY because all three engagements sit on one
 *   Foundry resource, which is a coincidence of this practice repo and not a
 *   fact about any customer. Importing one customer's rate card into another's
 *   makes a renegotiation somewhere else change your invoice.
 *
 * **Duplication of mechanism is a smell; duplication of policy that happens to
 * coincide is not.** A price baked into a shared package is quietly wrong at
 * somebody else's customer, and a cost figure that is quietly wrong is worse
 * than no cost figure at all.
 *
 * ── THE RATES BELOW ARE PHARMA'S, AND WHY THAT IS EVIDENCE ───────────────
 *
 * Not copied on trust. They were settled there against the actual bill, and the
 * lesson recorded with them is the one worth carrying: a published price list
 * tells you what a meter COSTS; only the bill tells you which meter you are ON.
 * Searching the retail API for "5 mini" returns only the priority-processing
 * meters, and a guess taken from those ran 1.8x high for two days.
 *
 *   az consumption usage list --resource-group rg-claims-fde
 *
 * is what named the meters this resource actually hits. Re-run it before
 * trusting these at a real engagement; the `checked` date says how stale they
 * are, and this file should be re-verified rather than assumed.
 */
import { resolve } from 'node:path';
import { configureRequestLog, type Price } from '@fde/telemetry';
import { REPO_ROOT } from '../config/connections';

/** The same log the other two engagements write to — `surface` tells them apart. */
export const REQUEST_LOG = resolve(REPO_ROOT, 'logs/requests.jsonl');

const PRICES: Record<string, Price> = {
  'text-embedding-3-small': {
    inputPerM: 0.02,
    outputPerM: 0,
    source: "prices.azure.com retail API, 'Foundry Models', swedencentral, glbl",
    checked: '2026-09-12',
  },

  'gpt-5-mini': {
    inputPerM: 0.25,
    // The `cchd` meter — a TENTH of fresh input. Azure caches automatically and
    // has been billing this meter all along; nothing here enables it.
    cachedInputPerM: 0.025,
    outputPerM: 2.0,
    source:
      "prices.azure.com retail API 'GPT 5 Mini Inpt/outpt Glbl 1M Tokens', " +
      'swedencentral; meters confirmed against the bill via `az consumption usage list`',
    checked: '2026-09-12',
  },
};

configureRequestLog({ path: REQUEST_LOG, prices: PRICES });
