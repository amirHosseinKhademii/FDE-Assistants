# Building the MCP server, one small step at a time

*Written 2026-09-18. A build-along, not a reference —
[`../beyond-retrieval/MCP.md`](../beyond-retrieval/MCP.md) is the reference and
this is the doing. Each step is roughly one sitting, ends somewhere the work can
stop, and says plainly what it is for.*

**Who is doing what right now.** The five databases and the NestJS backend
(`apps/backend`) are being built by two other sessions. This document is the
third strand: the MCP server that sits between the model and everything they
build. **Seven of the thirteen steps need neither of them** — 0 through 4a, plus
5 and 6 — which is deliberate, and means we start now rather than waiting. The
full dependency table is at the foot of this document.

---

## Step 0 · The idea, in plain words

Skip nothing here; the rest is easier if this lands.

**The situation.** You have a language model that needs facts. The facts live in
a backend someone else owns. Today, in this repo, the model gets facts by
calling a TypeScript function that opens a database connection *in the same
process*. That works and it is the right answer when you own everything.

**What changes.** MCP replaces that function call with a **conversation between
two programs**:

```
  your app  ──"what tools do you have?"──►  a server
            ◄──"three: get_order, get_delivery, search_policy"──

  your app  ──"run get_order with {id:'THB-1049'}"──►
            ◄──"here is the order, as JSON"──
```

That is all it is. JSON-RPC over a pipe or over HTTP. Nothing clever.

**Three words you need, and the one people mix up:**

| word | what it is | in our case |
|---|---|---|
| **host** | the application a human is using | the loop, and later the desk at `:3600` |
| **client** | one connection object, inside the host, per server | the thing we write in Step 10 |
| **server** | the program that owns the tools | what we build in Steps 1–9 |

Host and client are not the same thing. One host can hold five clients to five
servers. That is the whole reason the protocol exists.

**The honest sentence about why we are doing this at all:**

> MCP is not a faster function call. It is a **boundary** with a schema on it.
> You pay latency and tokens for it. You are buying the fact that the thing on
> the other side can be owned, deployed and secured separately.

Step 12 measures what it cost. If the answer comes out badly, that is a real
result and we publish it.

**Stop here and check:** can you say out loud what the difference is between a
host and a client? If not, re-read the table — everything in Step 10 depends on
it.

---

## Step 1 · A server that does one useless thing

**Goal.** A server that starts, and a tool named `ping` that returns `pong`.
Nothing touches a database. The point is to see the handshake work.

**The tech, and why each piece:**

| | | why this and not something else |
|---|---|---|
| `@modelcontextprotocol/server` **2.0.0** | the MCP server SDK | **v2, not v1.** v1 is the old single `@modelcontextprotocol/sdk` package (now 1.30.0). v2 split into `core` / `server` / `client` and implements the **2026-07-28** spec. |
| **Zod 4** | the tool's input schema | it is what this whole workspace already speaks — one schema language from the API's DTOs to the tool arguments to the answer contract. The SDK accepts any Standard Schema, so this is our choice, not its requirement. Its peer dep is `zod ^4.2.0`; we are on 4.5.4. |
| **stdio transport** | how it is reached | the server runs as a subprocess and talks over its own stdin/stdout. No ports, no HTTP, no auth to get wrong. We move to HTTP in Step 7, once everything else works. |
| **TypeScript + `tsx`/`ts-node`** | running it | matches every other package here. |

> **This is an install, not an import.** `@modelcontextprotocol/{core,server,client}@2.0.0`
> are already in this workspace's `node_modules` — but as a *transitive*
> dependency of something else, which means nothing can import them by name.
> Step 1 begins by creating `apps/mcp/commerce` and adding `server` and `zod` as
> **direct** dependencies. Expect `pnpm install` before the first line runs.

**What it looks like:**

```ts
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const server = new McpServer({ name: 'thornbury-commerce', version: '0.1.0' });

server.registerTool(
  'ping',
  {
    title: 'Ping',
    description: 'Returns pong. Proves the wire works.',
    inputSchema: z.object({}),
  },
  async () => ({ content: [{ type: 'text', text: 'pong' }] }),
);

await server.connect(new StdioServerTransport());
```

