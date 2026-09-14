# release-001 — the acceptance case

*Written 2026-09-11. Every value below was read back out of the six databases
after seeding, not copied from the generator's intentions. Re-derive the whole
picture with `pnpm db:trace LOT-IBU200-2609-B`, or assert it with
`pnpm db:check`.*

**Values here move when the generator changes.** The seed is deterministic for a
given version of the code, not across edits — editing the generator shifts the
random stream, so quantities, authorisation numbers and test results change
while the anchored ids and dates do not. If a number below disagrees with
`db:trace`, `db:trace` is right.

This case is what makes step 1 finished. Rows existing is not the finish line;
**one question whose correct answer requires four silos and is derivable by
hand** is. Until a tool exists to answer it, this document is the answer key.

---

## The question

> Can lot `LOT-IBU200-2609-B` of Ibuprofen 200 mg film-coated tablets be
> QP-certified for release to the EU?

For the EU this is not a generic sign-off. Under **EU GMP Annex 16 §1.5** a
batch is certified by a named **Qualified Person** who is *personally*
responsible for confirming it was made in accordance with the marketing
authorisation and with GMP. The question is therefore partly about a specific
human being's standing on a specific day — which is why the personnel database
is load-bearing here and not an org chart.

## The answer

**No.** The certification that was made is invalid, and the batch should not
have left quarantine.

**Not** because anything is wrong with the tablets. Every release test passes,
comfortably. The defect is procedural, it is invisible to the laboratory, and
it is only findable by crossing from the quality system into the personnel
system and then into the standards system — and then asking the standards
system what the rule was *on the day*, rather than what it is now.

---

## The derivation

### 1. `mrd_erp` — what the lot is, and which specification governs it

```
lot_id            LOT-IBU200-2609-B
product_id        PRD-00141   Ibuprofen 200 mg film-coated tablets
market            EU
quantity_units    299,720
manufactured_on   2026-08-31      expiry 2029-08-31
work_order_ref    WO-26-0417      → mrd_mes
spec_version_ref  SPEC-IBU200-v4  → mrd_qms
status            released
```

The EU marketing authorisation `NL/H/4986/001` is valid and was granted against
`SPEC-IBU200-v4`, which is the version the lot was made to. Nothing wrong here.

### 2. `mrd_mes` — the run that made it

```
work_order_id      WO-26-0417
line_id            LINE-01-T1      Leiden, B1/R-104, grade D
actual_start       2026-08-28      actual_end 2026-08-31
governing_sop_ref  SOP-MFG-022 Rev 4    (correct: Rev 4 in force since 2024-06-01)
signed_by_ref      EMP-0127        signed_on 2026-09-01
deviations         none
```

Six process steps, all in-process parameters within limits, four-eyes upheld on
every step, equipment qualified **on the dates it was used**. Nothing wrong here
either.

That last qualifier was earned. The first version of the seed let `EQ-0112`'s
qualification lapse and never renewed it — and `EQ-0112` is the granulator on
`LINE-01-T1`, so *every* later run on that line inherited the finding, this one
included. The acceptance case claimed a clean run while its own step 2 used
unqualified equipment. The fix was to give the lapse an end as well as a start
(requalified 2026-07-20), which contains it to `WO-26-0389` and turns "is this
machine qualified" into "was it qualified on the day" — the same as-of rule the
SOP revisions live by, applied to a machine. `db:check` now asserts the
containment, because a trap that bleeds onto its neighbours is not a trap.

### 3. `mrd_qms` — what the laboratory found

| attribute | result | limit (`SPEC-IBU200-v4`) | in spec |
|---|---|---|---|
| assay | 100.81 % | 95.0 – 105.0 % | ✔ |
| dissolution | 85.33 % | ≥ 80.0 % | ✔ |
| uniformity | 93.71 % | 85.0 – 115.0 % | ✔ |
| water | 2.92 % | 0.0 – 5.0 % | ✔ |
| micro (TAMC) | 735 CFU/g | ≤ 1000 CFU/g | ✔ |

**Five of five in specification.** This is the row that makes the naive answer
"yes, release it", and it is why the case is worth anything: an assistant that
only reads the lab system gets this wrong with total confidence and a citation.

And the decision that was actually taken:

