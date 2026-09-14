# A second domain — the plan

*Written 2026-09-11. **Step 1 is built and verified** — six databases, 49 tables,
4,911 rows (counts refreshed 2026-09-13 by `pnpm pharma:estate`), `db:check` 21/21. Steps 2 onward are still design only. Where this
document and the code disagree, the code is right and this is stale.*

**Built:** [`docs/pharma/cases/release-001.md`](pharma/cases/release-001.md) is
the acceptance case, derived from the loaded rows.

Companion: [`TEMPLATE.md`](TEMPLATE.md) for what transfers from the insurance
build and what does not, [`CORPUS-PLAN.md`](CORPUS-PLAN.md) for the
data-vs-documents distinction this plan inherits wholesale.

---

## What this is for

`packages/insurance` proved the seven `@fde/*` packages can carry a domain. It
did not prove they can carry a **second** one, and an architecture that has only
ever been used once is a claim, not a result. This is the second one — chosen to
stress the parts the first engagement never touched.

Specifically, insurance gave us one record source (eighteen markdown files
behind a `RecordSource` interface) and one document corpus. That is a customer
with *one* system of record. Real customers have eight, they are from different
vendors, they do not join, and the answer to any question worth asking lives in
four of them at once. **That gap is the point of this domain.**

---

## The company

**Meridian Pharma** — a mid-size manufacturer of OTC and generic
pharmaceuticals, two sites, selling into the US and the EU. Regulated under
**21 CFR 210/211** (cGMP for finished pharmaceuticals), **EU GMP Part I and its
Annexes**, **ICH Q7/Q9/Q10**, with **USP** monographs as the compendial
specification and **DSCSA / EU FMD** for serialization.

That regime is chosen deliberately. Batch release under GMP is a decision that
*requires* crossing every silo: you cannot say whether a batch may ship without
the product's specification, the execution record of the run that made it, the
lab results, the qualification status of the equipment and of the human being
who signed, and the current revision of the procedure that governs the signing.
It is the single best-shaped question in industry for what this repo is about.

---

## The distinction that decides the whole plan — inherited, not re-litigated

[`CORPUS-PLAN.md`](CORPUS-PLAN.md) established it for insurance and it carries
over unchanged:

```
RECORDS                                 DOCUMENTS
lots, work orders, test results,        21 CFR 211 subparts, EU GMP
  employees, trucks, shipments            annexes, ICH guidelines, USP
                                          monographs, internal SOPs
one exact answer per question           no single lookup key
live in ERP / MES / LIMS / HRIS /       live in a document management
  QMS / TMS                               system
fetched by key, or queried by SQL       searched by meaning
→ record tools                          → search tools
```

**Step 1 builds the left column only.** The right column is step 2. The
`mrd_reg` database gets its *catalogue* rows in step 1 — standard identifiers,
SOP numbers, revisions, effective dates — because the quality system points at
them and dangling pointers are exactly what we are trying not to create. The
document *text* those rows describe comes later.

---

## The decision the plan turns on: separate databases, not separate schemas

Verified 2026-09-11 against the existing Neon project: `neondb_owner` has
`rolcreatedb = true` and `rolcreaterole = true`, PostgreSQL 18.6. So the choice
is genuinely open, and we take the expensive side of it.

| | separate schemas, one database | **separate databases** |
|---|---|---|
| cross-system joins | allowed by Postgres | **impossible by Postgres** |
| referential integrity across systems | real foreign keys | soft keys only, generator's job |
| connections | one pool | one pool per system |
| realism | none — it is one database wearing hats | a customer's actual estate |

Separate databases, six of them, in the **same Neon project and branch**. They
share a host and a role and differ only in the database name, so the ops cost is
close to zero while Postgres itself enforces the property we want: *nothing can
join across two systems.* An assistant that answers a release question must
therefore fetch from each system and stitch in code — which is what an
integration at a customer actually is, and what a single clever `JOIN` would let
us fake our way past.

**The cost, stated plainly rather than buried:** no foreign key can span two
databases, so the coherence of the data is only as good as the generator that
writes it. That is not a reason to avoid the design; it is the reason
`db:check` (below) is a step 1 deliverable and not a nice-to-have.

The existing insurance tables (`documents`, `document_relations`,
`policy_chunks`, `request_log`) all live in `neondb` and are untouched by any of
this.

---

## The six databases

The picture described nine systems — products, facilities, manufacturing
processes, distribution, health standards and policies, personnel, departments,
quality-control processes, trucks. All nine are here. Three are folded into a
neighbour because in a real estate they are one vendor's product, and the fold
is a line in a connection map if you want them split later:

