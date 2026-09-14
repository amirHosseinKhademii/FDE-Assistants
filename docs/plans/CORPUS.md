# Growing the corpus — the plan

*Written 2026-09-10, to be worked tomorrow. Nothing here is built yet.*

Twelve forms and eighteen records is a demo corpus. A real claims desk holds
thousands of documents and years of prior decisions, and none of the retrieval
problems that matter at that size are visible at this one. This is the plan to
close that — without throwing away the thing that makes this repo worth
anything, which is that every claim about it is checkable.

Companion: [`RUN.md`](../../RUN.md) for the pillars as they stand,
[`GUIDE.md`](../../GUIDE.md) §3 for why the corpus is shaped the way it is,
[`NEXT.md`](../ROADMAP.md) for the work already in flight.

---

## The distinction that decides the whole plan

**Policy DATA is not policy DOCUMENTS, and only one of them belongs in a vector
store.**

```
DATA                                    DOCUMENTS
per-policyholder facts                  forms, endorsements, manuals,
  form, coverages, deductibles,           bulletins, procedures, prior
  endorsements, claim history             determinations
one exact answer per question           no single lookup key
lives in a policy admin system          lives in a document store
  (Guidewire PolicyCenter, a
   mainframe, a SQL database)
fetched by key                          searched by meaning
→ get_policyholder                      → search_policy
```

**So we are NOT generating 50,000 policyholder records.** Eighteen markdown
records look toy-sized, but they stand in for an API call to a system of record,
and at a real customer `get_policyholder` becomes exactly that. Simulating a
database with files would be simulating the wrong thing, and it would tempt
someone to put customer data in the index — which is the failure
`get-policyholder.tool.ts` exists to prevent.

**The document side is where the gap is real**, and that is what this plan grows.

---

## Two rules that constrain everything below

**1. The corpus and the eval set grow together, or neither grows.**

Right now seven cases are what make every claim in this repo checkable. A bigger
haystack with the same seven needles produces a more impressive demo with *less*
evidence — retrieval could degrade badly and every case would still pass.

**2. The planted traps must survive.**

The current corpus is deliberately booby-trapped, and each trap has a case
standing on it:

| trap | case | what breaks if it is lost |
|---|---|---|
| $40/30 vs $50/21 crossing numbers | `cov-001`, `cov-007` | the endorsement-precedence test |
| rideshare addressed nowhere | `cov-002` | the escalation-on-gap test |
| coverage not selected on the record | `cov-003` | the denial test |
| endorsement attached, not countersigned | `cov-004` | the conflict-and-escalate test |
| four state variants of one form | `cov-005` | the near-duplicate test |
| tables that lose their header row | `pnpm chunks` orphan count | the chunker's whole reason for existing |

The generator is **additive**. Existing documents keep their exact wording and
their ids.

---

## Step 1 · Research what a claims corpus actually holds

*Subagent, web research, half a day. No code.*

Not from my assumptions — from sources. What we need, per document type:

- **What it is called** in the industry, and by which parties
- **Who writes it** and who is bound by it
- **What it looks like**: length, structure, headings, whether it carries tables
- **How it supersedes or defers to other documents** — this is the interesting
  part, because precedence is what makes retrieval hard
- **What an adjuster searches it for**

Types to cover, at minimum:

```
policy forms and editions        base wordings, revision cycles
endorsements                     amend a form; attach per policy
state amendatory endorsements    override a national form in one state
declarations pages               the per-policy summary — DATA, not document
underwriting manuals             eligibility, rating rules
claims handling procedures       how an adjuster must act
adjuster bulletins               dated guidance, often superseding
DOI circulars / regulations      external, binding, dated
prior claim determinations       "we paid this before, and here is why"
coverage opinions                a lawyer's or supervisor's written view
```

**Copyright caution, stated up front:** real ISO form wording is licensed
material. Everything generated must be original text in the *shape* of these
documents, and every file keeps the existing "Fictional document, written for an
FDE practice engagement" header.

**Output:** `docs/corpus-research/README.md` — one section per type, with what it is,
its structure, its precedence rules, and a sample skeleton.

---

## Step 2 · Design the corpus, before generating a byte

Decide and write down:

- **How many of each type**, and why that ratio. Realistic is not maximal: the
  point is to make retrieval hard in the ways real corpora are hard, not to
  produce a large file count.
- **The precedence graph.** Which document type beats which, and where the
  answer must come from when two disagree. This is the new hard problem: today
  precedence is one rule (an attached endorsement beats the base form). With
  bulletins, state circulars and superseded editions it becomes a hierarchy, and
  it is exactly the kind of thing a model gets confidently wrong.
