/**
 *   pnpm pharma:fanout SUP-04
 *   pnpm pharma:fanout SUP-04 --limit 4          # cheap first look
 *   pnpm pharma:fanout SUP-04 --concurrency 2    # gentler on the rate limit
 *
 * The SAME question `pnpm pharma:ask` answers, by a different route: one
 * sub-agent per affected lot plus an assembler, instead of one agent reading
 * all twenty-three at once.
 *
 * COSTS MONEY — one model call per lot plus one for the assembler. All 23 lots
 * for SUP-04 is 24 calls. `--limit` exists so the first run does not have to be
 * the expensive one, and `--concurrency` because this project has already
 * turned an Azure rate limit into a baseline recording 2/15 for what was a
 * quota rather than a quality result.
 *
 * WHAT TO COMPARE IT AGAINST. The single-agent numbers from the supplier eval
 * baseline of 2026-09-12 (`sup-001`, median of five passing runs):
 *
 *     3 turns · 21,073 in / 10,354 out · 82s · ~$0.008 · all 23 rows
 *
 * The interesting question is not which is cheaper — it will not be this one.
 * It is whether twenty-three judgements made in isolation READ BETTER than
 * twenty-three made in one sitting, and what it costs to find out.
 */
import { askSupplierImpactFanout } from '../agent/loop/supplier-impact-fanout';
import { openHandle } from '../tools/utils/handle';
import { DIM, OFF, BOLD, RED, flag, wrap } from './format';


/** A numeric flag, or `undefined` when it was not passed at all. */
function numericFlag(name: string): number | undefined {
  const raw = flag(name);
  return raw === undefined ? undefined : Number(raw);
}

async function main(): Promise<void> {
  const supplierId = process.argv[2];
  if (!supplierId || supplierId.startsWith('--')) {
    console.log('\n  usage: pnpm pharma:fanout SUP-04 [--limit N] [--concurrency N]\n');
    process.exit(1);
  }

  const handle = openHandle();
  try {
    console.log(`\n  fanning out over ${supplierId}…\n`);

    const r = await askSupplierImpactFanout({
      supplierId,
      handle,
      // Read once each. `undefined` when absent is meaningful — it is the
      // difference between "assess every lot" and "assess zero", and a default
      // applied here would hide which was asked for.
      limit: numericFlag('limit'),
      concurrency: numericFlag('concurrency'),
      surface: 'fanout-cli',
      // Progress printed per lot, because 23 serial-ish model calls with no
      // output for two minutes is indistinguishable from a hang.
      onProgress: (done, total, lotId, ok) =>
        console.log(`  ${ok ? 'ok  ' : `${RED}FAIL${OFF}`}  ${String(done).padStart(2)}/${total}  ${lotId}`),
    });

    const a = r.answer;
    if (a) {
      console.log(`\n${BOLD}── SUMMARY ─────────────────────────────────────────────${OFF}\n`);
      console.log(wrap(a.summary ?? '(no summary)'));

      console.log(`\n${BOLD}── WORK LIST (${a.rows.length}) ──────────────────────────────${OFF}`);
      for (const row of a.rows) {
        console.log(
          `\n  ${BOLD}${row.lot_id}${OFF}  ${DIM}[${row.exposure}] ${row.quantity_units} units${OFF}`,
        );
        // NULLABLE in the schema: a clean row legitimately has nothing to say.
        // Printing 'null' would read as a defect in the row rather than an
        // absence of one.
        if (row.in_short) console.log(wrap(row.in_short, 6));
        if (row.next_action) {
          console.log(`${DIM}      next:${OFF}`);
          console.log(wrap(row.next_action, 6));
        }
        if (row.escalate) console.log(`${DIM}      escalate → ${row.escalate.suggested_owner}${OFF}`);
      }

      if (a.preventable.length) {
        console.log(`\n${BOLD}── STILL PREVENTABLE ───────────────────────────────────${OFF}\n`);
        for (const p of a.preventable) console.log(wrap(`- ${p}`));
      }
      if (a.missing.length) {
        console.log(`\n${BOLD}── NOT CHECKED ─────────────────────────────────────────${OFF}\n`);
        for (const m of a.missing) console.log(wrap(`- ${m}`));
      }
      if (a.escalate) {
        console.log(`\n${BOLD}── ESCALATE ────────────────────────────────────────────${OFF}\n`);
        console.log(wrap(a.escalate.reason));
        console.log(`${DIM}    owner: ${a.escalate.suggested_owner}${OFF}`);
      }
    }

    // PROBLEMS ARE PRINTED LOUDLY AND LAST, so a partial answer cannot be read
    // as a whole one just because the top of the page looked complete.
    if (r.problems.length) {
      console.log(`\n${RED}${BOLD}── PROBLEMS (${r.problems.length}) ──────────────────────────────${OFF}\n`);
      for (const p of r.problems) console.log(wrap(`- ${p}`));
      console.log(
        `\n${DIM}  A work list short of the lots it should contain is not a shorter\n` +
          `  answer, it is an incomplete one.${OFF}`,
      );
    }

    const ok = r.ok ? '' : `  ${RED}INCOMPLETE${OFF}`;
    console.log(
      `\n${DIM}  ${r.calls} model calls  ${r.inputTokens}in/${r.outputTokens}out  ` +
        `${(r.ms / 1000).toFixed(0)}s  $${(r.costUsd ?? 0).toFixed(4)}${OFF}${ok}`,
    );
    console.log(`${DIM}  ${r.costBasis}${OFF}`);
    console.log(
      `${DIM}  single agent, same question, all 23 rows: 3 calls, 21073in/10354out, 82s, ~$0.008${OFF}\n`,
    );

    process.exit(r.ok ? 0 : 1);
  } finally {
    // Teardown must never fail the command — the same defect `lot-debate.ts`
    // shipped with, where an unclosed pool turned a successful run into exit 1.
    await Promise.allSettled([handle.close?.()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
