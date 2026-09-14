/**
 * `pnpm steering:derived-extract [--limit N] [--dry-run]` — the first step here that
 * costs money and the first that can be wrong.
 *
 * ── THE SAMPLE IS CHOSEN FROM THE DOCUMENTS, NEVER FROM THE ANSWER KEY ────
 *
 * The obvious way to build a 10-document sample that exercises the hard cases
 * is to ask the estate which reports involved a safety case. That would be
 * leakage: the sample would be selected by the thing being measured, and the
 * score would flatter itself. Nothing in this directory may open those
 * databases, and `derived:boundary-check` holds it — including in comments, which
 * is how this paragraph came to be phrased without naming one.
 *
 * So selection uses only what is visible in the files. A FIXED QUOTA of reports
 * that mention ASIL is forced in, and the rest is taken in sorted order.
 *
 * The quota matters and the first version did not have one: sorting the
 * ASIL-bearing reports to the front put all ten of them in the sample, which is
 * 9% of the corpus standing in for the whole of it. A sample where every
 * document happens to answer the hardest field measures nothing about the 200
 * where that field must be refused. Three of ten, roughly twice their share,
 * exercises the hard case without becoming the only case.
 *
 * ── `--dry-run` SPENDS NOTHING ───────────────────────────────────────────
 *
 * It prints the sample, the prompt and the token estimate. Worth running first
 * every time; the run that costs money should never be the run that tells you
 * the file list was wrong.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { Client } from 'pg';
import { env, openaiClient } from '@fde/foundry';
import { logRequest, priceDetail } from '@fde/telemetry';
import '../../telemetry/prices';
import { derivedUrl, redact, PACKAGE_ROOT } from '../../config/connections';
import { read, type RawFile } from '../ingest/corpus';
import { FIELDS, SCHEMA, SYSTEM_PROMPT, userPrompt, findEvidence } from './classification';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
};
const LIMIT = arg('--limit', 10);
const DRY = process.argv.includes('--dry-run');
const FROM_CACHE = process.argv.includes('--from-cache');

/**
 * THE MODEL'S ANSWERS ARE WRITTEN TO DISK BEFORE ANYTHING ELSE HAPPENS.
 *
 * The first paid run of this script extracted all ten documents correctly and
 * then threw the lot away, because the database insert failed on the last step
 * and the transaction rolled back. The work was done, the money was spent, and
 * nothing survived it.
 *
 * So the responses land in a file the moment they arrive, and `--from-cache`
 * replays them into the database with no API calls at all. Anything expensive
 * and non-repeatable should be durable before the cheap, fallible step that
 * follows it.
 */
const CACHE_DIR = join(PACKAGE_ROOT, '.cache');
const CACHE = join(CACHE_DIR, 'derived-extract.json');

/**
 * Postgres `text` CANNOT HOLD A NUL BYTE, and a model can emit one.
 *
 * That is what killed the first run: `invalid byte sequence for encoding
 * "UTF8": 0x00`. Not a bug in the prompt or the schema — a reminder that model
 * output is untrusted input and has to be treated like any other, however
 * well-formed the JSON around it is.
 *
 * Stripped rather than rejected, and the row is flagged. A NUL is a transport
 * artefact, not a claim about the document, so throwing away an otherwise good
 * fact would lose information to punish a control character. But it is recorded,
 * because a model emitting NUL bytes is worth knowing about.
 */
const NUL = /\u0000/g;
const clean = (v: string | null): string | null => (v === null ? null : v.replace(NUL, ''));
const hadNul = (v: string | null): boolean => v !== null && NUL.test(v);

/** Sorted, with ASIL-bearing reports first. Nothing here knows the answer key. */
const ASIL_QUOTA = 3;

function sample(files: RawFile[]): RawFile[] {
  // ── ASKING FOR EVERYTHING MUST GIVE EVERYTHING ─────────────────────────
  //
  // `--limit 220` against 220 documents returned 203, and the seventeen it
  // dropped were the ASIL-bearing ones — the hardest cases in the corpus,
  // silently excluded from the run that was supposed to be exhaustive.
  //
  // The quota caused it. It exists to stop a SMALL sample being made entirely
  // of the 9% of reports that state an ASIL, and at that size it is right. It
  // has no business running when nothing is being sampled at all.
  if (LIMIT >= files.length) return [...files].sort((a, b) => a.path.localeCompare(b.path));

  const withAsil = files.filter((f) => /ASIL\s+[A-D]/.test(f.content));
  const without = files.filter((f) => !withAsil.includes(f));
  const quota = Math.min(ASIL_QUOTA, Math.ceil(LIMIT * 0.3), withAsil.length);
  const chosen = [...withAsil.slice(0, quota), ...without.slice(0, LIMIT - quota)];
  // Sorted so the printed list and the call order are stable between runs.
  return chosen.sort((a, b) => a.path.localeCompare(b.path));
}

