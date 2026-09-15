# Agentic RAG — retrieval becomes a tool the model may call, and may call again

**Status: BUILT HERE, AND MEASURED.** Both shipped engagements are agentic RAG.
The tool-calling loop is `@fde/agent`, running on three interchangeable engines;
the tools are the engagements'. The *cited* part is the taxonomy and the
techniques this repo has not built — Self-RAG's learned reflection tokens,
Adaptive-RAG's complexity router, multi-agent orchestration.

*Research date 2026-09-15. External sources carry a URL and the date fetched.*

---

## 1 · The plain version

In ordinary RAG the order is fixed and decided before the model ever runs:

```
  question ──► search ──► stuff the results into the prompt ──► answer
```

One search. One query — the user's words, verbatim. One shot. If the search was
wrong, the model gets junk and answers from junk, because it has no mechanism
for saying *"that is not what I asked for, let me try different words."*

Agentic RAG removes the arrow. Retrieval stops being a pipeline stage and
becomes a **tool** — a function the model can decide to call, with arguments it
writes itself, as many times as it needs, in whatever order it chooses:

```
  question ──►┌──────────────────────────────┐
              │  model                        │
              │   ├─ "I need the policy form" │──► search_policy(form="PP 00 01 06 24")
              │   ├─ reads it                 │◄── 5 passages
              │   ├─ "there's an endorsement  │
              │   │   referenced — get it"    │──► search_policy(query="rental reimbursement endorsement")
              │   ├─ reads it                 │◄── 5 passages
              │   ├─ "who is the holder?"     │──► get_policyholder(id="AUT-4471")
              │   └─ now answers              │◄── 1 record
              └──────────────────────────────┘──► answer
```

The loop is embarrassingly simple — it is a `while` around one HTTP call:

```
  while (the model asked for a tool and we are under the cap):
      run the tool it named, with the arguments it wrote
      append the result to the conversation
      call the model again
  return the model's final message
```

That is the whole of "agentic". The intelligence is not in the loop; it is in
the model's decision about *which* tool and *what* arguments, and in the tool
descriptions that shape that decision.

---

## 2 · What this buys, measured

**MEASURED HERE** — traced run, 2026-09-11, recorded in the header of
`packages/grounding/src/hybrid.ts`:

> On 2026-09-11 a traced run of the rideshare question made **ten searches in
> one question**, hunting for the literal strings "livery", "for hire",
> "transportation network".

Ten searches. A one-shot pipeline gets one, with the user's own words, which
contain none of those three phrases. The model *generated the vocabulary of the
corpus* from the vocabulary of the question — and that is the capability, stated
as plainly as it can be: **the model can search for words the user did not say.**

The same trace gives the cost:

> 6 tool calls and 43k tokens when the model routed well, 11 calls and 122k when
> it did not.

**MEASURED HERE** — steering's assessment loop, `docs/steering/NEXT.md`:

```
pnpm steering:assess CR-K2-0101 --trace
```

> One requirement → search → price → a structured answer. ~55 s, 2–9 tool calls.
> Two tools: `search_documents` and `find_comparable_work`.

### The distribution, over 893 real runs

`logs/requests.jsonl` has one row per completed loop — `turns`, `toolCalls`,
`inputTokens`, `ms`, `stoppedBecause`. Excluding the fan-out surfaces, whose
loop shape is different, there are **893 single-loop runs** across both
engagements and both engines.

**If you re-derive these, run the filter below and not a simpler one.** An
earlier draft of this producer omitted `x.engine !== 'embeddings'` and printed
**894 runs with 45→46 in the `0 calls` bucket** — one embedding request carries a
numeric `toolCalls` of 0 and is not a loop. Both numbers are reproducible; they
differ by which population you ask for. The 893 below is the one every figure on
this page is drawn from, and the difference changes no claim: 123 runs at six or
more calls, 13.8%, and the turn medians are identical either way.

```bash
# the producer for every number in this section
node -e "const r=require('fs').readFileSync('logs/requests.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(x=>typeof x.toolCalls==='number'&&!String(x.engine).includes('fanout')&&x.engine!=='embeddings');const h={};r.forEach(x=>h[x.toolCalls]=(h[x.toolCalls]||0)+1);console.log(r.length+' runs');console.table(h)"
```

