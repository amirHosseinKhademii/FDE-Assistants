/**
 * Read the SSE stream from a question endpoint.
 *
 * WHY NOT `EventSource`. The browser's built-in SSE client only does GET and
 * cannot set headers — so the question would travel in the URL, where proxies
 * and access logs keep it, and there would be nowhere to put the `x-api-key`
 * the guard requires. So: `fetch`, and parse the frames ourselves.
 *
 * THE ENDPOINT IS A PARAMETER because pharma asks two questions that do not
 * return the same shape — `/api/ask` for a release decision, `/api/supplier`
 * for a work list. The FRAMING is identical, and that is the part worth having
 * once: one place that knows a message may arrive split across chunks.
 *
 * THE FRAMING, which is the whole protocol: messages are separated by a BLANK
 * LINE, and each message is lines of `field: value`. A message may arrive split
 * across chunks, so anything after the last blank line stays in the buffer until
 * more bytes turn up. Getting that wrong produces a UI that works locally and
 * corrupts messages over a real network, which is a horrible bug to find later.
 */
export interface AskEvent {
  event: string;
  data: any;
}

export interface AskRequest {
  question: string;
  /** Which question is being asked. Defaults to the release decision. */
  path?: string;
  /** Which agent topology answers it. Only the supplier endpoint reads this. */
  topology?: string;
  loop?: string;
  apiKey?: string;
  signal?: AbortSignal;
}

export async function* askStream(req: AskRequest): AsyncGenerator<AskEvent> {
  const res = await fetch(req.path ?? '/api/ask', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(req.apiKey ? { 'x-api-key': req.apiKey } : {}),
    },
    body: JSON.stringify({ question: req.question, loop: req.loop, topology: req.topology }),
    signal: req.signal,
  });

  // The guard answers with JSON and a status, not with a stream.
  if (!res.ok || !res.body) {
    let message = `request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON — keep the status message */
    }
    yield { event: 'error', data: { message, status: res.status } };
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
        if (line.startsWith(':')) continue;            // a comment — our heartbeat
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      try {
        yield { event, data: JSON.parse(dataLines.join('\n')) };
      } catch {
        yield { event, data: dataLines.join('\n') };
      }
    }
  }
}