/** `EFF-2021-0443` out of `pmo/closure-reports/EFF-2021-0443.md`. */
const subjectOf = (path: string): string => path.replace(/^.*\/(.+)\.md$/, '$1');

interface Row { file_id: string; subject: string; field: string; value: string | null; evidence: string | null; evidence_line: number | null; evidence_exact: boolean }
interface Bad { file_id: string; field: string; value: string | null; evidence: string | null; reason: string }

async function main(): Promise<void> {
  const all = read('pmo/closure-reports');
  const chosen = sample(all);
  const model = DRY ? '(dry-run)' : env.chatDeployment();

  console.log(`\nExtracting the comparables key from ${chosen.length} of ${all.length} closure reports\n`);
  // The full list is useful when choosing a sample and is noise when running
  // the lot — two hundred filenames scroll the thing you actually wanted to
  // read off the screen.
  if (chosen.length <= 20 || DRY) {
    for (const f of chosen) {
      console.log(`  ${/ASIL\s+[A-D]/.test(f.content) ? 'ASIL' : '    '}  ${f.path}  ${f.bytes} B`);
    }
  } else {
    const asil = chosen.filter((f) => /ASIL\s+[A-D]/.test(f.content)).length;
    console.log(`  ${chosen.length} documents, ${asil} of them naming an ASIL. ` +
      `First ${chosen[0].path}, last ${chosen[chosen.length - 1].path}.`);
  }

  const chars = chosen.reduce((a, f) => a + f.content.length + SYSTEM_PROMPT.length, 0);
  console.log(`\n  ~${Math.round(chars / 4).toLocaleString()} input tokens across ${chosen.length} calls, one call per document.`);

  if (DRY) {
    console.log(`\n── system prompt ──\n${SYSTEM_PROMPT}\n`);
    console.log(`── fields ──\n  ${FIELDS.join(', ')}\n`);
    console.log('dry-run: nothing was sent and nothing was written.\n');
    return;
  }

  // ── phase 1: get the answers, and get them onto disk ────────────────────
  type Raw = { path: string; json: string };
  type Cache = { corpus: string; responses: Raw[] };

  // WHAT THE CORPUS LOOKED LIKE WHEN THE ANSWERS WERE GIVEN.
  //
  // The closure reports changed on 2026-09-13 - a `Safety level:` line was
  // added to 131 of them - and a cache written before that describes documents
  // that no longer exist. Replaying it would write facts about text nobody can
  // open, and the evidence check would catch only the subset whose sentences
  // happened to move. Silent, plausible, and wrong.
  //
  // So the cache records the corpus it belongs to and refuses to be replayed
  // against a different one. A saved result has to know what it was a result
  // OF, or it is just a fast way to be out of date.
  const corpusSha = createHash('sha256')
    .update(all.map((f) => f.path + ':' + f.sha256).join('\n')).digest('hex').slice(0, 16);

  let raws: Raw[];
  if (FROM_CACHE) {
    if (!existsSync(CACHE)) throw new Error(`No cached run at ${CACHE}. Run without --from-cache.`);
    const c = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache;
    if (c.corpus !== corpusSha) {
      throw new Error(
        `The cached run is for a DIFFERENT corpus (${c.corpus}, the files are now ${corpusSha}).\n` +
        `  Those answers describe documents that have since changed. Re-run without --from-cache.`,
      );
    }
    raws = c.responses;
    console.log(`\n  cache   replaying ${raws.length} responses from ${CACHE} - no API calls\n`);
  } else {
    // RESUME. A run that hits a rate limit at document 36 must not make you pay
    // for those 36 again — see `ask`.
    const done: Raw[] = existsSync(CACHE)
      ? (() => {
          const c = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache;
          return c.corpus === corpusSha ? c.responses : [];
        })()
      : [];
    raws = await ask(chosen, model, corpusSha, done);
  }

  // ── phase 2: verify the evidence and build rows ─────────────────────────
  const rows: Row[] = [];
  const rejected: Bad[] = [];
  let nulSeen = 0;
  let inexact = 0;

  for (const { path, json } of raws) {
    const f = chosen.find((c) => c.path === path) ?? all.find((c) => c.path === path)!;
    const parsed = JSON.parse(json) as Record<string, { value: string | null; evidence: string | null }>;

    let kept = 0;
    let refused = 0;
    for (const field of FIELDS) {
      const got = parsed[field];
      if (!got) continue;
      if (hadNul(got.value) || hadNul(got.evidence)) nulSeen++;
      const value = clean(got.value);
      const evidence = clean(got.evidence);

      if (value === null) {
        // A refusal is a result and is stored as one. It also must not smuggle
        // an explanation in through the evidence column.
        rows.push({ file_id: f.path, subject: subjectOf(f.path), field, value: null, evidence: null, evidence_line: null, evidence_exact: true });
        refused++;
        continue;
      }
      if (!evidence) {
        rejected.push({ file_id: f.path, field, value, evidence: null, reason: 'a value with no sentence behind it' });
        continue;
      }
      const hit = findEvidence(f.content, evidence);
      if (hit === null) {
        rejected.push({ file_id: f.path, field, value, evidence, reason: 'the quoted sentence is not in the file' });
        continue;
      }
      if (!hit.exact) inexact++;
      rows.push({ file_id: f.path, subject: subjectOf(f.path), field, value, evidence, evidence_line: hit.line, evidence_exact: hit.exact });
      kept++;
    }
    console.log(`  read    ${subjectOf(f.path).padEnd(16)} ${kept} answered · ${refused} refused · ${FIELDS.length - kept - refused} rejected`);
  }
  if (nulSeen) console.log(`\n  note    ${nulSeen} value(s) arrived with a NUL byte in them; stripped before storing.`);
  if (inexact) console.log(`  note    ${inexact} quote(s) matched only after normalising punctuation — the model mangled a character, the sentence is real.`);

  await store(rows, rejected, model);
  console.log(`\nderived:extract: done. Next: pnpm steering:derived-grade-facts\n`);
}

