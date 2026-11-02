/**
 * Where the request log goes, and what it charges.
 *
 * No prices are configured for this application. A price belongs to a contract, a
 * region and a model, and this application has none of those yet. Cost fields stay
 * empty rather than being filled from another deployment's price list.
 */
import { resolve } from 'node:path';
import { configureRequestLog } from '@fde/telemetry';
import { REPO_ROOT } from '../config/paths';

export const REQUEST_LOG = resolve(REPO_ROOT, 'logs/brf-requests.jsonl');

configureRequestLog({ path: REQUEST_LOG, prices: {} });
