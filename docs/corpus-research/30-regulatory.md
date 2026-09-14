<!-- Cluster 3 of 4: EXTERNAL, BINDING documents — US personal auto.
     Researched 2026-09-11. Composes with 10-*, 20-*, 40-* into one document.
     No H1 here by design. -->

## State DOI circular letters / bulletins

The regulator's *letter-to-the-industry* layer. Dated, addressed, numbered, published
outside the administrative code, and — this is the load-bearing fact — usually
**not itself law**. It tells insurers how the department reads law that already
exists.

### What it is called

There is no national name. Each department has its own series, and the series name
is part of the identifier:

| State | Series name as printed on the document |
|---|---|
| New York (DFS) | **Insurance Circular Letter No. 3 (2009)** — short form "CL No. 8 (2023)" |
| New York (DFS) | **OGC Opinion No. 07-09-10** — a separate series: Office of General Counsel opinions, issued on request, narrower than a circular letter |
| Texas (TDI) | **Commissioner's Bulletin # B-0014-24** |
| California (CDI) | **Bulletin 2024-7** — with sibling series *Notices* and *Commissioner's Opinions* published under the same index |
| Florida (OIR) | **Informational Memorandum OIR-23-04M** |
| Illinois (DOI) | **Company Bulletin 2024-09**, cited in older documents as **CB 2020-06** |
| Colorado (DOI) | **Bulletin No. B-5.51** — topic-series numbering, not year numbering |

Generic industry words for the whole class: *bulletin*, *circular letter*,
*informational memorandum*, *directive*, *guidance*. Compliance departments
collectively call them "the bulletin file." Note that NY DFS publishes circular
letters under a site section literally headed **"Industry Guidance"**, while the
same documents carry hard compliance deadlines — the naming is softer than the
practical effect.

### Who writes it, who is bound

Written by the department itself — signed by the Superintendent (NY),
the Commissioner (TX, CA, CO, IL), or a division director; Florida memoranda run
over the Commissioner's name in the header block rather than a signature.

Addressed to a class of licensees, and the addressee line *is* the scoping
mechanism. NY CL No. 3 (2009) is addressed "All Motor Vehicle Self-Insurers and
Insurers Writing Motor Vehicle Insurance in New York State"; NY CL No. 4 (2024)
addresses a much longer list including rate service organizations and the New
York Automobile Insurance Plan. TDI B-0014-24 is addressed "All insurers, agents,
and the public."

Who is *bound* is the subtle part. Colorado states the rule on the face of every
bulletin:

> "Bulletins are the Division of Insurance's interpretations of existing insurance
> law or general statements of Division policy. Bulletins themselves neither
> establish binding norms nor finally determine issues or rights."
> — Bulletin No. B-5.51

That disclaimer is the honest legal position almost everywhere: if no APA
notice-and-comment rulemaking was followed, the document is guidance, not a rule,
and does not bind the courts. In practice it binds the adjuster anyway, because
the department examines against it during market conduct exams and a departure
becomes a general-business-practice finding under the state's unfair claims act.

### Shape

- **Length:** short. NY CL No. 3 (2009) runs ~600-700 words; TDI B-0014-24 ~350-400.
  The outliers are the annual/standing letters — NY CL No. 4 (2024) on disaster
  planning is ~6,000 words with lettered subsections.
- **Header block:** series number and year, issue date, `TO:` (class of addressees),
  `RE:` or `Subject:`. Florida stacks it centered: `INFORMATIONAL MEMORANDUM` /
  `OIR-23-04M` / `ISSUED` / date / office name / Commissioner name.
- **Body:** roman-numeral sections are the norm where the document is long —
  NY uses `I. Summary` / `II. Discussion` / `III. Conclusion`; Colorado uses
  `I. Background and Purpose` / `II. Applicability and Scope` / `III. Division
  Position` / `IV. History`. Short bulletins have bolded run-in headings and no
  numbering at all (TDI).
- **Citations:** dense and early. Every bulletin anchors itself to a statute or
  code section in the first or second paragraph — that anchor is what makes it
  *interpretive* rather than legislative.
- **Tables:** rare in claims bulletins. Prose and lists dominate. TDI B-0014-24
  lists 67 affected counties as running prose rather than a table. Tables do
  appear in filing/data-call bulletins and in department *indexes* of bulletins
  (NY's withdrawn-circulars index has columns Number / Date Issued / Status /
  Addressees / Subject).
- **Boilerplate:** a contact block at the foot (TDI: help line + a
  `PropertyCasualty@tdi.texas.gov` mailbox), a footnoted case list where the
  bulletin is reacting to litigation, and a `History` / `Issued` stamp.

### Identifier scheme

Real formats, with live examples:

