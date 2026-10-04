# Building the MCP server, one small step at a time

*Written 2026-09-18. A build-along, not a reference —
[`../beyond-retrieval/MCP.md`](../beyond-retrieval/MCP.md) is the reference and
this is the doing. Each step is roughly one sitting, ends somewhere the work can
stop, and says plainly what it is for.*

**Who is doing what right now.** The five databases and the NestJS backend
(`apps/backend`) are being built by two other sessions. This document is the
third strand: the MCP server that sits between the model and everything they
build. **Nine of the fourteen steps need neither of them** — 0 through 4a, plus
5, 6, 7 and 8 — which is deliberate, and means we start now rather than waiting. The
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

### ☑ DONE 2026-09-18 — and it qualified Step 6's taxonomy

The inspector has three modes: `--web` (the clickable UI, the default), `--tui`,
and `--cli` (scriptable). The CLI mode is what is recorded here because it can be
captured; **run the web UI yourself** — it is the one that shows the message log
as a list you can click through:

```bash
cd apps/mcp/commerce
npx -y @modelcontextprotocol/inspector@2.7.0 npx ts-node src/server.ts
```

What the CLI proved:

```
--method tools/list              → our one tool, with the JSON Schema the model
                                   would see
--method tools/call ping         → { content: [ { type: "text", text: "pong" } ] }
--method tools/call no_such_tool → stderr:
      {"error":{"code":"tool_not_found",
                "message":"Tool 'no_such_tool' not found on server."}}
      exit code 5
```

**The first line is the point of Step 2.** A client we did not write, from a
different package, spawned our server, negotiated with it and used it. Until
now the only thing that could talk to it was our own handshake CLI — which
proves a program can talk to itself. This proves it is an MCP server.

**The third line is the finding, and it changes Step 6.** Look at the same
failure in two places:

```
  raw wire (Step 1)   { "code": -32602, "message": "Tool no_such_tool not found" }
  the inspector       { "code": "tool_not_found", "message": "Tool '...' not found on server." }
```

The inspector **rewrote the error into its own vocabulary** — a *string* code
where the protocol has a *number*, and a different message. It also put it on
**stderr**, not stdout, and signalled it by **exit code 5**.

So the failure taxonomy is not purely a property of the protocol. **It is a
property of the protocol AND the client you use.** A client that normalises
errors can hand you a cleaner discriminator than the wire has (`tool_not_found`
is *exactly* the distinction Step 1 discovered the numeric codes cannot make) —
or it can flatten a distinction you needed and never tell you.

The rule that follows: **write the discriminator against the client you actually
ship, and verify it there.** Not against the wire, and definitely not against
whatever a debugging tool prints.

> **A note on how this was nearly got wrong.** The first run of that command was
> piped into `head`, so `$?` reported `head`'s exit status — 0 — and the draft of
> this section said "the CLI does not signal failure via exit code." It does;
> it exits 5. Re-running it without the pipe is the only reason that sentence is
> not in the document. A measurement taken through a pipe measures the pipe.

**Stop here and check:** you can point at the line in the inspector where the
client and server agreed a protocol version — and you have seen the same failure
described two different ways by two different clients.

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

**The repo has no test runner**, deliberately — *"each pillar's correctness is
asserted by its own `*-selftest.ts`"*. So this is `src/wire-selftest.ts`, run by
`pnpm commerce:mcp-check`, shaped like `packages/guard/src/selftest.ts`: named
cases, a `why:` line on each, and a negative control for the harness itself.

### ☑ DONE 2026-09-18 — ten checks, and one of them broke the plan

```
CONTROLS — the server can succeed
  ok  the real server answers ping with pong
  ok  tools/list publishes exactly the tools we registered
PLANTED FAILURES
  ok  an unknown TOOL is -32602, not -32601
  ok  a tool that refuses returns isError on a 200, not a JSON-RPC error
  ok  a tool that throws is converted into isError, not a dead connection
  ok  arguments that violate the schema are rejected before the handler runs
WHAT THE PROTOCOL DOES NOT CARRY
  ok  a refusal, a throw and a schema violation are ALL isError:true
  ok  only the validation one is identifiable, and only by a message PREFIX
  ok  an undeclared argument is silently accepted
THE HARNESS ITSELF
  ok  the harness counts a failure when one happens
```

