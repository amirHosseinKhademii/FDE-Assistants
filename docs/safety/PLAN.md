# A fourth engagement — the plan, before any code

*Written 2026-09-17. Nothing has been built. Every number below was measured
against the live NHTSA API on 2026-09-16/17, and the command that produced it is
shown so you can re-run it rather than trust it.*

**Read this before anything else in this folder.** It is deliberately slow: what
the data is, why it was chosen, what the assistant would do, and what we do NOT
know yet. No code until the questions at the end are answered.

---

## 1 · Why a fourth engagement at all

The three existing ones share a weakness: **their corpora are fabricated.**
`docs/examples/`, Meridian Pharma's six databases and Vantis' 922 documents were
all written to contain exactly the traps we wanted to teach. That is the right
way to learn a pipeline — you can only measure retrieval if you know the answer.

It also means nothing here has met data that was **not** designed to be
tractable. Real data is misspelt, self-contradicting, inconsistently formatted
between one endpoint and the next, and full of things nobody thought to
categorise.

So the purpose of this engagement is narrow and specific:

> **Take the machinery that works on a corpus we wrote, and point it at a corpus
> nobody wrote for us.**

If `@fde/grounding`, `@fde/agent`, `@fde/schema` and `@fde/evals` transfer
unchanged, that is the claim `docs/TEMPLATE.md` makes, tested for the first time.
If they do not, the places they break are worth more than the ones that hold.

---

## 1b · Where it will live

**`SAFETY_DATABASE_URL`** — a Neon project of its own,
`ep-calm-leaf-b22bvt1j`, eu-central-1, database `neondb`. Verified reachable
2026-09-17: **empty, and `vector` is not installed yet** (stage 3.4 installs it).

A SEPARATE PROJECT FROM THE OTHER THREE, deliberately — the same reason pharma
and steering have their own. A mistyped base URL cannot then reach across and
drop another engagement's estate, which is the accident
`apps/ai/steering/src/config/connections.ts` already guards against by name.

---

## 2 · The data: NHTSA vehicle safety

The US National Highway Traffic Safety Administration publishes every safety
complaint a consumer files, every recall a manufacturer issues, and every defect
investigation it opens.

**Free. No API key. US federal government work, so public domain.**

Three sources, and their shapes are different on purpose:

| source | shape | what it is |
|---|---|---|
| **complaints** | free-text narratives + loose fields | a person describing what happened to their car |
| **recalls** | structured records with prose blocks | the manufacturer's official statement of defect, consequence and remedy |
| **investigations** | documents | NHTSA's own enquiries, which may precede a recall |

Reproduce the two that are wired today:

```bash
curl -s "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=honda&model=odyssey&modelYear=2019"
curl -s "https://api.nhtsa.gov/recalls/recallsByVehicle?make=honda&model=odyssey&modelYear=2019"
```

**Bulk flat files — all verified HTTP 200 on 2026-09-17:**

```
https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip            complaints
https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip    recalls
https://static.nhtsa.gov/odi/ffdd/inv/FLAT_INV.zip              investigations
https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt                 data dictionary
https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt                   data dictionary
```

The recalls file does **not** follow the others' naming — it is
`FLAT_RCL_POST_2010`, split by era, and `FLAT_RCL.zip` is a 404. Guessing the
path failed five times; the answer came from NHTSA's own download page.

**The `.txt` files are data dictionaries and we will need them**: the flat files
are pipe-delimited with **no header row**, so a column is only knowable by
position. Mis-aligning a column would not error — it would put narratives in the
date field and nothing would say so. Same class as the date-format trap.

`FLAT_CMPL.zip` reports `last-modified` yesterday, so the source moves daily —
which is an argument for a frozen snapshot, see §9.2.

`/investigations/investigationsByVehicle` returns **403**. Investigations are
available as a flat file but not via that API path. Also §9.

---

## 3 · How messy it actually is — measured, not asserted

All figures from **one vehicle**, the 2019 Honda Odyssey:

| | |
|---|---|
| complaints on file | **956** |
| narratives in ALL CAPS | **131 (13%)** |
| narrative length | **7 to 2,076 characters** |
| distinct `components` strings | **143** |
| complaints carrying a VIN | 939 of 956 |

**143 component strings for one vehicle** is the headline. It is a controlled
vocabulary that is not controlled — values arrive comma-joined and unordered,
e.g. `POWER TRAIN,UNKNOWN OR OTHER,ENGINE`. Any grouping by component has to
decide what to do with that, and the decision changes the answer.

### The typos are in the official text too

Two recalls for the same vehicle, filed by the same company:

```
"Honda (American Honda Motor Co.) is recalling certain 2018-2020 Odyssey…"
"Honda (America Honda Motor Co.)  is recalling certain 2018-2020 Odyssey…"
```

