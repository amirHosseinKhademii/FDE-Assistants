# Context engineering — the window is a budget, and it is spent unevenly

**Status: BUILT HERE, AND MEASURED.** The token accounting, the per-turn
telemetry and the shared retry sentence are running code. The attention
research is CITED.

> **Extends, does not restate.** [`../AUGMENTED-GENERATION.md`](../AUGMENTED-GENERATION.md)
> owns *what is assembled into the window* and the answer contract.
> `/learn/cost` owns *what a request costs* and the 68.5% eval-spend finding.
> `/learn/caching` owns *whether to cache*, and its answer is "no, measured".
> [`../rag/AGENTIC.md`](../rag/AGENTIC.md) §5 owns *tokens are superlinear in
> turns*. **This document is about what happens to information once it is in
> the window** — which of those four says nothing about.

*Research date 2026-09-15. External sources carry a URL and the date fetched.*

---

## 1 · The plain version

Prompt engineering is writing a good instruction. Context engineering is
deciding **what is in the window at all** — and, increasingly, what to take out.

The definition worth using is Anthropic's:

> **CITED** — *Effective context engineering for AI agents*,
> <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
> (fetched 2026-09-15): context engineering is *"the set of strategies for
> curating and maintaining the optimal set of tokens (information) during LLM
> inference"* — spanning *"system instructions, tools, Model Context Protocol,
> external data, message history, etc."*, where prompt engineering addresses
> *"how to write effective prompts, particularly system prompts"* for discrete
> tasks rather than iterative agent loops.

The reason this became its own discipline is one empirical fact that contradicts
what everybody assumed when context windows started growing:

> **A bigger window is not a proportionally better window.**

You cannot treat the context as a bucket that holds N tokens equally well. It
holds them *unevenly*, it holds them *worse as it fills*, and both effects are
measured.

---

## 2 · Two findings that should change how you build

### Lost in the middle

**CITED** — Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni & Liang, *Lost in
the Middle: How Language Models Use Long Contexts*, TACL 2024,
arXiv:2307.03172. <https://arxiv.org/abs/2307.03172> (fetched 2026-09-15).

Across multi-document QA and key-value retrieval, performance is **highest when
the relevant information is at the beginning or the end** of the input and
**degrades significantly when the model must find it in the middle** — and
performance falls as the context grows longer, *"even for explicitly
long-context models."*

```
  accuracy
     ▲
     │ ●                                                   ●
     │   ●                                              ●
     │      ●                                     ●
     │          ●   ●   ●   ●   ●   ●   ●   ●
     └──────────────────────────────────────────────────────►
       1st                position of the answer            20th
```

The practical consequence is blunt: **the order you paste retrieved passages in
is a design decision, not a formatting detail.** If you have six passages and
one of them is the answer, putting it fourth is worse than putting it first, and
your retriever's rank ordering is what decides that.

### Context rot

**CITED** — Hong, Troynikov & Huber (Chroma), *Context Rot: How Increasing Input
Tokens Impacts LLM Performance*, July 2025.
<https://www.trychroma.com/research/context-rot> (fetched 2026-09-15).

**18 frontier models tested. Every one degraded on longer inputs** — including
on trivially easy copy-and-retrieve tasks where the task difficulty was held
constant and only the input length changed.

The finding that should unsettle you most: **models performed better on shuffled
haystacks than on logically coherent documents, across all 18.** Structural
coherence consistently *hurt* performance. Nobody has a satisfying explanation,
and it is a direct contradiction of the intuition that a well-organised context
is an easier context.

Anthropic's post gives the mechanism as an attention-budget argument:
transformers create *"n² pairwise relationships for n tokens"*, so as context
lengthens *"a model's ability to capture these pairwise relationships gets
stretched thin"* — producing *"a performance gradient rather than a hard
cliff."*

> **Treat the window as a budget you are spending, not a container you are
> filling.** Every token you add makes every other token slightly less
> effective.

---

## 3 · What this repo actually puts in the window

**MEASURED HERE.** There is no hidden layer — the context is four things, and
you can count them:

