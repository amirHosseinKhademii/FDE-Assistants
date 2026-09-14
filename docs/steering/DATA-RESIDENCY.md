# What leaves the building, and how each claim is evidenced

*Written 2026-09-13, for answering a customer's security review. Every row says
**how** it is known, because "we checked" and "the vendor says so" are different
answers and a reviewer will ask which one you mean.*

*The question after this one — **what a reviewer gets to write down, and what
our checks do not cover at all** — is [`CONTROLS.md`](CONTROLS.md).*

---

## The short version

**Of 1,069 files, exactly 220 leave the machine** — the closure reports, about
900 bytes each. The timesheets, rate cards, quotations, estimates, source code
and all four databases are read by plain code, locally, and never go anywhere.

They go to **one host: our own Azure AI Foundry resource in Sweden.**

---

## The claims, and what backs each one

| claim | how it is known | strength |
|---|---|---|
| Only 220 documents are sent, one per request, with no other context | `pnpm steering:derived-compliance-check` captures the real outgoing HTTP body: 5,664 bytes, one system prompt, one document | **verified here** |
| Exactly one host is contacted, and it is our resource | same check, reading the captured URL: a single `<resource>.services.ai.azure.com` host in our own tenant | **verified here** |
| No provider-side retention (`store: false`) | same check, read from the **outgoing bytes** rather than the source line | **verified here** |
| No server-side conversation state | same check: no `previous_response_id`, no `conversation` | **verified here** |
| Authentication is an Entra token, not a static key | same check: `Authorization: Bearer`, no `api-key` header, nothing `sk-` | **verified here** |
| The resource is in the EU | `az cognitiveservices account list` → `swedencentral`, kind `AIServices` | **verified here** |
| Nothing under the ingest may open the customer's databases | `pnpm steering:derived-boundary-check`, which fails the build on the symbol names | **verified here** |
| Microsoft does not train on the data | Microsoft's documented position for Azure OpenAI | **vendor statement — cite it, do not assert it** |
| Data stays in the chosen region | Microsoft's documented position | **vendor statement — cite it** |
| Prompts are not retained for abuse monitoring | **NOT TRUE BY DEFAULT** — see below | **must be arranged** |

**Run the two checks in front of them if they push.** They take a second, they
make no network call, and they print the captured request. That is a different
conversation from reading a slide.

---

## The three things I will not claim

### 1 · Abuse-monitoring retention is ON by default

By default Azure OpenAI retains prompts and completions for up to 30 days for
abuse monitoring, accessible to authorised Microsoft reviewers only on a flagged
case. It is **not** disabled by `store: false` — different mechanism.

For a Tier-1 supplier whose closure reports name a car maker's unannounced
programmes, this is the question that matters, and the answer today is *"we have
not applied for Modified Abuse Monitoring."* **That application should be filed
before this runs on real documents, not after.** Saying so first is worth more
than being asked.

### 2 · The endpoint is reachable from the internet

`publicNetworkAccess: Enabled` on the resource. Entra authentication protects
it, and network isolation is a separate control a regulated customer will
usually want: Private Endpoint, public access disabled. Not done here, and it is
a configuration change rather than a code change.

### 3 · "Azure does not train on your data" is a contract, not a measurement

I can show what our code sends. I cannot show what the provider does with it.
That claim belongs to Microsoft's terms and the customer's agreement, and it
should be quoted from a current source with a date on it — not repeated from
memory by an engineer, which is how a security review gets an answer that is
right today and wrong at renewal.

---

## The design point that makes this arguable at all

The three pipelines are separate for cost and quality reasons, and the
data-protection consequence is the useful one:

- **The parse pipeline never leaves the machine.** It handles the overwhelming
  majority of the volume — 10,688 timesheet lines, 168 rates, 301 quoted lines.
  Plain code. No model. Nothing to review.
- **Only prose that genuinely needs reading comprehension is sent**, and only
  the part of it that does. 220 documents out of 1,069.

So *"nothing may leave our tenant"* is not a blocker. The parse pipeline is
unaffected, and the extraction points at a model deployment inside the
customer's own subscription — one environment variable. **Nothing in the design
assumes a public API**, which is the whole reason it is built on Foundry with
Entra rather than on a key and an endpoint.

---

## The commands

```bash
pnpm steering:derived-compliance-check    # captures the real request, asserts on it
pnpm steering:derived-boundary-check      # the ingest cannot reach the estate
az cognitiveservices account list -o table
```
