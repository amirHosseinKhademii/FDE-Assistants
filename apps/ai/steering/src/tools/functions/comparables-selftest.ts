/**
 * `pnpm steering:comparables-check` — does the pricing judgement hold, and can
 * it refuse?
 *
 * Live against the derived database. NO MODEL, NO EMBEDDINGS, NO COST, so this
 * one is safe to run on every build.
 *
 * ── WHAT IS BEING CHECKED IS THE RULES, NOT THE ARITHMETIC ───────────────
 *
 * Whether 722 is the right median is `walk-check`'s question and
 * `derived:reconcile`'s before that. This asks something narrower and more
 * important for a tool: that the three rules a caller must not be able to route
 * around actually hold at the boundary.
 *
 *   price from the MEDIAN, never the mean
 *   say `n` every time
 *   refuse below three, and return NO NUMBER AT ALL when refusing
 *
 * The third is the one worth asserting hardest. A refusal that still carried a
 * median would be quoted anyway — somebody would read past the sentence to the
 * number, because there was a number. So the check is not "does it say it
 * refused"; it is "is every figure null".
 */
import { openDerived } from '../utils/handle';
import { findComparableWork } from './find-comparable-work';
import { findComparableWorkTool } from '../../agent/tool/find-comparable-work.tool';
import { MIN_COMPARABLES } from '../../answer/derive';
import { report, type Result } from '../../db/init/assertions';

/** A set known to be large enough. */
const PRICED = { changeClass: 'modify_hardware', elementKind: 'gearbox', safetyCaseImpact: false };
/** A set known to be too small — the case the cost walk refuses on. */
const THIN = { changeClass: 'new_function', elementKind: 'software_domain', asil: 'D' };