- **departments** folds into personnel — one HRIS holds both, always.
- **facilities** folds into manufacturing — the MES that runs a line also holds
  the site, the room and the equipment in it.
- **trucks** folds into distribution — one TMS covers shipments and the vehicles
  that move them. *(This is the least obvious fold: telematics is often a
  genuinely separate vendor. If the fleet story gets interesting, splitting it
  out is the first thing to do.)*

```
mrd_erp   PRODUCTS & MATERIALS          the product master
          products, presentations (SKUs), formulations, bill of materials,
          ingredients/APIs, suppliers, incoming material lots, product lot
          master, market authorisations (US/EU per product)

mrd_mes   FACILITIES & MANUFACTURING    the execution record
          sites, buildings, rooms, production lines, equipment, equipment
          qualification status, work orders (= batch records), process steps,
          in-process parameters, deviations raised on the floor

mrd_hcm   PERSONNEL & DEPARTMENTS       who may do what
          departments, positions, employees, training curricula, training
          records with expiry, qualifications, signature authority

mrd_qms   QUALITY                       the hub
          specifications and their versions, test methods, samples, QC test
          results, OOS investigations, batch disposition/release decisions,
          CAPAs, non-conformances, change controls, audits, and the links
          from any of those to a governing standard or SOP

mrd_tms   DISTRIBUTION & FLEET          where it went and how
          warehouses, consignees, shipment orders, shipment lines at lot
          granularity, routes and legs, trucks, drivers, telematics
          temperature readings, serialization/chain-of-custody events

mrd_reg   STANDARDS & POLICIES          what governs all of it
          the standards catalogue (21 CFR 211 subparts, EU GMP annexes, ICH
          guidelines, USP monographs), internal SOPs with revision history and
          effective dates, policy documents. In step 2 this database also gains
          the `documents` + chunk tables for the searchable corpus.
```

**49 tables and 4,911 rows as built** — the estimate in the first draft of this
plan was "roughly 30", and correcting it here rather than leaving the round
number is the point of writing the count down at all.

*Corrected 2026-09-13, and the correction is the same lesson twice.* This read
"47 tables and 4,663 rows" until `pnpm pharma:estate` counted the live databases
with `count(*)` and got 49 and 4,911 — `mrd_qms.complaints` (41) and
`mrd_qms.lab_events` (205) landed after this paragraph was written and nothing
brought it forward. The new figures reconcile EXACTLY, table for table, with the
committed `db/world.fingerprint.json`, which is a stronger check than the
arithmetic: the estate has not drifted, only this sentence had. Add
`mrd_kb`'s four tables and 136 rows and the whole estate is 53 and 5,047, which
is the number the landing page shows. Still deliberately small. The
lesson from the insurance corpus is that scale without cases buys nothing — a
bigger haystack with the same needles is a more impressive demo with *less*
evidence.

### Identity across the silos

Every cross-system reference is a **soft key**: a prefixed string with no
foreign key behind it, exactly as an integration would carry it.

```
SITE-01     site                 WO-26-0417   work order / batch record
PRD-00142   product              SPEC-IBU200-v4  specification version
MLOT-…      incoming material    SOP-QC-014 Rev 7  procedure, revision exact
EMP-0103    employee             CFR-211.192  standard clause
DEPT-QA     department           SHP-26-1180  shipment
TRK-07      truck

LOT-IBU200-2609-B    product lot
    │       │    │ └ sub-batch, one uppercase character
    │       │    └── campaign, YYMM
    │       └─────── product code
    └─────────────── prefix
```

**`SOP-QC-014 Rev 7` carries the exactness lesson forward from form editions**,
and then goes one step past it. `Rev 6` and `Rev 7` of the same SOP are the same
document two revisions apart and they say different things; a prefix match on
`SOP-QC-014` merges them and returns a confidently wrong answer with a citation
attached. See `packages/insurance/src/config/form-id.ts` — the reasoning
transfers verbatim, only the spelling changes.

### The as-of rule, and why it shapes the schema

Under GMP the revision that governs an act is **the one in force when the act
happened**, not the one in force now. So the question the assistant must answer
is "SOP-QC-014 *as of 2026-09-04*", never "SOP-QC-014, latest".

This is a design rule on `mrd_reg` before it is a prompt rule. The SOP revision
table stores **`effective_from` and `effective_to`** and the lookup is a
date-range query. A table that stores only a revision number and a single
effective date cannot answer the as-of question at all — and if it cannot, T1
and T2 below collapse into the same trap instead of being two different ones.

---

## The acceptance test — step 1 is not done until this is answerable by hand

Rows existing is not the finish line. Step 1 is finished when there is **one
question whose correct answer requires four silos and is derivable by hand from
the seeded data**, written down with its derivation. Without it, "fake but
related data" is an assertion.

