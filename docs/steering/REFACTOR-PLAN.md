# Refactor plan — what the measurement says to do, and what it says to leave

*Written 2026-09-14, after scanning `@fde/agent`, `@meridian/pharma` and
`@vantis/steering`. Every number below is measured, not estimated — the
similarity figures come from a line-level diff of each parallel file pair.*

---

## The headline

The brief was *"extract everything which can be generic."* **The measurement
says most of it isn't.** Of 16 identically-named file pairs across pharma and
steering, 11 are genuinely different code doing different jobs, and only 5 share
a skeleton. Extracting the 11 would produce a shared abstraction over things
that are not the same — the failure mode where a package grows a parameter per
caller and nobody can read any of it.

So this plan does four specific things and explicitly declines a fifth.

---

## Part A · Finish the engine split — mechanical, 1 of 3 done

`mastra/` is split and green (`dba714d`). Same treatment for the other two.

| Engine | Now | After |
|---|---|---|
| `sdk/loop-sdk.ts` | 364 | `provider.ts` ~95 · `tools.ts` ~45 · `turns.ts` ~75 · `loop.ts` ~150 |
| `langgraph/loop-langgraph.ts` | 320 | `provider.ts` ~110 · `tools.ts` ~45 · `turns.ts` ~50 · `loop.ts` ~120 |

Proven on Mastra: header notes move to the file they explain, `index.ts`
re-exports the same names so no consumer changes, `turns.ts` stays per-engine on
purpose. **Risk: low.** Verified by typecheck + the three compliance checks +
`provider:check` + `settle:check`.

---

## Part B · The one extraction with a correctness argument behind it

**Three independent implementations of the same source scanner**, none aware of
the others:

| | strips comments | plants a control | walks src |
|---|---|---|---|
| `pharma/src/guard/sql-write-selftest.ts` (350 lines) | ✓ | ✓ | ✓ |
| `steering/src/guard/sql-write-selftest.ts` (273) | ✓ | ✓ | ✓ |
| `scripts/leak-check.mjs` | ✓ | ✓ | ✓ |

All three do: walk `src/` → strip comments and string literals → match forbidden
patterns → plant a synthetic violation → assert the scan catches its own plant.

**Why this one is not a tidiness argument.** `leak-check.mjs`'s own history
records it passing clean while silently stripping a real leaked credential URL,
having mistaken `postgresql://…` for a trailing comment. That is a bug in
*comment stripping* — and there are three separate copies of comment stripping,
so that bug class can exist independently in each, and being fixed in one says
nothing about the others.

**Shape:** `@fde/scanner` — walk, strip, match, plant, report. The forbidden
patterns, the scanned paths and the exempt paths stay in the caller, because
they are the domain. Same split as `@fde/grounding`: the machinery is shared,
the descriptor is passed in.

**Risk: medium.** These are the checks that prove other checks work, so the
extraction must keep every existing assertion passing, and each caller's
negative control must still fire.

---

## Part C · Two convergences — no new abstraction, just use what exists

**C1. `pharma/src/eval/run.ts` does not use `@fde/evals`.** Steering's does
(`runEvalCli`, `EvalCase`). Pharma reimplements `main()` itself. One engagement
uses the shared runner; the other has a copy. **Risk: low-medium** — it is the
eval runner, so a baseline should be recorded before and after.

**C2. `db/init/{create,drop,migrate}.ts` are 53–67 % identical** across pharma
and steering — the genuine shared skeleton the scan found. ~160 lines each side,
converging to one helper plus two descriptors. **Risk: low**, and offline.

---

## Part D · What NOT to touch, and why the scan changed my mind

**`@fde/guard` is not duplicated.** It is an HTTP API-key guard. The engagements'
`guard/` folders are source scanners — a different concern entirely, and *both
files already open with a paragraph explaining why they are not `@fde/guard`.*
The "1 import each" in the usage table is those comments, not an import.

**The 11 genuinely-different pairs.** Measured identity, worst first:

```
db/init/check.ts               3%     eval/severity/severity-selftest.ts   6%
eval/checks/checks-selftest.ts 7%     guard/sql-write-selftest.ts          8%
eval/run.ts                   11%     db/schema/rows.ts                   17%
config/connections.ts         25%     tools/utils/handle.ts               25%
grounding/embeddings.factory  37%     telemetry/prices.ts                 37%
db/seed/world-check.ts        37%
```

Same filename, same job title, different work. `db/schema/rows.ts` is 638 lines
of pharma's world and 468 of steering's — they are *supposed* to differ; that is
the domain. Sharing them would mean one file that knows about both batches and
bids, which is exactly what `leak:check` exists to prevent.

---

## Part E · Deliberately not proposed: rewriting the two engagements

Pharma is 16,542 lines and steering is 20,067. "Make everything understandable
and pluggable" across 36k lines is not a refactor, it is a rewrite of two
working systems that currently pass every check they have. The parts that
*genuinely* repeat are Parts B and C above; the rest is domain judgment, which is
the thing the whole architecture is built to keep un-shared.

If specific files are hard to read, name them and they get the Part A treatment
individually — that is cheap and safe. The top candidates by size alone:

```
pharma/src/db/seed/world.ts              855
steering/src/db/init/assertions.ts       721
pharma/src/agent/loop/lot-debate.ts      685
steering/src/db/seed/requirements.ts     650
pharma/src/db/init/check.ts              642
```

---

## Suggested order

1. **Part A** — finish the engine split. Mechanical, proven, low risk.
2. **Part C2** — `db/init/*`, the small measured skeleton. Offline, low risk.
3. **Part B** — `@fde/scanner`. The one with a real bug class behind it.
4. **Part C1** — pharma onto `@fde/evals`. Record a baseline first.

Parts A and C2 are safe to do back to back. B and C1 each deserve their own
commit and their own verification pass.
