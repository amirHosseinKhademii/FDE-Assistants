/**
 * Do the Markdown, CSV and plain-text chunkers split where they should? Offline, instant.
 *
 *   pnpm chunk:check
 */
import assert from "node:assert/strict";
import { chunkC } from "./c-code";
import { chunkFile } from "./index";
import { Format } from "../ingest/format-detector";
import { chunkCsv } from "./csv";
import { chunkMarkdown } from "./markdown";
import { chunkText } from "./text";
import { CHUNK_SIZES, Chunk, chunkId, estimateTokens } from "./types";

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

const WORDS = [
  "steering", "torque", "sensor", "signal", "vehicle", "tolerance", "calibration", "actuator",
  "latency", "frame", "checksum", "baseline", "override", "fallback", "diagnostic", "threshold",
];

/** Deterministic run of `n` words, about 5 characters each. */
function bodyOf(n: number): string {
  return Array.from({ length: n }, (_, i) => WORDS[(i * 7) % WORDS.length]).join(" ");
}

const SRC = "docs/test.md";

check("markdown: three headings give three chunks with the right heading trails", () => {
  const doc = [
    "# 2 Design",
    bodyOf(60),
    "",
    "## 2.3 Torque limits",
    bodyOf(60),
    "",
    "## 2.4 Sensor",
    bodyOf(60),
  ].join("\n");
  const chunks = chunkMarkdown(doc, SRC);
  assert.equal(chunks.length, 3, `got ${chunks.length}`);
  assert.deepEqual(
    chunks.map((c) => c.heading_path),
    ["2 Design", "2 Design > 2.3 Torque limits", "2 Design > 2.4 Sensor"],
  );
  assert.ok(
    chunks[1].content.startsWith("# 2 Design\n## 2.3 Torque limits"),
    "ancestor heading lines should lead the chunk",
  );
  assert.equal(chunks[1].start_line, 4);
  assert.equal(chunks[2].end_line, 8);
});

check("markdown: '# not a heading' inside a code fence stays in its chunk", () => {
  const doc = [
    "# Setup",
    bodyOf(60),
    "```bash",
    "# not a heading",
    "make all",
    "```",
    bodyOf(20),
  ].join("\n");
  const chunks = chunkMarkdown(doc, SRC);
  assert.equal(chunks.length, 1, `got ${chunks.length}`);
  assert.ok(chunks[0].content.includes("# not a heading"));
  assert.equal(chunks[0].heading_path, "Setup");
});

check("markdown: a tilde fence also hides headings", () => {
  const doc = ["# Top", bodyOf(60), "~~~", "## hidden", "~~~", bodyOf(10)].join("\n");
  const chunks = chunkMarkdown(doc, SRC);
  assert.equal(chunks.length, 1, `got ${chunks.length}`);
  assert.ok(chunks[0].content.includes("## hidden"));
});

check("markdown: oversize section is sub-split, each part under max and repeating its heading", () => {
  const body = bodyOf(1500);
  const chunks = chunkMarkdown(`# Big\n${body}`, SRC);
  assert.ok(chunks.length >= 2, `got ${chunks.length}`);
  for (const c of chunks) {
    assert.ok(c.tokens <= CHUNK_SIZES.maxTokens, `tokens ${c.tokens} over max`);
    assert.ok(c.content.startsWith("# Big\n"), "each part should lead with the heading");
    assert.equal(c.heading_path, "Big");
  }
  const seen = new Set(chunks.flatMap((c) => c.content.split(/\s+/)));
  for (const w of WORDS) assert.ok(seen.has(w), `word "${w}" lost in sub-split`);
});

check("markdown: text before the first heading is its own chunk; tiny sections merge", () => {
  const preamble = `Preamble text. ${bodyOf(60)}`;
  const doc = [preamble, "# A", bodyOf(60), "## B", "short.", "# C", bodyOf(60)].join("\n");
  const chunks = chunkMarkdown(doc, SRC);
  assert.equal(chunks.length, 3, `got ${chunks.length}`);
  assert.equal(chunks[0].heading_path, undefined);
  assert.ok(chunks[0].content.startsWith("Preamble text."));

  const small = chunkMarkdown(`Tiny intro.\n# A\n${bodyOf(60)}\n## B\nshort.\n# C\n${bodyOf(60)}`, SRC);
  assert.equal(small.length, 2, `got ${small.length}`);
  assert.ok(small[0].content.includes("Tiny intro."), "tiny preamble merged into the next section");
  assert.equal(small[1].heading_path, "A > B", "merged chunk keeps the first section's trail");
  assert.deepEqual(small[1].metadata.merged_sections, ["A > B", "C"]);
  assert.ok(small[1].content.includes("# C"));
});

