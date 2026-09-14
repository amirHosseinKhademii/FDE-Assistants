/**
 * Does the translation actually translate? Offline, instant, no credentials.
 *
 * WHY THIS EXISTS IN THIS SHAPE. An adapter between two protocols fails
 * quietly: it returns a well-formed object with the wrong thing in it, and the
 * caller cannot tell. So the cases below mostly assert what the translation
 * DROPS, MOVES or RENAMES — the places where a plausible answer is a wrong one
 * — and each is paired with the state that would make it fail. A check that has
 * only ever passed is indistinguishable from one that cannot fail.
 *
 * It runs with a fake Bedrock client through `chatCompletion`'s injection
 * point, so it costs nothing and needs no AWS account. That is the reason it
 * will actually get run.
 *
 *   pnpm bedrock:check
 */
import { chatCompletion, type ChatRequest } from './openai-shape';

let failed = 0;

function check(name: string, ok: boolean, detail: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`          ${detail}`);
}

/**
 * The negative control, and it is not decoration.
 *
 * Every assertion above routes through `check`. If `check` stopped counting —
 * one edited line, a swallowed exception — all of them would print `ok` and
 * this file would report PASS forever while testing nothing. That is precisely
 * the failure `scripts/leak-check.mjs` documents catching in itself, which is
 * why it plants a synthetic leak and requires the scan to find it.
 *
 * So: plant a false assertion, require the counter to move, then un-plant it.
 * The planted FAIL is silenced because it is not a real one.
 */
function control(): void {
  const before = failed;
  const log = console.log;
  console.log = () => {};
  check('planted', false, 'planted');
  console.log = log;
  const noticed = failed === before + 1;
  failed = before;
  check(
    'control: a false assertion IS caught',
    noticed,
    'a deliberately false assertion did not move the counter — every ok above this line is meaningless',
  );
}

