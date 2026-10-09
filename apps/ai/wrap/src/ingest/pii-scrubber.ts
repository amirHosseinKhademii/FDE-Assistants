/**
 * PII scrubbing for ingested text: emails, phones, and person names.
 *
 * Three regex passes run in order (emails, phones, names). Each pass sees the
 * text already rewritten by the previous passes, so a token such as EMAIL_0001
 * is never re-matched as a name or phone.
 *
 * The token map is an explicit object (createPiiMap) passed in by the caller,
 * not a module-level global. Same (type, value) pair -> same token, so one
 * email gets one token across every file scrubbed with the same map.
 *
 * Redaction.start / end are offsets into the ORIGINAL input text, even though
 * later passes operate on rewritten text. restorePII() reverses redact-mode
 * tokens; remove mode keeps no map entries, so it is not reversible.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export type PiiType = "EMAIL" | "PHONE" | "PERSON";
export type ScrubMode = "redact" | "remove";

export type Redaction = {
  type: PiiType;
  /** Token that replaced the value (empty string in remove mode). */
  token: string;
  /** The exact original text that was matched. */
  original: string;
  /** Offsets into the original input text. */
  start: number;
  end: number;
};

export type PiiMap = {
  /** Returns the existing token for (type, value), or allocates the next one. */
  tokenFor(type: PiiType, value: string): string;
  /** Reverse lookup: token -> original value. */
  valueFor(token: string): string | undefined;
  /** All allocated tokens, in allocation order. */
  entries(): Array<{ token: string; type: PiiType; original: string }>;
};

export type PiiAllowlist = {
  /** Exact, case-sensitive multi-word phrases that are never redacted. */
  phrases: string[];
  /** Single words; a name candidate containing any of these is never redacted. */
  words: string[];
};

export function createPiiMap(): PiiMap {
  const tokenByKey = new Map<string, string>();
  const valueByToken = new Map<string, { type: PiiType; original: string }>();
  const counters: Record<PiiType, number> = { EMAIL: 0, PHONE: 0, PERSON: 0 };

  return {
    tokenFor(type, value) {
      const key = `${type}\u0000${value}`;
      const existing = tokenByKey.get(key);
      if (existing !== undefined) return existing;
      counters[type]++;
      const token = `${type}_${String(counters[type]).padStart(4, "0")}`;
      tokenByKey.set(key, token);
      valueByToken.set(token, { type, original: value });
      return token;
    },
    valueFor(token) {
      return valueByToken.get(token)?.original;
    },
    entries() {
      return [...valueByToken].map(([token, v]) => ({ token, type: v.type, original: v.original }));
    },
  };
}

export const DEFAULT_ALLOWLIST_PATH = path.resolve(__dirname, "../../config/pii-allowlist.json");

export function loadPiiAllowlist(file: string = DEFAULT_ALLOWLIST_PATH): PiiAllowlist {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<PiiAllowlist>;
  const strings = (v: unknown): string[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      throw new Error(`pii allowlist: expected an array of strings in ${file}`);
    }
    return v;
  };
  return { phrases: strings(raw.phrases), words: strings(raw.words) };
}

