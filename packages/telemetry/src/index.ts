/**
 * @fde/telemetry — one durable line per request, and a way to ship it.
 *
 * WHY A FILE AND NOT A DASHBOARD. The line is written when the call happens,
 * locally, synchronously-ish, and a failure to write it never fails the
 * request. A dashboard that is down must not cost you the record of what you
 * just spent — and "what did this cost" is a question you get asked long after
 * the dashboard's retention window.
 *
 * WHAT IS YOURS: where the file lives, what a token costs, and what a `subject`
 * means. Prices especially — they differ per model, per region and per
 * contract, and a price baked into a package is quietly wrong at somebody
 * else's customer. A cost figure that is quietly wrong is worse than none.
 */
export {
  configureRequestLog,
  priceOf,
  priceDetail,
  logRequest,
  type RequestLogConfig,
  type RequestRecord,
  type Price,
} from './request-log';

export { syncRequestLog } from './sync';
