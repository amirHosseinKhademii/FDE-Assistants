# The corpus — what the data actually is

*Step 1 of `PLAN.md` §8. Measured 2026-09-17 against the NHTSA ODI flat files.
**Nothing has been ingested, embedded or modelled.** This document exists so the
next step is taken with open eyes.*

**THE DATA IS REAL AND SO ARE THE PEOPLE IN IT.** 64 complaints in this slice
report a death, 2,680 report injuries, and 39 in every thousand name a family
member. Read §6 before deciding where any of it is sent.

---

## 1 · The slice

**Model years 2019 and 2020, every make and model, nationwide.**

Chosen over 2022+2023 for one reason: these vehicles have had six years for
recalls to be issued **and for remedies to be tested**, which is the engagement's
actual question. The proven contradiction in `PLAN.md` §4 is a 2019 model.

| source | rows | distinct units | on disk |
|---|---|---|---|
| complaints | **100,980** | 100,980 complaints | 79 MB |
| recalls | 44,791 | **3,026 campaigns** | 56 MB |
| investigations | 1,631 | **114 investigations** | 4.3 MB |

A recall campaign covers many make/model/year rows, which is why 44,791 rows are
3,026 campaigns. **That fan-out is the first modelling decision**: the unit of
meaning is the campaign, not the row.

Storage: measured at **~2 KB per chunk** in the existing Neon databases
(steering: 3,854 chunks = 7,536 kB). 100,980 complaints ≈ **200 MB**, inside
Neon's 0.5 GB free tier. Storage is not the constraint; it was checked rather
than assumed.

### Where it came from

```
https://static.nhtsa.gov/odi/ffdd/cmpl/FLAT_CMPL.zip           355 MB → 1.5 GB
https://static.nhtsa.gov/odi/ffdd/rcl/FLAT_RCL_POST_2010.zip         → 297 MB
https://static.nhtsa.gov/odi/ffdd/inv/FLAT_INV.zip                   → 373 MB
https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt                data dictionary
https://static.nhtsa.gov/odi/ffdd/rcl/RCL.txt                  data dictionary
```

**Tab-delimited, no header row.** A column is knowable only by position, so the
dictionaries are not optional reading — a mis-aligned column would put
narratives in a date field and nothing would error.

`FLAT_CMPL.zip` changes daily. **The snapshot must be frozen and dated**, or an
answer key written against it rots underneath the eval baseline.

---

## 2 · The shape of each source

**Complaints** — 51 fields; the ones that matter:

| field | | |
|---|---|---|
| `ODINO` | NHTSA reference | **repeats across rows** when one complaint names several components |
| `CDESCR` | the narrative, ≤2048 chars | the corpus |
| `COMPDESC` | component | 472 distinct values in this slice |
| `CRASH` `FIRE` `INJURED` `DEATHS` | severity | structured, reliable |
| `LDATE` | received by NHTSA | `YYYYMMDD` |
| `VIN` | 11 chars, truncated | §6 |

`CMPLID` is documented as **updateable** — *"data for a given record potentially
could change from one data output file to the next."* So the primary key is not
stable across snapshots. `ODINO` is the reference to cite.

**Recalls** — `CAMPNO` (e.g. `20V437000`) is the id a person quotes. Carries
prose blocks for defect, consequence and remedy, plus `INFLUENCED_BY`.

**Investigations** — 114 in the slice, with a long narrative field. This is where
NHTSA writes down what it thought before a recall existed.

---

## 3 · The messiness, measured

| | |
|---|---|
| ALL-CAPS narratives | **22,787 (23%)** |
| narratives under 40 characters | 1,528 |
| empty narratives | 0 |
| distinct makes | **198** |
| distinct make\|model pairs | 988 |
| distinct `COMPDESC` | **472** |

**Manufacturer names do not join.** Differing only by punctuation:

```
MERCEDES BENZ        <->  MERCEDES-BENZ
BLACK SERIES CAMPERS <->  BLACKSERIES CAMPERS
```

And in the recall prose itself: `"American Honda Motor Co."` in one campaign,
`"America Honda Motor Co."` in the next. Any grouping by manufacturer name
silently splits one company into two.

