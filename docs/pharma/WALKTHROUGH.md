# Meridian Pharma — a plain walkthrough

*No jargon. What we are building, why, and what exists so far. For the layout
see [`ARCHITECTURE.md`](ARCHITECTURE.md); for the plan, [`NEXT.md`](NEXT.md).*

---

## 1. The situation

A pharmaceutical factory makes drugs in **batches** — here, ~300,000 ibuprofen
tablets made over four days.

A batch cannot just be sold. Before it leaves the building a named human has to
sign it off. In Europe that person is a **Qualified Person**, and they are
personally, legally liable — less a manager's approval, more a pilot signing the
aircraft logbook. Until they sign, the batch sits in **quarantine**.

For that signature to be valid, four things must be true, and each lives in a
different computer system:

| must be true | system |
|---|---|
| we are licensed to sell this in that country | ERP — the business system |
| the factory made it correctly | MES — manufacturing |
| the lab tested it and it passed | QMS — quality |
| the person who signed was allowed to sign | HCM — HR |

A fifth system, **REG**, holds the rulebook — the company's written procedures
and the regulations behind them. It says what "allowed to sign" means.

These systems are from different vendors. They do not talk to each other. No
single query can span them. Today a person opens all five and copies identifiers
between them by hand.

**That copying is the bottleneck. It is also the product.**

## 2. The example we test against

Ask: *may lot `LOT-IBU200-2609-B` be released to the EU?*

- **ERP** — valid Dutch licence. Fine.
- **MES** — run finished clean, every step double-checked. Fine.
- **QMS** — five of five lab tests passed, comfortably. Batch released and
  certified on 4 September 2026. Fine.
- **HCM** — the certifier, Eva Vos, is a registered QP with authority that was
  never revoked. She holds eight training certificates. Seven current. **One
  expired on 24 August — eleven days before she signed.**
- **REG** — the company's own procedure `SOP-QC-014`, revision 7, §7.3: a QP
  without valid refresher training on the day they certify makes an **invalid**
  certification, and the batch stays in quarantine.

**The batch should not have shipped.** Part of it already has.

Three things make this hard, and they are why the example was chosen:

1. **Nothing is wrong with the tablets.** The defect is procedural. No amount of
   testing the product finds it.
2. **Every system read alone says "fine."** The problem exists only between HR
   and the rulebook.
3. **You must ask what the rule was *on the day*.** Revision 6 had no training
   requirement at all. Under 2025 dates the correct answer flips to *release
   it*. Same facts, opposite conclusion.

So the rulebook is not something you look up. It is something you look up **as
of a date**.

## 3. What has been built, in order

**A walk across the six systems** (`pnpm db:trace`). Follows the trail from the
lot to the work order to the lab to the person to the rulebook to the shipment —
26 queries, no joins, because no join is possible. It finds the trap and prints
it.

**The walk turned into reusable parts.** Originally it only printed to a
terminal: when it discovered "her training expired" it coloured the words red
and forgot. Nothing else could ever use that. Now each system has its own file
returning proper data, one system at a time, each step proved by the output not
changing.

Along the way two checks turned out to be wrong, in the same way both times:

- it flagged *any* disqualified supplier, including one we had correctly stopped
  using years before the batch existed;
- it flagged a failed lab test that had in fact been investigated, attributed to
  lab error, and retested to a pass — a properly handled event, not a failing
  batch.

Both are the same lesson: **a raw database column is not a finding.** The
finding is what you get when you compare two columns, and it has to be computed
and named, not inferred from a colour.

**Answering the question, not just reporting** (`pnpm db:release <lot> --to EU`).
The key move: which limits apply come from **the destination's licence**, not
from the lot. Lot `…-D` has a dissolution result of 79.77% — inside the US limit
(≥75), outside the EU one (≥80). Same tablets, same number, opposite answer.
Reading the lot's own specification answers "was it made correctly", which looks
identical and is a different question.

**A machine-readable version** (`--json`). The same dossier, verbatim. Not a
summary of it — if the two differed they would be two answers to one question.