/** Records what Bedrock was handed, and replies with whatever the case needs. */
function fake(reply: Partial<Record<string, unknown>> = {}) {
  const box: { sent?: any } = {};
  const client = {
    messages: {
      create: async (p: unknown) => {
        box.sent = p;
        return {
          content: [{ type: 'text', text: 'hello' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: null },
          ...reply,
        };
      },
    },
  };
  return { box, client: client as never };
}

const USER: ChatRequest = { messages: [{ role: 'user', content: 'q' }] };

async function main(): Promise<void> {
  console.log('\n  bedrock — OpenAI shape in, Anthropic shape out\n');

  // ── SYSTEM PROMPTS MOVE OUT OF THE MESSAGE LIST ────────────────────────
  {
    const f = fake();
    await chatCompletion(
      { messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'u' }] },
      { client: f.client },
    );
    check('system becomes a top-level field', f.box.sent.system === 'S', `got ${JSON.stringify(f.box.sent.system)}`);
    check(
      'and does NOT also stay in messages',
      f.box.sent.messages.every((m: any) => m.role !== 'system'),
      `messages still contain a system role: ${JSON.stringify(f.box.sent.messages)} — Anthropic has no such role, so it would be sent and ignored, silently losing the prompt`,
    );
  }
  {
    const f = fake();
    await chatCompletion(
      { messages: [{ role: 'system', content: 'A' }, { role: 'system', content: 'B' }, { role: 'user', content: 'u' }] },
      { client: f.client },
    );
    check('several system messages join, in order', f.box.sent.system === 'A\n\nB', `got ${JSON.stringify(f.box.sent.system)}`);
  }
  {
    const f = fake();
    await chatCompletion(USER, { client: f.client });
    check('no system message means no system field', !('system' in f.box.sent), 'an empty system string is not the same as none');
  }

  // ── max_tokens: OPTIONAL THERE, REQUIRED HERE ──────────────────────────
  {
    const f = fake();
    await chatCompletion(USER, { client: f.client });
    check('max_tokens is defaulted, not omitted', f.box.sent.max_tokens === 16_000, `got ${f.box.sent.max_tokens} — Anthropic rejects the request without it`);
  }
  {
    const f = fake();
    await chatCompletion({ ...USER, max_tokens: 99 }, { client: f.client });
    check('and a caller can still override it', f.box.sent.max_tokens === 99, `got ${f.box.sent.max_tokens}`);
  }

  // ── STRUCTURED OUTPUT IS RENAMED AND LOSES A FIELD ─────────────────────
  {
    const f = fake();
    await chatCompletion(
      { ...USER, response_format: { type: 'json_schema', json_schema: { name: 'n', strict: true, schema: { type: 'object' } } } },
      { client: f.client },
    );
    check(
      'response_format becomes output_config.format',
      f.box.sent.output_config?.format?.type === 'json_schema',
      `got ${JSON.stringify(f.box.sent.output_config)}`,
    );
    check('the schema itself survives', JSON.stringify(f.box.sent.output_config.format.schema) === '{"type":"object"}', 'the schema is the whole point');
    check(
      'and `name` is dropped, as documented',
      !('name' in f.box.sent.output_config.format),
      'if Anthropic ever accepts a name, this check should fail and the comment should change',
    );
  }
  {
    const f = fake();
    await chatCompletion(USER, { client: f.client });
    check('no response_format means no output_config', !('output_config' in f.box.sent), 'an empty format constrains the model to nothing and should not be sent');
  }

  // ── STOP REASONS ARE RENAMED, AND ONE HAS NO EQUIVALENT ────────────────
  const stops: Array<[string, string]> = [
    ['end_turn', 'stop'],
    ['stop_sequence', 'stop'],
    ['max_tokens', 'length'],
    ['model_context_window_exceeded', 'length'],
    ['tool_use', 'tool_calls'],
    ['refusal', 'content_filter'],
    ['pause_turn', 'pause_turn'],
  ];
  for (const [from, to] of stops) {
    const f = fake({ stop_reason: from });
    const r = await chatCompletion(USER, { client: f.client });
    check(`stop_reason ${from} -> ${to}`, r.choices[0].finish_reason === to, `got ${r.choices[0].finish_reason}`);
  }
  {
    const f = fake({ stop_reason: 'something_new' });
    const r = await chatCompletion(USER, { client: f.client });
    check(
      'an unknown stop reason says so rather than claiming stop',
      r.choices[0].finish_reason === 'unknown',
      `got ${r.choices[0].finish_reason} — a new reason mapped to "stop" reads as a clean finish and is not one`,
    );
  }

  // ── CONTENT BLOCKS BECOME ONE STRING ───────────────────────────────────
  {
    const f = fake({ content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] });
    const r = await chatCompletion(USER, { client: f.client });
    check('several text blocks concatenate', r.choices[0].message.content === 'ab', `got ${JSON.stringify(r.choices[0].message.content)}`);
  }
  {
    const f = fake({ content: [{ type: 'thinking', thinking: 'secret' }, { type: 'text', text: 'v' }] });
    const r = await chatCompletion(USER, { client: f.client });
    check(
      'non-text blocks are not stringified into the answer',
      r.choices[0].message.content === 'v',
      `got ${JSON.stringify(r.choices[0].message.content)} — a thinking block concatenated into the answer would be read as the answer`,
    );
  }

  // ── USAGE, AND THE DIFFERENCE BETWEEN ZERO AND ABSENT ──────────────────
  {
    const f = fake({ usage: { input_tokens: 11, output_tokens: 22, cache_read_input_tokens: null } });
    const r = await chatCompletion(USER, { client: f.client });
    check('input_tokens -> prompt_tokens', r.usage?.prompt_tokens === 11, `got ${r.usage?.prompt_tokens}`);
    check('output_tokens -> completion_tokens', r.usage?.completion_tokens === 22, `got ${r.usage?.completion_tokens}`);
    check(
      'a null cache reading is ABSENT, never 0',
      r.usage?.prompt_tokens_details === undefined,
      `got ${JSON.stringify(r.usage?.prompt_tokens_details)} — 0 claims a measurement, absence admits there was not one`,
    );
  }
  {
    const f = fake({ usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0 } });
    const r = await chatCompletion(USER, { client: f.client });
    check(
      'but a real 0 is KEPT, because it is a measurement',
      r.usage?.prompt_tokens_details?.cached_tokens === 0,
      `got ${JSON.stringify(r.usage?.prompt_tokens_details)} — dropping a measured zero is the same lie in the other direction`,
    );
  }
  {
    const f = fake({ usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 7 } });
    const r = await chatCompletion(USER, { client: f.client });
    check('a cache reading passes through', r.usage?.prompt_tokens_details?.cached_tokens === 7, `got ${JSON.stringify(r.usage?.prompt_tokens_details)}`);
  }

  // ── CONVERSATION ORDER SURVIVES ────────────────────────────────────────
  {
    const f = fake();
    await chatCompletion(
      {
        messages: [
          { role: 'system', content: 'S' },
          { role: 'user', content: 'u1' },
          { role: 'assistant', content: 'a1' },
          { role: 'user', content: 'u2' },
        ],
      },
      { client: f.client },
    );
    check(
      'user/assistant turns keep their order',
      JSON.stringify(f.box.sent.messages) ===
        JSON.stringify([
          { role: 'user', content: 'u1' },
          { role: 'assistant', content: 'a1' },
          { role: 'user', content: 'u2' },
        ]),
      `got ${JSON.stringify(f.box.sent.messages)} — pulling the system message out must not reorder what is left`,
    );
  }

  // ── DEGENERATE RESPONSES DO NOT THROW ──────────────────────────────────
  {
    const f = fake({ content: [] });
    const r = await chatCompletion(USER, { client: f.client });
    check(
      'an empty content array yields "" rather than throwing',
      r.choices[0].message.content === '',
      `got ${JSON.stringify(r.choices[0].message.content)} — a refusal can come back with no text, and a crash there loses the reason`,
    );
  }
  {
    const f = fake({ content: [{ type: 'thinking', thinking: 'x' }] });
    const r = await chatCompletion(USER, { client: f.client });
    check('a response with no text block is empty, not the thinking', r.choices[0].message.content === '', `got ${JSON.stringify(r.choices[0].message.content)}`);
  }

  // ── store: false IS A PROPERTY WE GET FOR FREE, NOT ONE WE SEND ────────
  {
    const f = fake();
    await chatCompletion({ ...USER, store: false }, { client: f.client });
    check(
      'store is accepted and NOT forwarded',
      !('store' in f.box.sent),
      'Anthropic has no such field; sending it risks a 400. The property holds because Bedrock keeps no conversation state, not because we asked.',
    );
  }

  control();

  console.log(
    failed === 0
      ? '\n  bedrock: PASS — every field that moves, moves; every field that drops, drops\n'
      : `\n  bedrock: FAIL — ${failed} problem(s)\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
