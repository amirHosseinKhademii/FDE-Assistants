/**
 * Scoring RETRIEVAL for steering, separately from scoring an assessment.
 *
 * ── WHY THIS EXISTS, AND WHY IT IS THE PREREQUISITE FOR A RERANKER ───────
 *
 * `pnpm steering:eval` scores the ANSWER — did it find the carryover trap, did
 * it cite a line that lands, did it refuse to price. That is the thing that
 * matters and it is also the thing that hides a retrieval failure: a model can
 * reach the right finding while the retriever was mediocre, because the loop
 * SEEDS four passages into the prompt before the model acts. Retrieval could be
 * degrading and every answer check would stay green.
 *
 * Until now steering's only retrieval evidence was `retrieval:check`
 * (`tools/departments/documents-selftest.ts`): five hand-written predicates,
 * pass or fail, no number. A predicate cannot regress by four points. A recall
 * figure can, and that is the entire point of this file.
 *
 * `docs/RETRIEVAL.md` §9 carried the row this closes — *"There is no reranker,
 * and no measurement saying one would help. Its absence is a gap named, not a
 * decision defended."* The reranker is the second half; this is the first, and
 * it has to come first. `docs/PROGRESS.md:966` states the rule the whole repo
 * is written under: *adding a reranker now is guessing it helps; adding it
 * after gives you "the reranker bought 7 points."*
 *
 * ── WHAT IS MEASURED, AND WHERE ──────────────────────────────────────────
 *
 * `hybridSearch` — the retriever, and nothing above it. Not `searchDocuments`,
 * which is a thin wrapper, and emphatically not `search_documents` the tool,
 * whose budget and filters are the agent's business. One number, one cause.
 *
 * DOMAIN: everything in this file is a statement about what identifies a
 * passage in THIS corpus. The arithmetic — recall@k, MRR, the pass rule, the
 * summary — lives in `@fde/evals` and knows nothing about steering. That split
 * is not decoration: `pnpm leak:check` fails the build if it is crossed.
 */
import {
  scoreCase,
  scoreHits,
  retrievalSummary,
  type RetrievalCase as GenericCase,
  type CaseScore,
  type RetrievalSummary,
} from '@fde/evals';

export { scoreCase, scoreHits, retrievalSummary };
export type { CaseScore, RetrievalSummary };

/**
 * One retrieval case, plus the filter a steering search may narrow by.
 *
 * DOMAIN. `@fde/evals` knows nothing about programmes or repositories, so the
 * pre-ranking filter is declared here rather than guessed at there.
 */
export interface SteeringRetrievalCase extends GenericCase {
  /** Restrict to one programme (`PRG-ALT-08`), or null to search everything. */
  programme?: string | null;
  /** Restrict to one repository (`eps-steering-feel`), or null for all. */
  repo?: string | null;
  /** Restrict to one document type (`safety_assessment`), or null for all. */
  docType?: string | null;
  tags: string[];
  note: string;
}

/**
 * ══ WHY STEERING'S LABEL IS BUILT ON THE PATH AND PHARMA'S IS NOT ═════════
 *
 * Pharma labels a passage by REVISION AND CLAUSE (`SOP-QC-014 Rev 7 §7.3`),
 * read entirely out of the heading trail, because five SOPs share a clause
 * numbering scheme and `§7.3` means different things in two revisions.
 *
 * Copying that here would have been wrong, and the corpus says so out loud.
 * Measured over all 3,854 indexed passages on 2026-09-14:
 *
 *     TRAIL        2,835   `Title > 2. Requirements > SR-ALT-08-0181 — …`
 *     TITLE-ONLY     467   the trail is the document title and nothing else
 *     EMPTY          293   NO TRAIL AT ALL — every closure report, every
 *                          MISRA report. They are `.txt` and `.md` with no
 *                          headings, and the chunker has nothing to build from
 *     BANNER         259   every CRS, whose "trail" is the six-line
 *                          `====` confidentiality banner, not a heading
 *
 * A trail-only label is `null` for the 552 EMPTY and BANNER passages. That is
 * not a cosmetic gap: `@fde/evals`' own `scoreHits` header spells out the
 * consequence — an unlabelled hit still OCCUPIES a top-k slot but can be
 * neither a hit nor an intruder, so a case whose k fills with them reports a
 * clean miss rather than "the retriever returned junk". The 220 closure reports
 * are the single most important document class in this estate; they are what
 * `find_comparable_work` prices from. A scheme that cannot name them cannot
 * measure the retrieval that matters most.
 *
 * `documentId` is present on all 3,854 passages (0 nulls, checked) and is the
 * repo-relative path. So the path is the spine of the label, and the trail
 * refines it when it has something to say.
 *
 * ── AND THE PATH ALREADY CARRIES THE CONFUSABLE PAIRS ────────────────────
 *
 * `documents.ts` names the trap in its own header: *"Twelve programmes in this
 * corpus say something like 'shall not exceed 2.7 N·m' with different
 * numbers."* Those twelve live at twelve different paths
 * (`requirements/PRG-TDR-01/…`, `requirements/PRG-ALT-08/…`), so a path label
 * separates them for free — this corpus's equivalent of pharma's Rev 6 / Rev 7
 * problem, solved by the identifier that was already there.
 *
 * The sharper pair is a superseded revision: `CRS-ALT-08-001_RevA.md` is marked
 * `SUPERSEDED` and `_RevB.md` is `IN FORCE`. Two paths, two labels, and citing
 * the withdrawn one is a real error this scheme can name.
 *
 * ── WHY 4.18 CHUNKS PER DOCUMENT MAKES THIS HONEST ───────────────────────
 *
 * 922 documents, 3,854 passages. A document-level label is within a factor of
 * four of a passage-level one. Pharma could not have done this — 5 documents,
 * 75 chunks, 15 per document — which is exactly why its label had to reach
 * inside the document and steering's does not.
 */