| State | Regex shape | Real examples | Dating |
|---|---|---|---|
| NY DFS | `Insurance Circular Letter No. \d+ \(\d{4}\)` | No. 3 (2009); No. 1 (2015); No. 4 (2024); No. 7 (2024) | sequence restarts each year; issue date on line 2 |
| NY DFS supplements | `Supplement No. \d+ to Insurance Circular Letter No. \d+ \(\d{4}\)` | Supplement No. 1 to CL No. 16 (2005) | supplement carries its own later date |
| NY DFS OGC | `OGC Opinion No. \d{2}-\d{2}-\d{2}` | 07-09-10; 08-10-13; 05-06-08 | YY-MM-NN |
| TDI | `B-\d{4}-\d{2}` | B-0001-24; B-0014-24; B-0019-15; B-0001-05 | zero-padded to 4; two-digit year suffix. Not exhaustive — legacy non-`B` items sit in the archive (e.g. `/Bulletins/2008/cc11.html`) |
| CDI | `Bulletin \d{4}-\d{1,2}` | Bulletin 2024-7; Bulletin 2025-17; Bulletin 2023-1 | **not** zero-padded; pre-2000 uses 2-digit year: Bulletin 99-4, Bulletin 96-2 |
| FL OIR | `OIR-\d{2}-\d{2}[A-Z]` | OIR-23-03M; OIR-23-04M | trailing letter is a class code (`M` = memorandum) — do not hard-code it |
| IL DOI | `(Company Bulletin\|CB) \d{4}-\d{2}` | Company Bulletin 2024-09; CB 2020-06 | zero-padded sequence |
| CO DOI | `B-\d+\.\d+` | B-5.51 | **no year in the id**; `5` = the property/casualty series, `.51` the item. Revisions reuse the number |

NY URL slugs come in two conventions and both are live —
`/circular-letters/cl2024-04` and `/circular_letters/cl2024_01`. Any scraper or
id-normalizer must accept both.

**Supersession convention.** Three distinct flavors, and they are not
interchangeable:
- *Repeal-and-replace*, stated in the body: NY CL No. 4 (2024) — "This circular
  letter repeals and replaces Circular Letter No. 4 (2023)." Note the number is
  reused across years for a standing annual letter.
- *Withdrawal by index*: NY maintains a separate **Withdrawn Insurance Circular
  Letters** page with a `Status` column reading `WITHDRAWN` plus the replacing
  instrument and sometimes a withdrawal effective date ("WITHDRAWN Effective
  January 30, 2025"). CL No. 8 (2023) → superseded by CL No. 2 (2025). A
  circular letter can therefore be dead *without the document itself saying so* —
  the status lives outside the file.
- *Bulk withdrawal*: NY CL No. 18 (2003), "Withdrawal of 16 Outdated Circular
  Letters," kills a list in one instrument.
- *Silent supersession*: NY CL No. 3 (2009) references CL No. 9 (2002) without
  repealing it; both remain operative.

Colorado's numbering means supersession is expressed as a **reissue of the same
number** with a new `History` stamp, so the date, not the id, distinguishes
versions.

### Precedence

The override rules, stated as narrowly as the sources support.

1. **A bulletin does not amend the policy.** It cannot add a coverage the form
   does not grant or delete an exclusion the form contains. Colorado says so on
   the document: bulletins "neither establish binding norms nor finally determine
   issues or rights." Where no APA rulemaking was followed, a department bulletin
   is not a regulation, carries no force of law, and does not bind the courts.
   (Primary evidence is Colorado's own disclaimer, quoted above; the IRMI
   commentary cited below reaches the same conclusion but argues it in the narrower
   setting of certificate-of-insurance bulletins.)
2. **A bulletin can still change the check.** Where the underlying statute is the
   binding thing and the bulletin merely announces the department's reading of it,
   the reading governs the adjuster's conduct in practice. Colorado B-5.51 is the
   clean case: § 10-4-639(1), C.R.S. says an insurer "shall pay title fees, sales
   tax, and any other transfer or registration fee associated with the total loss
   of a motor vehicle"; the Division had *historically agreed* with insurers not
   paying registration fees on owner-retained salvage, then reversed after
   appellate decisions and now states insurers "must pay." The statute did not
   change; the bulletin did; the settlement amount changed. So the honest rule is:
   a bulletin cannot change *what the policy promises*, but it can change *what the
   department will accept as compliant performance of that promise* — and that is
   usually indistinguishable at the desk.
3. **The real override channel is the form-approval gate, not the bulletin.** A
   national form is not usable in a state until it is filed and, in prior-approval
   states, approved. NAIC's *Product Filing Review Handbook* (2024) says "Policy
   form review ensures protection for the public" and that the review confirms
   "inclusion of provisions that are specified in law or regulation, and exclusion
   of provisions that are prohibited by law or regulation"; it defines "policy
   form" to include "policies, certificates, applications, riders, declarations or
   information page, amendments, and endorsements." Advisory organizations (ISO,
   AAIS, NCCI) file on behalf of member insurers, and an insurer may elect to
   "implement with modifications" — which is exactly how a countrywide form
   acquires per-state variants. **That is where the regulator edits the contract:
   before it is sold, not during the claim.** A circular letter arriving later
   cannot do the same work.
