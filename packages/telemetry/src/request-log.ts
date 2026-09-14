/**
 * One line per model call, written when it happens. Pillar 5.
 *
 * WHY A FILE AND NOT A DASHBOARD. This is the record that cannot be
 * reconstructed: the calls that already happened are gone, and no amount of
 * later tooling brings them back. A dashboard is something you add on top of a
 * durable log, never instead of one. `logs/requests.jsonl` can be grepped,
 * counted and summed with no service running.
 *
 * WHY IT NEVER THROWS. Telemetry that fails must not take down the thing it is
 * measuring. Every write is wrapped; a broken log costs you data, a broken
 * request costs the customer an answer.
 *
 * WHY `claim` IS FIRST-CLASS. "What did claim AUT-4471 cost, end to end" is the
 * question a finance team asks, and it is unanswerable unless the tag is
 * written at call time.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Where lines are written, and what a token costs — BOTH supplied by the app.
 *
 * Prices belong to a deployment, not to a package: they differ per model, per
 * region and per contract, and they change without warning. A price baked in
 * here would be quietly wrong at somebody else's customer, and a cost figure
 * that is quietly wrong is worse than no cost figure at all.
 */
export interface RequestLogConfig {
  /** Absolute path to the JSONL file. */
  path: string;
  /** Keyed by model name. A model with no entry logs a null cost and a reason. */
  prices: Record<string, Price>;
}

let CONFIG: RequestLogConfig | undefined;

export function configureRequestLog(c: RequestLogConfig): void {
  CONFIG = c;
}

/**
 * Verified prices only, per million tokens, with where the number came from.
 *
 * THE RULE, which survives whatever is in the table below: a model with no
 * entry logs `costUsd: null` plus a stated reason, never an invented figure. A
 * precise-looking wrong number is worse than an admitted gap — it gets quoted
 * in a business case.
 *
 * The `source` and `checked` fields exist so that in three months you can tell
 * whether a number is stale and where it came from. An entry whose `source`
 * begins PROVISIONAL is a placeholder that has not been confirmed against an
 * actual bill; that word travels onto every logged line, so the caveat cannot
 * be lost between here and a spreadsheet.
 */
export interface Price {
  inputPerM: number;
  outputPerM: number;
  /**
   * What a CACHED input token costs, if the deployment bills them separately
   * and you have confirmed the rate.
   *
   * OPTIONAL, AND ITS ABSENCE MEANS SOMETHING. Leave it out and cached tokens
   * are charged at the full `inputPerM`, which is the CEILING — the honest
   * answer when nobody has checked the bill. The rule above applies here
   * unchanged: a provider's marketing page saying caching is "up to 90%
   * cheaper" is not a verified rate, and guessing one here understates spend in
   * the direction that flatters the project.
   */
  cachedInputPerM?: number;
  source: string;
  checked: string;
}

export interface RequestRecord {
  /**
   * WHICH SUBJECT this request was about — a claim, a case, a ticket, a
   * patient. Null when the question named none.
   *
   * Kept as one opaque string rather than a typed entity, because the only
   * thing this layer does with it is group costs by it. A log that understood
   * your domain would need updating every time your domain changed.
   */
  subject: string | null;
  question: string;
  model: string;
  engine: string;
  turns: number;
  toolCalls: number;
  inputTokens: number;
  /**
   * How many of `inputTokens` were served from the provider's prompt cache.
   *
   * A SUBSET OF `inputTokens`, NOT AN ADDITION TO IT. Every provider that
   * reports this reports it that way, and the cost formula below subtracts
   * accordingly. Treated as an addition, a cache HIT would make a request look
   * MORE expensive — wrong in the direction nobody double-checks, because
   * cost going up is never the surprise that prompts an investigation.
   *
   * OPTIONAL, AND `undefined` IS NOT `0`. `0` means measured, and nothing was
   * cached. `undefined` means this engine does not report it, so the figure
   * stays a ceiling. Collapsing the two would turn "we don't know" into a
   * confident claim that caching never helps — precisely the quietly-wrong
   * number this file's header refuses to produce.
   */
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
  stoppedBecause: string;
  schemaRetries: number;
  /** 'ask' | 'eval' | whatever calls it. Keeps real traffic separable. */
  surface: string;
}

type Costed = RequestRecord & {
  ts: string;
  costUsd: number | null;
  costNote?: string;
  /** The modelling clause alone, for a surface that wants a short caption. */
  basis?: string;
};