| | what | size |
|---|---|---|
| system prompt | `coverage-prompt.ts` | 148 lines |
| tool schemas | 3 tools, each with `.describe()` on every field | — |
| the contract | `CoverageAnswerSchema`, as a JSON schema | — |
| history | every prior turn, **re-sent in full each turn** | grows |

Steering's is 242 lines for `assess-requirement`, 87 for `summarise-bid`, 77 for
`explain-assessment`. Those are not large by 2026 standards and that is the
point: **the growth is all in the fourth row.**

From [`../rag/AGENTIC.md`](../rag/AGENTIC.md) §2, over 893 logged runs:

| turns | median input tokens | per turn |
|---|---|---|
| 3 | 14,094 | 4,698 |
| 6 | 81,751 | 13,625 |
| 9 | 124,383 | 13,820 |
| 12 | 136,174 | 11,348 |

3× the turns, 5.8× the tokens. The system prompt is 148 lines and is not why.

---

## 4 · The anchor: a retry sentence is a prompt, and three copies is a measurement bug

The best context-engineering lesson in this repo is not about size at all.

```ts
// packages/agent/src/core/settle.ts:1-22  — VERBATIM
/**
 * When is the loop finished, and what does a schema failure cost?
 *
 * WHY THIS IS SHARED AND NOT COPIED, and it is a correctness argument rather
 * than a tidiness one. Every engine ran the same twenty-five lines here, ending
 * in the same retry sentence written out three times:
 *
 *     "Your previous response did not satisfy the required schema: …"
 *
 * That sentence is a PROMPT. Three copies means one of them can be improved, or
 * typo-fixed, or reworded by a find-and-replace that misses a file — and from
 * then on an engine comparison is partly measuring a prompt difference while
 * reporting it as an engine difference. `eval:diff` would not catch it: the
 * engine is part of the setup key, so the two runs are never compared directly.
 * The whole reason three engines exist is that a diff between them means
 * something, and this is the single place that claim was quietly untrue.
 *
 * WHAT IS DELIBERATELY *NOT* HERE: how the retry gets back to the model. The
 * Agents SDK appends a user message to `result.history`, Mastra re-sends one
 * string, LangGraph pushes a `HumanMessage` onto the accumulated list. Those
 * are genuinely three different things, so each engine keeps its own line — it
 * just no longer keeps its own copy of the sentence.
```

Three things generalise from that:

**Every string that reaches the model is a prompt**, including error messages,
tool descriptions, empty-result notes and retry instructions. None of those look
like prompt engineering in a code review. All of them change behaviour.

**A duplicated prompt string is a measurement bug, not a style problem.** Two
copies drift, and from then on your A/B comparison is partly measuring the
drift while reporting it as the thing you meant to compare.

**And the severity depends on whether one tool can see both copies.** The
`settle.ts` case is the mild version: three copies, all in TypeScript, all
findable with one `grep`. The bad version is a constraint that lives in **two
different media** — and this document set produced one while being written.

> A width budget lived in a React component's layout code, and the strings that
> had to satisfy it lived in fenced `jsonc` blocks inside markdown files in
> `docs/`. Three separate times, a fix in the component was silently undone by
> data in a document. **No tool in this repo can see both at once**:
> `leak:check` greps source, `arch:check` reads manifests, and neither looks
> inside a code fence in a markdown file.

The fix was not a checker — a checker over jsonc embedded in prose is a guess
about a format that will drift, which is the same mistake one level up. The fix
was to **put the number in both places and say so in each**: the component's
prop documentation, for whoever writes the call, and the figure-data brief, for
whoever writes the data. Neither audience reads the other's file.

> **A constraint enforced in one medium and satisfied in another has no
> producer that can check it.** That is `/learn/drift`'s argument applied to
> something that is not a number — and it is why the duplication here is
> correct rather than a smell.

**And the boundary is drawn where the engines genuinely differ.** The *sentence*
is shared; *how it gets back to the model* is not, because the three engines
really do three different things. Sharing that too would have been a false
abstraction.

