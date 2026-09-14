# A third domain — steering systems, the plan

*Written 2026-09-13. **Built and RE-ROOTED 2026-09-13.** Deviations from the
plan as written are marked ▲ and explained where they occur; they are
corrections, not drift.*

> ## ▲▲ THE RE-ROOT — read this before anything below
>
> The plan originally made four databases the customer's estate, with the code
> base as a file corpus beside them. **That was backwards, and the correction is
> the most important thing in this document.**
>
> A steering supplier does not keep its requirements in a database. It does not
> keep its effort history in one either. It keeps **documents** — specifications
> exported from Word, trace matrices half-filled, timesheet exports, project
> closure reports written months late, a code base. Turning those into rows is
> not setup that happens before the interesting work. **It IS the work**, and
> it is precisely what a customer would be paying for.
>
> So the estate now has two halves and the relationship between them is the
> point:
>
> | | what it is | role |
> |---|---|---|
> | **`docs/steering/corpus/`** · 1,069 files · 1.9 MB | specifications, trace matrices, timesheets, closure reports, quotations, rate cards, estimates, and eight source repositories | **what the customer actually has.** The raw estate. |
> | **four Postgres databases** · 37 tables · 13,705 rows | customers, parts, requirements, effort | **the shape the answer has to arrive in** — and, until the sorting is built, *the answer key*. See the correction directly below. |
>
> Both are generated from the same underlying facts, which is what makes *"did
> the extraction get it right"* a question with a checkable answer rather than
> an opinion.
>
> ### ▲ The correction that row used to hide — 2026-09-13
>
> The row above originally read *"the structured view WE produce from it — the
> target, not the source."* **That was aspirational, and stating it as fact was
> the single most misleading line in this document.** The four databases were
> never produced from the corpus. They were generated *alongside* it, from the
> same constants, in the same run. Nothing has ever read a file and written a
> row.
>
> That is a cheat, and naming it is the whole reason the next phase exists. The
> databases keep every row and every check they have, but **their role changes
> from estate to answer key**: the known-correct set that our own sorting is
> graded against. What the product reads is a fifth database, `vst_derived`, which is
> ours and which is derived from the files and from nothing else.
>
> The answer key carries its own trap — no real customer has one, so any check
> that needs it is a check that cannot ship. See
> [`SORTING.md`](SORTING.md).
>
> **Nothing was deleted.** The databases and every check over them are
> unchanged — `db:check` still passes 27/27 against the live estate, and the
> fingerprint confirms not one database table shifted when the corpus tripled.

This plan covers **step 1 and nothing else: the estate and the data in it.**
The FDE capability that motivates the whole thing — *a new customer requirement
lands, what do we have, what must change, what must be built, what do we quote*
— is sketched at the end as steps 2+ and deliberately left unbuilt, exactly as
[`PHARMA-PLAN.md`](../pharma/PLAN.md) left its own steps 2–4 sketched so step 1
could not corner them.

Companions: [`PHARMA-PLAN.md`](../pharma/PLAN.md) for the estate pattern this
inherits, [`TEMPLATE.md`](../TEMPLATE.md) for what transfers between domains,
[`GUIDE.md`](../../GUIDE.md) for the eight pillars.

**Status key:** ☐ not started · ◐ in progress · ☑ done
**S0–S4 are ☑ as of 2026-09-13. S5 is ◐ — the acceptance walkthrough is the remaining gate.**

---

## 0. The decode — what "sis 1 / sis 2 / sis 3" is

The brief named three artefacts: customer requirements, system requirements,
system design, where the third "identifies activities, identifies elements, and
passes the activities to the elements."

That is not a bespoke process. It is **Automotive SPICE**, the process
assessment model that essentially every OEM imposes on its Tier-1 suppliers:

| | ASPICE process | What it holds | The brief's word |
|---|---|---|---|
| **SYS.1** | Requirements Elicitation | the customer's stakeholder requirements, received and agreed | "customer requirement" |
| **SYS.2** | System Requirements Analysis | those turned into complete, testable system requirements | "system requirement" |
| **SYS.3** | System Architectural Design | elements, their interfaces, dynamic behaviour, and **which system requirements are allocated to which element** | "system design" |

The purpose of SYS.3 as the standard states it is *"to establish a system
architectural design and identify which system requirements are to be allocated
to which elements of the system."* The brief's "identify elements, pass the
activity to the elements" is that base practice in plain words. In ASPICE 3.1
the allocation, the interface definition and the dynamic behaviour were three
separate base practices; 4.0 merged them into static aspects / dynamic aspects /
analyse / trace / communicate.

**Why this matters to the plan and is not trivia.** It fixes the schema. The
V-model spine is a *typed graph* — SYS.1 nodes, SYS.2 nodes, SYS.3 elements and
activities, and the `satisfies` / `allocated_to` edges between them — and ASPICE
also demands **bidirectional traceability** across every one of those edges.
That graph is the single most important structure in the estate, because the
"what do we already have?" question is a reachability query over it.

It also means the domain vocabulary is standard, not invented, and a real
steering engineer reading the data will recognise it.

---

## 1. The company, the persona, the bottleneck

**Vantis Steering Systems** — a fictional Tier-1 supplier of electric power
steering. Four product lines (C-EPS, DP-EPS, R-EPS, and a first steer-by-wire
programme), ~30 years of programmes, the usual Tier-1 estate of disconnected
tools.

**Persona: Dario, a systems engineer on the bid team.** An OEM RFQ lands with a
customer requirement specification attached. Within roughly two weeks he must
tell the commercial team four things:

```
1. which requirements we already satisfy with something we ship today
2. which we satisfy only after a change, and how big the change is
3. which need something that does not exist yet
4. what all of that costs, in engineering hours and in euros
```

Today he does this by opening five tools and asking six colleagues, and the
industry number for a full RFQ response is **up to 180 labour hours**. The
answer is assembled from memory and from whoever happens to be available, and
the same question asked twice gets two different answers.

**The scope, deliberately narrow** — the same narrowing move as the other two
domains. Not "automate the bid". Not "decide whether to bid". Just: *given an
incoming customer requirement specification, produce the reuse/change/new
classification and a cost range, every line of it traced to a row in our own
data, and escalate the ones our data cannot settle.*