**The three-line block is the finding, and it is the biggest one so far.**
Step 6's taxonomy has five buckets with different owners. Three of them arrive
in **one wire shape**:

```
DOMAIN refusal   isError=true  text="not in scope for this case"
THROWN           isError=true  text="socket is on fire"
BAD ARGS         isError=true  text="Input validation error: … received number"
```

Only the last is identifiable, and only by a message prefix. The other two are
free text a tool author picked.

**This is the reverse of what the plan assumed.** §6.1 was drafted arguing MCP
gives you *more* failure resolution than an in-process function — five buckets
where there were two. It gives **less**. `registry.ts` tells a throw from a
return *structurally*, by catching one of them; MCP flattens that to a boolean
before it reaches us.

So from Step 5 onward, **every Thornbury tool carries its own outcome in
`structuredContent`** — `{ ok: false, cause: 'out_of_scope' }` — and the
discriminator reads that. The protocol will not carry it for us.

The general lesson, worth more than the MCP detail: **a boundary that serialises
does not preserve what your type system was preserving.** Nothing announced the
loss. Every call still worked.

**Stop here and check:** `pnpm commerce:mcp-check` is green, **and** the negative
control prints one deliberate `FAIL` before reporting all-passed. A harness that
cannot fail proves nothing.

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

### ☑ DONE 2026-09-18 — six checks, and the control caught its own obsolescence

```
STEP 4a — THE BOUNDARY, against a stub the shape of the real API
  ok  get_order reads a real order across the boundary
  ok  the prior refund is in the payload, not hidden behind the order total
  ok  get_order publishes NO parameters at all
  ok  a case that does not own this order gets out_of_scope, not the order
  ok  and the refusal says nothing about whether the record exists
  ok  an unset service token refuses the call
  ok  the cause is readable from structuredContent, not guessed from prose
```

**`get_order` takes no arguments.** Not a validated `orderId`, not an optional
one — none. The order is fixed by the session before the model runs. A tool with
an `orderId` parameter would let anything that can influence the model reach any
order the service token can reach, and what can influence the model includes
text a customer typed into a contact form (T5). The check asserts the published
`inputSchema` has zero properties, so the property is visible in `tools/list`
rather than asserted in a comment.

**Two files carry the rest of the argument.** `src/api/client.ts` needs a base
URL and a service token and nothing else — no connection string, no `pg`. That
emptiness is the deliverable. And `register()` in `server.ts` sets
`structuredContent` and `isError` from **one** place, so a tool author never
writes the line that carries the cause and therefore cannot forget it.

> **The control went red, and it was right to.** `tools/list publishes exactly
> the tools we registered` asserted `tools.length === 1`. Registering `get_order`
> turned it red — correctly, but it could only say *the number changed*, so the
> obvious fix was to type a new number. **A check whose only repair is to update
> its expectation teaches you to silence it.** It now asserts the *set* of
> names, so an unexpected tool is reported by name and a missing one likewise —
> which also happens to be what §7's write-path allowlist gates on.

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

### ☑ DONE 2026-09-18 — and it was NOT a base-URL change

The step's own claim was that going from stub to live is a base URL and nothing
else. **It was not, and the way it failed is the lesson.**

```
  OK — the order came back across the boundary
    Order undefined, placed undefined, status undefined.
    Total undefinedp across 2 line(s).
  isError            false
  structuredContent  ok:true
```

`ok: true`. `isError: false`. Every scalar `undefined`. **Nothing failed.** The
real payload nests under `order` and names things differently; the stub was flat
and had been lying, and Step 4a's six green checks were green about a fiction.

**A silently wrong success is the worst available failure.** A 500 is loud. A
refusal is labelled. This is neither, and it is what an unvalidated boundary
produces by default — because `getJson<Order>` was a **cast**, and a cast tells
the compiler what to believe rather than checking anything.