> **Can lot `LOT-IBU200-2609-B` of Ibuprofen 200 mg tablets be QP-certified for
> release to the EU?**

For the EU the act is not a generic sign-off: it is **certification by a named
Qualified Person under EU GMP Annex 16**, and Annex 16 makes the QP personally
responsible for confirming the batch was made in accordance with GMP. That is
what makes the personnel silo load-bearing here rather than decorative — the
question is partly about a specific human being's standing on a specific day.

The naive answer is yes: every QC result is within specification. The correct
answer is **no**, and getting there needs:

| silo | what it contributes |
|---|---|
| `mrd_erp` | the product, its EU market authorisation, which spec version applies |
| `mrd_mes` | work order `WO-26-0417`, the run that made the lot, the deviations raised (none), and who signed the batch record |
| `mrd_qms` | the QC results against `SPEC-IBU200-v4` (all pass), the disposition record, any open CAPA |
| `mrd_hcm` | `EMP-0103` (Eva Vos) is a registered, authorised QP, but their GMP refresher training **expired 2026-08-24 — eleven days before they certified** |
| `mrd_reg` | `SOP-QC-014`, **as of 2026-09-04**, is Rev 7 (`effective_from` 2026-03-01), which requires current GMP training for QP certification. **Rev 6, in force until 2026-02-28, did not.** |

The dates have to be pinned together or the case derives to the opposite
conclusion, which is exactly the mistake this section exists to prevent: a run
dated 2024 would have been governed by Rev 6, under which the lapsed training is
not a bar and the honest answer is *release it*. Hence the 26xx work order and
lot campaign — and a 2024-era lot is left free for T2.

So the release is invalid on a procedural ground that no test result reveals,
under a revision of a procedure that changed the rule six months earlier. That
is the shape of a question a customer pays for, and every planted trap below is
built to be found the same way.

---

## The planted traps

The insurance corpus is booby-trapped on purpose and the suite is judged by
whether it steps on them. Same discipline here. Each trap names the silos it
spans, because a trap inside one database is a trap the architecture cannot
teach us anything about.

| | trap | spans |
|---|---|---|
| T1 | release signatory's GMP training lapsed before they signed — *the headline case above* | HCM × QMS × REG |
| T2 | a 2024 work order cites `SOP-MFG-022 Rev 3` while Rev 4 had already taken effect — superseded *at the time of the act*, which is why the as-of rule above is what distinguishes this from T1 | MES × REG |
| T3 | equipment qualification expired mid-campaign; lots on either side of the date differ | MES × QMS |
| T4 | a supplier material lot disqualified *after* it was consumed by two product lots | ERP × QMS |
| T5 | a cold-chain excursion on one shipment leg, with a gap in the truck's telematics | TMS × QMS |
| T6 | `LOT-IBU200-2609-B` and `LOT-IBU200-2609-D` — two real sub-batches of one campaign, released to different markets against different spec versions (the EU authorisation carries a tighter dissolution limit). One character apart, both genuine; a fuzzy match returns the wrong one and every number after that is wrong | ERP |
| T7 | an out-of-specification result retested to a pass with no OOS investigation (21 CFR 211.192) | QMS |
| **T8** | **a lot that is genuinely clean and releasable** | the negative control |

**T8 is not filler.** Without it, an assistant that answers "no, do not release"
to everything scores perfectly, and so does a suite that only plants failures.
Every check in this repo carries a control that proves it can fail; a corpus
needs the same thing pointed the other way.

---

## Step 1 — what was built

```
docs/PHARMA-PLAN.md                  this file
docs/pharma/cases/release-001.md     the acceptance question, hand-derived
packages/pharma/db/schema/*.sql      six files, one per database — 47 tables
packages/pharma/db/connections.mjs   one base URL in, six named databases out
packages/pharma/db/seed/rng.mjs      seeded PRNG, frozen epoch, date helpers
packages/pharma/db/seed/world.mjs    master data + the eight anchored traps
packages/pharma/db/seed/operations.mjs  lots, runs, tests, decisions, shipments
packages/pharma/db/{create,migrate,seed,check,drop}.mjs
packages/pharma/package.json         @meridian/pharma
```

Package naming follows the rename landed earlier today: folder carries the
domain (`packages/pharma`, later `apps/veresk-app`), scope carries the
engagement (`@meridian/`), mirroring `packages/insurance` / `@claims/insurance`.

### The scripts

