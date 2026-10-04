/**
 * Ask the Thornbury MCP agent a question about one case, streaming events as they happen.
 *
 * This function extracts the core loop logic from the CLI so it can be reused by a web page:
 * connect to an already-running MCP server, run the same model/engine/loop, emit events
 * for each tool call, and close cleanly in all paths.
 */
import { chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { connectToThornbury, type Thornbury } from './mcp-client';

export type AskEvent =
  | { type: 'start'; caseId: string; model: string }
  | { type: 'tool'; name: string; args: unknown; ms: number; ok: boolean; cause?: string; preview: string }
  | { type: 'answer'; text: string; turns: number }
  | { type: 'error'; message: string };

const SYSTEM =
  "You are helping a resolutions specialist at Thornbury Goods, an online retailer. " +
  "Answer from Thornbury's own records, using the tools. " +
  "Start your reply with `Decision:`. No preamble, headings, markdown, bold or backticks. " +
  "Tool results give money in pence. Divide by 100 and write £x.xx. " +
  "Copy each reference exactly as it appears in the tool results (format: rule:TYPE:ID). " +
  "Use this exact template:\n" +
  "Decision: <one sentence a customer-service agent could read aloud>\n" +
  "Amount: <£x.xx, or \"none\", or \"to be decided\">\n" +
  "Why: <2–4 short plain sentences. No tool names, no pence, no ids in the sentences.>\n" +
  "Based on:\n" +
  "- <short plain description for a person, NOT a reference ID> [reference:id]\n" +
  "- <short plain description for a person, NOT a reference ID> [reference:id]\n" +
  "Examples (text before brackets is plain words, NEVER a reference ID):\n" +
  "- Returns policy (Rev 3), section 2 [policy:POL-RET-001 Rev 3#2]\n" +
  "- Kitchen return window, 30 days [rule:return_windows:RW-KITCHEN]\n" +
  "- Driver's report of damage at stop 14 [record:thb_fleet.driver_reports:DRP-00066]\n" +
  "Needs a person to approve: <Yes — reason / No>\n" +
  "Next step: <one sentence>";

/**
 * Redact a token from a string so it doesn't leak in error messages.
 * Handles graceful degradation if token is empty or undefined.
 */
function redact(s: string, token?: string): string {
  if (!token || !s) return s;
  return s.split(token).join('[redacted]');
}

/**
 * Build a preview of a tool result: the first 300 chars of text content.
 * Handles both success and failure result shapes from mcpTools.
 */
function previewResult(result: unknown): string {
  if (!result || typeof result !== 'object') return '';
  const r = result as Record<string, unknown>;
  const text = (r.text ?? r.detail ?? r.error ?? '') as string;
  return text.slice(0, 300);
}

export async function askThornbury(opts: {
  caseId: string;
  question: string;
  onEvent: (e: AskEvent) => void;
  url?: string;   // default: process.env.COMMERCE_MCP_URL ?? `http://127.0.0.1:${process.env.COMMERCE_MCP_PORT ?? 3620}/mcp`
  token?: string; // default: process.env.COMMERCE_MCP_TOKEN
}): Promise<void> {
  let t: Thornbury | undefined;

  try {
    // Defaults computed at call time, not import time
    const url = opts.url ?? process.env.COMMERCE_MCP_URL ?? `http://127.0.0.1:${process.env.COMMERCE_MCP_PORT ?? 3620}/mcp`;
    const token = opts.token ?? process.env.COMMERCE_MCP_TOKEN;

    if (!token) {
      opts.onEvent({ type: 'error', message: 'COMMERCE_MCP_TOKEN is not set' });
      return;
    }

    // Connect to the already-running MCP server
    t = await connectToThornbury({ url, token, caseId: opts.caseId });

    // Emit start event
    const choice = loopChoice();
    const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
    opts.onEvent({ type: 'start', caseId: opts.caseId, model });

    // Run the loop, capturing tool events via onTurn
    const toolCount = { ok: 0 };
    let result;
    try {
      result = await runLoop<string>(choice, chatClient(openaiClient), model, t.registry, opts.question, {
        system: SYSTEM,
        onTurn: (turn) => {
          // Emit tool call events from this turn's completed calls
          for (const call of turn.toolCalls) {
            if (call.ok) toolCount.ok++;
            opts.onEvent({
              type: 'tool',
              name: call.name,
              args: call.args,
              ms: call.ms,
              ok: call.ok,
              cause: call.cause,
              preview: previewResult(call.result),
            });
          }
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Check if this is a provider error that should get the special status code
      if (/429|quota|rate.?limit|RESOURCE_EXHAUSTED|high demand|503/i.test(msg)) {
        opts.onEvent({ type: 'error', message: redact(msg, opts.token) });
      } else {
        // Re-throw non-provider errors — the CLI will exit 1
        throw e;
      }
      return;
    }

    // Emit answer event
    const text = result.text.trim();
    const ok = toolCount.ok > 0 && text.length > 0;
    if (ok) {
      opts.onEvent({ type: 'answer', text, turns: result.turns.length });
    } else {
      opts.onEvent({ type: 'error', message: 'No tools called or empty answer' });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    opts.onEvent({ type: 'error', message: redact(msg, opts.token) });
  } finally {
    // Always close the connection, even if an error occurred
    if (t) {
      try {
        await t.close();
      } catch (e) {
        // Ignore close errors — the event has already been emitted
      }
    }
  }
}
