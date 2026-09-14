# Extraction plan — what leaves `@meridian/pharma`, what stays

Written 2026-09-12, after a file-by-file scan of all 8458 lines of
`packages/pharma/src`. Companion to `ARCHITECTURE.md` (the layout and its
rules) and `NEXT.md` (the dated build record).

This document exists because the same question keeps coming up in different
clothes: *this code doesn't mention a drug — should it be in a package?*

---

## `@fde/uikit`'s newest six went in on ONE caller, at the user's direction

*Added 2026-09-13.* `FlowMap`, `Tile`, `OriginDialog`, `FieldList`, `DetailCard`,
`Figures` and the `useCountUp` ramp were extracted from the landing page's two
new sections **with a single consumer**, because the user asked for them to be
reusable before a second page exists. That is the exact thing this document's
rule exists to prevent, so it is recorded rather than blurred: do not read
`packages/uikit/src/index.ts`'s "extracted on a measured second occurrence" note
— which is true of `createStore` — as covering these.

**What to check when a second surface adopts them.** The mitigation the package
claims is token indirection: every component reads only `--ui-*` plus a
caller-supplied `--ui-tone`. That is believed of all seven and PROVEN of none.
`FlowMap` is the one to watch — it hard-codes a `perspective` value and assumes
a dark surface in the contrast of `--color-ui-line` against `--color-ui-bg`, so
the light, serif insurance surface is where its assumptions will show.

## The rule this plan is built on

`NEXT.md` §N4 records it: **extract on the second occurrence, not the first.**
An API designed from one caller encodes that caller's assumptions and then the
second caller has to fight it.

Scanning pharma against insurance turns up an awkward result. Pharma has
several files that are *obviously* domain-neutral — a SQL-write scanner, a
prompt-versus-tools checker, a checks self-test — and insurance has **no
equivalent of any of them**. So by a literal reading of the rule, almost
nothing qualifies, and we'd be stuck: the generic code can never move, because
the second customer never independently invents it.

The reconciliation, and the thing that makes this plan a plan rather than a
wish list:

> **An extraction only counts when a second caller adopts it in the same
> change.** If the change leaves one caller, it is not an extraction — it is a
> file that moved and got harder to read.

So every candidate below gets one of three verdicts:

| Verdict | Meaning |
|---|---|
| **EXTRACT** | Two real callers exist today, or insurance adopts it in the same commit. Do it. |
| **INTERNAL** | Real duplication, but all of it is inside pharma. Collapse it locally; no package involved. |
| **LEAVE** | Looks extractable, isn't. Reason recorded so nobody "fixes" it later. |

---

## The prerequisite, checked

Anything moving into `@fde/*` must survive `pnpm leak:check`. That checker's
`BANNED` list was insurance-only for a long time, which would have made these
extractions half-blind — pharma vocabulary (`mrd_*` table names in the guard
scanner, market names in the prompt checker) could have walked straight in.

**Already fixed.** `scripts/leak-check.mjs` now bans both vocabularies:

```js
// pharmaceutical manufacturing
'pharma', 'gmp', 'dissolution', 'excipient', 'monograph', 'potency',
'qualified person', 'meridian', 'ibuprofen', 'consignee', 'cold chain',
```

No blocker. But note what is *not* on that list — `lot`, `batch`, `market`,
`shipment`, `disposition`, `sop`. Those are generic enough to be defensible as
parameter names, and specific enough to be a leak if they end up in a package's
logic. Each extraction below names which of them it must not carry.

---

## Ranked candidates

### 1. `redact()` — **EXTRACT** · 6 lines removed · risk: none

`packages/pharma/src/config/connections.ts` defines:

```ts
export function redact(url: string): string {
  return url.replace(/(:\/\/[^:@\/\s]+:)[^@\/\s]+@/, '$1***@');
}
```

`@fde/grounding` already exports `redactedConnectionString()` with a
**byte-identical** regex body (verified by normalising both and comparing — not
by reading the comment). Pharma's own header says it was lifted deliberately.

This is the strongest candidate in the set and the only one that needs no
judgment call:

- Two callers exist **today**. The rule is satisfied without caveat.
- The grounding version carries the better comment — it explains why the match
  is anchored on `://` (so a colon in a query parameter survives).
- A one-line password redactor drifting out of step is not hypothetical here.
  `pnpm env:check` printed a **live Neon password** into the terminal this week.

