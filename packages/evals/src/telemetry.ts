/**
 * Langfuse — the UI and the run history for pillar 4.
 *
 * WHAT THIS IS AND, MORE IMPORTANTLY, WHAT IT IS NOT.
 *
 * Langfuse is adopted here as an **observer**, not as the eval runner. It does
 * ship a runner — `dataset.runExperiment({ task, evaluators })` — and that is
 * deliberately not used. Two reasons, both of which would have cost something
 * real:
 *
 *   1. `maxConcurrency` defaults to 50. The repeats in run.ts are serial ON
 *      PURPOSE, because the Foundry resource is shared with ../Travel-Assistant
 *      (PROGRESS.md issue #6). Handing over the loop means handing over that.
 *   2. `ExperimentParams` has no repeat count. The whole pillar rests on running
 *      each case N times and reporting a rate; an experiment runner that visits
 *      each item once turns the measurement back into a sample.
 *
 * So run.ts keeps the loop, the repeats, the severity buckets and the baseline
 * files, and this module reports what happened. That split is the reason
 * adopting a framework here costs nothing: nothing had to be given up to get
 * the dashboard.
 *
 * OFF BY DEFAULT, AND MUST STAY THAT WAY. With no LANGFUSE_* keys set, every
 * function here is a no-op and `pnpm eval` behaves exactly as it did before.
 * The eval suite must never require a running service to produce a number —
 * that would make the measurement depend on infrastructure that has nothing to
 * do with the model.
 *
 * WHERE THE DATA GOES. Wherever LANGFUSE_BASE_URL points, and nowhere else.
 * Self-hosted, that is your own server. This matters more than it looks: an
 * eval trace carries policy ids, coverage amounts and the model's reasoning
 * about a customer's entitlements. Pointing this at a vendor's cloud makes them
 * a processor of insurance data. `docs/langfuse.md` has the self-host notes.
 *
 * WHAT IT DOES *NOT* TURN ON. `loop-sdk.ts` calls `setTracingDisabled(true)`,
 * which kills the Agents SDK's own tracing — that exporter posts model inputs
 * and tool arguments to api.openai.com. Nothing here re-enables it. These are
 * separate mechanisms: the spans below are ours, created explicitly, exported
 * only to LANGFUSE_BASE_URL. `pnpm compliance:check` still asserts zero SDK
 * spans and still passes, which is the check that proves the two are unrelated.
 */
import type { CaseOutcome, SeverityClassifier } from './scorecard';
import { context } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import {
  setLangfuseTracerProvider,
  startActiveObservation,
  updateActiveObservation,
} from '@langfuse/tracing';
import { LangfuseClient } from '@langfuse/client';
import { } from './scorecard';

/** The one dataset the cases are pushed to. Version history is Langfuse's. */
/**
 * WHICH opts.dataset, and how a case becomes a trace input.
 *
 * Both are the application's: the dataset name groups runs in the dashboard,
 * and only the app knows which fields of its case are worth showing as input.
 */
export interface TelemetryOptions<C extends { id: string }, A> {
  /** Dataset name in Langfuse. Runs are grouped under it. */
  dataset: string;
  /** Shown against the dataset in the UI. */
  datasetDescription?: string;
  /**
   * OpenTelemetry service name. Without one every trace lands as
   * "unknown_service:node", and two projects pointed at the same Langfuse
   * become indistinguishable.
   */
  serviceName: string;
  /** What to record as the trace input for a case. */
  toInput(c: C): Record<string, unknown>;
  /** What the dataset item should carry as expected output and metadata. */
  toDatasetItem?(c: C): { expectedOutput?: unknown; metadata?: Record<string, unknown> };
  /** Which failures are dangerous — see SeverityClassifier. */
  severityOf: SeverityClassifier<A>;
}


