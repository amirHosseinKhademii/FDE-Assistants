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
import { spawn } from 'node:child_process';
import * as path from 'node:path';

/** The revision this server speaks. See docs/beyond-retrieval/MCP.md §1.2. */
const PROTOCOL_VERSION = '2026-07-28';

const OUT = (s: string) => process.stdout.write(s);
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

function show(direction: '→' | '←', line: string): void {
  // Pretty-print when we can, but never hide a line we could not parse — an
  // unparseable line IS the finding (see the console.log warning in server.ts).
  try {
    const v = JSON.parse(line);
    const label = v.method ?? (v.error ? 'ERROR' : 'result');
    OUT(`${direction} ${DIM}${label}${OFF}\n${JSON.stringify(v, null, 2)}\n\n`);
  } catch {
    OUT(`${direction} ${DIM}UNPARSEABLE — this is what a stray console.log looks like${OFF}\n${line}\n\n`);
  }
}

async function main(): Promise<void> {
  const serverPath = path.join(__dirname, '..', 'server.ts');
  const child = spawn(process.execPath, [require.resolve('ts-node/dist/bin.js'), serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffered = '';
  child.stdout.on('data', (chunk: Buffer) => {
    buffered += chunk.toString();
    // Split on newlines; keep the trailing partial. A message can arrive split
    // across two chunks and a naive split would corrupt it.
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) show('←', line);
  });

  const send = (msg: unknown): void => {
    const line = JSON.stringify(msg);
    show('→', line);
    child.stdin.write(line + '\n');
  };

  const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // 1 · initialize. Both sides declare capabilities, and neither may use what
  //     the other did not declare. We declare NOTHING — no sampling, no
  //     elicitation — which is exactly the state described in PLAN.md §9.1.
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

  // 2 · the notification that says the handshake is done. No id, no reply.
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  await settle(300);

  // 3 · what have you got? THIS is the payload that lands in the model's
  //     context on every request — PLAN.md §10 measures its size.
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  await settle(800);

  // 4 · run it.
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ping', arguments: {} } });
  await settle(800);

  // 5 · and a deliberate miss, because Step 6 needs you to have SEEN one.
  //     Expect JSON-RPC -32601 / METHOD_NOT_FOUND, not a crash.
  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'no_such_tool', arguments: {} } });
  await settle(800);

  child.kill();
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
