/**
 * The indexed corpus — 2,827 passages of the customer's own prose, searched.
 *
 * ── WHY THIS IS A DEPARTMENT AND NOT A HELPER ────────────────────────────
 *
 * It sits beside `derived.ts` for the same reason that file gives: these
 * functions return data and print nothing. A retrieved passage is evidence, and
 * evidence has to survive as a value — the moment "here is the paragraph that
 * proves it" is a console.log, nothing but a human at a terminal can act on it.
 *
 * ── WHAT THIS REPLACES, WHICH IS THE POINT OF THE WHOLE INDEX ────────────
 *
 * `walk-cost` step 3 opens a file by a path written into its source and finds
 * the paragraph with a pattern also written into its source. The sentence it
 * surfaces is the most valuable one in the estate — the damping software ships
 * at ASIL B, a new programme needs ASIL D — and the walk's own output claims
 * *"this cost item only exists if somebody read the document."*
 *
 * Nobody read anything. The answer is real and the FINDING of it is staged; at a
 * real engagement no one knows that path. These functions are what let it be
 * found instead.
 *
 * ── EVERY RESULT CARRIES ITS SOURCE, ALWAYS ──────────────────────────────
 *
 * A passage without its file and heading trail is a floating claim. Twelve
 * programmes in this corpus say something like "shall not exceed 2.7 N·m" with
 * different numbers, and a fragment that cannot say which one it came from is
 * worse than no answer, because it is confidently wrong instead of absent.
 */
import { hybridSearch, openStore } from '@fde/grounding';
import { derivedUrl } from '../../config/connections';
import { CHUNK_TABLE } from '../../grounding/chunks';
import type { DerivedHandle } from '../utils/handle';

/**
 * The vector store, typed as whatever `openStore` returns.
 *
 * NOT imported from `@langchain/pgvector`, and the reason is a real failure
 * rather than taste. Naming that package here made steering resolve its own copy
 * of it, and TypeScript then refused to pass a store built by `@fde/grounding`
 * into a function expecting one built here — two structurally identical classes
 * from two installs of the same package, differing in a private field.
 *
 * Inferring the type instead means there is exactly one, by construction. It is
 * also the honest boundary: which vector store is used is `@fde/grounding`'s
 * business, and a domain package that names it has reached through the
 * abstraction it was given.
 */
export type DocumentStore = Awaited<ReturnType<typeof openStore>>;

/** One retrieved passage, with everything needed to cite it. */
export interface Passage {
  /**
   * The passage as indexed: the chunker's heading trail, then the body.
   *
   * USEFUL FOR CONTEXT AND UNQUOTABLE. The trail — "Requirements review — K2 >
   * Points raised" — is assembled by the chunker and appears nowhere in the
   * source file, where those headings sit on separate lines with `#` markers.
   * Quote from `body` instead; see the note there.
   */
  text: string;
  /**
   * The passage WITHOUT the trail — a verbatim slice of the file.
   *
   * ── ADDED AFTER HANDING A MODEL UNQUOTABLE TEXT ────────────────────────
   *
   * Seeded passages were given to the model as `text`, and one run quoted the
   * composite faithfully — trail included. The verification then reported
   * "quote not in the file", correctly, about a quote the model had copied
   * exactly from what it was given.
   *
   * It did precisely what was asked. The instruction was wrong: you cannot ask
   * for a verbatim quote from a file and supply text that is not in it.
   */
  body: string;
  /** `pmo/closure-reports/EFF-BULK-0067.md` — openable, relative to the corpus. */
  sourcePath: string;
  /**
   * 1-based line where this passage begins in that file.
   *
   * SURFACED BECAUSE THE ANSWER CONTRACT REQUIRES A LINE and the first agent
   * run, having none, wrote `1` four times out of five. A required field a model
   * cannot source is a field it will fabricate — so it is sourced.
   */
  startLine: number | null;
  /** The heading trail above it, e.g. "K2 > 2. Requirements > SR-EPS-0421". */
  section: string | null;
  /** The domain's own type: `safety_assessment`, `crs`, `misra_report`, … */
  docType: string;
  /** Which programme or repository it belongs to, when the document says. */
  programme: string | null;
  repo: string | null;
  /** Fused rank score, best result 1. NOT a similarity, and not a confidence. */
  score: number;
  /**
   * How it was found. Both arms is the strong case; one arm alone is worth
   * seeing, because dense-only often means the words did not match and
   * keyword-only often means the meaning did not.
   */
  foundBy: 'both' | 'meaning' | 'keywords';
}

