/**
 * CSV chunker: one chunk per data row. Each row is rendered as "column: value"
 * lines so it stands alone without the header. Leading '#' comment lines
 * (e.g. "# exported from Jira ...") are skipped. Quoted fields may contain
 * commas, doubled quotes ("") and newlines.
 */
import { CHUNK_SIZES, Chunk, makeChunk } from "./types";

interface CsvRecord {
  fields: string[];
  /** 1-based physical lines the record spans. */
  startLine: number;
  endLine: number;
}

function parseCsv(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  const n = text.length;
  let i = 0;
  let line = 1;
  while (i < n) {
    const c0 = text[i];
    if (c0 === "#") {
      // Comment line: skipped entirely.
      while (i < n && text[i] !== "\n") i++;
      if (i < n) {
        i++;
        line++;
      }
      continue;
    }
    if (c0 === "\n") {
      // Blank line.
      i++;
      line++;
      continue;
    }
    const startLine = line;
    const fields: string[] = [];
    let field = "";
    let inQuotes = false;
    let endedByNewline = false;
    while (i < n) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        if (c === "\n") line++;
        field += c;
        i++;
        continue;
      }
      if (c === '"' && field === "") {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        fields.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\n") {
        i++;
        endedByNewline = true;
        break;
      }
      field += c;
      i++;
    }
    fields.push(field);
    if (endedByNewline) line++;
    records.push({ fields, startLine, endLine: endedByNewline ? line - 1 : line });
  }
  return records.filter((r) => r.fields.some((f) => f.trim() !== ""));
}

export function chunkCsv(content: string, sourceFile: string): Chunk[] {
  const text = content.replace(/\r\n?/g, "\n");
  const records = parseCsv(text);
  if (records.length === 0) return [];

  const header = records[0].fields.map((h, j) => h.trim() || `col${j + 1}`);
  const maxChars = CHUNK_SIZES.maxTokens * 4;
  const out: Chunk[] = [];

  records.slice(1).forEach((rec, r) => {
    const pairs: string[] = [];
    rec.fields.forEach((raw, j) => {
      const value = raw.trim();
      if (value === "") return;
      pairs.push(`${header[j] ?? `col${j + 1}`}: ${value}`);
    });
    if (pairs.length === 0) return;

    let body = pairs.join("\n");
    const metadata: Record<string, unknown> = { columns: header, row_number: r + 1 };
    if (body.length > maxChars) {
      // Very wide row: cut at the last line or space that fits.
      const originalTokens = Math.ceil(body.length / 4);
      let cut = Math.max(body.lastIndexOf("\n", maxChars), body.lastIndexOf(" ", maxChars));
      if (cut < maxChars / 2) cut = maxChars;
      body = body.slice(0, cut).trimEnd();
      metadata.truncated = true;
      metadata.original_tokens = originalTokens;
    }
    out.push(
      makeChunk({
        sourceFile,
        index: out.length,
        type: "csv_row",
        content: body,
        startLine: rec.startLine,
        endLine: rec.endLine,
        metadata,
      }),
    );
  });
  return out;
}
