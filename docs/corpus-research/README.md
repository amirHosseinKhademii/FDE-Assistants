# What a claims corpus actually holds — Step 1

*Written 2026-09-11. This is the deliverable for
[`CORPUS-PLAN.md`](../plans/CORPUS.md) Step 1, and the input to Step 2.
**No code was written and no corpus file was touched.***

Four researchers covered ten document types from primary sources — state DOI
sites, NAIC model laws and the Market Regulation Handbook, regulator-mandated
form orders, publicly filed carrier forms, market-conduct exam reports, and case
law. Their full sections live in [`corpus-research/`](corpus-research/) and are
where the sourcing is; this file is the synthesis and the decisions that follow
from it.

| file | covers | lines |
|---|---|---|
| [`00-code-facts.md`](00-code-facts.md) | what OUR code does today, measured | 233 |
| [`10-forms-and-endorsements.md`](10-forms-and-endorsements.md) | forms, endorsements, state amendatories, declarations | 923 |
| [`20-manuals-and-bulletins.md`](20-manuals-and-bulletins.md) | underwriting manuals, claims procedures, adjuster bulletins | 1076 |
| [`30-regulatory.md`](30-regulatory.md) | DOI circulars, regulations, statutes | 571 |
| [`40-determinations-and-opinions.md`](40-determinations-and-opinions.md) | file notes, position letters, RORs, denials, coverage opinions | 1146 |

**Copyright.** Nothing below reproduces licensed form wording. Real ISO text is
licensed material; everything generated must be original prose in the *shape* of
these documents, keeping the existing "Fictional document, written for an FDE
practice engagement" banner.

---

## 1. The finding that reorganises the plan

`CORPUS-PLAN.md` Step 2 asks for "the precedence graph. Which document type
beats which." The research says **there is no single such graph**, and two
researchers reached that independently from different sources.

From [`30-regulatory.md`](30-regulatory.md):

> A DOI bulletin does **NOT** beat a policy form as a matter of law — bulletins
> "neither establish binding norms nor finally determine issues or rights"
> absent APA rulemaking.
>
> A DOI bulletin **DOES** beat an internal claims procedure in practice, because
> departure is examined as a general business practice during market conduct
> exams.

From [`20-manuals-and-bulletins.md`](20-manuals-and-bulletins.md):

> The policy form beats a bulletin on coverage, always — **the bulletin binds
> the adjuster, not the contract.**

So precedence depends on **what is being asked**, not only on which documents
were retrieved:

```
"what does this policy PAY?"          "how must this claim be HANDLED?"
    a contract question                   a conduct question
    the insured can sue on it             the regulator examines it
    bulletins are irrelevant              policy forms are irrelevant
```

The same two documents can be retrieved for both questions and the winner is
different. That is the new hard problem, and it is more interesting than the
ladder the plan anticipated.

---

## 2. The precedence model

### 2.1 Four gates — in or out, never a tiebreak

A gate does not rank documents. It decides whether a document is **in the
contract / in scope at all**. A document that fails its gate is not outranked,
it is absent. Each gate applies to specific types; written as a flat universal
list they would be encoded wrongly.

| # | gate | applies to | the rule | source |
|---|---|---|---|---|
| **G1** | **Manifest** | forms, endorsements | The policy consists of the most recently issued **declarations**, the form edition shown on it, and the endorsements shown on it. An endorsement absent from that schedule is not in the contract. | State Farm 9836C *THIS POLICY*; *Nat'l Union v. Lumbermens* (1st Cir. 2004) |
| **G2** | **Jurisdiction** | amendatories, circulars, regulations | A state amendatory does not apply outside its state at all. "**Jurisdiction is a hard gate, not a tiebreak.**" A bulletin in State A does not reach a policy issued in State B. | VA SCC administrative order; NY DFS CL 3 (2009) |
| **G3** | **Date of loss** | everything | The policy and endorsements in force **on the date of loss** govern. A newer edition does not beat the edition named on the declarations for a loss inside that policy period. Applicability date beats enactment date and beats loss date for new rules. | State Farm 9836C; CA SB 1107 |
| **G4** | **Status** | bulletins, circulars | Superseded / withdrawn / rescinded documents stay retrievable and must be disregarded. Status is **stored data**, not derivable — "a 2023 bulletin may be superseded by a 2025 bulletin that is not adjacent under any id sort." | DE bulletin archive; IN Bulletin 141; NY withdrawn-circulars index |

