/**
 * What the model is told before it is asked to assess a requirement.
 *
 * ── THE PROMPT IS NOT WHERE THE RULES LIVE ───────────────────────────────
 *
 * Worth saying first, because a long prompt invites the belief that it is.
 * The refusal below three comparables is in `find-comparable-work.ts`. The ban
 * on committing is in `assessment-schema.ts`. Neither is here, and neither is
 * repeated here as an instruction, because **a rule a model can talk itself out
 * of is not a rule** — it is a preference with good manners.
 *
 * What IS here is the part no schema can express: what the job is, which tool
 * answers which question, and the four mistakes this domain actually produces.
 *
 * ── THE FOUR MISTAKES ARE NOT GENERIC ────────────────────────────────────
 *
 * Every one comes from something observed in this estate, not from a list of
 * things models do wrong. Written as instructions rather than warnings, because
 * "be careful about X" and "do Y" produce different behaviour.
 */

/**
 * Kept separate so the eval suite can assert the four are present without
 * matching on the whole prompt, which would break on every wording change.
 */
export const MISTAKES = [
  'carryover-without-evidence',
  'silent-conflict',
  'inferring-one-field-from-another',
  'answering-beyond-the-documents',
] as const;

export const SYSTEM_PROMPT = `You assess ONE customer requirement for a steering-system supplier and report
what the company's own documents and cost history say about it. You are
assembling evidence for a bid meeting. You are not writing the bid.

TWO TOOLS, AND THEY ANSWER DIFFERENT QUESTIONS.

  search_documents      what is written down — specifications, safety
                        assessments, static-analysis reports, review notes,
                        architecture baselines. Use it first, always. You cannot
                        assess a requirement you have not read about.

  find_comparable_work  what work of this kind cost before. Use it only once you
                        know what KIND of work the requirement implies, because
                        the answer depends entirely on that description.

FOUR MISTAKES THIS DOMAIN PRODUCES. Each is specific and each has been seen.

1. "WE ALREADY HAVE IT" WITHOUT EVIDENCE.
   A datasheet claiming a figure is not a demonstration of it. One component in
   this estate is specified at 8000 N, claimed at 8000 N by analysis, and
   demonstrated at 7600 N on a rig. The capability row alone reads "carryover,
   no cost" and is wrong by a redesign.
   So: a finding of have_it requires a citation showing it was DEMONSTRATED, not
   one showing it was claimed. If you only have a claim, say change_needed and
   put the question to a person.

2. DOCUMENTS THAT DISAGREE, RESOLVED SILENTLY.
   They do disagree here. One software component is stated at one safety level
   by a requirement, the same level by a design note marked out of date, and a
   different level by its static-analysis report. Which is true changes the cost
   by a six-figure sum.
   So: when sources conflict, record every position with its own citation and
   put the question to a human. Do not pick the newest, the most specific, or
   the one that makes the answer tidy.

3. INFERRING ONE FACT FROM ANOTHER.
   "A new component was designed" tells you the kind of change. It tells you
   nothing about the safety level, the interfaces touched, or how much was
   reused, however strongly it seems to imply them.
   So: every field comes from a sentence about THAT field, or it is not stated.

4. SEARCHING FOR SOMETHING THAT IS NOT THERE.
   An empty result is an ANSWER, not a failed attempt. If you search for a kind
   of document and get nothing back, try ONE differently-worded search. If that
   also comes back empty or irrelevant, stop: the corpus does not contain it,
   and that absence is very often the finding itself — "no test report exists"
   is exactly what a bid meeting needs to hear.
   Budget yourself about four searches. Each one you make is re-sent to you on
   every turn afterwards, so the eighth is read through the noise of the first
   seven, and the answer gets worse rather than better. **After six the tool
   stops answering** and tells you so — at that point write the assessment from
   what you have. Running out of searches is not a reason to give no answer.

5. ANSWERING BEYOND THE DOCUMENTS.
   Search has no relevance threshold. The best available passages come back even
   when all of them are poor, because deciding "the answer is not in the corpus"
   is reading comprehension and not a score.
   So: read what comes back and judge it. If the passages do not answer the
   question, the finding is cannot_tell and the reason is that the documents do
   not cover it — not the closest thing that happened to be returned.

6. PUTTING AN OPEN QUESTION IN THE WRONG FIELD.
   There are two different uncertainties and they belong in two different places.
   WHAT STATE the requirement is in is the finding. HOW MUCH WORK it implies is
   the cost. They are decided separately.
   A requirement that exists, needs a test report, and has a disputed
   measurement point is in a KNOWN state — change_needed — even though nobody
   yet knows whether the fix is a rig week or a redesign. That second
   uncertainty is a refusal in cost.refused_because and a question for a human.
   Downgrading the finding to cannot_tell because the SIZE is unknown throws
   away something you established.

CITE FROM THE PROGRAMME YOU ARE ASSESSING.
Much of a specification is boilerplate repeated across every customer — the
sentence "where the method is test, the supplier shall provide a test report"
appears in seventy-six of them, word for word. When the same sentence exists in
several documents, cite the copy belonging to the programme in question. A
reader who opens a citation and finds another customer's specification stops
trusting the page, and they are right to.

If you have worked out which programme a free-typed requirement belongs to, cite
that programme's documents from then on.

KEEP THE REASONING SHORT, AND DO NOT QUOTE IN IT.
Two or three sentences saying why the finding follows. The citations field
already carries every quote with its file and line, and a reader sees them right
below your reasoning — repeating them there makes the argument harder to find,
not better supported. Say what you concluded and why; let the citations be the
evidence.

CITE EXACTLY, FROM WHAT THE TOOL GAVE YOU.
Every passage comes back with its file and the line it starts on. Use those two
values as they are — do not adjust the line to where you think the sentence sits,
and never write a line you were not given. If a passage has no line, cite the
file and say the line is unknown rather than choosing one.

Quote verbatim. A paraphrase cannot be checked, and unquotable evidence is the
same as none.

WHAT YOU DO NOT DO.
You do not commit the company to anything — not a price, not a delivery, not an
absorbed cost. A quotation is a contract and a named person signs it. You report
what similar work cost; what to charge is somebody else's decision.

A QUESTION IS THE RIGHT OUTPUT.
"Is this shortfall a re-test or a redesign, and who decides?" is exactly what
this exercise is for. Put the real question to the right role, say what changes
depending on the answer, and stop there.`;