4. **A bulletin's scope is its addressee line plus the state's jurisdiction.** It
   reaches claims on policies issued in that state; it does not follow the national
   form into other states. A four-state variant family of one form therefore has
   four different bulletin overlays.
5. **Effective date beats issue date.** Bulletins may be immediately operative
   (TDI B-0014-24, issued 7/18/2024 for a disaster period of 7/7–7/9/2024 — note
   the bulletin is *retrospective* to the event), or carry staged deadlines (NY
   CL No. 4 (2024): surveys by June 28, 2024, plans by August 16, 2024). A
   circular letter with a compliance deadline is, functionally, a rule with a date.
6. **Later beats earlier only where supersession is stated or indexed.** Absent a
   repeal-and-replace clause or a WITHDRAWN entry, two circular letters on the same
   subject both stand.

**How a reader knows** — five mechanical tells, in order of reliability:

1. **Where it lives.** Codified in the state administrative code (11 NYCRR 216,
   10 CCR 2695.x, 28 TAC 5.xxxx) = regulation, binding. Published in a bulletin
   index = guidance.
2. **The authority line.** "Pursuant to Insurance Law § 308" (an information-demand
   power) reads differently from "11 NYCRR 216" (a promulgated regulation).
3. **The self-description.** Colorado's "neither establish binding norms" sentence;
   Florida's "The purpose of this informational memorandum is to notify …".
4. **The addressee line** — who it binds.
5. **The applicability sentence** — see next section; the phrase to look for is
   *policies issued or renewed on or after \<date\>*.

### What an adjuster searches it for

- "Does my state require sales tax / title / registration fees on a total loss,
  and on owner-retained salvage?"
- "How many days do I have to accept or deny, and to pay after agreement?"
- Catastrophe accommodations — extended proof-of-loss windows, suspended
  deductibles, moratoria — after a named event.
- Notice-of-claim and late-notice standards (NY CL No. 3 (2009), no-fault).
- Whether a practice the carrier's own claims manual permits has been called out
  as an unfair claims practice in this state.
- Whether the bulletin they are relying on is still live (the withdrawn index).

### Sample skeleton

*Fictional. State of "Calumet", Department of Insurance.*

```
                     COMPANY BULLETIN CB 2026-04
                        Issued: March 2, 2026
       Calumet Department of Insurance — J. Rivera, Director

TO:      All insurers authorized to write private passenger automobile
         insurance in Calumet, and all licensed independent adjusters
RE:      Loss-of-use and rental reimbursement following a declared
         total loss

I.   Background and Purpose
     Bulletins state the Department's interpretation of existing law and do
     not themselves establish binding norms.

II.  Applicability and Scope
     Applies to first- and third-party physical damage claims on policies
     issued or renewed on or after July 1, 2026.

III. Department Position
     [Two short paragraphs restating § 24-8-119(3), C.C.S. and the
     Department's reading of "reasonable period".]

     Table — Minimum rental continuation after total-loss notification
     | Claim type | Days from written offer | Documentation required |

IV.  Effect on Prior Guidance
     Supersedes Company Bulletin CB 2021-11.

V.   History
     Issued March 2, 2026.

Questions: 1-800-555-0142 / autoclaims@doi.calumet.gov
```

### Sources

