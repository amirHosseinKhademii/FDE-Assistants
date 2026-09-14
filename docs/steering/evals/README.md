# Eval cases — requirement assessment

Three cases. Each one is anchored to something PLANTED in the estate, not to a
question that happened to look interesting, and each note says which trap and
what a wrong answer would cost.

| case | requirement | what it is for |
|---|---|---|
| `asr-001` | CR-K2-0101 | **the acceptance case.** 8000 N claimed by analysis, 7600 N demonstrated on a rig. Reading the capability row alone gives *"carryover, no cost"* and is wrong by a redesign. |
| `asr-002` | CR-K2-0104 | on-centre hysteresis, whose budget does not close — 1.2 + 0.2 against a 0.5 N·m target, marked known-open. |
| `asr-003` | CR-K2-0102 | road-wheel angle, where the best-performing part is obsolete and cannot be ordered. |

## What is deliberately NOT checked

**`asr-002` does not pin a finding.** What a correct assessment *says* about a
budget that does not close is genuinely unsettled — it could be
`change_needed`, it could be `cannot_tell` pending a decision on the
apportionment. Pinning it would freeze one engineer's opinion as a test and
fail every future improvement that disagreed. It asserts only that the answer
priced or refused rather than trailing off.

**No case pins the prose.** Wording is not the deliverable; the boxes are.

**No case pins a euro figure.** The comparable set shifts whenever the estate is
re-seeded, and a test that breaks on a re-seed gets muted.

## The rule these were written under

A red check is a hypothesis about the CHECK first and the model second. This
repo's history is three separate occasions where the check was wrong — twice in
this suite's own neighbourhood, within the day it was written.

## Running

```bash
pnpm steering:eval              # every case, repeated
pnpm steering:eval --only asr-001
pnpm steering:eval:smoke        # one run each — a smoke test, NOT a scorecard
```

---

## First full run — 2026-09-13

```
runs passed               : 9/15
false answers (dangerous) : 0 of 15
over-caution (annoying)   : 0 of 15
no answer (infra/budget)  : 6 of 15   — every one a 429 rate limit
tokens                    : 918,288 in / 41,983 out
```

**Every run that produced an answer passed. Nine of nine.** All six failures
were the deployment refusing the call, not the model getting anything wrong.

### This is the argument for severity buckets, demonstrated

Read as a pass rate, that run says *"60%, the model is unreliable."* Read by
bucket it says *"9 of 9 correct, the harness hit a rate limit six times."* Same
fifteen runs, opposite conclusions, and only one of them is true.

A suite that cannot separate a wrong answer from a refused connection is
worthless in both directions: it hides real regressions behind infrastructure
noise, and it reports infrastructure noise as a regression.

### The cause, and the fix

~100,000 input tokens per run — a multi-turn loop re-sends its whole context
every turn — fired back to back, is roughly 300,000 tokens a minute.

`EVAL_PACE_MS`, default 20 s, waits between runs. Paced AFTER each run so the
first starts immediately, and outside the measured time: `ms` comes from the
loop's own clock. Set `EVAL_PACE_MS=0` on a deployment with room.

### One thing the summary gets wrong, and it is not fixed yet

It reports all three cases as **flaky**. They are not flaky — they are
**unmeasured**. A case whose every failure is `no_answer` has not been sampled
five times; it has been sampled two or three times and interrupted twice.

"Flaky" is a claim about the model's consistency. It should not be made from
runs where the model was never reached. Distinguishing "flaky" from "not fully
measured" belongs in `@fde/evals`, on the second occurrence — and this is the
first.