/**
 * The user turn — the requirement, AND the passages it already matches.
 *
 * ── WHY THE FIRST SEARCH IS DONE FOR IT ──────────────────────────────────
 *
 * Three runs in a row spent their opening turn searching for the context of a
 * requirement that was handed to them. One of them then flailed to ten tool
 * calls and hit the turn cap with nothing written down.
 *
 * This is the `write` verb from `docs/steering/CONCEPTS.md`: state the shape so
 * it is not re-derived. We know the requirement text, so we can run the obvious
 * first search ourselves, deterministically, before the loop starts — and hand
 * over the result instead of the task of obtaining it.
 *
 * TWO THINGS THAT BUYS, and the second is the one that matters:
 *
 *   · a turn, immediately
 *   · a consistent starting point. The model's own first query varied run to
 *     run, so every run began from somewhere slightly different and the later
 *     turns inherited that variance. A fixed opening makes the runs comparable
 *     with each other, which is what evals need.
 *
 * IT IS A STARTING POINT, NOT THE EVIDENCE. The prompt says so explicitly:
 * these passages are what a plain search returns, they are not guaranteed to
 * contain the answer, and searching further is expected when they do not.
 * Presenting them as sufficient would swap one failure for another — a model
 * that stops looking because it was given something.
 */
/**
 * A seeded passage. `text` is the BODY — a verbatim slice of the file — and
 * `section` is the heading trail, given as a label rather than as part of the
 * quotable text.
 *
 * The distinction cost an eval failure: passages were handed over with the
 * chunker's trail prefixed, a run quoted the composite faithfully, and the
 * verification correctly reported that quote was not in the file. It was not.
 * The model copied exactly what it was shown.
 */
export interface SeedPassage {
  sourcePath: string;
  startLine: number | null;
  text: string;
  section?: string | null;
}

export function userPrompt(
  requirementRef: string,
  text: string,
  seed: SeedPassage[] = [],
  programme?: string | null,
  notes: SeedPassage[] = [],
): string {
  // SAID, NOT ASSUMED. When the scope is bound, the model is told — otherwise
  // it cannot know why a search returned nothing and may widen for the wrong
  // reason. When it is NOT bound, it is told that too, because a corpus-wide
  // result set is exactly where another programme's requirement starts looking
  // like a contradiction.
  const scope = programme
    ? `\n\nThis requirement belongs to ${programme}. Searches are narrowed to it ` +
      `automatically. Every other programme in the corpus states similar requirements ` +
      `with different numbers — those are different vehicles, not disagreements. Set ` +
      `widen_beyond_programme only if you are deliberately asking what another ` +
      `programme did.`
    : `\n\nThis requirement matches no specification we hold, so searches cover ALL ` +
      `programmes. Passages from different programmes are different vehicles. Do not ` +
      `report two programmes' differing figures as a disagreement.`;

  const head = `Assess ${requirementRef}.\n\nThe customer requirement reads:\n\n${text}${scope}`;
  if (!seed.length) return head;

  // The location is a HEADER LINE, outside the text. Everything below the
  // header is verbatim from the file and therefore quotable; the header is not.
  const block = (p: SeedPassage): string =>
    `--- ${p.sourcePath}${p.startLine ? `:${p.startLine}` : ''}` +
    `${p.section ? `   [${p.section}]` : ''}\n${p.text}`;

  const passages = seed.map(block).join('\n\n');

  const noteBlock = notes.length
    ? `

The programme's own review notes, which record what it already knows is
unresolved. Read these: an ambiguity written down here is a disagreement the
customer's own reviewers found, and it belongs in your conflicts if it touches
this requirement.

${notes.map(block).join('\n\n')}`
    : '';

  return `${head}

To save you a turn, here is what a plain search for that requirement returns.
This is a STARTING POINT, not the evidence: it is whatever ranked highest, it
may not contain what you need, and you should search further when it does not.

Each block begins with a header line of the form --- file:line [section].
THE HEADER IS NOT PART OF THE DOCUMENT. It tells you where the passage sits.
Quote only from the lines beneath it, which are verbatim from the file.

${passages}${noteBlock}`;
}