**G1 is the one that matters most to this repo**, because `get_policyholder`
already returns it. The declarations is not merely "data fetched by key" — it is
the **root node of the precedence graph**, the manifest naming which documents
are in the contract before any ranking question arises. The existing
architecture was right for a deeper reason than it stated.

**G4 has a case the plan did not anticipate**, and it is the strongest argument
for Step 2b's `documents` table: NY DFS withdraws circular letters **by index**.
A circular can be dead while its own body says nothing about it. That is
precedence that exists **only in metadata** — unreachable by any amount of
reading the document, and therefore unreachable by retrieval over its text.
It is an insurance-real reason for the schema, not an engineering convenience.

### 2.2 Two ladders, chosen by question type

Only after the gates. Higher beats lower.

**Coverage ladder — "what does the policy pay?"**

```
1  statute / regulation       voids a provision below the statutory floor
2  state amendatory           for that state, on the provisions it names
3  endorsement                changes the form's terms on the subject it names
4  base policy form           governs every subject no endorsement addressed
   ────────────────────────
   declarations               SUPPLIES the values the form delegated to it
                              (not a conflict — see 2.3)
```

Bulletins, claims manuals, underwriting manuals and prior determinations **do
not appear on this ladder at all.**

**Conduct ladder — "how must this claim be handled?"**

```
1  statute / regulation       unfair-claims acts, deadlines, itemization rules
2  DOI circular / bulletin    interprets 1; loses to 1 where they diverge
3  insurer adjuster bulletin  dated guidance; supersedes by G4
4  claims procedure manual    the standing procedure the bulletin amends
5  adjuster discretion
```

Policy forms **do not appear on this ladder at all.**

**Terminal fallback: ESCALATE.** The legal terminal tiebreaker is *contra
proferentem* — ambiguity construed against the insurer. That is a **legal
judgment a court makes**, not something a research assistant applies. Naming it
in the prompt would re-open exactly the invented-precedence hole the current
rule closes. Where the ladders do not resolve it, the answer is a human.

### 2.3 What is NOT a conflict

Worth stating, because the model will otherwise report these as conflicts and
`flags_conflict` will start firing on non-events:

- **The declarations supplying a delegated value.** "Limits shown in the
  Declarations" is the form *pointing at* the record, not disagreeing with it.
- **A base form silent where an endorsement speaks.** Scoped override, not
  contradiction.
- **A bulletin and a form answering different questions.** Only a conflict if
  both bear on the same ladder.

### 2.4 The boundary case — plant it, do not resolve it

The two ladders have a documented overlap, and it is the sharpest new trap in
the research:

> A state regulation beats a national policy form on claim-settlement mechanics
> — comparable-vehicle selection, itemization, **taxes and transfer fees**,
> reopen windows — even where the form says only "actual cash value."
> — 10 CCR 2695.8

That is a **regulation beating a form on the amount paid**. By document type it
routes to the conduct ladder; by what the adjuster is asking it routes to
coverage. The router has to classify the *question* before it picks a ladder,
and this is the class where classification is genuinely hard.

And the cross-border contradiction is already sourced: **Colorado** mandates
title fees, sales tax and transfer/registration fees on a total loss;
**New York** requires sales tax in ACV but **not** a title transfer fee.

This should be a planted trap, not a papered-over edge. A case asking *"does
this total loss settlement include sales tax and registration fees?"*
discriminates between a model that routes by question and one that routes by
document type. Nothing else in the proposed set does.

---

## 3. Identifier schemes

### 3.1 The finding that kills one regex