/**
 * The identifier a heading trail's LEAF carries, or `null` for prose.
 *
 * Read from the START of the leaf's first line, never by scanning it. That is
 * what keeps the CRS banner out: it is six lines of prose containing document
 * numbers, and a scan would pull `CRS-ALT-08-001` out of the middle of a
 * confidentiality notice and call it a section anchor.
 *
 * Three shapes, all verbatim from the indexed corpus:
 *
 *     SR-ALT-08-0181 — assist latency ms        → `SR-ALT-08-0181`
 *     A2l_Export()                              → `A2l_Export()`
 *     3. Component classification               → `3`
 *     What it does / Points raised / file header→  null, and the label falls
 *                                                  back to the document
 *
 * Built from the IDENTIFIER, never the heading prose — pharma's rule and the
 * reason for it transfers exactly: a label written against "Component
 * classification" breaks when somebody rewords the heading, and breaks reported
 * as a RETRIEVAL MISS, sending you hunting the embeddings for a typo in a title.
 */
export function anchorOf(section: string | null | undefined): string | null {
  if (!section) return null;
  const parts = section.split('>');
  const leaf = (parts[parts.length - 1] ?? '').split('\n')[0]!.trim();
  if (!leaf) return null;

  // A requirement id: SR-EPS-0421, SR-ALT-08-0181. The programme-scoped form
  // carries an extra group; both appear in this corpus.
  const req = /^(SR-[A-Z]{2,4}-\d{2,4}(?:-\d{3,4})?)\b/.exec(leaf);
  if (req) return req[1]!;

  // A C function, as the code chunker names it — `Fric_Init()`,
  // `test_Assist_CalcBase_holds_at_zero()`. The parentheses are part of the
  // label: they are what distinguishes a symbol from a word.
  const fn = /^([A-Za-z_][A-Za-z0-9_]*\(\))/.exec(leaf);
  if (fn) return fn[1]!;

  // A numbered clause. `\d+` and not `\d`, for the reason pharma's self-test
  // planted and watched fire: a single-digit pattern makes §10 UNLABELLED
  // rather than §1, and an unlabelled passage leaves the measurement silently.
  const clause = /^(\d+(?:\.\d+)*)[.\s]/.exec(leaf);
  if (clause) return clause[1]!;

  return null;
}

/** What `labelOf` needs. A subset of the chunk metadata, named. */
export interface LabelledChunk {
  /** The repo-relative path. Present on every passage in this corpus. */
  documentId?: string | null;
  /** The heading trail, which may be absent, a title, or a banner. */
  section?: string | null;
}

/**
 * One passage → one label.
 *
 * ══ THIS IS THE WHOLE DOMAIN, AND THE REASON THE ARITHMETIC COULD LEAVE ═══
 *
 * `path` when the trail says nothing, `path §anchor` when it does.
 *
 * NEVER NULL for a real passage, and that is the deliberate difference from
 * pharma. There, `null` was the honest answer for a document preamble that
 * states no clause. Here, a passage with no trail is a closure report — the
 * most-priced-from document class in the estate — and calling it unnameable
 * would drop 293 passages out of every measurement without a word.
 *
 * `null` survives for exactly one case: a chunk with no `documentId`. There are
 * none, and if one ever appears it should be loudly unscoreable rather than
 * quietly labelled `'unknown'`, which would make every such chunk collide.
 *
 * ── A LABEL NAMES A SECTION, NOT A CHUNK ─────────────────────────────────
 *
 * A long section splits across passages and both halves carry the same label;
 * either satisfies an expectation. That is right — "did this evidence get in
 * front of the model" is the question, and it did. Scoring on `chunkId` would
 * make every long section unscoreable and break again at the next one.
 *
 * ── THE GRANULARITY TRAP, WHICH IS REAL AND WORTH STATING ────────────────
 *
 * Expectations are matched EXACTLY (`@fde/evals` `scoreCase`). So a case
 * expecting `safety-assessment-2021.md §3` is NOT satisfied by the preamble
 * passage of the same file, which labels as `safety-assessment-2021.md`. That
 * is precision behaving correctly, and it is also the easiest way to write a
 * case that fails for a reason that has nothing to do with the retriever.
 * Write cases against labels you have SEEN — `--show-labels` prints them.
 */
export function labelOf(chunk: LabelledChunk): string | null {
  const path = chunk.documentId?.trim();
  if (!path) return null;
  const anchor = anchorOf(chunk.section);
  return anchor ? `${path} §${anchor}` : path;
}