export interface SearchResult {
  passages: Passage[];
  /** True when the caller's search budget is spent. See `SEARCH_BUDGET`. */
  budgetSpent?: boolean;
  /** Why no passages came back, when the reason is not "nothing matched". */
  note?: string;
  /**
   * False when the keyword arm could not run.
   *
   * SURFACED RATHER THAN SWALLOWED. If the full-text column is missing because
   * the index has not been rebuilt, retrieval silently degrades to half of
   * itself and every result still looks fine. The caller is told.
   */
  keywordArmRan: boolean;
}

/** What a caller may narrow by. Nothing here is required. */
export interface SearchFilter {
  docType?: string;
  programme?: string;
  repo?: string;
}

function toPassage(h: { doc: any; score: number; denseRank?: number; sparseRank?: number }): Passage {
  const m = h.doc.metadata ?? {};
  return {
    text: h.doc.pageContent,
    // `body` is stored by the ingest alongside the chunk. Falling back to the
    // full text would reintroduce the trail silently, so an absent body is
    // better left obviously empty than quietly wrong.
    body: typeof m.body === 'string' ? m.body : '',
    sourcePath: m.sourcePath ?? m.documentId ?? 'unknown',
    startLine: typeof m.startLine === 'number' ? m.startLine : null,
    section: m.section ?? null,
    docType: m.docType ?? 'unknown',
    programme: m.programme ?? null,
    repo: m.repo ?? null,
    score: h.score,
    foundBy: h.denseRank && h.sparseRank ? 'both' : h.denseRank ? 'meaning' : 'keywords',
  };
}

/**
 * Passages matching a question, best first.
 *
 * NO SCORE CUTOFF, and that is deliberate rather than lazy. Deciding "the answer
 * is not in this corpus" is reading comprehension, not a threshold — a cutoff
 * tuned to hide junk on one question hides the answer on the next, and it fails
 * silently in both directions. Top-k comes back even when every hit is poor,
 * and judging them is the caller's job.
 */
export async function searchDocuments(
  store: DocumentStore,
  question: string,
  k = 8,
  filter?: SearchFilter,
): Promise<SearchResult> {
  const clean = Object.fromEntries(
    Object.entries(filter ?? {}).filter(([, v]) => v !== undefined && v !== null),
  );

  const result = await hybridSearch(store, question, k, Object.keys(clean).length ? clean : undefined, {
    // Must name the same database the store was opened with: the two arms
    // fusing results from two different databases is a failure with no symptom.
    connectionString: derivedUrl(),
    tableName: CHUNK_TABLE,
  });

  return {
    passages: result.hits.map(toPassage),
    keywordArmRan: result.fullText,
  };
}

/**
 * The one passage a question is best answered from, or nothing.
 *
 * Returns `undefined` rather than a weak first result when the corpus has
 * nothing — same reasoning as the refusal rule in the cost answer. A caller
 * that wants to see the near-misses asks for them.
 */
export async function bestPassage(
  store: DocumentStore,
  question: string,
  filter?: SearchFilter,
): Promise<Passage | undefined> {
  const { passages } = await searchDocuments(store, question, 1, filter);
  return passages[0];
}

/**
 * How many passages exist AT ALL. Plain SQL — no embedding call, no cost.
 *
 * ── WHY A CALLER NEEDS THIS BEFORE IT NEEDS THE SEARCH ───────────────────
 *
 * "The search found nothing" is two completely different statements:
 *
 *   the index was never built        ← about US
 *   no document says that            ← about the CUSTOMER
 *
 * The second is a finding worth putting in front of somebody. The first is a
 * broken pipeline, and reporting it as the second is how a missing ingest gets
 * read as a fact about a corpus. `derivePrice` already had to learn this the
 * hard way — it printed three confident "we have not done enough of this to
 * know" refusals while `extracted_facts` was empty — and the fix there was the
 * same: count what exists before interpreting what came back.
 *
 * Cheap enough to call unconditionally, but it is on the handle rather than the
 * store because counting rows should not need an embedding model.
 */
export async function countPassages(h: DerivedHandle): Promise<number> {
  const r = await h.one(`select count(*)::int n from ${CHUNK_TABLE}`);
  return Number(r?.n ?? 0);
}