```
  tool calls   runs
     0          45
     1         131
     2         280   ← the mode
     3         224
     4          54
     5          36
     6          37
     7          30
     8          28
     9          10
    10          11
    11           7
```

**The mode is 2 and the tail runs to 11.** 123 of 893 runs — **13.8%** — make
six or more tool calls. That is the shape to budget against: not an average, a
long right tail that is one question in seven.

### The tail is worse than it looks, because tokens are superlinear in turns

Median `inputTokens`, by how many turns the loop took:

| turns | runs | median input tokens | per turn |
|---|---|---|---|
| 3 | 322 | 14,094 | 4,698 |
| 6 | 30 | 81,751 | 13,625 |
| 9 | 30 | 124,383 | 13,820 |
| 12 | 7 | 136,174 | 11,348 |

**Per-turn cost roughly triples between turn 3 and turn 6.** A 3× increase in
turns produced a **5.8×** increase in tokens. This is §5's re-sending effect,
measured rather than asserted: every turn ships the whole conversation again, so
turn 9 pays for turns 1–8 a second time.

### And the same question is not the same cost

`eval:cov-002#1` is one eval case — one fixed question, one fixed corpus — logged
**12 times** across several sessions:

```
turns          6 – 12
inputTokens    27,023 – 136,174      ← 5.0×, same question
```

Nothing about the question changed. That is the defining operational property of
an agentic system and the one that surprises people holding a budget: **cost is
not a number per question, it is a distribution per question**, and the tail is
where the money goes.

---

## 3 · The tool description *is* the prompt

This is the single highest-leverage thing in agentic RAG, and it is usually
written as an afterthought.

The model chooses a tool by reading its description. Not by reading your
architecture diagram, not by reading your intentions — by reading the string you
put in `description`. So the description is not documentation. It is the routing
policy, and it is where the domain judgment lives.

```ts
// apps/ai/insurance/src/tools/search-guidance.tool.ts:82-98  — VERBATIM
      description:
        "Search the insurer's GUIDANCE and claim HISTORY: adjuster bulletins, " +
        'Department of Insurance circulars, claims handling procedures, ' +
        'underwriting manuals, prior claim determinations and coverage ' +
        'opinions. ' +
        'Use this for how a claim must be HANDLED, what documentation is ' +
        'required, what deadlines apply, or what was decided on an earlier ' +
        'claim. ' +
        'Do NOT use it to decide what a policy PAYS — that is search_policy. ' +
        'A bulletin binds the adjuster, not the contract, and cannot change a ' +
        'coverage term. A prior determination is authority for a later claim ' +
        'only where the policy in force then used the same wording as the ' +
        'policy in force now. A coverage opinion is advice and binds nobody. ' +
        'Pass jurisdiction whenever you know the rated state: a circular in ' +
        'one state does not reach a policy issued in another. ' +
        'Superseded and withdrawn documents are excluded unless you ask for ' +
        'them; a document may be dead while its own text says nothing about it.',
```

Read what is actually in there. Not "searches guidance documents". Instead:

- **the boundary against the sibling tool**, in capitals, twice
- **a rule of legal authority** — a bulletin binds the adjuster, not the contract
- **a conditional** — a prior determination is authority *only where the wording
  matches*
- **an instruction about an argument** — pass jurisdiction whenever you know it
- **a warning about the data** — a document may be dead while its own text says
  nothing about it

That last line is the one to steal. It tells the model something true about the
corpus that the model could not discover by reading a single document. **A tool
description is where you tell the model what it cannot learn from any one result.**

The parameter descriptions do the same job one level down:

```ts
// apps/ai/insurance/src/tools/search-guidance.tool.ts:120-127  — VERBATIM
        include_superseded: z
          .boolean()
          .nullable()
          .describe(
            'Pass true only when you are deliberately asking what an older ' +
              'document said — for a claim with an early date of loss, say. ' +
              'Null or false excludes superseded and withdrawn documents.',
          ),
```

Compare the repo's parallel rule for the answer schema, from `CLAUDE.md`: *"Every
field carries a `.describe()` string that is prompt engineering, not
documentation — that's why `pnpm schema:check` fails if a field loses one."* The
same principle, enforced by a check.

---

