/**
 * Two repairs that make `LOOP=langgraph` usable against Gemini, both on the wire.
 *
 * `docs/ENGINES.md` recorded this engine as hosted-incompatible and named ONE
 * cause. There are two, and the second is only reachable once the first is
 * fixed — which is why it had never been seen.
 *
 * ── THE FAILURE THIS FIXES, MEASURED ──────────────────────────────────────
 *
 * `LOOP=langgraph` with `LLM_PROVIDER=hosted` calls one tool successfully and
 * then dies on the next request:
 *
 *   400 Function call is missing a thought_signature in functionCall parts.
 *   This is required for tools to work correctly … function call
 *   `default_api:get_recall`, position 2.
 *
 * Gemini attaches a signature to every function call it emits and requires it
 * ECHOED BACK on the following turn. Over the OpenAI-compatible surface it
 * arrives nested inside the tool call:
 *
 *   "tool_calls": [{
 *     "id": "call_38953",
 *     "type": "function",
 *     "function": { "name": "get_recall", "arguments": "{…}" },
 *     "extra_content": { "google": { "thought_signature": "El4KXAERTTIPPl1…" } }
 *   }]
 *
 * LangChain's `ChatOpenAI` parses a tool call into `{ id, name, args }` — the
 * three fields the OpenAI spec defines — and `extra_content` is not one of
 * them. It is dropped on the way in, so it cannot be present on the way out,
 * and the second request is rejected.
 *
 * It is a ROUND-TRIPPING BUG IN THE ADAPTER, not a missing feature in Gemini
 * and not something any environment variable can reach. `docs/ENGINES.md`
 * recorded it as open work and guessed the fix would be "probably an
 * additionalKwargs passthrough". It is one level lower than that: the message
 * object never carries the field at all, so the repair has to happen on the
 * wire.
 *
 * ── SO IT IS DONE IN `fetch`, WHICH IS THE ONLY PLACE BOTH HALVES MEET ────
 *
 * Going out: re-attach `extra_content` to any assistant tool call whose id we
 * have seen. Coming back: remember `extra_content` against the id it belonged
 * to.
 *
 * ── REPAIR 2: A REQUEST MAY NOT END WITH A MODEL TURN ─────────────────────
 *
 * With the signature carried, the conversation gets one request further and
 * then fails differently:
 *
 *   400 Requests ending with a model turn are not supported.
 *
 * The offending request is LangGraph's STRUCTURED-OUTPUT call — the separate
 * round trip `createReactAgent` makes when `responseFormat` is set. Logged:
 *
 *   roles: user > assistant > tool > assistant
 *   response_format: true · tools: 0
 *
 * It replays the conversation, which ends with the model's own prose, and asks
 * for it back as JSON. Every other provider accepts that. Gemini requires the
 * last turn to be the caller's.
 *
 * So a request that ends with an assistant message gets one appended. THIS IS
 * THE MORE INVASIVE OF THE TWO REPAIRS AND IT IS WORTH SAYING SO: repair 1 puts
 * back something the provider itself sent, while this one ADDS A MESSAGE THE
 * CALLER DID NOT WRITE. It is scoped as narrowly as the failure — only when the
 * final message is from the assistant, which is the exact shape Gemini names —
 * and the sentence it adds asks for nothing the request was not already asking
 * for.
 *
 * ── AND IT IS INERT EVERYWHERE ELSE ───────────────────────────────────────
 *
 * Nothing is injected for an id that was never recorded, and nothing is
 * recorded unless a provider sent `extra_content` in the first place. Against
 * Azure, Bedrock or a local server the map stays empty and every request passes
 * through byte-for-byte.
 *
 * Repair 2 cannot be made inert the same way — a trailing assistant message is
 * legal everywhere else and this rewrites it regardless. It is therefore gated
 * on the provider being `hosted`, rather than on a shape that other providers
 * also produce. A fix for one provider that changes the request for the others
 * trades a loud failure for a quiet one.
 */

/** What a provider attached to a single tool call, keyed by that call's id. */
type Extras = Map<string, unknown>;

/** Pull `extra_content` out of a parsed chat-completions response. */
function recordFrom(payload: any, extras: Extras): void {
  for (const choice of payload?.choices ?? []) {
    for (const call of choice?.message?.tool_calls ?? []) {
      if (call?.id && call.extra_content !== undefined) extras.set(call.id, call.extra_content);
    }
  }
}

/** Put it back on the way out. Returns true when anything changed. */
function reattach(payload: any, extras: Extras): boolean {
  let touched = false;
  for (const message of payload?.messages ?? []) {
    if (message?.role !== 'assistant' || !Array.isArray(message.tool_calls)) continue;
    for (const call of message.tool_calls) {
      if (call?.id === undefined || call.extra_content !== undefined) continue;
      const extra = extras.get(call.id);
      if (extra !== undefined) {
        call.extra_content = extra;
        touched = true;
      }
    }
  }
  return touched;
}

/** Appended when a request would otherwise end with the model's own turn. */
const CONTINUE = 'Continue.';

/**
 * Does this provider need the repairs? Only the hosted one does.
 *
 * READ PER CALL rather than captured at construction, because a process may
 * build a client before the environment is fully loaded and the cost of being
 * wrong here is a silently rewritten request on Azure.
 */
function hosted(): boolean {
  return process.env.LLM_PROVIDER?.trim().toLowerCase() === 'hosted';
}

/**
 * Wrap a fetch so provider-specific tool-call fields survive a round trip.
 *
 * THE MAP IS PER-CLIENT, not global. One conversation's signatures must not be
 * offered to another's tool call ids — they are opaque strings from the model
 * and re-using one across conversations is exactly the kind of thing that would
 * work in testing and fail under load.
 */
export function hostedRoundTripFetch(inner: typeof fetch = fetch): typeof fetch {
  const extras: Extras = new Map();

  return async (input: any, init?: any) => {
    let outgoing = init;

    if (hosted() && typeof init?.body === 'string') {
      try {
        const payload = JSON.parse(init.body);
        let touched = reattach(payload, extras);

        // REPAIR 2. Narrow on purpose: only the exact shape Gemini names.
        const messages = payload?.messages;
        if (Array.isArray(messages) && messages.length && messages.at(-1)?.role === 'assistant') {
          messages.push({ role: 'user', content: CONTINUE });
          touched = true;
        }

        if (touched) outgoing = { ...init, body: JSON.stringify(payload) };
      } catch {
        // Not a JSON body we understand. Send it exactly as it came — a
        // mangled request is worse than an un-repaired one.
      }
    }

    const response = await inner(input, outgoing);

    // READ FROM A CLONE. Consuming the body here would leave the caller with a
    // used stream and an error that looks nothing like its cause.
    try {
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        recordFrom(await response.clone().json(), extras);
      }
    } catch {
      // A streamed or non-JSON response has nothing to record, and failing to
      // read it must never fail the request itself.
    }

    return response;
  };
}
