# Where the bid stands — the summary, in plain words

*Written 2026-09-13, when the summary agent was built. It is the smallest agent
in the package and the easiest one to get quietly wrong, which is why it has
the longest explanation.*

---

## The problem it solves

A bid is 24 requirements. Each one gets its own assessment — a finding, the
sentences it rests on, what it cost when we did work like it before, and the
questions a person has to answer.

Twenty-four of those is not an answer to *"where does the bid stand?"*. Nobody
reads twenty-four dossiers before a meeting, and the thing the meeting needs is
not in any single one of them:

- how much of the bid is understood, and how much has not been looked at
- **what the refusals have in common.** Six requirements unpriced for want of
  the same missing test report is **one** finding, not six
- which questions **repeat**. The same question asked on five requirements is a
  meeting, not five tickets
- the total so far, and honestly — what is priced, what is not, and the fact
  that it is not a quote

## The rule that shapes everything

**It reads the assessments. It never reads the documents.**

It has no search tool and no history tool. It physically cannot go back to the
corpus, and that is the design rather than a limitation: a summariser that
re-reads the files is a *second assessment made with less evidence*. If an
assessment concluded `cannot_tell`, the summary says `cannot_tell`. It is not
allowed a second opinion.

## Which half is a model, and which half is arithmetic

This is the part worth understanding, because it is the whole safety argument.

| | who does it | why |
|---|---|---|
| how many of the 24 are assessed | **code** | counting |
| the finding mix | **code** | counting stored strings |
| the total, the hours, the past jobs behind them | **code** | adding up |
| which requirements are unpriced, and their stated reasons | **code** | reading a field |
| what the refusals have in common | **the model** | that is reading, not counting |
| which questions repeat | **the model** | same |
| the headline sentence | **the model** | same |

The two rules the design had to guarantee were *never re-decide a finding* and
*never total a refusal into a number*. Both could have been written into the
prompt — and a prompt is a request. Written in code they are properties:

- the answer contract for the summary **has no field** for a finding, a count
  or a total. A model that cannot represent a total cannot produce a wrong one
- the total is a sum over a list that a refusal is never added to, because the
  filter runs before the addition

## What it refuses to do

- **It will not price a refusal at zero.** Two priced items and one refusal
  reads "two items, EUR X, one unpriced" — never a single figure with the gap
  smoothed over.
- **It will not lose a refusal.** It may group them; if a requirement is
  unpriced and appears in no group, the summary is rejected.
- **It will not name a requirement that was not assessed.** Every reference it
  writes is checked against what was actually filed. This is the fabrication
  that reads perfectly and it is the one failure mode of any summariser.
- **It will not put a money figure in prose.** The total is printed with its
  evidence count and its "this is not a quote" sentence attached, every time.
- **It will not contradict the counts printed beside it.** A number used as a
  count in the headline must be a number the roll-up actually made.

## The parts of the history it does not throw away

The assessment log is a log: assess the same requirement three times and it
holds three rows. Four kinds of row are separated rather than filtered, and
each one is reported:

| | what it means |
|---|---|
| **answered** | the newest answered run for a requirement — this is the answer |
| **superseded** | an older run that a newer one replaced. Counted, not counted twice |
| **failed** | a run that spent tokens and produced nothing. Still shown |
| **typed** | somebody typed a requirement rather than picking one. Real, but not one of the programme's 24 |
| **unreadable** | a row whose stored answer this code does not understand. Named, never coerced |

A finding mix over *rows* would count a requirement you re-ran three times,
three times over. That is the bug this separation exists to prevent, and the
self-test asserts it.

## What it cost, measured

Two numbers, and the second is the one that matters.

**Dossier to line: 4,710 characters became 1,992 — 2.4×.** `CONCEPTS.md`
predicted 28×, and that was optimistic: it assumed a resolved requirement
becomes a one-line triage entry. In practice the line keeps the stated refusal
reason and every question for a human, because those are exactly what the
summariser has to read to do its two jobs.

**Tokens, from `logs/requests.jsonl`, first real run of each:**

