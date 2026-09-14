import { Client } from 'pg';
import { derivedUrl } from '../config/connections';
(async () => {
  const c = new Client({ connectionString: derivedUrl() });
  await c.connect();
  const { rows } = await c.query(`select metadata->>'documentId' d, substring(content from 1 for 620) snippet
      from document_chunks where metadata->>'documentId' in
      ('pmo/closure-reports/EFF-2021-0443.md','pmo/closure-reports/EFF-BULK-0067.md','pmo/closure-reports/EFF-BULK-0002.md')`);
  for (const r of rows) { console.log(`\n--- ${r.d} ---`); console.log(r.snippet); }
  await c.end();
})().catch((e: unknown) => { console.error(e); process.exit(1); });