Manufacturer name as a join key would silently split that into two companies.

### The date-format trap, which caught this analysis first

The two endpoints use **different date formats**, and neither says so:

```
complaints   09/14/2026   MM/DD/YYYY
recalls      28/07/2020   DD/MM/YYYY
```

Proved from the data rather than assumed — in the complaints the first field is
never above 12 and the second sometimes is; in the recalls it is the reverse.

**This is the single most valuable thing in the dataset for teaching purposes.**
The first version of the analysis in §4 parsed both as `DD/MM/YYYY`, silently
discarded every complaint whose day was above 12, and returned a confident,
plausible, wrong number. Nothing errored. It is the same failure shape as a
green check covering an assertion that never ran.

---

## 4 · The conflict is real, and nobody planted it

The insurance engagement **plants** contradictions so escalation can be
measured. Here they already exist.

```
RECALL 20V437000 — reported to NHTSA 2020-07-28
  component: LATCHES/LOCKS/LINKAGES:DOORS:LATCH
  defect:    water may enter the outer door handle cables for the sliding doors
  remedy:    "dealers will replace the power sliding door outer handle cables,
              free of charge"
```

And then, in the same public record:

```
51 of 55 sliding-door / latch complaints were filed AFTER that recall.

2026-09-07  ODI 11762525  "The rear latch on the passenger sliding door has
                           stopped latching. The part seems rusted out…"
2026-09-12  ODI 11763843  "The sliding doors aren't latching; when trying to
                           close them, they refuse."
```

**Six years after the remedy shipped.** The manufacturer's record says the defect
was addressed. The public record says people are still reporting it.

That is not proof the remedy failed — the complaints may be unremedied vehicles,
a different failure with the same symptom, or owners who never responded to the
notice. **Which is exactly why it is the right problem:** it is a real question
that a document cannot settle and a person must judge. It is the same shape as
`conflicts` + `escalate` in the insurance answer contract, arrived at honestly.

---

## 5 · The engagement

**The customer (fictional, as before): Calder Safety.** They watch the public
safety record on behalf of fleet operators, insurers and law firms — people who
own or underwrite a lot of vehicles and need to know what is wrong with them.

**The persona: an analyst with a question they cannot answer quickly.**

> *"We run 400 of these vans. Is the sliding-door problem a known defect with a
> remedy, or something new? And is the remedy actually holding?"*

Today that means reading hundreds of narratives by hand, cross-referencing recall
campaigns, and forming a judgement. It is hours of work, and the output is a
paragraph with citations.

**What the assistant must do, and must refuse to do:**

- say whether an open recall covers the described symptom, **citing it**
- quote the complaints it relied on, **verbatim, with their ODI numbers**
- say plainly when the pattern matches **no** recall — an absence is an answer
- surface the complaints-after-remedy tension **without resolving it**
- **never** state that a remedy failed. That is a regulatory conclusion with
  legal weight, and it belongs to a person. The assistant reports the tension
  and names who decides.

That last rule is this engagement's version of *"a quotation is a contract and a
named person signs it"* from Vantis.

---

## 6 · How it maps onto what already exists

| the pattern | here |
|---|---|
| `get_policyholder` — exact lookup, never searched | `get_recall(campaign)` — `20V437000` is an id, not a search term |
| `search_policy` — hybrid search | `search_complaints` — over narratives, where top-k is often junk |
| planted conflicts | **real** ones — §4 |
| escalate when not in the corpus | "no recall covers this" → a named owner |
| citations with file + line | ODI number + filing date + verbatim quote |

It also exercises the docs written this month, which nothing has yet:

- **`docs/rag/CORRECTIVE.md`** — search has no score cutoff, and on 956 noisy
  narratives the top 6 are frequently all irrelevant. This is the corpus that
  makes a corrective step measurable rather than theoretical.
- **`docs/rag/GRAPH.md`** — complaint → component → recall → manufacturer is a
  genuine graph, and "what else shares this component" is a real question.
- **`docs/beyond-retrieval/CREDENTIALS.md`** — see §7, which is not theoretical
  here.

---

## 7 · The part that is genuinely different: this is real people's data

The three existing corpora are invented, so *"free tiers commonly train on what
you send"* was a caveat with no teeth. **That changes here.**

- **939 of 956 complaints carry a VIN.** NHTSA truncates them to 11 of 17
  characters (`5FNRL6H23KB`), which identifies model and plant but not the
  individual vehicle. That truncation is a deliberate de-identification step and
  we must not undo it — for example by joining it back to anything.
- Case is inconsistent (`5FNRL6H23KB`, `5fnrl6h7xkb`), so anything keyed on VIN
  needs normalising, which is itself a decision about identity.
