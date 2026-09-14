# Plan — making the release dossier readable

Status: **steps 1-3 done** (2026-09-12). Step 4 (re-baseline) and the rest of
step 5 (working-notes dedup) open.

Step 3 — `eval:smoke`, 7 cases x 1 run, agents-sdk / gpt-5-mini: 7/7 runs passed,
0 tool failures, every `stoppedBecause` is `model_finished`. All 7 answers
carried `what_would_clear_it` and all 9 findings carried `in_short`. **This is a
smoke test, not a pass rate** — the runner prints that warning itself and it is
not a scorecard number.

**The retry question is answered by proxy, not directly.** `last-run.json` does
not persist `schema_retry` events, so the retry count cannot be read off the
artifact. The usable signal is turns and `stoppedBecause`: the two pre-change
baselines ran 1-7 turns per run and the earlier one recorded `schema_invalid`
stops; the post-change smoke run is 2-3 turns across all seven with no
`schema_invalid` at all. A validation retry costs a turn, so retries did not
rise. Persisting the retry count into the run record would make this measurable
instead of inferable, and is worth doing before step 4.

Landed: `in_short` and `what_would_clear_it` on the contract, the tightened
`summary` description, four new coherence rules, the prompt rules that motivate
both fields, and a repair to a prompt gate that was passing them by ignoring
them. `schema:check` 12/12 (three new negative cases), `prompt:check` 9/9 (one
new check), `checks:check` 34, `severity:check`, `tools:check` 17, `sql:check`
all green; `pnpm typecheck --force` clean across all 20 packages.

**Steps 1 and 2 could not be split, and the plan was wrong to split them.**
`in_short` is a REQUIRED field on `Blocker`. Between the schema landing and the
prompt landing, every live answer would have been missing a required field —
validation failure, retry, on every single request. `schema:check` cannot see
this because it feeds hand-written fixtures that already have the field. A
checkpoint that is green offline and retry-loops the moment it meets a model is
not a checkpoint.

**The prompt gate was a false green, and the fix is not the obvious one.**
`prompt-selftest.ts`'s "every required answer field is reachable from the prompt"
filtered with `k in wanted` against a hardcoded map of five names, so a field
ABSENT from the map was exempt rather than failing. Adding entries to the map
would have fixed today and drifted again on the next field. The filter is now
inverted — an unlisted field is itself the failure, and a field the prompt
genuinely need not motivate is recorded as an explicit `null` rather than an
omission. `ReleaseAnswerSchema.shape` is also TOP-LEVEL ONLY, so `in_short`
(inside `Blocker`) is invisible to that walk however the map is written; it has
its own check. Both were verified to fail on a sabotaged prompt, not just to
pass on the real one.

## The ask

"Everything works but I want a summarize capability to make it more human
readable — maybe hand the result to a model and get something back."

## What I'd do instead, and why

Not a second model pass over the finished dossier.

The reason is not cost or latency, it's the one this repo is built around.
`release-schema.ts` opens by saying the contract has **no field that can say
"release it"** — not a boolean, not an enum, not a verdict. A summariser that
reads the dossier and writes fresh prose is an ungrounded paraphrase of a
paraphrase, validated by nothing, and it is the single most likely place for
"clear the outstanding paperwork and it ships" to appear in the largest type on
the page. `coherenceErrors()` currently guards exactly one prose field
(`summary`, regex on "may be released / may ship"). A second pass would create a
free-text hiding place in a contract whose whole thesis is that there isn't one.

**The readability problem is real, but it is not a missing summary — it is three
things at the same altitude, said three times.** Reading the EU/LOT-IBU200-2609-D
output:

- `escalate.reason`, the counted verdict line, and `summary` all say the same
  thing in three different wordings before any evidence appears.
- `summary` is two dense paragraphs with inline clause numbers — the most
  compressed thing on the page is also the hardest to read.
- SOP-QC-014 Rev 7 §6.1 is quoted **verbatim three times** (once in the
  dissolution blocker, once in the OOS concern, once more in the trace).
- The working notes print the same 3-sentence `search_procedures` explanation
  four times, once per call.

Two of those four are free to fix in the UI. The other two want a structured
field, produced by the **same** model call — so it is schema-checked, retried on
failure, and assertable by an eval, exactly like every other field.

### The field that already wants to exist

From the user's own output, inside `summary`:

> "**What would clear this for QP review:** an approved OOS investigation
> addressing the dissolution failure (SOP-QC-003) and a completed QA disposition
> recorded against the lot for the EU; after those, the Qualified Person
> (DEPT-QA) may perform the certification review…"

