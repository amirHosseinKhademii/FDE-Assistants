# Cluster 2 — Insurer-authored internal documents (US personal auto)

*Research file. No code. Written 2026-09-11 for Step 1 of [`CORPUS-PLAN.md`](../plans/CORPUS.md).*

Scope: the three document families an insurer writes **for its own staff and its
own producers** — underwriting manuals, claims handling procedures, and
adjuster/claims bulletins. External documents (policy forms, endorsements, DOI
circulars, statutes) belong to other researchers' files; this one only records
where they sit in the precedence order.

**A note on evidence quality, read this first.** These are internal documents by
construction, and the NAIC handbook says so explicitly: companies' underwriting
and claims manuals "are generally regarded as proprietary and, as such, should be
protected from public disclosure"
([NAIC Market Regulation Handbook, Vol. I](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf)).
So the corpus of public artifacts is uneven:

| Family | Public evidence available | Confidence |
|---|---|---|
| Underwriting manual | **Strong.** Texas and several other states require the filed guidelines to be public; whole personal-auto manuals are on the open web. | High — read primary documents |
| Claims handling procedure | **Medium.** The category and its required contents are described by statute (FL) and by the NAIC examiner handbook; a full personal-auto one is not public. | Medium — described by regulators, shape inferred from public analogues |
| Adjuster/claims bulletin | **Weak for content, strong for existence.** The NAIC handbook names "claim bulletins" as a distinct document class an examiner must request; no real insurer claims bulletin surfaced in the open. Numbering conventions below are taken from **public analogues** (regulator bulletins, FEMA WYO bulletins, ISO circulars) and are labelled as such. | Existence: attested. Numbering: analogue-derived |

Three evidence tiers, used consistently throughout:

- **[attested]** — I fetched and read the document, or read a direct quotation of
  it inside a document I fetched.
- **[inferred]** — reasoned from a public analogue or from general practice. No
  document says it. Flagged again in the precedence list at the bottom.
- **[unverified — search result only]** — it came back in a web-search summary
  and the underlying page could not be rendered (JS-only page, oversized PDF).
  Treat as a lead, not a finding.

Two non-auto analogues are used deliberately and are labelled inline every time:
**Florida §627.4108 is residential property, not auto**, and **NFIP/WYO is
flood, not auto**. They are cited for *shape and mechanics* only, never as
personal-auto authority.

---

## Underwriting manuals

### What it is called

In the wild the same document answers to several names, and they are not quite
synonyms:

- **Underwriting guidelines** — the eligibility/acceptability half. The term of
  art, as reported: "the set of rules and requirements an insurer provides for
  its agents and underwriters"
  ([IRMI](https://www.irmi.com/term/insurance-definitions/underwriting-guidelines)).
  **[unverified — search result only]**
- **Rules manual** / **rate manual** / **rating manual** — the rating half:
  classification, tier placement, discounts, surcharges, fees. Kansas examiners
  refer to "the Auto Rating Manual" and to "the rule page of their filed rating
  manual"
  ([KID Liberty Mutual exam report](https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf)). **[attested]**
- **Program manual** / **Personal Auto Program Rule Manual** — the combined
  document, common in the nonstandard auto market. GAINSCO's Ohio filing is
  titled "Private Passenger Automobile Underwriting Guidelines" and refers to
  itself internally as "this Personal Auto Program Rule Manual"
  ([GAINSCO OH manual](https://www.gainsco.com/wp-content/uploads/2021/12/OH-MGA-Personal-Auto-Program-Rules-Manual.pdf)). **[attested]**
- **Underwriting bulletin** — the NAIC handbook lists these separately from the
  guidelines, in the same breath: "the regulated entity's underwriting
  guidelines, underwriting bulletins, declination procedures, agency agreements
  and correspondence with producers" (Vol. I, Ch. 16). **[attested]** So the
  bulletin pattern exists on the underwriting side too, not only in claims.

For the corpus, treat **underwriting manual** as the container and note that in
practice one insurer ships it as one PDF per state.

### Who writes it, who is bound

Written by the product/underwriting organisation — actuarial writes the rating
rules, underwriting writes eligibility, compliance clears it, and in many states
it is then **filed with the DOI**. Texas requires personal auto underwriting
guidelines to be filed "not later than 10 days after use," via SERFF, and they
are **not confidential** — subject to open-records requests under Tex. Ins. Code
§38.002 ([TDI](https://www.tdi.texas.gov/company/underwriting-guidelines.html)). **[attested]**
That filing requirement is why this family is the one you can actually read.

Bound: **underwriters and appointed producers.** The GAINSCO manual is addressed
to agents and makes the binding relationship explicit — agents have "immediate
binding authority in accordance with all the rules and procedures set forth in
this manual," and "failure to fulfill any or all of the Agent Duties may result
in changes to the Agent's status with the Company, including suspension or
termination." **[attested]**

Bound in a second, sharper sense: **the insurer itself**. Examiners "use the
above information to determine regulated entity compliance with its own manuals
and guidelines" and "should confirm that the regulated entity's underwriters and
producers consistently apply the regulated entity's guidelines for all business
selected or rejected" (NAIC Vol. I, Ch. 16). **[attested]** Kansas fined Liberty
Mutual for charging premium "due to the use of an incorrect tier developed from a
matrix not filed and approved by KID," and for giving tier credit under "not a
filed migration procedure." **[attested]** This asymmetry — a filed underwriting
manual has real external force, a claims manual does not — is the most
interesting finding in this cluster and is picked up under Precedence.

An adjuster is **not** the audience. This matters for retrieval: an adjuster
querying the corpus will sometimes land in the underwriting manual and the right
answer is often "this is not the document that decides your question."

### Shape

**Length.** 15–60 pages per state for a nonstandard personal auto program;
larger carriers run longer and split rating into a separate manual. The GAINSCO
Ohio manual is 19 pages. **[attested]**

**Structure.** Front matter → agent/producer duties → product → premium →
appendix. GAINSCO's actual table of contents:

```
Table of Contents
Company Contact Information
Agent Information
    BINDING AUTHORITY – NEW BUSINESS / – ENDORSEMENTS
    SEVERE WEATHER PROCEDURES / AGENT DUTIES / VEHICLE INSPECTIONS / COMMISSION
Product Information
    COVERAGES & LIMITS / UNACCEPTABLE RISKS (→ UNACCEPTABLE VEHICLES)
    DRIVERS (→ EXCLUDED DRIVERS / UNACCEPTABLE DRIVERS / LICENSE STATE MATRIX)
    DISCOUNTS (→ REQUIRING DOCUMENTATION / ADDITIONAL)
    SURCHARGES (→ ADDITIONAL SURCHARGES)
    NON-OWNER / SR-22 / CANCELLATIONS / RENEWALS / REINSTATEMENTS / REWRITES
    PREMIUM INSTALLMENT PLANS
Premium Determination
    DRIVER CLASSIFICATION / DRIVER AVERAGING / PHYSICAL DAMAGE
    REPORTS USED FOR UNDERWRITING / INSURANCE SCORING / REPORT DATA CORRECTIONS
    VEHICLE CHARACTERISTICS
Fees / Claims / Material Misrepresentation / APPENDIX
```
**[attested]**

**Heading conventions.** ALL-CAPS section headings, two or three levels deep, no
numbering in the GAINSCO example — navigation is by ToC and running footer.
Larger carriers and bureau-style manuals *do* number: "Rule 1. Definitions,
Rule 2. …" is the classic Personal Vehicle Manual layout, and Kansas examiners
cite a location as "**Section B, page 03**" of the Auto Rating Manual, which
tells you the filed manuals are addressed by section-and-page rather than by
heading. **[attested]**

**Tables — yes, heavily. This is the table-densest of the three families.**
Observed and typical column sets:

| Table | Columns as seen / typical |
|---|---|
| Coverages & limits | Coverage \| Available limits (per person / per accident) \| Deductible options |
| Unacceptable vehicles | Make (a grid of ~40 marque names) \| Commercial Type \| Gross Weight \| Horsepower \| Model Age |
| License state matrix | License State/Status \| Classification (corresponds to options on rater) |
| Driver class / points | Violation or accident type \| Points \| Experience period (months) |
| Tier placement | Tier \| Qualifying characteristics \| Eligibility test |
| Discounts | Discount \| Eligibility \| Documentation required \| Applies to (policy/driver/vehicle) |
| Surcharges | Surcharge \| Trigger \| Applies to |
| Fees | Fee \| Amount \| When charged \| Refundable |
| Territory | Territory code \| ZIP/county \| Relativity |

**[attested]** for coverages/limits, unacceptable vehicles, license state matrix;
**[inferred]** for the point/tier/territory tables, from the Kansas exam findings
which reference a "rating matrix," "Tier Eligibility" and "rule page."

**Boilerplate.** Four things recur and are worth reproducing in shape. *The
sentences below are quoted from a publicly filed document for identification
only — generated corpus documents must use original wording, per
`CORPUS-PLAN.md`.*

1. A running effective-date footer on **every page** — GAINSCO prints
   `EFFECTIVE DATES: 03/22/2026 New, 04/26/2026 Renewal` at the foot of each
   page. **[attested]** This is the single most reusable convention in the whole
   cluster: it means any chunk of the document carries its own edition.
2. A scope-and-escape clause: the manual "addresses minimum requirements" and
   "for situations not addressed within these pages … please call Customer
   Service before binding." **[attested]**
3. A reservation of discretion: "The Company reserves the right to make final
   underwriting decisions on all applications." **[attested]**
4. A misrepresentation warning in caps near the driver-listing rules. **[attested]**

### Identifier scheme

Underwriting manuals are identified by **(company or program) × (state) ×
(line) × (effective dates)**, not by a serial number. Two dates, not one:
**new business effective** and **renewal effective**, typically 30–45 days apart
(GAINSCO: 03/22/2026 new, 04/26/2026 renewal). **[attested]** A document-id
scheme that assumes one effective date will mis-model this family.

Observed and analogue forms:

```
OH-MGA-Personal-Auto-Program-Rules-Manual          (GAINSCO, filename)   [attested]
"Kansas State Homeowners Rating Manual"            (KID exam, by name)   [attested]
"Auto Rating Manual, Section B, page 03"           (KID exam, locator)   [attested]
2016 mpa manual eff 04-01-16                       (Quincy Mutual, filename) [attested]
```

SERFF filings, which is how the revision is actually transacted, carry a company
tracking number and a state tracking number; the company number is conventionally
`<CO>-<LINE>-<YYYY>-<NN>`. **[inferred]** — I did not read a SERFF record.

**Suggested regex for the corpus** (ours to choose, informed by the above):

```
^UW-(?<line>PA)-(?<juris>[A-Z]{2}|US)-(?<eff>\d{4}-\d{2})(?:-R(?<rev>\d{2}))?$
    e.g. UW-PA-IL-2024-03, UW-PA-IL-2024-03-R01
```

The `juris` slot is mandatory for this family — an underwriting manual without a
state is not a real object.

### Precedence

Four rules, in descending strength.

1. **Statute, regulation and DOI order beat the manual outright.** The GAINSCO
   manual's own rules cite Ohio statute as the reason for a rule ("Consistent
   with Ohio statute 4509.46 …") rather than the other way round. **[attested]**
2. **The manual as filed beats the manual as practised.** Deviating from the
   filed rating rules is a violation in itself, not merely evidence of one.
   Kansas cited Liberty Mutual under K.S.A. 40-955(a)(f) for using "an incorrect
   tier developed from a matrix not filed and approved," and ordered premium
   refunds. **[attested]** Note the direction: the insurer was punished for
   departing from its *own* document. Contrast the claims side, below.
3. **The manual binds issuance, not coverage.** It decides whether a policy is
   written, at what rate, in what tier. Once the policy is issued, the contract
   is the policy. An eligibility rule the underwriter missed does not retroactively
   remove coverage from an issued policy — the remedy is cancellation/non-renewal
   "in accordance with state law" (GAINSCO's own phrasing) or rescission for
   material misrepresentation, both of which run through the policy and statute,
   not through the manual. **[attested]** for the remedy language; **[inferred]**
   for the general proposition.
4. **Versus the policy form:** no conflict of authority, because they answer
   different questions. Where a manual describes a coverage (a limit table, a
   deductible option) and the issued form/dec disagrees, **the form and the
   declarations govern the contract** and the manual discrepancy is a rating or
   filing error. **[inferred]** — this follows from (3) and from the filed-rate
   cases but I did not find a case squarely holding it for personal auto.

The filed-rate doctrine is reported to be the outer edge of this: once a rate is
filed and approved it is the lawful rate, and a policyholder cannot sue to have it
recomputed (*Grossman v. GEICO Cas. Co.*, 2d Cir., personal auto, NY)
([ArentFox Schiff summary](https://www.afslaw.com/perspectives/alerts/second-circuit-rules-the-filed-rate-doctrine-bars-the-recalculation-approved)).
**[unverified — search result only]** The Kansas refund order above is the
primary, attested version of the same point and should be preferred.

### What an adjuster searches it for

Rarely the adjuster's first stop, and that is the point — but there are real hits:

- **Was this driver listed / excluded / unacceptable?** A named-driver exclusion
  or an undisclosed-driver rule is where a claims question crosses into
  underwriting. GAINSCO's manual states that undisclosed drivers "may constitute
  a material misrepresentation, which may result in all insurance coverages being
  void." **[attested]** An adjuster hitting *that* sentence has found a
  rescission referral, not a coverage decision.
- **Was the vehicle eligible at all?** Rideshare/delivery use, business use,
  vehicles titled to an LLC, model age over 30 for physical damage — all
  eligibility rules in the manual, all of which show up as claim-time surprises.
  **[attested]**
- **What did the agent have to document?** Vehicle inspection and photo
  requirements exist partly as a claims defence: GAINSCO reserves the right to
  recover previously-existing damage from the agent who skipped the inspection.
  **[attested]**
- **Was the endorsement bound in time?** 72-hour binding authority, no
  back-dating. **[attested]**
- **Territory/garaging** when the loss address does not match the policy address.

The corpus trap available here: an adjuster searching "rideshare" should find the
underwriting manual's *unacceptable-risk* rule and must not mistake it for a
*coverage* exclusion. Those are different documents with different force.

### Sample skeleton

*Original outline. No real insurer wording.*

```markdown
# Personal Auto Program — Underwriting Manual — [State]
Effective: [date] new business / [date] renewal business
Document: UW-PA-XX-YYYY-MM   Supersedes: UW-PA-XX-YYYY-MM

## 1. How to use this manual
Placeholder: states the manual covers eligibility, classification and rating for
the program named above, and that anything not addressed is referred before bind.

## 2. Producer authority
### 2.1 New business binding
Placeholder: describes what a producer may bind without referral and the
conditions attached.
### 2.2 Endorsement binding
Placeholder: describes the window for processing a mid-term change.
### 2.3 Suspension of binding authority
Placeholder: describes when binding is suspended and how it is restored.

## 3. Eligibility
### 3.1 Acceptable risks
### 3.2 Unacceptable vehicles
| Category | Test | Disposition |
### 3.3 Unacceptable drivers
| Category | Lookback (months) | Threshold | Disposition |
### 3.4 Excluded drivers
Placeholder: describes the signed exclusion requirement.

## 4. Classification and tier placement
### 4.1 Driver classification
| Class code | Age band | Marital status | Licence status | Years experience |
### 4.2 Tier assignment
| Tier | Qualifying characteristics | Movement at renewal |
### 4.3 Licence state matrix
| Licence state / status | Rating classification |

## 5. Discounts
| Discount code | Eligibility | Documentation required | Level (policy/driver/vehicle) |

## 6. Surcharges
| Surcharge code | Trigger | Lookback (months) | Level |

## 7. Coverages and limits offered
| Coverage | Available limits | Deductible options | Notes |

## 8. Fees
| Fee | Amount | When charged | Refundable |

## 9. Policy administration
### 9.1 Cancellation  ### 9.2 Non-renewal  ### 9.3 Reinstatement  ### 9.4 Rewrite

## 10. Material misrepresentation
Placeholder: states the consequence of undisclosed drivers or vehicles and the
referral path.

## Appendix A — Revision history
| Revision | Effective (new) | Effective (renewal) | Sections changed | Supersedes |
```

### Sources

- [GAINSCO / MGA Insurance Co., Ohio Private Passenger Automobile Underwriting Guidelines, eff. 03/22/2026](https://www.gainsco.com/wp-content/uploads/2021/12/OH-MGA-Personal-Auto-Program-Rules-Manual.pdf) — read in full
- [Texas Department of Insurance, Underwriting guidelines filing requirements](https://www.tdi.texas.gov/company/underwriting-guidelines.html)
- [Kansas Insurance Department, Market Conduct Examination — Liberty Mutual Group (#111)](https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf) — read
- [Kansas Insurance Department, Market Conduct Examination — Auto Club of Missouri Group (#1148)](https://insurance.ks.gov/documents/other-services/marketconduct-exams/AutoClubExamReportFinal_1.pdf) — read
- [NAIC Market Regulation Handbook, Vol. I (2017 ed.)](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf) — Ch. 16 general standards, underwriting practices
- [Quincy Mutual, Massachusetts Private Passenger Auto manual (rule-numbered layout)](https://www.quincymutual.com/pdfs/2016%20mpa%20manual%20eff%2004-01-16.pdf)
- [Farm & Home Mutual, Personal Vehicle Manual — rule numbers and subjects](https://www.fmh.com/docs/librariesprovider81/manuals-and-forms/personal-auto-program.pdf)
- [IRMI, "underwriting guidelines"](https://www.irmi.com/term/insurance-definitions/underwriting-guidelines)
- [ArentFox Schiff on *Grossman v. GEICO Cas. Co.* (filed-rate, personal auto)](https://www.afslaw.com/perspectives/alerts/second-circuit-rules-the-filed-rate-doctrine-bars-the-recalculation-approved)
- [Perr&Knight, "The Value of Rating Manual Compliance Reviews"](https://www.perrknight.com/2017/06/06/rating-manual-compliance-reviews/)

---

## Claims handling procedures / claims manuals

### What it is called

The regulator's vocabulary, which is the most stable:

- **Claim procedure manual** — the NAIC handbook's own term, repeated across
  every line-of-business chapter's "Documents to be Reviewed" checklist:
  `_____ Regulated entity's claim procedure manuals`. **[attested]**
- **Adjuster training manual** — listed alongside it and treated as a distinct
  artifact: "Claim procedure manuals, adjuster training manuals and claim
  bulletins should be reviewed" (Vol. I, Ch. 17 §G, Conducting the Property and
  Casualty Examination). **[attested]** That one sentence is the canonical
  three-way split and it is the reason this corpus cluster has three families.
- **Claims-handling manual** — the statutory term in Florida
  ([Fla. Stat. §627.4108](https://www.flsenate.gov/laws/statutes/2024/627.4108)),
  *which applies to residential property insurers, not auto*. **[attested,
  non-auto]**
- **Best practices**, **claim handling guidelines**, **operation guide**,
  **desk manual**, **job aid** — the internal names. State Farm's are
  reported to be "Operation Guides," with the appraisal one a public exhibit
  ([Property Insurance Coverage Law Blog](https://www.propertyinsurancecoveragelaw.com/blog/state-farm-operation-guide-regarding-appraisal/)). **[unverified — search result only]**

Naming advice for the corpus: use **claims handling procedure** as the doc_type
and let the title vary, because real desks are inconsistent about it and that
inconsistency is itself a retrieval problem worth modelling.

### Who writes it, who is bound

Written by claims leadership with compliance and legal; in some carriers a
separate "claim quality"/"claim practices" unit owns it. Bound: **every staff
adjuster, examiner, supervisor and — via contract — every independent adjuster
and TPA handling the carrier's claims.**

The binding is real and audited from two directions:

- **Internally.** Deviation shows up in file audits. Kansas found "nine homeowner
  claim files did not show that the initial call was returned to the claimant
  within 24 hours as specified in **company guidelines**," and told the company
  to "review their claim handling procedures to ensure that their guidelines are
  followed." **[attested — homeowner files, not auto; the examination method is
  line-agnostic but the finding itself is not personal-auto authority]** Note the
  finding is *failure to follow your own manual* — but see Precedence for what that does and does not prove.
- **Externally.** Florida now requires residential property insurers to *have*
  one, to certify annually that it "complies with the requirements of the code
  and comports to, at a minimum, usual and customary industry claims-handling
  practices," and to produce it to the Office within **5 business days** of
  request; initial attestation 1 Aug 2023, annually by 1 May thereafter
  ([Fla. Stat. §627.4108](https://www.flsenate.gov/laws/statutes/2024/627.4108);
  [FLOIR notice to industry](https://floir.gov/home/2023/07/18/notice-to-industry-implementing-section-627.4108-f.-s.-claims-handling-manuals-submission-attestation)). **[attested, residential property only —
  there is no equivalent personal-auto mandate]**

### Shape

**Length.** Large. This is the longest document family in the corpus by an order
of magnitude. The public characterisation of State Farm's Operation Guides —
that printed out they run "twenty feet of pure paper, just for claims" — is
trade-press colour rather than a measurement.
**[unverified — search result only]** Directionally it matches the regulator's
picture of the artifact, but do not treat the figure as evidence. Practically: a personal auto claims manual is
a *set* of documents, split by claim type (auto physical damage, total loss,
bodily injury, UM/UIM, subrogation, SIU) with a shared front section.

**Structure.** The regulators effectively dictate the spine, because the manual
must map to the examination standards. Two independent sources give nearly the
same list.

Florida §627.4108's required contents (residential property, but the process is
generic): initial receipt and acknowledgement; communicating with the
policyholder from receipt through closure; establishing reserves; investigating
including inspection; preliminary estimates and estimates of covered damage and
communicating them; payment, partial payment or denial and communicating the
decision; closing the claim; plus anything else the Office requires. **[attested]**

The NAIC's P&C claims examination areas, which a well-built manual mirrors
section for section: time studies for acknowledgement/investigation/settlement;
general handling; closed-without-payment; unfair claims practices; claim forms;
and "company procedures, training manuals and claim bulletin review." Auto
specifics called out: "procedures for **total loss settlement, salvage
disposition and subrogation** efforts," adjuster licensing cross-checks, and the
examiner's review with the claim manager of "the maintenance of claim records and
**draft and settlement authority**." **[attested]** That last phrase is the
regulator naming the authority-limits table.

**Heading conventions.** Decimal-numbered, deep. `3.4.2` style, because the
manual is cross-referenced from bulletins, training and audit checklists and
therefore needs stable addresses. Kansas's "Section B, page 03" locator for a
rating manual shows the same addressing instinct on the underwriting side.
**[inferred]** for claims specifically.

**Tables — yes, and they hold the operationally decisive content.**

| Table | Columns |
|---|---|
| Contact / cycle-time standards | Event \| Standard (hours/days) \| Measured from \| Exception |
| Settlement & draft authority matrix | Role / level \| Coverage or claim type \| Indemnity authority \| Expense authority \| Reserve authority \| Next approver |
| Reserve setting | Claim type \| Initial reserve basis \| Review trigger \| Re-reserve interval |
| Escalation / referral | Trigger condition \| Refer to \| Timeframe |
| Total loss valuation | Input \| Source \| Documentation required |
| Documentation checklist | Claim type \| Required document \| When obtained |
| State variations | State \| Requirement \| Statute/reg cite \| Overrides section |

The **authority matrix** is the one that matters most for retrieval, and the one
an adjuster actually opens the manual for. **[attested]** that "draft and
settlement authority" is a reviewed artifact (NAIC Vol. II, Ch. 23);
**[inferred]** for the exact column set — the tiered structure (field/desk
adjuster → senior → supervisor → committee/regional director) is described in
practitioner writing, not in a document I read
([CDB Injury Law](https://cdbinjurylaw.com/insurance-adjuster-settlement-authority-limits/) — plaintiff-firm blog, low weight).

**A state-variations table or appendix is near-universal** and is where the
national manual defers to state law. This is a precedence mechanism embedded
*inside* a document, and worth planting in the corpus for that reason. **[inferred]**

**Boilerplate.** Expect, and reproduce in shape:

1. A confidentiality/proprietary legend on every page — supported by the NAIC's
   own observation that these manuals are "generally regarded as proprietary."
   **[attested]**
2. A "this is guidance, the policy governs coverage" disclaimer near the front.
   **[inferred]** — I did not read one, but it is the natural drafting response
   to the case law in Precedence, and every public-facing analogue carries
   something like it.
3. A revision block: version, effective date, owner, review cycle.
4. A pointer to where current bulletins live, since the manual is the slow
   document and the bulletin is the fast one.

### Identifier scheme

Claims manuals are identified by **title + version + effective date + owning
unit**, not by serial. The revision marker is the load-bearing part:

```
Claims Handling Procedures, Personal Auto — Rev. 7, effective 2024-04-01
Auto Total Loss Procedure — v3.2 — eff. 01/15/2025 — owner: Claims Practices
```
**[inferred]** — no real personal-auto example is public. The nearest public
analogue is FEMA's NFIP **Adjuster Claims Manual**, reported to be identified by
edition month/year with prior editions kept in an archive
([FEMA, Flood Insurance Manuals and Handbooks](https://www.fema.gov/flood-insurance/work-with-nfip/manuals))
— **[unverified — search result only; the FEMA manuals page would not render]**.
What *is* attested is the equivalent mechanic on the bulletin side, where dated
prior editions are kept posted alongside the current one (Delaware, below).

Two structural facts a regex must accommodate:

- **The manual is a set, not a file.** Section-level ids (`CHP-PA-04`,
  `CHP-PA-TL-02`) are more useful than one document id, because retrieval hits
  sections and because bulletins amend sections.
- **Version is a sequence, effective date is a date, and they are not
  interchangeable** — Rev. 7 can have an effective date later than a bulletin
  that amends it.

**Suggested regex:**

```
^CHP-(?<line>PA)-(?<topic>[A-Z]{2,4})-(?<sec>\d{2})(?:-v(?<ver>\d+(?:\.\d+)?))?$
    e.g. CHP-PA-TL-02-v3.2   (personal auto, total loss, section 02, version 3.2)
```

### Precedence

This is where the cluster's headline distinction lives, and it needs four
separate statements because they are often collapsed into one and they do not
all hold equally.

**(a) The policy contract determines coverage; the manual does not.** The manual
governs *conduct* — timeliness, documentation, who approves what. It is not part
of the insurance contract, not delivered to the insured, and the insured is not a
party to it.

The primary support is the NAIC's own P&C claims examination method, which tests
coverage against **the form** and never against the manual. Chapter 17, the
property/casualty claims chapter — the one that uses personal auto as its worked
example ("physical damage coverage rather than automobile coverage") — directs
the examiner to:

- sample claims to review "timeliness of payment, **conformity to policy
  language** or adequacy of proof"; and
- "Become familiar with the regulated entity's claim handling procedures for the
  line of business identified. **Review corresponding policy forms for coverage,
  exclusions and nonstandard provisions.**"

([NAIC Vol. I, Ch. 17 §G](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf)) **[attested]**
The parallel consumer-credit chapter puts it in the same order — files are
measured against "applicable statutes, rules and regulations, **as well as policy
or certificate provisions**"
([Vol. II, Ch. 23](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf)). **[attested]**
The manual is what the *procedure* is measured against; the form is what
*coverage* is measured against, and the handbook never swaps them.

A second, independent anchor: the Unfair Claims Settlement Practices survey looks
for "misrepresentation of policy or certificate provisions or concealment of
coverage" ([Vol. II, Ch. 23](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf)) —
the wrong being misstating **the policy**, which presupposes the policy is the
thing that decides. **[attested]**

This is regulator-method evidence, not a holding, so state it that way: the
regulator treats the form as the coverage authority and the manual as the conduct
authority. The discovery case law is consistent — *Glenfed Development Corp. v.
Superior Court* ordered production because a manual may show "how National Union
understood and intended to apply the standard language"
([Butler Weihmuller](https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/)) —
evidence of how the insurer read the policy, which presupposes the policy is the
term being read. **[attested via direct quotation]**

**(b) Deviating from the manual is not automatically bad faith.** *Garvey v.
National Grange Mutual Insurance Co.* (E.D. Pa.): "the fact that the defendant
may have strayed from its internal procedures does not establish bad faith on the
part of the defendant in handling the plaintiff's loss."
([Butler Weihmuller](https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/)) **[attested — direct
quotation of the opinion]**

**(c) But deviation is admissible and jurisdictions split hard.** Other courts
hold manuals "clearly germane to the interpretation of" the policy and relevant
to whether claims were properly handled; *Nationwide Mut. Ins. Co. v. LaFarge
Corp.* (D. Md. 1991) ordered production once narrowed to the policy types at
issue. **[attested — direct quotation]** So: (b) and (c) are both true and the
tension is the real state of the law. A corpus that models this should not let an
answer say "the manual is irrelevant."

**(d) The asymmetry with underwriting manuals.** Departing from a **filed**
underwriting/rating manual is a violation in itself (Kansas, K.S.A. 40-955 —
actual refunds ordered). **[attested]** Departing from a claims manual is, by
*Garvey*, not in itself a violation. Same insurer, same kind of internal
document, opposite legal effect — because one is filed and one is not. **This is
the sharpest precedence finding in the cluster.** (Caveat: Florida §627.4108 is
narrowing this gap on the property side by making the claims manual a regulated
artifact — but for personal auto, as of now, it does not apply.)

**(e) Statute, regulation and DOI bulletin beat the claims manual.** The NAIC
review procedure is explicitly "to determine if company standards exist and
whether such standards **comply with** applicable statutes, rules and
regulations" (Vol. II, Ch. 23 §f) — the manual is measured against the law, never
the reverse. **[attested]**

### What an adjuster searches it for

The manual is the "how much am I allowed to do" document:

- **"What is my authority on this?"** — the settlement/draft authority matrix,
  by role and claim type. The single most-searched table. **[attested]** that
  authority is a real, examined artifact.
- **"How long do I have?"** — acknowledgement, contact, investigation and
  payment standards, and whether the company standard is tighter than the state
  standard (it usually is; Kansas measured against a 24-hour *company* guideline,
  not a statute). **[attested — homeowner files]**
- **"What do I need in the file?"** — documentation requirements, since
  "adequately documenting claim files" is a standing examination standard
  ([NAIC Examination Standards Summary](https://content.naic.org/sites/default/files/inline-files/prod_serv_marketreg_mes_hb.pdf)).
- **"Total loss / salvage / subrogation procedure"** — the auto-specific
  sections the NAIC names by name. **[attested]**
- **"Do I have to refer this?"** — escalation triggers: coverage question,
  SIU/fraud indicator, represented claimant, policy-limits demand, DOI complaint.
- **"What does this state do differently?"** — the state-variations appendix.

Note what an adjuster does **not** search it for: whether something is covered.
That question goes to the form and the endorsements. A corpus answer that decides
coverage out of the claims manual is a dangerous failure and is worth an eval
case on its own.

### Sample skeleton

*Original outline. No real insurer wording.*

```markdown
# Claims Handling Procedures — Personal Auto
Document: CHP-PA-00   Revision 7   Effective: [date]   Owner: Claims Practices
Confidential and proprietary — internal use only

## 0. About this document
Placeholder: states the manual sets conduct standards for handling personal auto
claims, and that coverage is determined by the policy, its endorsements and the
declarations — not by this manual.
Placeholder: points to where current bulletins are published and states that a
bulletin issued after this revision prevails over the section it names.

## 1. Intake and acknowledgement
| Event | Standard | Measured from | Exception |
### 1.1 First notice of loss
### 1.2 Acknowledging the claimant
### 1.3 Assigning the file

## 2. Reserves
| Claim type | Initial reserve basis | Review trigger | Re-reserve interval |

## 3. Investigation
### 3.1 Contact standards
### 3.2 Statements
### 3.3 Inspection and estimate
### 3.4 Coverage questions — when to refer
Placeholder: describes the referral path when the investigation raises a question
the policy does not plainly answer.

## 4. Authority
### 4.1 Settlement and draft authority
| Role | Claim type | Indemnity authority | Expense authority | Reserve authority | Next approver |
### 4.2 Exceeding authority
Placeholder: describes what is recorded before an over-authority payment is made.

## 5. Evaluation and payment
### 5.1 Partial payment  ### 5.2 Denial  ### 5.3 Communicating the decision

## 6. Auto-specific procedures
### 6.1 Total loss settlement
| Input | Source | Documentation required |
### 6.2 Salvage disposition
### 6.3 Subrogation
### 6.4 Rental and loss of use

## 7. Escalation and referral
| Trigger | Refer to | Timeframe |

## 8. File documentation and closure
## 9. Regulatory complaints

## Appendix A — State variations
| State | Requirement | Citation | Section overridden |

## Appendix B — Revision history
| Revision | Effective | Sections changed | Bulletins incorporated | Supersedes |
```

### Sources

- [NAIC Market Regulation Handbook, Vol. I (2017 ed.)](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf) — Ch. 17 §G Claims; proprietary-manual note
- [NAIC Market Regulation Handbook, Vol. II (2017 ed.)](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf) — claims review areas, draft and settlement authority
- [NAIC Market Regulation Handbook Examination Standards Summary](https://content.naic.org/sites/default/files/inline-files/prod_serv_marketreg_mes_hb.pdf)
- [Fla. Stat. §627.4108 — Claims-handling manuals; submission; attestation](https://www.flsenate.gov/laws/statutes/2024/627.4108) *(residential property, not auto)*
- [FLOIR, Notice to Industry implementing §627.4108](https://floir.gov/home/2023/07/18/notice-to-industry-implementing-section-627.4108-f.-s.-claims-handling-manuals-submission-attestation) *(residential property)*
- [Kansas Insurance Department, Market Conduct Examination — Liberty Mutual Group](https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf) — claim handling finding against company guidelines
- [Butler Weihmuller Katz Craig, "The Expanding Scope of Discovery in Bad Faith Cases"](https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/) — *Garvey*, *LaFarge*, *Glenfed*
- [Merlin Law Group, "Insurance Company Internal Claims Management Documents…"](https://www.propertyinsurancecoveragelaw.com/2021/12/articles/bad-faith/insurance-company-internal-claims-management-documents-should-demonstrate-good-faith-claims-processes/)
- [Merlin Law Group, "State Farm Operation Guide Regarding Appraisal"](https://www.propertyinsurancecoveragelaw.com/blog/state-farm-operation-guide-regarding-appraisal/)
- [FEMA, Flood Insurance Manuals and Handbooks — NFIP Adjuster Claims Manual, current and archived editions](https://www.fema.gov/flood-insurance/work-with-nfip/manuals) *(flood, used as a shape analogue)*

---

## Adjuster bulletins / claims bulletins

**This is the cluster's priority section.** The corpus trap — an older bulletin
and its replacement both sitting in the index — lives here.

### What it is called

- **Claim bulletin** — the NAIC handbook's term, used consistently across both
  volumes and across lines of business. It appears in the examiner's
  documents-to-request checklists as its own line item, distinct from procedure
  manuals and training manuals:
  `_____ Regulated entity's claim procedures manual and claim bulletins`,
  `_____ Claim bulletins and procedure manuals`,
  `_____ Claim procedure manuals/claim training manuals/claim bulletins`.
  **[attested]** It also has its own named review step in the P&C exam
  programme: **"f. Company Procedures, Training Manuals and Claim Bulletin
  Review."** **[attested]** The handbook even uses the phrase "the regulated
  entity's **internal** claim bulletins." **[attested]**
- **Underwriting bulletin** — the same pattern on the other side of the house,
  also listed as its own checklist line (`_____ Underwriting bulletins`). **[attested]**
- Internal names in circulation: **claims advisory**, **claims alert**, **desk
  notice**, **field bulletin**, **practice note**, **all-adjuster memo**,
  **hot sheet**. **[inferred]** — these are the names practitioners use; I did
  not read a document bearing one.

So: the category is *regulator-attested*, its content is not public. Say this
plainly in any downstream design doc rather than dressing analogue evidence as
direct evidence.

### Who writes it, who is bound

Written by the same claims-practices/compliance function that owns the manual,
but on a much shorter cycle and usually in response to one of five triggers:

1. a new or amended statute, regulation or **DOI bulletin** the desk must apply
   immediately;
2. a court decision changing how a coverage is applied in one state;
3. an internal audit or market-conduct finding;
4. a vendor/process change (estimating platform, valuation vendor, DRP);
5. a catastrophe response.

Bound: every adjuster in scope of the bulletin — which may be narrower than the
manual's scope (one state, one claim type, one office). **[inferred]**

The reason they exist is timing. The manual is a slow, version-controlled
document with a review cycle; the law changes faster than the review cycle. The
bulletin is the fast path, and the price of the fast path is exactly the problem
we want to model: **two documents now say something about the same section, and
one of them is stale.**

### Shape

**Length.** Short. One to four pages. This is the defining physical difference
from the manual and it has a real retrieval consequence: a bulletin is often
*one chunk*, so the chunk carries the whole document including its supersession
notice — or, if the chunker is careless, carries the guidance without the
header that dates it. **[inferred]**

**Structure.** A memo, with a masthead block:

```
CLAIMS BULLETIN [number]
Date issued: [date]
Effective: [date]
Applies to: [line / states / claim types / roles]
Supersedes: [prior bulletin number]  |  Amends: [manual section]
Expires / sunsets: [date or "when incorporated"]
From: [owning unit]
Subject: [one line]
```
**[inferred for insurer-internal, but every element is attested in a public
analogue]** — FEMA WYO bulletins carry number, date issued and subject
([NFIP agent bulletin listing](https://agents.floodsmart.gov/bulletins));
DOI bulletins carry number, date, subject and a supersession note.

Then: Purpose / Background → What changes → What you must do → Effective date →
Who to contact.

**Tables.** Usually one small one, or none. When present it is a change table or
an applicability table:

| Table | Columns |
|---|---|
| What changed | Manual section \| Prior handling \| New handling \| Effective |
| Applicability | State \| Applies from \| Applies to claim types \| Notes |
| Supersession | This bulletin \| Supersedes \| Effect on superseded (withdrawn / partial) |

**[inferred]**

**Boilerplate.** Three recurring lines, and they are the ones that matter:

1. **A supersession line.** Public analogues vary in wording but not in
   function: North Dakota's Bulletin 2021-5.1 is titled with
   **"(Supersedes Bulletins 2019-1 and 2021-5)"**; Bulletin 2025-1 is
   **"Amending and Supplementing Bulletin 2021-4"**
   ([ND Insurance Department bulletins](https://www.insurance.nd.gov/tools-legal/bulletins)). **[attested, regulator not insurer]**
2. **A sunset/incorporation line** — the bulletin is interim guidance until the
   manual is revised. **[inferred]**
3. **A "this does not change the policy" line.** **[inferred]** — the drafting
   response to the claims-manual Precedence rules, and the thing we most want the
   corpus to test.

### Identifier scheme

**The most important subsection in this file.** Five conventions, all observed in
public analogues, from which the corpus scheme should be built.

**(i) Year-sequence.** `YYYY-N` or `YYYY-NN`. The dominant regulator convention
and near-certainly the dominant internal one. North Dakota: `2026-1`, `2025-3`,
`2021-4`. **[attested]**

**(ii) Point-release for an amended bulletin that keeps its identity.** North
Dakota issues `2021-5.1` and `2020-1.1` — a revision of a bulletin, not a new
bulletin. **[attested]** This is a *different* mechanic from supersession and a
regex must distinguish them: `2021-5.1` supersedes `2021-5` **and** replaces its
identity; `2025-1` amends `2021-4` while both keep separate identities.

**(iii) Letter-suffix for a series.** Indiana's bulletin list includes
`Bulletin 51/51A` and `Bulletin 52/52A/52B/52C` — an original plus successive
amendments, all retained under one root
([Indiana DOI Bulletin 141](https://www.in.gov/idoi/files/Bulletin-141-Withdrawal-of-Bulletins.pdf)). **[attested]**

**(iv) Prefix-year-sequence, no separator.** FEMA WYO bulletins run `W-26002`,
`W-25005`, `W-24020` — prefix `W`, two-digit year, three-digit sequence
([NFIP bulletin listing](https://agents.floodsmart.gov/bulletins)). **[attested, flood]**
The compact form is what you get when a system, not a person, assigns the number.

**(v) Line-coded prefix.** ISO circulars are reported to use `LI-PA-YYYY-NNN`
(line of insurance – personal auto – year – sequence), e.g. `LI-PA-2017-160`.
**[unverified — search result only; the ISOnet circulars page is JS-rendered and
the circulars themselves sit behind the ISOnet paywall]** If it holds it is the
convention worth stealing for the corpus, because it encodes the line and
therefore filters — but treat the specific format as a lead until someone with
ISOnet access confirms it. The convention does not depend on it: (i)+(ii) alone
are enough, and they are attested.

A **sequential, non-year form** also exists — Indiana's `Bulletin 141` is a bare
running number after 140 earlier ones. **[attested]** Worth knowing exists;
worse for our purposes because the number carries no date.

**Suggested regex for the corpus:**

```
^BUL-(?<line>PA|UW)-(?<year>\d{4})-(?<seq>\d{2,3})(?:\.(?<rev>\d+))?(?<alpha>[A-Z])?$
    BUL-PA-2024-07        original
    BUL-PA-2024-07.1      point release, replaces -07's identity
    BUL-PA-2024-07A       letter-suffixed amendment, coexists with -07
```

Supporting both the point-release and the letter-suffix forms is not
over-engineering — they are the two real conventions and they mean **different
things about whether the predecessor survives**, which is precisely the trap.

Note the id alone never settles currency: `BUL-PA-2023-11` can be superseded by
`BUL-PA-2025-02`, which is not adjacent in any sort order. **The `supersedes`
edge must be data, not a naming convention** — which is exactly what
`CORPUS-PLAN.md` §2b already proposes with the `supersedes` column.

### Precedence

**How a bulletin beats the manual.** A bulletin issued after the current manual
revision, naming a manual section, governs that section until the next manual
revision incorporates it. This is the whole reason bulletins exist.
**[inferred]** — no primary source states it for an insurer; it is the
near-universal document-control pattern and is how the regulator analogues
behave (a DOI bulletin amending an earlier one is immediately operative).

**How a bulletin beats an earlier bulletin.** Explicitly, by naming it. Four
distinct effects are observable in the public analogues and they are **not**
interchangeable:

| Effect | Public example | What happens to the old one |
|---|---|---|
| **Supersedes** | ND `2021-5.1 (Supersedes Bulletins 2019-1 and 2021-5)` | Replaced in full; old one has no force |
| **Amends / supplements** | ND `2025-1 Amending and Supplementing Bulletin 2021-4` | Both remain operative; must be read together |
| **Withdraws** | Indiana `Bulletin 141 — Withdrawal of Bulletins`, withdrawing ~90 bulletins by number in a single list | Old ones have no force; the withdrawal itself is a bulletin |
| **Rescinds / replaces** | Delaware archive: `No. 4 … SUPERSEDED BY BULLETIN 140`; `No. 30 … REPLACED`; `No. 38 … RESCINDED` | No force; status is annotated on the old document |

**[attested]** for all four.

**Does the superseded one stay in circulation? Yes — and this is the trap's
justification.** Delaware keeps superseded, replaced, rescinded, withdrawn and
expired bulletins **posted on the archive page**, annotated with their status and
with pointers like "NOTE: Please See [newer bulletin]," and lists multiple dated
versions under the same number with the older ones marked EXPIRED
([Delaware DOI bulletins archive](https://insurance.delaware.gov/information/bulletins-archive/)). **[attested]** Wisconsin, Tennessee
and others maintain equivalent archives. Indiana's Bulletin 141 exists precisely
because 90 dead bulletins were still in circulation and someone had to kill them
in a batch — a document whose existence proves that stale bulletins accumulate.
**[attested]**

**How an adjuster is supposed to know which is current.** Four mechanisms, in
descending reliability:

1. **Status annotation on the stale document itself** — "SUPERSEDED BY BULLETIN
   140," "REPLACED," "EXPIRED," plus a pointer to the replacement. Delaware does
   this. **[attested]** Strongest, because it works no matter how the reader
   arrived at the document — including arriving via a search index. *This is the
   mechanism a retrieval system can actually exploit, and its absence is what
   makes the trap bite.*
2. **Supersession stated in the successor's title or first line** — ND's
   "(Supersedes …)". **[attested]** Works only if you found the successor.
3. **A maintained current-bulletins index**, with the archive kept separate.
   **[attested]** for regulators; **[inferred]** for insurer intranets, where
   this is the usual answer (a SharePoint/knowledge-base page, increasingly
   surfaced in the claims system itself — Guidewire is reported to market
   ClaimCenter as embedding "real-time guidance" in the claim lifecycle
   ([Guidewire ClaimCenter](https://www.guidewire.com/products/core-products/insurancesuite/claimcenter-claims-management-software)),
   **[unverified — search result only]**).
4. **Periodic batch cleanup** — Indiana's Bulletin 141. **[attested]** Weakest:
   it runs on a timescale of years and the cleanup document is itself a bulletin
   nobody reads.

The honest summary: **nothing guarantees the adjuster sees the current one.**
The mechanisms are conventions, not controls, and the stale document normally
remains retrievable. A corpus that plants both and an eval case that punishes
citing the stale one is modelling the real failure, not an artificial one.

**What a bulletin cannot do.** It cannot grant, remove or modify coverage. Same
reasoning and same support as the claims-manual Precedence rule (a): the NAIC's
P&C claims method tests coverage against "corresponding policy forms for
coverage, exclusions and nonstandard provisions" and tests files for "conformity
to policy language," while procedures, training manuals and claim bulletins are
reviewed separately, to see whether *they* comply with law
([NAIC Vol. I, Ch. 17 §G](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf);
[Vol. II, Ch. 23 §f](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf)).
A bulletin sits on the procedure side of that line in every checklist it appears
in. **[attested as regulator method; the underlying contract-law proposition
itself remains [inferred]]** A bulletin *can* validly do the opposite:
**restrict what an adjuster may do** without touching coverage — narrow
authority, add a referral requirement, require a second review — because that
governs the adjuster, not the contract. **[inferred]**

And a bulletin implementing a statute or DOI order is binding only because the
statute is; it carries the law's force, not its own. **[inferred]**

### What an adjuster searches it for

Bulletins are the "did something change since I learned this?" document:

- **"Is there anything newer on [manual section]?"** — the most important query
  and the one the corpus must get right.
- **"What is the current rule in [state] for [total loss tax and fees / UM
  stacking / diminished value / storage and rental caps]?"** — the state-specific
  fast-change topics.
- **"Which estimating platform / valuation vendor / photo requirement applies
  now?"** — process changes arrive as bulletins.
- **"Catastrophe handling"** — CAT bulletins are numerous, dated, event-scoped,
  and expire. A high-density source of stale documents.
- **"Has my authority changed?"** — authority changes are issued as bulletins
  between manual revisions.

Two failure modes to test: citing the superseded bulletin, and citing the current
bulletin for a *coverage* conclusion it has no power to reach.

### Sample skeleton

*Original outline. No real insurer wording.*

```markdown
# CLAIMS BULLETIN BUL-PA-2025-04
Date issued: [date]        Effective: [date]
Applies to: Personal auto — [states] — [claim types] — [roles]
Supersedes: BUL-PA-2023-11 (in full)
Amends: CHP-PA-TL-02 (Total loss settlement), section 6.1
Status: interim guidance until incorporated into the next manual revision
From: Claims Practices

## 1. Purpose
Placeholder: one or two lines saying what prompted this bulletin and what it
changes.

## 2. Background
Placeholder: names the statute, regulation, court decision or audit finding
behind the change, with its citation and its own effective date.

## 3. What changes
| Manual section | Prior handling | New handling | Effective |

## 4. What you must do
Placeholder: the numbered steps an adjuster takes on an open file and on a file
already closed under the prior guidance.

## 5. Applicability
| State | Applies from | Claim types | Notes |

## 6. Effect on prior guidance
Placeholder: names each bulletin superseded and states whether it is superseded
in full or in part, and confirms that the superseded bulletin is withdrawn from
use even where a copy remains accessible.

## 7. What this bulletin does not change
Placeholder: states that coverage continues to be determined by the policy, its
endorsements and the declarations, and that this bulletin does not alter them.

## 8. Questions
Placeholder: owning unit and contact.
```

A second, deliberately short skeleton for the **superseded** partner document —
the trap needs both, and the older one should look entirely plausible on its own,
with **no marking that it has been replaced**, because that is the realistic case:

```markdown
# CLAIMS BULLETIN BUL-PA-2023-11
Date issued: [date]        Effective: [date]
Applies to: Personal auto — [states]
Amends: CHP-PA-TL-02 (Total loss settlement), section 6.1
From: Claims Practices

## 1. Purpose
## 2. What changes
| Manual section | Prior handling | New handling | Effective |
## 3. What you must do
## 4. Questions
```

### Sources

- [NAIC Market Regulation Handbook, Vol. I (2017 ed.)](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf) — "Claim procedure manuals, adjuster training manuals and claim bulletins should be reviewed" (Ch. 17 §G); "internal claim bulletins"; `_____ Underwriting bulletins`
- [NAIC Market Regulation Handbook, Vol. II (2017 ed.)](https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf) — "f. Company Procedures, Training Manuals and Claim Bulletin Review"
- [North Dakota Insurance Department, Bulletins](https://www.insurance.nd.gov/tools-legal/bulletins) — `2021-5.1 (Supersedes Bulletins 2019-1 and 2021-5)`; `2025-1 Amending and Supplementing Bulletin 2021-4`
- [Indiana DOI, Bulletin 141 — Withdrawal of Bulletins (18 Sep 2006)](https://www.in.gov/idoi/files/Bulletin-141-Withdrawal-of-Bulletins.pdf) — batch withdrawal; `51/51A`, `52/52A/52B/52C` series numbering
- [Delaware DOI, Bulletins Archive](https://insurance.delaware.gov/information/bulletins-archive/) — SUPERSEDED / REPLACED / RESCINDED / EXPIRED annotations, superseded bulletins remain posted
- [NFIP / FEMA, WYO Company Bulletins](https://agents.floodsmart.gov/bulletins) — `W-26002`, `W-25005`, `W-24020` numbering *(flood, analogue)*
- [Verisk / ISO circulars on ISOnet](https://www.verisk.com/insurance/products/circulars-on-isonet/) — `LI-PA-YYYY-NNN` line-coded circular numbering
- [Wisconsin OCI, Archived Bulletins](https://oci.wi.gov/Pages/Regulation/BulletinsArchived.aspx) — second example of a maintained archive of dead bulletins
- [Guidewire ClaimCenter](https://www.guidewire.com/products/core-products/insurancesuite/claimcenter-claims-management-software) — guidance surfaced inside the claim system rather than as a document

---

## Precedence claims (for synthesis)

Atomic. Each is `X beats Y when Z` plus source. Tags as defined at the top of
this file: **[attested]** = from a document I read or a direct quotation inside
one; **[inferred]** = reasoned from an analogue, needs corroboration;
**[unverified — search result only]** = a lead, not a finding.

Findings that are *not* in `X beats Y when Z` form are quarantined in
**Non-precedence findings** at the end, so nothing here is diffed against another
researcher's claim when it is not a precedence rule at all.

### Underwriting manual

- **Statute or regulation beats the underwriting manual, always.** Manual rules cite state law as their own authority. **[attested]** — https://www.gainsco.com/wp-content/uploads/2021/12/OH-MGA-Personal-Auto-Program-Rules-Manual.pdf
- **The filed underwriting/rating manual beats actual practice, when the two differ — and the deviation is itself a violation.** Kansas ordered premium refunds where tier came from an unfiled matrix. **[attested]** — https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf
- **The filed manual beats a policyholder's recomputation claim, once the rate is approved (filed-rate doctrine), in personal auto.** **[unverified — search result only]** — https://www.afslaw.com/perspectives/alerts/second-circuit-rules-the-filed-rate-doctrine-bars-the-recalculation-approved
- **The underwriting manual beats producer discretion at the point of binding, when the risk falls in an unacceptable class.** Binding authority is granted only "in accordance with all the rules and procedures set forth in this manual." **[attested]** — https://www.gainsco.com/wp-content/uploads/2021/12/OH-MGA-Personal-Auto-Program-Rules-Manual.pdf
- **The issued policy beats the underwriting manual on coverage, when the policy has already been issued.** Manual remedies run through cancellation, non-renewal or rescission — all governed by the policy and statute. **[inferred]** — https://www.gainsco.com/wp-content/uploads/2021/12/OH-MGA-Personal-Auto-Program-Rules-Manual.pdf
- **The declarations beat the underwriting manual's limit tables, when the two show different limits for a policy.** **[inferred]** — no direct source; follows from the above.
- **The state manual beats a national program document, when the state manual exists** — these are filed per state and each carries its own effective dates. **[attested]** — https://www.tdi.texas.gov/company/underwriting-guidelines.html

### Claims manual

- **Statute, regulation and DOI bulletin beat the claims manual, always.** NAIC review asks whether company standards "comply with applicable statutes, rules and regulations." **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf
- **The policy form beats the claims manual on coverage, when a coverage question is at issue.** The NAIC P&C claims method tests files for "conformity to policy language" and directs the examiner to "review corresponding policy forms for coverage, exclusions and nonstandard provisions," while manuals and bulletins are reviewed separately for their own compliance. **[attested as regulator method; the contract-law proposition remains inferred]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf
- **The policy or certificate provisions beat the claims manual, when a file is measured for unfair claims practices.** The survey looks for "misrepresentation of policy or certificate provisions or concealment of coverage." **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf
- **The claims manual beats adjuster discretion on conduct — timeliness, documentation, authority — when the file is in scope.** Examiners test files against company guidelines and cite the company for misses. **[attested — homeowner files]** — https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf
- **The reasonableness standard beats the claims manual as the measure of bad faith, when deviation from the manual alone is alleged.** *Garvey v. National Grange Mut. Ins. Co.*: straying from internal procedure "does not establish bad faith." **[attested via direct quotation of the opinion]** — https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/
- **The claims manual beats the insurer's litigation position on what the policy means, when the two are inconsistent and interpretation is disputed** — it is admissible as evidence of the insurer's own understanding. *Glenfed Dev. Corp. v. Superior Court*; *Nationwide v. LaFarge*. **[attested via direct quotation]** — https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/
- **A filed underwriting manual beats an unfiled claims manual in external force, when either is deviated from:** deviation from the filed one is itself a violation, deviation from the unfiled one is not. The filing status, not the document type, creates the force. **[attested]** — https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf + https://www.butler.legal/the-expanding-scope-of-discovery-in-bad-faith-cases/
- **A state-variations appendix beats the national body of the same claims manual, for claims in that state.** **[inferred]**
- **The company's own cycle-time standard beats the statutory minimum, when the company standard is tighter** — because the file is audited against the company standard. **[attested — homeowner files]** — https://insurance.ks.gov/documents/other-services/marketconduct-exams/LMFinalFinalRevisedExamReport.pdf
- **A state statute beats the insurer's discretion over whether to have a claims manual at all, when the insurer writes Florida residential property** — it must have one, attest annually, and produce it within 5 business days. Does **not** extend to personal auto. **[attested, residential property not auto]** — https://www.flsenate.gov/laws/statutes/2024/627.4108

### Bulletins

- **A bulletin beats the claims manual section it names, when the bulletin is dated after the manual revision and has not itself been superseded.** **[inferred]**
- **A later bulletin beats an earlier bulletin, when it names it as superseded.** ND `2021-5.1 (Supersedes Bulletins 2019-1 and 2021-5)`. **[attested]** — https://www.insurance.nd.gov/tools-legal/bulletins
- **A later bulletin does NOT beat an earlier bulletin when it only "amends and supplements" it — both remain operative and must be read together.** ND `2025-1 Amending and Supplementing Bulletin 2021-4`. **[attested]** — https://www.insurance.nd.gov/tools-legal/bulletins
- **A withdrawal bulletin beats every bulletin it lists, from its date, even though it adds no substantive guidance.** Indiana Bulletin 141. **[attested]** — https://www.in.gov/idoi/files/Bulletin-141-Withdrawal-of-Bulletins.pdf
- **A superseded bulletin remains retrievable and must be disregarded on the strength of its status annotation alone, when both are in the index.** Delaware archive keeps SUPERSEDED / REPLACED / RESCINDED / EXPIRED bulletins posted. **[attested]** — https://insurance.delaware.gov/information/bulletins-archive/
- **The policy form beats a bulletin on coverage, always — the bulletin binds the adjuster, not the contract.** Same regulator-method support as the claims-manual equivalent: bulletins are reviewed on the procedure side, coverage is tested against the form. **[attested as regulator method; the contract-law proposition remains inferred]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf
- **A bulletin CAN validly narrow what an adjuster may do — authority, referral, second review — without touching coverage.** **[inferred]**
- **A bulletin implementing a statute or DOI order carries the law's force, not its own; if the underlying law is repealed the bulletin is spent.** **[inferred]**
- **A CAT bulletin beats standing guidance for claims arising from the named event, within the dates it states, and lapses afterward.** **[inferred]**
- **The regulator's own bulletin (DOI) beats the insurer's bulletin, always** — cross-cluster, defer to the DOI-circulars researcher. **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf

### Cross-cutting

- **The DOI's own bulletin beats the insurer's bulletin and the insurer's manual, always** — internal standards are reviewed to see whether they "comply with applicable statutes, rules and regulations," never the reverse. **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol2.pdf
- **A document a regulator can compel beats one it cannot, when the two conflict and an exam is on** — all three families in this cluster are compellable by name. **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf

### Non-precedence findings (do not diff these as precedence rules)

Real findings from this cluster that are not of the form `X beats Y when Z`.

- **A point-release id (`2021-5.1`) replaces its predecessor's identity; a letter-suffix id (`51A`) coexists with its root (`51`).** The id form alone signals different supersession semantics. **[attested]** — https://www.insurance.nd.gov/tools-legal/bulletins + https://www.in.gov/idoi/files/Bulletin-141-Withdrawal-of-Bulletins.pdf
- **Sort order does not determine currency.** A 2023 bulletin may be superseded by a 2025 bulletin that is not adjacent under any id sort, so the `supersedes` edge must be stored data, not derived from the id. **[attested]** — https://insurance.delaware.gov/information/bulletins-archive/
- **Superseded bulletins remain retrievable in every public archive examined**, annotated with status (SUPERSEDED / REPLACED / RESCINDED / EXPIRED) and a pointer to the replacement. Status annotation on the stale document is the only mechanism that works for a reader who arrives by search. **[attested]** — https://insurance.delaware.gov/information/bulletins-archive/
- **Stale bulletins accumulate until someone batch-kills them.** Indiana's Bulletin 141 withdrew roughly ninety bulletins in one list — a document whose existence is the evidence. **[attested]** — https://www.in.gov/idoi/files/Bulletin-141-Withdrawal-of-Bulletins.pdf
- **Every document in this cluster is internal and proprietary; none is delivered to the insured.** The NAIC notes underwriting and claims manuals "are generally regarded as proprietary." **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf
- **All three families are examinable artifacts a regulator requests by name** — "claim procedure manuals, adjuster training manuals and claim bulletins"; "underwriting guidelines, underwriting bulletins." This is the evidence that the three-way split modelled in this file is the industry's own, not ours. **[attested]** — https://www.in.gov/idoi/files/Market-Regulation-Handbook-17_Vol1.pdf