**What you will see:** nothing. It waits on stdin. That is correct and it is
confusing the first time — a stdio server is not a service you visit, it is a
program something else spawns.

**So Step 1 ships a second file: `src/cli/handshake.ts`.** It spawns the server
and speaks **raw JSON-RPC** at it — deliberately not the client SDK, which hides
the handshake, and the handshake is the only part of Step 1 worth seeing. The
framing is one JSON object per line, verified rather than assumed:

```
require('@modelcontextprotocol/server').serializeMessage({...})
  -> '{"jsonrpc":"2.0","id":1,"method":"ping"}\n'
```

```bash
pnpm --filter @thornbury/commerce-mcp handshake
```

### ☑ DONE 2026-09-18 — and it corrected two things in this document

```
→ initialize    { protocolVersion: "2026-07-28", capabilities: {} }
← result        { protocolVersion: "2025-11-25",
                  capabilities: { tools: { listChanged: true } } }
→ tools/list
← result        1 tool · inputSchema { type: "object", properties: {} }
→ tools/call    { name: "ping" }
← result        { content: [ { type: "text", text: "pong" } ] }
→ tools/call    { name: "no_such_tool" }
← error         { code: -32602, message: "Tool no_such_tool not found" }
```

Two of those lines are corrections, not confirmations:

1. **We asked for `2026-07-28` and were given `2025-11-25`** — no error, no
   warning. `LATEST_PROTOCOL_VERSION` in this SDK is `2025-11-25`, and
   `2026-07-28` is a *separate* era reached through the HTTP handler, not
   through `initialize`. Step 7 is now where that gets settled.
   [`../beyond-retrieval/MCP.md`](../beyond-retrieval/MCP.md) §1.2 carries the
   correction.
2. **An unknown tool is `-32602`, not `-32601`** — see Step 6.

Neither would have been found by reading the SDK more carefully. Both took
twenty minutes of a server actually existing, which is the argument for Step 1
being a step at all.

**Stop here and check:** you can point at the line where the server named a
protocol version — and notice it is not the one you asked for.

---

## Step 2 · Look at the wire

**Goal.** See `initialize`, `tools/list` and `tools/call` actually happen, with
your own eyes, before any of it is hidden behind a loop.

**The tech:** `npx @modelcontextprotocol/inspector` (**2.7.0**) — the official
debugging UI. You point it at your server command; it spawns it, does the
handshake, and shows you every message.

**What to actually do:**

1. Run the inspector against the Step 1 server.
2. Read the `initialize` exchange. Find the `capabilities` object on **both**
   sides. Notice that your server declared `tools` and nothing else.
3. Call `ping`. Watch the request and the response.
4. Now call `ping` with an argument it does not declare, e.g. `{"x": 1}`, and
   with a malformed name. Note what comes back.

**Why this step exists and is not optional.** Step 6 asks you to classify
failures. You cannot classify what you have never watched happen. Twenty minutes
here saves a day later.

**Stop here and check:** you can point at the line in the inspector where the
client and server agreed a protocol version.

---

## Step 3 · A test that needs no ports

**Goal.** Prove a tool's behaviour in a normal test, with no subprocess and no
socket.

**The tech:** `InMemoryTransport`, exported from the same package. It gives you
a linked client/server pair in one process.

**Why it matters more than it sounds.** Everything we plant later —
a server that lies about its annotations, a tool that returns `isError`, a
connection that dies mid-call — gets planted over this transport. It is what
makes the checks in `PLAN.md` §11 possible at all. A protocol you can only test
by starting a server is a protocol nobody tests.

**Stop here and check:** a test asserts `ping` returns `pong`, and it runs in
milliseconds.

---

## Step 4a · The first tool that crosses the boundary — against a stub

**Goal.** `get_order` behaves exactly as it finally will, but the thing it calls
is a ten-line stub returning one hand-written order.

