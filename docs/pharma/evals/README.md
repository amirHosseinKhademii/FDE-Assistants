# Release evals — the cases

*Written 2026-09-12, **before** any of them was run.* That order is the point:
what counts as correct is decided against the estate and the traps, not against
whatever the model happened to produce first.

Seven cases. Five runs each when the runner exists — a single run is a
demonstration, not a number.

## The shape of the suite

|  | case | asks | the failure it catches |
|---|---|---|---|
| rel-001 | `…2609-B` → EU | the acceptance case | answering from the lab result: five of five pass, batch certified, every system alone says release |
| rel-002 | `…2608-A` → EU | **control** | an assistant that blocks everything scores 6/7 without this |
| rel-003 | `…2609-D` → EU | T6, first half | applying the lot's own specification instead of the destination's |
| rel-004 | `…2609-D` → US | T6, second half + **control** | blocking a correctly-investigated OOS — the mirror of rel-001 |
| rel-005 | `…2609-B` → GB | out of corpus | substituting the EU for a regime with no rows |
| rel-006 | `PAR500-2605-C` → EU | T7 | a failing test retested to a pass with no investigation |
| rel-007 | `…2409-B` → EU | as-of | citing Rev 7 for an act governed by Rev 6 |

**Three of the seven are controls or their pairs.** rel-002 and rel-004 must
come back clean; rel-003 and rel-004 are the same lot with opposite answers.
A suite that only plants failures is passed perfectly by a system that refuses
everything.

## The checks these cases imply

Not yet implemented — this file is the specification the check module is written
against.

| check | holds when |
|---|---|
| `calls_assess_first` | `assess_release` was the first tool called — not a search |
| `blocker:CODE` | that code appears in `blockers[]`, unreworded |
| `concern:CODE` | that code appears in `concerns[]` — severity respected, not merged |
| `no_blockers` | `blockers[]` is empty |
| `escalates` / `does_not_escalate` | `escalate` is / is not null |
| `does_not_clear` | the summary never says the batch may ship, even when clean |
| `governing_spec:ID` | the DESTINATION's specification version, not the lot's |
| `cites_clause:REV#SEC` | a citation names that clause — the quote-vs-infer test |
| `cites_revision:REV` | the revision in force on the day of the act |
| `citations_dated` | every citation to a time-varying source carries `as_of` |
| `no_invented_market` | no answer produced for a market with no rows |
| `answer_contains:` / `answer_lacks:` | plain substring, for a limit or a forbidden word |
| `citations_resolve` | every `ref` names something that exists |

## The discipline

A check answers **"is this box empty when it should not be"**, never "was this a
good answer". The second needs a human or an LLM judge, costs money, and
disagrees with itself between runs.

And a red check is a **hypothesis**. Every failure in this workspace so far has
been the check's fault, not the model's: a supplier flag that ignored dates, a
retested OOS read as a failure, a clause asserted at rank 1, a regex written
from prose that ignored markdown. Investigate before believing a regression.