### Three date formats, from one agency

| where | format |
|---|---|
| flat files | `YYYYMMDD` |
| complaints API | `MM/DD/YYYY` |
| recalls API | `DD/MM/YYYY` |

Proved from the data, not assumed: in the complaints API the first field is never
above 12 and the second sometimes is; in the recalls API it is the reverse.

**This already produced one wrong answer during this survey.** Parsing both API
formats as `DD/MM/YYYY` silently discarded every complaint whose day exceeded 12
and returned a confident, plausible, wrong count. Nothing errored.

### The schema changed underneath the file

`CMPL.txt`'s own change log: fields 21–46 added in 2007, 47 in 2007, 48 in 2014,
49 in 2015, **50–51 in April 2026** — and *"flat file content changes May 17 –
June 17, 2021"*. One file spanning 1995–2026 does not have one schema. Our slice
is recent enough to be mostly uniform, which is luck rather than design.

---

## 4 · What makes this worth the trouble

**`INFLUENCED_BY` is a conflict marker hiding in a structured field:**

```
MFR    43,162    the manufacturer recalled voluntarily
ODI     1,407    NHTSA's Office of Defects Investigation pushed for it
OVSC      222    Vehicle Safety Compliance pushed for it
```

**1,407 campaigns the manufacturer did not volunteer.** That is a documented
disagreement between two parties, already labelled, needing no inference.

**And the complaints-after-remedy pattern**, from `PLAN.md` §4: recall
`20V437000` replaced the sliding-door handle cables in July 2020; **51 of 55**
sliding-door complaints were filed after it, the most recent this month.

Neither proves a remedy failed. Both are exactly the shape of a question a
document cannot settle and a person must — which is what the answer contract's
`conflicts` and `escalate` fields exist for.

---

## 5 · Severity is structured, and that is rare

| | |
|---|---|
| crash reported | 4,589 |
| fire reported | 1,355 |
| injuries reported | 2,680 |
| **deaths reported** | **64** |

Most corpora make you infer severity from prose. Here it is a field. That makes a
measurable eval check possible — *did the answer surface the fatal ones?* — of a
kind none of the three existing engagements can ask.

---

## 6 · This is real people's data, and it changes a decision

- **VINs are present and truncated to 11 of 17 characters** (`5FNRL6H23KB`).
  That truncation is NHTSA's de-identification: enough for model and plant, not
  for a vehicle. **We must not undo it**, including by joining it to anything.
- Case is inconsistent (`5FNRL6H23KB`, `5fnrl6h7xkb`), so any VIN handling needs
  normalising — which is a decision about identity, not formatting.
- Narratives name family members, towns and dealerships. They describe crashes,
  fires, injuries and 64 deaths, in the words of the people they happened to.

Lawfully public. **Not weightless.** The three existing corpora are invented, so
*"free tiers commonly train on what you send"* was a caveat with no teeth. Here
it has them.

**The consequence, and it is already settled by measurement:** `EMBEDDINGS=local`
stops being a cost decision and becomes a data one. Embedding touches every
passage; local means the narratives never leave the machine. `docs/FREE.md` §8c
measured local bge-small at recall@k **0.813** against the paid Azure model's
**0.813** — so there is no accuracy argument on the other side.

---

## 7 · What step 2 must answer, by hand

Per `PLAN.md` §8, the answer key is written **before** retrieval exists.

Open questions this survey raised, to be settled while writing it:

1. **What is a document?** One complaint is 709 characters on average — smaller
   than a normal chunk. Chunking is probably the wrong verb; one complaint is
   likely one passage.
2. **`ODINO` repeats across component rows.** Are those one complaint or
   several? It changes every count in this file.
3. **Is a recall campaign one document or 3,026 fan-out rows?** §1.
4. **What is the exact-lookup tool keyed on?** `CAMPNO` is the obvious id. Is
   there a second — make/model/year?
5. **How is "the remedy is not holding" expressed without asserting it?** This
   is the hardest one and it is a schema question, not a prompt question.

**No code until these are answered.**
