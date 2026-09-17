/**
 * The two hosted round-trip repairs, asserted without a model call.
 *
 * Both were found by watching a real conversation fail, and both are the kind
 * of fix that silently stops working: repair 1 depends on a field name only one
 * provider sends, repair 2 on a message shape. A live check would cost a call
 * and a quota; a fake `fetch` proves the same thing deterministically.
 *
 * EVERY REPAIR IS ALSO CHECKED FOR NOT FIRING. A wrapper that rewrote every
 * request would pass a suite that only fed it broken ones — the same control
 * discipline as the answer contract's.
 */
import { hostedRoundTripFetch } from './hosted-round-trip';

type Captured = { body: any };

/** A fetch that records what it was given and replays a canned response. */
function fakeFetch(response: unknown, captured: Captured[]): typeof fetch {
  return (async (_input: any, init?: any) => {
    captured.push({ body: init?.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

const SIGNED_REPLY = {
  choices: [
    {
      message: {
        role: 'assistant',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_recall', arguments: '{}' },
            extra_content: { google: { thought_signature: 'SIG' } },
          },
        ],
      },
    },
  ],
};

const post = (body: unknown) => ['https://example.invalid/chat/completions', { method: 'POST', body: JSON.stringify(body) }] as const;

export async function runRoundTripCheck(): Promise<boolean> {
  const lines: string[] = [];
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    lines.push(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}\n        ${detail}`);
  };

  const before = process.env.LLM_PROVIDER;

  // ── REPAIR 1, and it must survive one round trip ─────────────────────────
  process.env.LLM_PROVIDER = 'hosted';
  {
    const seen: Captured[] = [];
    const f = hostedRoundTripFetch(fakeFetch(SIGNED_REPLY, seen));
    await f(...post({ messages: [{ role: 'user', content: 'hi' }] }));
    // Second turn: the assistant message comes back WITHOUT extra_content,
    // exactly as LangChain rebuilds it.
    await f(
      ...post({
        messages: [
          { role: 'user', content: 'hi' },
          { role: 'assistant', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_recall', arguments: '{}' } }] },
          { role: 'tool', tool_call_id: 'call_1', content: '{}' },
        ],
      }),
    );
    const resent = seen[1]?.body?.messages?.[1]?.tool_calls?.[0]?.extra_content;
    check(
      JSON.stringify(resent) === JSON.stringify({ google: { thought_signature: 'SIG' } }),
      'repair 1 · a signature the provider sent is carried into the next request',
      resent ? `re-attached to call_1: ${JSON.stringify(resent)}` : 'extra_content was NOT re-attached',
    );
  }

  // ── REPAIR 2 ─────────────────────────────────────────────────────────────
  {
    const seen: Captured[] = [];
    const f = hostedRoundTripFetch(fakeFetch({ choices: [] }, seen));
    await f(...post({ messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'done' }] }));
    const roles = (seen[0]?.body?.messages ?? []).map((m: any) => m.role);
    check(
      roles.at(-1) === 'user',
      'repair 2 · a request ending with a model turn gets a caller turn appended',
      `roles sent: ${roles.join(' > ')}`,
    );
  }

  // ── AND NEITHER FIRES WHEN IT SHOULD NOT ─────────────────────────────────
  {
    const seen: Captured[] = [];
    const f = hostedRoundTripFetch(fakeFetch({ choices: [] }, seen));
    const body = { messages: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'hi' }] };
    await f(...post(body));
    check(
      JSON.stringify(seen[0]?.body) === JSON.stringify(body),
      'control · a request already ending with a caller turn is sent unchanged',
      `roles sent: ${(seen[0]?.body?.messages ?? []).map((m: any) => m.role).join(' > ')}`,
    );
  }

  // THE ONE THAT MATTERS MOST: another provider must be untouched. A trailing
  // assistant message is legal everywhere else, so repair 2 is gated on the
  // provider and not on the shape.
  process.env.LLM_PROVIDER = 'azure';
  {
    const seen: Captured[] = [];
    const f = hostedRoundTripFetch(fakeFetch(SIGNED_REPLY, seen));
    const body = { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'done' }] };
    await f(...post(body));
    check(
      JSON.stringify(seen[0]?.body) === JSON.stringify(body),
      'control · on another provider the request passes through byte-for-byte',
      `roles sent: ${(seen[0]?.body?.messages ?? []).map((m: any) => m.role).join(' > ')}`,
    );
  }

  if (before === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = before;

  console.log('\nlanggraph · hosted round-trip repairs\n');
  for (const l of lines) console.log(l);
  console.log(failed === 0 ? '\n  round-trip: PASS\n' : `\n  round-trip: FAIL — ${failed}\n`);
  return failed === 0;
}
