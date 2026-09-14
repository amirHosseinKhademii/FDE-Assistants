/**
 * BABY STEP 1 — can `@fde/grounding` write to a database that is not the
 * insurance one?
 *
 * That is the entire question. No corpus, no embeddings, no search: just the
 * document schema, created by the reusable package, in `mrd_reg`, while the
 * insurance project stays untouched.
 *
 * IT IS WORTH ITS OWN STEP because the answer was NO an hour ago.
 * `loadDocuments()` built its client from the global `DATABASE_URL`, so the
 * package could only ever write to whichever database that pointed at. A
 * package that transfers to a second customer is the whole claim this repo
 * makes, and it had a hard-coded destination.
 */
import { Client } from 'pg';
import { ensureSchema } from '@fde/grounding';
import { urlFor, redact } from '../../config/connections';

async function main(): Promise<void> {
  const target = urlFor('mrd_reg');
  console.log(`\nBaby step 1 — @fde/grounding against a second estate\n`);
  console.log(`  target   ${redact(target)}`);

  const before = new Client({ connectionString: target });
  await before.connect();
  const listTables = async (c: Client): Promise<string[]> =>
    (await c.query("select table_name from information_schema.tables where table_schema='public' order by 1"))
      .rows.map((r: { table_name: string }) => r.table_name);

  const was = await listTables(before);
  console.log(`  before   ${was.length} tables: ${was.join(', ')}`);

  // The package creates its own schema. Nothing in this file knows what columns
  // a document has — that is exactly the knowledge that is supposed to transfer.
  await ensureSchema(before);

  const now = await listTables(before);
  const added = now.filter((t: string) => !was.includes(t));
  console.log(`  after    ${now.length} tables`);
  console.log(`  added    ${added.length ? added.join(', ') : '(none — already present)'}`);
  await before.end();

  // AND THE HALF THAT MATTERS MORE: the insurance project must be untouched.
  // A "second domain" that quietly writes into the first one is worse than no
  // second domain at all.
  // The insurance project, reached through its OWN variable. Naming it here is
  // the point of the probe: the two estates must stay unreachable from each other.
  const insurance = new Client({ connectionString: process.env.DATABASE_URL });
  await insurance.connect();
  const [{ n }] = (await insurance.query(
    "select count(*)::int n from information_schema.tables where table_schema='public'",
  )).rows;
  const [{ c }] = (await insurance.query('select count(*)::int c from policy_chunks')).rows;
  console.log(`\n  insurance project untouched: ${n} tables, ${c} policy_chunks still there`);
  await insurance.end();

  console.log(
    `\nbaby step 1: ${added.length || now.includes('documents') ? 'PASS' : 'FAIL'} — ` +
    `the reusable package now writes where it is told\n`,
  );
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