Compare the same idea one level out, from `search-guidance.tool.ts`'s empty
result: a tool returning `[]` has said "nothing exists"; a tool returning `[]`
**and a note explaining what `[]` means here** has said something useful. That
note is context engineering, and it costs 40 tokens.

---

## 5 · The four techniques, and which this repo has

**CITED** — Anthropic's post gives three long-horizon techniques. A fourth,
caching, is an economic rather than an attention technique.

| | what it does | here? |
|---|---|---|
| **Compaction** | at the context limit, summarise the conversation and reinitialise from the summary | **no** — the turn cap (12) stops the loop before compaction would be needed |
| **Structured note-taking** | the agent keeps an external file (`NOTES.md`) and pulls notes back in as needed | **no** |
| **Sub-agent architectures** | specialised agents work in their own windows and return *"condensed, distilled summary"* results | **yes** — see [`ORCHESTRATION.md`](ORCHESTRATION.md) |
| **Prompt caching** | pay less for the prefix you re-send every turn | **partly** — measured, not enabled |

### On caching, precisely, because the repo has a measured position

`cachedInputTokensOf` exists and its rule for *absence* is the interesting part:

```ts
// packages/agent/src/core/usage.ts:12-31  — VERBATIM
/**
 * Cached input tokens across a run, or `undefined` if no turn reported any.
 *
 * THE RULE, and the direction it errs in:
 *
 *   no turn reported    → `undefined`, meaning "this engine does not say".
 *                         The cost stays a ceiling. Returning 0 here would
 *                         claim the cache never helped, which is a finding
 *                         about an engine rather than the absence of one.
 *
 *   some turns reported → the sum of those that did, counting the silent ones
 *                         as zero. That UNDERSTATES the cache, and therefore
 *                         OVERSTATES the cost. Deliberate: a partial reading
 *                         should land on the side of the ceiling, because a
 *                         cost that is too high gets questioned and a cost
 *                         that is too low gets quoted.
 *
 * Turn 1 legitimately reports 0 on every engine — nothing has been sent yet, so
 * there is nothing to reuse. A run whose total is 0 across a SINGLE turn says
 * nothing about whether caching works; the signal lives in turn 2 onward.
```

> **"A cost that is too high gets questioned and a cost that is too low gets
> quoted."** That is the whole argument for choosing which way an estimate
> errs, and it applies far beyond token accounting.

`/learn/caching` is the page that decided **not** to build a semantic cache, and
a measured "no" is a better result than an unmeasured build. Do not re-litigate
it here.

---

## 6 · Just-in-time versus pre-loaded

**CITED** — Anthropic's post describes the field trending toward *"just in
time"* retrieval: hold *"lightweight identifiers"* (file paths, queries, links)
and let the agent fetch dynamically through tools, rather than pre-processing
everything relevant up front.

That is precisely the difference between plain RAG and agentic RAG, restated as
a context decision rather than an architecture one:

```
  PRE-LOADED    retrieve 6 passages → put all 6 in the window → ask
                the window holds everything that might be needed

  JUST-IN-TIME  put the TOOLS in the window → the model fetches what it needs
                the window holds what turned out to be needed
```

The repo is just-in-time by construction: search is a tool, not a stage. The
cost of that choice is in `AGENTIC.md` §5 — a loop re-sends its whole history
every turn, so just-in-time retrieval buys a smaller *first* window and pays for
it in a growing *later* one.

**Both fail at scale and they fail differently.** Pre-loading hits lost-in-the-
middle immediately. Just-in-time hits superlinear accumulation after about six
turns. The fan-out in [`ORCHESTRATION.md`](ORCHESTRATION.md) is the only shape
here that escapes both, and §4 there has the number.

---

## 7 · Code

### Order the context by what §2 measured