Three changes came out of it:

1. **The boundary parses.** `getJson` now takes a Zod schema rather than a type
   parameter, so there is no overload that skips the check. A payload that does
   not match is `malformed_response` — a named, countable outcome — and the
   message names the field: *"customer.userId: expected string, received
   undefined"*. That arrived on the very next run and was right.
2. **A sixth cause.** `malformed_response` is ours, not the API's vocabulary. A
   contract violation is neither the API refusing nor the plumbing failing, and
   calling it either would hide it.
3. **`commerce:mcp-round-trip`** — asserts the same schema parses the stub AND
   the live API. This is the check §6.2 promised when it put the fixture seam at
   the client boundary and admitted the cost. **It caught a drift on its first
   run** (I had corrected the schema and not the stub), which is the best
   possible first result for a check of that kind.

> **Two field names, guessed twice, both wrong.** `customer.id` then
> `customer.userId`. The compiler was content both times, because a cast cannot
> disagree and a schema can. The habit this replaces: read the shape off the wire
> with `curl` before writing the interface — it takes one command and it is the
> difference between a contract and a wish.

## Step 5 · Make the result typed

**Goal.** Add `outputSchema`, and return `structuredContent` alongside `content`.

**Plainly:** `content` is the human/model-readable part; `structuredContent` is
the typed object. Declaring `outputSchema` makes the **server** validate its own
output, so a handler that drifts from its contract fails at the server instead
of confusing the model three turns later.

**Stop here and check:** break the handler's return shape on purpose and watch
the server reject it.

### ☑ DONE 2026-09-27 — the server does reject it, and throws the cause away doing so

Half of this was already done: `structuredContent` has carried the outcome since
4a, and 4b made the boundary **parse** what comes in. What was missing was the
tool **declaring** what goes out. `register()` now wraps each tool's `data`
schema in the outcome envelope, publishes it as `outputSchema`, and checks every
result against it. Seven checks in `commerce:mcp-check`, each one a scratch
measurement first:

```
  MEASURED (SDK 2.0.0)                                          what it means here
  ───────────────────────────────────────────────────────────────────────────────────────
  bad success, plain registerTool   isError:true, NO structuredContent,   the SDK's check
                                    "Output validation error: …"          ERASES the cause
  isError result, wrong shape       passes untouched, label intact        both sides skip it
  success/failure union published   {type:"object", oneOf:[2]} —          safe — and pinned,
                                    nothing re-nested on 2025-11-25       not assumed
  lying server, client LISTED first -32602 "does not match the tool's     -32602 now has TWO
                                    output schema"                        meanings
  lying server, client never listed accepted SILENTLY                     no list, no check
```

**The step's own check passes and is not enough.** Break the shape and the
server does reject it — by replacing the whole result with prose. A bug in our
own tool would reach the model with no cause: the blind spot Step 6 had just
closed at the API boundary, reopened one layer up. So `register()` checks
**first**, via `conforming()`, and a mismatch becomes `invalid_output` — an
**eighth cause**, ours: the payload already passed the inbound parse, so the
fault is in what the tool did with it. Not `threw` (nothing raised, and Step 6
made that word mean exactly that); not `malformed_response` (that is the API's
contract breaking). Once the result is `isError`, the SDK leaves it alone.

**Both halves are published, not just the success.** The SDK only validates
successes, so a success-only schema would pass every check and leave the half
that carries the cause undeclared. A union *looks* like a non-object root, and
on the 2025 era the SDK re-nests `structuredContent` under `{result: …}` for
those — which would move `ok` and `cause` out from under every reader. It does
not happen, because the SDK publishes this union as `{type: "object", oneOf}`.
**That is one SDK version's behaviour, so a check pins it.**

`Tool.data` is **required**: optional would mean the first tool that forgot it
shipped untyped, silently. It caught the existing unguarded-tool plant on the
first compile.

**Verified by sabotage:**

```
  register() stops checking output      → 1 red: the labelled invalid_output check
  outputSchema not published            → 1 red: the object-rooted check
  schema publishes the success only     → 3 red — including out_of_scope: every
                                          legitimate REFUSAL became invalid_output
```