Explicitly out of scope: piece-price and tooling quotations, supplier
negotiation, programme scheduling, anything that writes to a system of record,
and any claim about whether a requirement is *safe* — safety judgements
escalate, always.

---

## 2. The databases — four, plus a corpus that is not a database

**The decision is inherited from pharma and is not re-litigated: separate
databases, same Postgres host, soft keys across the seams.** The reasoning is in
[`PHARMA-PLAN.md`](../pharma/PLAN.md) § "The decision the plan turns on" — an
assistant that must fetch from each system and stitch in code is doing what an
integration actually is, and a single clever `JOIN` lets you fake your way past
it.

**What is *not* inherited is pharma's count of six.** The partition here follows
the real vendor seams in a Tier-1 engineering department, and that produces
four databases — **and one thing that is deliberately not a database at all.**

> ▲ **Correction, made during the build.** This plan originally specified five
> databases, the fifth being `vst_scm` with tidy `commits`, `functions` and
> `function_params` tables. That was wrong, and wrong in the way that matters
> most: **it pre-solved the hardest part of the job.** Nobody's software estate
> arrives normalised. It arrives as a repository — C files with the calibration
> block in a comment, a CHANGELOG somebody stopped updating, a `git log` dump,
> a Jira export with embedded commas. The fact that `SWC-DAMP` ships at ASIL B
> is not a column you compare; it is a sentence in the third paragraph of a
> safety assessment, and finding it is reading comprehension.
>
> So the code base is now **`docs/steering/corpus/` — 54 files, 192 KB, ten
> repositories** — generated by `pnpm steering:corpus`, chunked and searched
> rather than queried, exactly as the insurance policy wordings are. §4a
> describes it and §7 records what it does to trap T3.

```
vst_alm   REQUIREMENTS & ARCHITECTURE     Codebeamer / Polarion / DOORS
          SYS.1, SYS.2, SYS.3, and every trace link between them.
          Baselines, revisions, change requests, budgets.

vst_plm   HARDWARE                        Windchill / Teamcenter
          parts, variants, BOMs, capability envelopes, qualification
          evidence, component suppliers, lifecycle/obsolescence.

vst_crm   CUSTOMERS & PROGRAMMES          Salesforce
          OEMs, vehicle programmes, RFQs, awards, milestones.

vst_pmo   EFFORT & COST ACTUALS           SAP / Clarity
          what past changes actually took, by discipline; rate cards;
          quotes issued, and what they turned out to cost.

─────────────────────────────────────────────────────────────────────
docs/steering/corpus/   THE CODE BASE          Git + Jira + the build server
          NOT A DATABASE. Ten repositories of files: sources, design
          notes, safety assessments, CHANGELOGs, git log dumps, a
          calibration CSV, a ticket export, release notes. Chunked and
          searched. See §4a.
```

### The one deliberate exception: SYS.1, SYS.2 and SYS.3 share a database

The obvious move — given the brief lists them as three things — is three
databases. **Don't.** Two reasons, and the first is decisive:

1. **In a real Tier-1 they are one tool.** Codebeamer, Polarion and DOORS hold
   customer requirements, system requirements, the architecture and the trace
   links between them, precisely because the trace links are the product. A
   partition that splits them models a vendor boundary that does not exist.

2. **It would put a soft key on the one edge that most needs to be hard.** The
   `satisfies` edge from a customer requirement to a system requirement is the
   spine of the "what do we already have" query. Inside one database it is a
   foreign key and Postgres guarantees it. Across databases it is a string the
   generator has to get right, and a dangling trace link is exactly the kind of
   silent corruption that makes a coverage answer wrong without looking wrong.

So: **real foreign keys inside `vst_alm`, soft keys everywhere else.** The seams
that stay soft are the ones a real integration also carries as strings —
requirement → part number, element → software component, change request →
effort record.

### The soft-key vocabulary

Every cross-database reference is a prefixed string with no foreign key behind
it, and **every id is matched exactly, never by prefix**. This carries forward
`form-id.ts`'s lesson from insurance and `SOP-QC-014 Rev 7`'s from pharma.

```
CRS-KST-K2-001 Rev B     customer requirement spec, revision exact
CR-K2-0101               customer requirement          (SYS.1)
SR-EPS-0407              system requirement            (SYS.2)
ARCH-K2-v3               architecture baseline         (SYS.3)
EL-K2-ECU-01                architectural element
ACT-DAMPING              architectural activity
BUD-ONCTR-TRQ            a budget
VS-ECU-4412-B            part number, revision in the suffix
SWC-DAMP                 AUTOSAR software component
FN-DAMP-0031             function
PRG-KST-K2               vehicle programme
CHR-2026-0188            change request
EFF-2024-0912            effort record
```

`Rev A` and `Rev B` of the same spec are two different documents that say
different things. A prefix match merges them and answers a 2026 question out of
a 2025 spec with a citation attached — the identical failure mode as
`PP 00 01 01 15` vs `PP 00 01 06 24`.

### The as-of rule, again, and it is load-bearing here too

The requirement that governs a design decision is **the one in force when the
decision was made**, not the one in force now. `spec_revisions`,
`sr_revisions` and `architecture_versions` all carry `effective_from` /
`effective_to` and every lookup is a date-range query. A table with only a
revision number cannot answer "what did we promise as of the Rev A freeze",
and without that, trap **T1** below cannot exist.

---

## 3. Assumptions about the numbers — read this and correct it in one pass

The brief gave real engineering values in shorthand. Below is the **verbatim
phrasing** next to the reading the seed will use. Correcting this table is one
edit and it fixes the whole dataset, which is why it is a table and not a
paragraph.