## 4 · The failure mode nobody diagnoses correctly

Written down in the repo before it happened, which is why it is diagnosable:

```ts
// apps/ai/insurance/src/tools/search-guidance.tool.ts:27-34  — VERBATIM
 * THE RISK THIS CARRIES, recorded so it is diagnosable rather than mysterious.
 * A question can straddle the two families. "Does a total loss settlement
 * include sales tax?" is answered by a DOI circular, but it SOUNDS like a
 * coverage question, so a model may call search_policy alone, read "actual cash
 * value", and never learn the circular exists. That failure looks like bad
 * reasoning and is actually bad routing. The mitigation lives in
 * search-policy.tool.ts, which points here when guidance exists for the form.
 * If a settlement-amount case fails, CHECK THE TOOL CALLS BEFORE THE PROMPT.
```

> **A routing failure looks exactly like a reasoning failure.**

The model produces a confident, well-written, wrong answer, correctly reasoned
from the documents it was given — and the documents it was given were the wrong
family, because it called the wrong tool. Every instinct says "the model is
dumb, improve the prompt". The prompt is fine. The model never saw the document.

This is why **a trace is not a debugging luxury in an agentic system, it is the
primary instrument**. `--trace` exists on steering's CLI for exactly this. The
first question about any agentic failure is *which tools were called, with what
arguments* — and it is answerable in one line, where "why did the model think
that" is not answerable at all.

The mitigation shape is also worth naming: **tool A points at tool B.**
`search_policy` tells the model when `search_guidance` exists for a form. A tool
that knows about its sibling costs one sentence and removes a whole class of
silent failure.

---

## 5 · The turn cap, and what a cap that bites looks like

```ts
// packages/agent/src/core/loop.types.ts:23-36  — VERBATIM
/**
 * One default, shared by `pnpm ask` and `pnpm eval`.
 *
 * Raised 8 -> 12 on 2026-09-05 (PROGRESS.md issue #2). `cov-002` — the rideshare
 * coverage-gap case — was observed finishing at 7 and 8 turns against a cap of
 * 8, so it was failing on the budget rather than on judgment. A turn cap that
 * bites is an infrastructure failure wearing a model failure's clothes.
 *
 * Unused headroom costs nothing: the loop stops as soon as the model answers.
 * It lives HERE and not at the call sites because `src/eval/run.ts` claims the
 * eval takes "exactly the path a genuine request takes" — two call sites with
 * two caps would make that comment false.
 */
export const DEFAULT_MAX_TURNS = 12;
```

Three separate lessons in fourteen lines:

**A turn cap that bites is an infrastructure failure wearing a model failure's
clothes.** The symptom is an incomplete or hedged answer. The cause is a
`while` loop that stopped. Nothing in the output says so.

**Unused headroom costs nothing.** The loop exits when the model answers, so
raising a cap from 8 to 12 costs zero on every question that finishes in 6. Caps
should be set by what the worst legitimate question needs, not by the average.

**One cap, in one place.** Two call sites with two caps would make the eval
suite's central claim — that it takes exactly the path a real request takes —
false, silently, in the one component whose job is to be trustworthy.

### And the cost shape nobody warns you about

```ts
// apps/ai/steering/src/agent/loop/assess-requirement.ts:69-83  — VERBATIM
      /**
       * MORE RETRIES THAN THE SDK'S DEFAULT OF TWO, and only here.
       *
       * The first real assessment run died on `429 ... exceeded rate limit`
       * after six tool calls — a multi-turn loop re-sends its whole context
       * every turn, so it reaches a tokens-per-minute ceiling far faster than
       * the one-shot extraction ever did. Two retries is right for a single
       * call and thin for a loop that has already spent six.
       *
       * `withOptions` rather than editing `@fde/foundry`: the token provider,
       * the endpoint and the auth are shared and correct, and this is a
       * property of THIS workload's shape, not of the deployment. The SDK
       * honours `Retry-After` on 429 and backs off exponentially otherwise.
       */
      const client = openaiClient().withOptions({ maxRetries: 6 });
```

> **A multi-turn loop re-sends its whole context every turn.**

Turn 9 pays for turns 1–8 again. Token spend over a conversation is *quadratic*
in turn count, not linear — which is why the 6-call/43k versus 11-call/122k
number in §2 is a 1.8× call ratio producing a 2.8× token ratio. Budget for the
tail, and if you are on a TPM quota, the tail is what trips it.