/** One call per document, written to the cache as they arrive. */
// Six at a time got `429 ... exceeded rate limit` at document 36 on the
// swedencentral deployment. Three, with backoff, is the setting that finishes.
const BATCH = 3;

/** Wait, but only for as long as the server said to. */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * One call, retried on 429 and on 5xx.
 *
 * ── WHY BACKOFF AND NOT JUST A SMALLER BATCH ─────────────────────────────
 *
 * A smaller batch lowers the chance of a rate limit and cannot remove it: the
 * quota is shared with everything else on the deployment, so the right
 * concurrency today is the wrong one when somebody else is working. Backoff
 * handles the case a batch size cannot.
 *
 * `Retry-After` is honoured when the server sends it, because guessing longer
 * wastes time and guessing shorter is how a retry storm starts.
 */
async function withRetry<T>(what: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt >= 5) throw e;
      const after = Number(e?.headers?.['retry-after'] ?? e?.response?.headers?.get?.('retry-after'));
      const waitMs = Number.isFinite(after) && after > 0 ? after * 1000 : 2000 * 2 ** attempt;
      console.log(`  wait    ${status} on ${what} — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/5)`);
      await sleep(waitMs);
    }
  }
}

async function ask(
  chosen: RawFile[], model: string, corpusSha: string,
  done: { path: string; json: string }[] = [],
): Promise<{ path: string; json: string }[]> {
  const client = openaiClient();

  // ── ALREADY-PAID-FOR ANSWERS ARE KEPT, NOT RE-REQUESTED ────────────────
  //
  // The first 220-document run died on a rate limit at document 36. Those 36
  // answers were correct, cached, and — before this — about to be bought a
  // second time. A long job that cannot resume is a job that gets more
  // expensive every time anything goes wrong, and something always does.
  /**
   * What this run actually spent, accumulated as it goes.
   *
   * `cached` starts `undefined` and only becomes a number if the provider
   * reports one — so "the deployment does not tell us" prints differently from
   * "nothing was cached". Those are different facts and one of them is a
   * finding.
   */
  const spend = { calls: 0, input: 0, output: 0, cached: undefined as number | undefined };

  const out = [...done];
  const have = new Set(out.map((r) => r.path));
  const todo = chosen.filter((f) => !have.has(f.path));
  if (out.length) console.log(`  resume  ${out.length} answer(s) already cached, ${todo.length} to fetch\n`);

  const one = async (f: RawFile): Promise<void> => {
    const startedAt = Date.now();
    const res = await withRetry(subjectOf(f.path), () => client.chat.completions.create({
      model,
      // ── NO `temperature`, AND THE ABSENCE IS NOT AN OVERSIGHT ───────────
      //
      // This is a reading task with one right answer per field, so sampling
      // buys nothing, and `temperature: 0` was the obvious setting. The
      // deployment rejects it outright:
      //
      //     400 Unsupported value: 'temperature' does not support 0 with this
      //     model. Only the default (1) value is supported.
      //
      // `gpt-5-mini` is a reasoning model and does not take the parameter at
      // all. Nothing else in this repo sets it; this was the one place.
      //
      // WHAT THAT COSTS US, STATED RATHER THAN SHRUGGED OFF: the parsers are
      // byte-reproducible and this is not. Two runs over the same ten
      // documents can differ, so a change in the score is not by itself
      // evidence that anything changed. That is exactly why the evidence
      // check, the refusal concentration and the fabrication check matter more
      // here than the accuracy number — they are properties of the output that
      // hold regardless of which sample came back.
      store: false,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(f.content) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'comparables_key', strict: true, schema: SCHEMA as unknown as Record<string, unknown> },
      },
    }));

    // ── EVERY PAID CALL IS LOGGED, INCLUDING THE ONES THAT FAIL ───────────
    //
    // Steering spent roughly 530,000 embedding tokens and 220 chat calls before
    // anything measured a single one of them — including a run that died at
    // document 36 and one that re-indexed the corpus twice by accident. The
    // second was noticed only because a banner printed twice.
    //
    // `cachedInputTokens` is passed THROUGH, never defaulted to 0, because 0
    // claims a measurement and absence admits there was not one. Pharma's loop
    // reports 86.8% cached; this should report close to nothing, and the
    // difference is the point rather than a disappointment — that figure is a
    // property of a multi-turn LOOP re-sending its prompt, and this is one turn
    // per document. If it comes back high, the assumption was wrong and that is
    // worth knowing.
    const u = res.usage as
      | { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } }
      | undefined;
    logRequest({
      subject: subjectOf(f.path),
      question: 'extract the comparables key',
      model,
      engine: 'chat.completions',
      turns: 1,
      toolCalls: 0,
      inputTokens: u?.prompt_tokens ?? 0,
      cachedInputTokens: u?.prompt_tokens_details?.cached_tokens,
      outputTokens: u?.completion_tokens ?? 0,
      ms: Date.now() - startedAt,
      stoppedBecause: res.choices[0]?.finish_reason ?? 'unknown',
      schemaRetries: 0,
      surface: 'derived:extract',
    });

    spend.calls++;
    spend.input += u?.prompt_tokens ?? 0;
    spend.output += u?.completion_tokens ?? 0;
    const c = u?.prompt_tokens_details?.cached_tokens;
    if (c !== undefined) spend.cached = (spend.cached ?? 0) + c;

    const raw = res.choices[0]?.message?.content;
    if (!raw) { console.log(`  EMPTY   ${f.path}`); return; }
    out.push({ path: f.path, json: raw });

  };

  // BATCHED, NOT SERIAL, AND NOT UNBOUNDED.
  //
  // Serial was right at ten documents and wrong at two hundred: gpt-5-mini
  // reasons before answering, so each call is several seconds and 203 of them
  // took HALF AN HOUR of a motionless cursor. Unbounded fan-out is the other
  // mistake - it makes the rate limit something you discover in the middle of a
  // paid run. Six at a time is about five minutes and nowhere near any limit.
  //
  // The cache is still rewritten after every batch, so a failure at document
  // 150 keeps 144 answers. That property was worth more than the speed.
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    await Promise.all(batch.map(one));
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE, JSON.stringify({ corpus: corpusSha, responses: out }, null, 2));
    // Printed every batch, because silence looks exactly like a hang.
    console.log(`  call    ${String(out.length).padStart(3)}/${chosen.length}  ${subjectOf(batch[batch.length - 1].path)}`);
  }
  console.log(`\n  cached  ${out.length} responses to ${CACHE}`);
  console.log(`  ${spend.calls} paid call(s) · ${spend.input.toLocaleString()} in ` +
    `(${spend.cached === undefined ? 'cache not reported' : `${spend.cached.toLocaleString()} cached`}) · ` +
    `${spend.output.toLocaleString()} out\n`);
  return out;
}

