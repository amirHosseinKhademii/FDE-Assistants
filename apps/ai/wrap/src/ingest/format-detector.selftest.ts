/**
 * Does format detection catch the lies? Offline, instant, no network.
 *
 * Each case pairs a file the detector must get right with the mislabel it
 * guards against (a CSV that is only three lines, a JSON document named .csv,
 * a Latin1 byte that must not be read as UTF-8, and so on).
 *
 *   pnpm detect:check
 */
import assert from "node:assert/strict";
import { Encoding, Format, decodeToUtf8, detectEncoding, detectFormat } from "./format-detector";

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

const utf8 = (s: string) => Buffer.from(s, "utf8");

check("markdown with headings and list", () => {
  const r = detectFormat(utf8("# Title\n\nIntro text.\n\n## Setup\n\n- step one\n- step two\n"), "readme.md");
  assert.equal(r.format, Format.MARKDOWN);
  assert.equal(r.encoding, Encoding.UTF8);
  assert.ok(r.confidence >= 0.8, `confidence ${r.confidence}`);
});

check("C header (include guard, prototypes, no bodies)", () => {
  const src =
    "#ifndef FOO_H\n#define FOO_H\n\nint add(int a, int b);\nvoid reset(void);\n\n#endif\n";
  const r = detectFormat(utf8(src), "foo.h");
  assert.equal(r.format, Format.C_HEADER, r.reason);
});

check("C source (#include plus function bodies, main)", () => {
  const src =
    '#include <stdio.h>\n\nint add(int a, int b) {\n  return a + b;\n}\n\nint main(void) {\n  printf("%d", add(1, 2));\n  return 0;\n}\n';
  const r = detectFormat(utf8(src), "main.c");
  assert.equal(r.format, Format.C_SOURCE, r.reason);
  assert.ok(r.confidence >= 0.8);
});

check("real CSV (header plus 6 rows)", () => {
  const src = "id,name,value\n1,alpha,10\n2,beta,20\n3,gamma,30\n4,delta,40\n5,epsilon,50\n6,zeta,60\n";
  const r = detectFormat(utf8(src), "sensors.csv");
  assert.equal(r.format, Format.CSV, r.reason);
});

check("3-line CSV is not CSV (too few rows to trust)", () => {
  const r = detectFormat(utf8("a,b,c\n1,2,3\n4,5,6\n"), "small.csv");
  assert.notEqual(r.format, Format.CSV, r.reason);
  assert.equal(r.format, Format.TEXT, r.reason);
  assert.ok(r.reason.includes("extension .csv but content is TEXT"), r.reason);
});

check("JSON object", () => {
  const r = detectFormat(utf8('{"name":"x","items":[1,2,3]}\n'), "data.json");
  assert.equal(r.format, Format.JSON, r.reason);
  assert.ok(r.confidence >= 0.9);
});

check("JSON content inside a .csv file is reported as JSON", () => {
  const src = '[\n  {"key": "A-1", "type": "bug"},\n  {"key": "A-2", "type": "task"}\n]\n';
  const r = detectFormat(utf8(src), "export.csv");
  assert.equal(r.format, Format.JSON, r.reason);
  assert.ok(r.reason.includes("extension .csv but content is JSON"), r.reason);
});

check("markdown content named .csv is reported as Markdown", () => {
  const r = detectFormat(utf8("# Exported notes\n\n## Items\n\n- one\n- two\n"), "notes.csv");
  assert.equal(r.format, Format.MARKDOWN, r.reason);
  assert.ok(r.reason.includes("extension .csv but content is MARKDOWN"), r.reason);
});

check("UTF-8 BOM is detected and stripped from the decoded text", () => {
  const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8("# Notes\n\nBOM file.\n")]);
  assert.equal(detectEncoding(buf), Encoding.UTF8);
  const r = detectFormat(buf, "bom.md");
  assert.equal(r.encoding, Encoding.UTF8);
  assert.equal(r.format, Format.MARKDOWN, r.reason);
  const text = decodeToUtf8(buf, Encoding.UTF8);
  assert.ok(text.startsWith("# Notes"), JSON.stringify(text.slice(0, 10)));
});

check("Latin1 (0xE9) is not valid UTF-8, so it decodes as Latin1", () => {
  const buf = Buffer.from("Caf\xe9 na\xefve r\xe9sum\xe9\nSecond line.\n", "latin1");
  assert.equal(detectEncoding(buf), Encoding.LATIN1);
  const r = detectFormat(buf, "notes.txt");
  assert.equal(r.encoding, Encoding.LATIN1);
  assert.equal(r.format, Format.TEXT, r.reason);
  assert.ok(decodeToUtf8(buf, Encoding.LATIN1).startsWith("Café"));
});

check("UTF-16 LE with BOM is detected and decodes", () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("hello world\n", "utf16le")]);
  assert.equal(detectEncoding(buf), Encoding.UTF16);
  const r = detectFormat(buf, "utf16.txt");
  assert.equal(r.encoding, Encoding.UTF16);
  assert.notEqual(r.format, Format.BINARY, r.reason);
  assert.equal(decodeToUtf8(buf, Encoding.UTF16), "hello world\n");
});

check("PDF magic bytes are BINARY and the reason names PDF", () => {
  const buf = Buffer.concat([utf8("%PDF-1.4\n%"), Buffer.from([0xe2, 0xe3, 0xcf, 0xd3]), utf8("\n1 0 obj\n")]);
  const r = detectFormat(buf, "report.md");
  assert.equal(r.format, Format.BINARY);
  assert.equal(r.confidence, 1);
  assert.ok(r.reason.includes("PDF"), r.reason);
});

check("gzip magic bytes are BINARY", () => {
  const r = detectFormat(Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]), "dump.txt");
  assert.equal(r.format, Format.BINARY);
  assert.ok(r.reason.includes("gzip"), r.reason);
});

check("NUL-containing binary (no magic) is BINARY", () => {
  const buf = Buffer.from("looks like text at first\0\0\x01\x02\x03 more bytes\n", "latin1");
  const r = detectFormat(buf, "blob.txt");
  assert.equal(r.format, Format.BINARY, r.reason);
  assert.ok(r.reason.includes("NUL"), r.reason);
});

check("empty file is UNKNOWN", () => {
  const r = detectFormat(Buffer.alloc(0), "empty.txt");
  assert.equal(r.format, Format.UNKNOWN);
  assert.equal(r.confidence, 0);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  process.exitCode = 1;
}
