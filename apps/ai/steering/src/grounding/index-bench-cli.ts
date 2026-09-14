/**
 * `pnpm steering:index-bench` — should the dense arm have an index?
 *
 * Appendix A.4 of `docs/RETRIEVAL.md` says this repo builds no approximate
 * vector index, that the choice is right at this size, and then ends: *"nobody
 * here has measured where it starts to hurt."* That sentence is the reason this
 * file exists. An unmeasured "it's fine at our scale" is a belief, and it stops
 * being true silently — the corpus grows, nothing errors, and the first symptom
 * is a search everyone says feels slow.
 *
 * ── WHY STEERING AND NOT INSURANCE ───────────────────────────────────────
 *
 * Because steering is the big one. 3,854 passages against insurance's 555 and
 * pharma's 75, so it hits any threshold first. If an index is not worth building
 * here it is not worth building there, and the argument only has to be made once.
 *
 * ── WHAT IT COSTS TO RUN ─────────────────────────────────────────────────
 *
 * One embedding call for the probe questions below — pennies — plus a copy of
 * the chunk table that is created and dropped inside the run. It reads the live
 * table and never writes it; all the DDL lands on the copy. See
 * `benchmarkVectorIndex` for why the copy is not optional.
 */
import { benchmarkVectorIndex, redactedConnectionString } from '@fde/grounding';
import { derivedUrl } from '../config/connections';
import { CHUNK_TABLE } from './chunks';
import { openEmbeddings } from './embeddings.factory';

/**
 * REAL QUESTIONS, because recall against a probe taken from the table itself is
 * a measurement of nothing — the row matches itself at distance zero and every
 * index finds it. These are the shapes the assessment loop actually sends:
 * a safety-integrity lookup, two customer-requirement phrasings, a code
 * question, an effort-history question, and one deliberately vague.
 */
const PROBES = [
  'what ASIL do the steering feel components ship at',
  'assist latency and NVH limits for Calder',
  'what does it cost to take the damping software to ASIL D',
  'MISRA deviations in the damping controller',
  'closure report effort for the bulk steering programme',
  'end of line calibration procedure',
];

/**
 * ROWS THE DENSE ARM ACTUALLY FETCHES, which is not the k anybody types.
 * `searchDocuments` defaults to k=8 and `hybridSearch` over-fetches ×4 so that
 * RRF has two deep lists to fuse rather than two copies of the same eight.
 */
const DENSE_DEPTH = 8 * 4;

const ms = (n: number): string => `${n.toFixed(1)} ms`;

async function main(): Promise<void> {
  const connectionString = derivedUrl();
  console.log(`\nIndex benchmark — ${redactedConnectionString(connectionString)} → ${CHUNK_TABLE}\n`);

  const r = await benchmarkVectorIndex({
    connectionString,
    tableName: CHUNK_TABLE,
    embeddings: openEmbeddings(),
    questions: PROBES,
    k: DENSE_DEPTH,
    onProgress: (m) => console.log(`  ${m}`),
  });

  console.log(`\n  ${r.rows.toLocaleString()} rows × ${r.dimensions} dimensions, top-${DENSE_DEPTH} per probe\n`);

  if (r.refusedOnUnpinned) {
    console.log('  CAN AN INDEX BE BUILT ON THE SCHEMA AS IT SHIPS?');
    console.log(`    no — ${r.refusedOnUnpinned}`);
    console.log(`    the vector column is declared bare \`vector\`, which is what lets a 384-`);
    console.log(`    and a 1536-dimension corpus share one schema. Pinning it took ${r.pinMs} ms`);
    console.log('    here and is a full table rewrite.\n');
  } else if (r.dimensionPinned) {
    console.log('  The vector column is already pinned; no migration needed.\n');
  }

  console.log(`  SERVER-SIDE TIME, wire excluded — recall over ${r.builds} independent builds`);
  console.log(`    exact scan (today)        ${ms(r.exactServerMs).padStart(9)}    recall 100.0%  (it is the ground truth)`);
  for (const a of r.approximate) {
    console.log(
      `    hnsw ef_search=${String(a.efSearch).padEnd(4)}      ${ms(a.serverMs).padStart(9)}` +
        `    recall ${(100 * a.recall).toFixed(1)}%` +
        `  (${(100 * a.recallMin).toFixed(1)}–${(100 * a.recallMax).toFixed(1)})` +
        `  ${a.returned}/${a.expected} rows`,
    );
  }

  // THE WORST BUILD, NOT THE MEAN. A rebuild is what happens after every
  // re-ingest, so the number that matters operationally is what one can hand
  // you, not what three average to.
  const best = r.approximate.reduce((a, b) => (a.serverMs <= b.serverMs ? a : b));
  const floor = Math.min(...r.approximate.map((a) => a.recallMin));
  const saved = r.exactServerMs - best.serverMs;

  console.log(`\n  index build ${r.buildMs} ms, ${(r.indexBytes / 1e6).toFixed(0)} MB on disk`);
  console.log(`  planner chooses it unaided: ${r.plannerPicksIndex ? 'YES' : 'NO — it prefers a sequential scan'}`);
  console.log(`  network floor (select 1):   ${ms(r.networkFloorMs)}\n`);

  // ── THE VERDICT IS COMPUTED, NOT WRITTEN DOWN ──────────────────────────
  //
  // A benchmark whose conclusion is a hard-coded sentence stops being a
  // benchmark the first time the corpus grows. The thresholds are the two
  // things that actually decide it: does the planner want the index, and is
  // what it saves visible next to the round trip that carries it.
  const visible = saved > r.networkFloorMs * 0.5;
  if (r.plannerPicksIndex && visible) {
    console.log(`  VERDICT: build it. Saves ${ms(saved)} the planner will actually take, against`);
    console.log(`  a ${ms(r.networkFloorMs)} round trip, for a worst-build recall of ${(100 * floor).toFixed(1)}%.\n`);
  } else {
    console.log('  VERDICT: do not build it yet.');
    if (!r.plannerPicksIndex) {
      console.log(`    Postgres declines the index at ${r.rows.toLocaleString()} rows — the ${ms(best.serverMs)} above`);
      console.log('    required enable_seqscan=off to reach, so it is a ceiling, not a saving.');
    }
    console.log(`    It saves ${ms(saved)} of a ${ms(r.networkFloorMs)} round trip, inside a request that`);
    console.log('    also spends an embedding call and a model turn — and the worst of the');
    console.log(`    ${r.builds} builds above dropped ${(100 * (1 - floor)).toFixed(1)}% of the exact top-${DENSE_DEPTH} to get there.`);
    console.log('    Re-run when the corpus is 10× this, or when the database stops being');
    console.log('    a round trip away.\n');
  }

  if (r.approximate.some((a) => a.returned < a.expected)) {
    console.log('  WARNING: an ef_search below the dense depth truncated the arm. See A.4.\n');
  }
  for (const n of r.notices) console.log(`  postgres said: ${n}`);
}

// Guarded, like every CLI here — `chunks.ts` records what happened the one time
// a module in this directory ran on import.
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