| # | Brief, verbatim | Reading used | Column / unit | Confidence |
|---|---|---|---|---|
| A1 | "capacity 8000 nm" | **8000 N rack force** — the peak force the rack must deliver. 8000 N·m is not a quantity a steering rack has; published EPS specs quote rack force in kN (≥5 kN typical). | `value_num` 8000, `unit` `N` | high |
| A2 | "range steering -50 +50" | **road-wheel angle, ±50°** | `value_num` 50, `unit` `deg`, symmetric | medium — could be rack travel in mm, or steering-wheel angle |
| A3 | "max torq 30 degree 2.7" | **2.7 N·m steering-wheel torque at 30° steering-wheel angle**, on-centre, measured per the ISO 13674-1 weave test (100 km/h, 0.2 Hz sinusoid, 2 m/s² peak lateral) | `value_num` 2.7, `unit` `Nm`, `condition` holds the test point | high |
| A4 | "histeres 0.5 nm" | **on-centre torque hysteresis ≤ 0.5 N·m** — the width of the torque/angle loop | `value_num` 0.5, `unit` `Nm` | high |
| A5 | "eps should support capacity, minus friction to the wheel for range steering should be 2.4 and friction 0.3" | an **on-centre torque budget**: target 2.7, allocated 2.4 to the wheel/rack path and 0.3 to column + gearbox friction. **Closes exactly: 2.4 + 0.3 = 2.7.** | `budgets` + `budget_allocations` | high |
| A6 | "friction on histiric feedback ebs be 1.2 nm and dump feedback 0.2 nm" | a **separate** budget on the control-side torque contributions — the EPS hysteresis-compensation term 1.2 N·m and the damping term 0.2 N·m. **Read as its own budget, NOT as children of A4**, because 1.2 + 0.2 = 1.4 cannot be children of a 0.5 ceiling. | second budget, own target | **CONFIRMED 2026-09-13** |
| A7 | "adding sensor 3.5 ecu ... and adding ecu 1.7" | a **latency budget** down the signal chain: torque sensor 3.5 ms + ECU 1.7 ms + motor control, summing to an assist response-time target | `budgets`, `unit` `ms` | **CONFIRMED 2026-09-13** |
| A8 | "ecu to damping to cotroller to args to funcs" | the SYS.3 → software chain: element (ECU) → activity (damping) → software component (controller) → **function** → its **parameters** (`args`) | four tables + `function_params` | high |

▲ **A6 and A7 were confirmed on 2026-09-13, both as built, so nothing in the
estate changed as a result.** The paragraphs below are kept as the record of
what was uncertain and how it was resolved — not as an open question.

The one thing that remains true and worth repeating: in A7, **only 3.5 and 1.7
came from the brief.** The 8.0 ms target and the 2.0 / 0.6 allocations are
invented, because a budget needs a target to be a budget.

**What depends on them, so a correction is a scoped edit and not a
rediscovery.** S0 genuinely gates S3: these traps cannot be placed until the
readings are settled.

```
A6  →  trap T4, budget BUD-HYST-CTRL, acceptance row CR-K2-0104
       (T4 exists ONLY under the "separate budget that does not close" reading.
        If 1.2/0.2 are children of something else, T4 changes shape entirely.)
A7  →  budget BUD-LATENCY, SR-EPS-0415, acceptance row "latency"
       (and note: only 3.5 and 1.7 come from the brief. The 8.0 ms target and
        the 2.0 / 0.6 allocations are INVENTED to make the budget close.)
```

### Why budget closure is *reported*, not *asserted*

The first draft of this plan had `db:check` assert that every budget's
allocations sum to its target. **That check would fail on day one**, on the very
numbers that motivated the work — A5 closes cleanly and A6 does not close under
any reading.

So `db:check` computes a **delta per budget against a stated tolerance**, and
carries an **explicit allow-list of budgets known to be open**, each with a
reason. A budget that does not close is then *visible data* — and a legitimate
planted trap (**T4**) — rather than a red check that gets muted on the first
day and stays muted.

This is the repo's own rule arriving early: *a red check is a hypothesis, not a
verdict*, and a check that fails on correct data is worse than no check, because
every later failure looks like noise.

---

## 4. The tables

▲▲ **As built: 37 tables and 13,705 rows across four databases, plus 1,069
corpus files.** The estimate below was ~38 tables and ~25,000 rows; the difference is
almost entirely the ten `vst_scm` tables that became files, and the ~9,000
`commit_functions` rows that became 260 lines of `git-log.txt`. The counts in
the tables below are the PLANNED ones, kept so the estimate can be compared
against `pnpm steering:rows`.

~38 tables, ~25,000 rows. Pharma's estate is 49 tables and **4,911** rows, and
its plan says why: *scale without cases buys nothing; a bigger haystack with the
same needles is a more impressive demo with less evidence.* Being five times
larger than that needs a reason per table, not one reason overall.

> *Corrected 2026-09-13.* This paragraph said 47 tables and 4,663 rows, which
> was the plan's figure and not the estate's. `pnpm pharma:estate` counts the
> live databases: **49 tables, 4,911 rows** — `complaints` and `lab_events` were
> added after the number was written down. The comparison still holds and the
> ratio barely moves, which is exactly why nobody noticed for four weeks.

**Three things here genuinely need volume, and nothing else does:**

1. `effort_records` / `effort_by_discipline` — the comparables query in §6 is a
   **median over a filtered subset**. Filter ~640 records by five attributes and
   you are down to single digits; that is the realistic case, and it is the case
   the "fewer than three comparables → escalate" rule exists to handle. Below
   ~600 the rule fires on everything and the dataset cannot demonstrate the
   behaviour it was built for.
2. `commits` + `commit_functions` — "which functions does this change touch"
   only beats guessing if a function has a *history*. A few hundred commits
   gives most functions one or two touches, which is indistinguishable from
   noise.
3. `customer_requirements` + `system_requirements` + the trace tables — the
   coverage query has to be non-trivial to walk, or T7's orphans are visible by
   eye.

**Everything else is sized at the minimum that keeps the estate coherent**, and
the first draft of this section was cut accordingly: `commit_functions` from
~9,000 to ~2,600 and `release_functions` from ~6,000 to ~900, because neither
serves any row of the §8 acceptance test and both are pure generator cost.
**S3's effort is roughly linear in these numbers**, so they are worth arguing
about before the generators exist rather than after.

### `vst_alm` — requirements and architecture (real FKs throughout)