function creds(): { publicKey: string; secretKey: string; baseUrl: string } | undefined {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL;
  // All three, or nothing. A partial config is a misconfiguration, and silently
  // treating it as "disabled" is how you discover at the end of a 20-minute run
  // that nothing was recorded.
  if (!publicKey && !secretKey && !baseUrl) return undefined;
  if (!publicKey || !secretKey || !baseUrl) {
    throw new Error(
      'Langfuse is half-configured. Set all of LANGFUSE_PUBLIC_KEY, ' +
        'LANGFUSE_SECRET_KEY and LANGFUSE_BASE_URL, or none of them.',
    );
  }
  return { publicKey, secretKey, baseUrl };
}

export interface EvalTelemetry<C extends { id: string }, A> {
  /** Push the case file to Langfuse as a dataset. Idempotent — `createItem`
   *  upserts on `id`, so re-running does not duplicate. */
  syncDataset(cases: C[]): Promise<void>;
  /** Wrap one case run in a trace. The outcome is scored, and when `runName`
   *  is given the trace is linked to its dataset item under that name — which
   *  is what makes two baselines comparable side by side in the UI.
   *
   *  `runName` is undefined for a `--repeat 1` smoke test. That run writes no
   *  baseline file, so naming a dataset run after it would put a run in the
   *  dashboard with no counterpart in git — and the one thing this integration
   *  promises is that a number on screen and a number in the repo point at each
   *  other. A smoke test still produces traces; it just does not pretend to be
   *  a measurement, in the dashboard or anywhere else. */
  traceRun(
    c: C,
    runIndex: number,
    runName: string | undefined,
    fn: () => Promise<CaseOutcome<A>>,
  ): Promise<CaseOutcome<A>>;
  flush(): Promise<void>;
  baseUrl: string;
}

/**
 * Returns undefined when Langfuse is not configured, and every call site treats
 * that as "skip". Written as an optional object rather than a set of `if
 * (enabled)` branches scattered through run.ts, so the runner has exactly one
 * conditional and stays readable.
 */
