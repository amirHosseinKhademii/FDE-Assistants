/**
 * Scoring for RETRIEVAL, separately from scoring the answer.
 *
 * WHY THIS EXISTS. `pnpm pharma:eval` scores the ANSWER — did the model reach
 * the right disposition, did it cite a clause, did it escalate. That is the
 * thing that matters, and it is also the thing that hides a retrieval failure:
 * on a 31-chunk corpus a model can reach the right answer while the retriever
 * was mediocre, because a mediocre top-5 out of 31 still contains the clause
 * often enough. Grow the corpus and that luck evaporates — with no warning,
 * because the only signal was an answer score that had been green all along.
 *
 * Until now the retrieval evidence in this repo was ONE QUERY, TYPED ONCE, and
 * written up in prose (`NEXT.md` §P4a). A paragraph cannot regress. A number
 * can, and that is the entire point of this file.
 *
 * WHAT IS MEASURED, AND WHERE. The retriever — `hybridSearch` — and nothing
 * above it. `search_procedures` over-fetches `k * 6`, applies the `as_of` date
 * window, then slices to k. Measuring at the tool boundary would blend
 * retriever quality with `inForceOn`, which is already unit-checked by
 * `pnpm tools:check` and would fail this suite for a reason that has nothing to
 * do with retrieval. One number, one cause.
 *
 * So the live runner calls the retriever DIRECTLY, with the signature the tool
 * already proves works — no `as_of`, no over-fetch, no slice:
 *
 *     hybridSearch(store, c.query, c.k, c.sop_id ? { sopId: c.sop_id } : undefined,
 *                  { tableName: 'document_chunks', connectionString: urlFor(KB_DB) })
 *
 * Written down because `search_procedures` is the obvious thing to reach for
 * and is the wrong thing: `RetrievalCase` carries no `as_of` on purpose, and a
 * runner that went through the tool would quietly re-introduce the date window
 * this file exists to stay out of.
 *
 * DOMAIN: the label grammar below (`SOP-QC-014 Rev 7 §7.3`) is a statement
 * about what identifies a rule in THIS corpus. The scoring beneath it is not.
 * If a second domain needs the same shape, that is when it moves to
 * `@fde/evals` — the "extract on the second occurrence" rule, not before.
 */
import {
  scoreCase,
  retrievalSummary,
  type RetrievalCase as GenericCase,
  type CaseScore,
  type RetrievalSummary,
} from '@fde/evals';

/**
 * THE SCORING NOW LIVES IN `@fde/evals` — extracted 2026-09-12.
 *
 * recall@k, MRR, the pass rule and the summary are arithmetic over labels and
 * know nothing about pharmaceuticals. What stayed here is the ONE thing that
 * could never move: `labelOf`, which says how a retrieved chunk names itself.
 * In this corpus that is a REVISION and a CLAUSE, because Rev 6 §7.3 is
 * "Records" and Rev 7 §7.3 is the training precondition — a label of "§7.3"
 * alone would score a hit on the wrong revision's filing rule as a hit on the
 * rule that invalidates a certification.
 *
 * That asymmetry is the whole extraction: the package took the arithmetic, the
 * domain kept the identity.
 */
export { scoreCase, retrievalSummary };
export type { CaseScore, RetrievalSummary };


export interface RetrievalCase extends GenericCase {
  /**
   * Restrict to one procedure, or null to search everything.
   *
   * DOMAIN. `@fde/evals` knows nothing about SOPs, so the filter a retriever
   * applies before ranking is added here rather than guessed at there.
   */
  sop_id: string | null;
  tags: string[];
  note: string;
}

/**
 * The clause number a heading trail ends in — `7.3`, `6.1`, `10`.
 *
 * `null` for a document preamble, whose trail is the title alone. That is a
 * real chunk (two of the thirty-one) and returning `null` for it is correct
 * rather than a gap: the preamble states no clause, so no label can name it.
 *
 * THE CONSEQUENCE, WHICH IS NOT OBVIOUS WHEN READING A RED RESULT. An unlabelled
 * chunk still OCCUPIES a top-k slot, but can neither be a hit nor an intruder —
 * it is invisible to scoring. So a case whose k is filled with preambles reports
 * a clean miss rather than "the retriever returned junk", and the two look
 * identical in the recall number. `ranked` is on `CaseScore` for exactly this:
 * the nulls in it are what tell those two apart.
 */
export function clauseOf(headingTrail: string): string | null {
  const parts = headingTrail.split('>').map((s) => s.trim()).filter(Boolean);
  const leaf = parts[parts.length - 1] ?? '';
  const m = /^(\d+(?:\.\d+)*)[.\s]/.exec(leaf);
  return m ? m[1] : null;
}


/**
 * The revision a heading trail belongs to — `SOP-QC-014 Rev 7`.
 *
 * Read from the trail's FIRST segment, which is the document title, rather than
 * from the chunk's `revisionId` metadata. Deliberate: the label has to be
 * checkable against a trail alone, so the self-test can exercise scoring on
 * synthetic rankings with no database and no metadata at all.
 */
export function revisionOf(headingTrail: string): string | null {
  const first = headingTrail.split('>')[0] ?? '';
  const m = /\b(SOP-[A-Z]{2,4}-\d{3})\s+Rev\s+(\d+)\b/i.exec(first);
  return m ? `${m[1].toUpperCase()} Rev ${Number(m[2])}` : null;
}

/**
 * One heading trail → one label, or `null` if it cannot carry one.
 *
 * ══ THIS IS THE WHOLE DOMAIN, AND THE REASON THE REST COULD LEAVE ═════════
 *
 * `@fde/evals` scores labels and never asks what one is. This says what one is
 * HERE: a revision and a clause number, never a clause alone.
 *
 * Rev 6 §7.3 is "Records". Rev 7 §7.3 is "Personnel precondition to
 * certification" — Rev 7 renumbered Records to §7.4. A label of "§7.3" would
 * score a hit on the wrong revision's FILING RULE as a hit on the rule that
 * invalidates a certification, which is exactly the `rel-001` / `rel-007`
 * confusion the eval suite exists to catch.
 *
 * Built from the clause NUMBER, never the heading prose: a label written
 * against a heading breaks when somebody rewords it, and breaks reported as a
 * RETRIEVAL MISS — sending you hunting the embeddings for a typo in a title.
 *
 * A LABEL NAMES A CLAUSE, NOT A CHUNK. §7.2 of SOP-SCM-004 exceeds the chunk
 * budget and is split in two; both halves carry this label and either satisfies
 * an expectation, which is right — "did the model get §7.2 in front of it" is
 * the question, and it did.
 */
export function labelOf(headingTrail: string): string | null {
  const revision = revisionOf(headingTrail);
  const clause = clauseOf(headingTrail);
  return revision && clause ? `${revision} §${clause}` : null;
}
