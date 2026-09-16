/**
 * AN OPENAI-COMPATIBLE ENDPOINT IN FRONT OF THE `claude` CLI.
 *
 * LOCAL DEVELOPMENT ONLY, and the reason is not legalese. See the four caveats
 * below — the schema is PROMPTED rather than ENFORCED, which is the exact
 * downgrade `mastra/provider.ts` refuses to accept silently. Knowing that, it is
 * genuinely useful for driving the loop against a strong model while you work,
 * with no key and no per-token bill.
 *
 *   node scripts/claude-code-shim.mjs &
 *   LLM_PROVIDER=local LOCAL_OPENAI_BASE_URL=http://127.0.0.1:11435/v1 \
 *     LOCAL_MODEL=claude-code LOOP=mastra pnpm compat:check
 *
 * Nothing in the repo changes. `LLM_PROVIDER=local` already takes a base URL,
 * and this is a server at one — which is the whole point of that seam being a
 * URL rather than a hardcoded Ollama.
 *
 * ── WHAT IT CANNOT GIVE YOU, IN ORDER OF HOW MUCH IT MATTERS ──────────────
 *
 * 1. STRUCTURED OUTPUT IS PROMPTED, NOT ENFORCED. There is no grammar here. The
 *    schema is pasted into the prompt and the model is asked to comply. It
 *    usually will, because it is a strong model — and "usually" is precisely
 *    what Pillar 3 exists to eliminate. `compat:check` §2's negative control is
 *    therefore not a real control against this endpoint: passing means the model
 *    chose to comply, not that it had to. Treat a green §1/§2 here as weaker
 *    evidence than the same green against Gemini.
 *
 * 2. TOOL CALLS ARE PARSED OUT OF TEXT. The CLI has no `tool_calls` channel, so
 *    tools are described in the prompt and a sentinel JSON object is parsed back
 *    out. That works, and it is strictly less reliable than a provider that
 *    emits the field.
 *
 * 3. IT IS SLOW AND IT IS NOT FREE-FREE. Every request spawns a process and
 *    pays Claude Code's own system prompt — measured around 20k cache-creation
 *    tokens per cold call. It bills against the subscription, not a per-token
 *    card, but an eval suite is ~24 calls and you will feel each one.
 *
 * 4. ITS OWN TOOLS ARE DISABLED HERE (`--disallowed-tools`). Without that, an
 *    agent loop would be nested inside an agent loop: Claude Code would go and
 *    read your files rather than calling the `search_policy` you handed it, and
 *    every turn count and tool-call record in the telemetry would describe the
 *    wrong loop.
 *
 * DO NOT POINT A DEPLOYED APP AT THIS. It binds loopback, it depends on a CLI
 * logged in as you, and a subscription is not an application backend.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.SHIM_PORT ?? 11435);
const CLI = process.env.CLAUDE_BIN ?? 'claude';
/** Generous: a cold call pays Claude Code's own system prompt before ours. */
const TIMEOUT_MS = Number(process.env.SHIM_TIMEOUT_MS ?? 180_000);

