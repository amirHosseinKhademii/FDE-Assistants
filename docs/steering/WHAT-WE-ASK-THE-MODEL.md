# What we ask the model, what for, and how it works underneath

*Written 2026-09-13. The code is `packages/steering/src/derived/extract/`.
Plain-language overview of the whole sorting job:
[`HOW-WE-SORTED-IT.md`](HOW-WE-SORTED-IT.md). Where the data goes:
[`DATA-RESIDENCY.md`](DATA-RESIDENCY.md).*

---

## 1 - Why a model is involved at all

Most of Vantis's files need no AI. Timesheets, rate cards, quotations and
estimates are spreadsheets exported to text; plain code reads them, locally,
exactly, and a failure is a bug rather than a judgement. That covers the
overwhelming majority of the volume.

**One question does not yield to that.** To tell a car maker what a new job will
cost, you compare it with past jobs of the same kind. "Same kind" means six
things: what sort of change it was, what part it touched, at what safety level,
how many interfaces, whether the safety case was reopened, whether tooling was
needed.

**None of those is a field in any document.** They are a paragraph:

> New software, no predecessor to carry over. The work was on the control
> software. Because the change touched the ASIL C path, the safety case had to
> be reworked and re-assessed. 3 interface(s) were affected.

And the same fact is written differently every time - *"The existing hardware
was modified"*, *"A change to the existing mechanical design"*, *"Calibration
only, the software was not modified."* Matching every phrasing with rules means
the ones you did not think of fail **silently**, which is the worst failure mode
available.

> **An honest caveat.** For *this* corpus, rules would actually do well, because
> these documents were generated from a fixed set of sentence templates. That is
> a property of the practice data, not of the world. A real closure report is
> written by whoever was left on the programme and follows no template. That is
> the situation being rehearsed.

---

## 2 - What we ask for

One call per document. Six questions, and for each one **two answers, not one**:
the value, and *the sentence it was read from*.

```json
"element_kind": {
  "value": "software_domain",
  "evidence": "The work was on the control software."
}
```

The shape is enforced by a **strict JSON schema** - `strict: true`, every field
required, `additionalProperties: false`, values constrained to an enum. The
model cannot return prose, cannot skip the evidence, and cannot invent a seventh
category. `value` may be `null`, and when it is, `evidence` must be too.

**`null` is a first-class answer and means "the document does not say."** Not
"no", not "zero". About a quarter of all answers are null, correctly.

### The instruction, and why each line is in it

> **THE RULE THAT OVERRIDES EVERYTHING ELSE:** if the document does not state a
> field, return null for it. Not a guess, not the most likely value, not a value
> inferred from the rest of the report. Null.

Then three traps, each of which was a real failure before it was a sentence:

1. **Silence is not "false."** If the report never mentions tooling,
   `tooling_required` is null, not false. A pipeline that reads absence as a
   negative will confidently report that 196 jobs needed no tooling when nobody
   ever wrote about it.
2. **Do not infer one field from another.** Each field is answered from a
   sentence about *that* field or it is answered null.
3. **The evidence must be real.** Copy the sentence exactly; it is searched for
   in the file, and a paraphrase will not be found.

Closing with what a good answer looks like: *a null with no evidence is a good
answer; a confident value with a sentence that was not in the document is the
worst outcome available to you.*

**The prompt states no field count.** It said "seven classification fields" for a
day after the schema dropped to six - an instruction quietly contradicting the
contract it ships with. The schema is now the single statement of that, and
`derived:compliance-check` fails if a number creeps back into the prompt.

---

## 3 - What happens to the answer before it is believed

### The evidence is searched for in the file

Take the sentence the model quoted. Look for it in the source document. **Not
there, and the fact is discarded** - into a `rejected_facts` table rather than
deleted, because a rejection is the most informative thing the pipeline
produces.

Three passes, strictest first, and anything matched below the first is stored
**flagged** (`evidence_exact = false`) so the looseness stays visible:

| pass | what it ignores | why it exists |
|---|---|---|
| 1 - exact | line wrapping only | the reports are hard-wrapped at 68 characters, so a sentence read as one line is three lines in the file. Comparing raw would reject every true quote and we would be measuring line width. |
| 2 - punctuation | dashes, quote marks, control bytes | the transport mangles non-ASCII: an em dash came back as a device-control byte. |
| 3 - letters only | everything that is not a letter | ten rejections were all the same em dash arriving as runs of control bytes, sometimes with digits mixed in. |