**Why do it this way first.** This is the step where the architecture becomes
real, and it is the last one that depends on nobody. Waiting for two other
sessions to finish before you can write the tool that *proves the boundary* has
it backwards. Everything the boundary teaches — no database credential, a
service token in a header, scope taken from the session — is fully learnable
against a stub, and Step 6's failure taxonomy needs no real data at all.

It is also the same instinct as `PLAN.md` §6.2, applied one layer up: put the
seam where the thing under test stops, not where the system does.

**The tech:** `fetch`, a base URL, and a **service token** in a header. That is
the entire client. No `pg`, no connection string, no ORM. Point
`COMMERCE_API_URL` at a local stub; the tool does not know the difference and
that is the point.

## Step 4b · Point it at the real backend

Swap the base URL for `:3610`. Nothing in the tool changes. If something does,
the stub was lying and it is better to find that out here.

**This is the step where the architecture becomes true.** Look at what the MCP
server's environment now contains:

```
  COMMERCE_API_URL      http://localhost:3610
  COMMERCE_API_TOKEN    the service token
```

and what it does **not** contain: any database credential. That is not a style
preference. It means that if this process is compromised, the damage is bounded
by what that token can reach — and *that* is a sentence about the backend's
authorization, which is a thing with tests. Had we put the MCP server inside the
Nest app, the same sentence would be unverifiable, because the process it lives
in holds five database pools.

**The one rule to get right now rather than later:**

> **Scope comes from the session, never from a tool argument.**

If `get_order(order_id)` lets the model pick the id, then anything that can
influence the model — including text a customer typed into a contact form — can
reach any order the token can reach. So the server resolves *the current case*
to its order, and anything else gets a structured "not in scope" answer.

**Stop here and check:** ask for an order that is not the session's, and get a
polite refusal rather than the order.

---

## Step 5 · Make the result typed

**Goal.** Add `outputSchema`, and return `structuredContent` alongside `content`.

**Plainly:** `content` is the human/model-readable part; `structuredContent` is
the typed object. Declaring `outputSchema` makes the **server** validate its own
output, so a handler that drifts from its contract fails at the server instead
of confusing the model three turns later.

**Stop here and check:** break the handler's return shape on purpose and watch
the server reject it.

---

## Step 6 · Break it on purpose — the most valuable step here

**Goal.** Produce each failure deliberately, and write down which bucket it lands
in. This *is* the harness work; everything after it is easier.

Five failures, and the buckets they map to
([`../beyond-retrieval/MCP.md`](../beyond-retrieval/MCP.md) §4 has the detail):

| make this happen | you should see | whose fault |
|---|---|---|
| call a tool that does not exist | JSON-RPC **`-32602`** — see the box | the **model** invented a capability |
| call a real tool with bad arguments | JSON-RPC **`-32602`** — the same code | the **model** used it wrong |
| a tool that ran and decided "no" | HTTP 200, `isError: true` | the **domain** — a legitimate answer |
| a tool that throws | the server turns it into an error | **infrastructure** |
| kill the server mid-call | nothing comes back | **infrastructure** |

> **The first row surprised us, and it is the best thing Step 1 produced.**
> Step 1's handshake ends with a deliberate call to `no_such_tool`. It does
> **not** return `-32601 METHOD_NOT_FOUND` as this document originally predicted:
>
> ```
> ← error   { "code": -32602, "message": "Tool no_such_tool not found" }
> ```
>
> Obvious in hindsight. `tools/call` **is** a method the server implements;
> `name` is one of its *parameters*, so a bad one is `INVALID_PARAMS`. `-32601`
> is for a JSON-RPC method that does not exist at all.
>
> **The consequence is the whole point of Step 6.** "The model invented a tool"
> and "the model used a real tool wrongly" arrive under the *same error code*.
> You cannot tell them apart from the error. You can only tell them apart by
> checking the name against the last `tools/list` — which the client is holding
> anyway.
>
> Notice also how this would have failed *quietly*: both causes are model-blame,
> so a check built on the wrong assumption would still have produced a
> right-looking total. Only the diagnosis would have been wrong, and nothing
> would have flagged it.