The third is the argument for both halves in one line: a success-only schema is
not merely incomplete, it turns every domain answer into our bug.

**And against live data, not just the stub.** Every check above that calls
`get_order` runs against the stub — and a client that has listed tools does not
use Zod: it checks the **published JSON Schema** with its own validator. The
stub's `promisedBy` is a timestamp where the live API sends a bare date, and its
one order cannot vary the way the trap orders do (T3's prior refunds, T4's
marketplace seller). So `commerce:mcp-round-trip` now sends **all 13 reserved
trap cases** through the whole path — `createServer`, `listTools` first, then
`get_order` — and asserts no throw, `ok: true`, the right order. **13 of 13,
first run.** Pair one case with the wrong order and it goes red naming the case.
Had any failed, every successful `get_order` would have reached Step 10 as
`-32602`.

> **The finding that reaches beyond this step.** Once any tool declares an
> output schema, **`-32602` from `tools/call` has two meanings** — an unknown
> tool name, or a server whose output broke its own advertised schema. Our
> server cannot produce the second (it checks twice first); a server we do not
> control can. The structural way to tell them apart is **whether the name is in
> the last `tools/list`** — the cross-check the Step 6 box below had downgraded
> to belt-and-braces, and which Step 10's discriminator now needs. And Step
> 10's client must **always list before calling**: the client's output check
> reads a schema it cached from `tools/list`, and without one it switches off
> without a word.

---

## Step 6 · Break it on purpose — the most valuable step here

**Goal.** Produce each failure deliberately, and write down which bucket it lands
in. This *is* the harness work; everything after it is easier.

Five failures, and the buckets they map to
([`../beyond-retrieval/MCP.md`](../beyond-retrieval/MCP.md) §4 has the detail):

| make this happen | you should see | whose fault |
|---|---|---|
| call a tool that does not exist | JSON-RPC **`-32602`**, thrown | the **model** invented a capability |
| call a real tool with bad arguments | **not** a JSON-RPC error — a returned `isError: true` | the **model** used it wrong |
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
> **▲▲ AND THE SENTENCE THAT FOLLOWED IT HERE WAS WRONG — corrected 2026-09-18.**
>
> This box originally concluded: *"the model invented a tool" and "the model used
> a real tool wrongly" arrive under the same error code, so you can only tell
> them apart by checking the name against the last `tools/list`.*
>
> **Step 3 measured it and they do not.** Bad arguments never reach the JSON-RPC
> error channel at all — they come back as a returned result with
> `isError: true` and a text block beginning `"Input validation error:"`. So
> **`-32602` from a `tools/call` means exactly one thing: a tool name nobody
> registered.** That channel is *cleaner* than Step 1 guessed, not muddier, and
> the `tools/list` cross-check is belt-and-braces rather than the load-bearing
> step this box claimed.
>
> **▲▲ TRUE UNTIL STEP 5, AND NOT AFTER — qualified 2026-09-27.** Once a tool
> declares an `outputSchema`, a client that has listed tools also throws
> `-32602` when a **known** tool's output breaks its advertised schema
> (*"Structured content does not match the tool's output schema"*). So there are
> two meanings again, and the `tools/list` cross-check is load-bearing again —
> the name is in the list for one and absent for the other. Asserted by
> `probeLyingServer`. See Step 5's ☑ box.
>
> The collapse is real. It is somewhere else, and it is worse — see the rows
> below.
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

### ☑ DONE 2026-09-27 — the protocol was right; the boundary behind it was not

The five rows above were already measured, offline, by `commerce:mcp-check` —
Step 3 produced every one. What that suite cannot reach, by design, is the
**backend** misbehaving, and that is where all the defects were.
`pnpm commerce:mcp-break` (`src/break-live.ts`, needs `:3610`) drives `get_order`
into each failure, run exactly as `register()` runs it, and asserts the cause it
**should** land as. Its first run was the measurement — **9 of 14 red:**