async function main(): Promise<void> {
  const h = openDerived();
  const r: Result = { ok: [], fail: [] };
  const note = (pass: boolean, label: string, detail: string): void => {
    r[pass ? 'ok' : 'fail'].push({ label, detail });
  };

  try {
    // ── 1 · a real set prices, and says what it rests on ──────────────────
    const priced = await findComparableWork(h, PRICED);
    if (!priced.found) throw new Error(`the corpus is not loaded: ${priced.reason}`);

    note(
      priced.enough && priced.n >= MIN_COMPARABLES && typeof priced.medianHours === 'number',
      'a set of three or more produces a price, with n stated',
      `n=${priced.n} of ${priced.available} available · median ${priced.medianHours} h · ` +
        `EUR ${priced.totalEur} · matched on ${priced.matchedOn.join(', ')}`,
    );

    // ── 2 · the price is apportioned from the MEDIAN, not the mean ────────
    //
    // Checked by arithmetic rather than by trusting the field name: the
    // discipline hours must sum to the median. If the mean had been used the
    // sum would be the mean, and on this set the two differ by 54%.
    const apportioned = priced.disciplines.reduce((a, d) => a + d.hours, 0);
    const toMedian = Math.abs(apportioned - (priced.medianHours ?? 0));
    const toMean = Math.abs(apportioned - (priced.meanHours ?? 0));
    note(
      toMedian <= 1 && toMean > 1,
      'the euro breakdown is apportioned from the median, not the mean',
      `disciplines sum to ${apportioned.toFixed(0)} h; median ${priced.medianHours}, ` +
        `mean ${priced.meanHours} — off the median by ${toMedian.toFixed(1)}, off the mean by ${toMean.toFixed(1)}`,
    );

    // ── 3 · every priced job carries a file, a line and a sentence ────────
    const facts = priced.evidence.flatMap((e) => e.facts);
    const cited = facts.filter((f) => f.sentence && f.line !== null);
    const example = priced.evidence
      .flatMap((e) => e.facts.map((f) => ({ ...f, sourcePath: e.sourcePath })))
      .find((f) => f.sentence && f.line !== null);
    note(
      priced.evidence.length === priced.n && facts.length > 0 && cited.length === facts.length,
      'every job in the set traces to a sentence in a file',
      // The example pairs a fact with ITS OWN file. The first version quoted
      // the first job's path beside the first fact's line number, which are not
      // necessarily the same document — a citation assembled from two places,
      // in the check that exists to assert citations are not.
      `${priced.evidence.length} jobs, ${facts.length} facts, all with a line number — ` +
        `e.g. ${example?.sourcePath}:${example?.line} "${(example?.sentence ?? '').slice(0, 48)}…"`,
    );

    // ── 4 · below three, it refuses AND CARRIES NO NUMBER ─────────────────
    const thin = await findComparableWork(h, THIN);
    if (!thin.found) throw new Error(`unexpected miss on a valid key: ${thin.reason}`);

    const numberless =
      thin.medianHours === null && thin.meanHours === null &&
      thin.totalEur === null && thin.spread === null && thin.disciplines.length === 0;
    note(
      !thin.enough && thin.n < MIN_COMPARABLES && numberless && !!thin.refusal,
      'below the threshold there is a refusal and no figure anywhere in the result',
      `n=${thin.n} · median ${thin.medianHours} · total ${thin.totalEur} · ` +
        `${thin.disciplines.length} disciplines — nothing to misread as a price`,
    );

    // ── 5 · the refusal is a sentence somebody can act on ─────────────────
    note(
      (thin.refusal ?? '').length > 60 && /\d/.test(thin.refusal ?? ''),
      'the refusal explains itself, with numbers',
      `"${(thin.refusal ?? '').slice(0, 120)}…"`,
    );

    // ── 6 · an invented value is a MISS, not "we have never done that" ────
    //
    // The distinction the whole `ComparableWorkMiss` type exists for: a typo and
    // a genuine gap both return zero rows, and reporting one as the other sends
    // somebody hunting for history that was never missing.
    const bogus = await findComparableWork(h, { changeClass: 'modify_gearbox_thingy' });
    note(
      !bogus.found && !!bogus.known?.changeClass?.length,
      'a value no document uses comes back as a miss, listing what IS used',
      bogus.found ? 'it was reported as a refusal — indistinguishable from a real gap'
        : `"${bogus.reason.slice(0, 80)}…" · knows ${bogus.known?.changeClass?.length} change classes`,
    );

    // ── 7 · the tool wrapper does not throw on model-supplied nonsense ────
    //
    // A throw is reserved for plumbing. `ToolCallRecord.cause` in `@fde/agent`
    // separates `unknown_tool` (a model failure) from `threw` (infrastructure),
    // and a tool that throws on a bad argument files a model's mistake under
    // infrastructure — pointing every debugging hour at the wrong layer.
    const tool = findComparableWorkTool(h);
    let threw = false;
    let out: unknown;
    try {
      out = await tool.execute({ change_class: "x' or '1'='1", asil: 'zzz' });
    } catch {
      threw = true;
    }
    note(
      !threw && !!out && (out as any).found === false,
      'the tool returns an informative miss for a bad argument, never a throw',
      threw ? 'IT THREW — a model error would be recorded as broken plumbing'
        : `answered with a miss: "${String((out as any).reason).slice(0, 70)}…"`,
    );

    // ── 8 · the schema describes every parameter ──────────────────────────
    //
    // A parameter's description is the only thing telling the model what to put
    // there. A missing one is a tool that gets called with wrong arguments — a
    // failure that looks like a model problem and is a documentation problem.
    const shape = (tool.schema.parameters as any).shape ?? {};
    const undescribed = Object.entries(shape)
      .filter(([, v]) => !(v as any)?.description && !(v as any)?._def?.description)
      .map(([k]) => k);
    note(
      Object.keys(shape).length > 0 && undescribed.length === 0,
      'every tool parameter carries a description',
      undescribed.length ? `missing on: ${undescribed.join(', ')}`
        : `${Object.keys(shape).length} parameters, all described`,
    );

    note(
      h.reconnects === 0,
      'the handle needed no reconnect',
      `${h.fetches} queries, ${h.reconnects} reconnects`,
    );
  } finally {
    await h.close();
  }

  process.exit(report('comparables:check', r));
}

if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