- **Which new traps to plant.** Candidates:
  - a bulletin that supersedes an older bulletin, both still in the corpus
  - a state circular that overrides a national form for one state only
  - a prior claim determination that contradicts the current form because the
    policy has since been re-issued
  - two forms with the same section number and near-identical text, differing in
    one number, one edition apart
- **The id scheme** for each type, and whether `form-id.ts` still recognises
  them. It currently matches `P[APE]-…`; bulletins and circulars will not.

**Output:** a design section appended to this file, reviewed before Step 3.

---

## Step 2b · Documents move into Postgres, as a real system of record

An insurer does not keep policy forms in a folder. They live in a document
management system — FileNet, SharePoint, Documentum, Guidewire
ContentManagement — with metadata attached. `examples/policies/*.md` stands in
for that, and once the corpus grows the metadata IS the hard part, because
precedence lives there.

```
committed files          →  documents table          →  policy_chunks
(the seed, in git)          (runtime source of truth)   (chunks + vectors)
generated, diffable         metadata, precedence,       what search reads
reviewable in a PR          effective dates, editions
```

**Files stay as the seed. Postgres becomes what the pipeline reads.**

That split is not a compromise, it is the point. If documents live ONLY in a
database, "why did last week's baseline differ" becomes unanswerable — the
haystack changed and nothing recorded it. The corpus is evidence, and evidence
belongs in version control. Meanwhile `pnpm ingest` stops being "read a folder"
and becomes "read the document store, chunk, embed" — which is the same code you
would point at a customer's real one.

### The table, roughly

```sql
create table documents (
  document_id   text primary key,      -- 'PA-2023-01', 'BUL-2024-07'
  doc_type      text not null,         -- form | endorsement | bulletin | circular | determination
  title         text not null,
  body          text not null,
  edition       text,                  -- 'rev. Jan 2023'
  jurisdiction  text,                  -- 'IL', 'TX', null = national
  effective_on  date,
  expires_on    date,
  supersedes    text references documents(document_id),
  content_sha   text not null,         -- what makes re-ingest incremental
  updated_at    timestamptz not null default now()
);
```

### What this buys, concretely

- **Precedence becomes a filter, not a hope.** `effective_on`, `jurisdiction`
  and `supersedes` are columns the search can constrain on, rather than dates
  the model has to notice inside prose and reason about correctly.
- **Ingest becomes incremental.** Every chunk already carries a sha256 of its
  content, and that hash currently buys nothing because LangChain re-embeds the
  whole corpus every time. With a documents table you re-embed only what
  changed — irrelevant at 128 chunks, the difference between seconds and minutes
  at 20,000.
- **`citations_resolve` gets stronger.** Today it checks a file exists. Against
  the table it can check the cited EDITION was in force on the loss date, which
  is an insurance check rather than a filesystem one.
- **Multi-tenant becomes a column** rather than a second deployment, if that is
  ever wanted.

### What it costs, and the trap to avoid

- **`pnpm chunks` must stay offline and free.** It is the cheapest way to check
  the chunker, and it must not start requiring a database. Keep it reading the
  seed files.
- **The seed loader is a new step** in the pipeline (`pnpm corpus:load`), and it
  must be idempotent — same seed in, same rows out, no duplicate documents.
- **Do NOT put policyholder records in this table.** They are data, not
  documents; they are fetched by key, never searched. The whole reason
  `get_policyholder` exists is to not be a search, and a documents table sitting
  right there is exactly the temptation that would undo it.

## Step 3 · Extend the generator

`packages/insurance/scripts/generate-corpus.mjs` exists and its output is
deterministic and committed. Keep both properties:

- **Seeded.** Same seed, same corpus, byte for byte. A corpus that changes when
  you regenerate makes every baseline incomparable and every bug unreproducible.
- **Additive.** Existing files are not touched. New types are generated
  alongside.
- **Committed.** The corpus is evidence, not a build artefact.

Then: `pnpm corpus`, `pnpm chunks`, `pnpm ingest`.

**Watch the chunk count.** 128 chunks today. If the new corpus is ~2,000 chunks
that is a 15x haystack, and the embedding cost of a re-ingest goes with it —
still pennies, but the ingest is no longer instant, and `pnpm chunks` at hostile
budgets is the free way to check the chunker before spending anything.

---

## Step 4 · Run the existing seven cases, unchanged

**This is the load-bearing step.** Same cases, same expectations, bigger corpus:

```bash
pnpm eval                       # 35 runs, both engines worth doing
pnpm eval:diff                  # against the last same-setup baseline
```

Three possible outcomes, and all three are informative:

- **Still 35/35** — the traps survived and retrieval scaled. Proceed.
- **A case fails** — either a trap was damaged (fix the generator) or retrieval
  genuinely degraded (that is the finding, and it is the one worth having).
- **A case passes for a new reason** — hardest to spot. Check the tool calls and
  the citations, not just the score.