// Email: standard local@domain.tld shape.
export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone shapes (each must stand alone, not sit inside a longer
// number/ID/version/date token):
//   (555) 0147 | (555) 123-4567          parenthesised US area code
//   555-123-4567 | 555.123.4567           US 3-3-4
//   555-0147 | 555.0147                   US 3-4 local
//   +1-555-123-4567 | +44-1234-567890     international, +CC then 1-4 digit group
//                                         then 2-6 digit groups
export const PHONE_RE =
  /(?<![\w.+\/-])(?:\(\d{3}\) ?(?:\d{3}[-. ]\d{4}|\d{4})|\d{3}[-.]\d{3}[-.]\d{4}|\d{3}[-.]\d{4}|\+\d{1,3}[-. ]\d{1,4}(?:[-. ]\d{2,6}){1,3})(?![\w-])/g;

// A run of Capitalized words separated by single spaces. Candidates are taken
// from inside each run (2 or 3 consecutive words); no run crosses a newline.
const NAME_RUN_RE = /(?<![A-Za-z])[A-Z][a-z]+(?: [A-Z][a-z]+)*(?![A-Za-z])/g;

type Span = { s: number; e: number; type: PiiType; value: string };

function regexSpans(text: string, re: RegExp, type: PiiType): Span[] {
  return [...text.matchAll(re)].map((m) => ({
    s: m.index as number,
    e: (m.index as number) + m[0].length,
    type,
    value: m[0],
  }));
}

function nameSpans(text: string, allow: PiiAllowlist): Span[] {
  const words = new Set(allow.words);
  const phrases = new Set(allow.phrases);
  const out: Span[] = [];

  for (const run of text.matchAll(NAME_RUN_RE)) {
    const base = run.index as number;
    const parts = run[0].split(" ");
    const starts: number[] = [];
    let pos = base;
    for (const w of parts) {
      starts.push(pos);
      pos += w.length + 1;
    }

    // Greedy left-to-right: try a 3-word window, then 2, skipping any window
    // with an allowlisted word or an allowlisted phrase.
    let i = 0;
    while (i < parts.length) {
      let took = 0;
      for (const len of [3, 2]) {
        if (i + len > parts.length) continue;
        const window = parts.slice(i, i + len);
        if (window.some((w) => words.has(w))) continue;
        const phrase = window.join(" ");
        if (phrases.has(phrase)) continue;
        out.push({
          s: starts[i],
          e: starts[i + len - 1] + parts[i + len - 1].length,
          type: "PERSON",
          value: phrase,
        });
        took = len;
        break;
      }
      i += took > 0 ? took : 1;
    }
  }
  return out;
}

/**
 * Working text plus, for every character, the original-input range it came
 * from. Tokens inherit the range of the span they replaced, so offsets stay
 * accurate across passes.
 */
type Working = { text: string; os: number[]; oe: number[] };

function applySpans(
  state: Working,
  spans: Span[],
  mode: ScrubMode,
  map: PiiMap,
  out: Redaction[],
): Working {
  if (spans.length === 0) return state;
  let text = "";
  const os: number[] = [];
  const oe: number[] = [];

  const copy = (from: number, to: number) => {
    text += state.text.slice(from, to);
    for (let k = from; k < to; k++) {
      os.push(state.os[k]);
      oe.push(state.oe[k]);
    }
  };

  let cursor = 0;
  for (const sp of spans) {
    copy(cursor, sp.s);
    const origStart = state.os[sp.s];
    const origEnd = state.oe[sp.e - 1];
    const token = mode === "redact" ? map.tokenFor(sp.type, sp.value) : "";
    text += token;
    for (let k = 0; k < token.length; k++) {
      os.push(origStart);
      oe.push(origEnd);
    }
    out.push({ type: sp.type, token, original: sp.value, start: origStart, end: origEnd });
    cursor = sp.e;
  }
  copy(cursor, state.text.length);
  return { text, os, oe };
}

export function scrubPII(
  text: string,
  mode: ScrubMode,
  map: PiiMap,
  allowlist: PiiAllowlist,
): { text: string; redactions: Redaction[] } {
  let state: Working = {
    text,
    os: Array.from({ length: text.length }, (_, i) => i),
    oe: Array.from({ length: text.length }, (_, i) => i + 1),
  };
  const redactions: Redaction[] = [];

  state = applySpans(state, regexSpans(state.text, EMAIL_RE, "EMAIL"), mode, map, redactions);
  state = applySpans(state, regexSpans(state.text, PHONE_RE, "PHONE"), mode, map, redactions);
  state = applySpans(state, nameSpans(state.text, allowlist), mode, map, redactions);

  return { text: state.text, redactions };
}

const TOKEN_RE = /\b(?:EMAIL|PHONE|PERSON)_\d{4}\b/g;

/** Replaces every known token in `text` with its original value. Unknown tokens are left alone. */
export function restorePII(text: string, map: PiiMap): string {
  return text.replace(TOKEN_RE, (tok) => map.valueFor(tok) ?? tok);
}
