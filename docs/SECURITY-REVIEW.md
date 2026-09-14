# Security review — public-repo exposure

Scan date: 2026-09-14 · Commit `c2225db` · Remote
`https://github.com/amirHosseinKhademii/FDE-Assistants` (public)

Scope: every blob reachable from all refs **and from the reflog** (1,999 blobs
across 41 commits plus one reset-away commit), every tracked file, the deploy
workflow, the three Dockerfiles, all twelve `/api/*` routes, the SQL paths and
the dependency tree.

> This document deliberately does **not** reproduce the identifiers it reports.
> Finding 1 is about a file that lists them; restating them here would publish
> the same thing twice. Line numbers are given instead.

## Status

Reviewed and remediated 2026-09-14.

| | |
|---|---|
| 1 · Azure identity map | **redacted going forward.** Still in git history, and that is an accepted risk — see the finding for why, and for what the real remediation would be if it is not. |
| 2 · raw error messages | **fixed** — `publicError()` in `@fde/guard`, all ten sites converted |
| 3 · steering guard assertion | **fixed** — the smoke test now requires a 401 |
| 4 · dependency advisories | accepted; not reachable from user input |
| 5 · committed build artifacts | left alone; noise, not a security issue |
| 6 · dead `UI_API_KEY` | left alone; a local `.env` value, never committed — but see 7, it is the fix for it |
| 7 · steering dev server open on the LAN | **found by running the apps.** Dev-only, live now, one-line fix — awaiting your call |

## Verdict

**No value matching a known provider credential format, and no value present in
the current `.env`, appears anywhere in the repository's history.** Nothing
found requires a history rewrite or a key rotation.

That is the honest scope. A credential that was rotated before 2026-09-14 would
sit outside both checks — if any secret was ever in use that is not in today's
`.env`, name it and it can be grepped directly.

The one thing worth acting on is an infrastructure disclosure in
`infra/pharma/DEPLOY.md`.

## What was checked and came back clean

| Check | Result |
|---|---|
| Known-prefix scan over every blob — `sk-`/`sk-proj-`, `ghp_`/`github_pat_`, `AKIA`/`ASIA`, `AIza`, `xox*`, JWTs, PEM blocks, `npm_`, `glpat-`, `hf_`, `napi_`, `pk-lf-`/`sk-lf-`, Stripe, SendGrid | zero hits |
| **Every value in `.env` ≥12 chars grepped verbatim against every blob**, plus each URL's password and hostname component in isolation | `DATABASE_URL`, `PHARMA_DATABASE_URL`, `UI_API_KEY` and the Foundry endpoint: **never committed** |
| Reflog-only objects (43, from a local `reset`) | scanned separately; clean. `bdd7d76` is **not** an ancestor of `origin/master`, so it never reached GitHub |
| Env files on disk | exactly one real file. `apps/web/insurance-app/.env` is a **symlink** to it, not a second file |
| `.env` ignore status | `.gitignore:3`, confirmed by `git check-ignore` |
| `.dockerignore` | excludes `.env` / `.env.*` **since the initial commit** (`96b1a5e`) — no image layer can ever have carried it, despite `COPY . .` |
| AWS credentials (an STS session token was live on this machine) | absent from tracked files and from history |
| Author emails | `amirhk.sw@gmail.com`, `sourena2575@gmail.com` only — no corporate address leaked |
| Corpus PII | fictional only (`doi.calumet.gov`); no SSNs, no card numbers, no real personal data |
| SQL injection | none. The only interpolated identifiers (`packages/estate/src/estate.ts:94,120`) come from `as const` system lists; everything else is parameterised. `api.history.tsx` allow-lists its one query param |
| XSS sinks | no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` |
| Workflow trigger | `push: [master]` + `workflow_dispatch`. No `pull_request_target` — no fork-takeover path |
| `VITE_*` build-time inlining | only sibling app URLs are inlined; no secret is passed as `VITE_*` |
| CORS | not enabled anywhere — same-origin only |

### Two history hits that look alarming and are not

- `process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key'` — a compliance-test
  literal, exactly what it says it is.
- `postgresql://postgres:postgres@localhost:5433/postgres`,
  `claims:claims@localhost`, `langfuse:langfuse@langfuse-db`,
  `user:password@host.neon.tech`, `hunter2` — all localhost or documented
  placeholders.

### The guard is genuinely well built

`packages/guard/src/guard.ts` fails **closed**: an unset `API_KEY` in production
returns 503 rather than serving, the dev bypass keys off `import.meta.env.DEV`
(a build-time constant, false in shipped bundles), and the comparison uses
`timingSafeEqual`. All twelve `/api/*` routes call it, and the pharma deploy job
asserts a live 401 after every deploy.