| Table | Key columns | Rows |
|---|---|---|
| `spec_documents` | `spec_id`, `customer_id`→crm, `program_id`→crm, `title`, `kind` (CRS / interface spec / safety concept) | 26 |
| `spec_revisions` | `spec_id` FK, `revision`, `received_on`, `effective_from`, `effective_to`, `change_note` | 61 |
| `customer_requirements` | `cr_id`, `spec_revision_id` FK, `section`, `text`, `attribute`, `value_num`, `unit`, `operator` (≥ ≤ = ±), `condition`, `verification_method`, `asil`, `priority`, `status` | ~620 |
| `cr_history` | `cr_id` FK, `changed_on`, `field`, `from`, `to`, `change_request_id`→(soft), `author` | ~900 |
| `system_requirements` | `sr_id`, `text`, `attribute`, `value_num`, `unit`, `operator`, `derivation_note`, `verification_method`, `asil`, `owner_discipline`, `status`, `maturity` | ~1,150 |
| `sr_revisions` | `sr_id` FK, `revision`, `effective_from`, `effective_to` | ~1,600 |
| `trace_cr_sr` | `cr_id` FK, `sr_id` FK, `coverage` (full/partial/none), `rationale` | ~1,400 |
| `budgets` | `budget_id`, `parent_sr_id` FK, `attribute`, `unit`, `target_value`, `operator`, `tolerance`, `closure_note`, `known_open` | 34 |
| `budget_allocations` | `budget_id` FK, `label`, `value`, `basis` (measured/estimated/carryover/supplier-declared), `element_id` FK nullable, `child_sr_id` FK nullable | ~150 |
| `architecture_versions` | `arch_id`, `program_id`→crm, `version`, `created_on`, `status`, `supersedes` | 31 |
| `elements` | `element_id`, `arch_id` FK, `kind` (sensor/ecu/motor/gearbox/mechanical/software_domain/harness), `name`, `make_buy`, `asil`, `part_no`→plm (soft), `reuse_class` (carryover/modified/new) | ~290 |
| `activities` | `activity_id`, `name`, `kind` (control/monitoring/diagnostic/actuation/arbitration), `description` | 42 |
| `activity_allocations` | `activity_id` FK, `element_id` FK, `allocation_type` (primary/support), `rationale` | ~380 |
| `interfaces` | `interface_id`, `from_element` FK, `to_element` FK, `kind` (CAN-FD/SENT/PSI5/analog/PWM/mechanical), `signal`, `rate_ms`, `asil` | ~240 |
| `trace_sr_element` | `sr_id` FK, `element_id` FK — the SYS.3 allocation base practice | ~1,100 |
| `change_requests` | `chr_id`, `raised_on`, `source` (customer/internal/defect/regulatory), `title`, `status`, `decision`, `decided_on` | 210 |
| `change_request_items` | `chr_id` FK, `target_kind` (cr/sr/element/activity/interface), `target_id`, `action` (add/modify/delete) | ~700 |

### `vst_plm` — hardware