**A corpus change is a setup change**, so `eval:diff` will refuse to compare
across it and it is right to. Record baselines either side and compare by hand,
the same way the engine comparison was done.

---

## Step 5 · Grow the eval set to match

Only now, and aimed at what is newly possible to get wrong:

- **superseded-bulletin**: the newer bulletin governs; citing the older one is a
  false answer
- **state-circular-overrides-form**: national form says X, the circular says Y
  for this state, the customer is in that state
- **prior-determination-is-stale**: a past claim was paid under an edition the
  policy no longer uses
- **needle-in-near-duplicates**: the right clause among many near-identical ones,
  which is `cov-005` at scale
- **calls-the-record-first**: asserts `get_policyholder` ran before any search —
  Mastra skipped it once, and no current case would catch that

Target: **twenty-five to thirty cases.** `../ROADMAP.md` week three says 50–100;
this gets a real step of the way without becoming the whole week.

---

## Step 6 · Now retrieval improvements are measurable

This is the step the whole plan is for. Hybrid search and reranking have been on
the "maybe" list for weeks precisely because seven cases and 128 chunks cannot
show whether they help.

```
baseline (scaled corpus) → + hybrid (Postgres tsvector) → + reranker
```

with accuracy, dangerous-failure count, p95 latency and cost per query in each
row. The recommendation on record: **Postgres full-text**, not an in-memory BM25
package — both arms stay in the same store and are re-indexed by the same
`pnpm ingest`, so they cannot drift out of sync. The reranker can reuse
`@huggingface/transformers`, already a dependency.

"The reranker bought seven points" is a sentence you can only say if you
measured before you changed anything.

---

## The order, and why

```
1  research     no code, decides everything after it
2  design       traps and precedence, written down BEFORE generating
2b documents    a Postgres system of record, seeded from committed files
3  generate     seeded, additive, committed
4  re-run 7     the corpus must not break what already works
5  grow cases   to 25-30, aimed at the new failure modes
6  measure      hybrid + reranker, with a table
```

Steps 1 and 2 are most of the value. Generating documents is easy; deciding
which failures the new corpus should make *possible* is the actual work — and it
is the same discipline as the original corpus, which was messy on purpose
because a tidy one means you skipped the job.

---
---

# Step 2 · The design

*Written 2026-09-11, after Step 1. **Nothing is generated yet.** The plan says
this section is reviewed before Step 3, and it is — the open decisions are
collected at the end.*

Step 1's output is [`docs/corpus-research/README.md`](../corpus-research/README.md), with
the sourced detail in [`docs/corpus-research/`](corpus-research/) and the
measured facts about our own code in
[`docs/corpus-research/00-code-facts.md`](../corpus-research/00-code-facts.md).
This section decides; that one establishes.

---

## 2.1 What changed in the plan, and why

Step 1 moved four things.

**1 · There is no single precedence graph.** Precedence depends on what is being
asked. *"What does the policy pay"* and *"how must this claim be handled"* are
different ladders with almost disjoint membership — a bulletin binds the
adjuster, not the contract; a policy form says nothing about claim-handling
deadlines. Two researchers reached this independently from different sources.

**2 · The system prompt forbids the reasoning the new cases need.**
`coverage-prompt.ts` says *"Never resolve a conflict yourself by preferring the
newer document, the more specific one, or the one that seems more reasonable."*
That kills three of the five proposed cases outright. The resolution is not a
loosening — see §2.4.

**3 · `formId` is the wrong filter key for everything new.** `documentIdPattern`
returns `""` for `BUL-2024-07`, so ingest stamps `formId: ''`, so a
form-filtered search can never return it, so two proposed cases are unpassable
for plumbing reasons. And `citations_resolve` would score every bulletin
citation as a **dangerous fabrication**, corrupting the metric Step 6 exists to
measure.

**4 · One existing trap is factually wrong.** `cov-004`'s countersignature
premise is contradicted by Fla. Stat. §624.425 — and `AUT-4482` is rated in
Florida. Decision in §2.7.

---

## 2.2 The precedence model, as it will be encoded

**Gates first — in or out, never a tiebreak.** Type-scoped; a flat universal
list would be encoded wrongly.

| gate | applies to | rule |
|---|---|---|
| **G1 Manifest** | forms, endorsements | on the declarations' schedule, or not in the contract |
| **G2 Jurisdiction** | amendatories, circulars, regulations | hard gate — does not apply outside its state at all |
| **G3 Date of loss** | everything | in force on the date of loss |
| **G4 Status** | bulletins, circulars | superseded / withdrawn / rescinded ⇒ disregard |

**Every gate is three-valued: pass / fail / unknown — and `unknown` escalates.**
Missing metadata is not a quiet pass. See §2.8; this is `cov-004` generalised.