The model is already emitting a list of remediation steps and burying it in
prose because the contract gives it nowhere to put them. That is the strongest
evidence for the change and it costs no new reasoning from the model — only a
place to write it down.

## The change

### 1. Two new fields on `ReleaseAnswerSchema` (offline, provable)

`packages/pharma/src/schema/release-schema.ts`

- `what_would_clear_it: string[]` — one short imperative step per entry, the
  thing that must be done and recorded before a QP could review. Array, not a
  nullable string: **an empty array is legal**, so this cannot raise the
  validation-retry rate on a clean lot.
- `in_short: string` on `Blocker` — ≤12 plain words, no clause numbers, so the
  blocker list scans at a glance. Required, because a blocker without one is a
  blocker that can't be skimmed; the model already has the sentence.

Tighten `summary`'s `.describe()` to ask for ≤3 sentences of plain prose and to
say explicitly that the remediation steps now belong in `what_would_clear_it`.

**Deliberately NOT adding a `headline` field.** The verdict line in `Answer.tsx`
is *counted from the structured fields*, never quoted — that's what stops it
drifting from the findings. A model-written headline in the largest type on the
page would undo that on purpose.

**Deliberately NOT banning clause numbers from `summary`.** `checks.ts:84` builds
its search haystack from `summary + why_it_blocks + escalate.reason`; stripping
refs from `summary` risks moving `must_mention`-style checks for no readability
gain worth the re-baseline.

### 2. The coherence rule that has to come with it

The existing "may ship" regex covers `summary` only. Extend `coherenceErrors()`:

- run the same "may be released / may ship" test over `what_would_clear_it`
  entries and `in_short` — every new prose field gets the guard, or the guard
  becomes decorative.
- if `blockers.length > 0`, `what_would_clear_it` must be non-empty. A blocker
  with no stated remedy is the model declining to finish the sentence.

Descriptions are prompt engineering; coherence is enforcement. Without the
second half this is just a nicer-looking hiding place.

### 3. Prompt (`release-prompt.ts`)

`prompt-selftest.ts:101` asserts *every required answer field is reachable from
the prompt* — so this step is not optional, it's a gate that goes red without it.
Add the motivation for both fields, in the prompt's existing voice.

### 4. UI spec — handed off, not edited by me

Another agent is working in `apps/veresk-app` right now, so this half is written
as a spec rather than a diff. Files: `components/Answer.tsx`, `lib/explain.ts`.

- **Dedup citations.** Key on `ref + as_of + detail`. Quote a clause in full the
  first time; afterwards render a compact back-reference ("SOP-QC-014 Rev 7 §6.1
  — quoted above"). Kills the triple §6.1 quote.
- **Collapse evidence.** Each finding shows `in_short` + `why_it_blocks`, with
  the citation block behind a "show the evidence (3)" disclosure, open by default
  only for the first blocker.
- **`what_would_clear_it` as its own block**, directly under the escalation
  panel, as a numbered list. It is the single most actionable thing on the page
  and currently it's a clause in the middle of a paragraph.
- **Collapse the working notes.** Group consecutive identical tool names and
  print `explainCall`'s sentence once for the group, with the four queries listed
  under it.

## Order of work, and what proves each step

1. Schema fields + descriptions + coherence rules →
   `pnpm --filter @meridian/pharma schema:check` and `typecheck`.
   **Fully offline — no Azure, no Postgres.** This is the check-in point.
2. Prompt → `prompt:check`.
3. `pnpm eval:smoke` once. Per CLAUDE.md this is a smoke test, **not a scorecard
   number** — it is being read for "did anything throw", nothing else.
4. Re-baseline with `pnpm eval` only if step 1 moved a check. Run it the same way
   as the 2026-09-05 baseline (same model, fixture mode, repeat count) —
   `eval:diff` exits 2 across a setup change and would be measuring the setup.
5. Hand section 4 to whoever owns `apps/veresk-app`.

## Acceptance

The real criterion is not "the page reads better."

- **Validation retries unchanged and flaky count still 0.** Adding required
  fields to a `strictObject` output is the most likely way to start tripping the
  `RETRY_EXPLANATION` path, and a retry shows up as eval flakiness against a
  baseline of zero.
- Every `*:check` that was green stays green, or is updated in the same step with
  the reason written down.
- No new prose field can carry a release verdict past `coherenceErrors()`.
