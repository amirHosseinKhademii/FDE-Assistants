/**
 * BABY STEP 2b, verification — did the loader read what I actually wrote?
 *
 * WHY THIS IS A SEPARATE CHECK FROM 2a. The classify probe tested
 * `PHARMA_DOCUMENTS` against banners SYNTHESISED IN MEMORY from `mrd_reg` rows.
 * It never touched the markdown. `pharma:chunks` exercises the loader and the
 * chunker but reports only counts. So between them, nothing yet confirms that
 * the hand-typed banner strings parse: that `Expires:` on Rev 6 became an end
 * date, that `Supersedes:` became a relation, that `revisionId` is not null.
 *
 * Every one of those is a key spelled by hand in a markdown file, and a
 * misspelled key does not fail — it silently yields `null`, and the first
 * symptom is an as-of filter that matches nothing after the embeddings have
 * been paid for.
 *
 * Offline. Reads two files, writes nothing, connects to nothing.
 */
import { fileDocumentSource } from '@fde/grounding';
import { resolve } from 'node:path';
import { PACKAGE_ROOT } from '../config/connections';
import { PHARMA_DOCUMENTS } from '../config/pharma-documents';

const CORPUS_DIR = process.env.PHARMA_CORPUS_DIR
  ?? resolve(PACKAGE_ROOT, '..', '..', 'docs', 'pharma', 'corpus');

async function main(): Promise<void> {
  const docs = await fileDocumentSource(CORPUS_DIR, PHARMA_DOCUMENTS).list();
  docs.sort((a, b) => a.documentId.localeCompare(b.documentId));

  console.log('\nBaby step 2b — the banners, as the loader actually parsed them\n');

  for (const d of docs) {
    const f = d.facets as Record<string, unknown>;
    console.log(`  ${d.documentId}`);
    console.log(`    docType / status   ${d.docType} / ${d.status}`);
    console.log(`    revisionId         ${f.revisionId}`);
    console.log(`    sopId / revision   ${f.sopId} / ${f.revisionNo}`);
    console.log(`    effectiveOn        ${d.effectiveOn}   expiresOn ${d.expiresOn ?? 'null (in force)'}`);
    console.log(`    facet range        ${f.effectiveFrom} → ${f.effectiveTo ?? 'null (in force)'}`);
    console.log(`    implements         ${(f.standardRefs as string[]).join(', ')}`);
    console.log(`    relations          ${d.relations.map((r) => `${r.verb} ${r.toId}`).join('; ') || '—'}`);
    console.log(`    owner / category   ${f.owningDepartment} / ${f.category}`);
    console.log(`    jurisdiction       ${f.jurisdiction ?? 'null (a procedure has none)'}`);
    console.log('');
  }

  const rev6 = docs.find((d) => (d.facets as any).revisionNo === 6);
  const rev7 = docs.find((d) => (d.facets as any).revisionNo === 7);
  const f6 = rev6?.facets as any, f7 = rev7?.facets as any;

  const checks: [boolean, string, string][] = [
    [docs.length === 2, 'the corpus is exactly the corpus',
      `${docs.length} document(s) — the fabrication warning lives outside this folder because the loader reads every .md in it`],
    [!!rev6 && !!rev7, 'both revisions loaded', `${docs.map((d) => d.documentId).join(', ')}`],
    [f6?.revisionId === 'SOP-QC-014 Rev 6' && f7?.revisionId === 'SOP-QC-014 Rev 7',
      'each document carries its catalogue key',
      `revisionId parsed from the banner, so a chunk can be matched back to mrd_reg without guessing at a filename`],
    [rev6?.documentId !== rev7?.documentId && f6?.sopId === f7?.sopId,
      'two documents, one parent procedure',
      `distinct ids, both sopId=${f6?.sopId}`],
    [f6?.effectiveTo === '2026-02-28' && f7?.effectiveTo === null,
      'the as-of range survived the banner',
      `Rev 6 ${f6?.effectiveFrom}→${f6?.effectiveTo}, Rev 7 ${f7?.effectiveFrom}→in force`],
    [rev6?.expiresOn === '2026-02-28',
      'CONTROL — expiresOn is a column and NOT chunk metadata',
      `parsed as ${rev6?.expiresOn}, which is why effectiveTo is duplicated into facets — facets reach the chunks, this column does not`],
    [rev7?.relations.some((r) => r.verb === 'supersedes' && r.toId === 'SOP-QC-014 Rev 6') === true,
      'Rev 7 supersedes Rev 6, as data',
      rev7?.relations.map((r) => `${r.verb} → ${r.toId}`).join('; ') ?? 'none'],
    [(f7?.standardRefs as string[])?.includes('ANNEX16-1.7')
      && !(f6?.standardRefs as string[])?.includes('ANNEX16-1.7'),
      'the training clause appears in Rev 7 and NOT in Rev 6',
      'ANNEX16-1.7 (ongoing knowledge) is cited only by the revision that introduced the precondition'],
    [rev6?.status === 'superseded' && !PHARMA_DOCUMENTS.retiredStatuses.includes(rev6.status),
      'CONTROL — Rev 6 is superseded and still searchable',
      `status=${rev6?.status}, retiredStatuses=${PHARMA_DOCUMENTS.retiredStatuses.join(', ')}`],
    [f6?.jurisdiction === null && f7?.jurisdiction === null,
      'a procedure has no jurisdiction',
      'both null — the banners said EU until this check disagreed with the domain’s own comment'],
  ];

  let failed = 0;
  for (const [pass, label, detail] of checks) {
    if (!pass) failed++;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}    ${label}\n          ${detail}`);
  }
  console.log(`\n2b: ${failed === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed} ok, ${failed} failing\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
