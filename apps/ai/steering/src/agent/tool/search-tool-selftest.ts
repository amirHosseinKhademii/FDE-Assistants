/**
 * `pnpm steering:search-tool-check` — does the search TOOL behave, as opposed
 * to the search itself?
 *
 * ── COSTS ONE EMBEDDING CALL. ONE. ───────────────────────────────────────
 *
 * `steering:retrieval-check` already spends five proving that retrieval finds
 * the right documents. Repeating that here would double the bill to re-measure
 * the same thing, so this asks only what the TOOL adds on top: the argument
 * handling, the empty-question path, the schema, and whether provenance
 * survives the trip through it.
 *
 * Four of the five assertions below are free — they never reach the model. Only
 * the last one embeds a question, and it is the one that cannot be faked,
 * because "the passage carries its file and headings" is a claim about a real
 * result.
 *
 * Kept out of every build for the same reason the retrieval check is: a check
 * that spends money on every run is a check somebody disables, and a disabled
 * check is worse than an absent one because its name still appears in a list.
 */
import { openStore } from '@fde/grounding';
import { derivedUrl } from '../../config/connections';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { CHUNK_TABLE } from '../../grounding/chunks';
import { searchDocumentsTool, SEARCH_DOCUMENTS } from './search-documents.tool';
import { report, type Result } from '../../db/init/assertions';

const QUESTION = 'what ASIL is the damping software developed to?';

async function main(): Promise<void> {
  const store = await openStore(openEmbeddings(), {
    connectionString: derivedUrl(),
    tableName: CHUNK_TABLE,
  });
  const tool = searchDocumentsTool(store);
  const r: Result = { ok: [], fail: [] };
  const note = (pass: boolean, label: string, detail: string): void => {
    r[pass ? 'ok' : 'fail'].push({ label, detail });
  };

  try {
    // ── free · the tool is named and described ────────────────────────────
    note(
      tool.schema.name === SEARCH_DOCUMENTS && tool.schema.description.length > 400,
      'the tool declares itself fully',
      `${tool.schema.name}, ${tool.schema.description.length} characters of description`,
    );

    // ── free · the description TELLS THE MODEL there is no cutoff ─────────
    //
    // The single most important sentence in it. Without it a model treats a
    // returned passage as a relevant one and cites the closest thing that came
    // back — which on a question this corpus cannot answer is a confident
    // citation of an unrelated closure report.
    const d = tool.schema.description.toLowerCase();
    note(
      d.includes('no relevance threshold') && d.includes('reading comprehension'),
      'the description states there is no relevance threshold',
      'so the model is told that judging whether a passage answers the question is its job',
    );

    // ── free · every parameter is described ───────────────────────────────
    const shape = (tool.schema.parameters as any).shape ?? {};
    const undescribed = Object.entries(shape)
      .filter(([, v]) => !(v as any)?.description && !(v as any)?._def?.description)
      .map(([k]) => k);
    note(
      Object.keys(shape).length > 0 && undescribed.length === 0,
      'every tool parameter carries a description',
      undescribed.length ? `missing on: ${undescribed.join(', ')}`
        : `${Object.keys(shape).length} parameters, all described`,
    );

    // ── free · an empty question short-circuits, spending nothing ─────────
    //
    // It returns before touching the store, so a model that calls the tool with
    // an empty string costs a round trip and not an embedding.
    let threw = false;
    let empty: any;
    try {
      empty = await tool.execute({ question: '   ' });
    } catch {
      threw = true;
    }
    note(
      !threw && Array.isArray(empty?.passages) && empty.passages.length === 0,
      'an empty question returns an empty result rather than throwing or embedding',
      threw ? 'IT THREW — a model error recorded as broken plumbing' : 'no passages, no model call',
    );

    // ── PAID · one real question, and provenance survives the tool ────────
    const out = await tool.execute({ question: QUESTION, k: 5 });
    const withSource = out.passages.filter((p) => p.sourcePath && p.docType && p.foundBy);
    note(
      out.passages.length > 0 && withSource.length === out.passages.length,
      'every returned passage carries its file, its type and how it was found',
      out.passages.length
        ? `${out.passages.length} passages, top: ${out.passages[0].sourcePath} ` +
          `(${out.passages[0].docType}, found by ${out.passages[0].foundBy})` +
          `${out.keywordArmRan ? '' : '  [keyword arm did not run]'}`
        : 'nothing came back — the index may not be built',
    );
  } finally {
    // The pool behind the index outlives every query through it.
    await store.end();
  }

  process.exit(report('search-tool:check', r));
}

if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