---

## 6 · The model never touches the database

```ts
// apps/ai/steering/src/agent/loop/assess-requirement.ts:1-8  — VERBATIM
// (the comment continues past line 8 with three more sections; elided with `…`)
/**
 * One customer requirement in, one assessed dossier out.
 *
 * ── THE MODEL NEVER TOUCHES THE DATABASE OR THE INDEX ────────────────────
 *
 * It receives the RESULT of a search and the RESULT of a comparables query.
 * Both tools run here, in our process, over connections it cannot see. That is
 * the whole reason pillar 2 is called the tool loop rather than "give it SQL".
 …
```

The alternative — give the model SQL, or a shell, or an HTTP client — is
strictly more capable and strictly less defensible. With named tools:

- the model cannot reach a table you did not expose
- the model cannot write, because no tool writes (see `@fde/guard`)
- every access is a typed call you can log, replay as a fixture, and assert on
- the credentials are never in the context window, so they cannot be echoed back
  in an answer

**A tool is a capability grant.** Designing the tool set is designing the blast
radius, and doing it before the first prompt is written is much easier than
retrofitting it after a security review.

---

## 7 · The taxonomy, cited

**CITED** — Singh et al., *Agentic Retrieval-Augmented Generation: A Survey on
Agentic RAG*, arXiv:2501.09136. <https://arxiv.org/abs/2501.09136> (fetched
2026-09-15). Taxonomy by **agent cardinality, control structure, autonomy and
knowledge representation**; the named families are single-agent, multi-agent,
hierarchical, corrective, adaptive and graph-based.

Four capabilities the survey organises agentic systems around — query
understanding and planning, tool/retrieval orchestration, multi-hop reasoning
and decomposition, and self-reflection.

Where this repo sits:

| pattern | here? |
|---|---|
| **Single agent, router** | **Yes.** Both engagements. One model, 2–3 tools, it picks. |
| **Multi-hop / decomposition** | **Yes, emergent.** Nothing decomposes explicitly; the model re-searches when a passage references another document. The rideshare trace is ten hops. |
| **Self-reflection** | **Partly.** Not learned tokens — a *contract*. The schema rejects an answer whose `conflicts` are unresolved with no `escalate`. Reflection enforced from outside rather than trained in. |
| **Corrective** | **Shape only.** See [`CORRECTIVE.md`](CORRECTIVE.md). |
| **Adaptive** | **No.** Every question takes the same path. |
| **Multi-agent** | **Nearly.** `steering:assess-all` fans out one agent per requirement, then a **second, smaller agent summarises across finished assessments**. Two roles, not a conversation. |
| **Hierarchical** | **No.** |

### Self-RAG — reflection as learned tokens

**CITED** — Asai, Wu, Wang, Sil & Hajishirzi, *Self-RAG: Learning to Retrieve,
Generate, and Critique through Self-Reflection*, arXiv:2310.11511, ICLR 2024.
<https://arxiv.org/abs/2310.11511> (fetched 2026-09-15).

Trains a single LM that *"adaptively retrieves passages on-demand, and generates
and reflects on retrieved passages and its own generations using special tokens,
called reflection tokens."* Self-RAG at 7B and 13B outperforms ChatGPT and
Llama2-chat on open-domain QA, reasoning and fact verification, with gains in
citation accuracy for long-form generation.

The important distinction against the paragraph above: Self-RAG makes retrieval
*and* critique **decisions the model emits as tokens**, so they are controllable
at inference time — you can turn the threshold up and get a more conservative
system from the same weights. This repo does the same job with a schema and a
validator: cheaper, no training, no model to maintain, and strictly less
flexible. Which trade is right depends on whether you can fine-tune at all,
which at most engagements you cannot.

### Adaptive-RAG — do not retrieve at all, sometimes

**CITED** — Jeong, Baek, Cho, Hwang & Park, *Adaptive-RAG: Learning to Adapt
Retrieval-Augmented Large Language Models through Question Complexity*, NAACL
2024. <https://aclanthology.org/2024.naacl-long.389/> (fetched 2026-09-15).