**Then one of two ladders, chosen by the question.**

```
COVERAGE                          CONDUCT
statute / regulation              statute / regulation
state amendatory                  DOI circular
endorsement                       insurer bulletin
base form                         claims procedure manual
(declarations supplies values)    (adjuster discretion)
```

**Terminal fallback is ESCALATE**, never *contra proferentem*. Construing
ambiguity against the insurer is a judgment a court makes; putting it in the
prompt re-opens the invented-precedence hole.

**The boundary case is planted, not papered over** (§2.5, trap 1).

---

## 2.3 Document counts — measured, not estimated

**The corpus is sized by how hard it makes retrieval, not by file count.** With
no embedding cache on the live path — `evals/fixtures/embeddings.json` serves
only the archived embedder — chunk count *is* the ingest cost.

The first draft of this section estimated chunks from document length and was
**2.5–3× low on every type.** One canonical sample document per new type now
exists in
[`docs/corpus-research/skeletons/`](corpus-research/skeletons/), and
`CORPUS_DIR=… pnpm chunks` turned six guesses into six measurements — offline
and free, which is what that command is for.

| type | new docs | chunks/doc *(measured)* | total | why this many |
|---|---|---|---|---|
| *(existing)* | — | — | 128 | frozen |
| adjuster bulletins | 24 | 8 | 192 | 3 supersession chains 2–3 deep, plus ~16 unrelated siblings so the stale one is not findable by adjacency |
| **prior determinations — four shapes, not one** | **20** | | **181** | the control pair needs neighbours; cited **by date**, the hardest retrieval key in the corpus |
| · claim file notes | 8 | 9 | 72 | the working record; contradicts the letters when someone was sloppy |
| · coverage position letters | 4 | 8 | 32 | "here is what responds" — the closest thing to a prior answer |
| · reservation of rights | 3 | 9 | 27 | grounds named here are reserved; grounds omitted are not |
| · denial letters | 5 | 10 | 50 | legally-required elements, and they differ by state |
| DOI circulars | 10 | 8 | 80 | 5 jurisdictions × 2, one overriding a national form, one withdrawn by index only |
| claims procedures | 6 | 19 | 114 | the conduct ladder needs a floor to supersede |
| underwriting manual | 3 | 21 | 63 | mostly a distractor — retrieves well, is rarely the answer |
| coverage opinions | 4 | 6 | 24 | rare, authoritative-*looking*, binds nobody: a trap by shape |
| **total** | **67** | | **~654 new · ~782 all** | **6.1× today** |

**Why the determination row is four rows.** An earlier draft of this section had
"prior determinations" as one type, which is what `CORPUS-PLAN.md` Step 1 called
it. The research found **four distinct document shapes** under that name, with
different authors, different required contents and different precedence — a file
note is the adjuster's working record, a denial letter has elements the state
*mandates*, and a reservation of rights controls which grounds survive. Treating
them as one shape would have generated twenty copies of the wrong document and
measured the corpus against it. Each now has its own skeleton and its own
measurement (8–10 chunks, not the 7 the single shape suggested).

### The finding that moved the number

**Chunk count tracks heading density, not word count.** A 337-word determination
produces **7 chunks** — 48 words each. These documents are heading-dense by
nature: a bulletin is a dozen short numbered sections, not three long ones, and
the chunker splits on headings first by design.

So the honest number is **~782 chunks, not the ~356 estimated from length** —
much closer to the plan's original ~2,000, and arrived at by measurement rather
than by either guess.

A 48-word chunk is still a good retrieval unit here, because the heading trail
travels with it (`BUL-2024-07 > 6. Escalation` plus forty words is citable). But
the corpus is bigger in chunks — and in ingest cost — than its page count
suggests, and that is exactly the kind of thing that is cheap to learn now and
expensive to learn at Step 6.

### Two things the same free run established

- **`orphans=0` on the new table shapes**, down to a hostile 120-character
  budget. Bulletins, circulars and manuals carry authority matrices and
  component schedules the existing corpus has no equivalent of. The current
  corpus's `orphans=0` said nothing about them.
- **`0 distinct form ids`** across all six — live confirmation of §2.1 item 3.
  Every new document would be invisible to a form-filtered search and every
  citation of one scored a dangerous fabrication. Predicted from the regex, now
  measured.

**The size stays a dial.** The bulletin and determination families are the dial;
turning them up is a parameter change, not a redesign. At ~782 chunks the
question is no longer "is this big enough to measure a reranker" but "is this
big enough to be *worth* a reranker" — decide at Step 6, with a number.

## 2.4 The prompt change

A **setup change**, landing with the corpus change, not after it.
`coverage-prompt.ts` is held identical across the SDK and Mastra engines so an
engine diff means something; changing it moves both baselines at once.