- **39 of 956 narratives name a family member or a place** — *"My daughter will
  be driving…"*. These are real people describing crashes, fires and injuries.

The data is lawfully public and we may use it. **That is not the same as it
being weightless.** Sending it to a free tier that trains on inputs is a
different act from sending a corpus we invented, and this engagement should say
so in its own `DATA-RESIDENCY.md` rather than inherit a shrug.

**A concrete consequence for the build:** `EMBEDDINGS=local` stops being a cost
decision and becomes a data decision. Embedding runs over every passage;
local embeddings mean the narratives never leave the machine. We already
measured (`docs/FREE.md` §8c) that local bge-small matches the paid Azure model
at recall@k 0.813 — so there is no accuracy argument for sending them out.

---

## 8 · The build order — deliberately small steps

Nothing here is started. Each step ends with something you can run and check by
hand, and **no step begins before the one above it is verifiable.**

**Step 0 — decide the scope.** §9. Nothing is built until this is answered.

**Step 1 — get the data onto disk, and nothing else.** A fetcher that pulls a
chosen slice to JSON, a checked-in sample, and a written note of what came back:
counts, field coverage, and every format inconsistency found. **No embedding, no
model, no database.** The output is a document describing the data, the way
`docs/plans/CORPUS.md` describes the insurance corpus.

**Step 2 — the answer key, by hand.** Pick ~8 questions a fleet analyst would
actually ask. Answer them **manually** from the files, writing down the ODI
numbers and quotes that settle each. This is the eval set, and it must exist
before retrieval so we are not grading the system against itself. Vantis'
`WALKTHROUGH.md` is the model for this.

**Step 3 — ingest and search only.** Chunk, embed locally, store, hybrid search.
Then measure **recall@k against step 2's answer key** and nothing else. No
agent, no contract. If retrieval cannot find the passages we already know are
the right ones, nothing above it can work.

**Step 4 — the two tools and the answer contract.** `get_recall` exact,
`search_complaints` hybrid, a Zod schema with `citations`, `conflicts` and
`escalate`, and the coherence rule that a conflict without an escalation is
rejected.

**Step 5 — the loop, on `LOOP=mastra` and `LLM_PROVIDER=hosted`.** Everything
learned yesterday applies: only one engine reaches Gemini, `LOOP` must be set
beside `LLM_PROVIDER`, and the eval runner needs `EVAL_PACE_MS` against a free
tier.

**Step 6 — the eval suite**, scored against step 2, with severity buckets that
distinguish *wrong answer* from *quota failure*. `docs/FREE.md` §10 is the
cautionary tale: an unpaced run reported zero wrong answers because three
questions never ran.

**Step 7 — the page**, a fourth surface alongside the other three, and a
`/learn` entry once there is something measured to teach.

---

## 9 · What this plan does NOT answer — decisions needed before step 1

1. **Which slice?** The whole database is far too large. A proposal: **three to
   four models with rich complaint histories and at least one recall whose
   remedy is contested** — the 2018-2020 Odyssey is one, since §4 is already
   evidence. Which others, and how many years?

2. **API or bulk files?** The API is easy and always current, but paging it for
   a large slice is slow and impolite. The flat files are one download and a
   fixed snapshot — **and a fixed snapshot is better for an eval baseline**,
   because an answer key written against moving data rots. I lean to the flat
   files for the corpus and the API for spot checks.

3. ~~**Where do the recall flat files live?**~~ **RESOLVED 2026-09-17**:
   `rcl/FLAT_RCL_POST_2010.zip`, plus data dictionaries at `rcl/RCL.txt` and
   `cmpl/CMPL.txt`. See §2.

4. **Are investigations in scope for v1?** They add a third document type and
   the richest "NHTSA disagreed with the manufacturer" material. They also add
   work. I lean to **no for v1**, and a named reason rather than silence.

5. **Package and app names.** Proposed: `apps/ai/safety` (`@calder/safety`)
   and `apps/web/safety-app`, following the existing layout. Say if you want a
   different customer name — it is cosmetic and it is easiest to change now.

6. **Does anything actually need a new `@fde/*` package?** The answer should be
   **no**, and that is the test. If this engagement can be built from the seven
   that exist, `docs/TEMPLATE.md`'s claim is demonstrated. **Every time we reach
   for a new shared package, that is a finding and it gets written down here.**

---

## 10 · The one-line summary

Point the existing machinery at a corpus nobody wrote for us, and find out where
it bends. The data is free, real, genuinely messy, contains a real unresolved
contradiction, and is about actual people — which makes every rule this repo has
about citation, escalation and data residency mean something it did not mean
when the documents were invented.
