# What our checks evidence, and where that evidence stops

*Written 2026-09-13, prompted by the question "should we use Vanta for data
compliance here?" The answer turned out to be less interesting than the reason,
so this is the reason.*

*Companion to [`DATA-RESIDENCY.md`](DATA-RESIDENCY.md), which asks **what leaves
the building**. This one asks the question after it: **what does a security
reviewer get to write down, and on whose word.***

---

## The word "compliance" is already taken in this repo

`pnpm steering:derived-compliance-check` is a wire capture. It asserts on the
bytes of one outgoing HTTP request. That is a narrow, technical thing and the
name has been fine for it.

**A compliance *platform* means something else entirely** — an organisation-level
programme covering people, laptops, vendors, policies and access reviews. The
two share a word and almost nothing else. This document says **control** for the
second sense throughout, and every reference to the check itself is written out
in full. Anyone extending this should keep that apart, because conflating them
is how a reviewer ends up believing a green tick covers their staff offboarding.

---

## The distinction that decides the whole question

There are two kinds of assurance, and they are not substitutes.

| | **evidence of a property** | **evidence of a programme** |
|---|---|---|
| asks | what does this system actually do? | does this organisation run itself properly? |
| looks at | the captured request, the source, the schema | cloud config, identity provider, HR, code host |
| produced by | the checks in this repo | a control-monitoring platform |
| strength | a measurement | an attestation, continuously re-checked |
| example | `store: false` read from the outgoing bytes | every employee signed the security policy |

**We are strong on the left column and absent on the right.** Nothing in this
repo knows whether the person who wrote it has an encrypted laptop, and it never
will — that is not a gap in the code, it is a different category of claim.

---

## The controls we can evidence today

Each row names the check, the property it establishes, and — the column that
matters — **what it reads**. A check that reads source is weaker than one that
reads bytes, and a reviewer who knows the difference will ask.

### Data protection

| control | check | what it reads | strength |
|---|---|---|---|
| One destination host, inside our own tenant, in the EU | `steering:derived-compliance-check` | the captured request URL | measurement |
| No provider-side retention of prompts (`store: false`) | `steering:derived-compliance-check` | the outgoing body bytes | measurement |
| No server-side conversation state accumulates | `steering:derived-compliance-check` | absence of `previous_response_id` / `conversation` | measurement |
| Authentication is a short-lived Entra token, not a static key | `steering:derived-compliance-check` | the `Authorization` header | measurement |
| Only prose that needs reading comprehension is sent — 220 of 1,069 files | `DATA-RESIDENCY.md` §"the design point" | the pipeline split | design, then measured per-request |
| Secrets are not printed by the tooling | `steering:env-check` (`redact`) | its own output | measurement |

### Access control and segregation

| control | check | what it reads | strength |
|---|---|---|---|
| The answer path cannot write to any system | `steering:sql-check` | every SQL string under `tools/` and `agent/` | **source** |
| The answer path cannot read the customer's operational databases | `steering:sql-check` | symbol names under `tools/` and `agent/` | **source** |
| The one component that records an assessment cannot reach the customer's estate | `steering:sql-check` | `src/answer/` — the file that writes and the file that names the estate must be different files | **source** |
| The ingest cannot reach the customer's estate | `steering:derived-boundary-check` | banned symbols and literal db names, comments included | **source** |

**The third row was added on 2026-09-13 and the reason is worth stating**, because
it is the only place in this estate where the answer path writes anything. Filing
a finished assessment into our own `vst_derived` had lived in the web app, where
`sql-check` did not look at all — it scans a named set of directories and an app
route was never in it. When the command line needed to file too, the code moved
into the package, and the scope hole moved with it unless something was done. So
the exemption is now split and asserted: `filed-assessments.ts` writes and may
not name `vst_alm`; `requirements.ts` names `vst_alm` and may not write. A single
file doing both would be a write path holding a handle to the customer's system
of record.

The same pass removed two false positives the check had been carrying: `drop`,
`truncate` and `alter` matched those words as ORDINARY ENGLISH in comments, so a
file containing nothing but selects failed. Every verb now requires the object a
real SQL statement gives it, and the check asserts BOTH directions — six planted
statements caught, five innocent sentences left alone. A control that fires on
prose is one the next engineer routes around, and then it evidences nothing.

All three rows are source-level and say so. `sql-check`'s own header states the
real control it stands in for: **a read-only Postgres role on the answer path's
connection string**, which this estate does not have. That sentence is worth
more to a reviewer than the tick above it.

### Correctness and change management