**A contract for what an AI may say** (`pnpm schema:check`). There is **no field
that can say "release it."** Not a boolean, not an enum. The strongest possible
output is a file of blockers, evidence and gaps for the QP to sign or refuse.
Two rules beyond that:

- a blocker that was not escalated is rejected — that is the system quietly
  settling a question that is legally a named human's;
- a citation to anything time-varying must carry the date it was read as of.
  "`SOP-QC-014 Rev 7`" is consistent with both the right answer and its
  opposite; "`…as of 2026-09-04`" is checkable.

**The first tool an AI can call** (`pnpm tools:check`). One call covering the
whole walk — not one tool per system. A model given a lab tool gets *five of five
passed, released*, which is complete and satisfying and wrong; it has no reason
to keep looking. So the model receives the finished walk and never performs it.
Bad input comes back as a readable message, never a crash.

**The instructions the model follows** (`pnpm prompt:check`). Six numbered
steps, ordered rather than listed — an unordered set lets a model satisfy the
prompt by doing three of five and skipping the one that mattered. Two of the six
exist for a single failure: *"five of five tests in specification" is the most
answer-shaped sentence in any dossier, and it settles nothing.* The check cannot
tell you the prompt works — only a real model can. It catches the silent class:
a tool renamed but not updated in the prompt, a tool named in the prompt that
does not exist, a market promised that has no records, the never-clear rule
quietly reworded away.

Up to this point **no model had been involved**, on purpose: when a run goes
wrong with a model in it, the suspects are the tool, the prompt and the model.
Everything above removes the first one from the list.

**The first live run — and it worked.** One question, one tool call, two turns:

```
→ assess_release({"lot_id":"LOT-IBU200-2609-B","market":"EU"})
← ok   1 blocker(s)
```

It reported the lapsed training rather than reading "five of five passed" and
clearing the batch. It named the *rule* and not only the fact, carried the date
onto every citation, escalated to "Qualified Person, DEPT-QA", and never said
the batch may ship. It also proposed the two real remedies: a corrected training
record, or re-certification by a QP whose training was valid.

**One honest caveat, and it set up the next step.** The model never read §7.3.
It inferred the rule from the finding code and the revision number, and the
inference happened to be right. A lucky guess and a quotation look identical
from the outside.

**A tool that searches the procedure text** (`pnpm ingest`, then
`search_procedures`). The corpus — two revisions of one SOP — is now indexed,
and asking "may a QP certify without current refresher training" returns §7.3 of
Rev 7 as the top hit, ahead of Rev 6. So the text the model was guessing at is
now reachable.

This tool does one thing backwards from every other search in the repo:
**superseded documents stay searchable.** Insurance hides them, rightly — a
superseded policy pays nothing today. Here, Rev 6 governed every batch certified
between July 2023 and February 2026, batches still within shelf life and still
inspectable. Hiding it makes *"what did the procedure require in 2024?"*
unanswerable, and that is the question an inspector asks. So instead of hiding
old versions once and for all, the tool takes a **date**:

```
as of 2026-09-04  →  Rev 7 only
as of 2024-06-01  →  Rev 6 only
no date           →  both
```

Two of its checks failed on the first run, and **both times the check was
wrong, not the code** — the same lesson as the supplier flag and the retested
lab result. One asserted the clause had to be the *top* hit, when it is first
for one phrasing and second for another and the model reads all five either way.
The other matched the clause text with a pattern written from the prose, missing
that the document puts emphasis marks in the middle of the sentence.

## 4. What an "agent" actually is

Worth stating plainly, because the word hides it: **a model cannot do
anything.** It only produces text. It cannot reach a database, run a function,
or call a tool.

What happens is a loop:

1. You send the model the instructions, the question, and a *list* of the tools
   — their names, descriptions and argument shapes. Not the code.
2. It replies either with an answer, or with *"I want to call `assess_release`
   with lot `LOT-IBU200-2609-B`, market `EU`."*
3. **Your code** runs it. The model never touched the database.
4. You send the result back as another message.
5. It replies again — another tool call, or the final answer.
6. Repeat until it answers, or until a turn cap stops it.