**Real form numbers do not encode jurisdiction.** ISO's scheme is
`PP 00 01 09 18` — two-letter line prefix, four-digit form number as two pairs,
edition `MM YY`. The state amendatories are `PP 01 99` (Virginia),
`PP 01 50` (Texas), `PP 01 75` (Maine) — **the state is not in the number.**
Virginia's mandated set also spans `PP 03 27`, `PP 04 83`, `PP 13 48` and more.

Our corpus uses `PA-2023-01-TX`, which encodes it. That is **unrealistic and
frozen** — every eval case and the `form-id.ts` exact-match rule stand on it.
It stays. But **no new type may repeat the mistake**: jurisdiction is a field
read from the title and metadata, never parsed from digits.

### 3.2 Real conventions found, per type

| type | real-world format | notes |
|---|---|---|
| ISO form | `PP 00 01 09 18` | also seen `PP13 68 01 20` (no space), `pp-00-01-09-18`. Two-digit years cross centuries — a pivot rule is a guess. Copyright year is usually one year **before** the edition date |
| carrier form | `9836C`, `153-7341 WI (10/2022)`, `A402ME(01) 05-15`, `G01ME00 (10-13)`, `2312697-1218`, `SA-2890` | five families, no shared shape. Design as a family with a discriminator, never one pattern |
| DOI circular (NY) | `Insurance Circular Letter No. 3 (2009)`; supplements `Supplement No. 1 to …` | two live URL slugs: `cl2024-04` and `cl2024_01` |
| DOI bulletin (TX) | `Commissioner's Bulletin # B-0014-24` | `B-\d{4}-\d{2}`, zero-padded. Legacy non-`B` items exist |
| DOI bulletin (CA) | `Bulletin 2024-7` | **not** zero-padded; pre-2000 `Bulletin 99-4` |
| DOI memo (FL) | `OIR-23-04M` | trailing letter is a class code — do not hard-code `M` |
| DOI bulletin (IL) | `Company Bulletin 2024-09`, cited later as `CB 2020-06` | |
| DOI bulletin (CO) | `Bulletin No. B-5.51` | **topic series, no year**; revisions reuse the number |
| insurer bulletin | `2021-5.1` (point release) vs `51A` (letter suffix) | **the id form signals different semantics** — see 3.3 |
| determination | no standard. Guidewire: draft `999…`, open `000…` | cited **by date**, not by id — "our letter of [date]" |

### 3.3 The point-release / letter-suffix fork

The most useful small finding in the set:

- **`2021-5.1` replaces its predecessor's identity** — the point release *is*
  the bulletin now.
- **`51A` coexists with `51`** — both live, read together.

The id form alone signals which supersession semantics apply. Worth encoding,
because it gives a trap that is visible in the identifier and still wrong to
guess from.

### 3.4 Four supersession verbs, not one

Not interchangeable, and the plan's single `supersedes` column flattens them:

| verb | effect | example |
|---|---|---|
| **supersedes** | predecessor dead | ND `2021-5.1 (Supersedes Bulletins 2019-1 and 2021-5)` |
| **amends and supplements** | **both stay operative, read together** | ND `2025-1 Amending and Supplementing Bulletin 2021-4` |
| **withdraws** | batch kill, adds no guidance | IN Bulletin 141 — ~90 bulletins at once |
| **rescinds / replaces** | annotation-only status | DE archive |

`amends and supplements` is the one that matters: a model that treats every
later bulletin as killing the earlier one gets it wrong, and that is a better
trap than plain supersession because the wrong answer looks disciplined.

---

## 4. Three real-world corrections to the existing corpus

These are findings about what is **already committed**, not proposals.

### 4.1 The `cov-004` trap rests on a fiction

`AUT-4482`'s record says the endorsement's "countersigned copy has not been
returned by the agent," so its status is unconfirmed. The research:

> **Absence of countersignature does NOT defeat an endorsement or a policy.**
> Florida's countersignature statute says expressly that the absence of a
> required countersignature does not affect validity, and resident-agent
> countersignature statutes were struck down or repealed in all 50 states
> between 2003 and 2005. — Fla. Stat. §624.425

