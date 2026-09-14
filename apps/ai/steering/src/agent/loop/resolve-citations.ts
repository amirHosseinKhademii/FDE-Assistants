/**
 * Correct every cited line by FINDING the quote in the file.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS NOT A PROMPT FIX ──────────────────────
 *
 * A retrieved passage knows the line it STARTS on. The sentence a model quotes
 * from it may be eleven lines further down, and on the first run with real line
 * numbers that is exactly what happened: cited 61, actual 72. The citations
 * pointed at the right file and the right passage and asked the reader to scan.
 *
 * Before that, with no line available at all, the model simply wrote `1`.
 *
 * Both are the same lesson arriving twice: **a value the model cannot know is a
 * value it will approximate or invent.** Neither is fixed by asking it to try
 * harder — the information is not in front of it.
 *
 * So it is computed here, deterministically, from the two things we do have:
 * the quote it returned and the file it named. This is precisely what the
 * extraction pipeline already does — `findEvidence` was written for that, is
 * tested in both directions, and handles the wrapping and the mangled
 * punctuation this corpus produces. Reusing it means one implementation of
 * "where is this sentence", not two that drift.
 *
 * ── A QUOTE THAT CANNOT BE FOUND IS REPORTED, NOT DROPPED ────────────────
 *
 * The citation keeps the model's line and is counted as unresolved. Silently
 * discarding it would hide a paraphrase — the one failure this whole mechanism
 * exists to catch — and silently keeping it would claim a precision nobody
 * verified.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { findEvidence } from '../../derived/extract/classification';
import { CORPUS_DIR } from '../../derived/ingest/corpus';
import type { RequirementAssessment } from '../../schema/assessment-schema';

export interface Resolution {
  /** How many citations had their line corrected to the sentence's own. */
  corrected: number;
  /** Cited lines that were already right. */
  exact: number;
  /** Quotes not found in the file they name — a paraphrase, or the wrong file. */
  unresolved: { file: string; quote: string }[];
}

const read = (file: string): string | undefined => {
  const path = resolve(CORPUS_DIR, file);
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
};

/** One citation, corrected in place. Returns what happened to it. */
function resolveOne(
  cite: { file: string; line: number; quote: string },
): 'exact' | 'corrected' | 'unresolved' {
  const text = read(cite.file);
  if (!text) return 'unresolved';

  const hit = findEvidence(text, cite.quote);
  if (!hit) return 'unresolved';

  if (hit.line === cite.line) return 'exact';
  cite.line = hit.line;
  return 'corrected';
}

/**
 * Mutates the assessment's citations, including those inside conflicts.
 *
 * CONFLICT CITATIONS COUNT TOO, and forgetting them would be the natural
 * mistake: they are the ones a reader is most likely to open, because a
 * disagreement is the thing somebody argues with.
 */
export function resolveCitations(a: RequirementAssessment): Resolution {
  const all = [...a.citations, ...a.conflicts.flatMap((c) => c.positions.map((p) => p.citation))];

  const out: Resolution = { corrected: 0, exact: 0, unresolved: [] };
  for (const cite of all) {
    const what = resolveOne(cite);
    if (what === 'exact') out.exact++;
    else if (what === 'corrected') out.corrected++;
    else out.unresolved.push({ file: cite.file, quote: cite.quote.slice(0, 60) });
  }
  return out;
}
