/**
 * search_documents — the customer's own prose, searched instead of guessed at.
 *
 * ── WHY THIS TOOL EXISTS AT ALL ──────────────────────────────────────────
 *
 * The most expensive line item in a steering bid is often visible in exactly
 * one paragraph of one document: a component ships at one safety level and the
 * new programme requires a higher one, so the code survives and the entire
 * safety argument has to be produced again. No table anywhere records that. A
 * system built on the databases alone quotes the job without it.
 *
 * Until this existed, the walk that demonstrates that finding opened the file by
 * a path written into its own source. The answer was real and the FINDING of it
 * was staged.
 *
 * ── NO SCORE CUTOFF, AND THAT IS THE DESIGN ──────────────────────────────
 *
 * Top-k comes back even when every hit is poor. Deciding *"the answer is not in
 * this corpus"* is reading comprehension and belongs to the model — a
 * similarity threshold tuned to suppress junk on one question suppresses the
 * answer on the next, and it fails silently in both directions.
 *
 * So the tool description says so, in as many words. A model that believes a
 * returned passage is thereby relevant will cite a closure report at a question
 * about parental leave, which is exactly what the acceptance check asks of this
 * corpus and exactly what it must not do.
 *
 * DOMAIN: steering-system engineering documents. The pattern — hand back
 * passages with their provenance and refuse to pre-judge relevance — is
 * insurance's `search_policy` unchanged.
 */
import { z } from 'zod';
import type { Tool } from '@fde/agent';
import { openStore } from '@fde/grounding';
import { derivedUrl } from '../../config/connections';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../../grounding/chunks';
import {
  searchDocuments, type DocumentStore, type SearchResult,
} from '../../tools/departments/documents';

/**
 * ── THE CEILING ON `k`, AND IT IS A CONTEXT DECISION NOT A SEARCH ONE ────
 *
 * Added after the first real assessment run hit a rate limit. The model made
 * six searches for one requirement and asked for **k=20 on five of them** — 90
 * passages, roughly 12,000 tokens of evidence, re-sent on every subsequent
 * turn. The old description invited exactly that: *"ask for more when comparing
 * documents."*
 *
 * The reason a ceiling is right, rather than merely cheaper: **this search has
 * no relevance cutoff by design.** The best available passages always come
 * back, so raising `k` from 6 to 20 does not add fourteen more useful passages
 * — it adds the fourteen *worst* available. You pay more in order to think
 * worse, and past a point the one passage that mattered is buried among them.
 *
 * 10 rather than 6 because comparing two documents is a real need. The default
 * stays 6 because most questions are not that.
 */
export const MAX_PASSAGES = 10;
export const DEFAULT_PASSAGES = 6;

export const SEARCH_DOCUMENTS = 'search_documents';

/** The types the corpus actually holds. Listed so the model filters, not guesses. */
const DOC_TYPES = [
  'crs', 'system_requirements', 'architecture', 'review_notes',
  'safety_assessment', 'module_doc', 'test_report', 'misra_report',
  'release_note', 'repo_readme', 'closure_report', 'quotation',
] as const;

interface Args {
  question: string;
  doc_type?: string;
  programme?: string;
  repo?: string;
  k?: number;
  /** Set only to ask deliberately about OTHER programmes. See the note on the schema. */
  widen_beyond_programme?: boolean;
}

/** Opened once and reused. The pool behind the index outlives every query through it. */
export async function openDocumentStore(): Promise<DocumentStore> {
  return openStore(openEmbeddings(), { connectionString: derivedUrl(), tableName: CHUNK_TABLE });
}

/**
 * TAKES A STORE, NOT A CONNECTION STRING. Same reasoning as the other tool and
 * one more besides: opening the store also constructs the embedding client, so
 * a tool that opened its own per call would re-authenticate on every question.
 * The caller owns it and calls `.end()`.
 */
/**
 * ── THE BOUND PROGRAMME, AND WHY IT IS OVERRIDABLE ───────────────────────
 *
 * When the caller knows which programme the question is about, it says so here
 * and every search is narrowed to it unless the model deliberately widens.
 *
 * NOT ENFORCED, AND THAT IS THE DECISION. "Has anyone else solved this?" is a
 * real and valuable question — the estate holds eleven programmes precisely so
 * that carryover can be found. A hard filter would forbid it.
 *
 * So: narrowed by default, widened on request, and the widening is VISIBLE in
 * the trace. A reader should know when a result set stopped being about their
 * car, because that is exactly when a near-identical requirement from another
 * programme starts looking like a contradiction.
 */
/**
 * How many searches one assessment may make before the tool stops answering.
 *
 * ── AN INSTRUCTION THAT ONE RUN IN FIVE IGNORED ─────────────────────────
 *
 * The prompt says "budget yourself about four searches", and the median run
 * obeys — two to four. One run in five made EIGHT, never called the pricing
 * tool at all, and hit the turn cap with no answer written.
 *
 * Raising the turn cap would have bought more searching, not an answer. The
 * failure was not that it ran out of room; it was that it would not stop.
 *
 * So the budget moves from the prompt into the tool, for the reason
 * `MIN_COMPARABLES` is in the pricing tool rather than the prompt: **a rule a
 * model can talk itself out of is not a rule.**
 *
 * ── IT REFUSES, IT DOES NOT THROW ───────────────────────────────────────
 *
 * Past the budget the tool returns an ordinary result carrying no passages and
 * a sentence saying why. The model can still answer from what it has, and the
 * answer contract still requires citations, so it cannot fabricate its way out.
 * "You have searched enough" is a fact about the conversation, not a fault.
 *
 * SIX, NOT FOUR: the prompt's four is the target and this is the ceiling. A
 * ceiling set at the target punishes a run that legitimately needed one more.
 */