**Why this matters and is not pedantry.** The existing harness
(`packages/agent/src/core/tool.types.ts`) knows only two of these —
`unknown_tool` and `threw` — and its own comment warns that the line moves if a
tool starts rejecting model-supplied arguments. MCP moves that line. If bad
arguments get filed as `threw`, every mistake the model makes is recorded as a
plumbing failure, and every debugging hour points at the wrong thing.

And a measured detail worth knowing before you design around it: the two places
in this repo that read `cause` both do `tc.cause === 'threw'`. Widening the union
will **not** produce a compiler error. It will silently under-count failures.
That is why this step is deliberate rather than discovered.

**The rule to adopt:** a tool that ran and concluded "no" returns `isError: true`
with a readable explanation. **It does not throw.** Throwing turns a domain
answer into a protocol failure and you lose the distinction forever.

**Stop here and check:** five deliberate failures, five recorded outcomes, in a
table you wrote yourself.

---

## Step 7 · Move it onto HTTP

**Goal.** The server becomes a service on `:3620` instead of a subprocess.

**The tech:** `createMcpHandler` from the same package — a web-standard handler,
so it drops into any HTTP layer. (`@modelcontextprotocol/express` 2.0.0 and
`@modelcontextprotocol/hono` exist as adapters if we want one.)

**Two options to set on purpose, not by accident:**

- `legacy: 'reject'` — refuse the older protocol era outright. We have no old
  clients, and serving two eras means testing two behaviours.
- `responseMode` — leave it `'auto'`. Be aware that `'json'` **silently drops
  every mid-call notification**, so if progress updates ever vanish, this is the
  first thing to look at.

**Stop here and check:** the inspector from Step 2 connects over HTTP and
everything still works.

---

## Step 8 · Lock the door

**Goal.** The server refuses anyone without a valid token.

**The tech:** `requireBearerAuth` / `verifyBearerToken` from the SDK. A validated
token arrives at your handler as `AuthInfo`.

**The field that matters** is `AuthInfo.resource` — the RFC 8707 resource
identifier. Its own doc comment says it *"MUST match the MCP server's resource
identifier."* Without that check, a token minted for another service is accepted
here, and an MCP server is by design **more privileged than its caller**. That
combination has a name: the **confused deputy**.

**Stop here and check:** a token for the wrong audience is rejected. And — the
one that actually catches bugs — **unset the token variable entirely and confirm
everything is refused, not allowed.** The obvious implementation of a guard
fails open; `packages/guard` exists in this repo precisely to name that bug.

---

## Step 9 · The RAG tool

**Goal.** `search_policy` — hybrid search over the prose policy corpus.

**The tech:** `@fde/grounding`, already built: load → chunk → embed → store →
hybrid search (dense + full-text, fused by RRF).

**Two design points that are decisions, not details:**

1. **No score cutoff.** Search returns its best matches even when all of them
   are junk. Deciding "this isn't in our policies" is reading comprehension and
   belongs to the model. A threshold would turn "I don't know" into silence.
2. **The vector index lives on the MCP server's side of the boundary**, unlike
   every other tool. The five databases are the customer's systems of record;
   the chunk index is *ours*, built from `docs/commerce/corpus/`, rebuildable
   any time. Putting it behind the Nest API would mean adding a retrieval
   endpoint to the customer's backend for our convenience.

This is also the step where the domain gets interesting: `search_policy` reads
the **published** policy, and `get_policy_rules` reads the **configured** policy,
and they disagree on purpose. Two tools, not one, because a single "policy" tool
would have to pick a side, and picking is the failure.

**Stop here and check:** ask about something genuinely not in the corpus and see
what comes back — top-k junk, which is correct.

---

## Step 10 · Write the client

**Goal.** Our loop can call these tools.

**The tech:** `@modelcontextprotocol/client` 2.0.0, plus a small adapter that
turns an MCP tool into the `Tool` shape `ToolRegistry` already understands.

