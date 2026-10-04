/**
 * `searchPolicy` — the query side of the policy index. What `search_policy`
 * (MCP Step 9) calls.
 *
 * WHAT THIS MODULE MAY LOAD, AND WHY THAT IS A CHECKED PROPERTY. It is imported
 * by the MCP server, whose defining property is that it holds no credential that
 * can change anything (PLAN.md §4.1). So it takes the connection string as a
 * PARAMETER, reads no environment variable, and imports nothing that knows the
 * estate's admin URL — only `kb.ts` and `@fde/grounding`. `commerce:kb-check`
 * loads this file in a fresh process and fails if `config/connections` or any
 * `db/` module ends up in the module graph.
 *
 * NO SCORE CUTOFF, ON PURPOSE. It returns its best `k` passages even when every
 * one of them is irrelevant. Deciding "this isn't in our policies" is reading
 * comprehension and belongs to the model — T4 (a third-party seller, which no
 * document addresses) is only a test if the gap comes back as junk rather than
 * as silence (CORPUS.md §4).
 *
 * THE FULL-TEXT ARM CAN FAIL SILENTLY, so `fullText` is returned, not dropped.
 * `hybridSearch` catches a keyword-search error and carries on with the dense
 * arm alone; a reader missing SELECT on the generated `content_ts` column would
 * look exactly like a working search that is merely a bit worse.
 */
import { hybridSearch, openStore, type Scored } from '@fde/grounding';
import { KB_TABLE, kbEmbeddings } from './kb';

export interface PolicyHit {
  /**
   * `policy:<Revision Id>#<section>` — EXACTLY the shape the answer key's `cites:`
   * checks match (docs/commerce/evals/README.md): `policy:POL-RET-001 Rev 3#7`,
   * `policy:CON-CAR-NEXDROP-2025#2`. Section-less when the passage sits above the
   * first numbered heading.
   */
  citation: string;
  /** The corpus header's Revision Id — `POL-GDW-003 Rev 2`, `BUL-RET-2025-03`. */
  revisionId: string;
  /** The policy family — `POL-RET-001` for both Rev 2 and Rev 3. */
  docId: string | null;
  /** The numbered `##` section the passage sits in — `"4"` — or null. */
  section: string | null;
  sectionTitle: string | null;
  /**
   * Numbered sub-rules the passage CONTAINS — `**4.1**` markers — so a caller can
   * cite `…#4.1` rather than the whole of §4. The key's matching treats `#4` as
   * covering `#4.1`, and `#4.1` as covering only itself.
   */
  subsections: string[];
  /** `published` = a customer was shown it; `internal` = staff only. T2 turns on this. */
  audience: 'published' | 'internal';
  /** `current` | `superseded` | `retired` — and retired means WRONG, not old. */
  status: string;
  docType: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  carrier: string | null;
  text: string;
  /** Relative RRF score, 1 = the best hit in THIS result. Not a relevance probability. */
  score: number;
}

export interface PolicySearchResult {
  hits: PolicyHit[];
  /** False when the keyword arm failed and this is dense-only. See the header. */
  fullText: boolean;
}

export interface SearchPolicyOptions {
  /** A READ-ONLY URL for `thb_kb` — in the MCP process, `COMMERCE_KB_URL`. */
  connectionString: string;
  query: string;
  /** How many passages. Default 6. */
  k?: number;
  /**
   * A metadata containment filter, applied by the database to both arms —
   * e.g. `{ docId: 'POL-RET-001' }`, `{ status: 'current' }`. Note `audience`
   * is stored as the raw header value, `public` | `internal`.
   */
  filter?: Record<string, string | number | boolean>;
}

/** One embedder per process: the model loads once, not once per question. */
let embedder: ReturnType<typeof kbEmbeddings> | undefined;

const SECTION = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/;
const SUBSECTION = /^\*\*(\d+\.\d+)\b/gm;

function sectionOf(trail: string): { section: string | null; title: string | null } {
  const parts = trail.split(' > ').slice(1).reverse();
  for (const p of parts) {
    const m = SECTION.exec(p.trim());
    if (m) return { section: m[1]!, title: m[2]!.trim() };
  }
  return { section: null, title: null };
}

function toHit(s: Scored): PolicyHit {
  const m = s.doc.metadata as Record<string, any>;
  const revisionId = String(m.revisionId ?? m.docRef ?? m.documentId ?? '');
  const { section, title } = sectionOf(String(m.section ?? ''));
  const text = s.doc.pageContent;
  return {
    citation: `policy:${revisionId}${section ? `#${section}` : ''}`,
    revisionId,
    docId: m.docId ?? null,
    section,
    sectionTitle: title,
    subsections: [...new Set([...text.matchAll(SUBSECTION)].map((x) => x[1]!))],
    audience: m.audience === 'public' ? 'published' : 'internal',
    status: String(m.status ?? 'unknown'),
    docType: m.docType ?? null,
    effectiveFrom: m.effectiveFrom ?? null,
    effectiveTo: m.effectiveTo ?? null,
    carrier: m.carrier ?? null,
    text,
    score: s.score,
  };
}

export async function searchPolicy(opts: SearchPolicyOptions): Promise<PolicySearchResult> {
  embedder ??= kbEmbeddings();
  const store = await openStore(embedder, {
    connectionString: opts.connectionString,
    tableName: KB_TABLE,
    // The reader cannot run the DDL `initialize()` would, and must not need to.
    readOnly: true,
  });
  try {
    const { hits, fullText } = await hybridSearch(store, opts.query, opts.k ?? 6, opts.filter, {
      tableName: KB_TABLE,
      connectionString: opts.connectionString,
    });
    return { hits: hits.map(toHit), fullText };
  } finally {
    await store.end();
  }
}