The WHEN DOCUMENTS DISAGREE rule grows from two branches to three:

> Resolve a conflict only when something **states** which document governs — the
> record's schedule of forms, a supersession notice, a jurisdiction clause, or
> an effective date written in a document you retrieved. Never resolve it from
> your own sense that one document is newer, more specific, or more reasonable.
> **If the precedence is not written down somewhere you retrieved, it does not
> exist** — escalate.

The ban that survives is the one that matters: **precedence the model invents.**
What is newly allowed is **precedence the documents state.** The research
confirms the distinction is the real one — *"a later DOI circular beats an
earlier one only where supersession is stated; otherwise both stand."*

`cov-004` stays red-for-the-right-reason: nothing *states* whether that
endorsement is in force.

And the negative control is sourced. *"The most recently issued endorsement
beats an earlier conflicting one"* is the lowest-confidence claim in the entire
research set — no primary source, and contradicted by case law holding that two
endorsements modifying the same provision render the policy **ambiguous**. It
stays banned, and it earns a case (§2.5, trap 6).

---

## 2.5 Traps to plant, in order of value

*One canonical sample document per new type is in
[`docs/corpus-research/skeletons/`](corpus-research/skeletons/) — the
shape the generator templates, and what made §2.3 measurable.*

| # | trap | tests | control |
|---|---|---|---|
| 1 | **total-loss tax/fee** — form says ACV and is silent; CO regulation says tax + registration fees; NY says tax but not title transfer | routing by **question** vs by **document type** — the one case that discriminates | the NY policy, same question, different answer |
| 2 | **superseded bulletin** — both in the index, status stated only on the newer one | G4, and stated-vs-invented precedence | an `amends and supplements` sibling where **both stay operative** |
| 3 | **stale determination** — prior decision under an old edition, **wording changed** | that edition date alone settles nothing | same setup, **wording unchanged** ⇒ still authority |
| 4 | **endorsement absent from the declarations schedule** | G1, the manifest gate | an endorsement present on the schedule |
| 5 | **withdrawn-by-index circular** — body says nothing; status lives only in metadata | precedence unreachable by reading the document | — |
| 6 | **two endorsements on the same provision** | that "latest wins" is folk lore ⇒ ambiguity ⇒ escalate | — |
| 7 | **denial letter missing a state-required element** — California requires the factual **and** legal basis for each reason; the NAIC floor does not | that required *contents* vary by state, a second axis of the near-duplicate problem | the same denial in a NAIC-floor state, where it is complete |

Traps 2 and 3 **must** ship with their controls. A fix that makes the model
distrust every older document turns the trap green and the control red — which
is how an over-broad fix gets caught, exactly as `cov-007` catches over-
correction on `cov-001`.

---

## 2.6 Retrieval: a second tool, not a widened filter

> **DECIDED 2026-09-11 — Option B, a second `search_guidance` tool.**
>
> Three options were live once the corpus existed:
>
> | | approach | verdict |
> |---|---|---|
> | A | one tool, add `jurisdiction` / `as_of` / `status` filters | recommended by me, **not chosen** |
> | **B** | **`search_policy` + `search_guidance`, split by question type** | **chosen** |
> | C | widen the filter to `formId = X OR applies_to contains X` | **ruled out on the data** |
>
> **C was killed by measurement, not argument.** Filtering on the base form
> returns 24 of 24 bulletins, 10 of 10 circulars and 6 of 6 procedures —
> `applies_to` is a pass-through, not a filter.
>
> **I argued for A and was overruled; recording why, because the risk is
> specific and testable.** The total-loss tax trap straddles the two ladders:
> the base form says "actual cash value" and is silent on tax, while
> `CIR-IL-2024-03` requires sales tax, title and registration, and
> `CIR-NY-2024-02` requires tax but *not* title fee. Under two tools those
> documents sit in different places. A model that reads *"does this settlement
> include sales tax?"* as a coverage question calls `search_policy`, gets
> "actual cash value", and answers wrong **without ever learning the circular
> exists** — a tool-choice failure wearing a reasoning failure's clothes.
>
> **So Option B ships with a required mitigation**, not as an optional polish:
> when `search_policy` returns passages for a settlement-amount question and
> guidance documents exist for that form and jurisdiction, its `note` must say
> so. That file already has the pattern — an empty filtered result returns a
> note explaining the form id is wrong rather than that the corpus is silent,
> *"because those are very different facts and the model must not confuse
> them."*
>
> **How we will know if the risk bit:** if the total-loss tax case fails with
> `search_guidance` never called, that is the routing failure, not a precedence
> failure. Check the tool calls before touching the prompt.



**The decision that unblocks Step 5.** Three options were live: a `doc_type`
metadata field with an `$or` filter, an `applies_to` multi-value on each
document, or a second search tool.