check("csv: '# exported' line skipped, header + 3 rows give 3 'col: value' chunks", () => {
  const csv = [
    "# exported from Jira 2026-09-07 by HANDLE_0012",
    "# encoding: utf-8",
    "key,type,summary",
    "VST-1,Bug,Motor ripple",
    "VST-2,Task,Update doc",
    "VST-3,Bug,Brake check",
    "",
  ].join("\n");
  const chunks = chunkCsv(csv, "tickets/x.csv");
  assert.equal(chunks.length, 3, `got ${chunks.length}`);
  assert.ok(chunks[0].content.includes("key: VST-1"));
  assert.ok(chunks[0].content.includes("summary: Motor ripple"));
  assert.equal(chunks[2].start_line, 6);
  assert.ok(chunks.every((c) => !c.content.includes("exported")), "comment leaked into a row");
  assert.ok(chunks.every((c) => c.type === "csv_row"));
});

check("csv: quoted fields keep commas, doubled quotes and embedded newlines", () => {
  const csv = 'key,summary,owner\nA-1,"Smith, Jr. review, round 2",Ann\nA-2,"He said ""no""",Bo\nB-1,"line one\nline two",Cy\n';
  const chunks = chunkCsv(csv, SRC);
  assert.equal(chunks.length, 3, `got ${chunks.length}`);
  assert.ok(chunks[0].content.includes("summary: Smith, Jr. review, round 2"), chunks[0].content);
  assert.ok(chunks[0].content.includes("owner: Ann"));
  assert.ok(chunks[1].content.includes('summary: He said "no"'), chunks[1].content);
  assert.ok(chunks[2].content.includes("summary: line one\nline two"), chunks[2].content);
  assert.equal(chunks[2].end_line, 5);
});

check("csv: very wide row is truncated to the max size", () => {
  const wide = `x,${Array.from({ length: CHUNK_SIZES.maxTokens * 2 }, () => "wide").join(" ")}`;
  const chunks = chunkCsv(`a,b\n${wide}\n`, SRC);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0].tokens <= CHUNK_SIZES.maxTokens, `tokens ${chunks[0].tokens}`);
  assert.equal(chunks[0].metadata.truncated, true);
});

check("text: consecutive windows overlap, no word is lost, and no word is cut", () => {
  // Every word is "[n]", so a cut mid-word would leave a fragment that fails the pattern.
  const words = Array.from({ length: 3000 }, (_, i) => `[${i}]`);
  const text = words.join(" ");
  const chunks = chunkText(text, "notes/long.txt");
  assert.ok(chunks.length >= 5, `got ${chunks.length}`);
  for (const c of chunks) {
    assert.ok(c.tokens <= CHUNK_SIZES.textWindowTokens + 2, `tokens ${c.tokens}`);
    for (const w of c.content.split(/\s+/)) assert.ok(/^\[\d+\]$/.test(w), `cut word "${w}"`);
  }
  for (let i = 0; i + 1 < chunks.length; i++) {
    const a = new Set(chunks[i].content.split(/\s+/));
    const shared = chunks[i + 1].content.split(/\s+/).filter((w) => a.has(w));
    assert.ok(shared.length > 0, `no overlap between chunk ${i} and ${i + 1}`);
  }
  const seen = new Set(chunks.flatMap((c) => c.content.split(/\s+/)));
  assert.equal(seen.size, words.length, `covered ${seen.size} of ${words.length} words`);
});

check("ids are deterministic across runs, match chunkId(path, index), and depend on the path", () => {
  const md = `# A\n${bodyOf(60)}\n# B\n${bodyOf(60)}`;
  const first = chunkMarkdown(md, SRC).map((c) => c.id);
  const second = chunkMarkdown(md, SRC).map((c) => c.id);
  assert.deepEqual(first, second);
  assert.equal(first[1], chunkId(SRC, 1));
  assert.equal(first[0].length, 16);
  assert.notEqual(chunkMarkdown(md, "other.md")[0].id, first[0]);

  const txt = bodyOf(800);
  assert.deepEqual(
    chunkText(txt, SRC).map((c: Chunk) => c.id),
    chunkText(txt, SRC).map((c: Chunk) => c.id),
  );
});

check("empty input gives no chunks, and token estimate is ceil(chars / 4)", () => {
  assert.deepEqual(chunkMarkdown("", SRC), []);
  assert.deepEqual(chunkCsv("# only a comment\n", SRC), []);
  assert.deepEqual(chunkText("", SRC), []);
  assert.equal(estimateTokens("abcde"), 2);
});

const C_SRC = [
  "#include <stdio.h>",
  "#define LIMIT 10",
  "",
  "/* A comment with a closing brace } inside. */",
  "static int add(int a, int b)",
  "{",
  '    const char *s = "open { brace in a string";',
  "    // trailing comment with { brace",
  "    return a + b; /* } */",
  "}",
  "",
  "int twice(int x) {",
  "    char c = '{';",
  "    return add(x, x);",
  "}",
  "",
].join("\n");

check("c: two functions and a preamble; a '}' in a comment and '{' in a string do not confuse the scan", () => {
  const chunks = chunkC(C_SRC, "src/math.c");
  assert.equal(chunks.length, 3, `got ${chunks.length}`);
  assert.equal(chunks[0].type, "code_struct");
  assert.equal(chunks[0].metadata.kind, "preamble");
  assert.ok(chunks[0].content.includes("#define LIMIT 10"));
  assert.deepEqual(
    chunks.slice(1).map((c) => c.metadata.function),
    ["add", "twice"],
  );
  assert.deepEqual(
    chunks.slice(1).map((c) => c.heading_path),
    ["add", "twice"],
  );
  assert.equal(chunks[1].type, "code_function");
  assert.equal(chunks[2].end_line, 15);
  assert.equal(chunks[2].start_line, 12);
  assert.ok(chunks[2].content.endsWith("}"));
  assert.deepEqual(chunks.map((c) => c.chunk_index), [0, 1, 2]);
});