**Where it goes:** `packages/agent/src/mcp/` — beside `sdk/tools.ts` and
`mastra/tools.ts`, because it is the same job they do (convert a foreign tool
representation into ours). **Not** a new `@fde/mcp` package: this repo extracts
a package after a second consumer exists, never before, and there is one.

**The step that teaches the most, and the one everyone skips.** Until you have
written a client, "capability" reads like configuration. After, it reads like a
contract you are on the hook for — because the server can only do what your
client said it could. Concretely: **elicitation** (the server asking the human
"confirm this £340 refund") requires the client to declare
`elicitation.create`. None of this repo's three loop engines is an MCP client at
all, so that feature is not free, and the approval step in Step 11 is ours to
build rather than the protocol's to provide.

**Stop here and check:** one question, through the real loop, answered from the
MCP server.

---

## Step 11 · The guard — and the trap in it

**Goal.** The model can propose a resolution. It can never move money.

**The trap, and it is a good one.** MCP lets a tool describe itself with
`annotations: { readOnlyHint: true, destructiveHint: false, … }`. The obvious
client design is to auto-approve anything marked read-only.

The SDK's own comment, directly above that schema, says not to:

> *"all properties in `ToolAnnotations` are **hints**. They are not guaranteed to
> provide a faithful description of tool behavior … Clients should never make
> tool use decisions based on `ToolAnnotations` received from untrusted servers."*

An annotation is a claim made by **the thing being guarded**. A guard that
believes it fails open.

**So:** the gate is a **client-side allowlist of tool names**, living next to the
prompt. Annotations are still published — they are genuinely useful to a human
reading `tools/list` — and treated as documentation only.

Three plants prove it, and the third is the one that matters:

```
1  a server that flips readOnlyHint:true onto issue_refund  → still refused
2  a server that renames issue_refund to fetch_refund_status → still refused
3  an EMPTY allowlist  →  EVERY write refused, not every write allowed
```

**Stop here and check:** plant 3 passes. If an empty allowlist allows
everything, you have written the bug the guard exists to prevent.

---

## Step 12 · Find out what it cost

**Goal.** Answer the question the whole engagement is for: *what did MCP cost us
that the in-process tool did not?*

**The experiment:** the same twelve questions, twice. One arm registers seven
tools in `ToolRegistry` whose bodies make **the same HTTP calls to the same Nest
endpoints**. The other goes through the MCP client. Only the transport to the
model differs — which is the only way the difference is attributable to MCP
rather than to the API hop.

**What to record:** tool latency (p50/p95) · tokens in the `tools` block · turns
to a valid answer · the failure histogram from Step 6 · and one number that
catches a silent disaster:

> **`cache_read_input_tokens`.** Prompt caching is a prefix match and `tools`
> renders **first** — before the system prompt, before the messages. An MCP
> `tools/list` is assembled by a server, possibly out of a `Map`. If the order
> is not stable, or a description carries a build version, the entire cached
> prefix is invalidated on every request. The bill goes up, latency goes up, and
> **every individual answer is still correct.** Nothing goes red.

So the last check is embarrassingly simple and almost nobody writes it: **call
`tools/list` twenty times and assert the serialized block is byte-identical.**

**Stop here and check:** you have a number. If it says MCP cost us latency and
tokens and bought a boundary a NestJS module would also have bought, **that is a
real finding and we write it down.** Given that we deliberately chose the
separate-deployable form to make the boundary visible, it is also the likely one.

---

## What we need before which step

| step | needs |
|---|---|
| **0 – 4a, 5, 6** | **nothing.** A stub stands in for the backend. |
| 4b | the NestJS backend answering on `:3610` (*fde-assistants-11*) and the seeded estate behind it (*fde-assistants-2d*) |
| 7 – 8 | nothing new |
| 9 | `docs/commerce/corpus/` written, and ingested |
| 10 – 12 | everything above |

**Seven of the twelve steps depend on nobody** — including Step 6, which is the
most valuable one. That is not an accident of scheduling; it is what splitting
Step 4 bought. We start at Step 0 and keep going until 4b actually blocks.