That is the whole idea. Everything else is bookkeeping: retries when the reply
is malformed, a cap so a model cannot re-search forever, recording every call
for the audit trail, forcing the final answer into the agreed shape.

That bookkeeping is the same for every customer, so it is bought rather than
written — `@fde/agent`, already built and proven on the insurance side, with two
interchangeable engines (the OpenAI Agents SDK and Mastra). It also already
switches off two things that would matter here: keeping conversation history on
the provider's servers, and a tracing exporter that is ON by default and ships
transcripts to a third party.

**So we are not building an agent.** We are pointing the existing one at the
pharma tool, prompt and contract.

## 5. How the pieces connect

There is **one body of code that does the work**, and **two doors into it** —
one for a person, one for a model. Neither door does any work itself.

```
      YOU, in a terminal                              THE MODEL
             │                                             │
             │                                   "I want to call
             │                                    assess_release"
             ▼                                             ▼
    ┌───────────────────┐                      ┌──────────────────────┐
    │       cli/        │                      │     agent/tool/      │
    │                   │                      │                      │
    │ lot-trace.ts      │                      │ assess-release.tool  │
    │ release-report.ts │                      │ search-procedures    │
    │ ask.ts ───────────┼──── drives the ─────▶│      .tool           │
    └─────────┬─────────┘       loop           └──────────┬───────────┘
              │                                           │
       renders as text                          describes itself to a
       for a human                              model · checks untyped
              │                                 arguments · never throws
              │                                           │
              └─────────────────┬─────────────────────────┘
                                ▼
                  ┌──────────────────────────────┐
                  │           tools/             │
                  │                              │
                  │  functions/assess-release    │  the judgement
                  │            │                 │
                  │  departments/ erp mes qms    │  one file per system,
                  │            hcm reg tms       │  typed data out
                  │            │                 │
                  │  utils/handle · dates        │  connections, as-of dates
                  └──────────────┬───────────────┘
                                 ▼
                   ERP   MES   QMS   HCM   REG   TMS
                          six databases

      search-procedures reaches a different place:

          agent/tool/search-procedures ──▶ the document index (mrd_kb)
                                           the SOP text itself
```

**So `tools/` is not "the human-readable half".** It is not readable by anyone —
it returns data, and nothing in it prints. The two doors are what make it
readable, each in its own way:

| | `cli/` | `agent/tool/` |
|---|---|---|
| who is on the other side | a person | a model |
| what it adds | colours, alignment, headings | a name, a description, argument checking |
| bad input | you retype it | comes back as a sentence the model can act on |
| what it must never do | contain SQL | perform the walk itself |

`assessRelease()` is called by exactly two files: `cli/release-report.ts` and
`agent/tool/assess-release.tool.ts`. That is the whole reason the CLI and the
assistant can never disagree — there is no second copy of the answer to drift.

**`ask.ts` is the odd one and worth naming.** It is a CLI, so it lives in
`cli/`, but what it drives is the model loop — so it reaches *across* into
`agent/`. That is the only arrow that crosses, and it goes one way: a command
line may start an agent; an agent may never print.

## 6. Where it stands, and what is left

Seven questions, five runs each — thirty-five model calls:

```
first run    27/35   3 of 7 questions green   4 unreliable
after fixes  34/35   6 of 7 questions green   1 unreliable
```

The three fixes between those runs were **all ours, not the model's**. The tool
was handing over citations without the dates the contract demanded. The dossier
reported only what was *wrong* and never what was *checked*, so a question about
a 2024 decision got answered from a 2026 procedure. And the instructions never
said whether a minor concern was worth escalating.

One genuine model failure in thirty-five: it said a batch "may be released",
which is the single sentence this system must never produce. The guard caught
it.

A question costs about half a cent; the whole suite about forty cents.

### The second question, 2026-09-12

Everything up to here answers **"can this one batch be sold?"**. The second
question is a different kind of question:

> *A supplier we've bought from for eight years has just been disqualified —
> their audit found they'd quietly changed how they make the chemical and their
> impurity data was incomplete. What did we already make with their material,
> and where is it now?*

