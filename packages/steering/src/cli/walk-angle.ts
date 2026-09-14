/**
 * `pnpm steering:walk-angle` — Phase A, step 1. One easy question, by hand.
 *
 *     "The K2 request asks for ±50° of road wheel angle.
 *      Do we already have something that does that?"
 *
 * THIS FILE IS A PRINTER. The reasoning is in `answer/derive.ts`, so that
 * `walk-check` can assert the same values this prints without there being two
 * implementations to drift apart.
 *
 * ── WHY IT EXISTS BEFORE ANY ASSISTANT DOES ───────────────────────────────
 *
 * This is the answer key. Once something starts generating answers they will be
 * fluent and confident whether or not they are correct, and there will be
 * nothing to check them against.
 *
 * NO MODEL IS CALLED. Every line below is a row that came out of Postgres.
 */
import { Walk, deriveCapability, CONDITIONS, day, num } from '../answer/derive';
import { ANCHORS } from '../db/seed/anchors';

const line = (s = ''): void => console.log(s);
const rule = (): void => line('─'.repeat(78));

async function main(): Promise<void> {
  line();
  line('  PHASE A · STEP 1 — one easy question, answered by hand');
  line();
  line('  QUESTION: the K2 request asks for ±50° of road wheel angle.');
  line('            Do we already have something that does that?');
  line();
  line('  No model is called. Every number below is a row from Postgres.');

  const w = new Walk();
  const a = await deriveCapability(w, {
    specId: ANCHORS.spec, crId: ANCHORS.crAngleRange, programId: ANCHORS.program,
  });

  // Render the trace the derivation recorded of itself.
  w.steps.forEach((s, i) => {
    line();
    rule();
    line(`STEP ${i + 1}  ${s.what}`);
    line(`        ${s.where}`);
    rule();
    for (const l of s.sql.trim().split('\n')) line(`  ${l.trim()}`);
    line();
  });

  rule();
  line('WHAT CAME BACK');
  rule();
  line();
  line(`  in force            ${a.inForceRevision}`);
  line(`  superseded          ${a.supersededRevisions.join(', ') || 'none'}`);
  line(`  requirement         ${a.requirement.cr_id} §${a.requirement.section} — ${a.requirement.title}`);
  line(`                      ${a.requirement.attribute} ${a.requirement.operator} ${a.requirement.value} ${a.requirement.unit}`);
  line(`                      ${a.requirement.condition}`);
  line(`  moved between revs  ${a.changedBetweenRevisions ? 'YES — the superseded value must not be used' : 'no'}`);
  line(`  parts CLAIMING it   ${a.claims.length}`);
  line(`  with TEST evidence  ${a.proven.length}   ← a claim is not evidence`);
  line();
  line('  SHORTLIST — keep a candidate only if ALL of these hold:');
  CONDITIONS.forEach((c, i) => line(`      ${i + 1}. ${c}`));
  line();
  for (const c of a.candidates) {
    line(`    ${c.reject ? 'out' : 'IN '}  ${c.part_no.padEnd(20)} ${String(c.demonstrated).padStart(6)}°  ` +
      (c.reject ?? `production, ships on ${c.comparablePrograms.length} ${a.architecture} programme(s)`));
  }
  line();
  line(`  → ${a.kept.length} of ${a.candidates.length} survive all four conditions.`);

  line();
  rule();
  line('THE ANSWER');
  rule();
  line();

  if (!a.best) {
    line(`  ${a.requirement.cr_id} — nothing satisfies all four conditions.`);
    line('  This is a CHANGE, not a carryover, and the shortlist says which');
    line('  condition each candidate failed.');
    line();
    return;
  }

  line(`  ${a.requirement.cr_id} — ${a.requirement.title} ±${a.requirement.value}${a.requirement.unit}:  WE ALREADY HAVE THIS.`);
  line();
  line(`  ${a.best.part_no} demonstrated ${a.best.demonstrated}° on a rig`);
  line(`  (${a.best.test.report_ref}, ${day(a.best.test.tested_on)}, ${a.best.test.standard}), is in production,`);
  line(`  and ships on ${a.best.comparablePrograms.length} ${a.architecture} programme(s):`);
  for (const p of a.best.comparablePrograms) {
    line(`      ${p.program_id}  ${p.model}  ${p.force_class_n} N  ${p.status}`);
  }
  line('  No change required.');
  line();
  line('  EVIDENCE, one line per claim:');
  line(`    requirement    vst_alm  ${a.requirement.cr_id} as of ${a.inForceRevision}`);
  line(`    claim          vst_plm  part_capabilities ${a.best.part_no} / ${a.requirement.attribute}`);
  line(`    proof          vst_plm  qualification_tests ${a.best.test.test_id} → ${a.best.test.report_ref}`);
  line(`    ships          vst_plm  part_program_usage × ${a.best.ships.length} for this part`);
  line(`    comparable     vst_crm  programs × ${a.best.comparablePrograms.length} at ${a.architecture}`);
  line();
  line('  WHAT A PERSON STILL HAS TO DECIDE:');
  line(`    · ${a.best.demonstrated}° against a ${a.requirement.value}° requirement is ${a.margin}° of margin.`);
  line('      Whether that is enough for a new vehicle with different geometry is an');
  line('      engineering judgement. The data cannot settle it and should not pretend to.');
  if (a.betterButUnbuyable.length) {
    line(`    · ${a.betterButUnbuyable.map((c) => `${c.part_no} (${c.demonstrated}°)`).join(', ')} demonstrated MORE`);
    line('      and cannot be ordered. If the margin above is judged too thin, reviving one');
    line('      is a commercial question, not a technical one, and belongs in the meeting.');
  }
  line();
  rule();
  line('WHAT THIS STEP PROVED');
  rule();
  line();
  line(`  ${w.steps.length} lookups across three databases, zero joins — every crossing stitched`);
  line('  in code, because Postgres cannot join them. That is the work the tool has to');
  line('  do, and the reason it is worth building.');
  line();
  line('  AND IT CAUGHT ITS OWN AUTHOR. The first version took the best number and');
  line('  stopped — answering with a part that is obsolete and cannot be ordered. The');
  line('  four conditions exist because of that, not in anticipation of it.');
  line();
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
