/**
 * THE SPIKE THAT DECIDES EVERYTHING.
 *
 * Not "is the model good". The question is whether the two guarantees this repo
 * is built on survive a local server:
 *
 *   1. STRICT structured output — response_format json_schema with strict:true,
 *      honoured as THIS SHAPE, not as "some JSON". The repo's own note:
 *      without it the AI SDK sends {type:'json_object'} and Pillar 3 is
 *      silently downgraded to best-effort JSON.
 *   2. TOOL CALLING with the arguments the model chose.
 *
 * If 1 fails, the answer contract is gone and the eval suite measures something
 * else. That changes the whole plan, which is why this runs before any model
 * is chosen.
 *
 * ── IT HAS A NEGATIVE CONTROL, BECAUSE IT HAS TO ──────────────────────────
 *
 * Section 2 asks for an integer bounded to exactly 5 on a question that has
 * nothing to do with numbers. If that comes back as anything else, the schema
 * is ADVISORY on this server rather than enforced — and every `ok` in section 1
 * means only that the model happened to comply. This repo's rule: a check that
 * has only ever passed is indistinguishable from one that cannot fail.
 *
 * ── THE DEFAULT MODEL MATCHES `.env.example` ON PURPOSE ───────────────────
 *
 * If they drift, the check passes against one model while the app runs another
 * — a constraint satisfied in one file and enforced in a second, which is the
 * failure `docs/beyond-retrieval/CONTEXT.md` §4 is about.
 *
 *   pnpm local:check
 *   LOCAL_MODEL=qwen3:8b pnpm local:check
 */
// READS `.env`, AND THAT IS NOT BOILERPLATE. This started as a standalone spike
// driven by inline variables, so it read `process.env` and nothing else. The
// moment `LLM_PROVIDER=hosted` moved into `.env` — where the APP reads it — the
// check silently kept testing the OLD endpoint and failed with ECONNREFUSED
// against an Ollama that had been deleted. A check that disagrees with the file
// the app is configured from is the two-media drift in
// docs/beyond-retrieval/CONTEXT.md §4, and it wastes the run it was meant to save.
import 'dotenv/config';

// ── WHICH ENDPOINT ────────────────────────────────────────────────────────
//
// TWO PROVIDERS, ONE CHECK, because the question is a property of the SERVER
// and not of who owns it: does this endpoint honour a strict schema, and does
// it still call tools while doing so?
//
//   pnpm compat:check                          → local Ollama (the default)
//   LLM_PROVIDER=hosted pnpm compat:check      → whatever HOSTED_BASE_URL is
//
// The key is a placeholder for `local` because nothing authenticates it, and a
// real credential for `hosted` because something does. That difference is the
// entire distinction between the two `LLM_PROVIDER` values.
const HOSTED = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase() === 'hosted';
const BASE = HOSTED
  ? (process.env.HOSTED_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai')
  : (process.env.LOCAL_OPENAI_BASE_URL ?? 'http://127.0.0.1:11434/v1');
const MODEL = HOSTED
  ? process.env.HOSTED_MODEL
  : (process.env.LOCAL_MODEL ?? 'qwen2.5:7b');
const KEY = HOSTED ? process.env.HOSTED_API_KEY : 'local';

if (HOSTED && (!MODEL || !KEY)) {
  console.error(
    'LLM_PROVIDER=hosted needs HOSTED_MODEL and HOSTED_API_KEY.\n' +
      'This endpoint is a THIRD PARTY: it carries a credential and your prompts leave\n' +
      'this machine. Get a key from https://aistudio.google.com/apikey for Gemini.',
  );
  process.exit(2);
}
console.log(`\nendpoint: ${BASE}\nmodel   : ${MODEL}\n` +
  (HOSTED ? 'NOTE: a THIRD PARTY. Prompts leave this machine, and free tiers commonly train on them.\n' : ''));

const ok = (s) => `\x1b[32m  ok  \x1b[0m ${s}`;
const no = (s) => `\x1b[31m FAIL \x1b[0m ${s}`;
let failed = 0;
const assert = (name, pass, detail = '') => {
  console.log(pass ? ok(name) : no(name));
  if (detail) console.log(`        ${detail}`);
  if (!pass) failed++;
};

/**
 * A TRANSIENT 503 IS NOT A MISSING CAPABILITY, and reporting them the same way
 * is how a check lies.
 *
 * MEASURED 2026-09-16: the first run against Gemini's free tier returned
 * `503 "This model is currently experiencing high demand"` for sections 2-4,
 * and the output read `FAIL server accepted tools` — which says Gemini cannot
 * call tools. It can. The endpoint was busy. Acting on that reading would have
 * sent us back to local inference over a queue that cleared in a minute.
 *
 * So retries are part of the INSTRUMENT, not a convenience: 429 and 5xx are the
 * shapes of "ask again", and anything else is an answer. `retriesUsed` is
 * reported at the end, because a check that passed only on the fourth attempt
 * is telling you something real about a free tier even when it is green.
 */
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504]);
let retriesUsed = 0;