A small classifier predicts a question's complexity and routes to one of three
strategies: **no retrieval**, **single-step retrieval**, **multi-step
retrieval**. Trained on automatically collected labels.

The idea worth carrying even if you never build the classifier: *"how many hops
does this question need"* is a **cheap, separable prediction**, and the cost
difference between the three routes is enormous. Anything that avoids the
multi-step path when it is not needed pays for itself in the tail identified in
§5.

---

## 8 · Code

### The loop, with nothing hidden

```ts
// ASSEMBLED — the shape @fde/agent implements, minus the engine abstraction.
// The real thing is packages/agent/src/sdk/loop.ts.
//
// `loop.types.ts` and CLAUDE.md both point at a hand-rolled predecessor kept at
// `archive/pillar-2-handrolled/loop.ts` as the thing to diff against when the
// SDK surprises you. CHECKED 2026-09-15: `archive/` is not on disk and appears
// on no ref in git history. The reference is stale in both places; noted here
// rather than repeated, because a path that does not resolve is worse than no
// path at all.

export async function runLoop<T>(opts: {
  system: string;
  question: string;
  registry: ToolRegistry;
  schema: ZodType<T>;
  maxTurns?: number;
  onTurn?: (t: TurnRecord) => void;
}) {
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;   // 12. See §5.
  const messages = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.question },
  ];
  const calls: ToolCallRecord[] = [];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const res = await client.responses.create({
      model: env.MODEL,
      input: messages,
      tools: opts.registry.schemas(),
      store: false,            // NOT a default. See `pnpm compliance:check`.
    });

    opts.onTurn?.({ turn, usage: res.usage });           // telemetry, per turn
    messages.push(...res.output);

    const wanted = res.output.filter((o) => o.type === 'function_call');
    if (wanted.length === 0) {
      // No tool asked for → this is the answer. Validate BEFORE returning:
      // a structurally valid answer can still be incoherent.
      return { answer: opts.schema.parse(JSON.parse(res.output_text)), calls, turns: turn };
    }

    for (const call of wanted) {
      // The registry is the capability boundary (§6). An unknown name is an
      // ERROR RETURNED TO THE MODEL, not a thrown exception: the model can
      // recover from "no such tool", the process cannot.
      const result = await opts.registry.run(call.name, JSON.parse(call.arguments));
      calls.push({ name: call.name, args: call.arguments, result });
      messages.push({ type: 'function_call_output', call_id: call.call_id,
                      output: JSON.stringify(result) });
    }
  }

  // THE CAP IS A DISTINCT OUTCOME, never a silent truncation. §5 is what
  // happens when it is not.
  throw new TurnCapExceeded(maxTurns, calls);
}
```

### A retrieval tool worth calling twice

```ts
// ASSEMBLED — the properties that make a search tool agentic rather than a
// pipeline stage wearing a tool's clothes.
export function searchTool(store: PGVectorStore): Tool<Args, Result> {
  return {
    schema: {
      type: 'function',
      name: 'search_documents',
      description:
        'Search the customer corpus. Natural language works best. '
        // (1) TELL IT IT MAY CALL AGAIN. Models default to one shot.
        + 'If the first search does not answer the question, search AGAIN with '
        + 'different words — the corpus uses vocabulary the question may not. '
        // (2) TELL IT WHAT AN EMPTY RESULT MEANS.
        + 'No results does not mean the corpus is silent; it means these words '
        + 'did not match. '
        // (3) TELL IT WHAT THE SCORES ARE NOT.
        + 'Scores are relative ranks within this result set. They are NOT '
        + 'confidence, and a high score does not mean the passage answers you.',
      parameters: z.strictObject({
        query: z.string().describe('What to look for.'),
        // (4) EVERY ARGUMENT NULLABLE, WITH A DESCRIBED DEFAULT. A required
        //     argument the model must invent is a hallucinated filter.
        k: z.number().nullable().describe('How many passages. Null for 6.'),
      }),
    },
    async execute({ query, k }) {
      const { hits, fullText } = await hybridSearch(store, query, k ?? 6);
      return {
        passages: hits.map((h) => ({
          text: h.doc.pageContent,
          // (5) PROVENANCE ON EVERY HIT — the citation the answer will need,
          //     supplied rather than invented.
          source: h.doc.metadata.path,
          line: h.doc.metadata.startLine,
        })),
        // (6) DEGRADED MODE IS REPORTED, not hidden.
        note: fullText ? undefined
          : 'Keyword search was unavailable; these are semantic matches only. '
          + 'Exact identifiers may be missing.',
      };
    },
  };
}
```

