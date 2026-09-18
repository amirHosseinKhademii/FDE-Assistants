/**
 * Show the wire. Spawns the Step 1 server and speaks RAW JSON-RPC at it.
 *
 * WHY RAW AND NOT THE CLIENT SDK. The client SDK (Step 10) is the right way to
 * talk to a server and the wrong way to LEARN one: it hides the handshake,
 * which is the only part of Step 1 worth looking at. Here every byte in both
 * directions is printed, so "the client and server agreed a protocol version"
 * stops being a sentence in a document and becomes a line you can point at.
 *
 * THE FRAMING IS NEWLINE-DELIMITED JSON — verified rather than assumed:
 *
 *     require('@modelcontextprotocol/server').serializeMessage({...})
 *       -> '{"jsonrpc":"2.0","id":1,"method":"ping"}\n'
 *
 * One JSON object per line, in each direction. That is the whole transport.
 *
 * This is a teaching tool, not a test. Step 3 is the test.
 */
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import * as path from 'node:path';

/**
 * stdin piped, stdout piped, stderr INHERITED — so the server's own diagnostics
 * land straight on our terminal and only the protocol comes back through the
 * pipe. That inherited third stream is why this is not `ServerProcess`.
 */
type ServerProcess = ChildProcessByStdio<Writable, Readable, null>;

/** The revision we ASK for. Step 1 measured that we are answered 2025-11-25. */
const PROTOCOL_VERSION = '2026-07-28';

const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

// ── printing ────────────────────────────────────────────────────────────────

/** What to call a message, for the one-line header above its body. */
function labelOf(msg: { method?: string; error?: unknown }): string {
  if (msg.method) return msg.method;
  return msg.error ? 'ERROR' : 'result';
}

/**
 * Print one message. An unparseable line is PRINTED, never swallowed — it is
 * what a stray `console.log` in a stdio server looks like from out here, and
 * hiding it would hide the single most common way to lose an hour.
 */
function show(direction: '→' | '←', line: string): void {
  try {
    const msg = JSON.parse(line);
    process.stdout.write(`${direction} ${DIM}${labelOf(msg)}${OFF}\n${JSON.stringify(msg, null, 2)}\n\n`);
  } catch {
    process.stdout.write(
      `${direction} ${DIM}UNPARSEABLE — this is what a stray console.log looks like${OFF}\n${line}\n\n`,
    );
  }
}

// ── the subprocess ──────────────────────────────────────────────────────────

function spawnServer(): ServerProcess {
  const serverPath = path.join(__dirname, '..', 'server.ts');
  return spawn(process.execPath, [require.resolve('ts-node/dist/bin.js'), serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
}

/**
 * Print each complete line the server writes.
 *
 * THE TRAILING PARTIAL IS THE WHOLE REASON THIS IS NOT A ONE-LINER: a message
 * can arrive split across two chunks, and a naive `split('\n')` per chunk
 * corrupts it. Keep the last fragment; it is the start of the next message.
 */
function printServerOutput(child: ServerProcess): void {
  let pending = '';
  child.stdout.on('data', (chunk: Buffer) => {
    pending += chunk.toString();
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) show('←', line);
  });
}

type Send = (msg: unknown) => void;

function makeSender(child: ServerProcess): Send {
  return (msg) => {
    const line = JSON.stringify(msg);
    show('→', line);
    child.stdin.write(line + '\n');
  };
}

const settle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── the four exchanges, one function each ───────────────────────────────────

/**
 * Both sides declare capabilities, and neither may use what the other did not
 * declare. WE DECLARE NOTHING — no sampling, no elicitation — which is exactly
 * the state PLAN.md §9.1 describes and not an oversight.
 */
async function initialize(send: Send): Promise<void> {
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'handshake-cli', version: '0.1.0' },
    },
  });
  await settle(1500);

  // No id, no reply: this one is a notification.
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  await settle(300);
}

/** The payload that lands in the model's context on EVERY request. §10 sizes it. */
async function listTools(send: Send): Promise<void> {
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  await settle(800);
}

async function callPing(send: Send): Promise<void> {
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ping', arguments: {} } });
  await settle(800);
}

/**
 * A deliberate miss, because Step 6 needs you to have SEEN one.
 *
 * MEASURED: this answers `-32602 INVALID_PARAMS`, NOT the `-32601
 * METHOD_NOT_FOUND` the plan first predicted — `tools/call` is a method the
 * server has, and `name` is one of its parameters.
 */
async function callMissingTool(send: Send): Promise<void> {
  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'no_such_tool', arguments: {} } });
  await settle(800);
}

// ── orchestration ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const child = spawnServer();
  printServerOutput(child);
  const send = makeSender(child);

  await initialize(send);
  await listTools(send);
  await callPing(send);
  await callMissingTool(send);

  child.kill();
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