| Table | Key columns | Rows |
|---|---|---|
| `parts` | `part_no`, `kind`, `name`, `revision`, `lifecycle` (prototype/production/**obsolete**/ltb-passed), `make_buy`, `supplier_id` FK, `unit_cost_eur`, `lead_time_days` | 180 |
| `part_capabilities` | `part_no` FK, `attribute` (`max_rack_force_N`, `cont_current_A`, `peak_motor_torque_Nm`, `latency_ms`, `temp_min_C`…), `value`, `unit`, `source` (datasheet/test/**analysis**), **`qualified`** | ~720 |
| `product_lines` | `line_id`, `architecture` (C-EPS/P-EPS/DP-EPS/R-EPS/SbW), `force_class_N`, `introduced` | 6 |
| `assemblies` / `bom_lines` | assembly `part_no`, child `part_no`, `qty`, `position` | 90 / ~600 |
| `qualification_tests` | `test_id`, `part_no` FK, `standard` (ISO 16750 / LV124 / ISO 26262-5 / internal), `condition`, `result`, `tested_on`, `report_ref`, **`max_value_demonstrated`** | ~340 |
| `component_suppliers` | `supplier_id`, `name`, `country`, `status` | 24 |
| `part_program_usage` | `part_no` FK, `program_id`→crm, `from_sop`, `volume_per_year` | ~400 |

### 4a. The corpus — the customer's actual estate ▲▲

`docs/steering/corpus/`, written by `pnpm steering:corpus`, deterministic and
committed. **1,069 files, 1.9 MB, twelve top-level directories**, from four
independent seeded streams.

| directory | files | what it is |
|---|---|---|
| `requirements/<PRG>/` | 212 | customer specs per revision, system requirement docs, architecture docs, trace matrices, review notes |
| `pmo/` | 355 | timesheet exports by quarter, project closure reports, quotations, rate cards, bottom-up estimates |
| eight `eps-*` repositories | 477 | sources, headers, unit tests, build configs, MISRA reports, HIL reports, interface notes, CODEOWNERS, git logs |
| `releases/`, `tickets/` | 25 | release notes in prose, a Jira export |

**The three places a safety level is stated.** `SWC-DAMP`'s ASIL appears in the
safety assessment (prose, says B), the C header (a comment, says B) and
`cfg/build.json` (a compile flag, says **D** — raised for a 2024 steer-by-wire
trial and never put back). The MISRA report's deviation D-07 records why and
says plainly that nobody has decided which governs. **No database can hold that
question**, and answering it is the kind of thing the tool exists for.

**The classification problem, which is the hardest extraction in the estate.**
`vst_pmo.change_class`, `element_kind` and `safety_case_impact` are the three
columns the entire cost answer filters on. In the raw closure reports they do
not exist as fields — they are sentences like *"the existing hardware was
modified"* and *"no change to the safety argument was required"*. The original
estate wrote the answer straight into a column and skipped the job.

`eps-steering-feel` is the repository the worked example runs through, and its
key documents are hand-written rather than generated:

| file | what it is | why it is there |
|---|---|---|
| `README.md` | component table, build line | the only place the four SWCs are listed together |
| `docs/safety-assessment-2021.md` | released safety assessment, rev 3 | **states the shipping ASIL in prose** — the whole of T3's first half |
| `docs/design-note-damping.md` | 2018 design note | **contradicts it**, marks itself out of date, points at the superseding document |
| `src/damping.c` | the C source | `Damping_Apply`, and the calibration parameters **in a comment block** — the brief's "args" |
| `src/legacy/damp_compat.c` | compatibility shim | the function has **two live names**; the pre-2018 one still resolves |
| `cal/damping_params.csv` | CalTool export | nine rows, one empty value, one lowercase parameter, a quoted comma, a comment header |
| `CHANGELOG.md` | stops in 2023, and says so | the readable history and the complete one **disagree** |
| `git-log.txt` | 260 commits with `--stat` | carries `Change-Request: CHR-…` trailers — the only join back to `vst_alm` |

The other seven repositories carry a README, an overview with an ASIL statement,
and a git log. Plus `tickets/jira-export-2026-09.csv` (240 tickets,
inconsistently quoted) and `releases/` (24 release notes in prose).

**Every piece of mess above is a specific real thing, not noise for its own
sake**, and each breaks a different naive parser. A corpus that is uniformly
clean proves nothing about a chunker, a citation or a reuse answer.

### `vst_crm` — customers and programmes

`customers` (11 OEMs) · `programs` (38: model, segment, `eps_architecture`,
SOP date, annual volume, region) · `rfqs` (52: issued, due, status,
awarded/lost) · `rfq_specs` (soft link rfq → `spec_id`) · `milestones` (~300) ·
`contacts` (~70).

### `vst_pmo` — effort and cost actuals

This is the database the cost answer stands on, so it gets the most design
attention. See §6.

`effort_records` (~640) · `effort_by_discipline` (~3,800) · `rate_cards` (year ×
region × discipline, ~300) · `quotes` (52) · `quote_lines` (~600).

---

## 5. The worked example, end to end

The brief's own numbers, seeded as a live RFQ. **This is the acceptance test
(§8), so every value below is a committed fact about the dataset.**

**Incoming:** Kestrel Motors, programme `PRG-KST-K2` (K2 mid-size SUV, R-EPS,
SOP 2028-09), RFQ `RFQ-2026-0044`, spec `CRS-KST-K2-001 **Rev B**` — and
`Rev A` is also in the database, superseded 2026-07-30.

### SYS.1 — what the customer asked for

| `cr_id` | attribute | op | value | unit | condition | ASIL |
|---|---|---|---|---|---|---|
| CR-K2-0101 | `rack_force_capacity` | ≥ | **8000** | N | peak, 20 °C, 13.5 V | B |
| CR-K2-0102 | `road_wheel_angle_range` | ± | **50** | deg | both directions | QM |
| CR-K2-0103 | `on_center_torque_at_30deg` | ≤ | **2.7** | Nm | ISO 13674-1 weave, 100 km/h | QM |
| CR-K2-0104 | `on_center_torque_hysteresis` | ≤ | **0.5** | Nm | same test point | QM |

…plus the twenty-odd requirements any real CRS carries and this one will too:
steering ratio, rack stroke, max current at 12 V, ASIL **D** for *unintended
assist torque* and ASIL C for *loss of assist* (the standard EPS safety goal
pair), −40…+85 °C, ISO 26262 up to ASIL D, ASPICE CL2, CAN-FD diagnostic
interface, EOL calibration, lifetime cycles, fail-operational manual steering
fallback, mass ≤ 12.4 kg, NVH limit, cybersecurity per ISO/SAE 21434, and a
piece-price target.

**Rev A said `rack_force_capacity ≥ 7500 N`.** That is trap T1.

### SYS.2 — what that means for our system

| `sr_id` | text (abbreviated) | derivation |
|---|---|---|
| SR-EPS-0407 | EPS assembly shall deliver ≥ 8000 N at the rack **plus** the internal friction losses between motor and rack | CR-K2-0101 + friction budget |
| SR-EPS-0408 | Steering wheel torque at 30° SWA ≤ 2.7 Nm, per **BUD-ONCTR-TRQ** | CR-K2-0103 |
| SR-EPS-0411 | On-centre hysteresis ≤ 0.5 Nm | CR-K2-0104 |
| SR-EPS-0415 | Assist command latency, sensor edge to motor current, ≤ **BUD-LATENCY** target | derived, no CR parent — an *orphan*, deliberately |

**`BUD-ONCTR-TRQ`** — target 2.7 Nm, tolerance ±0.05:

| allocation | value | basis |
|---|---|---|
| rack + wheel path friction | **2.4** | measured, carryover from PRG-HLX-H1 |
| column + gearbox friction | **0.3** | estimated |
| | **2.7 — closes ✓** | |

**`BUD-HYST-CTRL`** — the control-side contributions (assumption A6), target
**declared 0.5**, `known_open = true`:

| allocation | value | basis |
|---|---|---|
| EPS hysteresis-compensation term | **1.2** | supplier-declared |
| damping term | **0.2** | estimated |
| | **1.4 vs a 0.5 target — delta +0.9, OPEN** | |

`closure_note`: *"allocations are control-side torque contributions at the
motor, target is measured at the wheel; conversion not recorded. Raised as
CHR-2026-0191, undecided."* — **trap T4.**

**`BUD-LATENCY`** — target 8.0 ms (assumption A7):

| allocation | value | basis |
|---|---|---|
| torque sensor acquisition (`EL-K2-TSENS-01`) | **3.5** ms | datasheet |
| ECU input + compute (`EL-K2-ECU-01`) | **1.7** ms | measured |
| motor control loop + PWM | 2.0 ms | measured |
| CAN-FD vehicle-speed staleness | 0.6 ms | analysis |
| | **7.8 vs 8.0 — closes, 0.2 ms margin** | |

### SYS.3 — the architecture, and the brief's chain made literal

```
ELEMENTS                          ACTIVITIES                 ALLOCATION
EL-K2-TSENS-01  torque sensor   ←──  ACT-TORQUE-SENSE           primary
EL-K2-ECU-01    ECU             ←──  ACT-ASSIST                 primary
                             ←──  ACT-DAMPING                primary
                             ←──  ACT-RETURN-TO-CENTER       primary
                             ←──  ACT-HYSTERESIS-COMP        primary
                             ←──  ACT-FRICTION-COMP          primary
                             ←──  ACT-DIAGNOSTICS            primary
EL-K2-MOT-01    PMSM motor      ←──  ACT-MOTOR-CONTROL          primary
EL-K2-GEAR-01   ball-nut gear
EL-K2-RACK-01   rack + housing

INTERFACES
EL-K2-TSENS-01 ──SENT, 1 ms, ASIL D──▶ EL-K2-ECU-01   (steering torque)
EL-K2-ECU-01   ──3-phase PWM, ASIL D──▶ EL-K2-MOT-01  (motor current)
vehicle CAN-FD ──10 ms, ASIL B──▶ EL-K2-ECU-01     (vehicle speed)
```

And the brief's *"ecu → damping → controller → args → funcs"* chain, resolved
across two databases by soft key:

```
vst_alm   EL-K2-ECU-01 ──activity──▶ ACT-DAMPING
                                       │  element_id soft key
vst_scm                                ▼
          SWC-DAMP (ASIL B) ──▶ FN-DAMP-0031  Damping_Apply()
                                       │
                                       ▼  function_params — the "args"
                          DAMP_GAIN_BASE   0.20  Nm·s/rad   calibratable
                          DAMP_SPD_BRK     60    km/h       calibratable
                          DAMP_MAX_TRQ     1.10  Nm         calibratable
```

The activity is named in `vst_alm`; the function that performs it lives in
`vst_scm`; nothing in Postgres connects them. **That join is the assistant's
job, and that is the point of the partition.**

---

## 6. `vst_pmo`, and the only thing that makes a cost answer honest

"How much should we tell the customer it would cost, based on our data" is the
hardest requirement in the brief, because the failure mode is invisible: a
number that looks grounded and is actually an average of everything we ever did.

**The fix is a comparables key, designed before the rows.** Every historical
effort record carries the same attributes a *new, unbuilt* requirement can be
described by, so a new requirement can be matched against history rather than
compared to a global mean:

```
change_class       reuse_as_is | recalibrate | modify_function | new_function
                 | modify_hardware | new_hardware | integration_only
                 | validation_only | safety_case_only
element_kind       sensor | ecu | motor | gearbox | mechanical | software_domain
asil               QM | A | B | C | D
reuse_class        carryover | modified | new
interfaces_touched 0..n
safety_case_impact bool          ← the expensive one
tooling_required   bool
year, region
```

`effort_records` then holds `actual_hours` broken out by discipline (systems,
software, hardware, calibration, validation, safety, PM), `calendar_weeks`, and
a free-text `outcome_note`. `rate_cards` turns hours into euros by year ×
region × discipline, so the estimate is built from **our** rates and not a
guessed hourly number.

**And `quotes` carries `quoted_hours` next to `actual_hours_final`.** That gives
the system self-knowledge it cannot otherwise have: historically Vantis
under-quoted `new_function` work by ~18 % and was accurate on `recalibrate`.
An estimate that ignores its own bias is worse than one that states it.

**The estimate is a range with an n, or it is an escalation.** Fewer than three
comparables and the honest output is "we have no basis", not a number with a
false decimal point. This is the same refusal as `@fde/agent`'s `runFanout`
declining to decide what a partial result means.

---

## 7. The planted traps

Seven, each one a specific wrong answer that a plausible implementation gives.
As in pharma, they are written down *before* the generator, so the generator has
to place them rather than the dataset happening to contain them.

| | Trap | The wrong answer it produces |
|---|---|---|
| **T1** | `CRS-KST-K2-001` **Rev A** says 7500 N, **Rev B** says 8000 N. Both are in the database. | A carryover gearbox rated 7600 N is reported as a clean reuse. It fits Rev A and misses Rev B by 400 N. Prefix-matching the spec id, or taking "latest" when the question is as-of, both land here. |
| **T2** | `VS-GEAR-3301-C` has a `part_capabilities` row `max_rack_force_N = 8000` with **`source = 'analysis'`, `qualified = false`**, and a `qualification_tests` row demonstrating only **7600 N**. | "We already have a gearbox that does 8000 N." The datasheet number is real; the *evidence* is not. Reading `parts` + `part_capabilities` without joining `qualification_tests` gives a confidently wrong reuse. |
| **T3** ▲ | `SWC-DAMP` ships today at **ASIL B** — *stated in prose in `docs/safety-assessment-2021.md`, not in any column*, and **contradicted by an older design note that says ASIL D and does not announce that it is wrong**. K2 allocates `ACT-DAMPING` under the ASIL **D** unintended-assist safety goal (`SR-EPS-0421`, which IS a column). | "Damping is carryover, zero cost." The code may well be reusable; the safety case is not, and in `vst_pmo` the `safety_case_impact = true` comparables average **4.2×** the hours of the same change without it. This is the single largest cost item in the whole example and the easiest one to miss. |
| **T4** | `BUD-HYST-CTRL` does not close — 1.4 against a 0.5 target — and `known_open = true` with an undecided change request. | Two bad answers are available: sum the allocations and report 1.4 as the hysteresis (wrong units, wrong measurement point), or report the 0.5 target as satisfied because a requirement row says 0.5. The right answer reports the open delta and escalates. |
| **T5** | `EFF-2021-0443` records **3,180 hours** for a `modify_hardware` change, because `outcome_note` says it absorbed a production-line relocation. | A mean over comparables roughly doubles the estimate. The median over a filtered comparable set is right. A cost answer that does not say which statistic it used cannot be checked. |
| **T6** | The cheapest matching ECU, `VS-ECU-4412-B`, is `lifecycle = 'ltb-passed'` — last-time-buy already gone — while `VS-ECU-4680-A` is in production at higher cost. | "Reuse the 4412." The BOM says it is reusable; the lifecycle column says it cannot be bought. Reuse analysis that reads structure and not status lands here. |
| **T7** | `SR-EPS-0415` (latency) has **no parent customer requirement** — an orphan derived requirement — and two customer requirements in the Rev B spec have **no `trace_cr_sr` row at all**. | "All requirements are covered." Coverage computed over the links that exist, rather than over the requirements that exist, reports 100 % on an incomplete graph. ASPICE's bidirectional traceability expectation is precisely about this. |

---

## 8. The acceptance test — step 1 is not done until this is answerable by hand

Pharma's rule, carried forward: **the estate is finished when the motivating
question can be derived in plain SQL by a human, with no model involved.** If it
cannot be, the data is not rich enough, and a table count will not tell you that.

> Given `CRS-KST-K2-001 Rev B` for programme `PRG-KST-K2`, produce for each of
> its customer requirements: the bucket (**satisfied as-is / satisfied after
> change / new development / cannot determine**), the elements and functions
> touched, and a cost range in hours and euros with the number of comparables
> behind it.

The expected answer, which the generator must make true:

| CR | bucket | why | touches |
|---|---|---|---|
| CR-K2-0101 8000 N | **change** | best qualified evidence is 7600 N (T2); Rev A's 7500 N is superseded (T1) | `EL-K2-GEAR-01`, `EL-K2-MOT-01`, `VS-GEAR-3301-C` |
| CR-K2-0102 ±50° | **as-is** | R-EPS line covers ±52° on two shipping programmes | `EL-K2-RACK-01` |
| CR-K2-0103 2.7 Nm @ 30° | **as-is** | `BUD-ONCTR-TRQ` closes at 2.7 with measured carryover | `SWC-ASSIST`, `SWC-FRICCOMP` |
| CR-K2-0104 0.5 Nm hysteresis | **cannot determine → escalate** | `BUD-HYST-CTRL` open by +0.9, CHR-2026-0191 undecided (T4) | `SWC-HYSTCOMP` |
| ASIL D unintended assist | **change** | `SWC-DAMP` is ASIL B today (T3); safety case is new work | `SWC-DAMP`, `EL-K2-ECU-01` |
| latency | **as-is** | `BUD-LATENCY` closes at 7.8 ms with 0.2 ms margin | `EL-K2-TSENS-01`, `EL-K2-ECU-01` |
| *(2 requirements)* | **cannot determine** | no trace link exists at all (T7) | — |

And the cost, from `vst_pmo` comparables, median not mean (T5), with the
`safety_case_impact` multiplier applied once and not twice.

**If a human cannot walk that in SQL, step 1 is not done.** Writing the
walkthrough is a deliverable, not a nice-to-have — `docs/steering/WALKTHROUGH.md`,
the same role pharma's has.

---

## 9. Determinism, designed in rather than earned

Pharma learned this the expensive way and wrote it down in
`world-fingerprint.ts`: the whole estate came off **one** seeded stream, so any
new generator that drew a single number shifted every value after it — different
ids, different dates, different results — and nothing detected it. `buildWorld`
(547 lines) and `buildOperations` (438) were untouchable for months as a result.

**So, from the first commit here:**

- **One `makeHelpers(seed)` per generator**, never a shared `h` passed around.
  Seeds are named constants in one file. A new generator gets a new seed and
  cannot disturb an existing stream.
- **A fingerprint per database plus one for the whole estate**, and
  `pnpm steering:world-check` asserting them — offline, free, no database
  touched, runnable beside a typecheck.
- **No `Date.now()`, `Math.random()` or bare `new Date()`** below the seed file.
  A frozen `EPOCH` constant, and every relative date computed from it.
- `pnpm steering:db-check` for the relational invariants — including the budget
  **deltas** of §3, the trace-graph orphan counts of T7 (asserted as *exact
  expected numbers*, because they are planted), and every soft key resolving in
  its target database.

**Every check is written in both directions** — what it must catch *and* what it
must let through. That rule was bought in pharma by an injection self-test that
passed for the wrong reason, and it is cheaper to adopt than to rediscover.

---

## 10. Package layout, and what steering proves about the split

```
packages/steering/          @vantis/steering
  src/config/     connections.ts (STEERING_DATABASE_URL), paths.ts, ids.ts
  src/db/init/    create · migrate · drop · check
  src/db/schema/  rows.ts — one typed row shape per table
  src/db/seed/    seeds.ts · rng.ts · fingerprint.ts · world-check.ts
                  requirements.ts · architecture.ts · hardware.ts
                  software.ts · programs.ts · effort.ts
  src/cli/        spec-trace.ts · coverage.ts · comparables.ts
docs/steering/    PLAN.md (this) · WALKTHROUGH.md · ARCHITECTURE.md
```

**Steering is the third domain, and therefore the first real test of the
`@fde/*` split.** Two domains can share a spine by coincidence; three cannot.
The plan should be explicit about which side of the line each piece falls on:

| Expected to be reused **unchanged** | Expected to be **genuinely new** |
|---|---|
| `@fde/foundry` — Entra tokens, client | the estate and its generators |
| `@fde/telemetry` — per-request cost log | the id scheme (`ids.ts`) |
| `@fde/schema` — parse → shape → coherence | the answer contract for a quote dossier |
| `@fde/evals` — repeats, severity, baselines, diffs | the eval cases and severity rules |
| `@fde/guard` — write-path denial | the reuse/change/new classification rules |
| `@fde/agent` — loop, engines, registry, fan-out | the comparables + estimate logic |
| `@fde/grounding` — load → chunk → embed → search | the prompt |

If any `@fde/*` package needs editing to accommodate steering, **that edit is
the finding** — it names a place where the abstraction was fitted to two
customers rather than to the problem. Worth recording when it happens rather
than quietly patching.

**`pnpm leak:check` — two facts, one of them a correction.**

*Verified:* the checker keys on the **package name**, not the directory — it
scans anything published under `@fde/` and exempts everything else. So
`@vantis/steering` is exempt the moment it exists; no exclusion list to edit.
(That keying was itself a bug fix: the first version listed a folder name, and
renaming the domain package would have made the check scan the one package that
is *supposed* to be full of domain words.)

*Added in S1* ▲ — seven steering nouns, so the check runs in the steering
direction too: `torque`, `autosar`, `hysteresis`, `aspice`, `steering`,
`rack force`, `vantis`. `leak:check` still PASS.

**Four candidates were deliberately left out**, and the reason is that
`leak-check.mjs` matches with a bare substring test and no word boundary:

| left out | because it matches |
|---|---|
| `eps` | "st**eps**" |
| `rack` | "t**rack**", "t**rack**ing" |
| `pinion` | "o**pinion**" |
| `requirement` | legitimate across `@fde/schema`, `@fde/evals`, `@fde/agent` |

Each would have gone red on innocent code the first time anyone ran it, and
that file's own header states the rule: *banned words must be words that CANNOT
appear innocently*. A check that cries wolf on day one gets muted, and then it
protects nothing. `rack force` is the two-word form, which is safe.

---

## 11. The steps

Each one ends in something that can be run and shown, per the small-verified-
increments rule. **Nothing in S1–S5 spends a cent on a model** — the whole of
step 1 is free, and only S6+ calls one.

| | Step | Deliverable | Exit |
|---|---|---|---|
| ☑ **S0** | **Confirm §3.** The units table, especially A6 and A7. | — | **Both confirmed 2026-09-13, both as built.** No data changed. |
| ☑ **S1** | **Wiring.** `packages/steering`, `connections.ts` on `STEERING_DATABASE_URL`, `.env.example`, `turbo.json` `globalEnv`. *(`pnpm-workspace.yaml` needed no edit — its globs are `packages/*`.)* | `pnpm steering:env-check` | four resolved URLs, connects to none; `pnpm leak:check` still PASS |
| ☑ **S2** | **Schema.** 37 tables in four DDL files, real FKs inside `vst_alm`. | `db/schema/0{1..4}-*.sql` | `db:create` + `db:migrate` clean; 6 / 8 / 18 / 5 tables |
| ☑ **S3** | **Generators + corpus.** Five streams, own seed each. Traps T1–T7 placed by hand and commented with their number. | 13,705 rows + 54 files | `steering:world-check` green, sha `5f98e75def5728cb`; two builds byte-identical |
| ☑ **S4** | **The checks.** `estate-check` (offline, in memory) and `db:check` (loaded from Postgres) share one assertion file, so they cannot drift. Plus `sabotage-check`, which breaks one thing at a time and requires the matching check to go red. | 28 / 27 assertions + 14 sabotage cases | **`estate-check` PASS 28/0 · `db:check` PASS 27/0** live · **`sabotage-check` PASS 14/14 breaks detected**, including a control that the unsabotaged estate is still green |
| ◐ **S5** | **The hand walkthrough.** §8 derived in SQL, written up in `WALKTHROUGH.md` in plain language. | the acceptance test | a human reproduces the §8 table with no model |
| — | *step 1 ends here* | | |
| ◐ **S6** | **Sorting the corpus into rows** — parse, index, extract, into `vst_derived`, which is ours and is not in `SYSTEMS`. The phase that turns the ▲ correction at the top of this document from a confession into a fixed problem. | [`SORTING.md`](SORTING.md) | the walks read `vst_derived`, and the four databases are only ever opened to grade it |
| ☐ S7+ | **The FDE capability** — sketched only: ingest `docs/steering/corpus/` through `@fde/grounding`; tools over the four databases; the quote-dossier answer contract with *no field that can say "we'll do it"*; eval cases built on the traps; then the reuse/change/new classification and the comparables estimate. | | |

**S6+ is deliberately one line.** Pharma's plan sketched its later steps and was
right to — the estate is what determines whether the capability is buildable,
and designing the capability first is how you end up with data shaped to
flatter it.

---

## 12. What this plan does not answer

- **Whether the estate should be on the same Neon project as pharma's six.**
  Four more databases on one project is an ops question, not a design one, and
  the `STEERING_DATABASE_URL` indirection means it can change later. *(As built
  it IS the same project — eleven databases now share it.)*
- **How big is big enough.** The row counts in §4 are sized so the comparables
  query in §6 has something to chew on. If S5 shows an estimate resting on two
  records, the answer is more *history*, not more *tables*.
- ▲ **Whether the corpus should be a real git repository** rather than a
  `git-log.txt` dump. Resolved halfway: `vst_scm` is no longer a database, but
  the history is still an exported text file rather than actual git objects.
  Real objects would let the code-history question be answered with `git` itself,
  and would be a large amount of work for a gain nothing currently needs.
- ▲ **The prose corpus.** *Resolved — it exists, and sorting it is now S6.* This
  bullet said the documents a steering programme generates were a corpus plan of
  their own that belonged after S5. Half right: the documents got written (the
  re-root at the top), but how they become rows is indeed its own plan, and it
  is [`SORTING.md`](SORTING.md) rather than another section here.

---

## Sources

- [SYS.3 System Architectural Design — ASPICE reference](https://alef1986.github.io/ASPICE-Archi/0c6fbcf4-57de-4e25-a1b4-d9a0fa460c16/elements/85958416-de8c-4475-941b-eeaaff5eeed9.html)
- [ASPICE 4.0 Process SYS.2 — Ease Solutions](https://www.easesolutions.com/2025-07-01-aspice-blog-part-3)
- [An ASPICE Overview — SUSE](https://www.suse.com/c/an-aspice-overview/)
- [Introduction to Automotive SPICE — SPICE booklet, 8th edition](https://cdn.prod.website-files.com/664c628bfa8d7e605ce041ef/669f76d2ae3fc71a0805672a_SPICE-BOOKLET-2024-8th-Edition.pdf)
- [Electric steering rack: C-EPS, P-EPS, DP-EPS, R-EPS](https://www.unionwincar.com/electric-steering-rack-a-complete-guide-to-c-eps-rack-p-eps-rack-dp-eps-rack-and-r-eps-rack/)
- [Single & dual pinion-assist EPS — Nexteer](https://www.nexteer.com/electric-power-steering/pinion-assisted-eps/)
- [Electric Power Steering (EPS) system — ARTC](https://www.artc.org.tw/en/service/transferable/47)
- [ISO 13674-1:2023 — quantification of on-centre handling, weave test](https://www.iso.org/standard/83233.html)
- [A hysteresis-based steering feel model for steer-by-wire systems](https://onlinelibrary.wiley.com/doi/10.1155/2017/2313529)
- [Effect of rack friction, column friction and vehicle speed on EPS](https://www.academia.edu/104461992/Effect_of_Rack_Friction_Column_Friction_and_Vehicle_Speed_on_Electric_Power_Steering_EPS_of_Vehicle_A_Methodology)
- [ASIL levels explained — ISO 26262](https://piembsystech.com/asil-levels-explained/)
- [Active return-to-center control for EPS](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5877371/)
- [Structure of classic AUTOSAR software components](https://medium.com/@jerinjose/an-in-depth-exploration-of-the-structure-of-classic-autosar-software-components-8137e1adc17d)
- [In 2026, RFQ response time is becoming a competitive advantage](https://campfire-interactive.com/news/in-2026-rfq-response-time-is-becoming-a-competitive-advantage-or-disadvantage)
- [Tier 1 & Tier 2 automotive suppliers industry primer — Umbrex](https://umbrex.com/resources/industry-primers/automotive-mobility-industry-primers/tier-1-tier-2-automotive-suppliers-industry-primer/)