**Recommendation: a second tool.** `search_policy` is untouched;
`search_guidance` is new.

```
search_policy      forms, endorsements, amendatories, exclusion schedules
                   filter: formId, EXACT  ← unchanged, so cov-005 is unaffected

search_guidance    bulletins, circulars, procedures, manuals, determinations,
                   opinions
                   filters: jurisdiction, as-of date, status, doc_type
```

Why this over a widened filter:

- **It makes the two-ladder split structural rather than instructional.** One
  tool returning both contract and conduct documents invites the model to mix
  ladders, and the only defence would be more prompt. This repo's whole method
  is to make the right thing the shape rather than the tone — the same argument
  that put `conflicts[]` in the schema instead of asking for honesty.
- **`search_policy` does not change at all.** Its exact-match `formId` filter is
  the thing `form-id.ts` warns loudest about, and every existing case stands on
  it. Not touching it means the seven-case re-run in Step 4 measures the corpus,
  not a refactor.
- **The new filters are the gates.** Jurisdiction, as-of date and status are
  G2/G3/G4 as *filters Postgres applies*, rather than dates the model has to
  notice inside prose and reason about correctly.

### The contradiction this creates with trap 1, and the fix

Trap 1 is ranked first **because** it straddles the ladders — and under this
split its two documents live in **different tools**. A model that reads *"does
this settlement include sales tax?"* as a coverage question calls
`search_policy`, gets "actual cash value", and answers wrong **without ever
learning the regulation exists**.

That would make trap 1's failure mode *"did not call the second tool"* — a
tool-selection failure wearing a reasoning failure's clothes. It is the same
category as the turn cap in `loop.types.ts`: *"a turn cap that bites is an
infrastructure failure wearing a model failure's clothes."* The debugging budget
would go to routing instead of to precedence, which is the opposite of what the
trap is for.

**The fix is in `search_policy`, not in the prompt.** That file already has the
pattern: when a `policy_form` filter returns nothing, it does not return an
empty list — it returns a `note` explaining that the form id is wrong rather
than that the corpus is silent, *"because those are very different facts and the
model must not confuse them."*

The same move applies here. When `search_policy` returns passages for a
settlement-amount question and the `applies_to` index shows guidance documents
bearing on the same form and jurisdiction, the `note` says so:

> Passages above are the policy wording. This question may also be governed by
> claim-handling rules that the wording does not state — `search_guidance` has
> N document(s) for this form and jurisdiction. The wording alone may not settle
> a settlement-amount question.

Structural, not instructional: the tool that has the information tells the model
the other tool exists. Putting it in the prompt instead would make it one more
rule competing with the ordered procedure, and the prompt is already the longest
file in the domain.

Determinations and opinions ride in `search_guidance` behind `doc_type` rather
than getting a third tool. If the evals show the model conflating a prior
determination with a live bulletin, split it **then**, with the measurement that
justifies it.

### Ids

A **second named pattern**, never a widened `documentIdPattern` — `form-id.ts`
records that a loose match silently merged the state variants, and that regex
still drives the search filter.

```
BUL-YYYY-NN[.M]     insurer bulletin   (.M = point release, replaces identity)
CIR-<ST>-YYYY-NN    DOI circular       (jurisdiction is a FIELD; the prefix is
                                        a convenience, never parsed for scope)
PRC-NNN             claims procedure
UWM-NNN             underwriting manual
DET-YYYY-NNNNNN     prior determination
OPN-YYYY-NNN        coverage opinion
```

Anchored with `(?![-\w])`. Without it a claim id prefix-matches every
determination under it — the `PA-2023-01` / `PA-2023-01-TX` bug, again.

**`resolveCitedForm` splits in two.** It currently answers *"does this document
exist"* and *"which form is this"* with one return value. For a form those are
the same question; for a bulletin they are not, and conflating them is what
would score a real citation as a fabrication. `citations_resolve` gets
document-existence; `cites_form` keeps form-identity.

**Jurisdiction is never parsed from an id.** Real ISO numbers do not encode it —
`PP 01 99` is Virginia. Our `PA-2023-01-TX` does and is frozen; no new type
repeats it.

**Four supersession verbs, not one column**: `supersedes`, `amends_and_supplements`
(both stay operative), `withdraws`, `rescinds`. Flattening them to one loses
trap 2's control.

---

## 2.7 Decisions on what already exists

**`cov-004` is not touched.** Its countersignature premise is contradicted by
Fla. Stat. §624.425, and `AUT-4482` is rated in Florida. But Rule 2 says planted
traps survive with their wording and ids, and the load-bearing fact —
*governing-document status is unconfirmed* — is real even though the stated
mechanism is not. Rewriting flavour text would make every historical baseline
incomparable for no measured gain. The honest version ships **additively** as
trap 4. Retiring `cov-004` is a separate, separately-measured step, if ever.

