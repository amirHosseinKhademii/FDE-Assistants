# LoRA and fine-tuning — changing the model instead of the prompt, and the measurement that says whether to

**Status: NOT BUILT HERE.** No model in this repo has been fine-tuned and none
is likely to be. Every number about LoRA is CITED.

**But the anchor is real and it is unusually good**: this repo *measured its own
domain mismatch* on a borrowed model, and that measurement is exactly the input
a fine-tuning decision needs. §3 is the most useful part of this document.

> **Extends, does not restate.** [`../rag/AGENTIC.md`](../rag/AGENTIC.md) §7 owns
> the Self-RAG comparison and the line *"which at most engagements you cannot"*.
> [`../rag/HYBRID.md`](../rag/HYBRID.md) §5 owns the reranker's +12.5 points.
> This document is about **when you change weights instead of words.**

*Research date 2026-09-15.*

---

## 1 · The plain version

There are four things you can change when a model is not doing what you want,
and they are in ascending order of cost and descending order of reversibility:

```
  1  THE PROMPT      minutes. Free. Reversible. Try this until it stops working.
  2  THE CONTEXT     what you retrieve and what you put in the window.
                     → ../rag/ and CONTEXT.md
  3  THE WEIGHTS     fine-tuning. Days. GPUs. A model you now own and maintain.
  4  A NEW MODEL     someone else's problem, with a migration.
```

Almost everything people reach for fine-tuning to fix belongs at 1 or 2. The
question is when it genuinely does not.

### Why you cannot just fine-tune

A 7B-parameter model in 16-bit needs ~14 GB just to hold the weights. Training
needs the weights, the gradients, and the optimiser state — Adam keeps two extra
values per parameter — so full fine-tuning lands around **12–16 bytes per
parameter**, or roughly 100 GB for a 7B model. For a 70B model it is an entire
GPU cluster, and at the end you have **a complete second copy of the model** to
store and serve for every task you tuned.

### What LoRA does

**CITED** — Hu, Shen, Wallis, Allen-Zhu, Li, Wang, Wang & Chen, *LoRA: Low-Rank
Adaptation of Large Language Models*, arXiv:2106.09685 (June 2021, revised
October 2021). <https://arxiv.org/abs/2106.09685> (fetched 2026-09-15).

**Freeze the original weights entirely. Inject a small pair of trainable
matrices beside each one.**

```
  ORDINARY LAYER            LoRA LAYER

     x ──► W ──► h          x ──►  W  ──────────────►(+)──► h
          (frozen)                 │                  ▲
          d × d                    └──► A ──► B ──────┘
       e.g. 4096×4096                  d×r    r×d
                                       r is SMALL — 8, 16, 64
```

`W` never changes. Only `A` and `B` train, and their product `BA` is a rank-`r`
update added to `W`. At `d = 4096` and `r = 8`, `W` has 16.8M parameters and
`A + B` have 65.5K — **0.4%**.

From the abstract, verbatim:

> Compared to GPT-3 175B fine-tuned with Adam, LoRA can reduce the number of
> trainable parameters by **10,000 times** and the GPU memory requirement by
> **3 times**. LoRA performs on-par or better than fine-tuning in model quality
> on RoBERTa, DeBERTa, GPT-2, and GPT-3, despite having fewer trainable
> parameters, a higher training throughput, and, unlike adapters, **no
> additional inference latency**.

"No additional inference latency" is the property that made LoRA win. `BA` is
the same shape as `W`, so at deploy time you can **add them together** and serve
one merged matrix. Adapters — the previous approach — inserted extra layers that
had to run on every forward pass forever.

And because an adapter is tiny (megabytes), you can keep many and swap them.
**One base model, N task adapters**, rather than N copies of a 14 GB model.

### QLoRA

**CITED** — Dettmers, Pagnoni, Holtzman & Zettlemoyer, *QLoRA: Efficient
Finetuning of Quantized LLMs*, NeurIPS 2023, arXiv:2305.14314.
<https://arxiv.org/abs/2305.14314> (fetched 2026-09-15).

Quantise the frozen base to 4-bit and train the LoRA adapter in 16-bit on top.
Three mechanisms: **4-bit NormalFloat (NF4)**, *"information theoretically
optimal for normally distributed weights"*; **double quantization**, quantising
the quantization constants; and **paged optimizers** for memory spikes.