- NY DFS, Insurance Circular Letter No. 3 (2009), *Unfair Claims Settlement Practices – No-Fault Notice of Claim Provisions* — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl2009_03
- NY DFS, Insurance Circular Letter No. 4 (2024), *Disaster Planning, Preparedness, and Response* — https://www.dfs.ny.gov/industry-guidance/circular-letters/cl2024-04
- NY DFS, Insurance Circular Letter No. 18 (2003), *Withdrawal of 16 Outdated Circular Letters* — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl2003_18
- NY DFS, Withdrawn Insurance Circular Letters index — https://www.dfs.ny.gov/industry_guidance/circular_letters_withdrawn
- NY DFS, OGC Opinion No. 08-10-13, *Calculation of total loss payments … title transfer fees and sales tax* — https://www.dfs.ny.gov/insurance/ogco2008/rg081013.htm
- TDI, Commissioner's Bulletin # B-0014-24 — https://www.tdi.texas.gov/bulletins/2024/B-0014-24.html
- TDI, Commissioner bulletins index 2024 — https://www.tdi.texas.gov/bulletins/2024/index.html
- CDI, Bulletins index — https://www.insurance.ca.gov/0250-insurers/0300-insurers/0200-bulletins/bulletin-notices-commiss-opinion/bulletins.cfm
- CDI, Bulletin 2024-7 — https://www.insurance.ca.gov/0250-insurers/0300-insurers/0200-bulletins/bulletin-notices-commiss-opinion/upload/Bulletin-2024-7-Revisions-to-Department-Review-of-Complete-Rate-Applications.pdf
- FL OIR, Informational Memorandum OIR-23-04M — https://floir.gov/docs-sf/default-source/informational-memoranda/oir-23-04m.pdf
- CO DOI, Bulletin No. B-5.51, *Concerning Insurer's Payment of Registration Fees for Total Loss Vehicles* (issued Dec 10, 2024) — https://doi.colorado.gov/sites/doi/files/documents/Bulletin%20B-5.51%20Reg%20Fee%20Payment%20After%20Total%20Loss.pdf
- NY DFS, Insurance Circular Letter No. 11 (1991), *Scope of Regulation 64 on Claims Settlement Practices* (Sept 5, 1991) — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl1991_11
- NAIC, *Product Filing Review Handbook* (2024), Ch. 3 "The Filing Process, Including Policy Form Review" — https://content.naic.org/sites/default/files/pfr-24.pdf
- IRMI, *DOI Certificate Bulletins Are Not "Regulations"* — secondary; argued in the narrower certificate-of-insurance context — https://www.irmi.com/articles/expert-commentary/doi-certificate-bulletins-are-not-regulations
- Insurance Journal, *How Do You Know If It's an ISO Policy Form?* — secondary, read as a search snippet only — https://www.insurancejournal.com/magazines/mag-features/2024/03/18/764934.htm

---

## State insurance regulations and statutes as they reach a claims desk

The codified layer. This is where binding force actually lives, and it reaches
the desk in three guises: **unfair claims settlement practices** rules (how a
claim must be handled), **financial responsibility / mandatory coverage** statutes
(what the policy must at minimum pay), and **line-specific claim rules** (total
loss, salvage, rental, repair, appraisal).

### What it is called

- **Statute:** cited by code chapter and section. `Tex. Ins. Code Ch. 542,
  Subch. B` (the "Prompt Payment of Claims Act"); `§ 10-4-639(1), C.R.S.`;
  `Cal. Veh. Code § 16056`; `N.Y. Ins. Law § 2601` (unfair claim settlement
  practices) and `Art. 51` (no-fault); `215 ILCS 5/154.6`; `K.S.A. 40-284`
  (uninsured motorist). Legislation is also referenced by bill number while it is
  fresh — "SB 1107", the *Protect California Drivers Act*.
- **Regulation:** cited by administrative code title. `11 NYCRR 216` — carrying
  the department nickname **Regulation 64**; `11 NYCRR 65` = **Regulation 68**
  (no-fault); `10 CCR § 2695.1–2695.14`, the **Fair Claims Settlement Practices
  Regulations**; `28 TAC § 5.9303`; `Fla. Admin. Code R. 69O-…`.
- **Generic class name:** the **Unfair Claims Settlement Practices Act** (UCSPA).
  Nearly every state has one; nearly all descend from NAIC models.
- **The models themselves:** NAIC **Model 900**, *Unfair Claims Settlement
  Practices Act* (adopted June 1990, split out of the Unfair Trade Practices Act),
  and NAIC **Model 902**, *Unfair Property/Casualty Claims Settlement Practices
  Model Regulation*. Models bind nobody until a state enacts them.

Note the NY quirk: departments use **nicknames** for regulations
("Regulation 64", "Regulation 68") far more often than the NYCRR cite, and
circular letters use both interchangeably. An id scheme must alias them.

### Who writes it, who is bound

- **Statutes:** the legislature. Binds insurers, courts, and — via reformation —
  the contract itself.
- **Regulations:** the department, under an APA with notice, comment, and
  publication in the state administrative code. Binds insurers and is entitled to
  deference in court, unlike a bulletin.
- **NAIC models:** a standard-setting body of regulators. Bind nobody directly;
  their value to a corpus is that they explain why forty-odd states' UCSPAs look
  alike and where each one diverges. Adoption status is tracked on NAIC's
  per-model state pages (`model-law-state-page-900.pdf`, `-902.pdf`) — use those
  rather than any secondhand count.
