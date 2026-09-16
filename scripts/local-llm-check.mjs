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
const BASE = process.env.LOCAL_OPENAI_BASE_URL ?? 'http://127.0.0.1:11434/v1';
const MODEL = process.env.LOCAL_MODEL ?? 'qwen2.5:7b';

const ok = (s) => `\x1b[32m  ok  \x1b[0m ${s}`;
const no = (s) => `\x1b[31m FAIL \x1b[0m ${s}`;
let failed = 0;
const assert = (name, pass, detail = '') => {
  console.log(pass ? ok(name) : no(name));
  if (detail) console.log(`        ${detail}`);
  if (!pass) failed++;
};

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer local' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, json, text };
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

console.log(`\n${failed === 0 ? '\x1b[32mALL CHECKS PASSED\x1b[0m' : `\x1b[31m${failed} CHECK(S) FAILED\x1b[0m`}\n`);
process.exit(failed === 0 ? 0 : 1);