The result: **finetune a 65B model on a single 48GB GPU** while *"preserving
full 16-bit finetuning task performance"*. Their Guanaco family reached **99.3%
of ChatGPT's level on the Vicuna benchmark after 24 hours on one GPU**.

This is the number that moved fine-tuning from a cluster question to a
single-machine question.

---

## 2 · The counterweight, and it is not a footnote

**CITED** — Biderman, Portes, Gonzalez Ortiz et al., *LoRA Learns Less and
Forgets Less*, TMLR 2024, arXiv:2405.09673.
<https://arxiv.org/abs/2405.09673> (fetched 2026-09-15).

Compared LoRA against full fine-tuning on **programming and mathematics**, in
both instruction-tuning (~100K prompt-response pairs) and continued-pretraining
(20B tokens) regimes. The findings, in the title:

**Learns less.** *"In standard low-rank settings, LoRA substantially
underperforms full finetuning."* Their explanation is structural: full
fine-tuning learns perturbations with a rank **10–100× greater** than typical
LoRA configurations. If the change you need is genuinely high-rank, a rank-8
adapter cannot express it — not because training failed, but because the
parameterisation cannot represent the answer.

**Forgets less.** LoRA *"mitigates forgetting more than common regularization
techniques such as weight decay and dropout"* and maintains more diverse
generations. Freezing the base is a constraint, and the constraint is protective:
it is much harder to destroy general capability you never touched.

> **So LoRA is not a cheaper full fine-tune. It is a different operating point:
> less capacity to learn something genuinely new, less risk of losing what was
> already there.** Which one you want is a question about your task, and the
> honest version of the LoRA pitch says so.

For teaching a *format*, a *register*, a *vocabulary* — low-rank changes — LoRA
is the right tool. For teaching a *capability the model does not have*, the
paper says you are choosing the wrong instrument, and rank is why.

---

## 3 · The anchor: this repo measured its own domain mismatch

**MEASURED HERE** — `docs/steering/evals/RETRIEVAL.md`.

The reranker is `Xenova/ms-marco-MiniLM-L-6-v2` — a cross-encoder trained on
**MS MARCO web search queries**, being asked to score **automotive engineering
documents**. That is a textbook domain mismatch and exactly the situation
somebody proposes fine-tuning for.

So it was measured rather than assumed:

| | score |
|---|---|
| `ret-001`'s correct passage (this corpus, prose-shaped) | **+7.75** |
| an MS MARCO pair it was actually trained on | **+8.76** |
| `ret-007`'s correct passage (a terse fielded record) | **−0.88** — *and it still ranked it first* |

Three findings, and each one changes what you would do next:

**It transfers better than "out of domain" suggests.** 7.75 against 8.76 on
prose. The subject matter — steering systems, ASIL levels, charge codes — is not
the problem.

**Ranking depends on relative, not absolute, scores.** A passage scoring −0.88
was still ranked first, because everything else scored lower. **A low absolute
score is not evidence of a bad ranking**, and tuning to raise absolute scores
would be optimising a number that does not drive the outcome.

**The real predictor is document *shape*, not subject.** From that document:

> terse fielded records (`Charge code: 1002`) score far below prose, and this
> corpus has 220 of them

**That is the fine-tuning brief, if there is one.** Not "teach it about steering
systems" — it already handles the prose. It is "teach it that a fielded record
is a document", which is a *formatting* adaptation: low-rank, exactly what §2
says LoRA is good at, and scoped to 220 documents of one shape.

And the discipline around the number, which is the reason to trust it:

> An earlier draft of this row claimed −9.3 and "scores near the floor" — that
> number came from a paraphrase written by hand, not from the corpus, and was
> wrong.

### What you would need before starting

You have the *instrument* — `pnpm steering:retrieval-eval` gives recall@6 and
MRR, and can regress. What you do not have is **labelled training data**, and
that is the real blocker at almost every engagement:

| you have | you need for LoRA |
|---|---|
| 8 labelled retrieval cases | thousands of (query, positive, negative) triples |
| 1,320 extracted facts with their sentences | a labelling process, and someone qualified to run it |
| a measurement that would prove it worked | the same — this half is done |

**8 cases is a regression instrument, not a training set.** The document says so
itself: *"Eight cases cannot say a retriever is good. They can say it got
worse."*

---

## 4 · Why this repo will probably never do it, stated as a decision

