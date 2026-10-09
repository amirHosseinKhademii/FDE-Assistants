/**
 * Metadata extraction (plan Step 2.5): path-based and content-based facts about a chunk.
 *
 * Path-based: subsystem = first path segment of source_file (relative to data/scrubbed);
 * type_category = the first recognised folder / file-name rule (see typeCategory).
 *
 * Content-based, with regexes chosen from the measured ID shapes in data/scrubbed
 * (see docs/wrap/PROGRESS.md, Step 2.5):
 *   requirement_ids  CR-/SR- rows: CR-TDR-32-0537, SR-EPS-0407, CR-HLX-H1-0001
 *   ticket_ids       VST-4471 (Jira export), CHR-2021-0177 (change requests)
 *   dates            ISO, US M/D/YYYY, "March 15 2025", "15 March 2025" -> YYYY-MM-DD
 *   keywords         top 10 words (>5 letters, >=2 occurrences), stoplist + placeholders removed
 *
 * Output is deterministic: arrays are deduplicated and sorted, keywords ranked by count then word.
 */
import type { Chunk } from "../chunking/types";

export interface ChunkMetadata {
  subsystem?: string;
  type_category?: string;
  ticket_ids?: string[];
  requirement_ids?: string[];
  dates?: string[];
  keywords?: string[];
}

/** CR-TDR-32-0537, SR-EPS-0407, CR-HLX-H1-0001. Not PRG-/CRS-/EL-/SWC- (those are other IDs). */
const REQUIREMENT_ID = /(?<![-A-Za-z0-9])(?:CR|SR)-(?:[A-Z][A-Z0-9]{1,3}-)?(?:H\d-|\d{2}-)?\d{4}(?![-A-Za-z0-9])/g;

/** VST-4471 (Jira), CHR-2021-0177 (change request). Lookarounds stop matches inside EFF-BULK-0225 etc. */
const TICKET_ID = /(?<![-A-Za-z0-9])(?:VST-\d{4,6}|CHR-\d{4}-\d{4})(?![-A-Za-z0-9])/g;

/** Placeholder tokens left by the PII scrubber; never keywords. */
const PLACEHOLDER = /\b(?:EMAIL|HANDLE|PHONE|PERSON)_\d{3,5}\b/g;

const WORD = /[A-Za-z]+(?:-[A-Za-z]+)*/g;
const KEYWORD_MIN_LENGTH = 6; // "words > 5 characters"
const KEYWORD_MIN_COUNT = 2;
const KEYWORD_TOP_N = 10;

const STOPWORDS = new Set(
  `about above across after again against all almost also although always among an and another any are
  around as at be because been before being below between both but by can could did do does doing done
  down during each either else even ever every few for from further had has have having here hers him his
  how however if in into is it its itself just less like made make many may might more most much must
  near neither never next no nor not now of off on once one only onto or other others our out over own
  per please same shall she should since so some still such than that the their them then there these they
  this those though through thus to too under until up upon us use used using very via was we well were
  what when where whether which while who whom whose why will with within without would yet you your
  also get gets got need needs must within`.split(/\s+/),
);

const MONTHS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8,
  September: 9, October: 10, November: 11, December: 12,
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12,
};
const MONTH_NAME = Object.keys(MONTHS).join("|");

/** Folder names (anywhere under the subsystem) that decide type_category, checked in path order. */
const FOLDER_TYPE: Record<string, string> = {
  docs: "documentation",
  src: "code",
  test: "test",
  tests: "test",
  spec: "test",
  cal: "config",
  cfg: "config",
  config: "config",
  reports: "report",
  "closure-reports": "closure_report",
  estimates: "estimate",
  quotes: "quote",
  "rate-cards": "rate_card",
  timesheets: "timesheet",
};

/** Top-level files: checked by file name when no folder rule matched. */
function fileNameType(name: string): string | undefined {
  if (name === "git-log.txt") return "history";
  if (/^(README|CHANGELOG)(\.[A-Za-z]+)?$/.test(name)) return "documentation";
  return undefined;
}

