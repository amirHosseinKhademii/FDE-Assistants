import { Client } from 'pg';
import { derivedUrl } from '../config/connections';
(async () => {
  const c = new Client({ connectionString: derivedUrl() });
  await c.connect();

  // Can we even build one? (expected: no — column has no dimensions)
  for (const kind of ['hnsw (vector vector_cosine_ops)', 'ivfflat (vector vector_cosine_ops) with (lists=62)']) {
    try {
      await c.query(`create index concurrently if not exists probe_idx on document_chunks using ${kind}`);
      console.log(`BUILT: ${kind}`);
      await c.query('drop index if exists probe_idx');
    } catch (e: any) {
      console.log(`REFUSED ${kind.split(' ')[0]}: ${e.message}`);
    }
  }

  // Storage of the vector column
  const { rows: st } = await c.query(`select attstorage from pg_attribute a join pg_class c on c.oid=a.attrelid where c.relname='document_chunks' and attname='vector'`);
  console.log('\nvector attstorage:', JSON.stringify(st));
  const { rows: dim } = await c.query(`select vector_dims(vector) d, count(*)::int n from document_chunks group by 1`);
  console.log('dims present:', JSON.stringify(dim));

  // Latency of the exact scan, using an existing row's vector as the probe (free).
  const { rows: [{ vector: probe }] } = await c.query('select vector::text as vector from document_chunks limit 1');
  const sql = `select id from document_chunks order by vector <=> $1 limit 120`;
  const times: number[] = [];
  for (let i = 0; i < 12; i++) { const t = Date.now(); await c.query(sql, [probe]); times.push(Date.now() - t); }
  times.sort((a,b)=>a-b);
  console.log(`\nexact scan k=120, 12 runs (ms): min ${times[0]}  p50 ${times[6]}  max ${times[11]}  all=${times.join(',')}`);

  // Round-trip floor: how much of that is just Neon being in Frankfurt?
  const pings: number[] = [];
  for (let i = 0; i < 12; i++) { const t = Date.now(); await c.query('select 1'); pings.push(Date.now() - t); }
  pings.sort((a,b)=>a-b);
  console.log(`network floor (select 1), 12 runs (ms): min ${pings[0]}  p50 ${pings[6]}  max ${pings[11]}`);

  const { rows: ex } = await c.query(`explain (analyze, buffers, format text) ${sql.replace('$1', `'${probe}'`)}`);
  console.log('\n' + ex.map((r: any) => r['QUERY PLAN']).join('\n'));
  await c.end();
})().catch((e: unknown) => { console.error(e); process.exit(1); });
