/**
 * Does dedup catch copies and near-copies, and nothing else? Offline, instant.
 *
 *   pnpm dedup:check
 */
import assert from "node:assert/strict";
import {
  computeMinHash,
  computeSHA256,
  computeShingles,
  exactJaccard,
  jaccardSimilarity,
} from "./dedup";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${(err as Error).message.split("\n").join("\n      ")}`);
  }
}

// Deterministic ~200-word text: a small linear congruential generator picks
// words from a fixed vocabulary. No Math.random, so the test is reproducible.
const VOCAB = [
  "steering", "module", "requirement", "torque", "sensor", "signal", "vehicle", "tolerance",
  "calibration", "actuator", "policy", "section", "interface", "latency", "bus", "frame",
  "checksum", "baseline", "override", "fallback", "diagnostic", "threshold", "voltage", "current",
  "controller", "gateway", "message", "timeout", "buffer", "register", "firmware", "release",
  "review", "approval", "design", "test", "limit", "range", "margin", "monitor", "software",
  "hardware", "system", "function", "output", "input", "mode", "state", "event", "log",
];

function pseudoText(seed: number, words: number): string {
  let s = seed >>> 0;
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push(VOCAB[s % VOCAB.length]);
  }
  return out.join(" ");
}

const PARA_A =
  "The steering controller reads the torque sensor at a fixed rate and compares each sample " +
  "against the calibrated baseline. When the reading leaves the permitted range for more than " +
  "three consecutive frames, the controller switches to the fallback mode and logs a diagnostic " +
  "event with the current firmware release.";

const PARA_B =
  "Our quarterly orchard harvest report covers apple yields across the northern blocks, the " +
  "rainfall totals recorded at each weather station, and the cost of seasonal labour. Growers " +
  "should compare these figures with the regional averages before planning next year's planting.";

const BASE = pseudoText(7, 200);
// Change exactly two words, well inside the text so every shingle around them is touched.
const baseWords = BASE.split(" ");
baseWords[60] = "xylophone";
baseWords[140] = "quasar";
const EDITED = baseWords.join(" ");

check("SHA-256 of 'abc' matches the standard test vector", () => {
  assert.equal(
    computeSHA256(Buffer.from("abc", "utf8")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

check("identical texts give MinHash Jaccard exactly 1.0", () => {
  const a = computeMinHash(computeShingles(PARA_A, 5));
  const b = computeMinHash(computeShingles(PARA_A, 5));
  assert.equal(jaccardSimilarity(a, b), 1.0);
});

check("two unrelated paragraphs give MinHash Jaccard < 0.2", () => {
  const sim = jaccardSimilarity(
    computeMinHash(computeShingles(PARA_A, 5)),
    computeMinHash(computeShingles(PARA_B, 5)),
  );
  assert.ok(sim < 0.2, `similarity ${sim}`);
});

check("~200-word text vs same with 2 words changed: estimate >= 0.8 and within 0.1 of exact", () => {
  const sa = computeShingles(BASE, 5);
  const sb = computeShingles(EDITED, 5);
  const estimate = jaccardSimilarity(computeMinHash(sa), computeMinHash(sb));
  const exact = exactJaccard(sa, sb);
  assert.ok(estimate >= 0.8, `estimate ${estimate} (exact ${exact})`);
  assert.ok(Math.abs(estimate - exact) <= 0.1, `estimate ${estimate} vs exact ${exact}`);
});

check("computeMinHash run twice gives identical arrays", () => {
  const sh = computeShingles(BASE, 5);
  assert.deepEqual(computeMinHash(sh), computeMinHash(sh));
  assert.deepEqual(computeMinHash(sh), computeMinHash(computeShingles(BASE, 5)));
});

check("whitespace and case differences give Jaccard 1.0", () => {
  const messy = "THE   steering\ncontroller\treads the TORQUE sensor at a fixed rate and compares each sample "
    + "against the calibrated   baseline. When the reading leaves the permitted range for more than "
    + "three consecutive frames, the controller switches to the fallback mode and logs a diagnostic "
    + "event with the current firmware release.";
  const sim = jaccardSimilarity(
    computeMinHash(computeShingles(PARA_A, 5)),
    computeMinHash(computeShingles(messy, 5)),
  );
  assert.equal(sim, 1.0);
});

check("mismatched MinHash lengths throw", () => {
  assert.throws(() => jaccardSimilarity([1, 2, 3], [1, 2]), /length mismatch/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  process.exitCode = 1;
}
