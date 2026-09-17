# Stage 5 — the answer contract

**Split out of [`STAGE4.md`](STAGE4.md) on 2026-09-17.** They were one stage and
should not have been: a tool is a question you can ask the data, a contract is a
shape an answer must arrive in. **Neither needs the other to be testable**, and
bundling them hid that.

**Nothing here runs until stage 4 step 4.5 says the tools moved recall@6.** A
contract around an answer built from passages we could not retrieve would be a
very well-checked wrong answer.

---

## The one-line version

Stage 4 decides what the machine may ask. Stage 5 decides **what it is allowed
to say back** — and makes that checkable rather than hoped for.

---

## 1 · Why a contract at all, plainly

A model asked a question returns a paragraph. A paragraph is unfalsifiable: you
cannot test it, diff it, or tell which part came from a document and which part
the model supplied because it read well.

So the answer arrives as **fields**. Then three different things can be checked
separately:

```
DID IT PARSE      is it JSON at all
IS IT THE SHAPE   does every required field exist, with the right type
DOES IT COHERE    is it self-consistent — shape right, answer still wrong
```

These are reported separately because they have different causes and different
fixes, and **nothing is ever silently repaired**. Repairing malformed JSON hides
the failure rate, and the failure rate is what tells you whether the schema is
too hard, the prompt is unclear, or the model is wrong for the job.

---

## 2 · The shape

A Zod `strictObject`, the same pattern as
`apps/ai/insurance/src/schema/coverage-schema.ts`.

```
answer              the prose, or null if it cannot be answered
campaigns           campaign numbers this answer rests on
citations           { source, claim } — every factual statement, tied to a document
counts              { label, value, filter } — every NUMBER, tied to the tool call
                    that produced it
unverified_claims   things stated without a document behind them
conflicts           { topic, positions[], resolved_by }
escalate            { reason, suggested_owner } or null
```

**Every field carries a `.describe()` string**, because those strings are sent
to the model as part of the schema. They are prompt engineering, not
documentation — which is why `pnpm schema:check` fails when a field loses one.

### `counts` is the new field, and the reason for it

Insurance has no equivalent. It is here because three of eight questions are
counting questions, and because the key's own trap is a number.

> A number in `answer` that does not appear in `counts` is a number the model
> made up. That is a checkable rule, and it is the only defence against a
> confident 1,060.

---

## 3 · Coherence — the rules Zod cannot express

Shape and sense are different failures. Zod checks shape; these check sense.

Three carried over from insurance, both already proven:

1. **`answer` is null and `escalate` is null.** If you cannot answer, say why and
   name an owner.
2. **An answer with no citations and no `unverified_claims`.** Every factual
   claim is in one list or the other.
3. **An unresolved conflict with no escalation.** *The most important rule in the
   file* — it means the model silently picked a side between two documents that
   disagree.

And three that are new, each from this domain:

4. **A number in `answer` with no matching entry in `counts`.** §4.
5. **Any claim that a remedy failed.** This is
   [`ARCHITECTURE.md`](ARCHITECTURE.md) guardrail 5, and it is a legal
   distinction, not a stylistic one:

   > Complaints filed after a recall are **allegations by members of the
   > public**. They are not evidence the remedy failed. The vehicle may not have
   > had the repair done. The complaint may describe a different fault. Saying
   > "the fix is not holding" states as fact something no document here
   > supports.

   REC-001 explicitly checks **must not state the remedy failed** while still
   requiring the 103 to be surfaced. Both, at once.

6. **`find_recalls` returned `[]` but the answer cites a campaign.** The model
   reached for a loosely-related recall to avoid saying "none". REC-005's check
   is *does not cite a loosely-related campaign.*

---

---

## 4 · The baby steps, and what "done" means

| | step | done when |
|---|---|---|
| 5.1 | the Zod schema | `pnpm safety:schema:check` passes — and fails when a field loses its `.describe()` |
| 5.2 | the six coherence rules | each rejects a hand-written bad answer AND accepts a good one |
| 5.3 | the answer-key fixtures | one hand-written answer per REC case, good and bad, checked in |

**5.2's "and accepts a good one" is not padding.** A rule that rejects
everything passes a test that only feeds it bad input, and the insurance
engagement's control case exists because of exactly that: a fix that made the
system escalate on everything turned one case green and another red.

---

## 5 · What stage 5 deliberately does NOT do

- **No model call.** The contract is a schema and a set of pure functions. It is
  tested against answers written by hand, not generated.
- **No prompt.** Stage 6, with the loop.
- **No repair.** See §1 — a repaired answer is an unmeasured failure.

---

## 6 · Where the rules came from

| Rule | Learned | Cost of not having it |
|---|---|---|
| unresolved conflict must escalate | insurance | the model silently picks a side between two documents that disagree |
| every claim cited or declared unverified | insurance | no way to tell a document from a guess |
| a number must trace to a tool call | **this corpus** | a confident 1,057 answering the wrong question |
| never assert a remedy failed | **this corpus**, guardrail 5 | stating as fact something no document supports, about vehicle safety |
| no campaign cited when `find_recalls` was empty | **this corpus**, stage 4.2 | reaching for a loosely-related recall rather than saying "none" |