```
  make this happen                          landed as (BEFORE)        should be               owner
  ────────────────────────────────────────────────────────────────────────────────────────────────────
  live API, the session's own order         ok                        ok                      — control
  live API, another case's order            out_of_scope              out_of_scope            domain
  live API, a case id naming no case        invalid_request           invalid_request         our wiring
  live API, WRONG service token (401)       upstream_unavailable  ✗   unauthorized            our config
  our token UNSET                           invalid_request       ✗   unauthorized            our config
  dead port (ECONNREFUSED)                  threw                 ✗   upstream_unavailable    infrastructure
  accepts, never answers                    HUNG FOREVER          ✗   upstream_unavailable    infrastructure
  200, body cut off mid-write               threw                 ✗   upstream_unavailable    infrastructure
  200, complete, not JSON                   threw                 ✗   malformed_response      contract
  404 from Nest, no envelope                upstream_unavailable  ✗   malformed_response      contract
  the API's real 400 {error, problems}      upstream_unavailable  ✗   invalid_request + field contract
  MCP server SIGKILLed mid-call (stdio)     rejected, 10ms, CONNECTION_CLOSED — already right
```

**Every ✗ had the blame roughly right and the diagnosis wrong,** which is the
failure PLAN.md §6.1 warned a totals-based check cannot see. `threw` says "the
tool's own code raised" and sends the reader into this package, when the fault
was a process that was not running. `upstream_unavailable` on a 401 says "try
the network" while the token sits wrong in `.env`. And `invalid_request` for an
unset token is the API's word for a request that broke its contract — the
**model's** kind of mistake as soon as a tool takes arguments — so it would have
blamed the model for our configuration.

**Why the protocol suite never saw any of it:** `fetch()` and `res.json()`
*throw*, and `guarded()` — correctly, and by design — turns any throw into
`threw`. The transfer failing and our code failing were the same event to it.

The fixes, all in `api/client.ts`:

1. **The transfer is caught as one step, body included,** and labelled
   `upstream_unavailable`. That leaves `threw` meaning what it says.
2. **A timeout — `AbortSignal.timeout`, 15s.** `fetch` has none by default.
   Fifteen is set by two measured bounds: the MCP client gives up at **60s**
   (`DEFAULT_REQUEST_TIMEOUT_MSEC`), and if it gets there first the call dies
   *unlabelled*; and a cold call is slow — `/health` took ~2.2s per pool, and a
   warm `/orders/ORD-101414` ~0.58s. **The probe proved the lower bound by
   flaking:** its first version gave every call a 1s timeout, and the control
   went red on the first run after idle.
3. **`unauthorized`, a seventh cause,** for a 401 and for an unset token. Ours,
   not the API's vocabulary — the API says it with a bare `{error, reason}`.
4. **Each non-envelope status is read for what it is:** 400 → `invalid_request`
   *keeping the field and rule*; non-JSON or no envelope → `malformed_response`;
   the API's own 503 ("no token configured on *its* side") stays
   `upstream_unavailable` — our token may be fine, and it is refusing everyone.

**Verified by sabotage.** Each fix was removed in turn and the suite re-run:
every removal turned exactly its own check red and nothing else. Also added: the
**schema-drift control** that `round-trip.ts` claims and does not have — its
"negative control" plants an `out_of_scope` refusal, not drift. The new one
serves Step 4a's real flat order behind `ok: true`; skip the parse and it goes
red. *(The mislabelled one in `round-trip.ts` was renamed at Step 5 to what it
asserts — `probeRefusalIsNotSuccess`.)*

> **Found on the way and NOT fixed here — it is the API's.** The 401 body says
> `"reason": "x-api-key does not match"`. This API's header is
> `x-service-token`; the text comes from `@fde/guard`, which the API reuses and
> which hardcodes its own header name. An operator following that message looks
> for a header that does not exist. `client.ts` deliberately does not repeat it.

---