## Findings

### 1 — MEDIUM · `infra/pharma/DEPLOY.md` published the whole Azure identity map

Five real GUIDs were committed to a public file: the **subscription id**, the
container app's **managed-identity principal id**, the deploy app registration's
**client id**, its **service principal object id** and the **tenant id**. Two
lines also named the Foundry resource, which carries a person's name, and
`deploy.yml` names the resource group.

None is a credential — auth is OIDC workload-identity federation and there is no
secret to steal. But tenant id + client id together name the exact app
registration to attack, and the workflow header prints the federated subject
string right next to them. Entra will only mint a token for the real repo's OIDC
claim, so the practical risk is bounded: this is disclosure, not compromise.

It is, however, the finding a customer's security reviewer opens with, which is
awkward in a repo whose whole subject is FDE practice.

**REDACTED GOING FORWARD.** All five GUIDs and the resource name are now
`<subscription-id>`-style placeholders in `infra/pharma/DEPLOY.md` and
`infra/steering/DEPLOY.md`. Every word of the prose is unchanged, because the
document's value was always the explanation and not the ids; a note above the
table gives the three `az` commands that read the real values back, so the file
is still usable by whoever deploys next.

**The identifiers remain in git history, and that is accepted.** Each still sits
in one or two reachable blobs, so `git log -p -- infra/pharma/DEPLOY.md` on
GitHub serves them. Accepting that is deliberate, on three grounds:

1. They are identifiers, not secrets. There is nothing to rotate except the app
   registration itself (delete and recreate `gh-deploy-pharma`, re-register both
   federated credentials), which is disproportionate to the exposure.
2. A rewrite would not actually remove them. GitHub keeps orphaned commits
   addressable by SHA indefinitely after a force-push, absent a support request.
3. The redaction still closes the path that matters — anyone browsing the repo,
   and any automated scanner reading HEAD.

If that trade is not wanted, the real remediation is recreating the app
registration, not rewriting history.

**Note:** the full Foundry endpoint hostname appears *only* in reflog-only
objects that never reached GitHub. Only the bare resource name was public.

### 2 — LOW · raw error messages returned to clients

Ten routes return `e?.message ?? String(e)` straight to the caller — e.g.
`apps/web/pharma-app/src/routes/api.history.tsx:60`,
`apps/web/steering-app/src/routes/api.summary.tsx:82,112`,
`apps/web/steering-app/src/routes/api.explain.tsx:71`. A Postgres connection
failure surfaces as `getaddrinfo ENOTFOUND ep-….neon.tech`, disclosing the
database hostname. The guard means a caller already holds the API key, which is
why this is low rather than medium.

**FIXED.** New `publicError()` in `@fde/guard` (`packages/guard/src/public-error.ts`)
— the exception goes to the server log under an 8-hex ref, the caller gets a
fixed message carrying that ref. All ten sites converted.

Redaction was rejected in favour of suppression: scrubbing hostnames out of a
message is a denylist over "every string a dependency might throw", which holds
until a driver phrases an error differently.

Two of the ten were worse than the report first described. In
`api.ask.tsx` and `api.supplier.tsx` (pharma) the same object is *persisted*
via `recordAsk` and read back out by `/api/history` — sanitising only the SSE
frame would have left the identical text on the slower path. The fix builds the
safe object before it is filed.

`recordAssessment`'s `{ filed, error }` return was checked and is **discarded**
at both route call sites; it surfaces only in the local CLI, so it is not a
third path.

Five `e?.message` sites remain in `apps/web/steering-app/src/hooks/` and
`components/Explain.tsx`. Those are **browser** code catching its own `fetch`
errors — no server internals pass through them.

Guard self-test extended with five outbound cases, including one asserting the
real error still reaches the log. The fixture hostname there is deliberately
synthetic (`example.invalid`): the first draft pasted the real one in from this
scan, which would have committed the exact string the function exists to
suppress.

### 3 — LOW · the steering deploy job does not assert the guard

`deploy.yml:405-440` (pharma) curls the API and requires a 401 — its own comment
explains that an empty `API_KEY` would otherwise "serve a perfectly
healthy-looking assistant to anyone on the internet". The steering job
(`deploy.yml:300-338`) only asserts the landing page rendered, and steering's
`/api/assess` is the expensive route.

Fail-closed means a misconfiguration yields 503, not open access — so this is a
missing tripwire rather than a hole. It is the tripwire that would catch a
future regression in the `isDev` detection.