async function post(path, body, attempts = 4) {
  let last;
  for (let i = 0; i < attempts; i++) {
    let r;
    try {
      r = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      // A refused connection is not transient in any useful sense — the server
      // is not there — so it is returned rather than retried three more times.
      return { status: 0, json: null, text: `fetch failed: ${String(e?.cause?.code ?? e?.message ?? e)}`, transient: false };
    }
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    last = { status: r.status, json, text, transient: TRANSIENT.has(r.status) };
    if (!last.transient) return last;
    if (i < attempts - 1) {
      retriesUsed++;
      // 2s, 4s, 8s. Long enough for a free-tier spike, short enough that a
      // genuinely dead endpoint still fails this run rather than the next one.
      await new Promise((res) => setTimeout(res, 2000 * 2 ** i));
    }
  }
  return last;
}

// ── 1 · a shape close to CoverageAnswerSchema: nested, required, additionalProperties:false
const COVERAGE_SHAPE = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    policy_form: { type: 'string' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { source: { type: 'string' }, claim: { type: 'string' } },
        required: ['source', 'claim'],
        additionalProperties: false,
      },
    },
    escalate: { type: ['object', 'null'], properties: { reason: { type: 'string' } },
                required: ['reason'], additionalProperties: false },
  },
  required: ['answer', 'policy_form', 'citations', 'escalate'],
  additionalProperties: false,
};

console.log(`\n  base  ${BASE}\n  model ${MODEL}\n`);
console.log('── 1 · STRICT structured output ───────────────────────────────');

const strict = await post('/chat/completions', {
  model: MODEL,
  messages: [
    { role: 'system', content: 'You answer insurance coverage questions from policy documents.' },
    { role: 'user', content: 'Form PP 03 24 06 24 pays $50/day for rental reimbursement, max 30 days. '
                           + 'How much per day? Cite the form.' },
  ],
  response_format: { type: 'json_schema',
                     json_schema: { name: 'coverage_answer', strict: true, schema: COVERAGE_SHAPE } },
  stream: false,
});

assert('server accepted response_format: json_schema (strict)', strict.status === 200,
  strict.status !== 200 ? `HTTP ${strict.status}: ${strict.text.slice(0, 220)}` : '');

let parsed = null;
if (strict.status === 200) {
  const content = strict.json?.choices?.[0]?.message?.content ?? '';
  try { parsed = JSON.parse(content); } catch {}
  assert('response body is parseable JSON', parsed !== null,
    parsed === null ? `got: ${String(content).slice(0, 200)}` : '');
}
if (parsed) {
  const keys = Object.keys(parsed).sort();
  const want = ['answer', 'citations', 'escalate', 'policy_form'];
  assert('EXACTLY the required keys, no extras', JSON.stringify(keys) === JSON.stringify(want),
    `got: ${JSON.stringify(keys)}`);
  assert('citations is an array of {source, claim}',
    Array.isArray(parsed.citations) &&
    parsed.citations.every((c) => typeof c?.source === 'string' && typeof c?.claim === 'string'),
    `got: ${JSON.stringify(parsed.citations)?.slice(0, 180)}`);
  assert('nullable field honoured (escalate is object or null)',
    parsed.escalate === null || typeof parsed.escalate === 'object',
    `got: ${JSON.stringify(parsed.escalate)}`);
  console.log(`\n        answer: ${String(parsed.answer).slice(0, 120)}`);
}

// ── 2 · the NEGATIVE CONTROL. A check that has only ever passed cannot fail.
console.log('\n── 2 · negative control: does it REJECT an impossible shape? ───');
const bogus = await post('/chat/completions', {
  model: MODEL,
  messages: [{ role: 'user', content: 'Say hello.' }],
  response_format: { type: 'json_schema',
    json_schema: { name: 'bogus', strict: true,
      schema: { type: 'object',
                properties: { n: { type: 'integer', minimum: 5, maximum: 5 } },
                required: ['n'], additionalProperties: false } } },
  stream: false,
});
if (bogus.status === 200) {
  let b = null; try { b = JSON.parse(bogus.json?.choices?.[0]?.message?.content ?? ''); } catch {}
  assert('constrained field respected (n === 5)', b?.n === 5,
    `got: ${JSON.stringify(b)} — if this is not 5, the constraint is advisory, not enforced`);
} else {
  assert('negative control ran', false, `HTTP ${bogus.status}`);
}