```
disposition_id     DISP-26-0001
decision           released          qp_certified = true
decided_on         2026-09-04
decided_by_ref     EMP-0103          → mrd_hcm
governing_sop_ref  SOP-QC-014 Rev 7  → mrd_reg
```

### 4. `mrd_hcm` — who EMP-0103 is, and their standing on 2026-09-04

```
EMP-0103   Eva Vos
           Qualified Person, DEPT-QA
           QP registration QP-NL-32741 (CBG-MEB), no expiry
           signature authority `qp_certify`, granted 2024-07-09, never revoked

           training record TRN-GMP-REF (GMP Refresher, 24-month validity)
             completed  2024-08-24
             expires    2026-08-24     ← ELEVEN DAYS BEFORE THE CERTIFICATION
```

Eva Vos is a real, registered, authorised QP. The registration has no expiry and
the signing authority was never revoked. Everything about their *appointment* is
in order. What had lapsed is the **GMP refresher training** — eleven days before
they signed.

### 5. `mrd_reg` — and this is the step that decides it

The disposition names `SOP-QC-014 Rev 7`. The rule is not "look up SOP-QC-014",
it is **"look up SOP-QC-014 as of 2026-09-04"**:

| revision | effective_from | effective_to | what it says about training |
|---|---|---|---|
| Rev 5 | 2021-02-01 | 2023-06-30 | — |
| Rev 6 | 2023-07-01 | 2026-02-28 | **no personnel-training precondition** |
| **Rev 7** | **2026-03-01** | *(in force)* | **§7.3 the certifying QP must hold a valid, unexpired GMP refresher record on the date of certification. A certification made without one is invalid and the batch remains in quarantine.** |

2026-09-04 falls in Rev 7's window. Rev 7 §7.3 is unambiguous, and it links to
`ANNEX16-1.7` — the QP "must have ongoing knowledge and experience appropriate
to the products certified" — and to `CFR-211.25`, which requires training "with
sufficient frequency to assure continuing familiarity".

**Therefore: the certification is invalid. The lot stays in quarantine pending
re-certification by a QP with current training.**

---

## Why the dates are pinned, and what happens if they drift

The first draft of the plan dated this lot to 2024 while keeping Rev 7 effective
from 2026-03-01. Under those dates the certification would have been governed by
**Rev 6**, which carries no training precondition — and the correct answer flips
to *yes, release it*. The acceptance case derived to the opposite of what it
claimed.

That is not a near-miss worth forgetting. It is the clearest possible
demonstration of why the as-of rule is a schema constraint (`effective_from` /
`effective_to`, range lookup) and not a prompt instruction. Every disposition in
the seed asks `sopRevisionAsOf()` for its governing revision at its own decision
date, which is why the 2024 dispositions correctly carry Rev 6 and the 2026 ones
carry Rev 7.

---

## The control — `LOT-IBU200-2608-A`

Same product, same line, one campaign earlier, certified under the same Rev 7:

```
DISP-26-0004   released, qp_certified   2026-08-14
decided_by     EMP-0104  Thijs van Dijk, Qualified Person, DEPT-QA
               TRN-GMP-REF completed 2026-01-27, expires 2028-01-27  ← current
5/5 tests in specification · no deviations · equipment qualified
no material from a disqualified supplier
```

**The answer here is yes, release it.** This control is not decoration. Without
it, an assistant that answers "do not release" to everything scores perfectly on
the case above, and so does a corpus that only plants failures.

---

## What this case does NOT test

Stated so that nobody reads a passing answer as more than it is:

- **It does not need retrieval.** Every fact above is an exact lookup by key.
  The searchable standards corpus is step 2, and until it exists the model
  cannot be asked *why* Rev 7 says what it says.
- **It touches five silos but only one lot.** Nothing here exercises the
  traceability shape of T4 (one material lot → many finished lots) or the
  time-series shape of T5.
- **It has no wrong-but-plausible sibling in the same market.** T6's twin,
  `LOT-IBU200-2609-D`, is the US lot against a looser dissolution limit; a case
  that asks the same question about the twin belongs in step 3.
- **Nothing has been asked of a model.** This is a hand derivation against
  seeded rows. The first time it means anything is when a tool answers it
  without being told where to look.
