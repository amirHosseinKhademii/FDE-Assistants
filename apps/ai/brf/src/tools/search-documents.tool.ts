/**
 * search_documents: the one tool the board assistant has.
 *
 * Four decisions in this file matter.
 *
 * 1. NO SCORE CUTOFF. The top passages come back even when the best one is weak.
 *    Similarity measures closeness of topic. It cannot say whether the answer is in
 *    the text at all. A cutoff would reject real questions and admit unanswerable ones.
 *
 * 2. THE FILE FILTER APPLIES BEFORE RANKING. Narrowing to one document after ranking
 *    would leave the top results already full of passages from the other documents.
 *
 * 3. HYBRID. Vector search and Swedish full-text search are fused by rank. Embeddings
 *    miss rare words such as a particular fee or a committee name, and keyword search
 *    finds them at once.
 *
 * 4. EVERY PASSAGE CARRIES ITS FILE AND SECTION. A passage without its document and
 *    section number is not a citation, so the model never receives one.
 */
import { readdirSync } from 'node:fs';
import { z } from 'zod';
import type { Document as LCDocument } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';
import type { Tool } from '@fde/agent';
import { hybridSearch } from '@fde/grounding';
import { DOMAIN } from '../config/domain';
import { sectionNumberOf } from '../config/brf-documents';

export const SEARCH_DOCUMENTS = 'search_documents';

interface Args {
  query: string;
  file: string | null;
  k: number | null;
}

export interface PassageResult {
  /** The file name, e.g. "stadgar.md". */
  file: string;
  /** The § label, e.g. "§ 9". The heading text when the passage has no § label. */
  section: string;
  /** The full heading trail the passage sits under. */
  heading: string;
  /** The passage text, without the heading trail. */
  text: string;
}

export interface SearchResult {
  results: PassageResult[];
  note: string;
}

/**
 * The file name a model wrote, in the form the index stores. "Stadgar", "stadgar"
 * and "stadgar.md" are all the same file.
 */
export function normaliseFileName(raw: string): string {
  const name = raw.trim().toLowerCase();
  return name.endsWith('.md') ? name : `${name}.md`;
}

export function toPassage(doc: LCDocument): PassageResult {
  const trail = String(doc.metadata.section ?? '');
  const n = sectionNumberOf(trail);
  return {
    file: String(doc.metadata.file ?? doc.metadata.documentId ?? ''),
    section: n ? `§ ${n}` : trail || 'dokumentet',
    heading: trail,
    text: String(doc.metadata.body ?? doc.pageContent),
  };
}

/** The document names in the corpus, read at call time, so a new file needs no code change. */
function corpusFiles(): string[] {
  return readdirSync(DOMAIN.corpusDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

const RANKED_NOTE =
  'Ranked by topical similarity only. A high rank does not mean the answer is in the passage. ' +
  'If these passages do not settle the question, say so and escalate rather than reasoning from a nearby section.';

export function searchDocumentsTool(store: PGVectorStore): Tool<Args, SearchResult> {
  return {
    hasUpstream: true,

    schema: {
      type: 'function',
      name: SEARCH_DOCUMENTS,
      description:
        "Search the cooperative's own documents: the bylaws (stadgar), the house rules (ordningsregler), " +
        'the board and annual meeting minutes (protokoll), the maintenance plan (underhållsplan) and the ' +
        'annual report summary (årsredovisning). Returns the most relevant passages, each with its file and ' +
        'section. Cite a passage by its file and section. Results are ranked by topical similarity only, so a ' +
        'high rank does not mean the answer is present. Search again with different wording if the first ' +
        'results do not settle the question. You may search more than once.',
      parameters: z.strictObject({
        query: z
          .string()
          .describe(
            'What to look for. Swedish keywords work well: the subject of a rule, or the topic of a decision.',
          ),
        file: z
          .string()
          .nullable()
          .describe(
            'Restrict the search to one document, e.g. "stadgar.md" or "protokoll-2025-09-03.md". ' +
              'Pass null to search every document.',
          ),
        k: z
          .number()
          .nullable()
          .describe('How many passages to return. Pass null for the default of 5.'),
      }),
    },

    async execute({ query, file, k }) {
      const want = k ?? 5;
      const names = corpusFiles();
      const wanted = file ? normaliseFileName(file) : null;
      const fileName = wanted ? names.find((n) => n.toLowerCase() === wanted) : undefined;

      // A name the corpus does not hold is answered without a search. The model gets the
      // real names, so it retries with one of them instead of concluding that the
      // documents are silent.
      if (wanted && !fileName) {
        return {
          results: [],
          note:
            `There is no document named ${wanted}. The documents are: ${names.join(', ')}. ` +
            'Retry with one of these names, or with file set to null.',
        };
      }

      // The file filter is an equality filter, and both halves of the hybrid search
      // apply it before ranking.
      const { hits, fullText } = await hybridSearch(
        store,
        query,
        want,
        fileName ? { file: fileName } : undefined,
        {
          tableName: DOMAIN.vectorTable,
          connectionString: DOMAIN.databaseUrl,
          textSearchConfig: DOMAIN.textSearchConfig,
        },
      );

      if (hits.length === 0) {
        return {
          results: [],
          note:
            (fileName ? `No passage in ${fileName} matched the query. ` : 'No passage matched the query. ') +
            `The documents are: ${names.join(', ')}. ` +
            'An empty result is not an answer. Retry once with file set to null, or with different wording, ' +
            'before concluding that the documents are silent, and escalate if that also finds nothing.',
        };
      }

      return {
        results: hits.map((h) => toPassage(h.doc)),
        note:
          RANKED_NOTE +
          (fullText ? '' : ' Keyword search was unavailable for this query, so these results are vector only.'),
      };
    },
  };
}
