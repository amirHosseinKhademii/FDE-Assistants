/**
 *   pnpm --filter @bostad/ai brf:eval
 *   BRF_SAMPLES_DIR=/path/to/samples pnpm --filter @bostad/ai brf:eval
 *
 * Runs extractBrf on the three BRF sample PDFs (the scanned copy of Sörgården
 * is a separate run with the same answer key), grades each reply against
 * brf-golden.json with brf-score.ts, prints one table, and writes a baseline to
 * evals-baselines/brf-<timestamp>.json.
 *
 * A rate-limit error is retried once after 30 seconds. Any other error is a
 * failed document, recorded in the baseline, and the run goes on. Exit code is
 * 0 when the run completes, 1 when a sample file is missing or the golden key
 * does not load.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { extractBrf, type BrfExtractResult } from '../brf/extract';
import { scoreFigures, countOk, GRADED_FIELDS, META_FIELDS, type FieldScore, type GoldenFile } from './brf-score';

const DEFAULT_SAMPLES = resolve(homedir(), 'Documents/Zahra/ahk/FDE/proptech-sweden/spike/brf/samples');
const RATE_LIMIT_WAIT_MS = 30_000;

interface Sample {
  id: string;
  golden: string;
  rel: string;
}

const SAMPLES: Sample[] = [
  { id: 'sorgarden-digital', golden: 'sorgarden-2023', rel: 'brf-sorgarden-2023.pdf' },
  { id: 'sorgarden-scanned', golden: 'sorgarden-2023', rel: 'scanned/brf-sorgarden-2023-scanned.pdf' },
  { id: 'chalmersgatan', golden: 'chalmersgatan-2023', rel: 'brf-chalmersgatan-2023.pdf' },
];

function isRateLimit(e: unknown): boolean {
  const m = String((e as Error)?.message ?? e);
  return /429|rate.?limit|quota|resource.?exhausted|too many requests/i.test(m);
}

async function extractOnce(pdf: string): Promise<BrfExtractResult> {
  try {
    return await extractBrf(pdf);
  } catch (e) {
    if (!isRateLimit(e)) throw e;
    console.log(`  rate limit, waiting ${RATE_LIMIT_WAIT_MS / 1000}s and retrying once`);
    await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
    return extractBrf(pdf);
  }
}

function shortValue(s: string | null, n = 22): string {
  if (s === null) return '-';
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

const LABEL: Record<FieldScore['verdict'], string> = { ok: 'OK', page: 'PAGE', value: 'WRONG', missing: 'MISS' };

function cell(s: FieldScore): string {
  const star = s.unsure ? '*' : '';
  const page = s.gotPage !== null ? ` p${s.gotPage}` : '';
  return `${LABEL[s.verdict]}${star} ${shortValue(s.got)}${page}`;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length);
}

async function main(): Promise<void> {
  const dir = process.env.BRF_SAMPLES_DIR ?? DEFAULT_SAMPLES;
  const goldenPath = resolve(__dirname, 'brf-golden.json');
  const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as GoldenFile;

  const jobs = SAMPLES.map((s) => ({ ...s, pdf: resolve(dir, s.rel) }));
  for (const j of jobs) {
    if (!existsSync(j.pdf)) {
      console.error(`missing sample: ${j.pdf} (set BRF_SAMPLES_DIR)`);
      process.exit(1);
    }
    if (!golden.documents[j.golden]) {
      console.error(`golden key has no document "${j.golden}"`);
      process.exit(1);
    }
  }

  const started = Date.now();
  console.log(`bostad-ai brf eval: ${jobs.length} runs, samples=${dir}\n`);

  const docs: {
    id: string;
    file: string;
    golden: string;
    error: string | null;
    pageCount: number;
    ocrPages: number;
    coherenceErrors: string[];
    usage: BrfExtractResult['usage'] | null;
    figures: BrfExtractResult['figures'];
    scores: FieldScore[];
    raw: string;
  }[] = [];

  for (const j of jobs) {
    console.log(`running ${j.id} ...`);
    const key = golden.documents[j.golden];
    try {
      const r = await extractOnce(j.pdf);
      docs.push({
        id: j.id,
        file: j.rel,
        golden: j.golden,
        error: null,
        pageCount: r.pageCount,
        ocrPages: r.ocrPages.length,
        coherenceErrors: r.errors,
        usage: r.usage,
        figures: r.figures,
        scores: scoreFigures(r.figures, key),
        raw: r.raw,
      });
    } catch (e) {
      const message = (e as Error)?.message ?? String(e);
      docs.push({
        id: j.id,
        file: j.rel,
        golden: j.golden,
        error: message,
        pageCount: 0,
        ocrPages: 0,
        coherenceErrors: [],
        usage: null,
        figures: null,
        scores: scoreFigures(null, key),
        raw: '',
      });
    }
  }

  // Table: one row per field, one column per run.
  const labelCol = 24;
  const colW = 34;
  const header = pad('field', labelCol) + docs.map((d) => pad(d.id, colW)).join('');
  console.log('\n' + header);
  for (const f of [...GRADED_FIELDS, ...META_FIELDS]) {
    const row = pad(f, labelCol) + docs.map((d) => pad(cell(d.scores.find((s) => s.field === f)!), colW)).join('');
    console.log(row);
  }

  console.log('');
  for (const d of docs) {
    const ok = countOk(d.scores);
    const errs = d.error ? `FAILED: ${d.error.slice(0, 160)}` : `${d.coherenceErrors.length} coherence error(s)`;
    console.log(`${pad(d.id, 20)} figures correct ${ok}/${GRADED_FIELDS.length}   ${errs}`);
  }
  console.log(`\nLegend: OK = value and page right, PAGE = value right on a page not in the key, WRONG = value wrong, MISS = no value, * = unsure in the key.`);

  const usages = docs.map((d) => d.usage).filter((u): u is NonNullable<typeof u> => u !== null);
  const inputTokens = usages.reduce((a, u) => a + u.inputTokens, 0);
  const outputTokens = usages.reduce((a, u) => a + u.outputTokens, 0);
  const ms = Date.now() - started;
  console.log(
    `\ntokens=${inputTokens}in/${outputTokens}out model=${usages[0]?.model ?? '-'} wall=${(ms / 1000).toFixed(1)}s`,
  );

  const baselinesDir = resolve(__dirname, '..', '..', 'evals-baselines');
  mkdirSync(baselinesDir, { recursive: true });
  const ts = new Date().toISOString();
  const file = resolve(baselinesDir, `brf-${ts.replace(/[:.]/g, '-')}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        ts,
        setup: { golden: 'src/evals/brf-golden.json', goldenVersion: golden.version, samples: dir },
        summary: {
          figuresCorrect: Object.fromEntries(docs.map((d) => [d.id, countOk(d.scores)])),
          figuresTotal: GRADED_FIELDS.length,
          inputTokens,
          outputTokens,
          ms,
        },
        docs: docs.map((d) => ({
          id: d.id,
          file: d.file,
          golden: d.golden,
          error: d.error,
          pageCount: d.pageCount,
          ocrPages: d.ocrPages,
          usage: d.usage,
          coherenceErrors: d.coherenceErrors,
          scores: d.scores,
          figures: d.figures,
          raw: d.raw,
        })),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`baseline: ${file}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