**The declarations is a manifest as well as data.** The plan's DATA/DOCUMENTS
split stands, but the declarations does two jobs and the plan names one:
*values* (fetched by key) and *the manifest* naming which documents are in the
contract at all. `get_policyholder` already returns both, so **no code change is
implied** — but §2b's schema and the prompt should name the manifest role,
because G1 makes it load-bearing in a way twelve forms never did.

**`evals/fixtures/embeddings.json` should be deleted** — 3.7 MB serving only
`archive/pillar-1-handrolled/embedder.ts`. *(Proposed, not done — nothing has
been deleted.)* Not required for any step here, but it is the kind of committed
artefact that later reads as authoritative.

---

## 2.8 The documents table, and an asymmetry in the plan

### The asymmetry

The plan is careful about this for **records**:

> Eighteen markdown records look toy-sized, but they **stand in for an API call
> to a system of record**, and at a real customer `get_policyholder` becomes
> exactly that.

It is not careful about it for **documents**. `examples/policies/*.md` gets
treated as the corpus rather than as a stand-in, and the pipeline's input
boundary is a **directory** — `loadDirectory()`, called from `ingest.ts:80` and
`cli.ts:68`.

No customer has a directory. They have a document management system — FileNet,
SharePoint, Documentum, OpenText, Guidewire ContentManagement — with metadata
attached and an access path that is not a filesystem. §2b of the plan says this
in its first sentence and then does not follow it through to the seam.

**The committed markdown stands in for their DMS exactly the way the eighteen
records stand in for their policy admin system.** Both are fixtures. Only one is
currently labelled as one.

### Three layers, and which of them ships

```
THEIR DMS  /  our seed files   →   documents table    →   policy_chunks
scanned PDF, metadata, ACLs        raw, UNCHUNKED,        chunks + vectors
  ── the customer's reality        precedence metadata    what search reads
  ── our git-committed fixture     the source of truth    DERIVED, rebuildable
```

- **Layer 1 is the customer's, and it is the only one we do not build.** In this
  repo it is the seed files, in git, diffable, reviewable in a PR — which is
  what keeps "why did last week's baseline differ" answerable. That property is
  real and the plan is right to insist on it.