Today somebody answers that by opening four systems and copying codes between
them, over about a day. And you cannot wait a day, because the answer decides
whether you are quarantining a pallet or telephoning a hospital.

`pnpm db:supplier-impact SUP-04` now prints it. For Silverbrook: **23 batches,
3.8 million units**, of amoxicillin, metformin, loratadine and ibuprofen — sorted
by how far each one got:

- **5 reached a hospital or a pharmacy chain.** Closest to a patient.
- **6 reached a wholesaler.** Out of our hands, but recoverable through them.
- **12 never left our warehouse.** The cheap ones — quarantine them this
  afternoon and nobody outside needs telling.

That ordering *is* the product. Sorted by date or by product name, the urgent
rows are buried among the merely affected.

**It found something nobody asked it for.** A 273 kg delivery from that supplier
arrived a month *after* they were disqualified, and is still marked as usable.
Thirteen more unused deliveries from them are also still marked usable. A
production order could draw on any of them today and nothing would stop it. It
prints above the list, because it is the only thing on the page that can still be
*prevented* rather than cleaned up.

**It does not decide a recall**, in exactly the same way the first question never
says a batch may ship. A recall is a legal decision with a clock, made by people
with names. This produces the list they cannot currently assemble in a day, ranks
it, and stops.

**How we know the 23 are right.** A separate check rebuilds the list *the other
way round* — it asks all 94 batches, one at a time, "did you use this supplier?"
— and compares the two lists. Checking the answer with the same query that
produced it only proves the query is consistent with itself. It also checks the
opposite mistake: a recall list with innocent batches on it gets ignored the
second time, so a false alarm costs more than it looks.

**What it taught us.** The plan predicted the existing code would carry over
untouched. It didn't — everything we'd built looks things up *by batch*, because
the first question started with a batch. This one starts at the other end. Using
the old functions would have meant 94 separate trips to the database to answer
one question, so both files needed a new section running the other way.

Not a mistake, but worth knowing: **code is shaped by the first question that
needed it**, and the second question pays for that. Expect the third to pay too.

### It has a screen now, 2026-09-12

Everything above was a terminal. There is now a web page — `pnpm veresk:dev` —
and it answers the same question the same way, because it calls the *same single
function* the terminal does. That is the whole trick: if the page assembled the
system itself, then adding a tool or changing the wording would make the browser
and the terminal quietly disagree while both looked healthy.

What it shows, in order: **who has to decide**, then **what stands in the way**,
then **what could not be checked**, then the things worth seeing. Nowhere on the
page is there a green tick — there is no "approved" state anywhere in the code,
because the system does not make that decision and a reassuring tick would be it
pretending to.

Three smaller things worth knowing:

- **The cost of each question is on screen**, written as `≤ $0.0096`. The `≤`
  matters: repeated text is billed at a tenth and we do not model it, so the real
  figure is at or below the one shown. A cost that is quietly wrong is worse than
  no cost at all — somebody multiplies it by ten thousand and puts it in a plan.
- **The summary used to be one dense block** of machine prose with identifiers
  buried in it. It is now broken into sentences with the batch numbers, dates and
  procedure revisions picked out — *without changing a single word*. The text has
  already passed the rules that say what it may claim; rewriting it on screen
  would put unchecked wording in front of someone.
- **The left margin shows the work as it happens.** Those are real events from
  the system, not a loading animation. When the dot is pulsing, something is
  genuinely open.

### The shared parts moved to a kit, 2026-09-12

The buttons, inputs, icons, the severity colours and the motion now live in one
place — `@fde/uikit` — instead of inside this product. The test of whether that
was real: **nothing about how a control looks had to be written twice.**

The important design decision is that the kit does not know what the product is
about. It knows how *severe* looks; it does not know what *is* severe. It can
highlight an identifier in a sentence, but it is handed the rules for what an
identifier looks like here, because a kit that knows what a batch number is has
stopped being reusable. The colours are named `--ui-…` and can be re-pointed, so
the light, paper-styled insurance screen next door could adopt the same
components without a single one of them changing.