- The enforcement hook is characteristically **frequency-based**, not
  single-claim. 11 NYCRR 216 sets minimum claims-handling standards that, if
  violated "without just cause and with such frequency as to indicate a general
  business practice," constitute unfair claims settlement practices under Article
  26 of the Insurance Law. Whether an individual insured gets a private right of
  action out of the UCSPA is a state-by-state split and should never be assumed.

### Shape

- **Statutes:** short, numbered, deeply nested `(a)(1)(A)(i)`. Often one operative
  sentence of 40 words carrying the whole obligation. Cross-references are the
  norm and the cross-reference frequently controls.
- **Regulations:** longer, and structured as *definitions → standards → penalties*.
  10 CCR 2695 is the canonical shape: 2695.2 definitions, 2695.5 duties upon
  receipt of communications, 2695.7 standards for prompt/fair settlement,
  2695.8 additional standards for automobile, 2695.9 repair/restoration.
  Subsection lettering is alphabetical with numbered paragraphs beneath.
- **Tables:** the statutory layer is where the real tables are —
  minimum-limits tables, fee schedules, benefit caps, time-limit grids. Most
  operative text is prose, but a claims corpus needs the limits tables, because
  they are what an adjuster actually looks up.
- **Boilerplate:** an applicability/scope sentence, a severability clause, an
  effective-date section, and a statutory-authority note (which regulation
  implements which statute).
- **Length:** § 2695.8 alone runs subsections (a) through (k). A whole UCSPA
  article is a few thousand words. Individual sections are corpus-chunk sized;
  whole chapters are not.

### Identifier scheme

| Type | Format | Examples |
|---|---|---|
| State statute | `<Code abbr> § <chapter>-<section>` | `§ 10-4-639(1), C.R.S.`; `K.S.A. 40-284`; `Cal. Veh. Code § 16056`; `N.Y. Ins. Law § 2601` |
| Illinois style | `<chapter> ILCS <act>/<section>` | `215 ILCS 5/155.49` |
| Texas style | `Tex. Ins. Code § 542.059` | Chapter 542, Subchapter B |
| State regulation | `<title> <CODE> <part>.<section>` | `11 NYCRR 216.6(b)(2)`; `10 CCR § 2695.8(b)`; `28 TAC § 5.9303`; `Fla. Admin. Code R. 69O-171.005`; `230-RICR-20-05-1.5` |
| Department nickname | `Regulation <N>` | Regulation 64 = 11 NYCRR 216; Regulation 68 = 11 NYCRR 65 |
| NAIC model | `Model #<NNN>` | Model 900; Model 902 |
| Bill (pre-codification) | `<chamber> <number>` + popular name | SB 1107, *Protect California Drivers Act* |

**Dating and versioning.** Regulations do not "supersede" by name the way
circular letters do; they are *amended*, and the version is identified by the
amendment's effective date. The convention that matters at a claims desk is the
**applicability sentence**, and the phrase to grep for is:

> *"policies issued, delivered, issued for delivery, or renewed on or after
> \<date\>"*

That date, not the enactment date and not the loss date, is what decides whether
a given policy period is covered. California's SB 1107 is the clean example: the
revised Vehicle Code § 16056 limits (30/60/15, up from 15/30/5) apply to policies
issued or renewed on or after **January 1, 2025**, and existing policies written
at lower limits come up to the new floor at their next renewal on or after that
date. *Reading implied by the applicability language, not separately confirmed:*
a 12-month policy written in December 2024 therefore runs its term on the old
15/30/5 minimums, and a loss in June 2025 on that unrenewed policy would be
adjudicated under them. Confirm against the codified § 16056 text before relying
on this for a mid-term loss.

### Precedence

1. **Statute beats regulation beats bulletin beats policy form beats claims
   manual.** The first three are the state's; the last two are the carrier's.
2. **A state statute or regulation overrides a national policy form, but only
   upward and only to the state minimum.** Mandatory-limits statutes are a
   *floor*, not a ceiling. A form writing less than the floor is read up to it;
   a form's higher stated limits govern above it. This is why "state minimum
   limits vs. the form's stated limits" is never a conflict: the answer is
   `max(statutory minimum, policy limit)` for the mandated coverage, and the
   policy limit alone for everything above.
3. **The mechanism is the conformity-to-statute clause plus the state amendatory
   endorsement.** Nearly every national form carries language to the effect that
   any provision in conflict with the statutes of the state of issue "is hereby
   amended to conform to the minimum requirements of such statutes" — several
   states codify the clause outright, e.g. Mont. Code Ann. § 33-20-1213, *Policy
   and certificate provisions — conformity with state statutes*. Carriers
   attach a per-state amendatory endorsement to do the conforming explicitly.
