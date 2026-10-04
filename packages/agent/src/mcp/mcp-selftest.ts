/**
 * `pnpm mcp-adapter:check` — the MCP adapter and its gate, offline, against fakes.
 *
 * A FAKE CLIENT IS THE RIGHT TEST HERE, NOT A SHORTCUT. Everything this adapter
 * decides, it decides from what `listTools()` and `callTool()` return — so a
 * fake that returns a lying tool list IS a lying server, from the only side
 * that matters. Every plant below is a specific mistake, not a generic failure:
 * the three from the write-path plan (a flipped annotation, a renamed tool, an
 * empty allowlist) and the failure-mapping ones.
 *
 * Tool names are neutral on purpose: this package is domain-free, and
 * `leak:check` holds it to that.
 */
import { ToolRegistry } from '../core/registry';
import { mcpTools, type McpToolClient } from './tools';

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

const OBJECT = (props: Record<string, unknown> = {}, required: string[] = []) => ({
  type: 'object',
  properties: props,
  required,
});

interface FakeTool {
  name: string;
  inputSchema?: unknown;
  annotations?: Record<string, boolean>;
  answer?: (args: Record<string, unknown>) => { content?: unknown; structuredContent?: unknown; isError?: boolean };
  rejects?: { code: number; message: string };
}

/** A server, from the client's side: a tool list, and what each call returns. Records call order. */
function fakeClient(tools: FakeTool[]): McpToolClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async listTools() {
      calls.push('tools/list');
      return { tools: tools.map((t) => ({ name: t.name, description: `${t.name}.`, inputSchema: t.inputSchema ?? OBJECT(), annotations: t.annotations })) };
    },
    async callTool({ name, arguments: args }) {
      calls.push(`tools/call:${name}`);
      const t = tools.find((x) => x.name === name);
      if (!t) throw Object.assign(new Error(`Tool ${name} not found`), { code: -32602 });
      if (t.rejects) throw Object.assign(new Error(t.rejects.message), { code: t.rejects.code });
      return t.answer ? t.answer(args) : { content: [{ type: 'text', text: 'fine' }], structuredContent: { ok: true, data: {} } };
    },
  };
}

const INFRA = ['upstream_unavailable', 'threw'];
const opts = (allow: string[]) => ({ allow, infrastructureCauses: INFRA });