async function store(rows: Row[], rejected: Bad[], model: string): Promise<void> {
  const db = new Client({ connectionString: derivedUrl() });
  await db.connect();
  await db.query('begin');
  try {
    await db.query('truncate extracted_facts, rejected_facts');
    for (const r of rows) {
      await db.query(
        `insert into extracted_facts (file_id, subject, field, value, evidence, evidence_line, evidence_exact, model)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.file_id, r.subject, r.field, r.value, r.evidence, r.evidence_line, r.evidence_exact, model],
      );
    }
    for (const b of rejected) {
      await db.query(
        'insert into rejected_facts (file_id, field, value, evidence, reason, model) values ($1,$2,$3,$4,$5,$6)',
        [b.file_id, b.field, b.value, b.evidence, b.reason, model],
      );
    }
    await db.query('commit');
  } catch (e: any) {
    await db.query('rollback');
    console.error(`\n  FAIL    ${e.message}`);
    console.error(`          The model's answers are safe in ${CACHE}.`);
    console.error(`          Fix the cause, then: pnpm steering:derived-extract --from-cache\n`);
    await db.end();
    process.exit(1);
  }
  await db.end();
  console.log(`\n  wrote   ${rows.length} facts, ${rejected.length} rejected, to ${redact(derivedUrl())}`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
