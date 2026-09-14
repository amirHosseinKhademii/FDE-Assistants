/**
 * WHAT A TOKEN COSTS on THIS deployment.
 *
 * Prices belong here and not in `@fde/telemetry` because they are a property of
 * a contract, a region and a model — not of logging. A price baked into a
 * package is quietly wrong at somebody else's customer, and a cost figure that
 * is quietly wrong is worse than no cost figure at all.
 */
import { resolve } from 'node:path';
import { configureRequestLog, type Price } from '@fde/telemetry';
import { REPO_ROOT } from '../config/paths';

export const REQUEST_LOG = resolve(REPO_ROOT, 'logs/requests.jsonl');

const PRICES: Record<string, Price> = {
  // Verified 2026-09-10 against the Azure retail price API:
  //   serviceName='Foundry Models', armRegionName='swedencentral',
  //   meterName='text-embedding-3-small-glbl'  →  $0.00002 per 1K tokens.
  // '-glbl' is the GlobalStandard meter, which is what this deployment uses.
  // Consumed by `pnpm ingest`, which is the cost that scales with the CORPUS
  // rather than with traffic — worth being able to price separately.
  'text-embedding-3-small': {
    inputPerM: 0.02,
    outputPerM: 0,
    source: "prices.azure.com retail API, 'Foundry Models', swedencentral, glbl",
    checked: '2026-09-10',
  },

  /**
   * SETTLED 2026-09-12, and the provisional rate was 1.8x TOO HIGH.
   *
   * The retail API is queried by `meterName`, and searching it for "5 mini"
   * returns only the `pp` (priority processing) meters — which is why this was
   * unresolved for two days and why the guess leaned expensive. The bill knows
   * better. `az consumption usage list` on `rg-claims-fde` names the meters this
   * resource ACTUALLY hits:
   *
   *   Azure OpenAI GPT5 - GPT 5 Mini Inpt Glbl       $0.25 /1M
   *   Azure OpenAI GPT5 - GPT 5 Mini outpt Glbl      $2.00 /1M
   *   Azure OpenAI GPT5 - GPT 5 Mini cchd Inpt Glbl  $0.025/1M
   *
   * Not `pp` at all. The lesson is worth keeping: a published price list tells
   * you what a meter COSTS; only the bill tells you which meter you are ON.
   *
   * CACHED INPUT IS ALREADY BEING BILLED — the `cchd` meter appears on this
   * resource, so Azure's automatic prompt caching is already applying to the
   * repeated system prompt and tool schema. An earlier note here called it "not
   * enabled" and was wrong. It is not modelled below because `Price` carries no
   * cached rate and the loop does not yet surface cached-token counts, so the
   * figure logged is a CEILING: real spend is lower whenever caching hits.
   */
  'gpt-5-mini': {
    inputPerM: 0.25,
    // The `cchd` meter, a tenth of the fresh input rate. SAME Foundry resource
    // as the pharma side today, and the meter was confirmed on the one bill
    // covering both — which is why the same figure appears in two files that
    // deliberately do not import each other. If the domains are ever split
    // across resources, this is one of the numbers to re-check rather than
    // assume followed.
    cachedInputPerM: 0.025,
    outputPerM: 2.0,
    source:
      "prices.azure.com retail API 'GPT 5 Mini Inpt/outpt Glbl 1M Tokens', " +
      'swedencentral; meters confirmed against the actual bill via ' +
      '`az consumption usage list`. Cached input bills at $0.025/1M and IS ' +
      'modelled; per-line costNote says whether it was measured.',
    checked: '2026-09-12',
  },
};

configureRequestLog({ path: REQUEST_LOG, prices: PRICES });