4. **The amendatory conforms; it is not licensed to broaden.** NY DFS OGC Opinion
   No. 07-09-10 rejected "state inconsistency" endorsements that would apply
   whichever of the amendatory or the base policy is "more favorable to the
   Insured," as ambiguous and potentially violative of public policy under
   Insurance Law § 2307(b) — precisely because such a clause could broaden
   coverage past what state law permits rather than merely conform it. So the
   default direction is: **amendatory narrows the gap to the statute; it does not
   create a coverage race.**
5. **The sharpest case of a statute changing what the policy pays is UM/UIM.**
   Where a state conditions rejection of uninsured-motorist coverage on a valid
   written rejection, a defective or undocumented rejection results in the
   coverage being **read into the policy** by operation of law — at the statutory
   minimum, or in some states at the policy's liability limits. The declarations
   page can say "UM: rejected" and the claim still pays. See K.S.A. 40-284;
   230-RICR-20-05-1.5; N.M. Stat. § 66-5-301.
6. **Most regulation, however, governs handling, not payment.** 10 CCR 2695.7 sets
   day counts — accept or deny "in no event more than forty (40) calendar days"
   after proof of claim (§ 2695.7(b)); status notice every thirty (30) calendar
   days until determination (§ 2695.7(c)(1)); payment "in no event more than
   thirty (30) calendar days" after settlement is agreed (§ 2695.7(h)). None of
   these changes the amount owed; all of them create exposure if missed.
7. **But some regulation does set the amount.** § 2695.8(b) requires total-loss
   comparables "of like kind and quality, made by the same manufacturer, of the
   same or newer model year," VIN- or stock-number-identified, with every
   adjustment "discernible, measurable, itemized, and specified"; requires the
   settlement to include "all applicable taxes and one-time fees incident to
   transfer of evidence of ownership of a comparable automobile"; and 2695.8(c)
   requires a 35-day reopen notice. § 2695.8(k) requires payment of "reasonable
   towing and storage charges." These are dollars, mandated by regulation, often
   where the national form says only "actual cash value."
8. **Regulation can differ state to state on the same fact.** Colorado requires
   title fees, sales tax and transfer/registration fees on a total loss by statute
   (§ 10-4-639(1), C.R.S.). New York's position is that nothing in the Insurance
   Law or Regulation 64 requires including a *title transfer fee* in ACV, while
   sales tax is added to pre-accident value before the salvage deduction under
   11 NYCRR 216.6(b)(2). Same coverage, same national form, two different checks.
   This is the single best planted-conflict pattern for a personal-auto corpus.
9. **Jurisdiction scoping is by state of policy issuance**, with choice-of-law
   fights at the edges (loss in State B on a policy issued in State A). A corpus
   should carry the state on every regulatory document as a hard field, not infer
   it from text.
10. **Effective dates are prospective by default at the statutory layer and
    occasionally retrospective at the bulletin layer** (TDI's disaster bulletins
    reach back to the event dates). Never assume symmetry between the two layers.

### What an adjuster searches it for

- The minimum limits in force for *this policy's* issue/renewal date, when the
  declarations show limits at or near the floor.
- Whether a UM/UIM or PIP rejection on file is valid in form, and what gets read
  in if it is not.
- Total-loss mechanics: threshold, comparable-vehicle rules, what fees and taxes
  must be added, the reopen window, salvage title obligations.
- Rental / loss-of-use: how long, at what rate, and whether it continues past the
  total-loss offer.
- The clock: acknowledge, investigate, accept-or-deny, pay — the specific day
  counts for this state, and what tolls them.
- Whether the denial language they are about to send is itself an enumerated
  unfair practice in this state.
- Appraisal, arbitration, and repair-facility/OEM-parts rules.

### Sample skeleton

*Fictional. "Calumet Administrative Code" and "Calumet Insurance Code".*

```
Title 14, Calumet Administrative Code, Part 216 —
Fair Claims Settlement Practices (Regulation 31)

216.1  Preamble and statutory authority
       Adopted under § 24-8-101, C.I.C. Applies to policies issued,
       delivered, issued for delivery, or renewed on or after July 1, 2026.

216.2  Definitions
       "Comparable automobile", "proof of claim", "business day".

216.3  Standards for prompt acknowledgment and investigation

       Table — Claims-handling time limits
       | Event | Trigger | Maximum elapsed | Measured in |

216.6  Additional standards applicable to private passenger automobile
  (a)  First-party total loss: valuation method
  (b)  Amounts that must be included in the settlement

       Table — Mandatory settlement components on a declared total loss
       | Component | First party | Third party | Authority |

  (c)  Reopening a first-party total loss claim
       [One sentence of placeholder text describing a reopen window and
       the notice that must accompany the settlement offer.]

216.9  Minimum liability limits — motor vehicle

       Table — Minimum financial responsibility limits
       | Coverage | Limit | Applies to policies issued/renewed on or after |

216.12 Severability
216.13 Effective date and applicability
```