### The refusal path, which is the hard part

```ts
// ASSEMBLED, but the behaviour is real: steering refuses when history is too
// thin, and 23 of 24 K2 requirements came back unpriced. See docs/steering/NEXT.md §0.
const FindComparableWork = z.strictObject({
  found: z.boolean(),
  reason: z.string().nullable()
    .describe('When found is false, why — so the model can say which it was: '
            + 'no matching charge code, too few closed jobs, or hours known to '
            + 'be contaminated.'),
  cost: z.object({
    median_hours: z.number().nullable()
      .describe('NULL when fewer than N comparable jobs closed. A median over '
              + 'two jobs is a number with the authority of a statistic and '
              + 'the reliability of an anecdote.'),
    n: z.number(),
  }).nullable(),
});
```

> A tool that cannot say "I don't know" forces the model to make something up.
> The refusal has to be **expressible in the tool's return type**, or it will be
> expressed as a plausible number.

---

## 9 · What is missing here, and it is a real gap

**PROPOSED** — recorded in `docs/ROADMAP.md` §A0, found during the Mastra spike:

> the `Agent` prototype has `approveToolCall`, `declineToolCall`,
> `listSuspendedRuns` and `resumeStream`. That is the human-in-the-loop
> machinery Pillar 7 currently has no runtime equivalent of — **escalation today
> is a field the model fills in, not a pause the system enforces.**

The distinction is the whole of trustworthy agentic RAG. Today the model writes
`escalate: true` into a JSON field and the loop carries on. A runtime pause
would suspend the run before the consequential tool call, persist it, and wait
for a human. One is a *report* that a human should have been involved. The other
is a human being involved.

Nothing in this repo does the second. It is named here so nobody reads
`escalate` as more than it is.

---

## 10 · When NOT to use it

| | |
|---|---|
| **Every question needs exactly one search.** | You are paying 2–12× the tokens and 2–12× the latency for a decision with one option. Adaptive-RAG's classifier is the cheap middle ground. |
| **You are on a tight TPM quota.** | §5: a loop re-sends its whole context every turn. Quadratic, and the 429 arrives at turn 6 after you have already spent five turns. |
| **Latency is user-facing and hard-capped.** | ~55 s for a steering assessment, 2–9 calls. No amount of streaming makes nine sequential model round-trips fast. |
| **You cannot trace.** | §4 is undiagnosable without the tool calls. An agentic system you cannot trace is one you cannot debug, only re-prompt and hope. |
| **The tools can write.** | Then the blast radius is the tool set. `@fde/guard` exists because "the model should not do that" is not a control. |

---

## 11 · Figure data for the UI