> **▲ BETWEEN THE STEPS, 2026-09-27 — the read tools these fourteen never
> scheduled.** Step 4 built `get_order`; Step 9 builds `search_policy`. Nothing
> here ever built `get_delivery`, `get_contact_history` or `get_policy_rules`,
> which PLAN.md §5.1 lists — and without them the assistant could reach one trap
> of six. They are built now, on the Step 5/6 machinery (`register()`, published
> output schemas, labelled causes), and `commerce:mcp-round-trip` sends all 13
> trap cases through every tool as a listing client, checking each trap against
> the hand-worked answer key. `get_delivery` also carries the carrier SLA verdict,
> because no planned tool reached `/policy/sla` — found by the answer-key session.
> Deliberately **not a numbered step**: the surface derives its progress from
> these numbers. Detail: NEXT.md §9.

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

### ☑ DONE 2026-09-27 — Steps 7 and 8, together, because 7 alone is an open door

`src/http.ts`. An HTTP listener serving a customer's orders and messages to
anyone who can reach the port is worse than no Step 7, so the transport and the
lock landed in one file, and **`server.ts` did not change**: `createServer({ api,
session })` already separated building from transport, so HTTP is one more caller
of it — one server per request, which is what `createMcpHandler`'s factory wants.
A request has to get past four gates, each with its own status:

```
  Host / Origin not loopback              403   the SDK's own validation, in front
  COMMERCE_MCP_TOKEN unset                503   EVERY request — fail closed
  bearer not this server's                401   incl. the API's own service token
  x-case-id missing or unknown            400   NEVER defaulted
```

**The Step 7 question, answered by running it** (§5.4 of NEXT.md): the HTTP
handler DOES negotiate `2026-07-28` — **when the client opts in.** The SDK
client's default is the 2025 handshake:

```
  server legacy   client versionNegotiation     result
  reject          'legacy'  (the SDK DEFAULT)   REFUSED  -32022 Unsupported protocol version
  reject          'auto' or { pin }             2026-07-28, modern
  stateless       'legacy'                      2025-11-25, legacy
  stateless       'auto' or { pin }             2026-07-28, modern
  inspector 2.7.0 --cli over HTTP               2025 → refused under reject, works under stateless
```

**`legacy: 'reject'` is kept, and its cost is measured rather than assumed**:
the inspector is refused over HTTP (it still works over stdio, which is how
Step 2 used it), and Step 10's client MUST pin `versionNegotiation` or it cannot
connect at all. One era, one behaviour to test. Overrule it by passing `legacy:
'stateless'` — the check that pins it will say so.

**The case, per request.** Over stdio one process is one case; over HTTP it
arrives with each request, from the AUTHENTICATED caller — a model can choose
tool arguments, not HTTP headers — and rides into the factory inside
`AuthInfo.extra`. The ORDER is resolved from it by the API's new `GET /case`, so
`session.ts`'s "resolved from the case, not chosen" is now literally true.
**The trap it refuses:** `sessionFromEnv()` defaults to CAS-90001 so the stdio
demos work; reused here, a request with no case header would be served T1's
customer's data.