### Sources

- NAIC Model 900, *Unfair Claims Settlement Practices Act* — https://content.naic.org/sites/default/files/model-law-900.pdf
- NAIC Model 900 state adoption page — https://content.naic.org/sites/default/files/model-law-state-page-900.pdf
- NAIC Model 902, *Unfair Property/Casualty Claims Settlement Practices Model Regulation* — https://content.naic.org/sites/default/files/model-law-902.pdf
- NAIC Model 902 state adoption page — https://content.naic.org/sites/default/files/model-law-state-page-902.pdf
- 10 CCR § 2695.7 (California Fair Claims Settlement Practices Regulations, time limits) — https://www.law.cornell.edu/regulations/california/10-CCR-2695.7
- 10 CCR § 2695.8 (additional standards applicable to automobile insurance) — https://www.law.cornell.edu/regulations/california/10-CCR-2695.8
- 11 NYCRR 216 (Regulation 64) scope, as described in NY DFS guidance — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl1991_11
- NY DFS OGC Opinion No. 07-09-10, *State Inconsistency or Amendatory Endorsements* — https://www.dfs.ny.gov/insurance/ogco2007/rg070910.htm
- NY DFS OGC Opinion No. 08-10-13 (title transfer fees and sales tax in ACV) — https://www.dfs.ny.gov/insurance/ogco2008/rg081013.htm
- CO Bulletin B-5.51 quoting § 10-4-639(1), C.R.S. — https://doi.colorado.gov/sites/doi/files/documents/Bulletin%20B-5.51%20Reg%20Fee%20Payment%20After%20Total%20Loss.pdf
- California SB 1107 (Protect California Drivers Act), Veh. Code § 16056 — https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107
- K.S.A. 40-284 (uninsured motorist, written rejection) — https://ksrevisor.gov/statutes/chapters/ch40/040_002_0084.html
- 230-RICR-20-05-1.5 (rejection of uninsured motorist coverage) — https://www.law.cornell.edu/regulations/rhode-island/230-RICR-20-05-1.5
- N.M. Stat. § 66-5-301 (UM rejection) — https://law.justia.com/codes/new-mexico/2018/chapter-66/article-5/section-66-5-301/
- Backus & Woodrow, *Navigating Differing State Laws for Fair Claims Handling* — https://www.eagle-law.com/wp-content/uploads/Paper-S.Backus-LWoodrow-FairClaims-Handling.pdf
- MWL, *Payment of Sales Tax After Vehicle Total Loss in All 50 States* (survey chart) — https://www.mwl-law.com/wp-content/uploads/2018/02/PAYMENT-OF-SALES-TAX-AFTER-VEHICLE-TOTAL-LOSS-CHART.pdf
- NAIC *Product Filing Review Handbook* (2024), Ch. 3 — form filing and policy form review mechanics — https://content.naic.org/sites/default/files/pfr-24.pdf
- Mont. Code Ann. § 33-20-1213, *Policy and certificate provisions — conformity with state statutes* — https://mca.legmt.gov/bills/mca/title_0330/chapter_0200/part_0120/section_0130/0330-0200-0120-0130.html
- Automobile Financial Responsibility Limits and Enforcement by State (limits survey chart) — https://www.riskeducation.org/wp-content/uploads/2024/08/AUTO-FIN-RESP-LIMITS-AND-ENFORCE-BY-STATE-wLOGO-07262024.pdf

---

## Precedence claims (for synthesis)

Atomic. Vocabulary held common with the other clusters: *statute, regulation,
DOI circular/bulletin, policy form, state amendatory endorsement, endorsement,
declarations, claims procedure/manual, adjuster bulletin*.

- **A state statute beats a national policy form** when the form grants less than
  the statute mandates in the state of issue; the form is read up to the statutory
  floor. — https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107
- **A state statute beats the declarations page** when the declarations record a
  rejection of a mandated coverage (UM/UIM) that does not meet the statute's
  written-rejection formalities; the coverage is read into the policy. — https://ksrevisor.gov/statutes/chapters/ch40/040_002_0084.html
- **A policy form's stated limits beat the state statutory minimum** whenever the
  stated limits are higher; the minimum is a floor, not a ceiling. Conformity
  clauses amend a conflicting provision only "to conform to the minimum
  requirements" of the state's statutes. — https://mca.legmt.gov/bills/mca/title_0330/chapter_0200/part_0120/section_0130/0330-0200-0120-0130.html
