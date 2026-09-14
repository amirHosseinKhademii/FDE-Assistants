/**
 * Ship `logs/requests.jsonl` into Postgres so you can run SQL over it.
 *
 * WHY NOT WRITE STRAIGHT TO THE DATABASE FROM THE REQUEST PATH. A log write
 * must never be able to fail a subject. A file append cannot fail in a way that
 * matters; a network insert can — a timeout, a pooler hiccup, a serverless
 * database waking from idle. So the request appends locally and this ships it
 * afterwards. In a real deployment the same split is what survives a container
 * with an ephemeral disk: append locally, ship durably, and if the shipping is
 * broken you still have the file.
 *
 * IDEMPOTENT. The primary key is the line's own timestamp plus its surface, so
 * running this twice inserts nothing the second time. Re-runnable beats
 * remembering what you already synced.
 *
 *   pnpm logs:sync            # append new lines to the request_log table
 *   pnpm logs:sync --stats    # sync, then print what the table now knows
 */
// Load .env FIRST. Without this, `connectionString()` finds no DATABASE_URL and
// silently falls back to the local container — which is exactly what happened on
// 2026-09-10: the sync reported "1 new row inserted" and the row went to
// localhost:5433 while Neon had no table at all. A fallback that cannot fail is
// a fallback that hides where your data went.

import { readFileSync, existsSync } from 'node:fs';
import { Client } from 'pg';

/**
 * Redact the password before printing. The ONLY form that may be logged.
 *
 * Host and database are deliberately kept: the whole reason to print a
 * connection string is so you can tell a local container from a hosted cluster
 * at a glance, and redacting all of it removes the only useful part.
 */
const redactedConnectionString = (raw: string): string =>
  raw.replace(/(:\/\/[^:@/\s]+:)[^@/\s]+@/, '$1***@');

const DDL = `
create table if not exists request_log (
  ts            timestamptz not null,
  surface       text        not null,
  subject         text,
  question      text        not null,
  model         text        not null,
  engine        text        not null,
  turns         int         not null,
  tool_calls    int         not null,
  input_tokens  int         not null,
  output_tokens int         not null,
  ms            int         not null,
  stopped       text        not null,
  cost_usd      numeric(12,6),
  cost_note     text,
  primary key (ts, surface)
);`;

/**
 * Ship the local JSONL log into Postgres.
 *
 * The file is the source of truth and is never deleted: a sync that truncated
 * its input would make a failed run lose the cost data it already paid for.
 */
export async function syncRequestLog(opts: {
  logPath: string;
  connectionString: string;
}): Promise<void> {
  const REQUEST_LOG = opts.logPath;
  const target = opts.connectionString;
  if (!existsSync(REQUEST_LOG)) {
    console.log(`\nnothing to sync: ${REQUEST_LOG} does not exist yet\n`);
    return;
  }

  const lines = readFileSync(REQUEST_LOG, 'utf8').trim().split('\n').filter(Boolean);
  console.log(`\n  target: ${redactedConnectionString(target)}`);
  const client = new Client({ connectionString: target });
  await client.connect();
  await client.query(DDL);

  let inserted = 0;
  for (const raw of lines) {
    const r = JSON.parse(raw);
    const res = await client.query(
      `insert into request_log
         (ts, surface, subject, question, model, engine, turns, tool_calls,
          input_tokens, output_tokens, ms, stopped, cost_usd, cost_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (ts, surface) do nothing`,
      [r.ts, r.surface, r.subject, r.question, r.model, r.engine, r.turns, r.toolCalls,
       r.inputTokens, r.outputTokens, r.ms, r.stoppedBecause, r.costUsd, r.costNote],
    );
    inserted += res.rowCount ?? 0;
  }

  console.log(`\n  ${lines.length} line(s) in the file, ${inserted} new row(s) inserted\n`);

  if (process.argv.includes('--stats')) {
    const q = await client.query(`
      select surface_kind, count(*) runs,
             sum(input_tokens) in_tok, sum(output_tokens) out_tok,
             round(sum(cost_usd)::numeric, 4) usd,
             round(avg(ms)/1000.0, 1) avg_s
      from (select split_part(surface, ':', 1) surface_kind, * from request_log) t
      group by 1 order by 1`);
    console.table(q.rows);

    const byClaim = await client.query(`
      select subject, count(*) questions, round(sum(cost_usd)::numeric, 4) usd
      from request_log where subject is not null
      group by 1 order by usd desc nulls last limit 10`);
    console.log('  cost per subject (top 10):');
    console.table(byClaim.rows);
  }

  await client.end();
}

