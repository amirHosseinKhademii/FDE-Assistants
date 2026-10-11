/**
 * What a token costs on THIS deployment, for the bostad ask layer.
 *
 * The same Azure meters the insurance app is billed on (gpt-5-mini, swedencentral,
 * GlobalStandard). Kept as a copy rather than an import across apps: prices are
 * a property of the contract, and each app should say what it is billed on.
 * Requests go to the same log file, separated by `surface`.
 */
import { resolve } from 'node:path';
import { configureRequestLog, type Price } from '@fde/telemetry';
import { REPO_ROOT } from '../foundry/client';

export const REQUEST_LOG = resolve(REPO_ROOT, 'logs/requests.jsonl');

const PRICES: Record<string, Price> = {
  // Same meters as apps/ai/insurance/src/telemetry/prices.ts, checked 2026-09-12
  // against `az consumption usage list` on the shared resource.
  'gpt-5-mini': {
    inputPerM: 0.25,
    cachedInputPerM: 0.025,
    outputPerM: 2.0,
    source:
      "prices.azure.com retail API 'GPT 5 Mini Inpt/outpt Glbl 1M Tokens', " +
      'swedencentral; meters confirmed against the bill. Cached input is modelled.',
    checked: '2026-09-12',
  },
};

configureRequestLog({ path: REQUEST_LOG, prices: PRICES });
