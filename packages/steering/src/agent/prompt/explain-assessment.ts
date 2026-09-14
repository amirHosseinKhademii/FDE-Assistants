/**
 * What we ask for a plain-language brief on ONE finished assessment.
 *
 * IT IS GIVEN THE ANSWER, NOT THE DOCUMENTS. No tools, no retrieval, no estate.
 * Everything it may say something about is already in the prompt, which is what
 * makes "do not add a fact" an instruction it can actually follow.
 */
import type { RequirementAssessment } from '../../schema/assessment-schema';

export const SYSTEM_PROMPT = `You rewrite one finished engineering assessment as a short brief for a
bid engineer who has thirty seconds and did not read the dossier.

THE RULE THAT OVERRIDES EVERYTHING ELSE: add nothing. Every fact you state must
already be in the assessment you are given. You have no documents, no history and
no way to check anything — so a detail you cannot point at in the input is one you
invented, and it will be read as measured.

You may not:
- state or restate a price, an hour count or a euro figure. Those are printed
  beside your brief, measured, and two versions of one number is worse than one.
- promise, quote, commit, or say anything "carries over at no cost". A quotation
  is a contract and a named person signs it. You are not that person.
- decide anything the dossier put to a human. Shorten the question; keep it a
  question, keep the role it was addressed to, and do not answer it.

You should:
- open with one sentence somebody could read aloud in a meeting.
- carry over EVERY question the assessment put to a person, one line each, with the
  role it named. Shorten them; do not drop them and do not answer them. Those
  questions are the point of the exercise, not a leftover.
- say where the documents disagree, if they do: what is disputed and what changes
  depending on which is right. Do NOT re-quote the sentences — they are printed
  verbatim with their file and line below your brief, and a paraphrase beside the
  original reads as the system contradicting itself. Never pick a side.
- say plainly what exists, what is missing, and why the evidence does or does not
  settle it. Short sentences. No term of art unless you explain it in the same
  breath.
- end with what somebody actually does next, as short imperative lines. If the
  dossier already puts everything to a named person, return none.

A brief that is shorter and duller than the dossier is the correct output. You are
not selling the answer, you are making it readable.`;

export function userPrompt(a: RequirementAssessment): string {
  const decisions = a.decisions_for_human
    .map((d) => `- ${d.question} (for: ${d.suggested_owner}) — matters because ${d.why_it_matters}`)
    .join('\n');

  const conflicts = a.conflicts
    .map((c) => `- ${c.about}: ${c.positions.map((p) => p.says).join(' / ')}`)
    .join('\n');

  /**
   * THE CITATIONS ARE SENT AS COUNTS AND FILES, NOT AS QUOTES. The brief must
   * not re-quote a sentence — the dossier shows every quote with its file and
   * line, and a paraphrase sitting next to the verbatim original is the one
   * place a reader would reasonably think the system disagreed with itself.
   */
  return [
    `REQUIREMENT ${a.requirement_ref}`,
    ``,
    `FINDING: ${a.finding}`,
    ``,
    `REASONING AS WRITTEN:`,
    a.reasoning,
    ``,
    `EVIDENCE: ${a.citations.length} citation(s), from ${new Set(a.citations.map((c) => c.file)).size} file(s).`,
    a.cost.median_hours === null
      ? `PRICE: refused. Stated reason: ${a.cost.refused_because}`
      : `PRICE: produced, from ${a.cost.comparable_jobs} comparable job(s). Do not restate the figure.`,
    conflicts ? `\nDOCUMENTS DISAGREE:\n${conflicts}` : '',
    decisions ? `\nPUT TO A PERSON:\n${decisions}` : '',
    a.unverified_claims.length ? `\nSTATED WITHOUT A CITATION:\n${a.unverified_claims.map((u) => `- ${u}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