function price(r: RequestRecord): Pick<Costed, 'costUsd' | 'costNote' | 'basis'> {
  const PRICING = CONFIG?.prices ?? {};
  const p = PRICING[r.model];
  if (!p) {
    return {
      costUsd: null,
      costNote: `no verified pricing for "${r.model}" — see PRICING in request-log.ts`,
    };
  }
  // ── how many input tokens are billed at the CHEAP rate ────────────────────
  //
  // Two independent facts have to be true before a discount is applied, and
  // either one missing means the figure stays a CEILING rather than becoming a
  // guess:
  //
  //   the ENGINE reported how many tokens were cached   (r.cachedInputTokens)
  //   the DEPLOYMENT has a confirmed cached rate        (p.cachedInputPerM)
  //
  // A ceiling is a number you can defend. A discount applied on half the
  // evidence is a number that understates spend, and understating spend is the
  // direction nobody audits.
  const reported = r.cachedInputTokens;
  const haveRate = typeof p.cachedInputPerM === 'number';

  // CLAMPED, because a cached count exceeding the input count would make the
  // uncached remainder negative and hand back a smaller bill the more absurd
  // the reading got. Providers report cached as a SUBSET; if one ever does not,
  // this refuses to profit from the discrepancy rather than trusting it.
  const cached =
    typeof reported === 'number' && haveRate
      ? Math.max(0, Math.min(reported, r.inputTokens))
      : 0;

  const usd =
    ((r.inputTokens - cached) / 1e6) * p.inputPerM +
    (cached / 1e6) * (p.cachedInputPerM ?? 0) +
    (r.outputTokens / 1e6) * p.outputPerM;

  // The caveat travels WITH the number, for the same reason `PROVISIONAL` does
  // on `source`: a figure and its caveat that live in different places are a
  // figure whose caveat gets lost on the way to a spreadsheet.
  const modelling =
    typeof reported !== 'number'
      ? 'CEILING: engine did not report cached tokens'
      : !haveRate
        ? `CEILING: ${reported} cached tokens reported but no verified cached rate for "${r.model}"`
        : `${cached} of ${r.inputTokens} input tokens billed as cached`;

  return {
    costUsd: Number(usd.toFixed(6)),
    costNote: `${p.source}, checked ${p.checked} — ${modelling}`,
    basis: modelling,
  };
}

/**
 * The cost AND the one line saying how it was arrived at.
 *
 * EXISTS SO A SURFACE CANNOT INVENT ITS OWN CAPTION. `ask.ts` printed a
 * hard-coded "(ceiling; cached input not modelled)" for months, which was true
 * when written and became a lie the moment caching was modelled — a caption
 * that cannot go stale is one nobody has to remember to update. Same reasoning
 * as `priceOf` itself: a rate table in two places disagrees with itself, and so
 * does a caveat.
 */
export function priceDetail(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens?: number,
): { costUsd: number | null; basis: string } {
  const r = price({ model, inputTokens, outputTokens, cachedInputTokens } as RequestRecord);
  return { costUsd: r.costUsd, basis: r.basis ?? '' };
}

/**
 * What a call would cost, without logging it.
 *
 * EXPORTED BECAUSE A COST THAT EXISTS ONLY IN A LOG FILE IS A COST EVERY
 * SURFACE HAS TO GO AND FIND. A CLI wanting to print it, or a web route wanting
 * to show it, would otherwise each need the rate table — and a rate table in
 * two places is a rate table that disagrees with itself. `logRequest` uses the
 * same function, so the printed figure and the logged one cannot diverge.
 *
 * Null when the model has no configured rate: a missing price is reported, not
 * guessed at as zero.
 */
export function priceOf(
  model: string,
  inputTokens: number,
  outputTokens: number,
  /** Optional and LAST, so every existing caller keeps working unchanged and
   *  keeps reporting a ceiling until it has a real number to pass. */
  cachedInputTokens?: number,
): number | null {
  return price({ model, inputTokens, outputTokens, cachedInputTokens } as RequestRecord).costUsd;
}

/** Append one line. Never throws. */
export function logRequest(r: RequestRecord): void {
  try {
    const line: Costed = { ts: new Date().toISOString(), ...r, ...price(r) };
    mkdirSync(dirname(CONFIG!.path), { recursive: true });
    appendFileSync(CONFIG!.path, JSON.stringify(line) + '\n', 'utf8');
  } catch {
    // Deliberately silent. See the header: a broken log must not break a request.
  }
}