Honest caveat: **only one product uses it today.** The usual rule in this project
is to wait for the second user before sharing code, because code written for one
user quietly assumes that user. This is a deliberate exception.

### A tidy-up, 2026-09-12

Between building things, we read every file in the package and asked a narrower
question: **which of this code is really about medicines, and which is just
plumbing that any customer would need?** The answer is written up in
[`EXTRACTION.md`](EXTRACTION.md). Four small things changed:

- A function that hides passwords before printing them existed **twice** — once
  in the shared toolkit, once copied here, character for character. The copy is
  gone. That matters more than it sounds: a password did reach a terminal in this
  project, from exactly that kind of drifting one-liner.
- "What day was this?" had **six** separate implementations, which disagreed
  about what an empty date means. Three of them now call the one good version.
  This is the helper whose absence once made a check report twenty-four problems
  where there were two.
- Two different checks were both called `guard:check` and meant unrelated things.
  The one here — *can the answer path write to the customer's records?* — is now
  `sql:check`. It had also been **missing from the list of checks we run**, which
  is a bad thing for that particular check to be missing from.
- A check we had written by hand already existed, better, in the shared toolkit:
  ours looked only at the top layer and had no way to prove it could fail. We
  deleted ours. That is now the third time this has happened — so the rule below.

And a deliberate **non**-change: the price list is duplicated on purpose. Prices
are a fact about one customer's contract, and sharing them would let one
customer's rate change quietly rewrite another's bill.

**What is left** is kept in [`NEXT.md`](NEXT.md) under **PICK UP HERE**, written
so it can be resumed cold:

1. ~~Two gates that were promised and never built~~ — **done.** The system is now
   *checked* to be unable to write to the customer's records, and *checked* not
   to send transcripts to a third party. Both were already true; nothing had
   ever proved it. Building the first one immediately caught two things that
   were not writes at all and one that was — a real write, planted on purpose,
   to confirm the alarm works.
2. **A second question, for a different person.** *"This supplier was
   disqualified — which batches are affected, and what happens to each?"* A
   different shape: one supplier fans out to many lots, and the answer is a work
   list rather than a decision. It is the only claim this build makes that has
   not been tested — that the second question is far cheaper than the first.
3. ~~A list of smaller known gaps~~ — **most are closed.** Two worth naming:

   - The tool now notices when a truck's temperature logger **stopped
     recording** — not a bad reading, an absence of readings. "We have no data
     for those two hours" is not "it was fine for those two hours", and the
     second cannot be inferred from the first.
   - It now checks whether the person who signed was *permitted* to sign, not
     only whether their training was current. Those are different things, and
     only the second was being checked. **It immediately found two batches
     certified by someone months before she was granted the authority to do
     it** — real, and previously invisible.

   What is left is written down with the reason, including one that turned out
   bigger than it looked: adding the UK means editing the data generator, which
   would shift every random value in the estate and invalidate the worked
   example's numbers.

## 6b. The day the measurements arrived — 2026-09-12

Four things changed, and the thread through all of them is the same: **replace a
belief with a number, or say out loud that you do not have one.**

### Search quality stopped being an opinion

The only evidence that document search worked was one query somebody typed once
and liked, written up as a paragraph. **A paragraph cannot get worse.** If search
quietly degraded nothing would have noticed, because the model often reaches the
right answer anyway — on a small set of documents a mediocre top-five still
contains the right passage often enough.

There is now a score. Eight labelled questions, each with the clause it must
find: **8/8, and it costs a fraction of a penny to re-run.**

A label names a REVISION and a CLAUSE, never a clause alone. Revision 6's §7.3
is about filing records; revision 7's §7.3 is the training rule that invalidates
a certification. A label of "§7.3" would score finding the wrong document as
success.

### Two procedures existed as titles with no text

`SOP-SCM-004` — what to do when a supplier is disqualified — was a row in a
database with a name and a date and **no words**. So was `SOP-QC-003`, the
out-of-specification investigation procedure.