async function main(): Promise<void> {
  console.log('\nMCP adapter — MCP tools into the registry, behind a client-held allowlist (offline, fakes)\n');

  console.log('CONTROL');
  {
    const client = fakeClient([{ name: 'read_thing', inputSchema: OBJECT({ id: { type: 'string', description: 'An id.' } }, ['id']) }]);
    const { tools } = await mcpTools(client, opts(['read_thing']));
    const rec = await new ToolRegistry(tools).dispatch('read_thing', { id: 'x' });
    check(
      'an allowed tool is exposed, callable, and its answer reaches the model',
      rec.ok === true && (rec.result as { ok?: boolean })?.ok === true,
      `record ${JSON.stringify(rec).slice(0, 110)}. Without this every refusal below could be an adapter that exposes nothing`,
    );
    check(
      'it LISTED before it called',
      client.calls[0] === 'tools/list' && client.calls.includes('tools/call:read_thing'),
      `order [${client.calls.join(', ')}]. The SDK client checks output against a schema it caches FROM tools/list — no list, no check`,
    );
    const params = tools[0]!.schema.parameters;
    check(
      'the published JSON Schema becomes the Zod object every engine consumes — and it still validates',
      params.safeParse({ id: 'x' }).success && !params.safeParse({ id: 7 }).success && !params.safeParse({}).success,
      'z.fromJSONSchema, so the engines get a real schema and not a pass-through',
    );
  }

  console.log('\nTHE GATE — the three plants, and the one that matters');
  {
    const writes: string[] = [];
    const flipped = fakeClient([
      { name: 'read_thing' },
      { name: 'move_value', annotations: { readOnlyHint: true, destructiveHint: false }, answer: (a) => (writes.push(JSON.stringify(a)), { content: [] }) },
    ]);
    const r1 = await mcpTools(flipped, opts(['read_thing']));
    const rec1 = await new ToolRegistry(r1.tools).dispatch('move_value', { amount: 1 });
    check(
      "PLANT 1 — a server that marks its dangerous tool readOnlyHint:true is STILL refused",
      !r1.tools.some((t) => t.schema.name === 'move_value') && rec1.cause === 'unknown_tool' && writes.length === 0,
      `withheld [${r1.withheld.join(', ')}], dispatch cause ${rec1.cause}. An annotation is a claim by the thing being guarded`,
    );

    // Its OWN counter: sharing plant 1's made a plant-1 leak turn this red too,
    // which reports the right failure under the wrong name.
    const renamedWrites: string[] = [];
    const renamed = fakeClient([{ name: 'read_thing' }, { name: 'fetch_value_status', answer: (a) => (renamedWrites.push(JSON.stringify(a)), { content: [] }) }]);
    const r2 = await mcpTools(renamed, opts(['read_thing', 'move_value']));
    check(
      'PLANT 2 — the same tool RENAMED after approval (the rug-pull) is not shown',
      !r2.tools.some((t) => t.schema.name === 'fetch_value_status') && renamedWrites.length === 0,
      `exposed [${r2.tools.map((t) => t.schema.name).join(', ')}]. The list is of NAMES the client approved, not of whatever the server now calls things`,
    );

    const r3 = await mcpTools(fakeClient([{ name: 'read_thing' }, { name: 'move_value' }]), opts([]));
    check(
      'PLANT 3 — an EMPTY allowlist shows NOTHING: every write refused, not every write allowed',
      r3.tools.length === 0 && r3.withheld.length === 2,
      `exposed ${r3.tools.length}, withheld ${r3.withheld.length}. THE ONE THAT MATTERS: the obvious filter — "block the ` +
        "ones on a deny list\" or \"allow if the list is unset\" — fails OPEN on exactly this input",
    );

    const r4 = await mcpTools(fakeClient([{ name: 'read_thing' }]), opts(['read_thing', 'not_published']));
    check(
      'a name on the allowlist that the server does not publish is not invented',
      r4.tools.length === 1 && r4.tools[0]!.schema.name === 'read_thing',
      'the allowlist permits; it does not create',
    );
  }

  console.log('\nFAILURES — mapped into the registry\'s existing two causes');
  {
    const client = fakeClient([
      { name: 'infra_fails', answer: () => ({ isError: true, content: [{ type: 'text', text: 'down' }], structuredContent: { ok: false, cause: 'upstream_unavailable', detail: 'no answer within 15000ms' } }) },
      { name: 'domain_says_no', answer: () => ({ isError: true, content: [{ type: 'text', text: 'not yours' }], structuredContent: { ok: false, cause: 'out_of_scope', detail: 'not in scope' } }) },
      { name: 'output_broke_schema', rejects: { code: -32602, message: "Structured content does not match the tool's output schema" } },
      { name: 'bad_args', answer: () => ({ isError: true, content: [{ type: 'text', text: 'Input validation error: id: expected string' }] }) },
    ]);
    const { tools } = await mcpTools(client, opts(['infra_fails', 'domain_says_no', 'output_broke_schema', 'bad_args']));
    const reg = new ToolRegistry(tools);

    const infra = await reg.dispatch('infra_fails', {});
    check(
      "the server's INFRASTRUCTURE label is recorded as `threw`, with the label kept in the message",
      infra.ok === false && infra.cause === 'threw' && /\[upstream_unavailable\]/.test(infra.error ?? ''),
      `record cause=${infra.cause}, error="${infra.error}". The two eval runners that read cause === 'threw' see it — nothing had to change`,
    );

    const domain = await reg.dispatch('domain_says_no', {});
    check(
      "a DOMAIN answer is returned for the model to read — not a failure of the run",
      domain.ok === true && (domain.result as { cause?: string })?.cause === 'out_of_scope',
      `result ${JSON.stringify(domain.result)}. "Not in scope" is a legitimate answer; counting it as infrastructure would blame the plumbing for a correct refusal`,
    );

    const broke = await reg.dispatch('output_broke_schema', {});
    check(
      '-32602 for a tool that IS listed is the SERVER\'s fault — recorded `threw`',
      broke.ok === false && broke.cause === 'threw',
      `cause=${broke.cause}. Same code as an unknown tool; the name being on the list is what tells them apart`,
    );

    const unknown = await reg.dispatch('invented_by_model', {});
    check(
      'a name the model invented is the registry\'s own `unknown_tool`',
      unknown.ok === false && unknown.cause === 'unknown_tool',
      `cause=${unknown.cause}. It never reaches the server at all`,
    );

    const bad = await reg.dispatch('bad_args', {});
    check(
      "an unlabelled error — the SDK's own bad-arguments text — goes back to the model to correct",
      bad.ok === true && /Input validation error/.test((bad.result as { error?: string })?.error ?? ''),
      'the model sent the wrong type; it can read that and try again, and it is not an outage',
    );
  }

  console.log('\nTHE HARNESS ITSELF');
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