export const SEARCH_BUDGET = 6;

export interface SearchBudget {
  spent: number;
}

export function searchDocumentsTool(
  store: DocumentStore,
  boundProgramme?: string | null,
  budget?: SearchBudget,
): Tool<Args, SearchResult> {
  return {
    // Live Postgres AND an embedding call per question — the question has to be
    // turned into a vector by the same model the passages were.
    hasUpstream: true,

    schema: {
      type: 'function',
      name: SEARCH_DOCUMENTS,
      description:
        'Search the customer\'s engineering and project documents — ' +
        'specifications, system requirements, architecture baselines, safety ' +
        'assessments, static-analysis reports, test reports, release notes, ' +
        'project closure reports and quotations. Use it for anything that is ' +
        'written down in prose rather than recorded as a field: what a ' +
        'component is classified as today, why a deviation was accepted, what ' +
        'a review concluded, what a programme committed to. ' +
        'IMPORTANT: there is NO relevance threshold. The best available ' +
        'passages are always returned, even when every one of them is a poor ' +
        'match, because deciding that an answer is not in the corpus is ' +
        'reading comprehension and not a score. Read the passages and judge ' +
        'them: if they do not actually answer the question, say the documents ' +
        'do not cover it rather than citing the closest thing that came back. ' +
        'Every passage carries the file it came from and the headings above ' +
        'it, so cite the file. Do not paraphrase a passage into a fact without ' +
        'saying which document it is from.',
      parameters: z.strictObject({
        question: z
          .string()
          .describe(
            'The question in plain words, as a person would ask it. Search ' +
              'runs on meaning AND on exact keywords together, so a natural ' +
              'sentence works and so does a bare identifier like ' +
              '"SR-EPS-0421" — do not strip a question down to keywords, and ' +
              'do not expand an identifier into a sentence.',
          ),
        doc_type: z
          .enum(DOC_TYPES)
          .optional()
          .describe(
            'Narrow to one kind of document. Use it when the question names ' +
              'the kind ("what does the safety assessment say") and leave it ' +
              'off otherwise — the interesting answers are often in a ' +
              'document type nobody would have thought to ask for.',
          ),
        widen_beyond_programme: z
          .boolean()
          .optional()
          .describe(
            'Leave unset. Searches are narrowed to the programme this requirement ' +
              'belongs to, because every other programme in the corpus states the ' +
              'same requirements in the same words with different numbers — and ' +
              'those are different cars, not disagreements. Set true ONLY to ask ' +
              'deliberately what OTHER programmes did, e.g. looking for carryover. ' +
              'The trace records when you do.',
          ),
        programme: z
          .string()
          .optional()
          .describe(
            'Narrow to one programme, e.g. "PRG-KST-K2". Use the exact id. ' +
              'Most real questions are about one programme, and a result set ' +
              'spanning eleven of them answers none of them.',
          ),
        repo: z
          .string()
          .optional()
          .describe(
            'Narrow to one source repository, e.g. "eps-steering-feel". Use ' +
              'when the question is about a specific piece of software.',
          ),
        k: z
          .number()
          .int()
          .min(1)
          .max(MAX_PASSAGES)
          .optional()
          .describe(
            `How many passages to return, 1 to ${MAX_PASSAGES}. Defaults to ${DEFAULT_PASSAGES}. ` +
              'Asking for more does NOT get you more information: results are ranked, so ' +
              'the extra ones are by definition the weakest matches available. Ask for more ' +
              'only when genuinely comparing several documents, and prefer a sharper question.',
          ),
      }),
    },

    /**
     * Never throws on a bad argument. An unknown programme or repo simply
     * matches nothing, and an empty result set is an informative answer — it
     * says the filter found no documents, which the model can act on. A throw
     * would be read as broken plumbing.
     */
    async execute({ question, doc_type, programme, repo, k, widen_beyond_programme }) {
      const q = (question ?? '').trim();
      if (!q) {
        return {
          passages: [],
          keywordArmRan: false,
        };
      }

      if (budget) {
        budget.spent += 1;
        if (budget.spent > SEARCH_BUDGET) {
          return {
            passages: [],
            keywordArmRan: false,
            budgetSpent: true,
            note:
              `You have made ${budget.spent - 1} searches, which is the limit for one ` +
              `assessment. Searching again will not be answered. Write your assessment ` +
              `from what you already have — and if the documents do not settle the ` +
              `question, say so: "the documents do not cover it" is a correct finding ` +
              `and is very often the right one.`,
          };
        }
      }
      // Clamped HERE as well as declared in the schema. A Zod `.max()` is what
      // the model is told; this is what happens if a request arrives that did
      // not come through it — a second engine, a replayed fixture, a direct
      // call from a test. The declaration is the contract, this is the floor.
      // The bound programme applies unless the model asked for something else
      // or deliberately widened. An explicit `programme` argument wins, because
      // asking about a NAMED other programme is a narrower act than widening to
      // all of them.
      const scope = widen_beyond_programme
        ? undefined
        : programme?.trim() || boundProgramme || undefined;

      return searchDocuments(store, q, k && k > 0 ? Math.min(k, MAX_PASSAGES) : DEFAULT_PASSAGES, {
        docType: doc_type,
        programme: scope,
        repo: repo?.trim() || undefined,
      });
    },
  };
}