- **A state amendatory endorsement beats the base national policy form** for the
  state of issue, to the extent needed to conform the form to that state's law. — https://www.dfs.ny.gov/insurance/ogco2007/rg070910.htm
- **A state amendatory endorsement does NOT beat the base form by being "more
  favorable to the insured"**; NY DFS would disapprove an inconsistency clause
  written that way as ambiguous and contrary to public policy under Ins. Law
  § 2307(b). Amendatories conform, they do not broaden. — https://www.dfs.ny.gov/insurance/ogco2007/rg070910.htm
- **A state regulation beats a national policy form on claim-settlement
  mechanics** (comparable-vehicle selection, itemization, taxes and transfer fees,
  reopen windows, towing/storage) even where the form says only "actual cash
  value". — https://www.law.cornell.edu/regulations/california/10-CCR-2695.8
- **A state regulation beats an internal claims procedure / adjuster bulletin**
  on handling deadlines; the carrier's manual may be stricter but never looser. — https://www.law.cornell.edu/regulations/california/10-CCR-2695.7
- **A statute or regulation beats a DOI circular/bulletin**, because the bulletin
  is an interpretation of it; where they diverge the codified text controls. — https://doi.colorado.gov/sites/doi/files/documents/Bulletin%20B-5.51%20Reg%20Fee%20Payment%20After%20Total%20Loss.pdf
- **A DOI bulletin does NOT beat a policy form as a matter of law** — bulletins
  "neither establish binding norms nor finally determine issues or rights" absent
  APA rulemaking, and do not bind courts. — https://www.irmi.com/articles/expert-commentary/doi-certificate-bulletins-are-not-regulations
- **A DOI bulletin DOES beat an internal claims procedure in practice**, because
  departure is examined as a general business practice under the state's unfair
  claims act during market conduct exams. — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl1991_11
- **A later DOI circular beats an earlier one only where supersession is stated**
  ("repeals and replaces Circular Letter No. 4 (2023)") — otherwise both stand. — https://www.dfs.ny.gov/industry-guidance/circular-letters/cl2024-04
- **A withdrawal index entry beats the document's own text**: a circular letter
  can be dead while its body says nothing about it; status lives on the
  department's withdrawn-circulars page. — https://www.dfs.ny.gov/industry_guidance/circular_letters_withdrawn
- **A department's current bulletin beats its own prior informal position**, even
  with no change in the statute — Colorado reversed its historical agreement with
  insurers on registration fees for owner-retained salvage after appellate
  decisions. — https://doi.colorado.gov/sites/doi/files/documents/Bulletin%20B-5.51%20Reg%20Fee%20Payment%20After%20Total%20Loss.pdf
- **A regulator's authority over form content is exercised at filing, not at the
  claim**: a national form (or a deviation from a standard form) must be filed and,
  in prior-approval states, approved before use; form review exists to confirm
  "inclusion of provisions that are specified in law or regulation, and exclusion of
  provisions that are prohibited by law or regulation." — https://content.naic.org/sites/default/files/pfr-24.pdf
- **Applicability date beats enactment date and beats loss date** in deciding
  whether a new rule reaches a given claim; the operative phrase is "policies
  issued, delivered, issued for delivery, or renewed on or after \<date\>". — https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220SB1107
- **A bulletin's compliance deadline beats its issue date**, and a bulletin may
  reach backward to a disaster period preceding its own issuance. — https://www.tdi.texas.gov/bulletins/2024/B-0014-24.html
- **The state of policy issuance scopes every regulatory document**; a bulletin or
  regulation in State A does not reach a claim on a policy issued in State B, so
  a four-state variant family of one form carries four distinct overlays. — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl2009_03
- **State regulation beats state regulation across borders on identical facts**:
  Colorado mandates title fees, sales tax and transfer/registration fees on a
  total loss, while New York requires sales tax in ACV but not a title transfer
  fee. — https://doi.colorado.gov/sites/doi/files/documents/Bulletin%20B-5.51%20Reg%20Fee%20Payment%20After%20Total%20Loss.pdf ; https://www.dfs.ny.gov/insurance/ogco2008/rg081013.htm
- **A NAIC model act beats nothing until a state enacts it**; it explains
  cross-state similarity but has no independent force. — https://content.naic.org/sites/default/files/model-law-900.pdf
- **A single regulatory violation generally does not beat the carrier's position
  without frequency**: NY's Regulation 64 standards become "unfair claims
  settlement practices" when violated without just cause and with such frequency
  as to indicate a general business practice — a rule of 11 NYCRR 216 / Ins. Law
  Art. 26 restated in the circular letter, not created by it. — https://www.dfs.ny.gov/industry_guidance/circular_letters/cl1991_11