```jsonc
// FIG-AGT-1 · <Stages> — one turn of the loop
[ { "verb": "call",     "out": "Response { output[] }",     "does": "system + history + tool schemas go up. Every turn. All of it." },
  { "verb": "inspect",  "out": "function_call | text",      "does": "a tool request, or the answer" },
  { "verb": "dispatch", "out": "registry.run(name, args)",  "does": "OUR process, OUR connection. The model never sees a credential." },
  { "verb": "append",   "out": "function_call_output",      "does": "the result joins the history — and is re-sent next turn" },
  { "verb": "repeat",   "out": "until answered or turn 12", "does": "the cap is an outcome, never a silent truncation" } ]

// FIG-AGT-2 · <BarRows> — MEASURED HERE, traced 2026-09-11. Same question shape, two routings.
[ { "label": "routed well — 6 calls",  "value": 43,  "detail": "43k tokens" },
  { "label": "routed badly — 11 calls","value": 122, "detail": "122k tokens · 1.8× the calls, 2.8× the tokens" } ]

// FIG-AGT-3 · <BarRows> — MEASURED HERE. 893 single-loop runs in logs/requests.jsonl.
// Producer: the node one-liner in §2. NOT <RunGrid> — that draws pass/fail per
// case, and this is a distribution with no cases and no pass.
// UI: the MODE is 2 and the TAIL is the finding. Do not truncate at 6.
[ { "label": "0 calls",  "value": 45 },  { "label": "1 call",   "value": 131 },
  { "label": "2 calls",  "value": 280, "detail": "the mode" },
  { "label": "3 calls",  "value": 224 }, { "label": "4 calls",  "value": 54 },
  { "label": "5 calls",  "value": 36 },  { "label": "6 calls",  "value": 37 },
  { "label": "7 calls",  "value": 30 },  { "label": "8 calls",  "value": 28 },
  { "label": "9 calls",  "value": 10 },  { "label": "10 calls", "value": 11 },
  { "label": "11 calls", "value": 7, "detail": "123 runs — 13.8% — make 6 or more" } ]

// FIG-AGT-6 · <BarRows> — MEASURED HERE. Tokens are SUPERLINEAR in turns.
// 3× the turns bought 5.8× the tokens, because every turn re-sends the whole
// conversation. This is the single most useful cost fact about agentic RAG.
[ { "label": "3 turns  (n=322)", "value": 14094,  "detail": "4,698 / turn" },
  { "label": "6 turns  (n=30)",  "value": 81751,  "detail": "13,625 / turn" },
  { "label": "9 turns  (n=30)",  "value": 124383, "detail": "13,820 / turn" },
  { "label": "12 turns (n=7)",   "value": 136174, "detail": "11,348 / turn" } ]

// FIG-AGT-4 · <Matrix> — where this repo sits in the survey's taxonomy (CITED: arXiv 2501.09136)
[ { "row": "single-agent router",    "here": "yes",     "note": "both engagements" },
  { "row": "multi-hop / decompose",  "here": "emergent","note": "10 searches on the rideshare question" },
  { "row": "self-reflection",        "here": "partial", "note": "a contract, not learned tokens" },
  { "row": "corrective",             "here": "shape",   "note": "gates, not a graded evaluator" },
  { "row": "adaptive",               "here": "no",      "note": "every question takes the same path" },
  { "row": "multi-agent",            "here": "nearly",  "note": "fan-out + a summariser. Two roles, not a conversation." },
  { "row": "hierarchical",           "here": "no" } ]

// FIG-AGT-5 · <Funnel> — the turn cap story, MEASURED HERE (PROGRESS.md issue #2, 2026-09-05)
[ { "stage": "cap was 8",           "n": 8,  "note": "cov-002 observed finishing at 7 and 8" },
  { "stage": "raised to 12",        "n": 12, "note": "unused headroom costs nothing" },
  { "stage": "typical question",    "n": 3,  "note": "the loop exits when the model answers" } ]
```

---

## 12 · Run it

| command | what it does | cost |
|---|---|---|
| `pnpm ask` | the insurance loop against one question | model calls |
| `pnpm steering:assess CR-K2-0101 --trace` | one requirement, every tool call printed | ~2 cents |
| `pnpm steering:assess-all` | the work list across the whole bid | **free** — spends nothing |
| `pnpm steering:assess-all --run --limit 1` | one requirement, for real | ~2 cents |
| `pnpm compliance:check` | asserts `store: false`, no server-side state, tracing off | free |
| `pnpm compliance:mastra` | the same assertions against the second engine | free |
| `pnpm guard:check` | every write-path denial still denies | free |

---

## Sources

- Singh et al., *Agentic RAG: A Survey*, arXiv:2501.09136 — <https://arxiv.org/abs/2501.09136>
- Asai et al., *Self-RAG*, ICLR 2024, arXiv:2310.11511 — <https://arxiv.org/abs/2310.11511>
- Jeong et al., *Adaptive-RAG*, NAACL 2024 — <https://aclanthology.org/2024.naacl-long.389/>

In-repo: `packages/agent/src/core/loop.types.ts` ·
`apps/ai/insurance/src/tools/search-guidance.tool.ts` ·
`apps/ai/steering/src/agent/loop/assess-requirement.ts` ·
`packages/agent/src/sdk/loop.ts` · `logs/requests.jsonl` · `docs/ENGINES.md`

*(`archive/pillar-2-handrolled/loop.ts`, cited by `loop.types.ts` and CLAUDE.md,
does not exist on this ref — see §8.)*
