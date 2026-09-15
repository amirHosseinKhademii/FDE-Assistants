# Credentials and the trust boundary — a missing value must reduce access, never grant it

**Status: BUILT HERE, AND REVIEWED.** `@fde/guard` is running code with a
self-test that asserts every denial still denies. `docs/SECURITY-REVIEW.md` is a
real scan of this repo and its git history, with one exposure **accepted rather
than fixed** and the reasoning written down.

> **Extends, does not restate.** [`INJECTION.md`](INJECTION.md) is the other half
> of the boundary — untrusted *content*. `/learn/residency` owns *what leaves
> the building* and its three-column "how the claim is known" table.
> `docs/SECURITY-REVIEW.md` is a dated scan, not a teaching document — re-run
> it, don't cite it as current.

*Research date 2026-09-15.*

---

## 1 · The plain version

An AI system has more boundaries than a normal web service, and they are easy to
miss because two of them are new:

```
   the caller  ──►  may they use this at all?          ← an ordinary auth problem
   the model   ──►  what can it reach?                 ← a TOOL DESIGN problem
   the provider──►  what did we send outside?          ← a RESIDENCY problem
   the error   ──►  what did we tell them on the way out? ← the one nobody checks
```

Each has a default that is wrong in the same direction: **the convenient
implementation fails open.** This document is four cases of that, three of them
with the code that fixes it.

---

## 2 · The anchor: a guard that cannot fail open

This is the most reusable forty lines in the repo.

```ts
// packages/guard/src/guard.ts:1-31  — VERBATIM
/**
 * Who may call the HTTP surface. Pillar 6.
 *
 * THE FAILURE THIS PREVENTS. The obvious API-key check is:
 *
 *     if (process.env.API_KEY && header !== process.env.API_KEY) return 401;
 *
 * which fails OPEN. Forget the variable in a deploy config and every request is
 * allowed, silently, with no error anywhere. That is an unauthenticated endpoint
 * spending money and reading claims data, shipped by omission. A guard must make
 * a missing value reduce access, never grant it.
 *
 * WHY "UNSET = LOOPBACK ONLY" IS NOT ENFORCED BY READING AN ADDRESS. `.env.example`
 * has always described unset as "loopback-only", and the tempting implementation
 * is to inspect the client address or `x-forwarded-for`. Both are wrong: a proxy
 * header is attacker-controlled, and by the time a request reaches application
 * code the socket may have been through anything. The truthful enforcement of
 * "loopback only" is the LISTENER — bind 127.0.0.1 and nothing else can reach it.
 *
 * So this function encodes what application code can actually know:
 *
 *   key set        → the request must present it. Constant-time compare.
 *   key unset, dev → allowed. The dev server binds localhost; that is the
 *                    loopback guarantee, made by the listener rather than here.
 *   key unset, prod→ REFUSED. We cannot prove the listener is loopback-only, so
 *                    we decline to serve rather than assume. Deployment without
 *                    a key is a configuration error, and it should read like one.
 *
 * This file is transport-agnostic on purpose: no Request, no Response, no
 * framework. That is what lets `pnpm guard:check` exercise every branch offline,
 * including the branches that must DENY.
```

Four ideas, each of which transfers to any system:

**`if (KEY && mismatch) deny` fails open.** Read it again — it is the idiom
everybody writes. Delete the variable from a deploy config and the endpoint is
public, with no error, no warning, and a green deploy. **A guard must make a
missing value reduce access, never grant it.**

**Do not enforce a network property in application code.** "Loopback only" is a
fact about the *listener*, not about a header. `x-forwarded-for` is
attacker-controlled; by the time a request reaches your handler the socket may
have been through anything. Enforce it where it is true — `bind 127.0.0.1`.

**Refusing to serve is a valid outcome.** Unconfigured in production returns
**503**, not 200. A configuration error should read like one, at the boundary,
rather than being silently interpreted as permission.

**Transport-agnostic so the denials are testable.** No `Request`, no `Response`,
no framework — which is what lets `pnpm guard:check` run every branch offline,
*including the branches that must deny*. A guard whose denial paths have never
executed is a guard nobody has tested.

```ts
// packages/guard/src/guard.ts:55-60  — VERBATIM
function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
```

> *"Overkill for a local demo and correct for a shared secret — and getting it
> right here costs three lines, while retrofitting it after a security review
> costs a conversation about why it was not."*

---

## 3 · No stored secret, which is a commercial argument before a technical one