**The inbound secret is not the API's.** `COMMERCE_MCP_TOKEN` is what the desk
presents here; `COMMERCE_SERVICE_TOKEN` is what this server presents to the API.
The API's token presented here is refused — with a static secret, that IS the
wrong-audience test. Compared in constant time (the same three lines as
`@fde/guard`'s).

`pnpm commerce:mcp-http-check` — 14 checks, offline (the stub grew `GET /case`).
It also re-measures Step 5 on the MODERN era, which Step 5 never saw: every
output schema object-rooted, `structuredContent` un-nested, and `-32602` for a
known tool whose output breaks its schema. And `commerce:mcp-round-trip` now
sends all 13 trap cases over HTTP on 2026-07-28 with ONLY the case header — every
order `GET /case` resolved is the one ESTATE.md §0 names.

**Verified by sabotage — and one check failed its own:** the classic fail-open
(skip the check when the secret is unset), no Host validation, and `legacy:
'stateless'` each turned exactly their check red. **Defaulting a missing case did
NOT, first time**: the check asserted only `400`, from a raw 2025-shaped request —
and `legacy: 'reject'` answers THAT with a 400 before the case gate is reached.
Two refusals, one status. It now asserts the REASON and asks as a real modern
client, and goes red on the plant.

> **▲ And the write, since it shares the machinery — `propose_resolution`.** The
> model supplies `kind` and `amountPence` and nothing else that matters: the
> case is the session's, and `proposedBy` is FIXED by the server, because the
> API stores it as free text and a model argument is how T5b's "Dave already
> approved it" would write "Dave" into the record. `commerce:mcp-check` sends
> `caseId`, `proposedBy` and `approvedBy` anyway and asserts what the stub
> RECEIVED. `issue_refund` is defined (`tools/issue-refund.ts`) and **not
> registered**, so Step 11's guard has something real to refuse. **PLAN §14 q4 —
> "is propose_resolution a write at all?" — YES**: a draft other people read.
> So the allowlist is of state changes, and "spends money" is a smaller set
> nothing in which is ever allowed.

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

### ☑ DONE 2026-09-27 — and the search reproduces T2's trap by itself

**The index** (built by a worker session; `apps/ai/commerce/src/grounding/`):
database `thb_kb` on the commerce Neon project — a sixth database, not one of
the estate's five, and `db-reset` leaves it alone — table `policy_chunks_local`,
384-dimension local embeddings, **83 chunks from 12 documents**. **This server
reads it as `thb_kb_reader`**, a role that can SELECT one table: `commerce:kb-check`
proves INSERT, CREATE TABLE and CREATE TEMP are refused (`42501`), and that the
ingest and the query name the same table and dimension. `COMMERCE_KB_URL` is the
only database credential this process holds, and it cannot change anything.
`CREATE ROLE … LOGIN PASSWORD` works over SQL on this Neon project — MEASURED.

**The tool** returns six passages, no cutoff, each carrying its citation in the
answer key's exact shape (`policy:CON-CAR-NEXDROP-2025#2`), its **audience**
(published / internal) and **status** (current / superseded / retired). Either
can be a filter the database applies. With `COMMERCE_KB_URL` unset it refuses,
labelled `unauthorized`. The embedding model loads in THIS process on the first
query: **2.3s first, ~1.9s warm** — mostly Neon round trips, and Step 12 must not
read the difference as protocol cost.

The stop-check, run: a third-party-seller warranty question (T4, which no
document covers) returns **six** passages, `BUL-HV-2025-01#3` first — the junk is
correct. T6's question returns `CON-CAR-NEXDROP-2025#2` first.

> **▲ MEASURED — the finding.** For the T2 question an adviser would actually
> type — *"how long does a customer have to return an electronics item"* — the
> top six are **all** 14-day electronics sources: `POL-RET-001 Rev 2`
> (superseded), `BUL-RET-2025-03` (internal), `NOTE-ELEC-2022` (retired). The
> **current published** Rev 3 — 30 days, every category — is not among them;
> asking for `audience: published` reaches it (`#3`). Retrieval reproduces T2's
> trap on its own: the labels are right, so a careful reader sees its only
> published hit is superseded, and a naive one answers 14 days. The retrieval
> eval had not caught it because each of its T2 queries NAMES the document it
> expects; `ret-t2-005` is the natural question, kept as a miss (recall@6 0.938
> → **0.912**), not tuned away.

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

### ☑ DONE 2026-09-27 — the loop never knew the tools were in another process

`packages/agent/src/mcp/tools.ts` — `mcpTools(client, { allow, infrastructureCauses })`.
It takes a client **by shape** (`listTools`, `callTool`), so `@fde/agent` gained
no SDK dependency and every behaviour is testable offline with a fake
(`pnpm mcp-adapter:check`, 13). It **lists first** — which is also what switches
the SDK client's own output check on (Step 5) — converts each published JSON
Schema into the Zod object the three engines already consume
(`z.fromJSONSchema`), and **maps failures into the registry's EXISTING two
causes**, so the two eval runners that read `cause === 'threw'` did not change:
a server label that means infrastructure is thrown (recorded `threw`, label in
the message); a domain answer is returned for the model to read; a rejection —
transport, or `-32602` for a LISTED tool — is `threw`; a name the model invents
is the registry's own `unknown_tool`. Widening the union (PLAN §6.1's five-way
discriminator) is left for when a consumer needs it.