Four reasons, three of which are commercial:

**1 · The models are not yours.** Both engagements run `gpt-5-mini` through Azure
AI Foundry. You cannot LoRA a hosted frontier model you access over an API.
Fine-tuning means switching to open weights, which is a different deployment,
different residency story, and a different conversation with the customer.

**2 · There is no training data and getting it is the project.** §3.

**3 · The alternative already worked.** The reranker bought **+12.5 points of
recall@6** for zero training, zero labelled data, and about 2 seconds per
question. That is the outcome a fine-tune would be *trying* to achieve. It was
available by installing a package.

**4 · Residency.** From `rerank.ts`, and it applies double to a fine-tune:

```ts
// packages/grounding/src/rerank.ts:35-42  — VERBATIM
 * ── LOCAL, NOT HOSTED, AND THAT IS A RESIDENCY DECISION ──────────────────
 *
 * Cohere Rerank and Voyage are better models. They also require sending the
 * customer's passages to a third party, which at most engagements is the
 * conversation that ends the pilot. A local cross-encoder adds no vendor, no
 * egress and no new credential — `@huggingface/transformers` runs it in-process
 * on CPU. When a customer is relaxed about egress, a hosted reranker is a
 * drop-in for `scoreAll` below and nothing else changes.
```

A hosted *reranker* sends passages to a third party per query. A hosted
*fine-tune* sends your entire training set — which is the customer's corpus, in
bulk, retained for the duration. **If sending 50 passages ends the pilot,
uploading the corpus does not get a hearing.**

And the operational cost, from the same file — a fine-tune inherits all of it:

```ts
// packages/grounding/src/rerank.ts:44-50  — VERBATIM
 * ── AN OPTIONAL DEPENDENCY, LOADED LAZILY, AND BOTH ARE DELIBERATE ───────
 *
 * `@huggingface/transformers` is ~200 MB of runtime and is in
 * `optionalDependencies`. A top-level import would make every consumer of this
 * package pay for it — including the ingest path, which never reranks. So it is
 * imported inside the function, and its absence is reported as a clear refusal
 * rather than a module-resolution stack trace three layers down.
```

Local weights are 200 MB of runtime that every consumer pays for unless you are
careful. A fine-tuned 7B is 14 GB, plus a serving stack, plus a GPU, plus
whoever keeps it patched.

---

## 5 · Code

None of this runs here. It is the shortest honest version.

### The whole idea, in fifteen lines

```python
# ASSEMBLED — illustrative. Not in this repo. LoRA's ecosystem is Python.
import torch, torch.nn as nn

class LoRALinear(nn.Module):
    """Wraps a frozen Linear with a trainable rank-r detour."""
    def __init__(self, base: nn.Linear, r: int = 8, alpha: int = 16):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad = False          # THE POINT. W never moves.

        d_in, d_out = base.in_features, base.out_features
        self.A = nn.Parameter(torch.randn(r, d_in) * 0.01)
        self.B = nn.Parameter(torch.zeros(d_out, r))   # ZEROS, deliberately:
        # BA = 0 at init, so the wrapped model starts EXACTLY equal to the base.
        # Random-init both and step 0 is already a different model, and you
        # cannot tell a training bug from a bad initialisation.
        self.scale = alpha / r               # so changing r does not change the
                                             # effective learning rate

    def forward(self, x):
        return self.base(x) + (x @ self.A.T @ self.B.T) * self.scale

# At deploy: W_merged = W + (B @ A) * scale  →  one matrix, no extra latency.
```

### With `peft`, which is what you would actually use

```python
# ASSEMBLED.
from peft import LoraConfig, get_peft_model

config = LoraConfig(
    r=16,                      # capacity. §2: full FT learns 10–100× this rank.
    lora_alpha=32,             # conventionally 2r
    # WHICH MATRICES. The original paper adapts ATTENTION projections. Adding
    # the MLP layers costs more parameters and is what you try when r alone has
    # stopped helping — not before, because then you cannot tell which change
    # did anything.
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    task_type="CAUSAL_LM",
)

model = get_peft_model(base_model, config)
model.print_trainable_parameters()
# trainable params: 4,194,304 || all params: 6,742,609,920 || trainable%: 0.0622
```

### QLoRA, which is the same thing on a machine you have