```ts
// ASSEMBLED — illustrative. Not in this repo.
//
// Lost-in-the-middle says position matters and the middle is worst. So the
// least important passages go in the MIDDLE, not at the end.
function layoutPassages(hits: Scored[]): string {
  const [first, second, ...rest] = hits;           // rank order from the fuser
  const tail = rest.pop();                          // one more for the end slot

  // best first, second-best last, everything else buried — the two positions
  // the paper measures as strongest get the two best passages.
  return [first, ...rest, tail, second]
    .filter(Boolean)
    .map((h, i) => `[${i + 1}] ${h.doc.metadata.path}\n${h.doc.pageContent}`)
    .join('\n\n');
}
```

**Say plainly that this is untested here.** It is a direct application of a
cited finding and nobody has measured it on this corpus. It belongs in
`steering:retrieval-eval` before it belongs in a prompt.

### Compaction, with the trap named

```ts
// ASSEMBLED — what the repo does NOT have, written so the trap is visible.
async function compact(messages: Message[], keepRecent = 4): Promise<Message[]> {
  const [system, ...rest] = messages;
  const old = rest.slice(0, -keepRecent);
  const recent = rest.slice(-keepRecent);

  const summary = await client.responses.create({
    model: env.SMALL_MODEL,
    input: [{ role: 'system', content:
        'Summarise this conversation for an agent that will continue it. '
      // THE ONLY INSTRUCTION THAT MATTERS. A summary optimised for readability
      // drops exactly what the agent needs: which tools were already called,
      // with which arguments, and what came back empty. Without those the agent
      // re-runs the searches that already failed — and pays twice to learn the
      // same nothing.
      + 'Preserve: every tool call with its arguments, every result that was '
      + 'EMPTY, every identifier mentioned, and every decision already made. '
      + 'Drop: prose, restatements, and anything the agent can re-derive.' },
      { role: 'user', content: JSON.stringify(old) }],
  });

  return [system, { role: 'user', content: `[earlier]\n${summary.output_text}` }, ...recent];
}
```

> **Compaction is lossy and the loss is not uniform.** The things a summariser
> naturally drops — a failed search, an empty result, an argument that did not
> work — are exactly the things that stop an agent repeating itself. Name them
> in the prompt or you have built an agent with amnesia about its own failures.

### Count the window before you argue about it

```ts
// ASSEMBLED — the diagnostic that ends most context arguments in one run.
export function budget(messages: Message[], tools: ToolSchema[]) {
  const size = (x: unknown) => Math.ceil(JSON.stringify(x).length / 4);   // ~4 chars/token
  const rows = [
    { part: 'system',    tokens: size(messages[0]) },
    { part: 'tools',     tokens: size(tools) },
    { part: 'history',   tokens: size(messages.slice(1)) },
  ];
  const total = rows.reduce((n, r) => n + r.tokens, 0);
  // THE SHARE IS THE POINT, not the total. "The prompt is too long" is almost
  // always wrong: the prompt is 148 lines and the history is 130k tokens.
  return rows.map((r) => ({ ...r, share: `${Math.round((100 * r.tokens) / total)}%` }));
}
```

---

## 8 · When NOT to engineer the context

| | |
|---|---|
| **The corpus fits in the window.** | Under ~200k tokens, put it all in and stop. (Anthropic, [`../rag/HYBRID.md`](../rag/HYBRID.md) §7.) Every technique here is a workaround for not being able to do that. |
| **Your loops are short.** | At 3 turns the history is 14k tokens and nothing on this page will save you a measurable amount. The mode here is 2 tool calls. |
| **You have not counted.** | §7's diagnostic. "The context is too big" is a hypothesis; the share breakdown is the finding, and it usually names a different culprit. |
| **You are about to compact by default.** | Compaction loses the record of what already failed. A turn cap that stops cleanly is better than a summary that quietly forgets. |

---

## 9 · Figure data for the UI

> `detail` → `BarRows`'s **`note`** (its own row), not `display`. `Matrix` has
> exactly three states. See `NEXT.md` §0.