This engagement's client (`apps/ai/commerce/src/agent/mcp-client.ts`) holds the
MCP URL, the inbound token and a case id — not the API's token, not a database
credential — and **pins `versionNegotiation`**, without which it cannot connect
to a `legacy: 'reject'` server at all.

**The stop-check, run** (`pnpm commerce:ask-mcp`, mastra + gemini-3.5-flash-lite,
CAS-90003): *"What was ordered on this case, and has any part of it already been
refunded?"* → one `get_order` over MCP → the three lines, and **"a prior partial
refund (REF-000130) of £22.00 … against the Hensley oxford shirt (ORD-100931-L2)"**
— the answer key's T3 fact, line L2. A smoke test, not a scorecard: the system
text is two sentences and says nothing about traps, because the judgment layer
is not written and coaching here would make the evals measure this file.

> **▲ Found while wiring it — the PROCESS held the credential the CODE did not.**
> The MCP server loaded the whole workspace `.env`, so `ECOMMERCE_DB_URL` — the
> estate admin role — sat in its environment, unread. Now `loadEnv` is an
> allowlist (`COMMERCE_*` + `EMBEDDINGS`), `commerce:mcp-check` asserts it on a
> planted file, and the client spawns the server with a minimal environment.

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

### ☑ DONE 2026-09-27 — plant 3 passes, and the list is of what the model SEES

`apps/ai/commerce/src/agent/allowlist.ts`. The list is every tool the model may
be shown — reads and the one permitted write — because PLAN §14 q4's answer is
that a draft IS a write (other people read it) and "write" does not mean "spends
money". `pnpm commerce:guard-check`, 13 checks, needs the API:

```
  PLANT 1  issue_refund, annotated readOnlyHint:true   → withheld
  PLANT 2  the same tool renamed fetch_refund_status   → not shown
  PLANT 3  an EMPTY allowlist                          → nothing shown, zero calls reach the server
  real server: registered = published ∩ allowed; issue_refund not published at all
  every outcome label the server PUBLISHES is classified by the client
      (an unclassified one would be returned to the model as an answer — fail open)
  tools/list byte-identical call to call, and equal to a REVIEWED snapshot
      (tools.snapshot.json — a description change is a prompt change; --accept after review)
  ONE live write on an ordinary case (CAS-00004), read back by get_contact_history,
      deleted by its fixed proposer label, deletion asserted
```

**Verified by sabotage:** `issue_refund` added to the list turns the policy check
and plant 1 red; a server label left unclassified turns the classification check
red; a tool description changed without review turns the snapshot check red.
The mechanism's own plants (`mcp-adapter:check`): an empty list read as "no
restriction" and trusting `readOnlyHint` each turn exactly their plant red — once
two plants stopped sharing a counter, which had made one plant's leak fail the
other under the wrong name.

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
| **0 – 4a, 5** | **nothing.** A stub stands in for the backend. |
| 6 | **half and half — corrected 2026-09-27.** The protocol half needs nothing (`commerce:mcp-check`, offline). The boundary half needs the API on `:3610` (`commerce:mcp-break`), **and every defect Step 6 found was in that half.** "Needs nothing" was true of the part that had already passed |
| 4b | the NestJS backend answering on `:3610` (*fde-assistants-11*) and the seeded estate behind it (*fde-assistants-2d*) |
| 7 – 8 | **nothing.** Moving the transport onto HTTP and putting `requireBearerAuth` in front of it touches no database and no API — Step 8's check (unset the token, confirm everything is refused) positively *wants* no backend |
| 9 | `docs/commerce/corpus/` written, and ingested |
| 10 – 12 | everything above |

**Nine of the fourteen steps depend on nobody** — including Step 6, which is the
most valuable one. That is not an accident of scheduling; it is what splitting
Step 4 bought. We start at Step 0 and keep going until 4b actually blocks.