```python
# ASSEMBLED. 4-bit frozen base + 16-bit adapter. Dettmers et al. 2023.
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",            # NormalFloat4 — optimal for normally
                                          # distributed weights. NOT plain int4.
    bnb_4bit_use_double_quant=True,       # quantise the quantization constants
    bnb_4bit_compute_dtype=torch.bfloat16,# compute in bf16; STORE in 4-bit
)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3-8B", quantization_config=bnb)
```

### The part that decides whether any of it worked

```ts
// ASSEMBLED — and this is the half that already exists here.
//
// A fine-tune with no eval is not an experiment, it is a purchase. The order is
// the same one this repo applied to the reranker and wrote down as a rule:
//
//   "Adding a reranker now is guessing it helps; adding it after gives you
//    'the reranker bought 7 points.'"
//
//   1  the baseline           pnpm steering:retrieval-eval          ALREADY DONE
//   2  a held-out set NOT in training                               MISSING
//   3  the adapter                                                  MISSING
//   4  the same eval, both arms                                     the runner exists
//   5  the delta, per case, WITH THE LOSSES PRINTED   ← ret-008 is why
//
// Step 5 is where a fine-tune usually dies honestly: it improves the average
// and breaks three cases that used to work, and only a per-case table shows it.
```

---

## 6 · When it IS the right answer

Fine-tuning earns its cost in four situations, and it is worth being able to
name them:

| | |
|---|---|
| **A format the model will not hold.** Strict output shapes, a house style, a markup dialect. Low-rank, exactly §2's sweet spot — and check the answer contract first, because a validator that rejects the wrong shape is free. |
| **A vocabulary the tokenizer mangles.** Chemistry, legal citation formats, part numbers. Related to the document-shape finding in §3. |
| **Latency or cost at volume.** A tuned 7B matching a frontier model on one narrow task, served cheaply. This is the most common genuine reason and it is an *economic* argument, not a quality one. |
| **The weights must stay on your hardware.** Open weights plus LoRA may be the only architecture a customer will sign. Note this can flip reason 4 of §4 from an objection into the requirement. |

And when it is not:

| | |
|---|---|
| **"It does not know about our documents."** | That is retrieval. Fine-tuning teaches behaviour, not facts — and facts taught into weights cannot be updated, cited, or audited. |
| **"It gets the answer wrong sometimes."** | Measure *which* failure first. [`../rag/CORRECTIVE.md`](../rag/CORRECTIVE.md) §8's seven failure points: four of them are retrieval problems and no amount of tuning touches them. |
| **"The output format is inconsistent."** | A schema and a retry. `pnpm schema:check` costs nothing and cannot be talked out of anything. |
| **You have no eval.** | Then you cannot tell whether it worked, and a fine-tune you cannot evaluate is strictly worse than the prompt you already had. |

---

## 7 · Figure data for the UI

> `detail` → `note`. `Matrix` has exactly three states. **Everything on this page
> is `cited` except FIG-FT-3, which is MEASURED HERE.**