- **Layer 2 is the source of truth at runtime**, and it holds documents **whole
  and unchunked**. The plan's draft schema already has this right: `body text
  not null`.
- **Layer 3 is derived and disposable.** Chunk size is already a tunable
  (`maxChars` 1200/400/200/120) and will change. If chunks were the only stored
  form, re-chunking would mean going back to a source you no longer have.

### What actually ships to a customer

This is the part worth being precise about, because it changes what we build.

| piece | this repo | a customer | ships? |
|---|---|---|---|
| `corpus:load` | seed files → documents | — | **no**, scaffolding |
| `DocumentSource` adapter | reads the seed dir | reads their DMS | **yes**, one file |
| documents table | ours | ours, beside theirs | yes |
| chunk + embed + search | unchanged | unchanged | yes |

So the deliverable is not "a loader". It is **a named seam with two
implementations**, which is precisely the argument `store.ts` already makes for
itself:

> WHY THIS IS THE ONE FILE THAT CHANGES PER ENGAGEMENT. […] landing on a new
> customer means editing `openStore()` and nothing else.

`loader.ts` deserves the same treatment and does not have it yet — though it
half-anticipates it:

> the day a real insurance corpus arrives — **mostly scanned PDF** — swapping
> `TextLoader` for a PDF loader changes this file and nothing downstream.

That comment is correct and is the argument for doing this now rather than
later. What it misses is that a DMS swap changes *where documents come from*,
not just *how they are parsed* — and `loadDirectory(root: string)` has a
filesystem path in its signature, so it cannot express "fetch by document id
from an API" without changing its callers.

### The finding this predicts at a real engagement

**Their metadata will not answer the precedence question.** `effective_on`
half-populated, `supersedes` tracked in a spreadsheet or nowhere,
`jurisdiction` implied by a folder name. That is normal, and discovering it is
often the most valuable thing an FDE delivers in week one.

It has a direct design consequence here: **the four gates must be three-valued,
not boolean.**

```
pass      the metadata says this document is in scope
fail      the metadata says it is not      → exclude
unknown   the metadata does not say        → ESCALATE, never assume
```

`unknown` collapsing into `pass` is how a withdrawn circular gets applied.
`unknown` collapsing into `fail` is how a governing endorsement goes missing.
Neither is acceptable, and the third value is the honest one.

This is `cov-004` generalised — *status unconfirmed, therefore escalate* — which
is a good sign: the corpus already contains the shape, and the gates model turns
one hand-placed trap into a general rule.

### Ordering

Build the table **before** generating (§2.10 already sequences it 2b → 3), so
the 67 documents are loaded into it rather than migrated into it afterwards.
But the generator still writes **files**, not rows. Generating straight into the
database would trade away the git-evidence property for nothing — the load step
is cheap, and it has to exist anyway for the customer path.

### Schema corrections

Unchanged from the plan in shape; four corrections from the research.

- **`supersedes` becomes a relation with a verb**, not a nullable column —
  four verbs, and `amends_and_supplements` means both rows stay live.
- **`status` is its own column**, not derived from `supersedes`. NY DFS
  withdraws circulars **by index**: a document can be dead while its own body
  says nothing. That is precedence existing only in metadata, and it is the
  strongest insurance-real argument for the table.
- **`jurisdiction` is nullable = national**, and is a hard gate at query time.
- **`applies_to`** — which forms a bulletin bears on — is needed for trap 1 and
  has no home in the plan's draft schema.

Still true, and still the trap to avoid: **no policyholder records in this
table.** They are fetched by key, never searched, and a documents table sitting
right there is the temptation that would undo `get_policyholder`.

---

## 2.9 Two contract changes to settle before Step 5

- **`resolved_by` is a single nullable string** (`coverage-schema.ts:89`). Under
  the gates model a resolution can need two sources — the record names the
  endorsement *and* the newer bulletin states supersession. If it becomes an
  array, that is a **second setup change** landing with the prompt, and it
  changes the strict JSON schema on the wire. (`compliance:mastra` asserts
  `response_format.type === 'json_schema'`, not the schema's internals, so it
  would not break — but it is a contract change either way.)
- **No check can see tool order.** Every check in `checks.ts` is
  `(a: CoverageAnswer) => CheckResult`, and `CoverageAnswer` carries no trace, so
  `calls-the-record-first` cannot be written today. `run.ts:148` already has
  `result.turns` in scope, so the fix is small — and every new check also needs
  a severity bucket in `scorecard.ts`, or `scorecard-selftest.ts` fails, which
  is exactly what it is for.

---

## 2.10 Revised order

```
1   research      DONE — docs/corpus-research/README.md
2   design        THIS SECTION — review gate here
2b  documents     Postgres, with the four schema corrections
3   generate      seeded, additive, committed
3b  retrieval     search_guidance + the id pattern + resolveCitedForm split
4   re-run 7      corpus + prompt land together, or the diff means nothing
5   grow cases    to 25-30, with the controls for traps 2 and 3
6   measure       hybrid + reranker; turn the size dial up only if 356 is too
                  small to show a difference
```

**3b is new**, and it is why the plumbing was traced before any document was
written: without it, `superseded-bulletin` and `state-circular-overrides-form`
fail for reasons that have nothing to do with retrieval.

**Step 4 is two runs, one variable each.** An earlier draft of this section said
corpus and prompt had to move together and the diff would just have to be muddy.
That is wrong, and it is worth correcting because it gave away a measurement for
nothing.

The *new cases* are unanswerable under the old prompt. But **Step 4 runs the
existing seven**, and not one of them involves a bulletin, a circular, or stated
precedence — they are answerable under the old prompt on the new corpus. So:

```
run A   new corpus + OLD prompt    did the bigger haystack break what works?
run B   new corpus + NEW prompt    did the prompt change break what works?
```

Two clean single-variable measurements instead of one confounded one. Run A is
the one the plan originally wanted and is still available; run B is the one that
guards the prompt change. Only the *new* cases in Step 5 require B, and by then
the prompt is no longer a variable.

---

## Open for review, before Step 3

1. **Corpus size: ~782 chunks** — 67 new documents across **ten** shapes, 6.1×
   today, measured from the sample skeletons rather than estimated, against the
   plan's ~2,000. The ratio between types is the judgment call; the chunk count
   that follows from it is now arithmetic.
2. ~~**A second tool** (`search_guidance`) rather than widening the `formId`
   filter.~~ **DECIDED 2026-09-11: Option B, the second tool** — see §2.6 for
   the routing risk it carries and the mitigation that is part of the decision.
3. **`cov-004` left factually wrong**, with the honest version planted
   alongside, rather than corrected in place.
4. **Step 4 as two runs** — new corpus with the old prompt, then with the new —
   rather than one run with two variables moving. Costs a second baseline; buys
   two clean attributions.
5. **`loader.ts` becomes a named `DocumentSource` seam** with two
   implementations — seed directory here, a DMS adapter at a customer — rather
   than `loadDirectory(root: string)` with a filesystem path in its signature.
   This is the piece that actually ships, and it is the same argument
   `store.ts` already makes for the vector store. (§2.8)
