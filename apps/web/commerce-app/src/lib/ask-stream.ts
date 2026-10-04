/**
 * Read the SSE stream from `/api/ask`.
 *
 * WHY NOT `EventSource`. The browser's built-in SSE client only does GET and
 * cannot set headers — so a bearer token would travel in the URL, where proxies
 * and access logs keep it, and there would be nowhere to put any secret. So:
 * `fetch`, and parse the frames ourselves.
 *
 * THE FRAMING, which is the whole protocol: messages are separated by a BLANK
 * LINE, and each message is lines of `field: value`. A message may arrive split
 * across chunks, so anything after the last blank line stays in the buffer
 * until more bytes turn up. Getting that wrong produces a page that works
 * locally and corrupts messages over a real network, which is a horrible bug to
 * find later. This is the same parser as assess-stream.ts, copied because two
 * consumers is not yet evidence of the right shared shape.
 */
import type { AskEvent } from '@thornbury/commerce';

export type DeskEvent = AskEvent | {
  type: 'case';
  caseId: string;
  source: 'picked' | 'case id in prompt' | 'order id in prompt';
  orderId?: string;
};

export async function* askStream(
  caseId: string | undefined,
  question: string,
  signal?: AbortSignal,
  apiKey?: string,
): AsyncGenerator<DeskEvent> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ caseId: caseId ?? undefined, question }),
    signal,
  });

  // The server answers with JSON and a status, not with a stream.
  if (!res.ok || !res.body) {
    let message = `request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON — keep the status message */
    }
    yield { type: 'error', message };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Everything up to the last blank line is complete; the remainder is a
    // partial message and waits for more bytes.
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of part.split('\n')) {
        if (line.startsWith(':')) continue; // a comment — our heartbeat
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      try {
        yield { ...JSON.parse(dataLines.join('\n')), type: event } as DeskEvent;
      } catch {
        yield { type: 'error', message: dataLines.join('\n') } as DeskEvent;
      }
    }
  }
}
