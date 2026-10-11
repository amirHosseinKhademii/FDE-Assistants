/**
 *   pnpm --filter @bostad/ai brf:extract -- <pdf>
 *
 * Prints the figures as JSON, then any coherence errors, OCR timing and one
 * usage line. Exits 0 when a reply came back, even with errors: the errors are
 * the output. Exits 1 when the run itself failed.
 */
import { extractBrf } from '../brf/extract';

async function main(): Promise<void> {
  // pnpm may pass a literal "--" separator through to the script.
  const pdf = process.argv.slice(2).find((a) => a !== '--');
  if (!pdf) {
    console.error('usage: brf-extract.ts <pdf>');
    process.exit(1);
  }

  const r = await extractBrf(pdf);

  console.log(r.figures ? JSON.stringify(r.figures, null, 2) : '(no valid reply)');
  if (r.errors.length) {
    console.log(`\ncoherence errors (${r.errors.length}):`);
    for (const e of r.errors) console.log(`  - ${e}`);
  }
  if (r.ocrPages.length) {
    const total = r.ocrPages.reduce((a, p) => a + p.ms, 0);
    const per = (total / r.ocrPages.length / 1000).toFixed(1);
    console.log(`\nocr: ${r.ocrPages.length}/${r.pageCount} pages, ${per}s per page`);
  }
  const u = r.usage;
  console.log(
    `\npages=${r.pageCount} tokens=${u.inputTokens}in/${u.outputTokens}out model=${u.model} wall=${(u.ms / 1000).toFixed(1)}s`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