**FIXED.** The steering smoke test now POSTs `/api/assess` without a key and
requires 401, mirroring pharma. Its error message distinguishes the three
outcomes — 401 correct, 503 meaning `API_KEY` is unset on the app, 200 meaning
not guarded at all — because "not 401" alone would send someone to the wrong
half of the problem. The guard runs before the body is parsed, so the payload
only needs to be valid JSON.

### 4 — LOW · dependency advisories, all in the optional local-embeddings path

`pnpm audit`: 3 high, 1 moderate, 2 low — every one transitive through
`@huggingface/transformers` → `onnxruntime-node` → `adm-zip`, and `sharp` →
libvips/libheif. They are zip- and image-parsing bugs, reachable only by feeding
untrusted archives or images to those libraries; this app feeds them model files
from Hugging Face and no user input. `sharp`'s advisories have no patched
version.

### 5 — INFO · build artifacts committed

Six generated TanStack router temp files are tracked under
`apps/web/veresk-app/.tanstack/tmp/`. Noise, not a security issue. Add
`.tanstack/` to `.gitignore` and `git rm -r --cached` them.

### 6 — INFO · `UI_API_KEY` in `.env` is dead

A 64-hex value that no code reads — the guard reads `API_KEY`, which is empty.
Dead secrets invite the assumption that something is protected when nothing is.
Rename it to `API_KEY` or delete it.

### 7 — MEDIUM · the steering DEV server is on every interface with no key

*Found on 2026-09-14 by running the apps, not by reading them. It is invisible
to a code read, because each half is correct on its own.*

`apps/web/steering-app/vite.config.ts` sets `server.host = true` and
`allowedHosts: true`, for a documented reason: an editor's built-in browser
reaches the page through a forwarded port on a different host, and a
loopback-only bind shows it a blank screen. The block ends:

> "...and the guard on every API route is unaffected: it is fail-closed and
> does not care which host asked."

**That sentence is false for the dev server specifically.** `authorize()` with
no `API_KEY` and `isDev: true` returns `{ ok: true, reason: 'dev loopback' }`.
The dev bypass exists because — in `guard.ts`'s own words — "the dev server
binds localhost; that is the loopback guarantee, made by the listener rather
than here." This listener does not make that guarantee. `host: true` removed it
and the guard was never told.

Observed live, from this machine's LAN address rather than loopback, with
`API_KEY` empty in `.env`:

    GET http://<lan-ip>:3400/api/requirements   200   ← real requirement text
    GET http://<lan-ip>:3400/api/history        200
    GET http://<lan-ip>:3400/api/summary        200

`POST /api/assess` was deliberately not sent — it spends Foundry tokens — but
it calls the identical `authorize()`, so anyone on the same network can spend
them while `pnpm steering:dev` is running. The other three apps bind loopback
and refuse (`pharma` on the same address: connection refused).

Scope: **development only.** Production sets `API_KEY`, and
`import.meta.env.DEV` is false in a built bundle, so the deployed app is
unaffected — the 401 the smoke test now asserts (finding 3) proves it.

**Fix, one line:** set `API_KEY` in `.env`. With a key configured the guard
requires it *regardless* of `isDev`, so the dev bypass stops applying. The desk
already has a key field persisted in `localStorage`, so it is a one-time paste.
This also resolves finding 6 — `UI_API_KEY` is an unused 64-hex value that
appears to have been generated for exactly this and never wired up; renaming it
to `API_KEY` does both jobs at once.

The alternative — teaching the route that `isDev` no longer implies loopback —
is more honest but lands in the same place, because the only safe thing it can
then do is demand a key.

## Not findings, but worth knowing

- `infra/docker-compose.langfuse.yml` ships `dev-salt-replace-me`,
  `NEXTAUTH_SECRET: dev-secret-replace-me` and a hardcoded `ENCRYPTION_KEY`.
  Correct for a local dashboard, dangerous if that file is ever deployed to a
  reachable host. Its own header says so.
- Three Docker Hub repos (`docker.io/amir2575/*`) are named in the workflow. If
  those are public the images are pullable; `.dockerignore` has excluded `.env`
  since the first commit, so they should hold nothing the source does not.

## Open item — needs credentials this scan did not have

`gh` is not authenticated here, so two GitHub-side checks were not run. After
`gh auth login`:

```bash
gh repo view amirHosseinKhademii/FDE-Assistants --json visibility,isPrivate
gh api repos/amirHosseinKhademii/FDE-Assistants/secret-scanning/alerts
```

GitHub's own secret scanning sees pushed objects this clone may not have, and
confirms the repo's actual visibility rather than assuming it.