```ts
// packages/providers/foundry/src/client.ts:1-17  — VERBATIM
/**
 * The one place Foundry clients are constructed.
 *
 * Auth is DefaultAzureCredential, which resolves in order: env vars
 * (AZURE_CLIENT_ID / TENANT_ID / CLIENT_SECRET — a service principal), then
 * managed identity, then the az CLI login. That ordering is the point: the same
 * code runs locally against `az login` and in Azure against a managed identity,
 * with no branch and no key in config.
 *
 * For a regulated customer this is not a style preference. A security review
 * that finds a static API key in a config file can shelve the whole engagement
 * regardless of how good the AI is — see FDE.md Pillar 6.
 *
 * SCOPE MATTERS. Foundry data-plane tokens must be issued for
 * `https://ai.azure.com/.default`. Asking for the cognitiveservices scope
 * yields a token that authenticates fine and is then rejected with
 * "audience is incorrect" — which reads like a credential problem and isn't.
```

> **A security review that finds a static API key in a config file can shelve
> the whole engagement regardless of how good the AI is.**

The mechanism is a credential *chain*: env vars → managed identity → the CLI
login. One code path, no branch, no key — the same binary authenticates on a
laptop and in production because the *environment* differs, not the code.

The scope note is the kind of thing that costs an afternoon: a token minted for
the wrong audience **authenticates successfully** and is then rejected with
*"audience is incorrect"*. It reads like a broken credential and is a wrong
constant.

### The compliance assertions, which are also credentials work

`pnpm compliance:check` captures the actual outgoing request and asserts three
things. The third is the one worth stealing:

- `store: false` — no server-side conversation state
- no server-side state beyond the request
- **the Agents SDK tracing exporter, which defaults ON and ships to
  `api.openai.com`, stays disabled even with `OPENAI_API_KEY` set**

That third assertion exists because a *default* was quietly sending data
outward. Nobody configured it. Nobody would have found it by reading their own
code. **The only way to know what you send is to capture what you send** — which
is what that check does, and why `pnpm compliance:mastra` mirrors it for the
second engine rather than trusting that two engines behave alike.

---

## 4 · The tool set is the blast radius

```ts
// apps/ai/steering/src/agent/loop/assess-requirement.ts:1-8  — VERBATIM
/**
 * One customer requirement in, one assessed dossier out.
 *
 * ── THE MODEL NEVER TOUCHES THE DATABASE OR THE INDEX ────────────────────
 *
 * It receives the RESULT of a search and the RESULT of a comparables query.
 * Both tools run here, in our process, over connections it cannot see. That is
 * the whole reason pillar 2 is called the tool loop rather than "give it SQL".
```

Give the model SQL and its capability is "whatever SQL can do". Give it two
named tools and its capability is those two tools:

- it cannot reach a table you did not expose
- it cannot write, because no tool writes — asserted by `pnpm guard:check` and
  `pnpm pharma:sql-check`
- every access is a typed call you can log, replay as a fixture, and assert on
- **the credentials are never in the context window**, so they cannot be echoed
  back inside an answer

That last one connects directly to [`INJECTION.md`](INJECTION.md) §2: the third
leg of the lethal trifecta is *external communication*, and the reason no
engagement here has it is that no tool does it. **Capability is the defence that
does not depend on the model's judgment.**

---

## 5 · The error path, which nobody checks

```ts
// packages/guard/src/public-error.ts:1-28  — VERBATIM
/**
 * What an exception is allowed to tell the caller. Pillar 6, same file family
 * as the key check for the same reason: both are decisions about what crosses
 * the boundary.
 *
 * THE FAILURE THIS PREVENTS. The obvious catch block is:
 *
 *     catch (e: any) { return json({ error: e?.message ?? String(e) }, 503) }
 *
 * which is fine until the throw comes from the database driver. Then the
 * caller is handed
 *
 *     getaddrinfo ENOTFOUND ep-shy-tree-xxxxxxx-pooler.c-2.eu-central-1.aws.neon.tech
 *
 * and now they know the project id, the pooler, the region and the provider —
 * none of which they asked for and none of which they need. The same block
 * cheerfully forwards absolute build paths, internal hostnames, and the
 * user/host halves of a connection string in an auth error.
 *
 * SO: the exception goes to the LOG, and the caller gets a reference to it.
 * Nothing is lost — `az containerapp logs show` still has the full text, and
 * the ref is what joins the two. That trade is deliberate: an operator reading
 * a screenshot loses one hop, and a caller gains nothing they can use.
 *
 * WHY NOT REDACT AND FORWARD. Scrubbing hostnames and paths out of the message
 * is a denylist, and a denylist over "every string a dependency might throw" is
 * a guess that holds until some driver phrases its error differently. The
 * boundary is easier to defend when nothing crosses it by default.
```

Two general lessons:

**Your dependencies write your error messages.** You did not choose to disclose
the Neon project id, region and pooler — `pg` did, and your catch block
forwarded it. Every dependency you add is a new author of strings that cross
your boundary.

**Allowlist, not denylist.** Scrubbing is a guess about every string a
dependency might ever throw. *Nothing crosses by default; a reference joins the
two halves.* The operator loses one hop; the caller gains nothing usable.

---

## 6 · What a real scan found here — including what was NOT fixed

**MEASURED HERE** — `docs/SECURITY-REVIEW.md`, a scan of the repo *and its git
history*. Eight findings. The most instructive is the first, and the reason is
its resolution.

**Finding 1 (MEDIUM):** `infra/pharma/DEPLOY.md` published five real GUIDs — the
subscription id, the container app's managed-identity principal id, the deploy
app registration's client id, its service principal object id and the tenant id.

The analysis is the part to learn from:

> None is a credential — auth is OIDC workload-identity federation and there is
> no secret to steal. But tenant id + client id together name the exact app
> registration to attack […] Entra will only mint a token for the real repo's
> OIDC claim, so the practical risk is bounded: **this is disclosure, not
> compromise.**

> It is, however, the finding a customer's security reviewer opens with.

Redacted going forward. And then the decision that makes this worth reading:

> **The identifiers remain in git history, and that is accepted.**

On three stated grounds: they are identifiers rather than secrets, so there is
nothing to rotate short of recreating the app registration; **a history rewrite
would not actually remove them**, because GitHub keeps orphaned commits
addressable by SHA indefinitely after a force-push; and the redaction closes the
path that matters, which is anyone browsing the repo.

> **An accepted risk, written down with its reasoning, is a stronger security
> posture than a fix that does not work.** The failure mode being avoided is the
> force-push that feels like remediation, is recorded as remediation, and leaves
> the data served at a URL.

Other findings worth carrying: raw error messages reaching clients (§5 is the
fix); the steering **dev** server binding every interface with no key; and an
unhandled `pg` Pool error killing the whole process — a *availability* boundary
failing for the same reason the others do, because the convenient code path
assumed success.

---

## 7 · Code

### The guard, generalised

```ts
// ASSEMBLED — the shape, with the fail-open branch impossible to write.
type Decision =
  | { ok: true;  reason: 'key matched' | 'dev loopback' }
  | { ok: false; status: 401 | 503; reason: string };
//                       ^^^ 503 AND 401 ARE DIFFERENT OUTCOMES.
//   401 = you did not present a valid key.
//   503 = WE are misconfigured and decline to serve.
//   Collapsing them into 401 tells an operator their deploy is fine and the
//   caller is wrong, which is the opposite of true.

export function authorize(i: { configuredKey?: string; presentedKey?: string | null; isDev: boolean }): Decision {
  const configured = (i.configuredKey ?? '').trim();

  // THE UNCONFIGURED BRANCH COMES FIRST, and it is the whole design. Written
  // last, it becomes an `if (configured && ...)` and fails open.
  if (!configured) {
    return i.isDev
      ? { ok: true, reason: 'dev loopback' }
      : { ok: false, status: 503, reason: 'API_KEY is not configured. Refusing to serve.' };
  }

  const presented = (i.presentedKey ?? '').trim();
  if (!presented) return { ok: false, status: 401, reason: 'missing x-api-key header' };
  if (!sameSecret(configured, presented)) return { ok: false, status: 401, reason: 'x-api-key does not match' };
  return { ok: true, reason: 'key matched' };
}
```

### Test the denials, in both directions

```ts
// ASSEMBLED — what `pnpm guard:check` is. Note the SHAPE of the table: every
// row is an EXPECTED OUTCOME, and half of them are denials. A guard suite
// listing only the allow cases proves the door opens, not that it closes.
const CASES: Array<[string, GuardInput, Partial<Decision>]> = [
  ['unconfigured in prod REFUSES',   { isDev: false },                                     { ok: false, status: 503 }],
  ['unconfigured in dev allows',     { isDev: true },                                      { ok: true }],
  ['configured, no header',          { configuredKey: 'k', isDev: false },                 { ok: false, status: 401 }],
  ['configured, wrong key',          { configuredKey: 'k', presentedKey: 'x', isDev: false }, { ok: false, status: 401 }],
  ['configured, right key',          { configuredKey: 'k', presentedKey: 'k', isDev: false }, { ok: true }],
  // THE ONE PEOPLE FORGET: empty string is not "configured".
  ['empty key is unconfigured',      { configuredKey: '  ', isDev: false },                { ok: false, status: 503 }],
];
```

### The error boundary

```ts
// ASSEMBLED — nothing crosses by default.
export function publicError(e: unknown, log: Logger): { ref: string; message: string } {
  const ref = randomUUID().slice(0, 8);
  log.error({ ref, err: e });                    // the FULL text, to the log
  return {
    ref,
    // A fixed string. Not the message, not a scrubbed message, not the error
    // class — a denylist over "every string a dependency might throw" is a
    // guess that holds until some driver phrases its error differently.
    message: `Something went wrong. Quote reference ${ref} to an operator.`,
  };
}
```

---

## 8 · When this is over-engineering

| | |
|---|---|
| **A local-only tool nothing else can reach.** | The dev-loopback branch exists precisely so a developer is not forced to set a secret before the app starts — *"which is how people end up committing one."* |
| **No private data at all.** | If the model reads nothing a stranger could not, the boundary is a cost centre. That is rare; check before assuming it. |
| **You have not yet drawn the boundaries.** | §1's four arrows take ten minutes and usually find one nobody owns. Do that before writing any code on this page. |

And the inversion worth keeping: **the cheapest security work is refusing a
capability.** No write tool, no external send, no secret in config — three
absences that cost nothing to maintain and remove whole categories of finding.

---

## 9 · Figure data for the UI

> `detail` → `note`. `Matrix` has exactly three states.

```jsonc
// FIG-CRD-1 · <Stages> — illustration. The four boundaries of §1.
[ { "verb": "caller",   "out": "401 · 503 · ok",       "does": "may they use this at all?",     "rule": "unset key = REFUSE in prod, not allow" },
  { "verb": "model",    "out": "two named tools",      "does": "what can it reach?",            "rule": "a tool set is a capability grant" },
  { "verb": "provider", "out": "the captured request", "does": "what did we send outward?",     "rule": "assert it; a default was shipping traces" },
  { "verb": "error",    "out": "a reference, not a message", "does": "what did we say on the way out?", "rule": "nothing crosses by default" } ]

// FIG-CRD-2 · <Matrix> — MEASURED HERE, pnpm guard:check. THE DENIALS ARE THE POINT.
// marks: live="allowed" · wired="—" · refuses="denied"
// columns: outcome | status
[ { "row": "unconfigured, production", "cells": ["refuses"], "detail": "503 — declines to serve rather than assume" },
  { "row": "unconfigured, dev",        "cells": ["live"],    "detail": "the LISTENER binds loopback; that is the guarantee" },
  { "row": "configured, no header",    "cells": ["refuses"], "detail": "401" },
  { "row": "configured, wrong key",    "cells": ["refuses"], "detail": "401, constant-time compare" },
  { "row": "configured, right key",    "cells": ["live"],    "detail": "the only allow path in production" },
  { "row": "empty-string key",         "cells": ["refuses"], "detail": "503 — an empty string is not 'configured'" } ]

// FIG-CRD-3 · <BarRows> — MEASURED HERE. docs/SECURITY-REVIEW.md, 8 findings.
// UI: this is a COUNT of findings by severity, and the caption must say the
// scan is DATED. Do not let it read as a current posture.
[ { "label": "MEDIUM", "value": 3, "note": "identity map published · dev server on every interface · unhandled pg Pool error" },
  { "label": "LOW",    "value": 3, "note": "raw errors to clients · deploy job does not assert the guard · dependency advisories" },
  { "label": "INFO",   "value": 2, "note": "build artifacts committed · a dead env var" } ]

// FIG-CRD-4 · <Funnel> — MEASURED HERE. Finding 1's resolution, which is the lesson.
[ { "n": 5, "label": "real GUIDs in a public file",   "op": "committed" },
  { "n": 0, "label": "still in the working tree",     "op": "redacted",  "why": "to <subscription-id>-style placeholders. The prose is unchanged — its value was always the explanation, not the ids." },
  { "n": 5, "label": "still reachable in git history","why": "ACCEPTED. A force-push would not remove them: GitHub keeps orphaned commits addressable by SHA." } ]
```

---

## 10 · Run it

| command | what it does | cost |
|---|---|---|
| `pnpm guard:check` | every branch, **including every denial** | free, offline |
| `pnpm compliance:check` | captures the real outgoing request; asserts `store:false` and tracing off | free |
| `pnpm compliance:mastra` | the same, for the second engine | free |
| `pnpm pharma:sql-check` | the answer path cannot write to a system of record | free |
| `pnpm env:check` | is `.env` filled in | free |
| `pnpm leak:check` | no domain vocabulary — and it plants a leak to prove it catches one | free |

---

## Sources

In-repo, and deliberately so — this document's material is the repo's own
security work rather than a literature review:
`packages/guard/src/guard.ts` · `packages/guard/src/public-error.ts` ·
`packages/providers/foundry/src/client.ts` ·
`apps/ai/steering/src/agent/loop/assess-requirement.ts` ·
`docs/SECURITY-REVIEW.md` · `docs/steering/DATA-RESIDENCY.md`

External: OWASP, *Top 10 for LLM Applications* —
<https://owasp.org/www-project-top-10-for-large-language-model-applications/> ·
Microsoft, *DefaultAzureCredential* —
<https://learn.microsoft.com/azure/developer/javascript/sdk/authentication/credential-chains>