```jsonc
// FIG-FT-1 · <Stages> — illustration. What LoRA does to one layer.
[ { "verb": "freeze",  "out": "W, d×d, untouched",       "does": "the base model never moves", "rule": "this is why it forgets less" },
  { "verb": "inject",  "out": "A (r×d) and B (d×r)",     "does": "two small trainable matrices beside W", "rule": "B starts at ZERO, so the model begins exactly equal to the base" },
  { "verb": "train",   "out": "0.06% of the parameters", "does": "gradients and optimiser state only for A and B" },
  { "verb": "merge",   "out": "W + BA",                  "does": "one matrix at deploy time", "rule": "NO added inference latency — the property that beat adapters" } ]

// FIG-FT-2 · <BarRows> — CITED, Hu et al. 2021. Log scale, or the small bar vanishes.
[ { "label": "full fine-tune, GPT-3 175B", "value": 175000000000, "display": "175B params", "note": "and a complete second copy of the model per task" },
  { "label": "LoRA",                       "value": 17500000,     "display": "10,000× fewer","note": "GPU memory 3× lower · no added inference latency" } ]

// FIG-FT-3 · <BarRows> — MEASURED HERE. Producer: pnpm steering:retrieval-eval.
// THE ONLY MEASURED FIGURE ON THIS PAGE, and the one that would justify a tune.
//
// ── DO NOT PUT THE −0.88 IN THIS CHART. CHECKED, NOT ASSUMED. ─────────────
// BarRows draws `width={Math.max(2, x(r.value))}` with `x(v) = (v/top)*plotW`,
// so a NEGATIVE value renders as a 2px stub — pixel-identical to a very small
// POSITIVE one. The chart would say "the fielded record scored near zero" when
// it scored BELOW zero, which inverts the finding.
//
// So this figure carries the two prose scores, where the comparison is real and
// the bars are honest, and the −0.88 is FIG-FT-3b below.
[ { "label": "in-domain MS MARCO pair",      "value": 8.76, "display": "+8.76", "note": "what the cross-encoder was actually trained on" },
  { "label": "this corpus, prose (ret-001)", "value": 7.75, "display": "+7.75", "note": "out-of-domain subject matter, and it transfers — 1.01 points apart" } ]

// FIG-FT-3b · <Key> or a callout — NOT a chart. MEASURED HERE.
// The finding is not a magnitude, it is a RELATIONSHIP, and a bar cannot draw it.
{ "claim": "The same model scored ret-007's correct passage at −0.88, and ranked it FIRST anyway.",
  "why":   "Ranking depends on relative scores, not absolute ones. Everything else scored lower. A low absolute score is not evidence of a bad ranking — and tuning to raise absolute scores would be optimising a number that does not drive the outcome.",
  "so":    "The predictor is document SHAPE, not subject matter: terse fielded records (`Charge code: 1002`) score far below prose, and this corpus has 220 of them. That — not 'teach it about steering systems' — is the fine-tuning brief, if there is one.",
  "source": "pnpm steering:retrieval-eval · docs/steering/evals/RETRIEVAL.md" }

// FIG-FT-4 · <Matrix> — CITED, Biderman et al. 2024. The two-sided finding.
// marks: live="LoRA better" · wired="comparable" · refuses="full FT better"
[ { "row": "learning a new capability",  "cells": ["refuses"], "detail": "full FT learns perturbations of 10–100× the rank" },
  { "row": "retaining general ability",  "cells": ["live"],    "detail": "beats weight decay and dropout at mitigating forgetting" },
  { "row": "output diversity",           "cells": ["live"],    "detail": "maintains more diverse generations" },
  { "row": "memory and cost",            "cells": ["live"],    "detail": "QLoRA: 65B on one 48GB GPU" } ]

// FIG-FT-5 · <Funnel> — illustration. The four things you can change, §1.
[ { "n": 1,    "label": "change the prompt",  "op": "minutes", "why": "free and reversible. Almost everything belongs here." },
  { "n": 10,   "label": "change the context", "op": "hours",                      "why": "retrieval, ordering, tools — ../rag/ and CONTEXT.md" },
  { "n": 1000, "label": "change the weights", "op": "days",    "why": "GPUs and labelled data — and a model you now own, store, serve and patch" },
  { "n": 5000, "label": "change the model",   "op": "a migration",                "why": "someone else's problem, and a new eval baseline" } ]
```

---

## 8 · Run the measurement that would decide it

There is no fine-tuning here. What exists is the instrument that says whether
one is needed — which is the half people skip.

| command | what it does | cost |
|---|---|---|
| `pnpm steering:retrieval-eval --both` | the baseline and the reranked arm | ~100 embedding tokens |
| `pnpm steering:retrieval-scorer-check` | does the scorer work, with planted failures | free, offline |
| `pnpm steering:retrieval-eval --show-labels closure-reports` | the 220 fielded records of §3 | free |
| `pnpm eval --tag conflict` | the generation-side suite | model calls |

---

## Sources

- Hu et al., *LoRA: Low-Rank Adaptation of Large Language Models*, arXiv:2106.09685 — <https://arxiv.org/abs/2106.09685>
- Dettmers et al., *QLoRA: Efficient Finetuning of Quantized LLMs*, NeurIPS 2023 — <https://arxiv.org/abs/2305.14314>
- Biderman et al., *LoRA Learns Less and Forgets Less*, TMLR 2024 — <https://arxiv.org/abs/2405.09673>
- Asai et al., *Self-RAG*, ICLR 2024 — <https://arxiv.org/abs/2310.11511> (the fine-tuned alternative this repo declined; see `../rag/AGENTIC.md` §7)

In-repo: `packages/grounding/src/rerank.ts` · `docs/steering/evals/RETRIEVAL.md`
