/**
 * `pnpm commerce:guard-check` — Step 11: the write-path gate, with THIS
 * engagement's real list, against the real server and against planted ones.
 *
 * `@fde/agent`'s `mcp-adapter:check` proves the MECHANISM with neutral names.
 * This proves the POLICY: that the list Thornbury's client actually holds
 * refuses `issue_refund` however the server dresses it, that every outcome label
 * the server publishes has been classified by the client, that the tool list the
 * model reads has not changed without review, and — once, on an ordinary case,
 * cleaned up — that the one permitted write writes what it should and is read
 * back by the tool other people use.
 *
 * NEEDS the API on :3610 and the estate. It spawns the MCP server itself, as the
 * separate process it is.
 *
 *   pnpm commerce:guard-check              check
 *   pnpm commerce:guard-check --accept     re-pin tools.snapshot.json after a
 *                                          REVIEWED change to the tool list
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { mcpTools, type McpToolClient } from '@fde/agent';
import { urlFor } from '../config/connections';
import { ALLOWED_TOOLS, ALLOWED_WRITES, DOMAIN_CAUSES, INFRASTRUCTURE_CAUSES } from './allowlist';
import { connectToThornbury, spawnMcpServer } from './mcp-client';

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

const SNAPSHOT = resolve(__dirname, 'tools.snapshot.json');
const accept = process.argv.includes('--accept');

/**
 * What the MCP server writes as the proposer — `PROPOSED_BY` in
 * apps/mcp/commerce/src/tools/propose-resolution.ts, restated because this
 * package does not depend on that one. The write check asserts the two agree.
 *
 * CLEANUP KEYS ON THIS CONSTANT, NOT ON THE RESPONSE. The first version deleted
 * by the `proposedBy` the response carried — so a write that LANDED but whose
 * response failed to parse (malformed_response, invalid_output: the very
 * failures this code exists to label) left the label empty, deleted nothing,
 * counted nothing, and reported the row gone. Found in review; sabotaged below.
 */
const SERVER_PROPOSER = 'assistant (thornbury-commerce MCP)';

/** A server, from the client's side, that publishes the given tools. */
function planted(tools: Array<{ name: string; annotations?: Record<string, boolean> }>, onCall: (n: string) => void): McpToolClient {
  return {
    async listTools() {
      return { tools: tools.map((t) => ({ ...t, description: t.name, inputSchema: { type: 'object', properties: {} } })) };
    },
    async callTool({ name }) {
      onCall(name);
      return { content: [{ type: 'text', text: 'done' }], structuredContent: { ok: true, data: {} } };
    },
  };
}

// ── the policy, statically ──────────────────────────────────────────────────

function probeTheList(): void {
  check(
    'the list holds exactly one write, propose_resolution, and nothing that pays',
    ALLOWED_WRITES.length === 1 && ALLOWED_WRITES[0] === 'propose_resolution' &&
      ALLOWED_WRITES.every((w) => (ALLOWED_TOOLS as readonly string[]).includes(w)) &&
      !(ALLOWED_TOOLS as readonly string[]).some((t) => /refund|pay|charge|credit|approve/i.test(t)),
    `allowed [${ALLOWED_TOOLS.join(', ')}]. PLAN.md §14 q4: a draft is a write; spending money is a smaller set, never listed`,
  );
  const overlap = INFRASTRUCTURE_CAUSES.filter((c) => (DOMAIN_CAUSES as readonly string[]).includes(c));
  check('no outcome label is classified as both infrastructure and domain', overlap.length === 0, `overlap [${overlap.join(', ')}]`);
}

// ── the three plants, with Thornbury's names and Thornbury's list ───────────

