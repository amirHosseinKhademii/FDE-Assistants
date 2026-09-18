# The Thornbury corpus — what it is, and what is deliberately wrong with it

*Written 2026-09-18. **Read this before quoting anything in `corpus/`.***

> ### This document lives HERE, beside the folder, and never inside it.
>
> `@fde/grounding`'s loader ingests **every** `.md` under `CORPUS_DIR` with no
> exclusion list, so a `README.md` about the corpus becomes a retrievable
> document the model will cite as though it were company policy. This happened
> in pharma on 2026-09-14 and `corpus:check` caught it — 75 chunks became 80.
> `docs/README.md` carries the rule; this box is the reminder at the place where
> somebody would otherwise break it.

---

## 1 · Everything here is fabricated

**Thornbury Goods does not exist.** No policy in `corpus/` was ever published,
no procedure was ever followed, no contract was ever signed, and Northgate
Logistics and Pelham Carriers are not companies. Every document carries a
`FABRICATED` banner in its own text rather than in a wrapper, so a chunk that
escapes into a context window carries the warning with it.

**One document is a partial exception and says so.** `ref-law-uk-2024.md`
summarises the Consumer Rights Act 2015 and the Consumer Contracts Regulations
2013, which are **real statutes**. The company is invented; the law is not. It is
a lay paraphrase written to give the corpus a floor its policies can contradict,
it has not been reviewed by a lawyer, and it is not legal advice.

At a real engagement none of this is read — `CORPUS_DIR` points somewhere else
entirely. A customer's documents are not source code.

---

## 2 · What is in it, and why each one is here

Twelve documents. **Every one is load-bearing**; none is filler. See §5 for why
the number is twelve and not the forty the plan guessed at.

| file | what it is | why it exists |
|---|---|---|
| `pol-ret-001-rev-3.md` | the **published** returns policy, current | says **30 days, every category**. The promise a customer can hold us to |
| `pol-ret-001-rev-2.md` | the previous revision, superseded | had a **category table** with electronics at 14 days. Governs orders placed while it was in force |
| `bul-ret-2025-03.md` | a bulletin, current | puts electronics **back to 14 days** — and says plainly that the public policy was never reissued |
| `note-elec-2022-retired.md` | retired guidance | **wrong, and retired for being wrong.** Kept because old case notes quote it |
| `pol-doa-002-rev-1.md` | damaged-on-arrival procedure | the core of the assistant's job. §4.4 is the route walk |
| `std-dep-004-rev-2.md` | depot and route incident reporting | explains *why* a damaged parcel has a clean delivery record |
| `con-car-northgate-2024.md` | carrier contract | SLA in **working days**, jurisdiction-dependent bank holidays |
| `con-car-pelham-2023.md` | carrier contract | SLA in **calendar days** — deliberately not the same definition |
| `pol-gdw-003-rev-2.md` | goodwill and approval thresholds | who may release money, and that approval is a **person** |
| `bul-hv-2025-01.md` | high-value verification | extra evidence above £400, and is careful to change no entitlement |
| `pol-frd-005-rev-1.md` | repeat claims | history is a reason to look, never a reason to refuse |
| `ref-law-uk-2024.md` | the statutory floor | the thing a policy can be *wrong* against |

---

## 3 · The planted flaws, and where each one lives

These are the point. A clean corpus tests nothing.
[`PLAN.md`](PLAN.md) §3 is the full table; this is where the document half of
each trap sits. The row half is in the databases, and belongs to a different
session.

**T1 · the fleet record says clean, the customer says damaged.**
`std-dep-004-rev-2.md` §3 states that route incidents are filed against the
route and date, raise **no** exception on any delivery event, and are therefore
invisible from the shipment row. `pol-doa-002-rev-1.md` §4.4 makes the route
walk a required step. §6 of the standard adds the other half: a *missing* report
is not evidence of an uneventful route, so the absence cannot be cited to refuse.

**T2 · three sources, three windows, and an ambiguous category.**

```
pol-ret-001-rev-3.md   30 days, EVERY category        published, current
bul-ret-2025-03.md     electronics = 14 days          internal, current
return_windows (row)   electronics = 14 days          the config the tool obeys
the product            "smart desk lamp", category `homeware`
```

