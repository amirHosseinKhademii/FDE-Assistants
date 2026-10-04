/**
 * POST /api/ask — ask Thornbury Goods questions about a case, streaming events.
 *
 * THE AGENT is `askThornbury` — a single function from `@thornbury/commerce`
 * that connects to an MCP server, runs the tool-calling loop, and emits events.
 * The job here is what a surface is for: frame the request, validate it, stream
 * the events as SSE, and close cleanly — never in the domain logic.
 *
 * The token and model key stay HERE, server-only — they never leave this route
 * and never reach the browser. That is a demo decision (2026-10-04), not a hard
 * rule.
 *
 * ── WHY SERVER-SENT EVENTS ───────────────────────────────────────────────
 *
 * A question may take tens of seconds (tool calls, network latency). Sending
 * nothing until it finishes makes a working system look broken. Events are
 * real and arrive incrementally.
 */
import { parse as parseEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createFileRoute } from '@tanstack/react-router';
import { askThornbury, type AskEvent } from '@thornbury/commerce';
import { publicError } from '@fde/guard';
import { CASES } from '../lib/cases';

// Load .env by walking up to repo root (pnpm-workspace.yaml)
function loadRepoEnv(): Record<string, string> {
  let cwd = process.cwd();
  let depth = 0;
  const maxDepth = 20;

  while (depth < maxDepth) {
    try {
      readFileSync(join(cwd, 'pnpm-workspace.yaml'));
      // Found repo root
      const envPath = join(cwd, '.env');
      const envContent = readFileSync(envPath, 'utf-8');
      return parseEnv(envContent);
    } catch {
      // Try parent directory
      const parent = resolve(cwd, '..');
      if (parent === cwd) break; // reached filesystem root
      cwd = parent;
      depth++;
    }
  }
  return {};
}

const envVars = loadRepoEnv();

// Copy COMMERCE_MCP_* and model-related env vars into process.env
const keysToLoad = [
  'COMMERCE_MCP_TOKEN',
  'COMMERCE_MCP_PORT',
  'COMMERCE_MCP_URL',
  'FOUNDRY_OPENAI_ENDPOINT',
  'FOUNDRY_CHAT_DEPLOYMENT',
  'LLM_PROVIDER',
  'LOOP',
  'HOSTED_API_KEY',
  'HOSTED_MODEL',
  'HOSTED_BASE_URL',
  'LOCAL_MODEL',
  'LOCAL_OPENAI_BASE_URL',
  'BEDROCK_MODEL',
  'AWS_REGION',
  'AZURE_CLIENT_ID',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_SECRET',
];

for (const key of keysToLoad) {
  if (key in envVars && !(key in process.env)) {
    process.env[key] = envVars[key];
  }
}

const encoder = new TextEncoder();

/** Heartbeat to keep proxies from dropping idle connections. */
const HEARTBEAT_MS = 15_000;

/** Case ID must match this pattern. */
const CASE_ID_PATTERN = /^CAS-\d{5}$/;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body: any = await request.json().catch(() => ({}));
        let caseId = String(body?.caseId ?? '').trim();
        let question = String(body?.question ?? '').trim();

        // Validation: question length
        if (question.length > 1000) {
          return new Response(
            JSON.stringify({ error: 'question must be 1000 characters or fewer' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          );
        }

        let source: string = 'picked';
        let orderId: string | undefined;

        // If caseId is provided, validate it
        if (caseId) {
          if (!CASE_ID_PATTERN.test(caseId)) {
            return new Response(
              JSON.stringify({ error: 'caseId must match CAS-##### (e.g. CAS-12345)' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            );
          }
          source = 'picked';
        } else {
          // Free-text mode: try to extract caseId or orderId from question
          if (!question.trim()) {
            return new Response(
              JSON.stringify({ error: 'Include a case id (e.g. CAS-90001) or an order id (e.g. ORD-101414) in your prompt.' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            );
          }

          // Try to find CAS-##### in the question
          const casMatch = question.match(/\bCAS-\d{5}\b/i);
          if (casMatch) {
            caseId = casMatch[0].toUpperCase();
            source = 'case id in prompt';
          } else {
            // Try to find ORD-###### in the question
            const ordMatch = question.match(/\bORD-\d{6}\b/i);
            if (ordMatch) {
              orderId = ordMatch[0].toUpperCase();
              // Look up the case by orderId
              const foundCase = CASES.find((c) => c.orderId === orderId);
              if (!foundCase) {
                return new Response(
                  JSON.stringify({ error: `No case found for ${orderId}. Include a case id like CAS-90001.` }),
                  { status: 400, headers: { 'content-type': 'application/json' } },
                );
              }
              caseId = foundCase.caseId;
              source = 'order id in prompt';
            } else {
              return new Response(
                JSON.stringify({ error: 'Include a case id (e.g. CAS-90001) or an order id (e.g. ORD-101414) in your prompt.' }),
                { status: 400, headers: { 'content-type': 'application/json' } },
              );
            }
          }
        }

        // Default question if empty (in picked mode)
        if (!question) {
          question = 'The customer on this case wants their money back. What are they entitled to?';
        }

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                // The client navigated away mid-stream. Not worth raising.
              }
            };

            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
              } catch {
                /* closed */
              }
            }, HEARTBEAT_MS);

            try {
              // Emit case event first
              send('case', { caseId, source, orderId });

              await askThornbury({
                caseId,
                question,
                token: process.env.COMMERCE_MCP_TOKEN,
                onEvent: (e: AskEvent) => send(e.type, e),
              });
            } catch (e: any) {
              const safe = publicError(e, { context: 'POST /api/ask' });
              send('error', { message: safe.error });
            } finally {
              clearInterval(heartbeat);
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            'x-accel-buffering': 'no',
          },
        });
      },
    },
  },
});