**Do:** delete pharma's `redact`, import `redactedConnectionString` from
`@fde/grounding`, update the ~6 call sites (`migrate.ts`, `check.ts`,
`connections.ts`'s own printer, the grounding CLI).

**Watch:** `redactedConnectionString` defaults its argument to
`connectionString()` — grounding's *own* env lookup. Pharma must always pass
its URL explicitly, or it will redact the wrong database's credentials. Pass
the argument at every call site; do not rely on the default.

> ### Rotate that credential
> The Neon password for `PHARMA_DATABASE_URL` reached terminal scrollback. The
> redaction is fixed; the exposure is not. **It is still live.** This
> extraction does not close that.

---

### 2. The as-of date helper — **INTERNAL** · 6 copies → 1 · risk: low

Six independent implementations of "turn this into `YYYY-MM-DD`", each with
different null handling:

| File | Line | Behaviour on null |
|---|---|---|
| `tools/utils/dates.ts` | 13 | `''` |
| `db/init/classify-probe.ts` | 26 | `''` |
| `db/init/check.ts` | 167 | throws (`String(null).slice`→`"null"`) |
| `db/seed/operations.ts` | 26 | throws (`.toISOString` on null) |
| `db/seed/rng.ts` | 86 | n/a — always a `Date` |
| `cli/lot-trace.ts` | 39 | `'—'` |

This is the highest-value item on the list and it has a **bug already attached
to it**. `String(someDate)` yields `"Sat Feb 17 2024 ..."`, and comparing that
lexically made the signature-authority probe report **24 violations where there
were 2**. The as-of rule is the single most important piece of judgment in this
domain; the helper that implements it should exist once.

**Do:** everything outside `db/seed/` imports `asOfDay` from `tools/utils/dates.ts`.

**Done 2026-09-12** — three call sites: `classify-probe.ts` (identical
semantics), `check.ts`, `lot-trace.ts` (keeps its own em dash for empty cells,
which is presentation). `db/seed/` untouched.

**One semantic change, verified against data rather than by construction.**
`check.ts`'s local version returned the *string* `"null"` for a null date, which
sorts **after** every real date; `asOfDay` returns `''`, which sorts **before**.
Any `d(a) < d(b)` inverts on a null input. `pnpm db:check` is 22/22 green, and
`db:trace` is byte-identical on five lots — so no null reaches those comparisons
in the committed world. That is evidence about *this* data, not a proof about the
code. If a future seed change introduces a null date into a trap derivation, this
is the line to re-read.

**Do not extract to `@fde/*`.** It's three lines, and its semantics
(`effective_to = null` means OPEN, not "unknown") are a GxP rule, not a
calendar fact. It earns a package when a *third* domain needs the same rule.

**Leave two alone, deliberately:**
- `cli/lot-trace.ts:39` returns `'—'` for null because it prints to a terminal
  table. That's presentation. Let it call `asOfDay` and substitute the dash
  itself.
- `db/seed/rng.ts:86` is inside the deterministic generator. Touching the seed
  path shifts the random stream and invalidates `release-001`'s numbers — the
  same reason GB rows are still deferred in `NEXT.md`. **Do not touch `db/seed/`
  for a tidiness change.**

---

### 3. `PACKAGE_ROOT` / `REPO_ROOT` — **LEAVE** *(downgraded during implementation)* · risk: low

```ts
// packages/insurance/src/config/paths.ts:18
export const PACKAGE_ROOT = resolve(__dirname, '..', '..');
export const REPO_ROOT    = resolve(PACKAGE_ROOT, '..', '..');
export const DOCS_ROOT    = resolve(REPO_ROOT, 'docs');
```

`packages/pharma/src/config/connections.ts:38` has the identical expression
with a near-identical reasoning comment. Both are consumed widely — 14 call
sites between them, mostly `config({ path: resolve(REPO_ROOT, '.env') })`.

Two occurrences, identical code, identical reasoning. Qualifies plainly.

**Where:** a small `paths` export from an existing package rather than a new
one. `@fde/telemetry` already owns `REQUEST_LOG` (which is built from
`REPO_ROOT`), so it has the strongest claim — but honestly this is close to a
coin flip and the decision matters less than picking one.

**Watch:** the `'..', '..'` hop counts are *relative to the file's compiled
location*. A shared helper resolving from its own `__dirname` lands in
`packages/telemetry/`, not the caller's package. The extracted function must
take the caller's `__dirname` as an argument — `packageRoot(__dirname)` — or
it will silently resolve to the wrong tree. This is the one place in the plan
where a careless move produces a bug that typechecks.

**Do not extract `DOCS_ROOT` blindly.** Insurance reads `docs/`, pharma reads
`docs/pharma/`. The base is shared; the subdirectory is domain.

#### Why this was downgraded, 2026-09-12

Everything above is true, and I still didn't do it. Three things showed up once
I went to write it:

1. **There is no good home.** `@fde/telemetry` was the best candidate because it
   already derives `REQUEST_LOG` from `REPO_ROOT` — but its header says what it
   is for ("one durable line per request, and a way to ship it"), and path
   helpers in there are the kind of thing that makes a package's purpose blurry.
   A `@fde/paths` package for three lines is worse.
2. **The shared part is two lines.** `resolve(__dirname, '..', '..')` and one hop
   above it. The *valuable* part is the reasoning comment — why not `cwd` — and
   that is already shared by reference: pharma's comment opens "The same
   reasoning as `packages/insurance/src/config/paths.ts`".
3. **The extraction is more dangerous than the duplication.** The hop count is
   only correct at `src/config/` depth. A helper resolving from its own
   `__dirname` lands in `packages/telemetry/`, so it must take the caller's
   `__dirname` — `packageRoot(__dirname)`. That is a signature a caller can get
   wrong silently, and it typechecks when wrong. Two literal lines cannot.

The duplication is one line per package, in one file per package, with a comment
pointing at its twin. That is cheaper than the abstraction that removes it.
**Recorded rather than deleted**, so the next person who notices the duplication
finds the reasoning instead of re-deriving it.

---

### 4. The guard SQL-write scanner — **EXTRACT, conditional** · 191 lines · risk: medium

`packages/pharma/src/guard/sql-write-selftest.ts` scans
`src/{tools,agent,cli,eval,guard,schema,telemetry}` for write SQL, exempting
`db/` and itself. It is the enforcement of the most important constraint in the
engagement: **the answer path must never write to the customer's GxP systems of
record.** It plants four writes and seven read-shaped controls and asserts it
catches exactly the four.

It imports nothing from `@fde/*`. The generic part is the whole scanner; the
domain part is two lists — the directories to scan and the exempt set.

**First, fix a name collision.** There are two different `guard:check` commands
in this repo:

| Command | Runs | Checks |
|---|---|---|
| root `guard:check` → insurance | `packages/guard/src/selftest.ts` | HTTP API-key auth fails closed |
| pharma `guard:check` | `pharma/src/guard/guard-selftest.ts` | no write SQL in the answer path |

**Done 2026-09-12** — pharma's is now `pnpm sql:check`, file `guard/sql-write-selftest.ts`.
The scanner's `SELF` exemption constant was renamed with it; stale, it would have
flagged its own four planted writes and failed.

Same name, unrelated concerns. Rename pharma's to `sql:check` (script and file)
**before** extracting, or the extracted thing will be ambiguous forever.

**The condition:** insurance's answer path (`tools/`, `coverage.ts`, `ask.ts`)
must also never write to `policy_chunks`, and nothing checks that today. Extract
into `@fde/guard` as `createWriteScanner({ scanDirs, exemptDirs })` **and wire
`pnpm sql:check` into insurance in the same commit.** If that wiring isn't
happening, don't extract — leave it in pharma and revisit.

**Watch:** the scanner's two hard-won regex subtleties must survive the move,
because both were false-positive bugs found the slow way —
`REGEX_LITERAL` stripping (a regex literal is a parser, not a query: it caught
`matchAll(/create table (\w+)/gi)` in `checks.ts`) and every `grant|revoke`
alternative requiring an object (it caught `const grant = hcm.authority.find(...)`).
Port the seven read-shaped controls with it; they are the only evidence those
subtleties still hold.

**Keep the honest limitation in the output.** The current version says it: this
is source-level only, and the real control is a read-only Postgres role the
estate does not have. A package-level check must not sound stronger than it is.

---

### 5. The prompt-vs-tools-vs-schema self-test — **EXTRACT, conditional** · 140 lines · risk: medium

`packages/pharma/src/agent/prompt/prompt-selftest.ts` — 8 checks asserting the
prompt names every registered tool, invents no ghost tools, and motivates every
schema field, plus a self-sabotage control.

Generic in shape: *prompt text × tool registry × answer schema → consistency*.
Insurance has a prompt and no check on it.

This check has already earned its place twice:
- It once passed while keeping a **stale local copy** of the tool list — the
  loop had never registered `search_procedures`. Fixed by exporting
  `RELEASE_TOOL_NAMES` and asserting it matches the registry. The extracted
  version must take the registry as input, never a literal list.
- Its ghost-tool detection flagged `as_of`, a tool *parameter*. Now matches
  `"call X"` rather than any snake_case token.

**Where:** `@fde/agent` — it's about the loop's contract with the model.

**The API must take the registry object, not a names array.** The bug this check
once missed was a stale *local copy* of the tool list; an extracted version that
accepts `string[]` lets a caller reproduce that exact failure through the new
package.

**Condition:** same as #4. Insurance adopts `pnpm prompt:check` in the same
commit, or it stays.

---

### 6. The checks self-test runner — **EXTRACT, conditional** · 164 lines · risk: medium

`packages/pharma/src/eval/checks/checks-selftest.ts` — asserts every eval check
fires in **both** directions (a check that only ever passes is not a check) and
that the registry has no unreachable entries.

This one was already deferred by name in `NEXT.md` as a `verifyChecks` candidate
for `@fde/evals`, with the second-occurrence rule cited as the reason to wait.
That reasoning still stands; this plan just makes the unblocking condition
explicit rather than leaving it as "later".

**Where:** `@fde/evals`, beside `verifyClassifier` and `verifyValidator` — it is
plainly the third member of that family.

**Watch:** `@fde/evals` already owns `createCheckRegistry` and
`createAnswerChecks`. I have re-implemented package functions from this family
**before** — I rewrote `verifyClassifier` and six `createAnswerChecks` checks
from scratch, and the package's versions turned out to carry a scar mine
didn't: an inverted infrastructure branch that had once reported 25
broken-plumbing runs as dangerous. **Read what `@fde/evals` already exports
before writing a line of this one.**

---

### 7. `DbHandle` (`tools/utils/handle.ts`) — **LEAVE** · 59 lines

A lazy, counted, multi-database connection handle. Genuinely generic-looking,
zero `@fde/*` imports.

**Insurance has one database.** A multi-database handle abstraction designed
against a single-database caller is exactly the API-shaped-by-one-caller
failure the rule exists to prevent. Its whole reason for existing — six
separate Neon databases where **no cross-database JOIN is expressible** — is a
property of this estate, not of software.

Revisit if a third domain arrives with silos. Until then it stays, and the
`fetches` counter stays with it: it is how "the agent made 14 database calls to
answer this" gets measured.

---

### 8. `telemetry/prices.ts` — **LEAVE, deliberately** · 70 lines

A near-copy of insurance's price table. **This duplication is correct and the
file says so.**

Model prices are a fact about a deployment, not about software. Sharing them
would mean one customer's rate change silently altering another customer's cost
report. The rates were settled the hard way — the retail API searched by
`meterName` returns only `pp` meters and was 1.8× too high; `az consumption
usage list` named the real ones.

**What may be shared is the `Price` *type* and `priceOf()`** — already exported
from `@fde/telemetry`. The numbers stay duplicated. Recorded here so a future
tidying pass doesn't "fix" it.

---

### 9. `tools/departments/*.ts` row mappers — **LEAVE** · ~945 lines

Six files, one per silo, each mapping snake_case rows to typed camelCase
shapes. Repetitive, and not a package candidate: every mapper is a statement
about *this customer's schema*.

The derived findings living alongside them — `disqualifiedAfterUse`,
`supersededByRetest`, `equipmentQualifiedOnDay`, `citedWasInForce` — are the
judgment. That is the code that *should not* be portable.

If the boilerplate becomes annoying, a local `mapRow` helper in
`tools/utils/`. Nothing above that.

---

### 10. `tools-selftest.ts`'s description check — **ADOPT** · done · risk: none

`packages/pharma/src/agent/tool/tools-selftest.ts` carried its own:

```ts
const undescribed = Object.entries(params).filter(([, v]) => !v.description)
```

`@fde/schema` already exports `verifyDescriptions`. Not an extraction — an
**adoption**, the cheapest kind of change on this list, and the local version was
weaker in two ways that mattered:

- it walked only the **top level**, so a description lost inside a nested object
  would have passed;
- it had **no control**, so it read "ok" just as cheerfully whether the
  descriptions were there or the walk was looking at the wrong object.

`verifyDescriptions` blanks one description itself and requires a complaint about
that exact field — the both-directions rule the eval checks already obey.

This is the third time a package function turned out to carry something a local
reimplementation didn't. `verifyClassifier` and six `createAnswerChecks` checks
were the first two. **Read what `@fde/*` already exports before writing a check.**

---

### 11. The surface layer → `@fde/uikit` — **EXTRACT** · done 2026-09-12 · risk: medium

Built while wiring `apps/veresk-app`. Seventeen files: controls, icons, severity
tokens, motion, and the stylesheet they read.

```
packages/uikit/src/
  index.ts              the public surface
  styles/uikit.css      tokens · control layer · motion
  tokens/tone.ts        severity as class names
  icons/                icon.tsx (shared frame) · shapes.tsx · index.ts
  components/           Mono Quote Chip Panel Field Select SubmitButton
                        WorkingNotes RunFigures Failure Prose
```

**What makes it a design system rather than one product's stylesheet in a shared
folder:** every component reads only `--ui-*` semantic tokens — `--ui-fg`,
`--ui-dim`, `--ui-raised`, `--ui-accent`, `--ui-danger`. The defaults are dark
because pharma is dark, but the insurance surface is light, serif, set like a
paper claims file. A component that hard-coded `text-dim` or `bg-raised` could
never be adopted there. Re-point the tokens, restyle the set.

**What was deliberately kept out:**

| Kept out | Why |
|---|---|
| `ask-stream.ts`, `use-ask.ts` | SSE transport and React state, not presentation. A package with two jobs is the `guard:check` collision again — measured and decided in §12 below. |
| `Prose`'s identifier grammar | `LOT-…`, `SOP-… Rev 7`, `mrd_hcm.…` is one customer's grammar. `Prose` takes patterns as a prop; the table lives in `apps/veresk-app/src/lib/tokens.ts`. A design system that knows what a batch number looks like is not a design system. |
| `EmptyState`, `Answer.tsx` | The copy and the dossier layout are the domain. |
| Severity *rules* | The package owns how severity looks, never what is severe. |

**ONE CONSUMER TODAY, and that is against the rule at the top of this file.**
It was asked for explicitly — "reused later" — so this is a deliberate
exception, recorded rather than hidden. The mitigation is the token indirection:
the second surface in this repo is light, so any component that assumed a dark
palette gets caught the moment insurance adopts.

**`leak:check` does not protect this boundary.** It now scans 8 packages
including `@fde/uikit` and passes — but `lot`, `batch`, `market` and `sop` are
not on its BANNED list, so the identifier grammar could have sat in the package
and still reported PASS. It was verified by hand instead:
`grep -rnE "LOT|mrd_|SOP-" packages/uikit/src` returns only comments explaining
why the grammar is not there.

#### The failure this nearly shipped with

Tailwind v4 emits only utilities it finds in scanned sources. The moment
`WorkingNotes`, `Field` and `Chip` moved into `packages/uikit/src`, every utility
used *only* there — `text-ui-dim`, `bg-ui-raised`, `ring-ui-bg` — would have
vanished from the compiled stylesheet. **`tsc` passes. `vite build` passes. The
markup still says `class="ui-control"`.** There is simply no rule behind it, and
the only symptom is an unstyled page nobody's checks look at.

`@source "../"` inside `styles/uikit.css` fixes it (paths resolve relative to the
CSS file, so it climbs to the components). The check that discriminates runs
against the **compiled** stylesheet, not the markup:

```bash
curl -s http://localhost:3300/src/styles/app.css > /tmp/out.css
for u in text-ui-dim bg-ui-raised ring-ui-bg ui-control ui-sweep; do
  grep -qE "\.$u" /tmp/out.css && echo "$u present" || echo "$u MISSING"
done
```

Note what does *not* work: `grep -c` on the compiled sheet counts matching
*lines*, and Tailwind packs rules densely — one match and twelve look identical.
Match per-utility.

#### Two build mechanics worth keeping

- **`@fde/uikit` must stay OUT of `DOMAIN_EXTERNALS`.** It ships `.tsx` source
  (`main: ./src/index.ts`); externalising it hands Node raw JSX.
- **`@fde/guard` must stay IN.** It ships CommonJS `dist`, and inlining it as ESM
  kills every request with `exports is not defined`. Insurance never hit this —
  it reaches the same guard *through* `@claims/insurance`, already external.
  **`vite build` succeeds in both broken states.** Only `vite dev` catches them,
  which is why both are run.

---

## Scanned and judged domain — no action

The rest of the 8458 lines, so a cold reader can tell "judged" from "never
opened":

| Area | Lines | Why it stays |
|---|---|---|
| `db/seed/` (`world` 756, `operations` 504, `rng`) | ~1400 | The generator IS the fictional estate — the eight traps are planted here. Also **stream-fragile**: any edit shifts the RNG and invalidates committed eval numbers. |
| `db/init/check.ts` | 472 | Thirty-odd soft keys and eight trap re-derivations, every one naming this customer's tables. The *negative-control pattern* is generic and worth copying by hand; the code is not. |
| `db/schema/rows.ts` | 596 | Row types for 47 tables of one customer's DDL. |
| `db/init/` (create, migrate, drop, kb-create, probes) | ~400 | Six named databases and a guard that refuses anything else. |
| `agent/prompt/release-prompt.ts` | — | The prompt. The single least portable file in the package. |
| `agent/loop/release-agent.ts` | 284 | Wires `@fde/agent`'s loop to pharma's tools; the wiring is the domain. |
| `schema/release-schema.ts` | 272 | The answer contract. Its whole value is that it cannot say "release it". |
| `eval/checks/checks.ts` | 269 | Already spreads `createAnswerChecks`; what is left is pharma-only checks. |
| `eval/severity/`, `eval/diff/`, `eval/run.ts` | ~400 | Already thin wrappers over `@fde/evals`. |
| `grounding/` | 258 | Already thin over `@fde/grounding`; `embeddings.factory` and the corpus descriptor are config. |
| `tools/departments/*` | ~945 | See item 9. |
| `cli/` | 417 | Printing. |

---

## Ordering

Do the unconditional ones first. They are small, verifiable, and need no
decision from anyone.

| # | Change | Verdict | Status |
|---|---|---|---|
| 1 | `redact` → `redactedConnectionString` | EXTRACT | ☑ **done** — wrapper, argument required |
| 2 | Collapse as-of helpers (skip `db/seed/`) | INTERNAL | ☑ **done** — 3 of 6 copies, `db/seed/` untouched |
| 3 | `packageRoot(__dirname)` shared | ~~EXTRACT~~ LEAVE | ☑ **downgraded** — reasoning recorded above |
| 4 | Rename pharma `guard:check` → `sql:check` | prep | ☑ **done** — file, script, `SELF`, docs |
| 10 | `verifyDescriptions` adopted in `tools:check` | ADOPT | ☑ **done** — 16 → 17 checks, controls fire |
| 11 | Surface layer → `@fde/uikit` | EXTRACT | ☑ **done** — 17 files, one consumer, tokenised |
| 12 | `sql:check` widened to `src/*.ts` | fix | ☑ **done** — `directory.ts` was unscanned |
| — | **decision point — see below** | | |
| 5 | SQL scanner → `@fde/guard` + insurance | EXTRACT? | ☐ needs the decision · ~3 h |
| 6 | Prompt self-test → `@fde/agent` + insurance | EXTRACT? | ☐ needs the decision · ~3 h |
| 7 | Checks self-test → `@fde/evals` + insurance | EXTRACT? | ☐ needs the decision · ~3 h |

After **every** step: `pnpm leak:check`, `pnpm typecheck`, and the eight gates
(`sql:check`, `compliance:check`, `compliance:mastra`, `checks:check`,
`severity:check`, `schema:check`, `prompt:check`, `tools:check`).

Verify by extracting the pre-change file with `git show HEAD:path > /tmp/ref.ts`
and running both copies side by side. **No `git stash`** — two backgrounded
stash runs collided in this workspace and produced two false `DIFFERS` on empty
files. That rule is in `ARCHITECTURE.md`.

---

## The decision that is not the code's to make

Items 5–7 are one decision, not three: **is insurance in scope for this work?**

Each is ~3 hours, and roughly *half* of that is writing insurance's adoption —
a prompt checker for insurance's prompt, a SQL scan of insurance's answer path,
a both-directions run of insurance's checks. That half is real work on a package
that is otherwise finished and green at 30/35.

Extracting without it means seven `@fde/*` packages plus three more shaped by a
single caller — which is the thing the second-occurrence rule was written to
prevent, and the reason this plan doesn't just do it.

- **Yes, both packages** — items 1–7, ~11 hours. The generics get validated by a
  second caller, and insurance gains three checks it currently lacks.
- **Pharma only for now** — items 1–4 only, ~2 hours. Genuine duplication gone,
  no premature abstractions, 5–7 stay recorded here with their conditions.

Worth weighing against **N2**, still the only open build item in `NEXT.md`: the
second bottleneck (T4 supplier impact, `assess-supplier-impact.ts`, ~a day,
deterministic first with no model). N2 tests whether the *architecture* carries
a second question. Items 5–7 test whether the *packages* carry a second
customer. Both are worth doing; N2 is the one that produces a new answer.


#### 12. The app surface, re-surveyed — **one move, two LEAVEs** *(2026-09-12)*

The three app-level files were diffed against their insurance counterparts
rather than argued about. Duplication is only worth removing when the two copies
have converged, and the diff is the only honest way to know whether they have.

| file | insurance | pharma | differing lines | verdict |
|---|---|---|---|---|
| `lib/storage.ts` | 10 | 10 | **4** — all of them the key prefix | **MOVED** |
| `lib/ask-stream.ts` | 82 | 81 | **3** — insurance sends one extra body field | **LEAVE** |
| `hooks/use-ask.ts` | 89 | 78 | **67** | **LEAVE** |

**`storage.ts` moved, and it is the only non-component in the package.** Four
differing lines that are *all the same difference* is the clearest possible
statement of what the parameter is: `createStore(namespace)`. It also passes this
package's own admission test — where a control's last value lives between visits
is a property of the surface, not of transport — so it does not reopen the
two-jobs problem the header warns about. Both apps keep a two-line local module
binding the namespace, so no call site changed:

```ts
const store = createStore('pharma');
export const load = store.load;
export const save = store.save;
```

**`ask-stream.ts` is extractable and still should not move.** Three differing
lines is a genuine second occurrence, and if a home existed it would go there
today. None does. It is transport, so `@fde/uikit` is ruled out by its own
header; a ninth package — its own `tsconfig`, its own build, added to both apps'
dependencies, `leak:check` widened to nine — to hold about eighty lines is the
same trade §3 already declined for `PACKAGE_ROOT`, and declined for the same
reason: *the extraction is more dangerous than the duplication*. This is now a
decision with a number attached rather than an open thread. It flips the moment
a third surface needs it, and the diff says the move will cost an afternoon.

**`use-ask.ts` is blocked on a decision, not on packaging.** Sixty-seven
differing lines out of eighty is not duplication — the two hooks have genuinely
diverged, and extracting them means choosing which behaviour survives. That is a
product call, and it is not a refactor. Reconcile first, then re-measure.

**The pharma tokens stay in the app, permanently.** `--color-hop-1..6` and
`--color-flow-person/internal/model` are named after six systems of record and a
trust boundary. `DESIGN.md` §2 is explicit that they are product-local; moving
them to `@fde/uikit` would hand the next product a palette it cannot explain, and
would break the one property that makes the package a design system — that a
consumer restyles everything by re-pointing `--ui-*`.

**The extraction with the real value is the one nobody asked for.**
`apps/insurance-app` now depends on `@fde/uikit` for the first time, but only for
`createStore`. It still keeps its own `WorkingNotes`, so every improvement landed
on the pharma side this session reaches exactly one app. The mitigation this
file claims for the single-consumer exception — "any component that assumed a
dark palette gets caught the moment insurance adopts" — is still unspent. That
adoption, not moving more files out of pharma, is what would validate the split.

---

# Part B — readability, and the code written on 2026-09-12

*Added 2026-09-12, after the practice-track and multi-agent work roughly
doubled the package. Nothing here is done. Part A above is unchanged.*

The rule from the top of this file still governs: **extract on the SECOND
occurrence, not the first.** Most of what follows is therefore LEAVE, and the
leaves matter as much as the extracts — a package shaped by a single consumer
is the thing this rule exists to prevent.

## B1 · Function length — measured, not eyeballed

30 functions in `packages/pharma/src` exceed 45 lines. The distribution is not
what file size suggests: `lot-debate.ts` is 699 lines of mostly small functions
and long comments, while `world.ts` is one function of 547.

| lines | where | verdict |
|---|---|---|
| 547 | `db/seed/world.ts :: buildWorld` | **split, and it is now SAFE** — see B2 |
| 458 | `db/init/check.ts :: main` | split per trap — B3 |
| 438 | `db/seed/operations.ts :: buildOperations` | **split, now safe** — B2 |
| 207 | `agent/loop/supplier-impact-fanout.ts :: askSupplierImpactFanout` | split into phases — B4 |
| 176 | `db/init/classify-probe.ts :: main` | leave; a probe, run by hand, read once |
| 165 | `cli/lot-trace.ts :: main` | split presentation from fetch — B5 |
| 163 | `agent/loop/lot-debate.ts :: debateLot` | split into rounds — B4 |
| 128 | `tools/functions/supplier-impact-selftest.ts :: main` | leave; a list of assertions reads fine long |
| 112 | `tools/utils/handle.ts :: openHandle` | leave; one closure, mostly the retry comment |
| 109 | `db/seed/complaints.ts :: buildComplaints` | borderline; split only if B2 lands |

**Two of the worst four were written today and are mine** —
`askSupplierImpactFanout` at 207 and `debateLot` at 163. Recorded rather than
quietly fixed, because "the new code is the tidy code" is usually false.

## B2 · The seed — the one refactor that used to be unsafe and now is not

`buildWorld` (547) and `buildOperations` (438) are the largest functions in the
package and the ones nobody has dared touch, for a good reason: **they draw from
a single shared random stream in order.** Any reordering changes every value
generated afterwards, and until 2026-09-12 nothing would have detected it.

`pnpm pharma:world-check` detects it now — measured, one extra `h.r()` moves 17
tables. That converts this from a refactor nobody can verify into one that is
verified in seconds:

```
split buildWorld into buildRegulatory / buildPeople / buildProducts / …
each called in EXACTLY the order the statements run today
pnpm pharma:world-check   →   must say "ok unchanged, sha ab67e52dbe2e8ffd"
```

A byte-identical fingerprint is proof the stream did not move. **This is the
highest-value readability work in the package**, and it is only available
because the guard was built first.

Do it as one commit per function, fingerprint green between each. Do NOT combine
it with any change to what the seed produces.

## B3 · `check.ts` — one function per trap

458 lines of sequential assertions in one `main()`. Each trap is already a
`{ … }` block with a comment naming it (T1…T7). Lift each block to a named
function taking the table accessor:

```ts
function checkT4SupplierDisqualified(T: TableFn, note: NoteFn): void
```

Low risk, high readability, and it makes an individual trap runnable in
isolation when one goes red. `db:check` must still report **26 ok, 0 failing**.

## B4 · The multi-agent code — split by phase

`askSupplierImpactFanout` is five phases in one function: retrieve the clause,
fan out, rank, assemble, validate. Each is independently testable and currently
is not:

```ts
fetchGoverningClause()   // exists already
fanOutLots()             // pooled() + progress
rankRows()               // deterministic, pure — unit-checkable with NO model
assembleEstate()         // the assembler call
buildAnswer()            // the object + the missing/notAssessed merge
```

`rankRows` and `buildAnswer` being pure is the point: the partial-failure
merge — the thing that had a real bug this afternoon — becomes checkable
offline, without a model or a database.

`debateLot` splits the same way: `openingRound` / `rebuttalRound` /
`adjudicate`.

## B5 · CLI presentation — already duplicated, so already extractable

`wrap()`, `flag()` and the `DIM/OFF/BOLD` constants exist **twice**, in
`cli/lot-debate.ts` and `cli/supplier-fanout.ts`. Both written today; the
duplication is hours old.

**INTERNAL, not a package.** Two copies inside one domain is a shared module in
that domain (`src/cli/format.ts`), not evidence a second customer needs it. The
rule is second OCCURRENCE across CONSUMERS, and `@meridian/pharma` is one
consumer. Revisit if insurance's CLIs grow the same helpers.

---

# Part C — new extraction candidates, 12 onward

## 12 · `pooled()` — bounded concurrency — **LEAVE for now**

`supplier-impact-fanout.ts`, 8 lines: run N async jobs, at most k at a time.
Entirely domain-neutral and the obvious thing to lift into `@fde/agent`.

**Left anyway, because it has ONE caller.** It moves when the fan-out pattern
moves (candidate 14) and not before — a utility extracted alone, shaped by one
call site, is how a package accretes helpers nobody else wants.

## 13 · The convergence measurement — **EXTRACT, conditional** · ~40 lines

`lot-debate.ts`'s `bag()` / `overlap()` / `rebuttalValue()`. Word-overlap
between two texts before and after they see each other, with a verdict. Not one
pharmaceutical word in it.

**The generic thing is "did two agents converge"**, which belongs beside the
repeat-run and severity machinery in `@fde/evals`. The domain part — that
`concedes` is where a collapse hides, and 0.45 is the threshold — stays here as
configuration.

**Condition:** a second debate anywhere. One debate does not tell you which half
is generic; the current thresholds were tuned on four runs of one question.

## 14 · The fan-out orchestration — **EXTRACT, conditional** · ~120 lines

The shape in `supplier-impact-fanout.ts` is not about suppliers:

```
walk once  →  fan out over N items, bounded  →  rank  →  assemble  →  validate once
```

Parameterised by `{ items, briefFor(item), itemSchema, assemblerSchema,
assemblerPrompt, rank, merge }`, this is `@fde/agent`'s natural next member —
it is the same "you bring the tools, the prompt and the validator" bargain the
package already makes, one level up.

**Condition: a second fan-out.** Regulatory change impact (BOTTLENECK-2 #4) is
explicitly "a close cousin of supplier impact", and is the honest test of
whether these parts generalise. Extracting now would produce an abstraction
fitted to 23 pharmaceutical lots.

**What must NOT move with it:** the partial-failure policy. "A work list short
of the lots it should contain is not a shorter answer" is a judgement about
patient exposure, not about orchestration. The package should expose the fact
that k items failed; what that MEANS stays with the domain.

## 15 · The debate — **LEAVE** · ~700 lines

Advocates, stipulation, rebuttal, adjudicator. Tempting, because the structure
is textbook.

**Left, and the reason is the strongest one in this file.** Nearly everything
learned building it was domain reasoning: that the two sides must argue the
same question, that the evidence gap had to be stipulated because it was TRUE,
that "should this be recalled?" is permitted and "a recall is warranted" is
not. A generic `debate()` would carry the skeleton and drop all of it, and the
skeleton was never the hard part.

Revisit only if a second domain needs a structured disagreement — and then
extract the SHAPE, leaving every prompt behind.

## 16 · The world fingerprint — **LEAVE** · ~100 lines

`world-fingerprint.ts` + `world-check.ts` hash a deterministically generated
dataset and report per table. Generic in principle.

One occurrence, one consumer, and it depends on the `MasterWorld` shape. The
near-identical idea already exists for documents in `@fde/grounding`
(`fingerprintDocuments`) — **that** is the second occurrence to notice, and if a
third appears the right move is one fingerprint utility serving all three, not
this file moved sideways.

## 17 · The retrieval scorer — **EXTRACT, conditional** · ~120 lines

`eval/retrieval/retrieval.ts`. `scoreCase` / `retrievalSummary` are recall@k and
MRR over labelled expectations — the generic half. `clauseOf` / `revisionOf` /
`labelOf` are a statement about what identifies a rule in THIS corpus.

The file already says so in its header. **Condition: insurance adopts it**,
which is the same blocker items 5–7 carry. Insurance has 79 documents and a
manual spot check, so it is the natural second caller.

---

## Ordering, for Part B and C

Readability first, because extraction from a 500-line function is extraction of
a 500-line function.

1. **B5** — CLI format module. Hours-old duplication, minutes to fix, zero risk.
2. **B4** — split the two multi-agent functions. Mine, freshest, makes the
   partial-failure merge offline-checkable.
3. **B3** — `check.ts` per trap. Gate: `db:check` still 26 ok / 0 failing.
4. **B2** — the seed. Highest value, and now verifiable. Gate:
   `pharma:world-check` byte-identical, one commit per split function.
5. **C13/C14/C17** — only when their stated second occurrence arrives.

## The decision this needs

Part B is uncontroversial and can start immediately.

**Part C's conditions are the whole point**, and they say: extract almost
nothing today. Three of six candidates wait on a second consumer that does not
exist yet, and one (the debate) should probably never move.

That is a real answer, not a deferral — the alternative is six packages shaped
by one customer, which is precisely what `leak:check` and this file were built
to prevent.

---

# Part D — the second consumer arrived, and it needed a second package

*2026-09-13.*

Every deferred candidate above waits on the same thing: a second caller. One
arrived, and it was not the one anyone was watching for. `/steering` became
`apps/steering-app` — its own deployment on port 3400 — and four files that had
been shared between two ROUTES were suddenly shared between two APPS.

## What moved, and where it could not go

`EstateExplorer`, `Aurora`, `RouteProgress`, and the cylinder and pages
drawings. The obvious home was `@fde/uikit`, and it is the wrong one:

- `EstateExplorer` knows what a **system of record** is, that some of them may
  not publish sample values, and that a thing in an estate might not be a
  database at all. A customer lifting `@fde/uikit` into their own repository
  would be lifting three of our judgements with it.
- More mechanically: **`@fde/uikit` uses no Tailwind utility classes, and that
  is load-bearing.** Tailwind v4 does not scan `node_modules`, so a package
  whose components carry utility classes renders unstyled unless the consumer
  names it with `@source`. A consumer who forgets gets a blank-looking page from
  a build that SUCCEEDS — the same failure shape this repo already documents for
  `@fde/guard` in `apps/veresk-app/vite.config.ts`. A package meant to leave
  this repository must work with no build configuration at all.

So they went to a new package, `@veresk/surface`, which is allowed utilities
because it has exactly two consumers and both are in this repo and both carry
the `@source` line. It is named `@veresk/` rather than `@fde/` so `leak:check`,
which keys on the `@fde/` prefix, correctly leaves it alone — it is *supposed*
to know both customers' names.

## The measurement, stated honestly

`SteeringEstate.tsx` used to claim the generalisation cost "four props and one
card". It did not. The real number is **nine props and one structural type**:
`faces`, `notes`, `figure`, `heading`, `intro`, `aside`, `asideNote`,
`asideCard`, `showSamples`, plus `EstateLike` so that either generator's output
satisfies the component without the two generators having to agree.

What was genuinely reused untouched is everything below that line: the tiles,
the dialog and its origin animation, the cascade, the field lists, the count-up
ramp. That is still a good result. It is a different claim from the one that
was written down, and the smaller number was flattering rather than measured.

## The third rule this adds to the two above

The plan's rule was *extract on the second occurrence, into the package that
already owns the idea*. This adds: **and if no package owns the idea, the
honest move is a third package, not the nearest one.** Putting `EstateExplorer`
in `@fde/uikit` would have cost nothing today and made the uikit unliftable —
which is the only property it has that is worth anything.