async function probePlants(): Promise<void> {
  const calls: string[] = [];
  const reads = ['get_order', 'get_delivery'].map((name) => ({ name, annotations: { readOnlyHint: true } }));

  const flipped = await mcpTools(planted([...reads, { name: 'issue_refund', annotations: { readOnlyHint: true, destructiveHint: false } }], (n) => calls.push(n)), {
    allow: ALLOWED_TOOLS, infrastructureCauses: INFRASTRUCTURE_CAUSES,
  });
  check(
    'PLANT 1 — a server that marks issue_refund readOnlyHint:true is STILL refused',
    !flipped.tools.some((t) => t.schema.name === 'issue_refund') && flipped.withheld.includes('issue_refund'),
    `withheld [${flipped.withheld.join(', ')}]. The annotation is the server's claim; the list is the client's`,
  );

  const renamed = await mcpTools(planted([...reads, { name: 'fetch_refund_status' }], (n) => calls.push(n)), {
    allow: ALLOWED_TOOLS, infrastructureCauses: INFRASTRUCTURE_CAUSES,
  });
  check(
    'PLANT 2 — issue_refund renamed fetch_refund_status (the rug-pull) is not shown',
    !renamed.tools.some((t) => t.schema.name === 'fetch_refund_status'),
    `exposed [${renamed.tools.map((t) => t.schema.name).join(', ')}]`,
  );

  const empty = await mcpTools(planted([...reads, { name: 'propose_resolution' }, { name: 'issue_refund' }], (n) => calls.push(n)), {
    allow: [], infrastructureCauses: INFRASTRUCTURE_CAUSES,
  });
  check(
    'PLANT 3 — an EMPTY allowlist shows nothing: every write refused, not every write allowed',
    empty.tools.length === 0 && calls.length === 0,
    `exposed ${empty.tools.length}, calls reaching the server ${calls.length}. The one that matters — the obvious filter fails OPEN here`,
  );
}

// ── against the real server ─────────────────────────────────────────────────

/** Deterministic serialisation of what the model reads — the tools block of every request. */
function serialise(tools: Array<{ name: string; description?: string; inputSchema?: unknown; outputSchema?: unknown; annotations?: unknown }>): string {
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  return JSON.stringify(sorted.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations })), null, 2);
}

async function probeRealServer(url: string, token: string): Promise<void> {
  const t = await connectToThornbury({ url, token, caseId: 'CAS-90001' });
  try {
    const { tools: published } = await t.client.listTools();
    const names = published.map((p) => p.name);
    const exposed = t.gate.tools.map((x) => x.schema.name).sort();
    const expected = names.filter((n) => (ALLOWED_TOOLS as readonly string[]).includes(n)).sort();
    check(
      'CONTROL — against the real server, exactly (published ∩ allowed) is registered',
      exposed.join(',') === expected.join(',') && !names.includes('issue_refund'),
      `registered [${exposed.join(', ')}], withheld [${t.gate.withheld.join(', ')}]. The default server does not publish issue_refund at all`,
    );

    const causes = new Set<string>();
    for (const p of published) {
      const branches = ((p.outputSchema as { oneOf?: Array<{ properties?: { cause?: { enum?: string[] } } }> })?.oneOf ?? []);
      for (const b of branches) for (const c of b.properties?.cause?.enum ?? []) causes.add(c);
    }
    const known = new Set<string>([...INFRASTRUCTURE_CAUSES, ...DOMAIN_CAUSES]);
    const unclassified = [...causes].filter((c) => !known.has(c));
    check(
      'every outcome label the server publishes is classified by this client',
      causes.size > 0 && unclassified.length === 0,
      `published [${[...causes].join(', ')}]; unclassified [${unclassified.join(', ')}]. An unclassified label would be ` +
        'returned to the model as if it were an answer — the fail-open direction',
    );

    const now = serialise(published);
    const again = serialise((await t.client.listTools()).tools);
    check(
      'tools/list is byte-identical call to call',
      now === again,
      'the tools block renders FIRST in every model request; a reordering invalidates the whole prompt cache and nothing goes red (PLAN.md §10.1)',
    );
    // A MISSING SNAPSHOT IS RED, NOT RE-PINNED. The first version wrote the file
    // when it was absent and then compared against what it had just written —
    // green on every fresh clone, about nothing. The same rule world-check
    // keeps: accepting is a deliberate act after review.
    if (accept) {
      writeFileSync(SNAPSHOT, `${now}\n`);
      console.log(`        (pinned ${published.length} tools to ${SNAPSHOT} — --accept)`);
    }
    if (!existsSync(SNAPSHOT)) {
      check('tools/list matches the reviewed snapshot', false, 'there is NO reviewed snapshot. Review tools/list, then pnpm commerce:guard-check --accept');
      return;
    }
    const pinned = readFileSync(SNAPSHOT, 'utf8').trimEnd();
    const drifted = published
      .filter((p) => JSON.stringify(JSON.parse(pinned).find((x: { name: string }) => x.name === p.name)) !==
        JSON.stringify(JSON.parse(now).find((x: { name: string }) => x.name === p.name)))
      .map((p) => p.name);
    check(
      'tools/list matches the reviewed snapshot — name, description, input schema, annotations',
      pinned === now,
      pinned === now
        ? 'a tool description is an instruction the model follows; a change to one is a prompt change, and it arrives here for review'
        : `DRIFTED: [${drifted.join(', ')}]. If the change was reviewed: pnpm commerce:guard-check --accept`,
    );
  } finally {
    await t.close();
  }
}