The assistant would have described what those rules require **without ever
having read them**. That already happened once, earlier: it described a clause
correctly by inference, and the note in the record says it best — *the inference
was right, it was still a guess, and no test can tell a lucky guess from a
quotation.*

The second one was found BY the eval rather than by us. Two runs failed, and
both said why in their own words: *"SOP-QC-003 is not available in the procedure
corpus... a human must verify."* The assistant had read the release procedure,
seen it require an investigation under a rule it could not open, and refused to
confirm compliance with something it had never read. **Silence in the records is
not permission** — the rule being followed, not broken.

Writing both procedures took that case from 3-out-of-5 to **5-out-of-5**.

Both were written in TWO revisions, not just the current one. The newer revision
of `SOP-QC-003` adds a prohibition the older one lacks. With only the new one on
file, a question about a 2024 result would find it and apply a 2025 rule
backwards — which is exactly the error another test case exists to catch.

### The cost figures were 25% too high, and nobody knew by how much

The provider charges a tenth for the repeated opening of each request — the same
instructions and tool definitions sent every time. It had been doing that all
along and billing the discount. **Our own numbers just did not know.**

Measured: **83% of input was coming from cache.** Every cost printed before that
day was overstated by about a quarter.

The useful finding was not "it is cheaper." It is that **output is now 91% of
the bill.** Shortening the instructions is worth almost nothing; how much the
model WRITES is nearly the whole cost. Nobody could have known that while input
looked like a third of the spend.

We also checked whether it was worth remembering answers to avoid paying twice —
**8 questions asked, 1 repeat.** Not enough to build on. Written down as a
decision with a trigger to re-check, rather than left as an open question.

### The fake company can no longer change by accident

The whole fake estate is generated from one list of random numbers. Anything new
that takes a number shifts everything after it — different batch codes, dates,
test results — and **nothing detected that.** Every eval score would silently
start describing a different company.

Proved by adding one line that draws a single number: **seventeen tables moved.**

There is now an alarm that fingerprints all 48 tables and reports which one
moved. It made a refactor possible that nobody had dared attempt: the largest
function in the codebase could finally be split, because a byte-identical
fingerprint proves nothing shifted.

---

## 6c. Many small assistants instead of one — and what it cost

The supplier question produces a work list of 23 affected batches. Until now one
assistant read all 23 and wrote the whole thing. The alternative: **23 small
assistants, one per batch, each seeing only its own — then one more that reads
all 23 and writes the part none of them could.**

An "agent" here is not a special kind of object. It is the same loop, with its
own instructions and its own answer shape. **What makes it a sub-agent is only
that something other than a human called it.**

### The measurement

| | 23 small ones | one big one |
|---|---|---|
| time | **50s** | 82s |
| cost | $0.0398 | ~$0.008 |
| words written | 17,819 | 10,354 |

**Faster and five times dearer.** And the cost is not the overhead of splitting —
it is that 23 assistants writing one row each are each more thorough than one
assistant writing its twenty-third row.

**The trade, visible both ways.** Individual rows are markedly better: each names
the hospital, the shipment number, the exact quantity. But four different
spellings of the same escalation owner appeared across the 23, because no
assistant can see what the others wrote. **Working alone buys depth and costs
consistency.**

And one result nobody predicted: **the summariser got WORSE as the list got
longer.** With 4 batches it noticed that several went to the same hospital —
exactly the cross-batch pattern it exists to find. With 23, four went to that
hospital and it did not mention it. The one participant whose job is to see
across everything sees less well when there is more to see.

### Two assistants arguing

For the batches where the procedure genuinely does not give an answer — it
reached patients, nobody can prove harm, nobody can rule it out — two assistants
argue opposite sides and a third writes it up for the Qualified Person.

**The write-up is a question, not an answer.** There is a rule that rejects it if
it does not end in a question mark, because the one thing this system must never
do is decide a recall.

It took four attempts to make them genuinely disagree, and the reason is the
most useful thing on this page: **they had been given different questions.** One
argued about the evidence, the other about what to do. The evidence claim was
simply TRUE — nobody tested for an impurity nobody knew to look for — so an
honest assistant conceded it every time.