// ── 3 · tool calling
console.log('\n── 3 · tool calling ───────────────────────────────────────────');
const tools = await post('/chat/completions', {
  model: MODEL,
  messages: [{ role: 'user', content: 'What is the rental limit on policyholder AUT-4471? Look them up.' }],
  tools: [{ type: 'function', function: {
    name: 'get_policyholder',
    description: 'Exact lookup of one policyholder record by id. Never searched.',
    parameters: { type: 'object', properties: {
      policy_id: { type: 'string', description: 'e.g. AUT-4471' } },
      required: ['policy_id'], additionalProperties: false } } }],
  stream: false,
});
const call = tools.json?.choices?.[0]?.message?.tool_calls?.[0];
assert('server accepted tools', tools.status === 200,
  tools.status !== 200 ? `HTTP ${tools.status}: ${tools.text.slice(0, 200)}` : '');
assert('model emitted a tool_call', !!call, call ? '' : `message: ${JSON.stringify(tools.json?.choices?.[0]?.message)?.slice(0,200)}`);
if (call) {
  assert('correct tool name', call.function?.name === 'get_policyholder', `got: ${call.function?.name}`);
  let args = null; try { args = JSON.parse(call.function?.arguments ?? '{}'); } catch {}
  assert('argument extracted from the question', args?.policy_id === 'AUT-4471',
    `got: ${JSON.stringify(args)}`);
}


// ── 4 · THE ONE THAT ACTUALLY BIT US ──────────────────────────
//
// Sections 1-3 test a strict schema and tool calling SEPARATELY. The loop sends
// them TOGETHER, and on 2026-09-16 that combination silently disarmed the tools
// on Ollama: llama.cpp constrains generation token by token to the response
// schema, a tool call is not a string that schema can produce, so the model
// never emitted one. Nothing errored. The answer was schema-valid and cited a
// form that does not exist.
//
// That is a property of the SERVER, so it must be re-measured per server —
// which is why this is a section here and not a sentence in a doc. A pass means
// the endpoint needs no workaround; a fail means it needs the second pass that
// `mastra/loop.ts`'s `structuringPass()` applies to `local` only.
console.log('\n── 4 · tools AND a strict schema, in the SAME request ─────────');

const both = await post('/chat/completions', {
  model: MODEL,
  messages: [
    { role: 'system', content: 'You answer ONLY from search_policy results. Never answer from memory. Always call search_policy first.' },
    { role: 'user', content: 'how much rental car reimbursement does AUT-4471 get per day?' },
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'search_policy',
      description: 'Search the policy corpus. You MUST call this before answering.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'answer',
      strict: true,
      schema: {
        type: 'object',
        properties: { answer: { type: 'string' }, citations: { type: 'array', items: { type: 'string' } } },
        required: ['answer', 'citations'],
        additionalProperties: false,
      },
    },
  },
  stream: false,
});

assert('server accepted tools AND response_format together', both.status === 200,
  both.status !== 200 ? `HTTP ${both.status}: ${both.text.slice(0, 220)}` : '');

if (both.status === 200) {
  const m = both.json?.choices?.[0]?.message ?? {};
  const calls = m.tool_calls ?? [];
  assert(
    'TOOLS SURVIVE A STRICT SCHEMA — the model can still ask for a tool',
    calls.length > 0,
    calls.length > 0
      ? `called ${calls.map((t) => t.function?.name).join(', ')}`
      : 'NO TOOL CALL — this endpoint suppresses tools under a grammar. The loop ' +
        'will answer from nothing and cite documents it never read. Use LOOP=mastra ' +
        '(structuringPass covers `local`) or LOOP=langgraph, which structures in a ' +
        `separate call and is unaffected. content: ${String(m.content ?? '').slice(0, 90)}`,
  );
}

if (retriesUsed > 0) {
  console.log(
    `\n  note: ${retriesUsed} retry/retries were needed (429/5xx). On a free tier that is ` +
      'capacity, not capability \u2014 but it is also what your eval run will hit.',
  );
}
console.log(`\n${failed === 0 ? '\x1b[32mALL CHECKS PASSED\x1b[0m' : `\x1b[31m${failed} CHECK(S) FAILED\x1b[0m`}\n`);
if (failed > 0) {
  console.log(
    '  A red here is a hypothesis, not a verdict \u2014 see CLAUDE.md. If the detail above\n' +
      '  says 429/503, the endpoint was BUSY and this says nothing about what it supports.\n' +
      '  Re-run before concluding anything.\n',
  );
}
process.exit(failed === 0 ? 0 : 1);
