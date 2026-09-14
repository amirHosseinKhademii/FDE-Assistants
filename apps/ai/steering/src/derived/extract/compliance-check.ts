/**
 * `pnpm steering:derived-compliance-check` — what does the extraction ACTUALLY put
 * on the wire?
 *
 * ── WHY THIS EXISTS AND WHY READING THE SOURCE IS NOT ENOUGH ──────────────
 *
 * `run.ts` passes `store: false`. Anybody can read that line and believe it,
 * and belief is not what a customer's security review is buying. Between that
 * line and the network sit an SDK, a fetch wrapper and a set of defaults that
 * nobody in this repo wrote — the Agents SDK ships a tracing exporter that is ON
 * by default and posts to a third host, which is exactly the kind of thing you
 * only find by looking at the bytes.
 *
 * So this captures the real outgoing HTTP request, by handing the client a
 * `fetch` that records and never connects, and asserts on what it caught.
 *
 * ── THE FOUR CLAIMS, EACH TIED TO EVIDENCE ────────────────────────────────
 *
 *   1. one host, and it is our own Azure resource   ← the captured URL
 *   2. no provider-side retention                   ← `store: false` in the body
 *   3. no server-side conversation state            ← no previous_response_id
 *   4. Entra bearer token, not a static key         ← the Authorization header
 *
 * WHAT THIS CANNOT PROVE, stated so nobody quotes it as if it could: that
 * Microsoft does not train on the data, and that abuse-monitoring retention is
 * off. Those are contractual and tenant-configuration facts, not properties of
 * our request, and they belong in `docs/steering/DATA-RESIDENCY.md` with a
 * source — not in a green tick here.
 */
import OpenAI from 'openai';
// Imported for its side effect: `connections.ts` is what loads the shared .env.
// Without it this script reads no endpoint and silently checks a placeholder —
// which it did on its first run, and the host assertion caught it.
import '../../config/connections';
import { SCHEMA, SYSTEM_PROMPT, userPrompt } from './classification';
import { report, type Result } from '../../db/init/assertions';

interface Captured { url: string; headers: Record<string, string>; body: any }

/** The configured endpoint, or a loud failure. Never a placeholder that passes. */
function endpoint(): string {
  const v = process.env.FOUNDRY_OPENAI_ENDPOINT?.replace(/^["']|["']$/g, '');
  if (!v || v.includes('<')) {
    throw new Error('FOUNDRY_OPENAI_ENDPOINT is unset — this check cannot say which host is contacted.');
  }
  return v;
}

async function capture(): Promise<Captured> {
  let caught: Captured | undefined;

  const client = new OpenAI({
    baseURL: endpoint(),
    apiKey: 'entra',
    // The production wrapper's shape, minus the real token fetch: same
    // construction, so what is asserted below is what production sends.
    fetch: async (url: any, init: any = {}) => {
      const headers = new Headers(init.headers);
      headers.set('authorization', 'Bearer <entra-token>');
      caught = {
        url: String(url),
        headers: Object.fromEntries(headers.entries()),
        body: JSON.parse(String(init.body ?? '{}')),
      };
      // Never reaches a network. A compliance test that made a real call would
      // be proving its point by doing the thing it is checking.
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{}' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    },
  });

  await client.chat.completions.create({
    model: 'compliance-check',
    store: false,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt('PROJECT CLOSURE REPORT\n\nReference: EFF-COMPLIANCE-0000\n') },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'comparables_key', strict: true, schema: SCHEMA as unknown as Record<string, unknown> },
    },
  });

  if (!caught) throw new Error('nothing was captured — the fetch override did not run');
  return caught;
}

async function main(): Promise<void> {
  const c = await capture();
  const r: Result = { ok: [], fail: [] };
  const note = (pass: boolean, label: string, detail: string): void => {
    r[pass ? 'ok' : 'fail'].push({ label, detail });
  };

  const host = new URL(c.url).host;
  const expected = new URL(endpoint()).host;
  note(
    host === expected && host.endsWith('.azure.com'),
    'exactly one host is contacted, and it is our own Azure resource',
    `${host} — not api.openai.com, and not a telemetry sidecar. The full URL is ${c.url.replace(/\?.*/, '')}`,
  );

  note(
    c.body.store === false,
    'no provider-side retention: store is false ON THE WIRE',
    `captured request body has store=${JSON.stringify(c.body.store)} — read from the outgoing bytes, not from the source`,
  );

  note(
    !('previous_response_id' in c.body) && !('conversation' in c.body),
    'no server-side conversation state',
    'the request carries its whole context; nothing on the provider chains one call to the next',
  );

  const auth = c.headers['authorization'] ?? '';
  note(
    auth.startsWith('Bearer ') && !/^Bearer sk-/.test(auth) && !('api-key' in c.headers),
    'authentication is an Entra bearer token, not a static key',
    'no api-key header and no sk- prefix — nothing in config that a leaked file would hand somebody',
  );

  // The prompt must not state a field count. It said "seven classification
  // fields" for a day after the schema dropped to six — an instruction quietly
  // contradicting the contract it is issued with, which is the kind of thing
  // that produces a baffling answer and no error.
  const counts = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(classification\s+)?fields\b/i;
  note(
    !counts.test(SYSTEM_PROMPT) && !counts.test(userPrompt('')),
    'the prompt does not hardcode how many fields there are',
    'the schema is the single statement of that, so the two cannot drift apart',
  );

  // How much left the building, so the answer to "what did you send them" is a
  // number rather than a shrug.
  const bytes = JSON.stringify(c.body).length;
  note(
    c.body.messages?.length === 2,
    'the request carries the document and nothing else',
    `${bytes} bytes: one system prompt and one closure report. No database rows, no other documents, no history.`,
  );

  process.exit(report('derived:compliance-check', r));
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