Pass 3 still compares **every word**, which is what a fabrication would change.
What it gives up is noticing a changed *number* inside a quotation - acceptable,
because the number a fact asserts lives in `value`, which was never checked
against the quote anyway.

**The line number is found by us, not supplied by the model.** So a challenged
figure traces to `EFF-BULK-0067.md:14`, not to a row nobody can justify.

### Why this catches invention

Producing a plausible value is trivial. Producing a value **and** a sentence
that exists word-for-word in one specific file is not. And verifying costs
nothing - it is string search. No second model, no human review, no list of
right answers.

**It works identically at a customer on day one**, which is the property that
matters. Result so far: **zero invented sentences in 1,320 facts.** The two
rejections that remain are the model looping - repeating `integration only`
three times where the file says `integration only - Lumen.` A quote that repeats
itself is not in the document, and accepting it would mean tuning the matcher
past the point of measuring anything.

### What it cannot catch, and what does

A value **misread from a real sentence**. That happened: `reuse_class = new`,
quoting *"New software, no predecessor to carry over."* A genuine sentence, the
wrong field, the wrong answer. The evidence check was blind to it.

So a second, independent signal: **for each field, how often did it answer on
documents that mention it, against documents that do not?**

```
asil                 100% when stated    0% when not
interfaces_touched   100% when stated    0% when not
tooling_required     100% when stated    0% when not
reuse_class            never stated     38% anyway     <- caught
```

Three fields separate perfectly. One answers what is not there. **No answer key
is used** - this is a property of the output, readable by anyone.

---

## 4 - Where it lands

`vst_derived.extracted_facts` - a database that is **ours**, separate from the
customer's four, holding only what was derived from their files. One row per
document per field:

| field | value | line | evidence |
|---|---|---|---|
| `change_class` | `new_function` | 9 | *new function* |
| `element_kind` | `software_domain` | 13 | *The work was on the control software.* |
| `asil` | `C` | 14 | *Because the change touched the ASIL C path...* |
| `safety_case_impact` | `true` | 14 | *Because the change touched the ASIL C path...* |
| `interfaces_touched` | `3` | 15 | *3 interface(s) were affected.* |
| `tooling_required` | **NULL** | - | - |

Which turns a reading task into a question:

> *What did safety-case work at ASIL D cost us before?*

You cannot ask a paragraph that. You can ask 220 rows of `asil`, `change_class`
and hours - which is how **EUR 188,099** came out of a pile of files nobody had
opened in years.

---

## 5 - The field we removed, and why that is the useful part

`reuse_class` - how much of a design already existed - was asked for and is not
any more.

It is stated in **none** of the 220 closure reports. The model answered it 83
times at **36% accuracy**; with three possible values, chance is 33%. It was
inferring it from the change class and dressing it in that field's sentence.

The prompt already forbade exactly that, by name. It made no difference: on
identical instructions and documents of the same shape, it refused 137 times and
guessed 83. **Rewording is money spent to move a number that is already at
chance.**

So the field is not offered. Dropping it raised overall accuracy from 93% to
98%, and nothing downstream used it.

**What replaces it is worth more than the column would have been:** *your
closure reports do not record reuse, so nobody can tell you what carryover work
costs.* A pipeline that asks for something the documents do not contain will get
an answer, and that answer is noise with a citation attached - the most
expensive kind of wrong, because it looks exactly like the others.

---

## 6 - Scale and cost

220 documents, one call each, about 122,000 input tokens, a few cents on
`gpt-5-mini`. Calls run six at a time with backoff; responses are written to
disk as they arrive, and the cache records which corpus it belongs to and
refuses to replay against a different one.

Result: **1,320 fields, 75% answered, 98% of answered fields correct.**

```bash
pnpm steering:derived-extract --dry-run        # free: shows the sample and the prompt
pnpm steering:derived-extract --limit 220      # the paid run
pnpm steering:derived-grade-facts              # free: the six checks above
pnpm steering:derived-compliance-check         # free: what goes on the wire
```