That looked like a weak model for three runs. It was a design error being
measured as a model failure. Once both sides argued the same question — protect
first and test after, or test first and act on the result — neither could win by
conceding, and the disagreement became real.

## 6d. Four times the test was wrong, not the model

This already had its own rule (see §8). It earned it four more times in one day,
and the last one is the one worth remembering.

1. **An invented regulation.** The write-up assistant said a decision was due
   "within 72 hours per company Field Action SOP." No such procedure exists; the
   real rule says five working days. It had been ASKED to cite the rule and given
   no way to read one. **Ask for a citation from a source it cannot reach and it
   will produce a plausible source.**

2. **A safety rule that did not travel.** The system has always forbidden saying
   a recall is warranted. A second route to an answer was built, inherited all
   the machinery, and inherited none of the guarantee. The rule ran on one path
   and not the other.

3. **A measurement watching the wrong field.** The number said the two arguing
   assistants had held their positions. They had — in the field being measured.
   The collapse had moved to the one that was not.

4. **A guard that forbade the right answer.** After fixing (2), the new guard
   rejected: *"Notify the Qualified Person to decide whether to initiate a
   recall"* — which is EXACTLY the behaviour the design exists to produce. It
   matched the words "initiate a recall" without noticing they sat inside "to
   decide whether to."

   That is the worst kind, because it is invisible: a guard that rejects the
   correct answer trains the system away from it, and every red result looks
   like the model misbehaving.

---

## 7. One thing that went wrong, kept in the record

While building the index, a pharma load wrote into the **insurance** database
and deleted 79 rows from it. Nothing was lost — that table is rebuilt from files
committed to the repo, and the index that actually answers insurance questions
was untouched — but it happened because one function call in shared code forgot
to say which database it meant, and because the output said where the documents
came *from* and never where they went.

Three fixes, in that order of importance: the call now says which database; the
command now prints its destination; and a load refuses to delete rows when the
incoming documents and the existing ones share **not one identifier**, which is
exactly what a wrong-database load looks like.

The note in the plan that had said this risk was "resolved" was wrong. It was
written after checking that the function *accepted* a database argument, without
checking whether anyone passed one. A parameter that exists and is never used is
not a fix.

## 8. The rules we keep

- The walk is code. The model's job is the leftover judgement.
- A finding is a value, not a colour in a terminal.
- Every "was this true" question takes a date, and never assumes today.
- Nothing below the command line prints; it returns.
- Bad input to a tool is a message, not a crash.
- The system never says a batch may ship. It prepares the file; a person signs.
- A failing check is a hypothesis, not a verdict. Every one so far has been the
  check's fault.
- Before writing a helper, look for it in the shared toolkit. Three times now the
  version already there knew something ours didn't.
- Shared code needs a **second** user before it moves. Code written for one
  caller quietly assumes that caller, and the next one has to fight it.
- A screen never invents a state the data cannot support. No green tick, no
  "approved" — the page can only show what the answer actually contains.
- Every surface calls the same one function. Two places that assemble the system
  are two systems that will drift apart without telling you.
- Check an answer with a *different* method than the one that produced it.
  Re-running the same query proves only that it is consistent with itself.
- Get the walk right before adding the model. A model on top of a wrong walk is
  a confident wrong answer, and much harder to catch.
- Ask an assistant to cite a rule it cannot read and it will invent one. Either
  give it the text or tell it to report that it has none.
- A new route to an answer inherits the machinery and NOT the guarantees. Every
  safety rule has to be carried across deliberately.
- A guard that rejects the right answer is worse than no guard. Test every one in
  both directions — what it must catch AND what it must let through.
- A measurement that watches one field will be evaded in another. Watch the field
  where giving up is cheapest, not the one where it is most visible.
- Build the alarm before the thing that can set it off. The fake-data guard made
  a refactor possible that had been untouchable for months.
- A sample must never be able to look like the whole. If a list is short, the
  answer says so in its first sentence.
