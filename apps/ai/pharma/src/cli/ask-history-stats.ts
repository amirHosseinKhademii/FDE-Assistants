/**
 *   pnpm pharma:history-stats
 *
 * Do people ask the same question twice? Reads `ask_history`; costs nothing.
 *
 * WHY THIS EXISTS RATHER THAN A CACHE. "Add result caching" was on the
 * capability list as a thing to build. A cache that never hits teaches you its
 * mechanics and nothing else, and this repo's own rule is that practice should
 * produce a real artefact for a real bottleneck rather than a demo that gets
 * deleted. So the question "is there anything to cache" gets an answer from the
 * data before anybody writes a cache.
 *
 * READ-ONLY, and on `mrd_kb` — never the six systems of record. The connection
 * comes from `urlFor(KB_DB)`, the same helper the web surface's writer uses,
 * rather than being assembled here: a script that builds its own URL is a
 * script that can silently report on the wrong database.
 *
 * WHAT IT CANNOT TELL YOU, and the reason the number alone must not decide it:
 * whether a repeated question is SAFE to answer from a cache. The answers here
 * are derived from six live databases. "Can this lot ship?" asked twice with a
 * disposition changed in between has two different correct answers, and serving
 * the first one again is precisely the failure this whole estate exists to
 * prevent. A hit rate says whether caching would PAY. Only a staleness rule
 * says whether it is ALLOWED.
 */
import { Pool } from 'pg';
import { KB_DB, urlFor } from '../config/connections';

interface Row {
  q: string;
  n: number;
  surfaces: string;
  first: string;
  last: string;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: urlFor(KB_DB), max: 2 });

  try {
    const exists = await pool.query(
      `select to_regclass('public.ask_history') is not null as present`,
    );
    if (!exists.rows[0]?.present) {
      console.log(
        '\n  `ask_history` does not exist yet.\n\n' +
          '  It is created on the first question asked through the web surface\n' +
          '  (`pnpm veresk:dev`). Nothing has been asked there, so there is\n' +
          '  nothing to measure — which is itself the answer: no repetition,\n' +
          '  no case for a result cache yet.\n',
      );
      return;
    }

    // Normalised the way a cache key would have to be: a cache that treated
    // "Can LOT-X ship?" and "can lot-x ship? " as different questions would
    // miss every real repeat, so measuring them as different would understate
    // the hit rate this is trying to estimate.
    const NORM = `lower(btrim(regexp_replace(question, '\\s+', ' ', 'g')))`;

    const totals = await pool.query(
      `select count(*)::int as rows, count(distinct ${NORM})::int as distinct_q from ask_history`,
    );
    const { rows: total, distinct_q: distinct } = totals.rows[0];

    if (total === 0) {
      console.log('\n  `ask_history` is empty — nothing asked through the web page yet.\n');
      return;
    }

    const repeats = await pool.query<Row>(
      `select ${NORM} as q,
              count(*)::int as n,
              string_agg(distinct surface, ', ') as surfaces,
              min(ts)::text as first,
              max(ts)::text as last
         from ask_history
        group by 1
       having count(*) > 1
        order by n desc, q
        limit 15`,
    );

    // The share of requests a PERFECT cache would have served without a model
    // call: every row after the first of each distinct question.
    const avoidable = total - distinct;
    const pct = (100 * avoidable) / total;

    console.log('\nAsk history — is there anything to cache?\n');
    console.log(`  questions asked        ${total}`);
    console.log(`  distinct questions     ${distinct}`);
    console.log(`  repeat asks            ${avoidable}  (${pct.toFixed(1)}% of all asks)`);
    console.log(`  questions asked twice+ ${repeats.rowCount}`);

    if (repeats.rowCount) {
      console.log('\n  most repeated:');
      for (const r of repeats.rows) {
        const q = r.q.length > 66 ? `${r.q.slice(0, 63)}…` : r.q;
        console.log(`    ${String(r.n).padStart(3)}x  ${q}`);
        console.log(`          ${r.surfaces}   ${r.first.slice(0, 16)} → ${r.last.slice(0, 16)}`);
      }
    }

    // THE READING, stated rather than left to the eye. A percentage with no
    // interpretation is a number somebody quotes in whichever direction they
    // already preferred.
    console.log('\n  ─────────────────────────────────────────────────────────────');
    if (total < 20) {
      console.log(
        `  TOO LITTLE DATA TO DECIDE. ${total} asks is a demo's worth, not a\n` +
          '  usage pattern. Whatever this says, it says it weakly — re-run it\n' +
          '  once the page has real traffic.',
      );
    } else if (pct < 10) {
      console.log(
        `  NOT WORTH CACHING at this rate. ${pct.toFixed(1)}% of asks are repeats, so a\n` +
          '  perfect cache saves under a tenth of the spend and adds a staleness\n' +
          '  rule to every answer path. Say so and move on.',
      );
    } else {
      console.log(
        `  WORTH A LOOK. ${pct.toFixed(1)}% of asks are repeats — that is real money, and\n` +
          '  the case for a result cache is economic rather than hypothetical.',
      );
    }
    console.log(
      '\n  EITHER WAY, the economics are only half the decision. These answers\n' +
        '  are derived from six live databases: the same question asked after a\n' +
        '  disposition changes has a DIFFERENT correct answer, and serving the\n' +
        '  old one is the exact failure this estate exists to prevent. A hit\n' +
        '  rate says whether caching would PAY, never whether it is ALLOWED.\n',
    );
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