| control | check | what it reads |
|---|---|---|
| The answer contract holds, and every field keeps its description | `steering:schema-check` | the Zod schema |
| Every eval check maps to a severity bucket | `steering:severity-check` | the check registry |
| The checks themselves are tested against known-good and known-bad answers | `steering:checks-check` | fixtures |
| A summary across assessments cannot invent a requirement, lose a refusal, or add a refusal into a total | `steering:summary-check` | fixtures |
| Retrieval returns what it should | `steering:retrieval-check`, `steering:search-tool-check` | the index |
| The estate is internally consistent, and detects deliberate corruption | `steering:estate-check`, `steering:sabotage-check` | the databases |
| Behaviour is measured over repeat runs, with baselines and diffs | `steering:eval` | recorded runs |

### Cost and traceability

| control | mechanism |
|---|---|
| Per-request token and cost accounting | `src/telemetry/prices.ts`, per-deployment rates |
| Trace history for every assessment | Langfuse, self-hosted — no third-party host when unset |

---

## What a control platform covers that we do not, at all

This is the honest half, and it is longer than most people expect.

- **People** — background checks, onboarding and offboarding, security-awareness
  training, policy attestation, who still has access after they left.
- **Devices** — disk encryption, screen lock, endpoint protection, patch level on
  every laptop that touches the code.
- **Identity** — MFA enforcement, least-privilege review, periodic access
  recertification across every system.
- **Vendors** — the sub-processor register, each one's DPA, each one's own
  certification, and re-review when they change.
- **Change management as a process** — not "does the code assert this", but "was
  every change reviewed, by whom, and can you show a year of it".
- **Incident response** — a written plan, named owners, evidence it was
  exercised.
- **Business continuity** — backups that have actually been restored.
- **The paperwork of GDPR specifically** — records of processing activities,
  lawful-basis documentation, a data-subject-request workflow, retention
  schedules, breach-notification timelines.

None of these are code properties. No amount of checking in this repo produces
any of them, and a customer's security reviewer will ask for most of them.

---

## So: Vanta, or not

**Not for this engagement.** A control-monitoring platform connects to real cloud
accounts, a real identity provider and a real HR system belonging to a real
company, under a paid contract. This is a practice repo. Wiring it in would
produce a dashboard of controls over an organisation that does not exist — which
is the worst kind of green, because it is indistinguishable from the real thing
at a glance.

**And it would not close anything that is actually open.** Of the three claims
[`DATA-RESIDENCY.md`](DATA-RESIDENCY.md) refuses to make, a platform changes
exactly zero:

| open item | would a control platform close it? |
|---|---|
| Modified Abuse Monitoring not applied for — Azure retains prompts up to 30 days by default | **No.** It would carry it as a risk item with an owner and a date. The fix is filing the application. |
| `publicNetworkAccess: Enabled` — no Private Endpoint | **No.** It would *detect* it and flag it. The fix is an Azure configuration change. |
| "Microsoft does not train on your data" | **No.** Contractual. It would store the DPA, which is genuinely useful, and prove nothing. |

The highest-value action available on the data-protection side is **filing the
Modified Abuse Monitoring application before this runs on real documents.** That
is the live gap. It costs a form, not a contract.

### The tension worth naming out loud

Steering's whole pitch is *Sweden-resident, nothing leaves the tenant, one host
and we can show you the bytes*. Granting a US-based SaaS read access into that
Azure subscription and into the code host is a real counterweight to that
sentence. Every serious company does it and it is not disqualifying — but it is
a mark against, not a neutral, and a reviewer who is paying attention will
notice it before we do.

### When the answer flips

At a real engagement it flips quickly, and for a reason that has nothing to do
with the code: an enterprise buyer asks for SOC 2 or ISO 27001, and that is a
programme with an auditor, not a property of a system. At that point a
control-monitoring platform is the cheap way to run it, this document becomes the
data-protection section of the evidence rather than the whole of it, and the
tables above are what you hand the auditor for the parts a platform cannot see.

---

## What this document is not

It is **not a control mapping to SOC 2 TSC or ISO 27001 Annex A clause numbers.**
Those identifiers are written from the current published criteria against a
specific audit scope, and a list of them reconstructed from memory is the kind of
artifact that looks authoritative and is wrong in ways nobody checks. The
groupings above are descriptive — data protection, access control, change
management — and map onto any framework's families without pretending to be
citations.

Likewise, no claim is made here about any platform's pricing, integration
catalogue or feature set. Those change, and they belong in a vendor evaluation
with a date on it.

---