The bulletin §4 states outright that the public policy was never reissued, and
§5 states that no published product→category mapping exists. **Neither source is
wrong and neither settles it.** The correct answer surfaces the conflict, names
both sources, and escalates. Picking one silently is the failure the whole
answer contract exists to prevent.

**T3 · already refunded.** `pol-doa-002-rev-1.md` §4.1 makes checking prior
refunds the *first* evidence step; `pol-gdw-003-rev-2.md` §4.1 makes any outcome
on an already-refunded line a team-leader approval whatever the amount.

**T6 · working days versus calendar days.** The two carrier contracts define the
clock differently **on purpose**, and `con-car-pelham-2023.md` §2 shows the same
Friday collection falling due on different days by carrier. Northgate §2 adds
the second-order trap: the bank-holiday jurisdiction is the **delivery address**,
not the depot, and Scotland, England & Wales and Northern Ireland differ.

**T5 (injection) and T4 (absence) have no document.** T5 lives in a
`contact_messages` row. T4 is §4 below.

---

## 4 · What is deliberately NOT here

> **There is no document about marketplace or third-party seller items, and
> there must not be one.**

Planted flaw **T4** is a question whose answer is genuinely absent: a warranty
claim on an item sold by a third-party seller. Thornbury's policies are
first-party only and nothing here addresses it.

The correct answer is `entitlement: 'undetermined'`, an escalation, and **zero
citations** — not a fluent paragraph assembled from the nearest-looking policy.
Retrieval has no score cutoff, so `search_policy` will happily return the three
closest documents and all of them will be irrelevant. **Deciding "this isn't in
the corpus" is reading comprehension and belongs to the model**, which is only
testable if the gap is real.

**Writing a "marketplace items are out of scope" note would destroy this test**
by turning the absence into a finding. If one ever appears here, `cov-dmg-009`
starts passing for the wrong reason and nothing will say so.

### ☑ And it nearly did — in the DATABASE, not here (2026-09-18)

This warning caught a live one. The estate had a seeded row,
`refund_rules.RR-MARKETPLACE`: *"the item was sold by a third-party seller →
Thornbury policies do not apply; refer to the seller."* Written as housekeeping.

**It is an answer.** `get_policy_rules` would have returned a determinate,
citable response to exactly the question T4 says has none — and `cov-dmg-009`
would have failed, with the obvious fix being to weaken the eval rather than
delete the row. T4 would have been dead and nothing would have said so.

The row is gone, and because a comment is not a defence, **`commerce:db-check`
now enforces the gap**: it scans every text column of all eight `thb_policy`
tables for anything addressing marketplace or third-party sales and fails
naming the table, the column and the file to fix. Proved by putting the row
back and watching it go red. The `rule_id` sequence now reads RR-001..RR-006,
RR-008 — **the gap is the scar, left deliberately**, with the story in the
comment where RR-007 used to be, pointing back at this section.

