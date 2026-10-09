/**
 * Does metadata extraction read paths, IDs, dates and keywords correctly? Offline, instant.
 *
 *   pnpm meta:check
 */
import assert from "node:assert/strict";
import { makeChunk } from "../chunking/types";
import { enrichChunk, extractMetadata } from "./metadata-extractor";

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

function chunkOf(sourceFile: string, content: string, metadata?: Record<string, unknown>) {
  return makeChunk({ sourceFile, index: 0, type: "text_paragraph", content, startLine: 1, endLine: 1, metadata });
}

check("subsystem is the first path segment", () => {
  assert.equal(extractMetadata(chunkOf("eps-core/docs/module-torque.md", "x")).subsystem, "eps-core");
  assert.equal(extractMetadata(chunkOf("pmo/quotes/QUO-0040.md", "x")).subsystem, "pmo");
  assert.equal(extractMetadata(chunkOf("requirements/PRG-TDR-32/CRS-TDR-32-001_RevC.md", "x")).subsystem, "requirements");
});

check("top-level file has no subsystem key", () => {
  const meta = extractMetadata(chunkOf("empty.txt", "x"));
  assert.equal("subsystem" in meta, false);
  assert.equal(meta.type_category, "other");
});

check("type_category from folder, file name and subsystem rules", () => {
  const cases: Array<[string, string]> = [
    ["eps-core/docs/a.md", "documentation"],
    ["eps-core/src/a.c", "code"],
    ["eps-steering-feel/src/legacy/a.c", "code"],
    ["eps-core/test/test_a.c", "test"],
    ["eps-core/cfg/a.yaml", "config"],
    ["eps-steering-feel/cal/a.csv", "config"],
    ["eps-core/reports/a.md", "report"],
    ["eps-core/git-log.txt", "history"],
    ["eps-core/README.md", "documentation"],
    ["eps-core/Makefile", "other"],
    ["releases/eps-core-3.14.6.md", "release_notes"],
    ["tickets/jira-export-2026-09.csv", "ticket_export"],
    ["pmo/closure-reports/EFF-BULK-0002.md", "closure_report"],
    ["requirements/PRG-TDR-32/CRS-TDR-32-001_RevC.md", "requirements"],
    ["requirements/PRG-TDR-32/trace-matrix-CRS-TDR-32-001.csv", "traceability"],
  ];
  for (const [file, expected] of cases) {
    assert.equal(extractMetadata(chunkOf(file, "x")).type_category, expected, file);
  }
});

check("requirement IDs found, deduplicated and sorted; PRG/CRS are not requirement IDs", () => {
  const text = [
    "CR-TDR-32-0537 covers latency; see CR-TDR-32-0537 again.",
    "SR-EPS-0407 and CR-HLX-H1-0001 are system and customer rows.",
    "Programme PRG-TDR-32 and document CRS-TDR-32-001 are not requirement rows.",
  ].join("\n");
  assert.deepEqual(extractMetadata(chunkOf("requirements/PRG-TDR-32/x.md", text)).requirement_ids, [
    "CR-HLX-H1-0001",
    "CR-TDR-32-0537",
    "SR-EPS-0407",
  ]);
});

check("ticket IDs are not matched inside longer IDs", () => {
  const text = "Raised as CHR-2021-0177, see TICKET VST-4471. EFF-BULK-0225 and XVST-1234 are not tickets.";
  assert.deepEqual(extractMetadata(chunkOf("pmo/closure-reports/x.md", text)).ticket_ids, [
    "CHR-2021-0177",
    "VST-4471",
  ]);
  assert.deepEqual(extractMetadata(chunkOf("pmo/closure-reports/y.md", "EFF-BULK-0225 CHR-2021-0177-X")).ticket_ids, []);
});

check("US and ISO dates normalise to YYYY-MM-DD; invalid dates dropped", () => {
  const text = "Released 2025-03-15, meeting 03/15/2025, signed March 15 2025, then 15 March 2025 and March 15, 2025. Bad: 2025-13-45.";
  assert.deepEqual(extractMetadata(chunkOf("releases/x.md", text)).dates, ["2025-03-15"]);
  assert.deepEqual(extractMetadata(chunkOf("releases/x.md", "on 04/02/2024 and 2024-04-02")).dates, ["2024-04-02"]);
});

check("keywords exclude stopwords, short words and placeholder tokens", () => {
  const text = [
    "The steering module should check the torque sensor.",
    "Steering torque sensor reports torque; should should.",
    "Contact EMAIL_0001, HANDLE_0001, HANDLE_0001 and PERSON_0001 about handle.",
  ].join(" ");
  assert.deepEqual(extractMetadata(chunkOf("eps-core/docs/x.md", text)).keywords, ["torque", "sensor", "steering"]);
});

check("keywords are capped at 10 and need at least two occurrences", () => {
  const words = ["charlie", "echoes", "foxtrot", "golfer", "hotels", "indigo", "juliet", "kittens", "lantern", "mariner", "nickels", "oyster"];
  const text = [...words, ...words, "onceonly"].join(" ");
  const keywords = extractMetadata(chunkOf("eps-core/docs/x.md", text)).keywords ?? [];
  assert.equal(keywords.length, 10);
  assert.equal(keywords.includes("onceonly"), false);
});

check("existing metadata keys are preserved when enriched", () => {
  const chunk = chunkOf("eps-core/src/a.c", "VST-4471 torque torque", { function: "torque_init", merged_sections: 2 });
  const enriched = enrichChunk(chunk);
  assert.equal(enriched.metadata.function, "torque_init");
  assert.equal(enriched.metadata.merged_sections, 2);
  assert.equal(enriched.metadata.subsystem, "eps-core");
  assert.equal(enriched.metadata.type_category, "code");
  assert.deepEqual(enriched.metadata.ticket_ids, ["VST-4471"]);
  assert.equal(chunk.metadata.subsystem, undefined, "input chunk is not mutated");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