```
pnpm db:create    CREATE DATABASE ×6. Must use the NON-POOLED endpoint —
                  pgbouncer rejects CREATE DATABASE. Idempotent.
pnpm db:migrate   apply schema/*.sql to each. Idempotent.
pnpm db:seed      generate and load. Deterministic: same seed, same rows.
pnpm db:check     the consistency check — see below
pnpm db:drop      tear down all six. Refuses to touch neondb.
```

### `db:check` is the one that earns its keep — 21 assertions, all passing

It walks every soft key and asserts the target exists in the other database —
every employee id on a signature resolves in `mrd_hcm`, every `SOP-… Rev n`
resolves in `mrd_reg`, every lot on a shipment line resolves in `mrd_erp`. Then
it re-asserts each of the eight traps is still present and still exactly as
sharp as designed, so that a later regeneration cannot quietly sand one off.

And it carries a **negative control**, in this repo's idiom: it injects a
dangling `EMP-9999` into a copy of the data and requires itself to catch it. A
consistency checker that reports zero dangling references is indistinguishable
from one that is looking in the wrong place, and we have already shipped that
exact bug once — `pnpm leak:check` reported PASS while a leak sat in plain
sight, because the scanner had truncated its own input.

**And then a section the plan did not anticipate: role coherence.** Everything
above passed while `EMP-0142` — a *Production Operator* — held a QP registration
and personally certified a batch for EU release. Not one soft key dangled: the
employee row was real, the qualification row was real, the disposition pointed
at both. **Referential integrity is not coherence.** So `db:check` now also
asserts that QP certifications are made by people holding the QP position, a QP
registration and an unrevoked `qp_certify` authority; that batch records are
signed by authorised signatories; that analysts are qualified; that nobody
verifies their own work; and that policies are not owned by line operators. That
is the single most useful thing step 1 produced, and it came from reading the
data rather than from the design.

### Determinism

Seeded PRNG, a fixed epoch date, no `Date.now()` anywhere in the generator. Rerun
produces byte-identical output. The insurance corpus generator already has this
property and it is the reason the corpus can be regenerated without fear.

---

## Steps 2 and beyond — sketched only, so step 1 does not corner us

2. **The standards corpus.** Generate the document text behind the `mrd_reg`
   catalogue rows — SOPs with real revision diffs, GMP clause text, USP
   monograph extracts — and ingest into pgvector in `mrd_reg`. This is where
   `@fde/grounding` gets reused unchanged, which is the first real test of the
   claim that it transfers.
3. **The tools.** A record tool per silo and one search tool, behind
   `@fde/agent`. The interesting design question, deferred deliberately: does
   the model get **one tool per system** with fixed queries, or a constrained
   SQL surface? One tool per system is the safe default and the one to build
   first.
4. **The judgment.** The release-decision prompt, the answer schema and its
   coherence rules, the severity classifier — the `packages/pharma` equivalent
   of everything marked `DOMAIN:` in `packages/insurance`.
5. **`apps/veresk-app`.** Last, and only once there is something worth looking
   at.

---

## What this plan does not yet answer

- **`pnpm leak:check`'s `BANNED` list is insurance vocabulary.** A second domain
  in the same repo means the list must cover both, or the check goes half-blind
  the moment `@fde/*` learns the word "batch". Small change, easy to forget,
  and forgetting it is silent.
- **One `@fde/grounding` function needs a parameter it does not have.** Checked
  2026-09-11: `openStore()` already takes an optional `connectionString`, so the
  vector side is fine. `loadDocuments()` (`documents.store.ts:151`) does not —
  it constructs its client from the global `connectionString()`, which reads a
  single `DATABASE_URL`. With six databases that either needs an override
  parameter or `DATABASE_URL` has to point at `mrd_reg`, and then insurance and
  pharma cannot both be live under one `.env`. The parameter is the right fix
  and it is a small one, but it is a change to a *reusable* package driven by
  the second domain — which is the most interesting kind of finding this
  exercise can produce, so it gets logged rather than quietly patched.
- **The policy-owner role check matches on job titles as strings.** Reword a
  title in `POSITION_DEFS` and that assertion silently passes everything — the
  same class of fragility as the `EMP-0142` bug it was written to prevent. It
  should key on the position id, not the title.
- **Six connection pools** against one Neon compute. Fine at this scale — the
  whole load is ~6 s — but worth measuring before anyone calls it proven.
- **Whether one tool per system survives contact with the release question.** It
  needs four fetches and a stitch, and that stitch is judgment code, not
  transport. If it turns out to want a fifth and a sixth, that is a finding
  about the design, and it belongs in the log rather than being quietly patched.
- **Step 1 is done; nothing above it is.** No tools, no prompt, no schema, no
  app, and no document text behind the `mrd_reg` catalogue rows. The estate can
  be queried by hand and by nothing else.
