/**
 * `pnpm steering:search "<question>"` — ask the corpus something.
 *
 * The smallest possible thing that proves the index is real: a question in,
 * passages out, each one openable at the file it came from.
 *
 * COSTS ONE EMBEDDING CALL per question — the question has to be turned into a
 * vector by the same model the passages were, or the two are not comparable.
 * Fractions of a cent, but not free, which is why it is a command you run rather
 * than something a check runs on every build.
 */
import { openStore } from '@fde/grounding';
import { derivedUrl } from '../config/connections';
import { openEmbeddings } from '../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../grounding/chunks';
import { searchDocuments, type SearchFilter } from '../tools/departments/documents';

/** `--type safety_assessment --programme PRG-KST-K2` */
function filterFromArgv(): SearchFilter {
  const get = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  return { docType: get('--type'), programme: get('--programme'), repo: get('--repo') };
}

function question(): string {
  const q = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  // Flag VALUES are positional too, so drop anything that followed a flag.
  const flagged = new Set<string>();
  process.argv.forEach((a, i) => { if (a.startsWith('--')) flagged.add(process.argv[i + 1]); });
  const text = q.filter((a) => !flagged.has(a)).join(' ').trim();
  if (!text) throw new Error('Ask something: pnpm steering:search "what safety level does damping ship at?"');
  return text;
}

async function main(): Promise<void> {
  const q = question();
  const filter = filterFromArgv();
  const store = await openStore(openEmbeddings(), {
    connectionString: derivedUrl(),
    tableName: CHUNK_TABLE,
  });

  try {
    const { passages, keywordArmRan } = await searchDocuments(store, q, 5, filter);

    console.log(`\n  ${q}\n`);
    if (!keywordArmRan) {
      console.log('  NOTE: the keyword half of search did not run — results are meaning-only.');
      console.log('        Re-run pnpm steering:index; the full-text column is built there.\n');
    }
    if (!passages.length) {
      console.log('  nothing found.\n');
      return;
    }

    for (const [i, p] of passages.entries()) {
      const where = [p.docType, p.programme, p.repo].filter(Boolean).join(' · ');
      console.log(`  ${i + 1}. ${p.sourcePath}`);
      console.log(`     ${where}   score ${p.score.toFixed(2)}   found by ${p.foundBy}`);
      // First few lines only. A passage is up to ~1,200 characters and the
      // point here is WHICH document answered, not to reprint the corpus.
      for (const line of p.text.split('\n').filter((l) => l.trim()).slice(0, 4)) {
        console.log(`     ${line.trim().slice(0, 96)}`);
      }
      console.log('');
    }
  } finally {
    // The pool behind the index outlives every query through it.
    await store.end();
  }
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
