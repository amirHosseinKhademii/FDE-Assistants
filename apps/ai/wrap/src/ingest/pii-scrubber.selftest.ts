/**
 * Does PII scrubbing catch the planted contact details and leave technical
 * text alone? Offline, instant.
 *
 *   pnpm pii:check
 */
import assert from "node:assert/strict";
import {
  createPiiMap,
  loadPiiAllowlist,
  restorePII,
  scrubPII,
  type PiiType,
  type Redaction,
} from "./pii-scrubber";

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

const allow = loadPiiAllowlist();

function scrub(text: string, mode: "redact" | "remove" = "redact") {
  return scrubPII(text, mode, createPiiMap(), allow);
}

function typesOf(redactions: Redaction[]): PiiType[] {
  return redactions.map((r) => r.type);
}

// The planted contact lines from make-mess.ts.
const PLANTED_A =
  "Revised the torque limits after the bench run. [Contact: John Harvey, jharvey@company.local, 555-0147]";
const PLANTED_B =
  "Calibration sign-off pending. [Contact: Alice Smith, asmith.contractor@external-firm.io, +44-1234-567890]";

check("planted contact line: all three types redacted", () => {
  const r = scrub(PLANTED_A);
  assert.deepEqual(typesOf(r.redactions).sort(), ["EMAIL", "PERSON", "PHONE"]);
  assert.equal(
    r.text,
    "Revised the torque limits after the bench run. [Contact: PERSON_0001, EMAIL_0001, PHONE_0001]",
  );
  for (const original of ["John Harvey", "jharvey@company.local", "555-0147"]) {
    assert.ok(!r.text.includes(original), `output still contains ${original}`);
  }
});

check("planted contact line with international phone and external email", () => {
  const r = scrub(PLANTED_B);
  assert.deepEqual(typesOf(r.redactions).sort(), ["EMAIL", "PERSON", "PHONE"]);
  assert.equal(
    r.text,
    "Calibration sign-off pending. [Contact: PERSON_0001, EMAIL_0001, PHONE_0001]",
  );
});

check("same email twice -> same token", () => {
  const r = scrub("a jharvey@company.local b jharvey@company.local c");
  assert.equal(r.text, "a EMAIL_0001 b EMAIL_0001 c");
});

check("same value across two scrub calls with a shared map -> same token", () => {
  const map = createPiiMap();
  const first = scrubPII("mail jharvey@company.local", "redact", map, allow);
  const second = scrubPII("other jharvey@company.local", "redact", map, allow);
  assert.equal(first.text, "mail EMAIL_0001");
  assert.equal(second.text, "other EMAIL_0001");
});

check("'Steering Column Module' and 'Motor Control Unit' are not redacted", () => {
  const r = scrub("The Steering Column Module handles input. Motor Control Unit reports status.");
  assert.equal(r.redactions.length, 0);
});

check("dates, version, requirement and ticket IDs are not matched as phones", () => {
  const text =
    "Released 2026-09-07 as v1.2.3 under PRG-TDR-31-06 and EFF-BULK-0225, hex 3fa-123-4567ab.";
  const r = scrub(text);
  assert.equal(r.redactions.filter((x) => x.type === "PHONE").length, 0);
  assert.equal(r.text, text);
});

check("phone shapes that must match", () => {
  const shapes = [
    "555-0147",
    "555.0147",
    "555-123-4567",
    "555.123.4567",
    "(555) 123-4567",
    "(555) 0147",
    "+1-555-123-4567",
    "+44-1234-567890",
  ];
  for (const s of shapes) {
    const r = scrub(`call ${s} today`);
    const phones = r.redactions.filter((x) => x.type === "PHONE");
    assert.equal(phones.length, 1, `expected one PHONE match for ${s}`);
    assert.equal(phones[0].original, s, `wrong span for ${s}`);
  }
});

check("email with a capitalized-name-like local part is redacted once, not as a name", () => {
  const r = scrub("Send it to John.Harvey@company.local today");
  assert.deepEqual(typesOf(r.redactions), ["EMAIL"]);
  assert.equal(r.text, "Send it to EMAIL_0001 today");
});

check("git-log author: email and its handle both tokenised, restore round-trips", () => {
  const text = "Author: t.sala <t.sala@vantis-steering.example>";
  const map = createPiiMap();
  const r = scrubPII(text, "redact", map, allow);
  assert.equal(r.text, "Author: HANDLE_0001 <EMAIL_0001>");
  assert.ok(!r.text.includes("t.sala"), "handle left in output");
  assert.equal(restorePII(r.text, map), text);
});

check("handle learned from an email in the shared map is scrubbed in later text", () => {
  const map = createPiiMap();
  scrubPII("mail t.sala@vantis-steering.example", "redact", map, allow);
  const r = scrubPII("Reviewed by t.sala yesterday", "redact", map, allow);
  assert.equal(r.text, "Reviewed by HANDLE_0001 yesterday");
});

check("generic mailbox 'info' is never a handle", () => {
  const r = scrub("Write to info@x.com, the info desk is open.");
  assert.equal(r.text, "Write to EMAIL_0001, the info desk is open.");
  assert.ok(!r.redactions.some((x) => x.type === "HANDLE"));
});

check("handle is not matched inside a longer word or a dotted name", () => {
  const r = scrub("mail jharvey@company.local; xjharvey and jharvey.v2 stay");
  assert.equal(r.text, "mail EMAIL_0001; xjharvey and jharvey.v2 stay");
});

check("redact mode: restorePII(scrub(x)) === x", () => {
  const map = createPiiMap();
  for (const x of [PLANTED_A, PLANTED_B, "a jharvey@company.local b jharvey@company.local"]) {
    const r = scrubPII(x, "redact", map, allow);
    assert.notEqual(r.text, x);
    assert.equal(restorePII(r.text, map), x);
  }
});

check("redact mode: start/end offsets point at the original text", () => {
  const r = scrub(PLANTED_A);
  for (const red of r.redactions) {
    assert.equal(PLANTED_A.slice(red.start, red.end), red.original);
  }
});

check("remove mode: no tokens and no PII left", () => {
  const r = scrub(PLANTED_A, "remove");
  assert.deepEqual(typesOf(r.redactions).sort(), ["EMAIL", "PERSON", "PHONE"]);
  assert.ok(!/\b(EMAIL|HANDLE|PHONE|PERSON)_\d{4}\b/.test(r.text), "token left in output");
  for (const original of ["John Harvey", "jharvey@company.local", "555-0147"]) {
    assert.ok(!r.text.includes(original), `output still contains ${original}`);
  }
  assert.ok(r.redactions.every((x) => x.token === ""), "remove mode should emit no tokens");
});

check("allowlist is case-sensitive and word-based", () => {
  // "Steering" is allowlisted, so the 3-word window "John Harvey Steering" is
  // rejected, but "John Harvey" on its own is still a name.
  const r = scrub("see John Harvey Steering now");
  assert.deepEqual(typesOf(r.redactions), ["PERSON"]);
  assert.equal(r.redactions[0].original, "John Harvey");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