| | input tokens | output | time |
|---|---|---|---|
| one requirement assessed | **188,115** | 5,447 | 64 s |
| the whole bid summarised | **3,159** | 2,423 | 26 s |

**Sixty times less input for a page about the whole bid than for one
requirement.** That is the real answer, and the character ratio understates it
badly — because an assessment's cost is not its dossier, it is the twenty
retrieved passages and eight tool results it re-sent on every one of its eight
turns. The summary has no tools, so it sends its material once.

That is what `isolate` buys, and it is only visible in tokens.

## What running it found

Both paid runs produced a usable page AND a defect. Five in total — three from
the first run, two from the second — and every one of them ours. That is this
repo's pattern rather than an accident: the interesting failures are in the
scaffolding, not in the model. Two of the five could only be seen in
`logs/requests.jsonl`, which is the argument for having it.

### What the first real run caught

Three defects, all found by running it once and reading the telemetry rather
than the screen:

- **it failed its contract once and repaired it, and the CLI did not say so.**
  Visible only in `logs/requests.jsonl` as `schemaRetries: 1`. Retries are now
  printed even when the answer arrived — how often the contract is missed is a
  number you need, and a retry that succeeded is the easiest one to lose
- **the turn cap was exactly consumed.** Two turns: one answer, one repair. A
  second retry from any cause would have ended a paid run with no output. Three
  now
- **a 300-character limit cut a sentence in half**, mid-phrase, at the boundary:
  "...supplier production field-return statistics from an agreed". The field
  asks what would settle a refusal, and the honest version of that names a
  document, a route and who signs it. 500 now

### And what the second real run caught — a guard firing on the truth

Six requirements, four themes, five repeated questions: the output §4 asked for.
It also failed its contract once, and the reason was **ours**:

> commits on behalf of the company: "All six assessed items were judged
> change_needed but remain unpriced because ess…"

Nothing in that sentence commits to anything. Two separate defects were hiding
behind it:

**The message quoted the first 80 characters of the field, not the phrase that
matched.** The real match was further along. An error that does not point at
what it objected to trains the reader to assume the guard is wrong — sometimes
it is, but that has to be a finding rather than a default. Objections now quote
the match with 25 characters either side.

**And the guard was wrong.** `deliver(y|ed) (in|by)` was written for a schedule
promise — "delivery in Q3", "delivered by March". It also caught **"delivered by
the customer"**, which is the opposite of a commitment: it names whose job the
missing evidence is. Every refusal waiting on somebody else says some version of
it, so this guard was firing on the most common honest sentence on a blocked
bid.

The deliver family now requires a **date**. A date is what makes a delivery
statement a promise; a named party is what makes it an assignment. Ten dangerous
phrasings are asserted still caught, and four honest ones asserted to pass.

What is given up, plainly: a dateless "the rig will be ready" no longer fires.
That is accepted for the reason `scripts/leak-check.mjs` states in its own
header — **a banned phrase must be one that cannot appear innocently.** This was
the second paid run this one pattern had ended on a truthful sentence, and a
guard that keeps doing that is one everybody learns to write around.

---

## Running it

```bash
# free — every count, no model at all
pnpm steering:summarise --dry-run

# the same, plus the written half. one model call, a fraction of a cent
pnpm steering:summarise

# the contract and the arithmetic, offline, no database
pnpm steering:summary-check
```

On the web desk it is the **"Where the bid stands"** panel: the counts load with
the page and cost nothing, and the button buys the two written parts. The button
says so.

## Where it lives

| | |
|---|---|
| reading the log | `packages/steering/src/answer/filed-assessments.ts` |
| the arithmetic | `packages/steering/src/agent/summary/roll-up.ts` |
| a dossier → one line | `packages/steering/src/agent/summary/lines.ts` |
| what we ask the model | `packages/steering/src/agent/prompt/summarise-bid.ts` |
| the answer contract | `packages/steering/src/schema/bid-summary-schema.ts` |
| the call | `packages/steering/src/agent/loop/summarise-bid.ts` |
| the page | `apps/steering-app/src/components/BidState.tsx`, `/api/summary` |