> ### A third species, and this is the one with no natural defender
>
> The estate session named it, and it is worth keeping:
>
> | | |
> |---|---|
> | a check that cannot fail | passes forever, proves nothing |
> | a column that cannot disagree | consistent with every answer anyone wants from it |
> | **an absence that nothing is defending** | |
>
> The third is the worst of the three, because **every other check asks "is this
> consistent?" — and adding the missing thing makes the estate MORE consistent,
> not less.** Row counts, soft-key walks and fingerprints would all have gone
> green the moment that row was added. *Greener.*
>
> **Only a check that knows an absence is load-bearing can protect one.** That
> is why the defence lives in `db-check` and in this section, on both sides of
> the boundary, each pointing at the other.
>
> ### ☑ A fourth species, found 2026-09-18 by asking a question
>
> Asking the estate session for *"a case id whose scope resolves to ORD-101414"*
> turned out to be the check. **It did not exist.** Nor did a case for T2, T3,
> T4, or five of the six T6 orders — only T5's, because those were planted by
> hand. The rest got a case only if the ordinary-traffic loop's dice said so, and
> for four traps they said no.
>
> So **four of six traps were unreachable through the product.** Perfectly
> seeded, fully walkable by hand, and with no front door — the tools take no
> order argument, the session carries the case, so no case means no way in. All
> 46 checks were green, because every one of them asked about the ORDER and none
> about the way in.
>
> | | |
> |---|---|
> | a check that cannot fail | passes forever, proves nothing |
> | a column that cannot disagree | consistent with every answer anyone wants |
> | an absence nothing is defending | every consistency check makes it worse |
> | **a trap with no path to it** | **exists, is correct, and cannot be reached** |
>
> The estate session's generalisation, kept in their words because it is the
> useful half: **a check that verifies a trap exists is not the same as a check
> that verifies it can be REACHED, and the second is the one the product depends
> on. Seeding is not the delivery mechanism.**
>
> There is nothing inconsistent about an order with no case — it is the ordinary
> state of most orders — which is why every consistency measure was satisfied.
>
> ### ☑ A fifth species, 2026-09-18 — the fix with no witness
>
> The backend session found and fixed a BST day-boundary bug: their driver-report
> lookup built a UTC day from a date column, so during British Summer Time it
> dropped reports filed 00:00–01:00 London — which is precisely the report a
> driver files after a long round. They found it by reasoning, not by a red check.
>
> The estate session then asked whether the data could ever have caught it.
> **It could not.** All 66 driver reports were filed at 17:35 UTC — mid-evening,
> nowhere near a date change — so zero reports had a London date differing from
> their route date. The fix was real, the reasoning was right, and **the
> regression test was a memory.**
>
> | | |
> |---|---|
> | **a fix no data exercises** | **indistinguishable from a bug that was never there** |
>
> Five reports are now filed at 23:30 UTC = 00:30 the next day in London, and
> the placement is the design: **none is on T1's route.** A timezone bug and a
> broken walk produce the *same symptom* — "no report for this route" — and need
> opposite fixes. Keeping them on different routes is what makes the two
> distinguishable by which route fails.
>
> **The common thread through all five species is tidy data.** RR-MARKETPLACE
> was tidy. A column that always agrees is tidy. An order with no case is tidy.
> Reports all filed at 17:35 are tidy. An estate's job is to be realistic, and
> realistic means ragged at exactly the edges the code has to handle.
>
> One detail worth more than the fix: **T6-4 had a case purely by chance**, and
> that is *worse* than having none. A front door that appears and disappears with
> the dice means any test that finds it breaks on the next reseed with nothing to
> point at. Trap cases now live in a reserved `CAS-9xxxx` block that ordinary
> traffic skips, so an id can be hardcoded and survive a change in traffic volume.

---

## 5 · Why twelve and not forty

[`PLAN.md`](PLAN.md) §14 asked the question and declined to guess: *"Forty is a
guess. The number should come from the eval cases: enough that `search_policy`
can plausibly miss."*

These twelve are every document a planted flaw needs. Padding to forty before a
single eval case has run would add retrieval difficulty **we could not
attribute** — a miss would be ambiguous between a genuinely hard corpus and
filler crowding the results, and we would have manufactured a confound rather
than a test.

**The gate for growing it is a measurement, not a target.** Run `retrieval:eval`
against these twelve and the eval cases; if recall@k is near-perfect, the corpus
is too easy and filler is then a *treatment* with an expected effect, which can
be measured. Steering's `evals/RETRIEVAL.md` is the precedent — recall@6 of
0.813 baseline against 0.938 with a reranker is the shape of number that should
decide this.

---

## 6 · The document format

Matches the pharma corpus exactly, because `@fde/grounding` already parses it:

```
# DOC-ID Rev N — Human readable title

> Revision Id: … · Doc Id: … · Revision: … · Status: … · Effective: … ·
> Expires: … · Owner: … · Category: … · Audience: … · Supersedes: …

*FABRICATED. …*

## 1. Numbered sections
```

`Status` carries the lifecycle and drives retirement: `current`, `superseded`,
`retired`. **`retired` is not the same as `superseded`** — a superseded document
was correct for its period and still governs orders from it; a retired one was
*wrong*. `note-elec-2022-retired.md` is the retired case and it says why in its
own text, because a status field alone cannot carry "and it cost us complaints".

`Supersedes` and `Amends` are relation fields, and the **verb matters**: a
bulletin that *amends* a policy leaves it in force, which is exactly how
`bul-ret-2025-03.md` and `pol-ret-001-rev-3.md` can both be current and
contradict each other.

---

## 7 · Status

☑ Twelve documents written, 2026-09-18.
☐ Not yet ingested — no `DocumentDomain` descriptor exists for this corpus yet.
☐ `commerce:corpus-check` not written. It must assert the document count, the
   chunk count, **and that no file in `corpus/` is a meta-document** — the last
   being the check that would have caught pharma's 75→80.