export async function startEvalTelemetry<C extends { id: string }, A>(
  opts: TelemetryOptions<C, A>,
): Promise<EvalTelemetry<C, A> | undefined> {
  const c = creds();
  if (!c) return undefined;

  const processor = new LangfuseSpanProcessor({
    publicKey: c.publicKey,
    secretKey: c.secretKey,
    baseUrl: c.baseUrl,
  });

  // An ISOLATED provider, not the global OTel one. `provider.register()` would
  // install a global tracer that any other instrumented library would start
  // feeding, which is how eval telemetry quietly acquires spans from libraries
  // nobody audited. This keeps the blast radius to spans we create by hand.
  // Without a service name every trace lands as "unknown_service:node", which
  // is fine with one producer and useless the moment `pnpm ask` is instrumented
  // too and the dashboard cannot tell an eval run from a live question.
  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ 'service.name': opts.serviceName }),
    spanProcessors: [processor],
  });
  setLangfuseTracerProvider(provider);

  // The context manager, however, DOES have to be global — and this is the one
  // piece that is easy to miss, because leaving it out fails quietly rather
  // than loudly. `provider.register()` would install both the global tracer and
  // a context manager; we want only the second. Without it, `context.with()`
  // falls back to a no-op manager, so a span is created and exported but is
  // never *active* — `updateActiveObservation()` then logs "No active OTEL span
  // in context. Skipping span update." and every trace arrives with no input,
  // no output and no metadata. Traces appear in the UI, so it looks like it
  // works until someone opens one.
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());

  const client = new LangfuseClient({
    publicKey: c.publicKey,
    secretKey: c.secretKey,
    baseUrl: c.baseUrl,
  });

  // Populated by syncDataset and reused for every link below. Fetching inside
  // traceRun (which is where this started) means one HTTP round trip per case
  // run — 35 of them on a full baseline, to re-read seven items that cannot
  // have changed. It worked when the only thing ever tested was a single case,
  // which is exactly the kind of bug a two-run smoke test hides.
  let items = new Map<string, any>();

  return {
    baseUrl: c.baseUrl,

    async syncDataset(cases) {
      // The dataset has to exist before an item can be added to it —
      // `createItem` 404s otherwise, which is a confusing failure on a first
      // run against a fresh server. `create` is an upsert on name, so calling
      // it every time is both safe and the simplest way to make `pnpm eval`
      // work against an empty Langfuse with no setup step.
      await client.api.datasets.create({
        name: opts.dataset,
        description: opts.datasetDescription ?? '',
      });

      for (const k of cases) {
        await client.dataset.createItem({
          datasetName: opts.dataset,
          id: k.id,
          input: opts.toInput(k),
          // The checks ARE the expected output. There is no golden answer in
          // this suite on purpose — §5 of PROGRESS.md: a check asks "is this
          // box empty when it should not be", never "was this a good answer".
          expectedOutput: opts.toDatasetItem?.(k)?.expectedOutput ?? null,
          metadata: opts.toDatasetItem?.(k)?.metadata ?? {},
        });
      }

      const dataset = await client.dataset.get(opts.dataset);
      items = new Map(dataset.items.map((i: any) => [i.id, i]));
    },

    async traceRun(k, runIndex, runName, fn): Promise<CaseOutcome<A>> {
      return startActiveObservation(
        `${k.id}#${runIndex}`,
        async (span: any) => {
          const outcome = await fn();

          updateActiveObservation({
            input: opts.toInput(k),
            output: outcome.answer ?? { error: outcome.error ?? outcome.stoppedBecause },
            metadata: {
              case: k.id,
              run: runIndex,
              
              turns: outcome.turns,
              toolCalls: outcome.toolCalls,
              // The NAMES, not just the count. A count cannot answer "did it
              // reach the guidance corpus, or did it hammer search_policy ten
              // times" — and those are the same number. Recording names is what
              // proved search_guidance was never being called at all.
              toolNames: outcome.toolNames ?? [],
              stoppedBecause: outcome.stoppedBecause,
              missingFixture: outcome.missingFixture,
            },
          });

          // One score per check, not one score for the run. A run that fails
          // `citations_resolve` and one that fails `answer_contains` are the
          // same 0 at run level and completely different problems; the whole
          // point of the scorecard is not to average them, and flattening them
          // here would put that back.
          for (const chk of outcome.checks) {
            client.score.observation(
              { otelSpan: span.otelSpan },
              {
                name: `check:${chk.name}`,
                value: chk.pass ? 1 : 0,
                dataType: 'NUMERIC',
                comment: chk.detail,
              },
            );
          }

          client.score.observation(
            { otelSpan: span.otelSpan },
            { name: 'passed', value: outcome.passed ? 1 : 0, dataType: 'NUMERIC' },
          );

          // Severity as a CATEGORICAL score. This is the field no eval platform
          // models natively and the reason none of them could replace the
          // runner — it is a classification of which check failed, not a check
          // result. Computed by scorecard.ts and merely reported here, so the
          // dashboard cannot drift from the printed card.
          client.score.observation(
            { otelSpan: span.otelSpan },
            { name: 'severity', value: opts.severityOf(outcome), dataType: 'CATEGORICAL' },
          );

          // Deprecated in favour of runExperiment, which cannot be used here
          // for the two reasons in this file's header. Kept because it is the
          // only way to attach an externally-driven run to a dataset item, and
          // wrapped so that a linking failure can never fail an eval run — the
          // measurement does not depend on the dashboard.
          //
          // Note what that tolerance costs if the call is ever wrong: 35 log
          // lines under a scorecard that still says PASS, and a dataset-run
          // view that is silently partial. Healthy-but-broken again, so the
          // failure is at least printed per occurrence rather than swallowed.
          if (runName) {
            try {
              await items.get(k.id)?.link({ otelSpan: span.otelSpan }, runName);
            } catch (e: any) {
              console.log(`      (langfuse: could not link ${k.id} — ${e?.message ?? e})`);
            }
          }

          return outcome;
        },
        { asType: 'span' },
      ) as Promise<CaseOutcome<A>>;
    },

    async flush() {
      await client.flush();
      await processor.forceFlush();
    },
  };
}
