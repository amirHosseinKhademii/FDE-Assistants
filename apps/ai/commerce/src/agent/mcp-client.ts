/**
 * Step 10 — this engagement's MCP client: connect, list, gate, register.
 *
 * WHAT THIS PROCESS HOLDS: the MCP server's URL, the INBOUND token it accepts
 * (COMMERCE_MCP_TOKEN), and a case id. Not the API's service token, and not a
 * database credential — those belong to the server, which is the separate
 * deployable PLAN.md §4.1 argues for. The order is resolved from the case on
 * the server's side of the line.
 *
 * `versionNegotiation` IS PINNED, NOT OPTIONAL. The server runs `legacy:
 * 'reject'`, and the SDK client's DEFAULT is the 2025 handshake — measured, it is
 * refused with -32022 (MCP-STEPS Step 7). A client built without this line
 * cannot connect at all.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { mcpTools, ToolRegistry, type McpToolsResult } from '@fde/agent';
import { ALLOWED_TOOLS, INFRASTRUCTURE_CAUSES } from './allowlist';

export const MODERN = '2026-07-28';

export interface Thornbury {
  client: Client;
  registry: ToolRegistry;
  gate: McpToolsResult;
  close(): Promise<void>;
}

/** Connect as the desk for one case, list, and register exactly what the allowlist permits. */
export async function connectToThornbury(opts: {
  url: string;
  token: string;
  caseId: string;
  allow?: readonly string[];
}): Promise<Thornbury> {
  const client = new Client({ name: 'thornbury-desk', version: '0.1.0' }, { versionNegotiation: { mode: { pin: MODERN } } });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(opts.url), {
      requestInit: { headers: { authorization: `Bearer ${opts.token}`, 'x-case-id': opts.caseId } },
    }),
  );
  const gate = await mcpTools(client, {
    allow: opts.allow ?? ALLOWED_TOOLS,
    infrastructureCauses: INFRASTRUCTURE_CAUSES,
  });
  return { client, registry: new ToolRegistry(gate.tools), gate, close: () => client.close() };
}

/** Walk up to the workspace, rather than counting `..` — which is wrong in silence. */
function workspaceRoot(): string {
  let dir = __dirname;
  while (!existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
    const up = dirname(dir);
    if (up === dir) throw new Error('no pnpm-workspace.yaml above ' + __dirname);
    dir = up;
  }
  return dir;
}

/**
 * What the spawned server inherits: enough to run pnpm and node, and nothing
 * that is a secret. It reads its OWN keys from the workspace .env (an allowlist
 * of its own — apps/mcp/commerce/src/config/env.ts); handing it this process's
 * whole environment would hand it whatever this process loaded.
 */
const INHERITED = /^(PATH|HOME|USER|SHELL|LANG|LC_[A-Z]+|TERM|TMPDIR|XDG_[A-Z_]+|NODE_[A-Z_]+|PNPM_[A-Z_]+|npm_config_[a-z_]+)$/;

/**
 * Start the MCP server as the SEPARATE PROCESS it is, on a free loopback port,
 * with a token minted for this run. It reads its own API credential from the
 * workspace .env; this process never touches it. For checks and the CLI — a
 * deployment runs `pnpm commerce:mcp-serve-http` itself.
 */
export async function spawnMcpServer(): Promise<{ url: string; token: string; stop(): void }> {
  const token = `desk_${randomBytes(24).toString('hex')}`;
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => INHERITED.test(k)));
  const child: ChildProcess = spawn('pnpm', ['--filter', '@thornbury/commerce-mcp', 'serve:http'], {
    cwd: workspaceRoot(),
    env: { ...env, COMMERCE_MCP_TOKEN: token, COMMERCE_MCP_PORT: '0' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const url = await new Promise<string>((ok, fail) => {
    let err = '';
    const timer = setTimeout(() => fail(new Error(`the MCP server did not start within 60s:\n${err.slice(-400)}`)), 60_000);
    child.stderr!.on('data', (chunk: Buffer) => {
      err += chunk.toString();
      const m = /listening on (http:\/\/\S+)/.exec(err);
      if (m) {
        clearTimeout(timer);
        ok(m[1]!);
      }
    });
    child.on('exit', (code) => fail(new Error(`the MCP server exited (${code}) before listening:\n${err.slice(-400)}`)));
  });
  return { url, token, stop: () => void child.kill('SIGTERM') };
}
