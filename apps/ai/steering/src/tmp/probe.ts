import { openStore, hybridSearch } from '@fde/grounding';
import { derivedUrl } from '../config/connections';
import { CHUNK_TABLE } from '../grounding/chunks';
import { openEmbeddings } from '../grounding/embeddings.factory';
import { labelOf } from '../eval/retrieval/retrieval';
const TARGET = 'pmo/closure-reports/EFF-2021-0443.md';
const Q = 'was any effort booked to a charge code that also covers unrelated work?';
(async () => {
  const store = await openStore(openEmbeddings(), { connectionString: derivedUrl(), tableName: CHUNK_TABLE });
  for (const k of [6, 50]) {
    const { hits } = await hybridSearch(store, Q, k, undefined, { tableName: CHUNK_TABLE, connectionString: derivedUrl() });
    const i = hits.findIndex((h) => labelOf({ documentId: h.doc.metadata?.documentId as string, section: h.doc.metadata?.section as string }) === TARGET);
    console.log(`\nk=${k} (depth ${k*4}): target at fused position ${i === -1 ? 'NOT IN LIST' : i + 1} of ${hits.length}`);
    if (i >= 0) {
      const h = hits[i]!;
      console.log(`  denseRank=${h.denseRank ?? '-'}  sparseRank=${h.sparseRank ?? '-'}  -> foundBy ${h.denseRank && h.sparseRank ? 'both' : h.denseRank ? 'meaning' : 'keywords'}`);
    }
    // what the top-3 were found by
    console.log('  top 3:');
    for (const h of hits.slice(0, 3)) {
      console.log(`    d=${h.denseRank ?? '-'} s=${h.sparseRank ?? '-'}  ${labelOf({ documentId: h.doc.metadata?.documentId as string, section: h.doc.metadata?.section as string })}`);
    }
  }
  await store.end();
})().catch((e: unknown) => { console.error(e); process.exit(1); });
