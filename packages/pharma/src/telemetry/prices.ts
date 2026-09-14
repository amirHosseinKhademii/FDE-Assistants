/**
 * WHAT A TOKEN COSTS on THIS deployment.
 *
 * Prices live in the domain package and not in `@fde/telemetry` because they are
 * a property of a contract, a region and a model — not of logging. A price baked
 * into a shared package is quietly wrong at somebody else's customer, and a cost
 * figure that is quietly wrong is worse than no cost figure at all.
 *
 * DELIBERATELY A SECOND COPY of `packages/insurance/src/telemetry/prices.ts`,
 * not an import of it. The two domains share a Foundry resource TODAY and that
 * is a coincidence of this exercise, not a property of either. Importing would
 * make a second customer's rate card a dependency of the first's.
 */
import { resolve } from 'node:path';
import { configureRequestLog, type Price } from '@fde/telemetry';
import { REPO_ROOT } from '../config/connections';

/** The SAME file the insurance side writes to — one log, `surface` tells them apart. */
export const REQUEST_LOG = resolve(REPO_ROOT, 'logs/requests.jsonl');

const PRICES: Record<string, Price> = {
  // Re-verified 2026-09-12 against the Azure retail price API:
  //   serviceName='Foundry Models', armRegionName='swedencentral'
  // → $0.00002 per 1K tokens on the '-glbl' (GlobalStandard) meter.
  // Consumed by `pnpm ingest`, which is the cost that scales with the CORPUS
  // rather than with traffic. At 31 chunks it rounds to zero; at a real
  // customer's document set it does not.
  'text-embedding-3-small': {
    inputPerM: 0.02,
    outputPerM: 0,
    source: "prices.azure.com retail API, 'Foundry Models', swedencentral, glbl",
    checked: '2026-09-12',
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
   * enabled" and was wrong.
   *
   * MODELLED SINCE 2026-09-12. `cachedInputPerM` below is that meter's rate,
   * and the loop now reports how many input tokens it served — so a figure is
   * a ceiling only when an engine stays silent, rather than always. The caveat
   * travels on `costNote` per line; it is no longer a blanket disclaimer.
   */
  'gpt-5-mini': {
    inputPerM: 0.25,
    // The `cchd` meter above, and a TENTH of the fresh input rate. Declared
    // here and not in `@fde/telemetry` for the same reason every other rate is:
    // it belongs to this deployment's contract, not to the logging code.
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
