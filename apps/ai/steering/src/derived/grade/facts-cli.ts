/** `pnpm steering:derived-grade-facts` — reads `vst_derived`, the corpus, and the answer key. Free. */
import { Client } from 'pg';
import { derivedUrl, urlFor } from '../../config/connections';
import { report } from '../../db/init/assertions';
import { read } from '../ingest/corpus';
import { gradeFacts } from './facts';

async function rows(url: string, sql: string): Promise<any[]> {
  const c = new Client({ connectionString: url });
  await c.connect();
  const { rows } = await c.query(sql);
  await c.end();
  return rows;
}

async function main(): Promise<void> {
  const [facts, rejected, effort] = await Promise.all([
    rows(derivedUrl(), 'select subject, file_id, field, value, evidence, evidence_line from extracted_facts'),
    rows(derivedUrl(), 'select file_id, field, value, reason from rejected_facts'),
    rows(urlFor('vst_pmo'),
      `select effort_id, change_class, element_kind, asil, reuse_class,
              interfaces_touched::text, safety_case_impact::text, tooling_required::text
       from effort_records`),
  ]);

  if (!facts.length) {
    console.log('\n  Nothing extracted yet. Run: pnpm steering:derived-extract --dry-run  then without it.\n');
    process.exit(1);
  }

  const key: Record<string, Record<string, string>> = {};
  for (const e of effort) {
    const { effort_id, ...rest } = e;
    key[effort_id] = rest as Record<string, string>;
  }

  const text = new Map(read('pmo/closure-reports').map((f) => [f.path, f.content]));
  const { r, table } = gradeFacts({ facts, rejected, text, key });
  const code = report('derived:grade-facts', r);
  if (table.length) {
    console.log('  every disagreement, in full:');
    for (const t of table) console.log(t);
    console.log('');
  }
  process.exit(code);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
