/**
 * A finished dossier becomes one line. This is `compress` from
 * [`CONCEPTS.md`](../../../../../docs/steering/CONCEPTS.md), and it is the
 * cheapest of the four verbs to demonstrate.
 *
 * ── WHAT IS DROPPED, AND WHY EACH ONE ────────────────────────────────────
 *
 * citations   the quotes are the evidence for a FINDING, and the summary is
 *             forbidden from re-deriving findings. A summariser holding the
 *             evidence is a summariser that can be tempted to re-judge with
 *             four passages where the assessment had twenty
 * the euro    the money is added up in code. A model shown per-item figures
 *             will add them, and one of them may be a refusal
 * unverified  it belongs to the dossier it was written in
 *
 * ── WHAT IS KEPT, AND WHY EACH ONE ───────────────────────────────────────
 *
 * finding     stated, never re-decided
 * refusal     `cost.refused_because` verbatim, because clustering refusals is
 *             one of the two jobs the model is actually for, and it cannot
 *             cluster reasons it was not shown
 * questions   the other job: the same question asked across five requirements
 *             is a meeting, not five tickets
 * reasoning   trimmed to its first sentence. A refusal's THEME often lives
 *             here rather than in `refused_because` — "no test report exists"
 *             is a sentence about the requirement, not about the cost query
 *
 * ── THE MEASUREMENT THIS MAKES POSSIBLE ──────────────────────────────────
 *
 * A dossier is roughly 2–4k characters; a line is a few hundred. `lineCost()`
 * reports both so the CLI can print tokens per summarised requirement against
 * tokens per full one, which is the number that justifies the verb.
 */
import type { FiledAssessment } from '../../answer/filed-assessments';

/** The first sentence, or the first 180 characters if it is one long sentence. */
function firstSentence(s: string): string {
  const m = s.match(/^.*?[.!?](?=\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > 180 ? `${out.slice(0, 177)}…` : out;
}

/**
 * One assessment, one block of plain text.
 *
 * Not JSON. The model's job here is reading, and a line a person can read is a
 * line a model reads with less ceremony — the same argument the passage format
 * in the assessment prompt makes.
 */
export function toLine(f: FiledAssessment): string {
  const a = f.assessment;
  const parts = [`${f.ref}  ${a.finding}`, `  why: ${firstSentence(a.reasoning)}`];

  parts.push(
    a.cost.median_hours === null
      ? `  unpriced: ${a.cost.refused_because ?? 'no reason recorded'}` +
        ` (${a.cost.comparable_jobs === null ? 'never queried' : `${a.cost.comparable_jobs} comparable job(s)`})`
      : `  priced from ${a.cost.comparable_jobs} comparable job(s)`,
  );

  for (const c of a.conflicts) parts.push(`  documents disagree about: ${c.about}`);
  for (const d of a.decisions_for_human) parts.push(`  asks ${d.suggested_owner}: ${d.question}`);

  return parts.join('\n');
}

export function toLines(filed: FiledAssessment[]): string {
  return filed.map(toLine).join('\n\n');
}

/**
 * Characters before and after compression. Characters rather than tokens on
 * purpose: a token count here would need the tokeniser and would be an estimate
 * anyway, and the ratio is what the claim rests on. The CLI prints both.
 */
export function lineCost(filed: FiledAssessment[]): { dossiers: number; lines: number } {
  return {
    dossiers: filed.reduce((a, f) => a + JSON.stringify(f.assessment).length, 0),
    lines: toLines(filed).length,
  };
}
