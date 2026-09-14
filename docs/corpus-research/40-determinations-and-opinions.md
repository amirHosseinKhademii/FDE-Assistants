# 40 · Determinations and opinions

*Cluster 4 of the corpus research. US **personal auto**. The documents produced
BY DECIDING A CLAIM, rather than by writing a policy.*

Companion files: `10-*` (forms and editions), `20-*` (bulletins and circulars),
`30-*` (manuals and procedures). Composed together they become the corpus design
input for [`CORPUS-PLAN.md`](../CORPUS-PLAN.md) Step 2.

---

## Why this cluster is the hard one

Everything in the other three clusters is *prospective*: a form, an endorsement,
a bulletin, a circular all say "here is the rule going forward." This cluster is
*retrospective*: each document says "here is what we decided, on these facts,
under this policy, on this date." That single difference drives the whole design
question.

A prior determination is **not precedent**. No US insurer is bound by its own
prior claim decision the way a court is bound by a prior ruling, and the
governing document is always the policy in force on the date of loss — not the
prior letter. But adjusters search for prior determinations constantly, and they
reason from them, because a prior determination is the cheapest available proxy
for "how does this company read this clause." Retrieval will therefore surface
them, and the model will be tempted to treat them as authority.

The dangerous case, and the one we are deliberately planting: **a prior
determination whose reasoning was correct under the policy EDITION then in
force, retrieved against a claim governed by a later edition in which the cited
provision was renumbered, narrowed, or deleted.** That document is history, not
authority, and nothing in its own text says so. The only signals are the edition
it cites and the date of loss it recites.

Five document types follow. They are genuinely distinct on the axes that matter
here — only the denial letter has statutory required contents, only the
reservation of rights carries the waiver consequence, only the file note is
internal and never sent, and only the coverage opinion is (sometimes) privileged.

---

## 1 · Claim file note

### What it is called