/** Subsystem-specific file rules (releases/, tickets/ and requirements/PRG-<code>/ have no type folder). */
function subsystemType(subsystem: string, name: string): string | undefined {
  if (subsystem === "releases") return "release_notes";
  if (subsystem === "tickets") return "ticket_export";
  if (subsystem === "requirements") {
    if (name.includes("trace-matrix")) return "traceability";
    if (name.includes("system-requirements") || /^CRS-/.test(name)) return "requirements";
    if (name.includes("architecture")) return "architecture";
    if (name.includes("review-notes")) return "review_notes";
  }
  return undefined;
}

/** subsystem = first path segment; undefined for top-level files (e.g. empty.txt). */
export function subsystemOf(sourceFile: string): string | undefined {
  const parts = sourceFile.split("/");
  return parts.length > 1 ? parts[0] : undefined;
}

/** type_category from folders (first match wins), then file name, then subsystem rules, else "other". */
export function typeCategory(sourceFile: string): string {
  const parts = sourceFile.split("/");
  const name = parts[parts.length - 1];
  const subsystem = parts.length > 1 ? parts[0] : undefined;
  for (const dir of parts.slice(1, -1)) {
    const hit = FOLDER_TYPE[dir];
    if (hit) return hit;
  }
  const byName = fileNameType(name);
  if (byName) return byName;
  if (subsystem) {
    const bySubsystem = subsystemType(subsystem, name);
    if (bySubsystem) return bySubsystem;
  }
  return "other";
}

function matches(re: RegExp, text: string): string[] {
  return [...text.matchAll(re)].map((m) => m[0]);
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/** Normalise a calendar date to YYYY-MM-DD, or undefined if it is not a real date. */
function isoDate(year: number, month: number, day: number): string | undefined {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return undefined;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractDates(text: string): string[] {
  const found: string[] = [];
  const push = (value: string | undefined) => {
    if (value) found.push(value);
  };
  for (const m of text.matchAll(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g)) {
    push(isoDate(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  for (const m of text.matchAll(/(?<![\d/])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/g)) {
    // US order: month/day/year.
    push(isoDate(Number(m[3]), Number(m[1]), Number(m[2])));
  }
  for (const m of text.matchAll(new RegExp(`(?<![A-Za-z])(${MONTH_NAME})\\.? (\\d{1,2})(?:st|nd|rd|th)?,? (\\d{4})(?!\\d)`, "g"))) {
    push(isoDate(Number(m[3]), MONTHS[m[1]], Number(m[2])));
  }
  for (const m of text.matchAll(new RegExp(`(?<!\\d)(\\d{1,2}) (${MONTH_NAME})\\.?,? (\\d{4})(?!\\d)`, "g"))) {
    push(isoDate(Number(m[3]), MONTHS[m[2]], Number(m[1])));
  }
  return sortedUnique(found);
}

export function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  const cleaned = text.replace(PLACEHOLDER, " ");
  for (const raw of cleaned.match(WORD) ?? []) {
    const word = raw.toLowerCase();
    if (word.length < KEYWORD_MIN_LENGTH || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= KEYWORD_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, KEYWORD_TOP_N)
    .map(([word]) => word);
}

/** Path-based and content-based metadata for one chunk. Empty arrays are returned, not omitted. */
export function extractMetadata(chunk: Chunk): ChunkMetadata {
  const meta: ChunkMetadata = {};
  const subsystem = subsystemOf(chunk.source_file);
  if (subsystem !== undefined) meta.subsystem = subsystem;
  meta.type_category = typeCategory(chunk.source_file);
  meta.requirement_ids = sortedUnique(matches(REQUIREMENT_ID, chunk.content));
  meta.ticket_ids = sortedUnique(matches(TICKET_ID, chunk.content));
  meta.dates = extractDates(chunk.content);
  meta.keywords = extractKeywords(chunk.content);
  return meta;
}

/** Returns a copy of the chunk with extracted metadata merged into metadata (existing keys kept). */
export function enrichChunk(chunk: Chunk): Chunk {
  return { ...chunk, metadata: { ...chunk.metadata, ...extractMetadata(chunk) } };
}
