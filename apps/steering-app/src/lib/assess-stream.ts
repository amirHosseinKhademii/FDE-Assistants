/**
 * Read the SSE stream from `/api/assess`.
 *
 * WHY NOT `EventSource`. The browser's built-in SSE client only does GET and
 * cannot set headers — so the requirement reference would travel in the URL,
 * where proxies and access logs keep it, and there would be nowhere to put the
 * `x-api-key` the guard requires. So: `fetch`, and parse the frames ourselves.
 *
 * THE FRAMING, which is the whole protocol: messages are separated by a BLANK
 * LINE, and each message is lines of `field: value`. A message may arrive split
 * across chunks, so anything after the last blank line stays in the buffer
 * until more bytes turn up. Getting that wrong produces a page that works
 * locally and corrupts messages over a real network, which is a horrible bug to
 * find later. This is pharma's parser, and it is copied rather than shared for
 * now: two consumers is not yet evidence of the right shared shape, and the
 * body it posts is a different one.
 */
export interface AssessEvent {
  event: string;
  data: any;
}

export interface AssessRequest {
  /**
   * A customer requirement id, e.g. `CR-K2-0101`. When this is set the text is
   * read from the estate at the revision in force, and the text below is not
   * sent — the two are different claims and the route treats them as such.
   */
  ref?: string;
  /** A requirement as somebody typed it, when it is not in the estate yet. */
  text?: string;
  loop?: string;
  apiKey?: string;
  signal?: AbortSignal;
}

export async function* assessStream(req: AssessRequest): AsyncGenerator<AssessEvent> {
  const res = await fetch('/api/assess', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(req.apiKey ? { 'x-api-key': req.apiKey } : {}),
    },
    body: JSON.stringify({ ref: req.ref, text: req.text, loop: req.loop }),
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
        if (line.startsWith(':')) continue; // a comment — our heartbeat
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
