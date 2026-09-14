/**
 * `pnpm steering:retrieval-check` — can the corpus be SEARCHED, rather than
 * merely stored?
 *
 * ── THE ACCEPTANCE TEST FOR THE WHOLE INDEX ──────────────────────────────
 *
 * One question decides it. `walk-cost` step 3 reads the safety level of the
 * damping software out of a file it opens by a path written into its source.
 * That file is ONE of 702, and its passage is one of 2,827. If asking the
 * question in English does not surface it, the index is decoration and the
 * hardcoded path cannot be removed.
 *
 * The other cases are there to stop that one being a fluke: a question whose
 * answer lives in a different kind of document, an exact identifier that only
 * keyword matching can catch, and a question about something the corpus does
 * not contain — which must NOT return a confident-looking top hit.
 *
 * COSTS ONE EMBEDDING CALL PER CASE. Five cases, fractions of a cent, and it is
 * deliberately not wired into any build: a check that spends money on every run
 * is a check somebody disables.
 */
import { openStore } from '@fde/grounding';
import { derivedUrl } from '../../config/connections';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../../grounding/chunks';
import { searchDocuments } from './documents';
import { report, type Result } from '../../db/init/assertions';

interface Case {
  name: string;
  question: string;
  /** What a correct answer looks like, checked against the top few hits. */
  expect: (paths: string[], texts: string[]) => boolean;
  why: string;
}

const CASES: Case[] = [
  {
    name: 'the hardcoded document is findable by asking in English',
    question: 'what ASIL is the damping software developed to?',
    expect: (paths) => paths.slice(0, 3).some((p) => /safety-assessment/i.test(p)),
    why: 'this is the sentence walk-cost currently opens by a path typed into its source',
  },
  {
    name: 'a requirement is found from its wording, not its id',
    question: 'how much rack force must the steering assembly deliver?',
    expect: (_p, texts) => texts.slice(0, 5).some((t) => /8000|rack force/i.test(t)),
    why: 'the question shares almost no words with the requirement that answers it',
  },
  {
    name: 'an exact identifier matches exactly',
    question: 'SR-EPS-0421',
    expect: (_p, texts) => texts.slice(0, 3).some((t) => t.includes('SR-EPS-0421')),
    why: 'vectors treat SR-EPS-0421 and SR-EPS-0407 as near-identical; only the keyword arm separates them',
  },
  {
    name: 'a static-analysis deviation is reachable',
    question: 'why was a MISRA rule deviated for the damping module?',
    expect: (paths) => paths.slice(0, 5).some((p) => /misra/i.test(p)),
    why: 'deviation D-07 is the only explanation of the three-way ASIL disagreement in 1,069 files',
  },
  {
    name: 'a question the corpus cannot answer returns weak hits, not a confident one',
    question: 'what is our policy on parental leave?',
    expect: (paths) => !paths.slice(0, 1).some((p) => /safety-assessment|CRS-/i.test(p)),
    why: 'there is no HR content here. Search has no cutoff by design, so the caller must be able to see that every hit is poor.',
  },
];

async function main(): Promise<void> {
  const store = await openStore(openEmbeddings(), {
    connectionString: derivedUrl(),
    tableName: CHUNK_TABLE,
  });
  const r: Result = { ok: [], fail: [] };

  try {
    for (const c of CASES) {
      const { passages, keywordArmRan } = await searchDocuments(store, c.question, 5);
      const paths = passages.map((p) => p.sourcePath);
      const texts = passages.map((p) => p.text);
      const pass = c.expect(paths, texts);

      r[pass ? 'ok' : 'fail'].push({
        label: c.name,
        detail: `"${c.question}" → ${paths[0] ?? 'nothing'}` +
          (paths[1] ? `, then ${paths[1]}` : '') +
          `${keywordArmRan ? '' : '  [keyword arm did not run]'}\n          ${c.why}`,
      });
    }
  } finally {
    await store.end();
  }

  process.exit(report('retrieval:check', r));
}

/**
 * Guarded, so that importing this file does not run it. These self-tests sit
 * inside the directories the answer path is scanned in, and an unguarded one is
 * importable by the very code it checks.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