## The commands, if a reviewer wants them run in front of them

```bash
pnpm steering:derived-compliance-check    # the outgoing request, captured and asserted on
pnpm steering:derived-boundary-check      # the ingest cannot open the answer key
pnpm steering:sql-check                   # nothing on the answer path writes
pnpm steering:schema-check                # the answer contract holds
pnpm steering:severity-check              # every eval check has a severity
pnpm steering:summary-check               # a refusal never becomes a number
```

All six are offline and take about a second. Running them is a different
conversation from reading a slide, which is the entire argument of
[`DATA-RESIDENCY.md`](DATA-RESIDENCY.md) and the reason this repo has them.

---

## Which certificate, and the answer is probably not SOC 2 — researched 2026-09-13

Asked directly: *"how do we get SOC 2 so a customer trusts us, from Sweden?"*
The research says that is the wrong target, for two separate reasons.

**Geography.** SOC 2 dominates US procurement — roughly 80% of US enterprises
ask for it. **European enterprise buyers ask for ISO 27001**, and under NIS2 it
has become the de facto signal for EU digital service providers and their
suppliers. A Swedish vendor selling into Europe who certifies SOC 2 first has
certified for an audience they do not have.

**Industry, and this one is sharper.** For an automotive Tier-1 — which is
exactly who this engagement's customer is — neither is the first ask. It is
**TISAX**, the VDA/ENX assessment:

> TISAX is mandatory for all companies acting as suppliers, service providers or
> partners to OEMs and Tier 1 suppliers, regardless of company size. **IT
> service providers providing software development, cloud hosting or IT
> infrastructure to automotive companies are specifically in scope.**

VW, BMW and Mercedes each require it of their suppliers. ISA2027 publishes in
January 2027, so timing matters for anyone starting.

### The order that follows from that

| | when | why |
|---|---|---|
| **ISO 27001** | first, when a real customer's procurement asks | what EU buyers actually request; 6–12 months, and the ISMS is the work rather than the audit |
| **TISAX** | only if selling to automotive | reuses most of an ISO 27001 ISMS; assessed by an ENX-approved provider |
| **SOC 2** | only when a US customer asks | 65–75% control overlap, so 30–40% extra effort AFTER the first, not a separate project |

**None of them is needed to demo.** A certificate is about handling a customer's
real data; a demo on synthetic data is a different question, and this repo
answers that one with measurements rather than attestations.

---

## When a customer asks "are you compliant?"

It is almost never one question, and the first move is finding out which one.

| they say | they want | needs a certificate? |
|---|---|---|
| "are you SOC 2 / ISO 27001?" | a certificate for the vendor file | yes |
| "fill in our security questionnaire" | SIG Lite (~130 questions) or CAIQ | **no** |
| "we need a DPA" | a contract, usually their template | **no** |
| "who are your sub-processors?" | a one-page list | **no** |
| "where does the data live?" | a region, and whether it leaves it | **no** |

Four of five are answerable today, and they are the ones procurement blocks on.

### What to have ready

1. **A one-page security overview** — hosting, region, authentication, data
   flow, access. Writable straight out of [`DATA-RESIDENCY.md`](DATA-RESIDENCY.md).
2. **A sub-processor list** — Azure, Neon. Short lists are a feature: every name
   is somebody the customer has to assess too.
3. **A pre-filled SIG Lite**, once. It answers most of what arrives, and
   "not applicable — we do not process customer personal data in this scope" is
   an honest answer to a great many of its questions.
4. **A written gap statement**, which is the one people skip.

### The sentence that does the work

> We are not ISO 27001 certified. Here is what we can evidence, with the checks
> that produce it. Here is what we cannot: no formal ISMS, no independent audit,
> no penetration test. For a demo on synthetic data none of those are in scope;
> before real documents arrive we would need to agree what is.

**Never imply a certification you do not hold.** "Compliant with SOC 2
principles" is the phrase that ends a deal when somebody asks to see the report.
A clear no with evidence beats a vague yes — and a reviewer who catches one
vague yes stops believing every other line on the page.

### Two things that do real work without a certificate

**Inherited certifications, cited as the sub-processor's and never as ours.**
"Hosted on Azure, which holds ISO 27001 and SOC 2; our application layer is not
separately certified" is accurate, and it answers a large part of a
questionnaire.

**Scope reduction beats certification.** Every question about personal data
disappears if none is processed. The pipeline split already does this work: the
parse and index paths never leave the machine, and 220 of 1,069 files are the
only thing ever sent. That is a design property that can be pointed at, not a
promise that has to be believed.