And sharper than the researcher knew: **`AUT-4482` is rated in Florida**
(`| Rated state | Florida |`, `PA-2023-01-FL`). The trap is contradicted by the
statute of the exact state the record sits in.

**Decision: do not touch `cov-004`.** Rule 2 of the plan says planted traps
survive and existing documents keep their wording and ids; changing
`ENDORSEMENT_NOTE` would break additivity and make every historical baseline
incomparable for a flavour-text fix. The load-bearing fact in that case is
*"governing document status is unconfirmed"*, and that fact is real even though
the stated mechanism is not.

**Instead, plant the realistic version additively**: an endorsement **absent
from the declarations' schedule of forms** — which is gate G1, is well sourced,
and is a better test because it is a *manifest* question rather than a
*signature* question.

**Retiring `cov-004` is a separate, separately-measured step**, if ever. Noted
here so it is a thing we found rather than a thing a reviewer finds.

### 4.2 The declarations is under-modelled as pure DATA

`CORPUS-PLAN.md`'s central distinction — DATA is fetched by key, DOCUMENTS are
searched by meaning — is right and should stand. But the declarations page does
**two** jobs and the plan names only one:

```
VALUES     limits, deductibles, vehicle, dates      → DATA, fetched by key ✓
MANIFEST   which form edition and which endorsements → the ROOT of the
           are in this contract at all                 precedence graph
```

The manifest half is not a value lookup; it is the gate every coverage question
passes through first. `get_policyholder` already returns both, so **no code
change is implied** — but Step 2b's schema and the prompt should name the
manifest role explicitly, because the new document types make it load-bearing in
a way twelve forms never did.

### 4.3 The stale-determination trap is subtler than the plan states

`CORPUS-PLAN.md` proposes *"a prior claim determination that contradicts the
current form because the policy has since been re-issued."* As written, that is
too crude:

> A prior settled judicial construction beats the insurer's new contrary
> reading, **when the insurer continues to use the identical policy language.**
>
> The new edition's text beats a prior construction **when the wording changed
> between editions** — the settled-construction doctrine is keyed to *unchanged*
> language.

So an old determination under a superseded edition is **still good authority**
if the relevant wording did not change. The edition date alone settles nothing.

That demands a **control pair**, in exactly the shape `cov-007` is the control
for `cov-001`:

| case | setup | correct answer |
|---|---|---|
| stale | prior determination, old edition, **wording changed** | the current form governs; the determination is history |
| control | prior determination, old edition, **wording unchanged** | the determination is still authority |

A fix that makes the model distrust every old determination turns one green and
the other red. A case that can only be passed by over-correcting is how an
over-broad fix gets caught — which is the discipline the existing set already
has and the plan's one-line version would have lost.

---

## 5. What the research says about our own code

Full detail in [`00-code-facts.md`](00-code-facts.md); the four
findings, briefly, because Step 2 has to decide on all of them:

1. **`documentIdPattern` returns `""` for every new type.** Consequence (a):
   `citations_resolve` fails, and `scorecard.ts` counts that under **"false
   answers (dangerous)"** — so bulletins would inflate the exact metric Step 6
   measures. Consequence (b): `ingest.ts` stamps `formId: ''` and
   `search_policy` filters on `formId` equality, so **bulletins are unreachable
   by any filtered search**, making two of Step 5's cases unpassable by
   construction. The fix must **not** be widening the pattern — `form-id.ts`
   records that a loose match silently merged the state variants.
2. **No embedding cache on the live path.** `evals/fixtures/embeddings.json` is
   3.7 MB serving only the archived hand-rolled embedder. Ingest cost is linear
   in chunk count, which is what makes the chunk budget in §6 a real decision.
3. **"Additive" is tighter than it reads.** `HOLDER_ROWS` is 12-field positional
   arrays; a 13th field edits all 18 rows. New per-record data goes in a side
   table keyed by id, as `OCCUPATION` already does.
4. **The system prompt forbids the reasoning the new cases require.**
   *"Never resolve a conflict yourself by preferring the newer document, the
   more specific one, or the one that seems more reasonable"* kills
   `superseded-bulletin`, `state-circular-overrides-form` and
   `prior-determination-is-stale` outright.