```jsonc
// FIG-CTX-1 · <Stages> — illustration. What is in the window, every turn.
[ { "verb": "system",  "out": "148 lines",        "does": "the prompt. Fixed. Not why your bill is large." },
  { "verb": "tools",   "out": "3 schemas",        "does": "every field's .describe() ships every turn" },
  { "verb": "contract","out": "CoverageAnswerSchema", "does": "the shape the answer must satisfy" },
  { "verb": "history", "out": "grows every turn", "does": "THE WHOLE CONVERSATION, RE-SENT", "rule": "this is the one that moves" } ]

// FIG-CTX-2 · <BarRows> — MEASURED HERE. 893 runs. Producer: rag/AGENTIC.md §2.
// Same data as FIG-AGT-6 on the agentic page. DO NOT DRAW BOTH — link across.
[ { "label": "3 turns  (n=322)", "value": 14094,  "note": "4,698 per turn" },
  { "label": "6 turns  (n=30)",  "value": 81751,  "note": "13,625 per turn" },
  { "label": "9 turns  (n=30)",  "value": 124383, "note": "13,820 per turn" },
  { "label": "12 turns (n=7)",   "value": 136174, "note": "11,348 per turn" } ]

// FIG-CTX-3 · <BarRows> — CITED, Liu et al. 2024. The U-curve, as positions.
// UI: the shape IS the finding. Middle positions must read as the trough.
[ { "label": "answer 1st of 20",  "value": 100, "note": "strongest position" },
  { "label": "answer 5th",        "value": 76 },
  { "label": "answer 10th",       "value": 71,  "note": "the trough — the middle is worst" },
  { "label": "answer 15th",       "value": 78 },
  { "label": "answer 20th",       "value": 92,  "note": "recency recovers most of it" } ]
//    ^ SHAPE IS CITED, THESE EXACT VALUES ARE ILLUSTRATIVE OF THE SHAPE.
//      The paper reports the U-curve across several settings rather than one
//      canonical five-point series. Draw with kind="illustration" and say in
//      `source` that the shape is Liu et al. and the points are a reading of it.
//      DO NOT mark this one `cited` — that would claim a precision it has not got.

// FIG-CTX-4 · <Matrix> — the four techniques. states: live | wired | refuses.
// marks: live="built here" · wired="partly" · refuses="not built"
[ { "row": "compaction",          "state": "refuses", "detail": "the 12-turn cap stops the loop first" },
  { "row": "structured notes",    "state": "refuses", "detail": "no external memory anywhere" },
  { "row": "sub-agent windows",   "state": "live",    "detail": "fanout.ts — see ORCHESTRATION.md" },
  { "row": "prompt caching",      "state": "wired",   "detail": "cachedInputTokensOf measures it; not enabled" } ]

// FIG-CTX-5 · <Funnel> — illustration. Just-in-time vs pre-loaded.
[ { "n": 3854, "label": "passages in the corpus",  "why": "pre-loading is not an option at this size" },
  { "n": 24,   "label": "fetched by the fuser",    "op": "over-fetch" },
  { "n": 6,    "label": "returned by the tool",    "op": "gate + top-k" },
  { "n": 6,    "label": "in the window",           "why": "and re-sent on every subsequent turn" } ]
```

---

## 10 · Run it

| command | what it does | cost |
|---|---|---|
| `pnpm steering:assess CR-K2-0101 --trace` | every turn, with its usage | ~2 cents |
| `pnpm steering:spend` | what it all cost, by surface | free, reads disk |
| `pnpm eval:history` | every baseline on disk, one row each | free |
| the `node -e` one-liner in [`../rag/AGENTIC.md`](../rag/AGENTIC.md) §2 | the turn/token distribution | free |

---

## Sources

- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*, TACL 2024 — <https://arxiv.org/abs/2307.03172>
- Hong, Troynikov & Huber (Chroma), *Context Rot* — <https://www.trychroma.com/research/context-rot>
- Anthropic, *Effective context engineering for AI agents* — <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>

In-repo: `packages/agent/src/core/settle.ts` · `packages/agent/src/core/usage.ts`
· `apps/ai/insurance/src/tools/coverage-prompt.ts` · `docs/AUGMENTED-GENERATION.md`