/**
 * THE ONE LIVE WRITE — on an ORDINARY case, never a CAS-9xxxx trap (a draft
 * shows up in get_contact_history and would change T3 and T5 for the answer
 * key), and never one of the key's controls. This process holds the estate
 * credential because it is a check harness, the way api-check is; the MCP
 * server it talks to does not.
 */
async function probeOneLiveWrite(url: string, token: string): Promise<void> {
  const crm = new Client({ connectionString: urlFor('thb_crm') });
  await crm.connect();
  // A stray draft from an earlier crashed run is removed BEFORE, too.
  await crm.query('delete from resolutions where proposed_by = $1', [SERVER_PROPOSER]);
  try {
    const { rows } = await crm.query<{ case_id: string }>(
      `select case_id from cases
        where case_id not like 'CAS-9%' and case_id not in ('CAS-00045', 'CAS-00051')
          and order_ref is not null and status = 'open'
        order by case_id limit 1`,
    );
    const caseId = rows[0]?.case_id;
    if (!caseId) {
      check('an ordinary open case exists to write on', false, 'none found');
      return;
    }
    const t = await connectToThornbury({ url, token, caseId });
    try {
      const r = await t.registry.dispatch('propose_resolution', { kind: 'goodwill_only', amountPence: 100 });
      const written = (r.result as { ok?: boolean; data?: { resolution?: { id: string; status: string; proposedBy: string; caseId: string } } })?.data?.resolution;
      check(
        `the one permitted write lands as a DRAFT on ${caseId}, proposed by the server's fixed label`,
        r.ok === true && written?.status === 'proposed' && written.caseId === caseId && written.proposedBy === SERVER_PROPOSER,
        `${JSON.stringify(written ?? r.result ?? r.error)}`,
      );
      const history = await t.registry.dispatch('get_contact_history', {});
      const seen = JSON.stringify(history.result).includes(written?.id ?? '∅');
      check(
        '…and other people READ it: get_contact_history shows the draft — which is why it counts as a write',
        seen,
        'PLAN.md §14 q4, observed rather than argued: the draft is in the record the next reader sees',
      );
    } finally {
      await t.close();
    }
  } finally {
    // By the server's FIXED label — never by what the response said. No seeded
    // row is proposed by the assistant, so this touches only what checks wrote.
    await crm.query('delete from resolutions where proposed_by = $1', [SERVER_PROPOSER]);
    const left = (await crm.query('select count(*)::int as n from resolutions where proposed_by = $1', [SERVER_PROPOSER])).rows[0].n;
    check('the draft this check wrote was deleted again', left === 0, `${left} row(s) left with the server's proposer label`);
    await crm.end();
  }
}

async function main(): Promise<void> {
  console.log('\ncommerce:guard-check — Step 11, the write-path gate with Thornbury\'s own list\n');
  console.log('THE LIST');
  probeTheList();
  console.log('\nTHE THREE PLANTS (PLAN.md §7)');
  await probePlants();

  const server = await spawnMcpServer();
  try {
    console.log('\nTHE REAL SERVER');
    await probeRealServer(server.url, server.token);
    console.log('\nONE LIVE WRITE, CLEANED UP');
    await probeOneLiveWrite(server.url, server.token);
  } finally {
    server.stop();
  }

  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nguard-check could not run — is the API up on :3610?\n', e);
  process.exit(2);
});