/** Run the CLI once and hand back its `result` string plus its usage. */
function runClaude(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    // THE PROMPT GOES ON STDIN, NOT AS A TRAILING ARGUMENT, and that is not a
    // style choice. `--disallowed-tools` is VARIADIC (`<tools...>`), so a
    // trailing prompt is swallowed as one more tool name and the CLI exits 1
    // with "Input must be provided either through stdin or as a prompt
    // argument" — an error that reads like the prompt is MISSING when it is
    // really in the wrong place. Stdin also sidesteps ARG_MAX, which a
    // conversation carrying tool results will eventually reach.
    const args = [
      '-p',
      '--output-format', 'json',
      // See caveat 4. These are the ones that would make it act instead of answer.
      '--disallowed-tools', 'Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,NotebookEdit,Task',
      ...(systemPrompt ? ['--append-system-prompt', systemPrompt] : []),
    ];
    const child = spawn(CLI, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', () => {});
    child.stdin.write(userPrompt);
    child.stdin.end();
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude did not answer within ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.slice(0, 300)}`));
      try {
        const env = JSON.parse(out);
        if (env.is_error) return reject(new Error(String(env.result ?? 'claude reported an error')));
        resolve(env);
      } catch {
        reject(new Error(`could not parse claude output: ${out.slice(0, 300)}`));
      }
    });
  });
}

/** Pull the first balanced JSON object out of a reply that may carry prose. */
function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(body.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

const TOOL_SENTINEL = '__TOOL_CALL__';

/**
 * Turn an OpenAI request into one prompt.
 *
 * The conversation is FLATTENED, including previous tool results, because the
 * CLI takes a single string. That is lossy in a way a real provider is not —
 * role boundaries become labels — and it is the second reason this is a
 * development tool rather than a provider.
 */
function buildPrompt(body) {
  const system = body.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const rest = body.messages.filter((m) => m.role !== 'system');

  const lines = [];
  for (const m of rest) {
    if (m.role === 'tool') {
      lines.push(`TOOL RESULT (${m.name ?? m.tool_call_id ?? 'tool'}):\n${m.content}`);
    } else if (m.role === 'assistant' && m.tool_calls?.length) {
      lines.push(`ASSISTANT called: ${m.tool_calls.map((t) => `${t.function.name}(${t.function.arguments})`).join(', ')}`);
    } else if (m.content) {
      lines.push(`${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`);
    }
  }

  const instructions = [];
  if (body.tools?.length) {
    instructions.push(
      `You may call ONE of these tools instead of answering:\n` +
        body.tools
          .map((t) => `  ${t.function.name}: ${t.function.description ?? ''}\n    parameters: ${JSON.stringify(t.function.parameters)}`)
          .join('\n') +
        `\n\nTo call one, reply with ONLY this and nothing else:\n` +
        `{"${TOOL_SENTINEL}": {"name": "<tool name>", "arguments": {<the arguments>}}}`,
    );
  }
  const schema = body.response_format?.json_schema?.schema;
  if (schema) {
    instructions.push(
      `When you give a FINAL answer it must be ONLY a JSON object matching this JSON Schema exactly — ` +
        `no prose, no markdown fence, no extra keys:\n${JSON.stringify(schema)}`,
    );
  }

  return {
    system: [system, ...instructions].filter(Boolean).join('\n\n'),
    user: lines.join('\n\n'),
  };
}

const server = createServer((req, res) => {
  const send = (code, obj) => {
    const payload = JSON.stringify(obj);
    res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
    res.end(payload);
  };

  if (req.method === 'GET' && req.url?.startsWith('/v1/models')) {
    return send(200, { object: 'list', data: [{ id: 'claude-code', object: 'model', owned_by: 'claude-code-shim' }] });
  }
  if (req.method !== 'POST' || !req.url?.includes('/chat/completions')) {
    return send(404, { error: { message: `no route for ${req.method} ${req.url}`, type: 'invalid_request_error' } });
  }

  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw); } catch {
      return send(400, { error: { message: 'body was not JSON', type: 'invalid_request_error' } });
    }
    const started = Date.now();
    try {
      const { system, user } = buildPrompt(body);
      const env = await runClaude(system, user);
      const text = String(env.result ?? '');

      const parsed = extractJson(text);
      const call = parsed?.[TOOL_SENTINEL];

      const usage = env.usage ?? {};
      const common = {
        id: `chatcmpl-${env.session_id ?? Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(started / 1000),
        model: body.model ?? 'claude-code',
        usage: {
          prompt_tokens: usage.input_tokens ?? 0,
          completion_tokens: usage.output_tokens ?? 0,
          total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
          prompt_tokens_details: { cached_tokens: usage.cache_read_input_tokens ?? 0 },
        },
      };

      if (call?.name) {
        return send(200, {
          ...common,
          choices: [{
            index: 0,
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: `call_${Math.random().toString(36).slice(2, 10)}`,
                type: 'function',
                function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
              }],
            },
          }],
        });
      }

      // A schema was asked for: hand back the JSON object alone, so a caller that
      // does `JSON.parse(content)` succeeds. If the model wrapped it in prose,
      // `extractJson` has already found it — which is the shim papering over
      // caveat 1, and exactly why a green §1 here is weak evidence.
      const content = body.response_format?.json_schema && parsed ? JSON.stringify(parsed) : text;
      return send(200, {
        ...common,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
      });
    } catch (e) {
      return send(502, { error: { message: String(e?.message ?? e), type: 'upstream_error' } });
    }
  });
});

// LOOPBACK, NOT 0.0.0.0. This fronts a CLI logged in as you; "local only" is a
// property of the listener, the same rule `packages/guard/src/guard.ts` states.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`claude-code shim on http://127.0.0.1:${PORT}/v1  →  ${CLI} -p`);
  console.log('LOCAL DEVELOPMENT ONLY — the schema is prompted, not enforced. See the header.');
});