**Finding 4 is resolved by the gates model**, and the research validates the
distinction independently:

> A later DOI circular beats an earlier one **only where supersession is
> stated** — otherwise both stand.

What the current rule correctly bans is **precedence the model invents**.
What the new corpus introduces is **precedence the documents state**. The rule
grows to:

> Resolve a conflict only when something **states** which document governs — a
> policyholder record's schedule of forms, a supersession notice, a jurisdiction
> clause, or an effective date written in the document. Never resolve it from
> your own sense that one document is newer, more specific, or more reasonable.
> **If the precedence is not written down somewhere you retrieved, it does not
> exist** — escalate.

That keeps `cov-004` red-for-the-right-reason (nothing *states* whether the
endorsement is in force) while making the new cases reachable.

The research also supplies the negative control for this rule. The folk rule
*"the most recently issued endorsement beats an earlier conflicting one"* is
recorded as **lowest confidence in the whole set**, with no primary source, and
is contradicted by case law holding that two endorsements modifying the same
provision render the policy **ambiguous and negate the restriction**. It stays
banned, and it is worth a case.

### Two consequences for the wire contract

- **`resolved_by` is a single nullable string** (`coverage-schema.ts:89`). Under
  the gates model a resolution can need two sources — the record says the
  endorsement is attached *and* the newer bulletin says it supersedes. If it
  becomes an array that is a **second setup change** landing with the prompt,
  and it changes the strict JSON schema on the wire. (`compliance:mastra`
  asserts `response_format.type === 'json_schema'`, not the schema's internals,
  so it would not break — but it is a contract change either way.)
- **No check in `checks.ts` can see tool order.** Every check is
  `(a: CoverageAnswer) => CheckResult`, and `CoverageAnswer` carries no trace.
  Step 5's `calls-the-record-first` needs a new check *kind* reading
  `TurnRecord[]`. `run.ts:148` already has `result.turns` in scope, so it is
  small — but it is invisible in the plan's one-line description.

---

## 6. What this implies for Step 2

Carried forward as proposals, to be decided in the design section:

- **The precedence model is gates + two ladders + escalate**, not one graph.
- **New id patterns are a second named pattern**, never a widened
  `documentIdPattern`. Anchor them with `(?![-\w])` — without it a claim id
  prefix-matches every determination under it, reproducing the exact
  `PA-2023-01` / `PA-2023-01-TX` bug `form-id.ts` documents.
- **`formId` is the wrong filter key for the new types.** How a bulletin enters
  the candidate set for a form-filtered query has to be settled now — a
  `doc_type` field, an `applies_to` multi-value, or a second tool. This is the
  decision that unblocks Step 5.
- **Jurisdiction, effective date and status are fields**, never parsed from ids.
- **Four supersession verbs**, not one `supersedes` column.
- **Traps worth planting**, in rough order of value:
  1. total-loss tax/fee — the ladder-router boundary case, cross-border sourced
  2. superseded bulletin, with an `amends and supplements` sibling as control
  3. stale determination, with an unchanged-wording determination as control
  4. endorsement absent from the declarations schedule (the honest `cov-004`)
  5. withdrawn-by-index circular — status only in metadata
  6. two endorsements on the same provision → ambiguity, escalate, never "latest wins"
- **Corpus size is measured, not estimated.** One canonical sample document per
  new type is in [`corpus-research/skeletons/`](corpus-research/skeletons/), and
  `CORPUS_DIR=… pnpm chunks` over them gives **~782 chunks** for the ratio in
  CORPUS-PLAN.md §2.3 — 6.1× today. An estimate built from document *length* was
  2.5–3× low, because **chunk count tracks heading density, not word count**: a
  337-word determination produces 7 chunks. The same free run also showed
  `orphans=0` on the new table shapes and `0 distinct form ids` across all six —
  live confirmation of §5.1.

---

*Step 2 — the design — is next, and the plan says it is reviewed before
anything is generated.*
