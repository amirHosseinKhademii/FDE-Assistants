# How we sorted the data — in plain words

*No jargon. If a sentence here needs a definition, that's a bug in this file.
The engineering version is [`SORTING.md`](SORTING.md).*

---

## The situation

Vantis Steering has **1,069 files**. Specifications, half-filled trace
matrices, timesheet exports, project closure reports written months late,
quotations, rate cards, and eight folders of source code.

When a car maker sends a new requirement — *"we need 8,000 newtons of rack
force and no more than 0.5 N·m of hysteresis"* — four questions have to be
answered before anyone can quote:

1. What do we already have that does this?
2. What nearly does it, and how big is the change?
3. What doesn't exist at all?
4. What do we charge?

Today, people answer those by searching the files by hand, judging from what
they remember, and meeting a couple of times. There is no system. **That is the
bottleneck, and the files are the only raw material there is.**

## What "sorting" means here

It means turning files into things you can ask questions of.

A file can be read. It cannot be counted, filtered, or compared. You cannot ask
909 timesheet rows *"how many hours went into gearbox changes"* by reading them,
and nobody has time to try.

So the job is to get the facts out of the files and into a database — **without
inventing anything that wasn't there.** That second half is the whole
difficulty, and everything below exists to protect it.

## The files come in three kinds, so we built three pipelines

They are not three steps of one process. They are three different problems that
happen to live in the same folder.

### 1 · Files that already have columns → just read them

Timesheets, rate cards, estimates. These are spreadsheets exported to text.
A piece of code reads them and writes rows. **No AI involved.** If it fails, it
fails loudly and it's a bug we fix — it cannot quietly produce a wrong answer.

This is free and exact, so it goes first, and everything riskier gets checked
against it afterwards.

### 2 · Files that are prose → cut them into findable pieces

Design rationale, review notes, the source code itself. You can't turn a
paragraph into a column, so instead it gets cut into pieces small enough to
search and each piece remembers which file and which line it came from.

**Done for the documents: 702 of them, cut into 2,827 pieces.** Not done for the
source code — 220 files of it — and that is not a small remainder. Code has to be
cut by function rather than by heading, and the settings each function depends on
are written once at the top of the file — so a naive cut gives you functions with
no settings, and a settings table belonging to nobody.

And nothing searches the pieces yet. They are stored and unqueried.

### 3 · Facts hiding inside sentences → have a model read them

This is the hard one. A closure report says:

> The existing hardware was modified. The work was on the gearbox. The existing
> safety case remained valid and was not reopened.

To compare that job with a new one, you need it as: *change = modify hardware,
part = gearbox, safety case = no*. Those aren't fields anywhere. Somebody — or
something — has to read English and decide.

**This is the only pipeline that can be quietly wrong**, which is why it is last
and why it has more safeguards than the other two put together.

## The safeguards, and why each one exists

### Every fact has to quote the sentence it came from

When the model says "the safety case was not reopened", it must also give the
exact sentence. Then we **search the file for that sentence.** If it isn't
there, the fact is thrown away.

Why it matters: this catches a made-up answer using nothing but string search.
No second AI, no human review, no list of right answers. It works at any
customer on day one.

*What it found:* in 1,421 facts, **nothing was made up.** Six quotes failed the
check and all six were the same dash character getting mangled in transit. The
values were right.

### Silence is not "no"

If a report never mentions tooling, the answer is **"the document doesn't say"**
— not "no tooling". Those are different, and a database that confuses them will
tell you with total confidence that no tooling was needed on 172 jobs nobody
ever wrote about.

### It is allowed to refuse, and refusing is a good answer

Roughly four in ten questions came back as *"the document doesn't say."* That's
not the system failing. Those documents genuinely don't say.

### We can tell a good refusal from a lazy one — without an answer key

This is the part worth understanding, because it's the part that works at a real
customer.

For each field, ask: **how often did it answer at all?**

- `change_class` — answered 100% of the time. Every report states it.
- `asil` (the safety level) — answered 2%. Almost no report states it.
- `reuse_class` — answered **37%.**

The first two are healthy: the system knows whether it can read a field. The
third is the warning sign. **A field answered a third of the time, on documents
that all look the same, is a field being guessed at.** And it was: `reuse_class`
has three possible values, so random guessing scores 33%, and it scored 36%.

Nobody needed a list of right answers to see that. You can see it from the
answers alone.

A second signal agreed: `reuse_class` kept quoting a sentence that had *already
been used* for a different field — which is exactly what it looks like when
something infers one fact from another instead of reading it.

## What we actually learned about Vantis

These are the findings. They matter more than the software.

**Only a third of their work has a closure report.** 220 of 640 jobs. And the
closure report is the only document that carries the charge code — the only link
between a week of somebody's time and a piece of engineering. So **293,019 hours
of booked time belong to work that no document names.** That is a hard ceiling
on anything built from their files, and it's better to know it now than in front
of the customer.

**They never write the safety level next to the cost.** Not once in 220 reports
in a usable form. So "what does an ASIL D safety case cost" — a €200,000
question — cannot be answered from their documents at all.

**They can't trace a quoted line back to the requirement it priced.** That link
exists in neither the files nor their databases.

## What it costs to be honest

We ran the cost question twice: once against the tidy data we'd made up, and
once against only what the files support.

| question | made-up data | from the real files |
|---|---|---|
| gearbox change | €80,034 | **€79,640** |
| damping safety case | €202,853 | **refused — no basis** |
| brand-new safety function | refused | refused |

The gearbox answer survives, half a percent out. The €202,853 answer becomes a
refusal, because of the missing safety level.

**We checked whether the refusal could be avoided.** Drop the safety-level
filter, price all safety-case work, add a footnote saying the level is unknown.
That gives **451 hours instead of 1,571** — wrong by three and a half times,
presented as an answer. A footnote does not rescue a number that is a quarter of
the truth. So the refusal stays, and there is now a test that goes red if
anybody "improves" it later.

## The one-sentence version

Sorting the files turned three of Vantis's cost questions into one confident
answer, one honest refusal, and a precise list of the four things they'd have to
start writing down to get the rest — which is more than they have today, when
the answer is whatever came out of the meeting.
