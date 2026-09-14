import { Client } from 'pg';
import { derivedUrl } from '../config/connections';
(async () => {
  const c = new Client({ connectionString: derivedUrl() });
  await c.connect();
  const q = async (label: string, sql: string) => {
    const { rows } = await c.query(sql);
    console.log(`\n== ${label} ==`);
    for (const r of rows) console.log(JSON.stringify(r));
  };
  await q('pgvector version', `select extversion from pg_extension where extname='vector'`);
  await q('server', `select version()`);
  await q('rows', `select count(*)::int n from document_chunks`);
  await q('column type + dims', `select a.attname, format_type(a.atttypid, a.atttypmod) as t
    from pg_attribute a join pg_class c on c.oid=a.attrelid
    where c.relname='document_chunks' and a.attnum>0 and not a.attisdropped`);
  await q('existing indexes', `select indexname, indexdef from pg_indexes where tablename='document_chunks'`);
  await q('table size', `select pg_size_pretty(pg_total_relation_size('document_chunks')) total,
     pg_size_pretty(pg_relation_size('document_chunks')) heap`);
  await c.end();
})().catch((e: unknown) => { console.error(e); process.exit(1); });
