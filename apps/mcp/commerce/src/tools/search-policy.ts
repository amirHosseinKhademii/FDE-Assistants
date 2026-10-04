/**
 * `search_policy` — Step 9: hybrid search over Thornbury's WRITTEN policy.
 *
 * THE INDEX IS OURS, AND ON THIS SIDE OF THE LINE (PLAN.md §4.2). The five
 * databases are the customer's systems of record, reached only through the API;
 * the chunk index is something we built from `docs/commerce/corpus/` and can
 * rebuild, so it is read directly — through `thb_kb_reader`, a role that can
 * SELECT one table and nothing else (`commerce:kb-check` proves INSERT, CREATE
 * TABLE and CREATE TEMP are refused). `COMMERCE_KB_URL` is the ONLY database
 * credential this process holds, and it cannot change anything.
 *
 * NO SCORE CUTOFF. It returns the closest passages even when none of them is
 * about the question. Deciding "our policies do not address this" is reading
 * comprehension and belongs to the model — T4, a third-party seller's warranty,
 * which no document covers, is only a test if the search does not decide it.
 *
 * EVERY PASSAGE SAYS WHO SAW IT AND WHETHER IT STILL HOLDS. `audience`
 * (published to customers, or internal) and `status` (current, superseded,
 * retired — and retired means WRONG, not old) ride on each hit, and either can
 * be used as a filter the database applies. T2 is three sources that disagree,
 * one public and two not; a search that flattened that would pick a side.
 *
 * TWO TOOLS, NOT ONE: this reads the prose; `get_policy_rules` reads the
 * configuration. They disagree on purpose, and a single "policy" tool would
 * have to choose.
 *
 * THE EMBEDDING MODEL LOADS ON THE FIRST QUERY, in this process (the query
 * vector must come from the same model as the ingest). That first call is slow;
 * `commerce:mcp-round-trip` records how slow, because Step 12 will otherwise
 * mistake it for protocol overhead.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { fail, ok, type Cause, type Outcome } from '../api/outcome';

/**
 * `@thornbury/commerce/kb`, loaded LAZILY and by a NON-LITERAL specifier.
 *
 * It resolves to that package's BUILT `dist/`, which a fresh clone does not have,
 * and the embedding stack behind it is heavy. A top-level import made every
 * offline check (`commerce:mcp-check`, which "needs nothing") fail at import on
 * a clean tree — and a lazy `import('@thornbury/commerce/kb')` still failed,
 * because ts-node type-checks a literal specifier's target. A string variable
 * is not resolved at type-check time, so only a real search, with a real index
 * URL, needs the build. The shape below is the one function used; what comes
 * back is checked against `SearchResultSchema` by `register()` regardless.
 */
const KB_MODULE: string = '@thornbury/commerce/kb';
interface KbModule {
  searchPolicy(opts: { connectionString: string; query: string; k?: number; filter?: Record<string, string> }): Promise<SearchResult>;
}

export interface KbConfig {
  /** The READ-ONLY role's URL. Empty refuses every search rather than guessing a database. */
  readonly connectionString: string;
}

export function kbConfigFromEnv(): KbConfig {
  return { connectionString: process.env.COMMERCE_KB_URL ?? '' };
}

/** Six, as the retrieval eval measured recall@6 — the same k the numbers describe. */
export const K = 6;

export const HitSchema = z.object({
  citation: z.string(),
  revisionId: z.string(),
  docId: z.string().nullable(),
  section: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  subsections: z.array(z.string()),
  audience: z.enum(['published', 'internal']),
  status: z.string(),
  docType: z.string().nullable(),
  effectiveFrom: z.string().nullable(),
  effectiveTo: z.string().nullable(),
  carrier: z.string().nullable(),
  text: z.string(),
  score: z.number(),
});

export const SearchResultSchema = z.object({ hits: z.array(HitSchema), fullText: z.boolean() });
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const InputSchema = z.object({
  query: z.string().min(3).max(300).describe("What to look for in Thornbury's written policies, in plain words."),
  audience: z
    .enum(['published', 'internal'])
    .optional()
    .describe('Only documents customers were shown (published), or only staff documents (internal). Omit for both.'),
  status: z
    .enum(['current', 'superseded', 'retired'])
    .optional()
    .describe('Only documents with this status. Omit for all of them.'),
});

export const DESCRIPTION =
  "Searches Thornbury's written policy documents — the published returns policy, internal " +
  'procedures and bulletins, carrier contracts and the statutory reference — and returns the ' +
  `${K} closest passages, each with its citation, its audience (published to customers, or ` +
  'internal) and its status (current, superseded or retired). There is no relevance threshold: ' +
  'it returns the closest passages it has.';

/**
 * A search failure, labelled. SQLSTATE class 28 is a credential the index
 * refused; any other database or socket error is the index being unavailable;
 * anything else (the embedding model failing to load) is our own code.
 */
function labelled(e: unknown): Outcome<SearchResult> {
  const code = String((e as { code?: unknown })?.code ?? '');
  const message = e instanceof Error ? e.message : String(e);
  const cause: Cause = /^28/.test(code) ? 'unauthorized' : /^([0-9A-Z]{5}|E[A-Z]+)$/.test(code) ? 'upstream_unavailable' : 'threw';
  return fail(cause, `the policy index ${cause === 'threw' ? 'search failed' : 'did not answer'}: ${code ? `${code} ` : ''}${message}`);
}

function summarise(r: SearchResult): string {
  if (!r.hits.length) return 'No passages came back.';
  return [
    `${r.hits.length} closest passage(s):`,
    ...r.hits.map(
      (h) =>
        `  [${h.citation} · ${h.audience} · ${h.status}${h.docType ? ` · ${h.docType}` : ''}` +
        `${h.effectiveFrom ? ` · effective ${h.effectiveFrom}${h.effectiveTo ? ` to ${h.effectiveTo}` : ''}` : ''}]` +
        `${h.sectionTitle ? ` §${h.section} ${h.sectionTitle}` : ''}\n` +
        h.text.split('\n').map((line) => `    | ${line}`).join('\n'),
    ),
  ].join('\n');
}

export function buildSearchPolicy(kb: KbConfig): Tool<SearchResult> {
  return {
    name: 'search_policy',
    config: {
      title: 'Search the written policies',
      description: DESCRIPTION,
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    data: SearchResultSchema,
    run: async (args) => {
      const a = InputSchema.parse(args);
      if (!kb.connectionString) {
        return fail('unauthorized', 'COMMERCE_KB_URL is not set; refusing to search rather than guessing a database');
      }
      // The index stores `public`; the tool's word is `published` — the facet's
      // meaning, not the descriptor's spelling.
      const filter: Record<string, string> = {};
      if (a.audience) filter.audience = a.audience === 'published' ? 'public' : 'internal';
      if (a.status) filter.status = a.status;
      try {
        const { searchPolicy } = (await import(KB_MODULE)) as KbModule; // see KB_MODULE
        return ok(
          await searchPolicy({
            connectionString: kb.connectionString,
            query: a.query,
            k: K,
            filter: Object.keys(filter).length ? filter : undefined,
          }),
        );
      } catch (e) {
        return labelled(e);
      }
    },
    render: (outcome: Outcome<SearchResult>) =>
      outcome.ok ? summarise(outcome.data) : `The policy search failed: ${outcome.detail}`,
  };
}