check("c: doc comments (block and // lines) attach to the function below; a blank line detaches them", () => {
  const src = [
    "/* file header, not for any function */",
    "",
    "/** Adds two numbers. */",
    "int sum(int a, int b) { return a + b; }",
    "",
    "// Line doc,",
    "// two lines.",
    "int diff(int a, int b) { return a - b; }",
    "",
    "/* detached: blank line below */",
    "",
    "int last(void) { return 0; }",
    "",
  ].join("\n");
  const chunks = chunkC(src, "src/doc.c");
  const fns = chunks.filter((c) => c.type === "code_function");
  assert.deepEqual(fns.map((c) => c.metadata.function), ["sum", "diff", "last"]);
  assert.ok(fns[0].content.startsWith("/** Adds two numbers. */\nint sum"), fns[0].content);
  assert.ok(fns[1].content.startsWith("// Line doc,\n// two lines.\nint diff"), fns[1].content);
  assert.ok(fns[2].content.startsWith("int last"), fns[2].content);
  const pre = chunks.filter((c) => c.type === "code_struct");
  assert.equal(pre.length, 2, `got ${pre.length}`);
  assert.ok(pre[0].content.includes("file header"), "file header comment is kept, not dropped");
  assert.ok(pre[1].content.includes("detached: blank line below"), "detached comment is kept, not dropped");
  assert.ok(!fns[2].content.includes("detached"), "detached comment must not attach to the function");
});

check("c: oversize function is sub-split, every part repeats the signature line, no statement lost", () => {
  const stmts = Array.from({ length: 300 }, (_, i) => `    total += step_${i}(a, b) * ${i};`);
  const sig = "int big_worker(int a, int b) {";
  const src = [sig, "    int total = 0;", ...stmts, "    return total;", "}", ""].join("\n");
  const chunks = chunkC(src, "src/big.c");
  assert.ok(chunks.length >= 3, `got ${chunks.length}`);
  for (const c of chunks) {
    assert.equal(c.type, "code_function");
    assert.equal(c.metadata.function, "big_worker");
    assert.ok(c.tokens <= CHUNK_SIZES.maxTokens, `tokens ${c.tokens}`);
    assert.equal(c.content.split("\n")[0], sig, "signature must lead every part");
  }
  const joined = chunks.map((c) => c.content).join("\n");
  for (let i = 0; i < 300; i++) assert.ok(joined.includes(`step_${i}(a, b)`), `lost step_${i}`);
});

check("c: header prototypes and macros pack into chunks at or under the max size", () => {
  const small = chunkC("#ifndef X_H\n#define X_H\nint f(void);\nint g(int a);\n#endif\n", "inc/x.h");
  assert.equal(small.length, 1, `got ${small.length}`);
  assert.equal(small[0].type, "code_struct");

  const protos = Array.from({ length: 200 }, (_, i) => `int proto_${i}(int a, int b, int c);`);
  const big = chunkC(protos.join("\n") + "\n", "inc/big.h");
  assert.ok(big.length >= 3, `got ${big.length}`);
  for (const c of big) assert.ok(c.tokens <= CHUNK_SIZES.maxTokens, `tokens ${c.tokens}`);
  const joined = big.map((c) => c.content).join("\n");
  for (let i = 0; i < 200; i++) assert.ok(joined.includes(`proto_${i}(`), `lost proto_${i}`);
});

check("c: escaped quotes and char literals do not end a string early", () => {
  const src = [
    'static const char *m = "a \\"{\\" b";',
    "static const char q = '\\'';",
    "int after(void) { return '}' + 1; }",
    "",
  ].join("\n");
  const chunks = chunkC(src, "src/esc.c");
  const fns = chunks.filter((c) => c.type === "code_function");
  assert.deepEqual(fns.map((c) => c.metadata.function), ["after"]);
  assert.equal(chunks[0].type, "code_struct");
  assert.ok(chunks[0].content.includes("static const char q"));
});

check("router: BINARY and UNKNOWN give no chunks; C_HEADER and CSV route to their chunkers", () => {
  assert.deepEqual(chunkFile("a.bin", "\u0000\u0001\u0002", Format.BINARY), []);
  assert.deepEqual(chunkFile("a.dat", "", Format.UNKNOWN), []);
  const h = chunkFile("inc/a.h", "int f(void);\n", Format.C_HEADER);
  assert.equal(h.length, 1);
  assert.equal(h[0].type, "code_struct");
  const csv = chunkFile("t/a.csv", "k,v\n1,2\n", Format.CSV);
  assert.equal(csv[0].type, "csv_row");
  assert.equal(chunkFile("n/a.json", "word ".repeat(5), Format.JSON)[0].type, "text_paragraph");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  process.exitCode = 1;
}