**Claim note**, **file note**, **activity note**, **log note**, **claim log**,
**activity log**, **diary note**, **adjuster's note**. In Guidewire ClaimCenter
the entity is a *Note* attached to a *Claim*, alongside *Activities* and
*Matters*; the follow-up mechanism is the **diary**, which is a dated calendar
entry with a short note attached
([InsNerds / claims practice writeups](https://blog.reduceyourworkerscomp.com/2023/05/read-adjusters-file-notes-to-understand-your-work-comp-claim/),
[ClaimWizard on activity logs](https://claimwizard.com/audit-proof-your-claims-using-activity-logs-for-accountability/)).

Regulators use the umbrella term **claim file**. The NAIC *Unfair
Property/Casualty Claims Settlement Practices Model Regulation* (MDL-902) §3.B
defines "claim file" as "any retrievable electronic file, paper file or
combination of both," and §3.E defines "documentation" as "all pertinent
communications, transactions, notes, work papers, claim forms, bills and
explanation of benefits forms relative to the claim"
([MDL-902](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf)).

### Who writes it, who is bound

Written by the **adjuster / claim representative** handling the file, plus
anyone else who touches it: a supervisor approving an authority request, an SIU
investigator, a subrogation specialist, a nurse case manager on an injury claim,
a coverage attorney summarising a call.

Nobody is *bound* by a file note. It is internal, it is never sent to the
insured, and it has no contractual effect. Its force is **evidentiary**:

- It is what a market conduct examiner reads. MDL-902 §4.B requires "detailed
  documentation … in each claim file in order to permit reconstruction of the
  insurer's activities relative to each claim," and §4.C requires each relevant
  document to be "noted as to date received, date processed or date mailed"
  ([MDL-902 §4](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf)).
  Virginia's adoption of that standard produced 13 cited violations of
  14 VAC 5-400-30 C against one personal-auto writer — "failed to document the
  claim file sufficiently to reconstruct events and/or dates that were pertinent
  to the claim" — at a frequency the examiners called "a general business
  practice"
  ([Virginia SCC market conduct exam, Safe Auto Insurance Company](https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf)).
- It is what a bad-faith plaintiff reads. In several states the claim file is
  discoverable in a first-party bad-faith action precisely because it is "often
  the only evidence of an insurer's claims handling and reasons underlying its
  coverage determinations"
  ([ABA Section of Litigation, discovery in coverage and bad-faith cases](https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/)).
- Where a decision was communicated orally, the note IS the record. WAC
  284-30-380 requires that when notice is not written, "an appropriate notation
  must be made in the claim file of the insurer describing how, when, and to
  whom the notice was made"
  ([WAC 284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)).

### Shape

**Length:** individually tiny — 1 to 15 lines, one paragraph, often under 100
words. A single auto claim accumulates dozens to low hundreds of them over its
life. This is the one document type in the whole corpus where the natural unit
is *smaller than a chunk*, which matters for the chunker: a realistic note file
is a chronological append-only log of many short entries under one claim, not
one prose document.

**Structure:** a chronological, append-only log. Each entry carries, at minimum:

- date and time
- author (name + role, or a user id)
- a note type / category — the categories that recur across claim systems are
  roughly `Coverage`, `Investigation`, `Contact`, `Damages / Estimate`,
  `Reserve`, `Payment`, `Subrogation`, `Legal`, `SIU`, `Supervisor Review`,
  `Diary`
- body text
- sometimes a next-diary date

**Required contents:** no statute prescribes a note *format*. What is prescribed
is the reconstruction standard (MDL-902 §4.B) and, for orally-communicated
decisions, the how/when/to-whom notation (WAC 284-30-380). Claims-practice
guidance adds the conventions that make notes usable later: log every call,
meeting and inspection; keep them factual rather than characterising ("the
client was very upset" only as a direct quote); date each entry; write so it is
understandable years later; identify the author
([Claims Journal, quality claims documentation](https://www.claimsjournal.com/news/national/2014/02/20/244768.htm),
[Claims Journal, the documentation balancing act](https://www.claimsjournal.com/news/national/2017/08/28/280151.htm)).

**Tables:** rarely inside a note, but the claim file as a whole reliably carries
two small ones that adjusters search for — a **reserve history** (date, coverage,
indemnity reserve, expense reserve, set by) and a **payment ledger** (date,
payee, coverage, amount, check/draft no.). Both are worth planting because both
lose their meaning if the header row is separated from the rows, which is
exactly the chunker trap already in the corpus.

**Boilerplate:** low, but not zero. Recurring stock phrases are things like
"coverage confirmed, no ROR required", "referred to SIU", "reserve increased per
supervisor authority", "left voicemail, awaiting return call", "diary 14 days".

### Identifier scheme

Notes are not independently identified by any industry standard. They are
identified **positionally, under a claim number**: claim number + sequence or
timestamp.

Claim numbers themselves have **conventions, not a standard** — every carrier
numbers its own way, and the only citable formats are vendor defaults:

- **Guidewire ClaimCenter** assigns a *draft* claim number when the FNOL draft
  is first saved and an *open* claim number when the claim moves draft → open.
  In the base configuration draft numbers "typically start with `999`" and open
  numbers "typically start with `000`"
  ([Guidewire Cloud docs, the FNOL process in ClaimCenter](https://docs.guidewire.com/cloud/cc/202507/cloudapibf/cloudAPI/topics/111-CCFNOL/01-executing-FNOL/c_the-FNOL-process-in-ClaimCenter.html)).
  The practical consequence is that **one claim can legitimately bear two
  numbers**, which is itself a retrieval hazard worth planting once.
- Regulators require the number to exist and be retrievable but do not specify
  its form. MDL-902 §4.A: an insurer "shall be able to provide the claim number,
  line of coverage, date of loss and date of payment of the claim, date of
  denial or date closed without payment … for all open and closed files for the
  current year and the two preceding years"
  ([MDL-902 §4.A](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf)).
  Note that this list is effectively the **minimum metadata schema for a
  determination document**, straight from a model regulation: claim number, line
  of coverage, date of loss, date of payment, date of denial, date closed.

In the wild the recurring shapes are: a pure sequence (`0001234567`); a
line-of-business prefix plus year plus sequence (`AUT-2024-0004471`); and a
year-week-sequence form. Market conduct reports use their own examiner sample
ids over the top of the carrier's (`RPA002`, `TermIRPPA-366182681` in the
Virginia report above), which is a reminder that **the same claim can carry
several identifiers from several systems.**

**Proposed for this corpus** — a claim id that is exact-matchable and visibly
distinct from the existing `P[APE]-…` form ids and `AUT-\d{4}` record ids:

```
CLM-2024-004471            claim
CLM-2024-004471-N017       note, zero-padded sequence within the claim
```

Regex: `\b(CLM-\d{4}-\d{6}(?:-N\d{3})?)(?![-\w])`

**Note the negative lookahead, and why it is there.** Without it,
`\b(CLM-\d{4}-\d{6})\b` matches a *prefix* of `CLM-2024-004471-CPL-20240903`,
because `-` is a non-word character and `\b` fires after the digits. That is
structurally the same bug `form-id.ts` was written to prevent — `PA-2023-01`
matching `PA-2023-01-TX` and returning five near-identical forms as one. The
difference here is that the prefix relation is **semantically real**: every
determination under a claim genuinely belongs to that claim, so
claim-scoped retrieval SHOULD be able to gather them. The resolution is to make
that a deliberate, separate operation rather than a silent property of the id
matcher:

- `claimIdPattern` (above, anchored) answers *"is this the claim
  `CLM-2024-004471`?"* — exact, never a prefix.
- A distinct `claimScopeOf(id)` helper answers *"which claim does this
  determination belong to?"* by taking the first three segments.

Two functions, two questions. The failure mode in `form-id.ts` came from one
loose function answering both.

This does **not** match `DOMAIN.documentIdPattern`
(`/\b(P[APE]-(?:END-)?\d{4}-\d{2}(?:-[A-Z]{2})?)\b/`), and it must not — the
whole point of `form-id.ts` is exact matching on a *form* id, and a claim id is
a different namespace. CORPUS-PLAN Step 2 already flags that the pattern will
need extending; the recommendation here is a **second** named pattern rather
than a widened one, so that "which form?" and "which claim?" stay separable
questions.

### Precedence

A file note has the **lowest authority of anything in the corpus** and the
**highest recall value**. It records what was decided; it never decides
anything. Specifically:

- A note is beaten by the letter it describes. Where the note says "denied for
  late notice" and the denial letter says "denied because the vehicle was not a
  covered auto," the **letter** is the operative communication, because the
  letter is what the regulations require to be in writing and what the insured
  received (10 CCR 2695.7(b)(1); WAC 284-30-380; MDL-902 §7.A).
- A note is beaten by the policy, always and without exception.
- But a note *defeats the insurer's own later narrative* in litigation and
  examination — it is the reconstruction record (MDL-902 §4.B), and an absence
  of notes is itself a violation, as the Virginia exam shows.

**Stale edition:** a note is the type most likely to cite a provision by bare
section number with no edition ("excl. 4.2 applies"). That is precisely the
retrieval hazard. Section 4.2 of `PA-2021-07` and section 4.2 of `PA-2023-01`
are different text. **A bare section number in a note is only resolvable via the
note's claim, the claim's date of loss, and the policy edition in force on that
date** — three hops, none of which the note itself carries. Plant this.

### What an adjuster searches it for

- "Has this insured claimed this before, and what did we do?"
- "Why did we set the reserve where we did?"
- "Did anyone tell the insured anything before I picked this file up?"
- "Was an ROR sent, and when?" — because the answer changes what the insurer can
  still argue.
- "Who authorised this payment, at what level?"
- Reconstructing a timeline for a complaint response or an exam data call.

### Sample skeleton

```markdown
# Claim File Notes — CLM-2024-004471

> Meridian Mutual Insurance Company. Fictional document, written for an FDE
> practice engagement. Do not use for anything real.
>
> Claim ID: CLM-2024-004471 · Policy ID: AUT-4471 · Form in force at loss:
> PA-2023-01 · Date of loss: 2024-08-14 · Line: Personal Auto · Status: Closed

## Reserve History

| Date | Coverage | Indemnity reserve | Expense reserve | Set by |
|---|---|---|---|---|
| 2024-08-15 | Collision | (placeholder) | (placeholder) | (placeholder) |

## Payment Ledger

| Date | Payee | Coverage | Amount | Draft no. |
|---|---|---|---|---|
| (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

## Notes

### N001 · 2024-08-15 09:12 · Contact · (adjuster name, role)
Placeholder: first contact with insured, loss facts taken, next diary set.

### N009 · 2024-08-22 14:40 · Coverage · (adjuster name, role)
Placeholder: coverage position recorded, provision cited by section number only.
```

### Sources

- [NAIC MDL-902, Unfair Property/Casualty Claims Settlement Practices Model Regulation](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) — §3 definitions, §4 file and record documentation, §7 settlement standards, §8 auto-specific standards
- [Virginia SCC Bureau of Insurance, market conduct examination report (Safe Auto Insurance Company)](https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf)
- [WAC 284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)
- [Guidewire Cloud docs — the FNOL process in ClaimCenter](https://docs.guidewire.com/cloud/cc/202507/cloudapibf/cloudAPI/topics/111-CCFNOL/01-executing-FNOL/c_the-FNOL-process-in-ClaimCenter.html)
- [Claims Journal — Quality Insurance Claims Documentation Guidelines](https://www.claimsjournal.com/news/national/2014/02/20/244768.htm)
- [Claims Journal — The Claim File Documentation Balancing Act](https://www.claimsjournal.com/news/national/2017/08/28/280151.htm)
- [ABA Section of Litigation — Discovery Tips in Coverage and Bad Faith Litigation](https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/)

---

## 2 · Coverage position letter

### What it is called

**Coverage position letter**, **coverage letter**, **coverage confirmation
letter**, **partial denial letter**, **coverage determination letter**. In
first-party auto the everyday version is the **acceptance letter** or
**coverage confirmation** that accompanies the first payment.

The three letters in this cluster sit on one spectrum and the industry names
them by where they land: a **coverage position letter** states what the insurer
will and will not do *now*; a **reservation of rights** states that the insurer
is performing *while preserving* the right to change position later; a
**denial** closes the door. PropertyCasualty360's framing is that an ROR "is not
an outright denial, but may include partial denials as to certain items in a
claim"
([PropertyCasualty360, Understanding the Reservation of Rights Letter](https://www.propertycasualty360.com/fcs/2023/01/10/understanding-the-reservation-of-rights-letter-422-8343/)).
In practice one mailed letter routinely does two of the three jobs at once —
confirm coverage A, deny coverage B, reserve on coverage C — which is why our
corpus should include at least one mixed letter rather than three pure ones.

### Who writes it, who is bound

Written by the adjuster, frequently over a supervisor's or a coverage
specialist's approval, and in complex matters drafted (or converted from a
coverage opinion) by coverage counsel — a DRI practice piece notes that a fully
developed coverage opinion can be turned into a position or denial letter by
deleting the analysis section and keeping the operative facts, policy provisions
and conclusions
([Butler Snow, on coverage opinions](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)).

Who is bound: **the insurer, as to this claim.** Two model-law provisions give
this teeth:

- NAIC Model 900 §4.A makes it an unfair claims practice to "knowingly
  misrepresent … relevant facts or policy provisions relating to coverages at
  issue"
  ([NAIC Model 900](https://content.naic.org/sites/default/files/model-law-900.pdf)).
- NAIC Model 900 §4.J makes it an unfair claims practice to make claims payments
  "without indicating the coverage under which each payment is being made"
  (ibid.). **Payment must be labelled by coverage** — which is why a coverage
  position letter almost always carries a small coverage/amount table.
- MDL-902 §5.A: no insurer shall "fail to fully disclose to first party
  claimants all pertinent benefits, coverages or other provisions of a policy or
  contract under which a claim is presented." A position letter that confirms
  Collision and silently omits an available Rental Reimbursement coverage is a
  violation, not just a discourtesy. The Virginia exam found 17 violations of
  the state analogue (14 VAC 5-400-40 A), including failing to inform an insured
  of the physical damage deductible.

The insured is not bound by it at all. MDL-902 §5.E further bars an insurer from
labelling a payment "final" or "a release" unless the limit has been paid or a
compromise was actually agreed.

### Shape

**Length:** 1–3 pages. Shorter than an ROR, much shorter than a denial with a
contested exclusion.

**Structure:**

1. Address block, date, claim number, date of loss, insured name, policy number
2. "We have completed our review of …" — the loss recital, 1 short paragraph
3. Coverages that respond, and under which policy provisions, each named
4. Amounts, deductibles applied, and what each payment is for (§4.J)
5. Coverages that do NOT respond, or are limited, with the provision cited
6. Anything still under investigation
7. What the insured should do next; contact details
8. In some states, the DOI referral notice

**Required contents:** where the letter denies *any part* of the claim it
inherits the denial-letter rules (§3 below) as to that part — this is the most
commonly missed thing about position letters. Otherwise the binding constraints
are §4.J (state the coverage for each payment) and §5.A (disclose all pertinent
coverages).

**Tables:** yes, reliably. The canonical one is coverage-by-coverage:

| Coverage | Applies | Limit | Deductible | Amount payable |

and on a total loss the MDL-902 §8.A valuation basis appears as a comparables
table (source, year/make/model, mileage, adjusted value) because §8.A(2)
requires the cash settlement to be derived from named sources — two or more
comparable autos in the local market, or in proximate areas, or dealer
quotations, or a statistically valid source — and §8.A(1) requires any
replacement offer and its rejection to be "documented in the claim file."

**Boilerplate:** moderate. Standing paragraphs on ACV and depreciation, on the
right to supplement, on salvage and title, on subrogation and deductible
recovery, and the closing "this letter is not a waiver of any rights under the
policy."

### Identifier scheme

Letters are identified by **claim number + document type + date**, not by an
independent number. A carrier's document management system gives them a document
id; correspondence itself is referenced in the next document as "our letter of
[date]" — which is the convention to encode, because it means **a determination
is cited by date, not by id.** That is a materially harder retrieval key than a
form id, and worth reproducing.

Proposed:

```
CLM-2024-004471-CPL-20240903        coverage position letter
```

Regex: `\b(CLM-\d{4}-\d{6}-(?:CPL|ROR|DEN|OPN)-\d{8}(?:-\d{2})?)(?![-\w])`

The optional trailing `-\d{2}` exists because **date is not unique**. A claim can
carry two reservation of rights letters issued the same day (see §3 Precedence:
supplemental RORs accumulate rather than supersede), and CORPUS-PLAN Step 2b
makes `document_id` a primary key — so a date-only id collides. The sequence
suffix is omitted when there is only one letter of that type on that date, which
keeps the common case readable.

A single alternation covers all four letter types in this cluster, which keeps
the extension to the id scheme to one pattern rather than four.

### Precedence

- **The policy beats the letter.** A position letter that concedes more than the
  policy grants does not, in the majority of states, create coverage — waiver
  and estoppel "cannot be used to create coverage that is not otherwise
  available under the policy"
  ([Wiley, on *Maxwell v. Hartford Union High School District* (Wis. 2012)](https://www.wiley.law/newsletter-4299)).
- **The letter beats the file note** as to what was communicated.
- **The letter beats the insurer's later, different story about this same
  claim,** in the states that apply *mend the hold*: an insurer is "precluded
  from denying a claim on one basis and then changing the basis for denial
  during litigation if there is evidence of unfair surprise or arbitrariness,"
  though courts generally require actual prejudice
  ([Mondaq, federal court in Illinois on holding back policy defenses](https://www.mondaq.com/unitedstates/insurance-laws-and-products/1801382/use-it-or-lose-it-federal-court-in-illinois-highlights-the-risks-of-holding-back-policy-defenses),
  [Property Insurance Coverage Law Blog, Mending the Hold](https://www.propertyinsurancecoveragelaw.com/blog/mending-the-hold-an-oldie-but-a-goodie-part-1-the-concept/)).
- **The letter does NOT beat the policy on a different, later claim.** Nothing
  found supports treating a position taken on claim A as binding on claim B.
  Waiver requires an intentional relinquishment as to *that* right on *that*
  claim; estoppel additionally requires detrimental reliance
  ([The ALI Adviser, Waiver and Estoppel Part 1](https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-1/) and
  [Part 2](https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-2/)).
  An insured who simply *learns* of a past favourable decision and expects the
  same again has no reliance.

**Stale edition.** The narrow exception worth knowing: some courts hold insurers
to **settled judicial constructions of language they continue to use** — if a
court construes wording and the insurer keeps issuing that same wording, the
construction is treated as incorporated
([Policyholder Pulse, estopping insurers from inconsistent coverage positions](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)).
The doctrine is expressly keyed to *unchanged* language. **Change the wording in
a new edition and the hook releases** — which is the whole design of our trap:
the prior determination reads as authority, cites a provision that is real, and
is silent about the fact that the provision has since been rewritten.

Related but distinct, and worth keeping separate in the synthesis: **regulatory
estoppel** bars an insurer from advancing an interpretation that contradicts what
it told regulators when the wording was approved (ibid.). That one survives an
edition change in the sense that it attaches to the *filing*, not the claim.

### What an adjuster searches it for

- "What did we already tell this insured?" — before saying anything different
- "Which coverages did we pay, and under which provision?"
- "Did we already concede the deductible / the rental limit / the ACV basis?"
- "How do we normally phrase this coverage's confirmation?" — template mining,
  which is the real reason determinations get searched
- "Was anything left open for further investigation?"

### Sample skeleton

```markdown
# Coverage Position — CLM-2024-004471

> Meridian Mutual Insurance Company. Fictional document, written for an FDE
> practice engagement. Do not use for anything real.
>
> Document type: coverage position letter · Claim ID: CLM-2024-004471 ·
> Policy ID: AUT-4471 · Date of loss: 2024-08-14 · Letter date: 2024-09-03 ·
> Form in force at loss: PA-2023-01

## Loss Summary
Placeholder: one paragraph restating the reported facts of the loss.

## Coverages Reviewed

| Coverage | Applies | Policy provision | Limit | Deductible | Amount payable |
|---|---|---|---|---|---|
| (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

## Coverages Not Responding
Placeholder: one line per coverage, naming the provision relied on.

## Still Under Review
## What Happens Next
## How To Contact Us
```

### Sources

- [NAIC Model 900, Unfair Claims Settlement Practices Act](https://content.naic.org/sites/default/files/model-law-900.pdf) — §4.A, §4.J, §4.L
- [NAIC MDL-902](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) — §5.A, §5.E, §5.F, §8.A
- [PropertyCasualty360 — Understanding the Reservation of Rights Letter](https://www.propertycasualty360.com/fcs/2023/01/10/understanding-the-reservation-of-rights-letter-422-8343/)
- [Butler Snow — My Opinion About Insurance Coverage Opinions](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)
- [Wiley — insurer not estopped after defending without a reservation of rights (*Maxwell*, Wis. 2012)](https://www.wiley.law/newsletter-4299)
- [Policyholder Pulse — Estopping insurers from taking inconsistent coverage positions](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)
- [Mondaq — Use It Or Lose It: risks of holding back policy defenses](https://www.mondaq.com/unitedstates/insurance-laws-and-products/1801382/use-it-or-lose-it-federal-court-in-illinois-highlights-the-risks-of-holding-back-policy-defenses)
- [Virginia SCC market conduct exam](https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf)

---

## 3 · Reservation of rights letter

### What it is called

**Reservation of rights letter**, **ROR letter**, **ROR**, **non-waiver letter**.
The bilateral, signed cousin is a **non-waiver agreement**. In personal auto the
ROR is most common on the **liability** side — the insurer defends the insured
against a third-party suit while disputing whether the policy indemnifies —
and on **permissive use / named driver exclusion / business use** questions,
where the facts that decide coverage are the same facts the underlying suit will
find.

### Who writes it, who is bound

Written by the adjuster or claim counsel, very often drafted or reviewed by
coverage counsel. It goes **to all insureds**, not only the one who tendered —
including additional insureds and, in some jurisdictions, the claimant
([Jackson & Campbell, seven tips for an effective reservation of rights letter](https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/)).

Who is bound: **the insurer, and severely.** The ROR is the one document in this
cluster whose *absence or inadequacy* can cost the insurer the coverage
argument entirely.

- **Absence.** In Georgia, an insurer that assumed the defense without an
  effective reservation waived its right to contest coverage, and the court
  applied a *conclusive* presumption of prejudice — the insurer could not argue
  the insured was unharmed (*World Harvest Church, Inc. v. GuideOne Mut. Ins.
  Co.*, Ga. 2010)
  ([McGuireWoods client alert](https://www.mcguirewoods.com/client-resources/alerts/2010/5/failuretoissuereservationofrightsletter/)).
- **The other way.** Wisconsin reached the opposite result on similar facts:
  defending without a reservation, and even losing the underlying judgment, did
  not estop the insurer, because "waiver and estoppel cannot be used to create
  coverage that is not otherwise available under the policy" (*Maxwell v.
  Hartford Union High School District*, Wis. 2012), over a three-justice dissent
  ([Wiley](https://www.wiley.law/newsletter-4299)).
  **These two cases are a genuine jurisdictional split and both belong in the
  synthesis.**
- **Inadequacy.** South Carolina held generic ROR letters ineffective: the
  letters "included no discussion of [the insurer's] position as to the various
  [policy] provisions or explanation of its reasons for relying thereon" and
  "failed to specify the particular grounds upon which [it] did, or might
  thereafter, dispute coverage." Verbatim block-quoting of policy provisions
  attached to a generic denial was held insufficient (*Harleysville Group Ins.
  v. Heritage Communities, Inc.*, 803 S.E.2d 288 (S.C. 2017))
  ([Rivkin Radler](https://www.rivkinradler.com/publications/insurers-generic-reservation-rights-letters-found-inadequate-south-carolina-supreme-court/),
  [Dickie McCamey](https://www.dmclaw.com/events-media/reservation-of-rights-letters-lack-of-specificity-proves-fatal-to-cgl-insurer-in-south-carolina/)).
- **Untimeliness.** There is generally no fixed deadline, but an insurer that
  waits risks waiver or estoppel; courts have found reservations untimely where
  insurers waited weeks or years after notice of suit
  ([DLA Piper, practical guide for claims managers, part 3](https://www.dlapiper.com/en/insights/publications/practical-guide-for-claims-managers/dla-pipers-practical-guide-for-claims-managers-in-2022-part-3-reservation-of-rights)).

### Shape

**Length:** the longest of the three letters — 3 to 12 pages is normal, more in
a complex liability matter, because *Harleysville*-style specificity requires
walking each allegation against each provision.

**Structure:**

1. Date, all insured recipients, claim number, underlying suit caption, policy
   number **and edition/period**
2. Factual background — the allegations, as pleaded
3. The policies and periods being addressed, plus a reservation as to any policy
   not yet tendered (Jackson & Campbell tip 3)
4. The insuring agreement, then each relevant exclusion / condition /
   endorsement, quoted or closely paraphrased
5. **The analysis that ties each allegation to each provision** — the element
   *Harleysville* says cannot be skipped. The recommended three ingredients are:
   the relevant underlying allegation, the applicable coverage limitation, and a
   specific reservation connecting the two
6. What the insurer WILL do — appoint defense counsel, at whose expense
7. Counsel-selection rights (independent / *Cumis*-type counsel where the
   conflict triggers it), and any reservation of the right to recoup uncovered
   defense costs (Jackson & Campbell tips 5 and 7)
8. Right to seek declaratory judgment; right to supplement as facts develop
9. Duty-to-cooperate reminder
10. Contact, and in some states the DOI notice if any part is a denial

**Required contents:** no statute lists them; the requirements are judge-made
and jurisdictional. The practical checklist is: *specific* grounds, *tied to
specific allegations*, *explained*, sent to *all* insureds, *promptly*, naming
*which policies*, and stating *what the insurer is doing meanwhile*. Full
verbatim quotation of the provision is not required — the connection to the
facts is what is required.

**Tables:** less common than in a position letter, but a well-built modern ROR
often carries an allegation-to-provision matrix:

| Allegation | Provision reserved | Basis for the reservation |

**Boilerplate:** the highest of any document in this cluster. Standing
paragraphs on non-waiver, on the right to supplement, on the duty to cooperate,
on declaratory relief, on recoupment, on counsel selection. Expect a genuine
near-duplicate problem in a corpus of these — which makes them a good place to
plant a second near-duplicate trap, one edition apart.

### Identifier scheme

`CLM-2024-004471-ROR-20240902`, per the shared pattern above. Referenced later
as "our reservation of rights letter dated [date]" — and, critically, a
supplemental ROR is a *new letter*, not a revision, so a claim can carry several
ROR letters whose reservations differ. **Date order is the disambiguator, and
the later one does not automatically supersede the earlier — it supplements.**
That is a different supersession semantics from bulletins and worth flagging to
whoever writes the `supersedes` column.

### Precedence

- **An ROR does not create or remove coverage.** It preserves an argument.
- **An ROR beats silence**: with a valid ROR the insurer may defend and later
  deny; without one, in *some* states, it may not.
- **A specific ROR beats a generic ROR**, to the point that a generic one counts
  as none at all in South Carolina (*Harleysville*).
- **An ROR is reserved only as to what it names.** Grounds not raised may be
  lost — the insurer reserved *that* and not *this*
  ([Carlton Fields, "So, What Was Reserved?"](https://www.carltonfields.com/insights/publications/2020/so-what-was-reserved-potential-claims-handling) —
  linked for completeness; the page returned 403 to automated fetch and the
  proposition here is drawn from the search abstract, so treat it as
  lower-confidence).

**Stale edition.** An ROR names the policy *and* its period, and a
well-drafted one quotes the provisions as they existed in the edition attached
to that policy. Retrieved later against a different edition, the quoted text and
the current form disagree **word for word** — which is a much louder signal than
the bare section number in a file note, and a good contrast case to plant
alongside it. Same trap, two different detectability levels.

### What an adjuster searches it for

- "Did we reserve, and on what grounds?" — before deciding whether a defense is
  still available
- "Did we reserve the right to recoup defense costs?"
- "Which allegations did we tie to which exclusion?"
- Template mining, heavily — ROR letters are the most-copied document in the
  claim department, which is exactly why stale ones are dangerous.

### Sample skeleton

```markdown
# Reservation of Rights — CLM-2024-004471

> Meridian Mutual Insurance Company. Fictional document, written for an FDE
> practice engagement. Do not use for anything real.
>
> Document type: reservation of rights letter · Claim ID: CLM-2024-004471 ·
> Policy ID: AUT-4471 · Policy period: 2024-06-01 to 2025-06-01 ·
> Form in force at loss: PA-2023-01 · Letter date: 2024-09-02

## Recipients
## Background Of The Claim
Placeholder: the allegations as made, without adopting them.

## Policies Addressed
## Provisions We Are Relying On
## Allegation-By-Allegation Reservation

| Allegation | Provision reserved | Why we are reserving |
|---|---|---|
| (placeholder) | (placeholder) | (placeholder) |

## What We Will Do While This Is Reserved
## Your Right To Select Counsel
## Recoupment Of Defense Costs
## Your Duty To Cooperate
## This Letter Is Not A Waiver
```

### Sources

- [Rivkin Radler — Insurer's "generic" reservation of rights letters found inadequate (*Harleysville*, S.C. 2017)](https://www.rivkinradler.com/publications/insurers-generic-reservation-rights-letters-found-inadequate-south-carolina-supreme-court/)
- [Dickie, McCamey & Chilcote — Reservation of rights letters: lack of specificity proves fatal](https://www.dmclaw.com/events-media/reservation-of-rights-letters-lack-of-specificity-proves-fatal-to-cgl-insurer-in-south-carolina/)
- [McGuireWoods — Failure to issue a reservation of rights letter results in waiver (*World Harvest Church*, Ga. 2010)](https://www.mcguirewoods.com/client-resources/alerts/2010/5/failuretoissuereservationofrightsletter/)
- [Wiley — Insurer not estopped from denying coverage after defending without a reservation of rights (*Maxwell*, Wis. 2012)](https://www.wiley.law/newsletter-4299)
- [Jackson & Campbell — Seven tips for preparing an effective reservation of rights letter](https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/)
- [DLA Piper — Practical guide for claims managers, part 3: reservation of rights](https://www.dlapiper.com/en/insights/publications/practical-guide-for-claims-managers/dla-pipers-practical-guide-for-claims-managers-in-2022-part-3-reservation-of-rights)
- [Claims Journal — Reservation of Rights Letters](https://www.claimsjournal.com/news/national/2008/07/28/92273.htm)
- [PropertyCasualty360 — Why do insurers write 'reservations of rights' letters?](https://www.propertycasualty360.com/2016/09/30/why-do-insurers-write-reservations-of-rights-letters/)

---

## 4 · Denial letter

### What it is called

**Denial letter**, **denial of claim**, **declination letter**, **disclaimer of
coverage** (New York's regulatory term is *disclaiming liability*), **rejection
letter**, **coverage denial**. A **partial denial** denies part of a claim and
carries the same requirements as to the denied part.

### Who writes it, who is bound

Written by the adjuster, almost always with supervisory sign-off and, on a
contested exclusion, with coverage counsel's input. It is the most heavily
regulated document in this cluster because it is the one the regulator will pull
in an exam and the one a bad-faith plaintiff will put in front of a jury.

Who is bound: **the insurer.** The letter fixes, at minimum, the grounds the
insurer is prepared to stand on, and in *mend the hold* jurisdictions
substantially limits changing them later.

### Shape

**Length:** 1–4 pages. A denial on a clean, undisputed ground ("no coverage was
selected") can be one page. A denial on a contested exclusion runs longer
because the factual-basis requirement makes it longer.

**Structure:**

1. Date, insured/claimant, claim number, date of loss, policy number **and
   edition**
2. What was claimed
3. What the investigation found — the *factual* basis
4. The provision(s) relied on, quoted or specifically referenced
5. **The application of that provision to these facts** — the element regulators
   most often find missing
6. Any part of the claim that IS being paid
7. What the claimant may do next: reconsideration, appraisal where the policy
   has it, suit limitation period
8. **The DOI referral notice**, where the state requires it

**Required contents — sourced.** These are the elements, with the authority for
each:

| Element | Authority |
|---|---|
| Must be **in writing** | 10 CCR 2695.7(b)(1); WAC 284-30-380; MDL-902 §7.A |
| Must list **all bases** for the denial | 10 CCR 2695.7(b)(1) |
| Must state the **factual AND legal basis for each reason** then within the insurer's knowledge | 10 CCR 2695.7(b)(1) |
| Where based on a statute, law, provision, condition or exclusion, must **reference it AND explain its application to the claim** | 10 CCR 2695.7(b)(1) |
| **No denial on a specific provision, condition or exclusion unless reference to it is in the denial** | MDL-902 §7.A; WAC 284-30-380 |
| A **copy must be kept in the claim file** | MDL-902 §7.A; WAC 284-30-380 |
| Must **explain specific reasons for disclaiming**, in writing, as soon as determined | 11 NYCRR 216.6(d) |
| Must be issued **within the decision deadline**: 40 calendar days (CA) / 15 business days after proof of loss (NY; 30 for arson) / 21 days (MDL-902 §7.A) / WA: 15 working days today, moving to 30 calendar days effective 2026-10-18 | 10 CCR 2695.7(b); 11 NYCRR 216.6(c); MDL-902 §7.A; WAC 284-30-380 |
| If more time is needed, **written notice of the need for more time with reasons**, then recurring updates — every 90 days (NY), every 45 days (MDL-902 §7.B), every 30 days (WA) | 10 CCR 2695.7(c); 11 NYCRR 216.6; MDL-902 §7.B; WAC 284-30-380 |
| Must include the **DOI review notice with address and telephone number** | 10 CCR 2695.7(b)(3); MDL-902 §7.H (on claimant objection) |
| A **reasonable and accurate explanation of the basis** is required, and failing to give one is an unfair claims practice | NAIC Model 900 §4.L |
| A claim must **not** be denied for failure to exhibit property unless breach is documented in the file | MDL-902 §5.C |
| A claim must **not** be denied for failure to give written notice within a time limit unless written notice is a policy condition | MDL-902 §5.D |

Sources for the table:
[10 CCR 2695.7 (Cornell LII)](https://www.law.cornell.edu/regulations/california/10-CCR-2695.7),
[11 NYCRR 216.6 (Cornell LII)](https://www.law.cornell.edu/regulations/new-york/11-NYCRR-216.6),
[WAC 284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380),
[NAIC Model 900 §4](https://content.naic.org/sites/default/files/model-law-900.pdf),
[NAIC MDL-902 §5 and §7](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf).

Note the two-tier structure, because it matters for a corpus that spans states:
the NAIC models are the floor almost every state adopts in some form, and
California's 2695.7(b)(1) is materially **stricter** than the model, requiring
both the factual and the legal basis for *each* reason plus an explanation of
how the provision applies. A national denial template that satisfies MDL-902
§7.A can still violate 2695.7(b)(1). **That is a state-variant trap for the
determination cluster equivalent to the state amendatory endorsement trap in the
forms cluster** — and worth planting as one.

Enforcement is real and countable: the Virginia exam cited four violations of
14 VAC 5-400-70 A ("failed to deny a claim or part of a claim in writing and/or
failed to keep a copy of the written denial in the claim file") and one of
14 VAC 5-400-70 B ("failed to provide a reasonable explanation of the basis for
the denial"), and the corrective action plan reads, in part, "Make all claim
denials in writing and keep a copy in the claim file."

**Tables:** less table-heavy than a position letter. Where they appear, it is a
denied-amounts breakdown (item, amount claimed, amount paid, basis) or a
provision-to-reason mapping.

**Boilerplate:** high, and legally mandated boilerplate at that — the DOI
referral paragraph and the suit-limitation reminder are near-verbatim across a
carrier's whole book, varying by state. A good source of near-duplicate pressure
for the retrieval tests.

### Identifier scheme

`CLM-2024-004471-DEN-20240918`. Referenced later as "our denial letter dated
[date]." Where the claim was denied without payment, MDL-902 §4.A requires the
**date of denial** to be separately retrievable — so the date is not merely part
of the id, it is an indexed field, and the `documents` table in CORPUS-PLAN
Step 2b should carry it explicitly rather than leaving it inside prose.

### Precedence

- **The policy edition in force on the date of loss beats the denial letter.**
  A denial that cites a provision correctly under `PA-2021-07` is simply wrong
  if the loss happened under `PA-2023-01` — and vice versa. The date of loss,
  not the date of the letter and not the current form, selects the governing
  text.
- **The denial letter beats the insurer's later, different theory,** in *mend
  the hold* jurisdictions, where the insurer denied on one basis and tries to
  litigate on another — subject to a showing of unfair surprise, arbitrariness,
  or actual prejudice. The counterweight: a denial letter "puts the policyholder
  on notice to challenge that decision," so some courts decline to apply the
  doctrine at all
  ([Mondaq](https://www.mondaq.com/unitedstates/insurance-laws-and-products/1801382/use-it-or-lose-it-federal-court-in-illinois-highlights-the-risks-of-holding-back-policy-defenses)).
- **A denial letter is NOT authority on the next claim.** Majority rule: waiver
  and estoppel cannot create coverage
  ([Wiley on *Maxwell*](https://www.wiley.law/newsletter-4299);
  [von Briesen & Roper](https://www.vonbriesen.com/legal-news/2174/coverage-that-otherwise-does-not-exist-cannot-be-created-through-waiver-or-estoppel-if-the-insurer-does-not-issue-a-reservation-of-rights-to-its-insured)).
  The symmetric proposition — that a prior *denial* does not compel a later
  denial — is even safer: nothing binds an insurer to repeat a decision, and
  MDL-902 §5.A affirmatively requires disclosing all pertinent coverages on
  *this* claim regardless of what was said on the last one.
- **The rationale for the majority rule is worth recording**, because it is what
  makes the stale-edition trap analytically clean: courts decline to create
  coverage by estoppel because (1) they cannot write a new contract for the
  parties, (2) estoppel should not require an insurer to pay a loss for which it
  charged no premium, and (3) courts should not impose a risk the insurer might
  have declined
  ([Lexology / nobadfaith.com on California](https://www.nobadfaith.com/avoid-creating-coverage-by-estoppel-waiver-forfeiture-california/)).
  All three reasons apply *a fortiori* when the prior determination construed a
  form the insurer no longer sells.

**Stale edition, stated as the design rule:**

> A determination is **authority** only within the (policy id, edition,
> jurisdiction, date-of-loss window) it was made in. Outside that tuple it is
> **history** — evidence of how the company reasons, not a rule that binds.

That is expressible as a filter against CORPUS-PLAN's `documents` table:
`edition`, `jurisdiction`, `effective_on`/`expires_on`, `supersedes`. It is not
expressible as "the model will notice the date," which is the failure mode.

### What an adjuster searches it for

- "Have we denied this exact fact pattern before, and on what provision?"
- "What is our standard wording for a [named driver exclusion / late notice /
  non-permissive use] denial?" — template mining, again, the dominant use
- "Does this state require anything extra in the letter?"
- "What did we tell this insured last time?" — before a complaint response
- "Did we deny within the deadline?" — the compliance question

### Sample skeleton

```markdown
# Denial Of Claim — CLM-2024-004471

> Meridian Mutual Insurance Company. Fictional document, written for an FDE
> practice engagement. Do not use for anything real.
>
> Document type: denial letter · Claim ID: CLM-2024-004471 ·
> Policy ID: AUT-4471 · Date of loss: 2024-08-14 · Letter date: 2024-09-18 ·
> Form in force at loss: PA-2023-01 · Jurisdiction: IL

## What You Claimed
## What Our Investigation Found
Placeholder: the factual basis, stated as findings rather than conclusions.

## The Policy Provisions We Relied On
## How Those Provisions Apply To These Facts
Placeholder: one short paragraph per reason, each tied to a named provision.

## Amounts

| Item claimed | Amount claimed | Amount paid | Basis |
|---|---|---|---|
| (placeholder) | (placeholder) | (placeholder) | (placeholder) |

## What Is Still Being Paid
## If You Disagree With This Decision
## Department Of Insurance Review
## Time Limit For Legal Action
```

### Sources

- [Cal. Code Regs. tit. 10 § 2695.7 (Cornell LII)](https://www.law.cornell.edu/regulations/california/10-CCR-2695.7)
- [N.Y. Comp. Codes R. & Regs. tit. 11 § 216.6 (Cornell LII)](https://www.law.cornell.edu/regulations/new-york/11-NYCRR-216.6)
- [WAC 284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)
- [NAIC Model 900 §4](https://content.naic.org/sites/default/files/model-law-900.pdf)
- [NAIC MDL-902 §5, §7](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf)
- [Virginia SCC market conduct exam — 14 VAC 5-400-70 A and B violations](https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf)
- [Property Insurance Coverage Law Blog — Know the Regs to Use the Regs (10 CCR 2695.7)](https://www.propertyinsurancecoveragelaw.com/blog/know-the-regs-to-use-the-regs-a-look-at-california-fair-claims-settlement-practices-regulations-10-ccr-2695-7/)
- [von Briesen & Roper — coverage cannot be created through waiver or estoppel](https://www.vonbriesen.com/legal-news/2174/coverage-that-otherwise-does-not-exist-cannot-be-created-through-waiver-or-estoppel-if-the-insurer-does-not-issue-a-reservation-of-rights-to-its-insured)
- [Avoiding Insurance Bad Faith — avoid creating coverage by estoppel, waiver and forfeiture (California)](https://www.nobadfaith.com/avoid-creating-coverage-by-estoppel-waiver-forfeiture-california/)

---

## 5 · Coverage opinion

### What it is called

**Coverage opinion**, **coverage opinion letter**, **coverage analysis**,
**coverage memo**, **opinion letter**. When it comes from inside the company it
is a **staff counsel coverage opinion**, a **technical claim referral**, or a
**large loss / complex claim review**; when it comes from a supervisor or
technical specialist rather than a lawyer it is a **coverage referral response**
or **technical review memo**. From outside counsel it is a **coverage opinion**
from *coverage counsel*, and it is addressed to the claim department, not to the
insured.

### Who writes it, who is bound

Written by a **staff attorney, coverage counsel, or a technical claims
specialist / supervisor**, at the request of the claim department, when coverage
cannot be resolved from the complaint and the policy alone — Butler Snow frames
the trigger as a claim whose coverage is not determinable under the "eight
corners" review
([Butler Snow](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)).

Nobody is bound by it. It is **advice**, and the claim department can decline to
follow it. But it has two consequences that no other document in this cluster
has:

1. **It may or may not be privileged, and this varies sharply by state.** The
   policyholder-side position is that coverage opinions are part of the
   underlying facts and must be produced; in several states the claim file is
   discoverable in first-party bad faith because it is the only evidence of the
   reasons underlying the coverage determination
   ([Property Insurance Coverage Law Blog on hiding the coverage opinion](https://www.propertyinsurancecoveragelaw.com/blog/attorney-work-product-and-hiding-the-coverage-opinion-a-refresher-on-attorneyclient-privilege/),
   [ABA Section of Litigation](https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/)).
   A common line is that **investigating a claim is a business function
   performed by an adjuster, not a lawyer's legal advice**, so labelling the
   investigator a lawyer does not privilege the investigation
   ([Barnes & Thornburg, privilege and work product in coverage disputes](https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020)).
2. **Privilege is waived by the advice-of-counsel defense.** If the insurer
   defends a bad-faith claim by saying it relied on counsel, the opinion comes in
   (ibid.). Conversely, reliance on genuinely *informed* outside-counsel advice
   is, in many states, a defense to bad faith — which is why Butler Snow warns
   that "both the insurer and counsel may later (sometimes years later) be called
   to defend their actions."

**For our corpus this is the crucial modelling point:** a coverage opinion is
simultaneously the most analytically persuasive document an adjuster will find
and the one with the least binding force. It reads like authority and is not.
That is the second trap in this cluster, independent of the edition trap.

### Shape

**Length:** the longest document in this cluster — 5 to 30+ pages. Practice
guidance describes an **executive summary** being added at the front for longer
or more complex ones
([DRI *For The Defense*, "The Art of Coverage Opinions"](https://digitaleditions.walsworth.com/article/The+Art+of+Coverage+Opinions:+Ten+Tips+for+Better+Legal+Writing/3379274/587555/article.html)).

**Structure — the canonical four parts**, with an optional executive summary:

0. Executive summary / bottom line (longer opinions)
1. **Factual background** — the facts as identified by the attorney
2. **Description of coverage** — the policy, its edition and period, and the
   relevant provisions cited
3. **Coverage analysis** — the issues stated, the law researched, applied
4. **Conclusions and recommendations for further handling**

(ibid.; and Butler Snow's nine-step version: obtain all facts; obtain the policy;
obtain all available investigation material; thoroughly research the law; recite
the facts; cite relevant portions of the policy; state the issues involved; come
to a specific conclusion if possible; suggest appropriate steps.)

**Required contents:** none by statute. The professional standard is the four
parts above plus a *specific conclusion where one is possible* — the fence-sitting
opinion is the one both sources criticise.

**Tables:** occasionally an issues-and-conclusions summary table in the
executive summary, and on multi-policy or multi-year matters a policy/period
table (policy number, period, form and edition, limits, relevant endorsements).
That table is the natural place to plant an edition mismatch, because it is
where the edition is stated as data rather than buried in prose.

**Boilerplate:** low in the analysis, high at the margins — engagement scope,
"this opinion is based on the facts as presently known and may change," privilege
legend, no-third-party-reliance legend.

**Convertibility.** Worth encoding because it creates genuine near-duplicates
across document types: a coverage opinion converts into an ROR or a denial
letter by deleting the analysis section and keeping the operative facts, policy
provisions and conclusions
([Butler Snow](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)).
So an opinion and the letter derived from it share long stretches of text while
differing in authority — a near-duplicate trap where the *right* answer depends
on document type rather than on wording.

### Identifier scheme

Coverage opinions are the least standardised. Three conventions recur:

- law-firm matter number + claim number ("Our file 12345-0002; your claim …")
- an internal referral/legal-file number distinct from the claim number
- title + date only ("Coverage Opinion re: [insured], [date]")

Referenced later as "the coverage opinion dated [date]" or "counsel's
[date] opinion" — again **cited by date**, not by id.

Proposed: `CLM-2024-004471-OPN-20240910`, consistent with the shared pattern,
plus an explicit `author_role` field in the header (`staff counsel` /
`coverage counsel` / `claims supervisor`), because *who wrote it* is what
determines both its weight and its privilege posture, and it is not recoverable
from the body text.

### Precedence

- **An opinion binds nobody.** It is advice. The insurer may act contrary to it;
  the insured has no rights under it.
- **The policy beats the opinion**, on the same waiver/estoppel grounds as
  above.
- **The letter beats the opinion as to what the insurer actually did.** The
  opinion may recommend denial; if the mailed letter reserved rights instead,
  the letter is the fact. An adjuster who retrieves the opinion and not the
  letter gets the company's *thinking* and misses its *position* — which is a
  concrete, testable retrieval failure and a good eval case.
- **An opinion about one claim is not a rule for the next one.** The reasoning
  may be persuasive and the citations may still be good law, but the facts are
  different and the policy may be a different edition.
- **Against the outside world it can be evidence rather than shield**: in bad
  faith it may be discoverable, and if the insurer pleads advice of counsel,
  privilege is waived and the opinion is read to a jury.

**Stale edition.** The opinion is the *most* seductive stale document, for two
reasons. First, it contains legal research, and legal research ages differently
from policy text — the cases may still be good while the clause they construed
has been rewritten. Second, it is the document most likely to be reused
wholesale as a template. The doctrine that makes this concrete is **settled
judicial construction**: courts bind insurers to established constructions of
language they *continue to use*
([Policyholder Pulse](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)).
The corollary is the rule our corpus needs: **when the language changes, the
prior construction, and the opinion that rests on it, stop transferring.**

### What an adjuster searches it for

- "Has legal looked at this exclusion before?"
- "What is our position on [rideshare / permissive use / regular use / named
  driver exclusion / diminished value]?"
- "What cases did counsel cite last time?"
- "Do I need to refer this at all, or is it already answered?" — the referral
  cost is the reason the search happens
- Template mining for the analysis section, which is how a stale opinion
  propagates into a fresh letter.

### Sample skeleton

```markdown
# Coverage Opinion — CLM-2024-004471

> Meridian Mutual Insurance Company. Fictional document, written for an FDE
> practice engagement. Do not use for anything real.
>
> Document type: coverage opinion · Claim ID: CLM-2024-004471 ·
> Policy ID: AUT-4471 · Author role: coverage counsel · Opinion date: 2024-09-10 ·
> Form in force at loss: PA-2023-01 · Jurisdiction: IL ·
> Privileged and confidential — prepared at the request of the claim department

## Executive Summary
Placeholder: two sentences giving the conclusion before the reasoning.

## Question Presented
## Factual Background
## Policies And Periods Reviewed

| Policy ID | Policy period | Form and edition | Limits | Endorsements attached |
|---|---|---|---|---|
| (placeholder) | (placeholder) | (placeholder) | (placeholder) | (placeholder) |

## Provisions At Issue
## Analysis
### Issue 1 — (placeholder)
### Issue 2 — (placeholder)

## Conclusions

| Issue | Conclusion | Confidence |
|---|---|---|
| (placeholder) | (placeholder) | (placeholder) |

## Recommended Handling
## Limitations On This Opinion
Placeholder: based on facts presently known; subject to change.
```

### Sources

- [DRI *For The Defense* — The Art of Coverage Opinions: Ten Tips for Better Legal Writing](https://digitaleditions.walsworth.com/article/The+Art+of+Coverage+Opinions:+Ten+Tips+for+Better+Legal+Writing/3379274/587555/article.html)
- [Butler Snow — My Opinion About Insurance Coverage Opinions](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)
- [Property Insurance Coverage Law Blog — Attorney Work Product and Hiding the Coverage Opinion](https://www.propertyinsurancecoveragelaw.com/blog/attorney-work-product-and-hiding-the-coverage-opinion-a-refresher-on-attorneyclient-privilege/)
- [Barnes & Thornburg — Privilege and Work Product in Insurance Coverage Disputes](https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020)
- [ABA Section of Litigation — Discovery Tips in Coverage and Bad Faith Litigation](https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/)
- [CLM Magazine — Protected or Not?](https://www.theclm.org/Magazine/articles/protected-or-not/2124)
- [PLI — Drafting a Defensible Insurance Coverage Letter](https://www.pli.edu/programs/drafting-a-defensible-insurance-coverage-letter-best-practices-for-insurers-and-coverage-counsel/462866)
- [Policyholder Pulse — Estopping insurers from taking inconsistent coverage positions](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)

---

## Cross-cutting: the edition problem, stated for the corpus designer

Three facts, each sourced elsewhere in this file, combine into the trap:

1. **Form editions are versioned by date, inside the form number.** ISO's
   convention puts the edition month and year in the last four digits — `PP 00 01
   09 18` is form PP 00 01 as revised September 2018, and is a different document
   from `PP 00 01 01 05`. Insurers adopt new editions at different times, so the
   edition date on the specific policy is what must be checked
   ([InsuranceXDate on PP 00 01](https://www.insurancexdate.com/insurance-forms/PP/PP-00-01/),
   [IIABSC on ISO's PAP changes](https://www.iiabsc.com/News/Pages/Newsletters-Publications/SCAgent/articles/PAP.aspx)).
   Our corpus already mirrors this with `PA-2021-07` / `PA-2022-04` /
   `PA-2023-01`.
2. **The governing text is the one in force on the date of loss** — not the
   letter date, not the current edition. The determination documents all recite a
   date of loss, which is the join key.
3. **A determination never says which edition it construed** unless the drafter
   put it there, and the drafter usually did not. A file note cites "§4.2"; a
   denial quotes a paragraph without a form number; an opinion cites the policy
   by number and period but not by form edition.

So the three planted variants, in increasing difficulty:

| Variant | Signal available | Difficulty |
|---|---|---|
| Determination quotes provision text verbatim, text differs from current form | word-level mismatch | easy — detectable from the document alone |
| Determination names the form and edition explicitly | edition string mismatch | easy — but only if the retriever compares it |
| Determination cites a bare section number under an old edition | none in the document; requires claim → date of loss → edition in force | hard — this is the real trap |

The third is the one to plant against an eval case, and the honest conclusion is
that **it is not solvable by the model reading the chunk.** It is solvable by
the `documents` table carrying `edition` and `effective_on`, and by the
determination record carrying `date_of_loss` and `form_in_force_at_loss` as
metadata, so retrieval can filter rather than the model having to notice. That
is an argument *for* CORPUS-PLAN Step 2b, produced by this research rather than
assumed by it.

---

## Precedence claims (for synthesis)

Each line is atomic and sourced, so contradictions across the four researchers'
files are visible when composed.

- **The policy in force on the date of loss beats any prior determination, when the determination construed a different edition of the form.** Composite of the date-of-loss rule and ISO edition versioning — [insurancexdate.com/insurance-forms/PP/PP-00-01/](https://www.insurancexdate.com/insurance-forms/PP/PP-00-01/)
- **The policy beats a coverage position letter, when the letter concedes more coverage than the policy grants — because waiver and estoppel cannot create coverage not otherwise available (majority rule).** — [https://www.wiley.law/newsletter-4299](https://www.wiley.law/newsletter-4299)
- **The policy beats waiver and estoppel generally, when the doctrine would enlarge the covered risk rather than excuse a forfeiture condition.** — [https://www.vonbriesen.com/legal-news/2174/coverage-that-otherwise-does-not-exist-cannot-be-created-through-waiver-or-estoppel-if-the-insurer-does-not-issue-a-reservation-of-rights-to-its-insured](https://www.vonbriesen.com/legal-news/2174/coverage-that-otherwise-does-not-exist-cannot-be-created-through-waiver-or-estoppel-if-the-insurer-does-not-issue-a-reservation-of-rights-to-its-insured)
- **The majority no-coverage-by-estoppel rule beats the contrary result, when the state has not adopted a conclusive-prejudice exception — the rationale being that courts cannot write a new contract, estoppel should not compel payment for an unpremiumed loss, and courts should not impose a declined risk.** — [https://www.nobadfaith.com/avoid-creating-coverage-by-estoppel-waiver-forfeiture-california/](https://www.nobadfaith.com/avoid-creating-coverage-by-estoppel-waiver-forfeiture-california/)
- **Estoppel beats the insurer's coverage defense, when the insurer assumed the defense without an effective reservation of rights AND the state applies a conclusive presumption of prejudice (Georgia, *World Harvest Church* 2010).** — [https://www.mcguirewoods.com/client-resources/alerts/2010/5/failuretoissuereservationofrightsletter/](https://www.mcguirewoods.com/client-resources/alerts/2010/5/failuretoissuereservationofrightsletter/)
- **The insurer's coverage defense beats estoppel, when the insurer defended without a reservation but the state holds estoppel cannot expand coverage (Wisconsin, *Maxwell* 2012) — directly contradicting the preceding claim, by jurisdiction.** — [https://www.wiley.law/newsletter-4299](https://www.wiley.law/newsletter-4299)
- **A specific reservation of rights beats a generic one, when the letter must actually preserve a coverage defense — generic reservations with block-quoted provisions and no tie to the allegations are ineffective (South Carolina, *Harleysville* 2017).** — [https://www.rivkinradler.com/publications/insurers-generic-reservation-rights-letters-found-inadequate-south-carolina-supreme-court/](https://www.rivkinradler.com/publications/insurers-generic-reservation-rights-letters-found-inadequate-south-carolina-supreme-court/)
- **A timely reservation of rights beats a late one, when the delay prejudiced the insured — there is no fixed deadline but delay risks waiver or estoppel.** — [https://www.dlapiper.com/en/insights/publications/practical-guide-for-claims-managers/dla-pipers-practical-guide-for-claims-managers-in-2022-part-3-reservation-of-rights](https://www.dlapiper.com/en/insights/publications/practical-guide-for-claims-managers/dla-pipers-practical-guide-for-claims-managers-in-2022-part-3-reservation-of-rights)
- **A later reservation of rights supplements rather than supersedes an earlier one, when both address the same claim — unlike bulletins, ROR letters accumulate.** (Practice convention drawn from the specificity cases; no single-source citation — lower confidence.) — [https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/](https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/)
- **Grounds named in a reservation of rights beat grounds omitted from it, when the insurer later wants to rely on the omitted ground.** Supported by the tip-6 requirement that a reservation name the allegation, the limitation, and the connection between them — a ground with none of those three is not reserved. — [https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/](https://www.jackscamp.com/seven-tips-for-preparing-an-effective-reservation-of-rights-letter/) (see also [Carlton Fields, "So, What Was Reserved?"](https://www.carltonfields.com/insights/publications/2020/so-what-was-reserved-potential-claims-handling), which returned 403 to automated fetch)
- **The stated grounds in a denial letter beat a new, different ground raised later in litigation, when the state applies the mend-the-hold doctrine AND there is unfair surprise, arbitrariness, or actual prejudice.** — [https://www.mondaq.com/unitedstates/insurance-laws-and-products/1801382/use-it-or-lose-it-federal-court-in-illinois-highlights-the-risks-of-holding-back-policy-defenses](https://www.mondaq.com/unitedstates/insurance-laws-and-products/1801382/use-it-or-lose-it-federal-court-in-illinois-highlights-the-risks-of-holding-back-policy-defenses)
- **A new ground beats the mend-the-hold doctrine, when the denial letter itself put the policyholder on notice to challenge the decision — courts split on this.** — [https://www.propertyinsurancecoveragelaw.com/blog/mending-the-hold-an-oldie-but-a-goodie-part-1-the-concept/](https://www.propertyinsurancecoveragelaw.com/blog/mending-the-hold-an-oldie-but-a-goodie-part-1-the-concept/)
- **A written denial beats an oral one, when the claim is denied in whole or in part — the denial must be in writing and a copy kept in the claim file.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§7.A) and [https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)
- **A denial ground not referenced in the denial letter is unavailable, when the ground is a specific policy provision, condition or exclusion.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§7.A)
- **California's denial requirements beat the NAIC model floor, when the claim is a California first-party claim — 2695.7(b)(1) additionally requires the factual AND legal basis for each reason plus an explanation of how the provision applies.** — [https://www.law.cornell.edu/regulations/california/10-CCR-2695.7](https://www.law.cornell.edu/regulations/california/10-CCR-2695.7)
- **State-specific denial-letter deadlines beat the model regulation's 21 days, when the state has adopted its own: 40 calendar days (CA), 15 business days after proof of loss (NY; 30 for arson), and, in Washington, 15 working days until 2026-10-18 and 30 calendar days after it.** — [10 CCR 2695.7(b)](https://www.law.cornell.edu/regulations/california/10-CCR-2695.7), [11 NYCRR 216.6](https://www.law.cornell.edu/regulations/new-york/11-NYCRR-216.6), [WAC 284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)
- **A mailed letter beats a file note, when the two disagree about what the insurer's position was — the letter is what the insured received and what the regulation required in writing.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§7.A)
- **A file note beats nothing, but its absence is itself a violation, when the file cannot be reconstructed as to events and dates pertinent to the claim.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§4.B) and [https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf](https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/for-companies/-market-conduct-examination-reports-/25405.pdf)
- **A file note beats an oral communication as the record of it, when the decision was not sent in writing — the file must show how, when and to whom notice was made.** — [https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380](https://app.leg.wa.gov/wac/default.aspx?cite=284-30-380)
- **A mailed letter beats a coverage opinion, when the two differ — the opinion is what counsel recommended, the letter is what the insurer did.** (Derived from the convertibility of an opinion into a letter; no case directly on point — lower confidence.) — [https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions](https://www.butlersnow.com/news-and-events/my-opinion-about-insurance-coverage-opinions)
- **A coverage opinion binds nobody, when it is treated as authority rather than advice — but it may be discoverable evidence against the insurer in bad faith litigation.** — [https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/](https://www.americanbar.org/groups/litigation/resources/newsletters/insurance-coverage/discovery-young-litigators-bad-faith/)
- **Discovery beats privilege over a coverage opinion, when the insurer pleads reliance on advice of counsel as a bad-faith defense.** — [https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020](https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020)
- **Discovery beats privilege over claim investigation materials, when the investigation was a business function performed as claims handling rather than legal advice.** — [https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020](https://btlaw.com/en/insights/blogs/privilege-and-work-product-in-insurance-coverage-disputes-2020)
- **A prior settled judicial construction beats the insurer's new contrary reading, when the insurer continues to use the identical policy language.** — [https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)
- **The new edition's text beats a prior construction, when the wording changed between editions — the settled-construction doctrine is keyed to unchanged language. THIS IS THE PLANTED TRAP.** — [https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)
- **A prior representation to the regulator beats the insurer's later narrower reading, when the insurer told the regulator at filing that the change would not significantly reduce coverage (regulatory estoppel) — and this attaches to the filing, so it survives an edition change.** — [https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)
- **A prior adjudicated position beats the insurer's inconsistent later position, when judicial estoppel, res judicata or collateral estoppel applies — i.e. the position was actually litigated and decided, not merely asserted in a claim letter.** — [https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/](https://www.policyholderpulse.com/estopping-insurers-inconsistent-coverage-positions/)
- **A prior claim determination does NOT beat the policy on a later separate claim, when the insured merely knew of the prior outcome — estoppel requires detrimental reliance, which mere awareness does not supply.** — [https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-1/](https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-1/)
- **Waiver beats a policy condition without any showing of reliance, when the insurer intentionally relinquished that condition — unlike estoppel, waiver needs no reliance, but it still cannot enlarge covered risks.** — [https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-2/](https://www.thealiadviser.org/liability-insurance/waiver-and-estoppel-part-2/)
- **The duty to disclose all pertinent coverages on the current claim beats any prior determination's silence, when a coverage exists that was not discussed before.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§5.A)
- **A labelled payment beats an unlabelled one, when multiple coverages are in play — failing to indicate the coverage under which each payment is made is an unfair claims practice.** — [https://content.naic.org/sites/default/files/model-law-900.pdf](https://content.naic.org/sites/default/files/model-law-900.pdf) (§4.J)
- **A policy-condition denial beats a late-written-notice denial, when written notice is not itself a policy condition — the insurer may not deny for failure to give written notice absent such a condition.** — [https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf](https://www.propertyinsurancecoveragelaw.com/wp-content/uploads/2017/08/MDL-902-1.pdf) (§5.D)
- **An open claim number beats a draft claim number as the canonical identifier, when a claim has both — in Guidewire ClaimCenter's base configuration drafts start `999` and open claims start `000`.** — [https://docs.guidewire.com/cloud/cc/202507/cloudapibf/cloudAPI/topics/111-CCFNOL/01-executing-FNOL/c_the-FNOL-process-in-ClaimCenter.html](https://docs.guidewire.com/cloud/cc/202507/cloudapibf/cloudAPI/topics/111-CCFNOL/01-executing-FNOL/c_the-FNOL-process-in-ClaimCenter.html)
