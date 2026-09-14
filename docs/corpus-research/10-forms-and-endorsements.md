# Cluster 10 — Policy forms, endorsements, state amendatory endorsements, declarations

*Research notes for the corpus design (CORPUS-PLAN.md Step 1). US **personal auto**,
the documents the insurer issues as the contract itself. No code. Every structural
claim below is traced to a source at the end of its section.*

**Copyright note carried through this whole file:** ISO/Verisk form wording and
insurer policy wording are licensed, copyrighted expression. Form *numbers*,
*edition dates*, *section titles* and *page counts* are facts and are quoted
freely here because the identifier scheme cannot be described otherwise. The
sample skeletons at the end of each section are original text in the *shape* of
the real thing, and nothing in them is lifted.

**Reading note on the four sections:** this cluster covers four document types
that are really one stack. The base form is the wording, the endorsement is a
patch on the wording, the state amendatory endorsement is a patch that a
regulator forced, and the declarations page is the per-policy manifest saying
which of the three are in play. Precedence between them is mostly *manifest
resolution*, not contract hierarchy — and that is the single most useful thing
in this file for retrieval design.

---

## 1 · Policy forms and editions

### What it is called

- **"Policy form"**, **"coverage form"**, **"base form"**, **"the wording"** — product
  and underwriting people.
- **"Personal Auto Policy" / "PAP"** — the specific ISO product; agents, CE courses
  and coverage-guide literature use "PAP" as shorthand for `PP 00 01` of whatever
  edition.
- **"Policy booklet"** — what carriers who write their own wording call it on the
  cover, and what they call it *inside* the contract clause (State Farm's Oklahoma
  form 9836C literally says the policy consists of the Declarations, "the policy
  booklet version shown on that Declarations", and the endorsements shown there).
- **"Standard form"** — a regulator's term, and a *stronger* term than the industry's.
  In Virginia, "standard form" means the Bureau of Insurance has ordered that this
  exact form and edition is the one insurers must use, not merely one they may use.
- **"Edition" / "edition date"** — the version. Adjusters and coverage counsel say
  "the '18 form" or "the '05 form"; the difference decides real claims.
- **"Program revision"** — ISO's word for a coordinated multistate rewrite that
  produces a new edition and/or an amendatory endorsement. Shows up in the base
  form's own text.

### Who writes it, who is bound

Written by an advisory organization (ISO, now part of Verisk) for its members and
subscribers, or by the carrier's own product department if the carrier writes
proprietary wording (State Farm, USAA, Travelers and Safeco all appear in state
filing repositories with their own wording rather than ISO's). Either way the form
is **filed with each state's insurance regulator** before use — prior-approval,
file-and-use or use-and-file depending on the state, per the NAIC's form-filing
methods chart.

Bound: the insurer (it is the insurer's promise) and the named insured plus the
persons the form defines as insureds. The insured is bound without ever having
negotiated a word of it — which is exactly why ambiguity is construed against the
drafter, and why a regulator gets a veto on the wording in the first place.

The form only binds *a given policy* if it is the version identified on that
policy's declarations for the policy period in force at the date of loss. A newer
edition existing in the world does not reach backwards into an in-force policy.

### Shape

Measured from the Virginia SCC's posted specimen of `PP 00 01 09 18`:

- **14 pages**, two columns per page, roughly 8,500 words. That is the whole
  contract, minus declarations and endorsements.
- **Part structure**, not chapter structure. An unnumbered `AGREEMENT` opener,
  then `DEFINITIONS`, then `PART A – LIABILITY COVERAGE`, `PART B – MEDICAL
  PAYMENTS COVERAGE`, `PART C – UNINSURED MOTORISTS COVERAGE`, `PART D – COVERAGE
  FOR DAMAGE TO YOUR AUTO`, `PART E – DUTIES AFTER AN ACCIDENT OR LOSS`,
  `PART F – GENERAL PROVISIONS`. Parts A–D each repeat the same internal
  skeleton: `INSURING AGREEMENT`, then `EXCLUSIONS`, then `LIMIT OF LIABILITY`,
  then `OTHER INSURANCE`, then (for Parts C and D) `ARBITRATION` or `APPRAISAL`.
  That repetition is the single most important structural fact for a chunker:
  the heading `EXCLUSIONS` appears four or more times in one document and is
  meaningless without its Part.
- **Numbering is an outline, not decimal.** `A.` → `1.` → `a.` → `(1)` → `(a)`.
  Five levels deep is normal. There is no "section 4.2.1" anywhere; cross-references
  inside the form look like "This provision (J.4.) does not apply to…" and
  "this exclusion (8.) does not apply to…". Any citation scheme we invent has to
  carry the Part *and* the outline path, because `A.1.a.` alone is ambiguous across
  six Parts.
- **Defined terms are quoted, not bolded.** The form announces that other words
  and phrases are defined and are in quotation marks when used — so `"your covered
  auto"`, `"bodily injury"`, `"family member"` appear in quotes on every page. This
  is a retrieval gift: quoted-term density is a reliable signal that a chunk is
  contract wording rather than a bulletin or a letter.
- **No tables in the base form.** Zero. Everything numeric lives on the declarations
  or in an endorsement's schedule. The base form's own numbers are inline —
  a dollar cap on bail bond costs stated mid-sentence, a gross-vehicle-weight
  threshold stated mid-definition. If our generated base forms carry tables, they
  are wrong in shape.
- **Boilerplate that repeats on every page**: a running header of the line name
  (`PERSONAL AUTO`) and the form number; a footer that is `<form number> ·
  © Insurance Services Office, Inc., <year> · Page N of 14`, with the form number
  and page number swapping left/right on odd vs even pages. The copyright *year*
  is normally one year before the edition date (`PP 00 01 09 18` carries © 2017;
  `PP 01 75 11 12` carries © 2012) — do not treat the copyright year as the edition.
- **No signature block, no countersignature line** on the ISO base form. Signatures,
  where they exist at all, are on the declarations.

Carrier-proprietary booklets are longer and differently shaped: State Farm's
Oklahoma booklet runs ~19,000 words with a two-page **TABLE OF CONTENTS** with
dot leaders and page numbers, `THIS POLICY` / `DEFINITIONS` / `LIABILITY COVERAGE`
… headings instead of Parts, and coverages the ISO form does not have
(Pet Injury, Death/Dismemberment, Loss of Earnings). Worth imitating in at least
one generated form so the corpus is not monotone.

### Identifier scheme

The ISO convention, stated plainly by the coverage literature and confirmed on
every footer: **two letters, then a four-digit form number written as two
two-digit groups, then the edition month and year as two more two-digit groups.**

```
PP   00 01   09 18
│    │       └── edition: September 2018
│    └────────── form number 0001, written "00 01"
└─────────────── line prefix: PP = personal auto (private passenger)
```

Series meanings observed empirically (from the Virginia standard-form order, the
Maine filing repository, and published endorsement indexes):

| Second pair | What lives there | Examples seen |
|---|---|---|
| `00` | base policy / coverage forms, transition forms | `PP 00 01`, `PP 00 07`, `PP 00 08` |
| `01` | **Amendment of Policy Provisions – \<state\>** | `PP 01 50` (TX), `PP 01 75` (ME), `PP 01 99` (VA) |
| `02` | policy-status endorsements | `PP 02 01` Suspension, `PP 02 02` Reinstatement |
| `03` | the main multistate optional endorsement block | `PP 03 05` Loss Payable, `PP 03 34` Joint Ownership, `PP 03 35` Auto Loan/Lease |
| `04` | UM/UIM limit variants, incl. state versions | `PP 04 01`, `PP 04 02`, `PP 04 83` (VA) |
| `05` | state medical/PIP benefit forms | `PP 05 96` (VA) |
| `13` | newer multistate *and* state endorsements | `PP 13 01`, `PP 13 05`, `PP 13 52`/`13 57`/`13 63` (VA) |
| `14`, `43` | newer state UM and emerging-risk forms | `PP 14 03` (VA UM), `PP 43 20` (VA peer-to-peer sharing) |

**Trap worth writing down, because it will break a naive regex design:** the state
is *not* encoded in the number. `PP 01 99` is Virginia and `PP 01 50` is Texas, but
Virginia's other state forms are `PP 13 58`, `PP 14 03`, `PP 43 20` — scattered
across series that also hold multistate forms. The state lives in the **title**
("— Virginia"), not the identifier. Any "which state is this form for?" logic has
to read the title or a metadata field, never parse the digits.

Format variants actually observed in the wild, all of which an id regex must
tolerate:

| Variant | Where seen |
|---|---|
| `PP 00 01 09 18` | form footer, running header |
| `PP13 68 01 20` | inside a regulator's own order — the space is simply missing |
| `pp-00-01-09-18` | filenames on a DOI website |
| `PP0001 0694` / `pp0001_0694` | older filings and filenames |
| `PP 00 01 06 94` | two-digit year crossing a century (94 = 1994, 18 = 2018) |

Non-ISO carriers use **entirely different families that share no shape with the
ISO one.** Any id design that assumes `XX 00 00 00 00` universally is wrong. Four
real families, each from a state filing repository:

| Carrier | Identifier as printed | Pattern |
|---|---|---|
| State Farm | `9836C` (Oklahoma booklet); `153-7341 WI (10/2022)` (notice) | 4-digit + letter for booklets; `<number>-<number> <ST> (MM/YYYY)` for attachments |
| USAA | `A402ME(01) 05-15` | letter + 3 digits + 2-letter state + `(nn)` sequence + `MM-YY` |
| Travelers | `G01ME00 (10-13)` | alnum block with state inside + `(MM-YY)` |
| Hanover/Citizens | `2312697-1218` | 7-digit form + `MMYY` |
| Safeco | `SA-2890/MEEP 1/19` | prefix + number + program code + `M/YY` |

Note also that filenames and footers disagree: USAA's file is
`A402ME(01)-0215` while the footer of the same document prints
`A402ME(01) 05-15`. Filing date and edition date are different things and both
get stamped on documents.

**Recommendation for the id regex:** design it as a *family* with a
discriminator, not one pattern. Roughly —
`ISO`: `^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$` after normalising separators
to single spaces; `CARRIER`: a per-carrier pattern registered alongside the
carrier. Store the edition as a normalised `YYYY-MM` field derived once at
ingest, and keep the printed string verbatim for display. Resolve the two-digit
year with a pivot (`>= 80 → 19xx`) and record that the pivot is a guess.

### Precedence

- The form is the **floor**. It governs unless something attached to the same
  policy changes it, and it keeps governing on every subject nothing else touched.
  The form says so about itself: its `CHANGES` provision states the policy contains
  all the agreements between insurer and insured, and its terms may not be changed
  or waived except by endorsement issued by the insurer. Direction: form loses to
  endorsement, but only where they actually collide. Source: `PP 00 01 09 18`,
  Part F, `CHANGES` A.
- **Edition is selected by the policy, not by recency.** State Farm's booklet
  states the policy consists of the most recently issued Declarations, the policy
  booklet *version shown on that Declarations*, and the endorsements shown there.
  So the 2018 edition does not govern a policy whose declarations name the 2005
  edition, even in 2026. Condition: date of loss must fall inside the policy period
  of the declarations naming that edition. Source: State Farm Oklahoma form 9836C,
  `THIS POLICY` ¶1.
- **A liberalization applies without an endorsement — with one sharp exception.**
  The base form provides that a change *broadening* coverage under that edition
  without additional premium applies automatically from the date the insurer
  implements it in that state; but this does **not** apply to changes implemented
  through a general program revision that contains both broadenings and
  restrictions, whether delivered as a subsequent edition or as an amendatory
  endorsement. This is the most condition-laden precedence rule in the whole
  cluster and the one most likely to be got wrong. Source: `PP 00 01 09 18`,
  Part F, `CHANGES` C.
- **A regulator can make a specific edition mandatory**, displacing insurer choice.
  Virginia's Bureau of Insurance approved `PP 00 01 09 18` and fifteen endorsements
  as *standard forms*, allowed the 2005 forms for one more year, and ordered that
  from 1 January 2022 those listed forms "are the only standard forms that shall
  be used in writing personal automobile insurance". Direction: regulator order
  beats insurer form choice, conditioned on jurisdiction and on the order's
  effective date. Source: Virginia SCC, Explanatory Memorandum for AO 12113.

### What an adjuster searches it for

- "what edition of the personal auto policy is on this policy"
- "does the 09 18 form cover a newly acquired auto automatically"
- "definition of collision in the base form"
- "is a temporary substitute vehicle a covered auto"
- "what does Part D say about betterment / depreciation"
- "are there exclusions for delivery or ride-hail in the base wording"
- "duties after loss — how long does the insured have to notify us"
- "does the base form have an appraisal clause and is it mandatory"
- "which Part governs uninsured motorist arbitration"

### Sample skeleton

```
# PA-2026-01 — Personal Auto Policy, National Form (rev. Jan 2026)

> Fictional document, written for an FDE practice engagement.
> Form ID: PA-2026-01 · Jurisdiction: National · Effective: 2026-01-01
> Supersedes: PA-2023-01 · Pages: 12

## Agreement
One paragraph: in exchange for premium and subject to the terms, we agree
with you as follows.

## Definitions
Lettered list A.–L. Each defined term in quotation marks wherever it is
later used.

## Part A — Liability Coverage
### Insuring Agreement
### Exclusions
### Limit of Liability
### Other Insurance

## Part B — Medical Payments Coverage
(same four subheadings)

## Part C — Uninsured Motorists Coverage
(same four subheadings, plus Arbitration)

## Part D — Coverage for Damage to Your Auto
(same four subheadings, plus Appraisal)

## Part E — Duties After an Accident or Loss

## Part F — General Provisions
### Changes
Terms change only by endorsement we issue. A broadening made without extra
premium applies automatically, except within a general program revision.
### Policy Period and Territory
### Termination
### Our Right to Recover Payment
```

*No tables. Outline numbering A. / 1. / a. / (1). Footer on every page repeating
form id, copyright line, and "Page N of M".*

### Sources

- https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf — Virginia SCC's posted specimen of ISO `PP 00 01 09 18`. Primary source for page count (14), Part A–F structure, A./1./a./(1) outline numbering, quoted-defined-terms convention, footer format, absence of tables, and the exact text of the `CHANGES` provision including the liberalization exception.
- https://www.oid.ok.gov/wp-content/uploads/2025/11/state-farm-9836C.pdf — Oklahoma DOI's copy of State Farm's proprietary personal car policy booklet. Establishes the non-ISO shape (TOC with dot leaders, named-coverage headings), the "policy consists of" clause fixing which edition governs, and the carrier's own changes/liberalization clause.
- https://pxl-sccvirginiagov.terminalfour.net/prod01/channel_3/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/administration-of-insurance-regulation-in-virginia/administrative-orders/AO12113EX.pdf — Virginia SCC Explanatory Memorandum for AO 12113. Primary source for a regulator mandating a specific edition, the full list of Virginia standard forms with edition dates, the one-year transition, and the scattering of state forms across ISO series.
- https://roughnotes.com/big_i_demo/pfm/400/410_0403.HTM — published index of ISO personal auto endorsements; states the ISO numbering convention in words ("two letters followed by a four digit form number, then the form's edition month and year") and lists the `PP 02/03/04/13` series titles.
- https://content.naic.org/sites/default/files/model-law-chart-pa-15-form-filing-methods-for-property-casualty.pdf — NAIC chart of form-filing methods by state; establishes prior-approval vs file-and-use vs use-and-file as the regulatory gate every form passes through.

---

## 2 · Endorsements

### What it is called

- **"Endorsement"** is the universal term in personal lines. **"Rider"** is the life
  and health equivalent and leaks into casual usage; an adjuster on an auto file
  says endorsement.
- **"Attached form"**, **"attachment"**, **"the schedule"** — underwriters and policy
  service, referring to what got stapled onto a particular policy.
- **"Change endorsement" / "policy change"** — an agent or CSR describing a mid-term
  amendment (add a vehicle, change a deductible). Note ISO **withdrew** the
  `PP 03 10` Change Endorsement after removing the base-form wording that had
  required post-issuance endorsements to be attached — so "you need a change
  endorsement for that" is obsolete advice on current ISO paper.
- **"Broadening endorsement" vs "restrictive endorsement" / "exclusionary
  endorsement"** — coverage counsel's split, and the one that matters on a claim,
  because the second kind is the one an insured will say they never saw.
- **"Amendatory endorsement"** used *without* a state name is a carrier's catch-all
  patch; with a state name it is the regulated animal in §3 below.

### Who writes it, who is bound

Drafted by ISO (multistate endorsements, available to members and subscribers) or
by the carrier's product department. Filed with the state like any form. Attached
to an individual policy by underwriting, either at issuance or mid-term.

Bound: the same parties as the base form, but **only on the policies it is actually
attached to.** This is the whole distinction from the base form, and it is the
reason an endorsement is useless in retrieval without the per-policy attachment
data — a corpus of endorsements answers "what could this say", never "what does
this policy say". That is precisely the DATA/DOCUMENT split CORPUS-PLAN.md draws.

### Shape

From `PP 01 75 11 12` (a 3-page state endorsement) and `A402ME(01) 05-15` (a
3-page carrier endorsement):

- **Short. 1–4 pages, 300–1,500 words.** An endorsement is a diff, not a document.
- **A mandatory shout-line at the top**, in caps, telling the reader the endorsement
  changes the policy and to read it. Present on every ISO endorsement examined.
- **Title line** naming the endorsement, centred, under the shout-line.
- **Body organised by the target it patches**, in the base form's own order:
  `I. Definitions`, `II. Part A – Liability Coverage`, `III. Part D – Coverage For
  Damage To Your Auto`, `IV. Part F – General Provisions`. Roman numerals at the
  top level on ISO state endorsements; carrier endorsements often just print
  `PART D - PHYSICAL DAMAGE COVERAGE` as a banner.
- **The verbs are the load-bearing part.** Every paragraph opens with one of a
  tiny vocabulary: *the following is added to*, *is replaced by the following*,
  *is deleted*, *is amended as follows*, *is replaced in its entirety by the
  following*. These five phrases are the machine-readable operation codes of the
  whole genre. An extractor that captured `{operation, target, new text}` from
  each paragraph would capture most of what precedence needs.
- **A closing preservation clause**: coverage is subject to all other provisions
  of the policy except as modified. Carrier forms state it at the top instead.
- **SCHEDULE tables** are where an endorsement carries variable data, and many
  endorsements have one. Typical columns: *Vehicle / Description*, *Coverage*,
  *Limit of Liability*, *Deductible*, *Premium*, and sometimes *Named Person* or
  *Loss Payee*. A schedule frequently carries the note that if it is left blank,
  the entry is taken from the declarations — which makes a schedule table
  meaningless if its header row is severed from its body. That is the exact
  chunker failure mode CORPUS-PLAN.md already plants a trap for; endorsement
  schedules are the most realistic place to plant more.
- **Signature/countersignature block**: absent from ISO personal auto endorsements
  examined. Where carriers include one it is an "Authorized Representative" line,
  and it is a formality — see Precedence.
- Footer same as the base form: form id, copyright line, `Page N of M`.

### Identifier scheme

Same family as the base form — an endorsement is just another form number.
`PP 03 35 09 18`, `PP 13 02 09 18`, `PP 01 75 11 12`. There is no separate
"endorsement id" namespace in the ISO scheme; you cannot tell from the number
alone whether a form is a base form or an endorsement, except by the convention
that `00` is the base series.

What *does* distinguish an endorsement in practice is that it acquires two extra
identifiers when attached to a policy:

- an **endorsement effective date**, which is often *not* the policy inception
  date (a mid-term add-on takes effect at the change date), and
- an **endorsement sequence or transaction number** assigned by the policy admin
  system, not by the form.

Any corpus record for an endorsement needs `form_id + edition + effective_date`
and, for the attached instance, a policy number and a transaction id. Modelling
the form and the attachment as the same object will produce a corpus that cannot
answer date-of-loss questions.

Carrier endorsements follow the carrier's own family (see §1's table). USAA's
`A402ME(01) 05-15` carries the state code *inside the identifier*, unlike ISO's.

### Precedence

- **Endorsement beats the base form on the subject it addresses; the rest of the
  form stays in force.** Direction and scope both matter — an endorsement that
  replaces the Supplementary Payments provision changes nothing about exclusions.
  The base form authorises this itself: terms may not be changed or waived except
  by endorsement issued by the insurer. Source: `PP 00 01 09 18` Part F `CHANGES` A;
  the endorsements themselves restate it in their preservation clause
  (`A402ME(01) 05-15`: coverage is subject to all provisions of the policy and
  amendments except as modified).
- **Which endorsement governs is decided by what was attached and effective on the
  date of loss** — not by which edition is newer in the abstract, and not by what
  is on the policy today. The contract clause that does this work is the "policy
  consists of" clause naming the endorsements *shown on that Declarations*.
  Source: State Farm 9836C `THIS POLICY` ¶1.
- **An endorsement not listed on the declarations' schedule of forms, and not
  incorporated by reference by the primary form, may be unenforceable.** This is
  the strongest version of "attachment matters", and it runs *against* the
  insurer. The leading authority is *National Union Fire Ins. Co. v. Lumbermens
  Mut. Cas. Co.* (1st Cir. 2004) — a statement on an endorsement that it is part
  of the policy does not govern coverage unless the primary policy form confirms
  it. Direction: declarations schedule beats an orphan endorsement. Source:
  Insurance Journal, "If an Endorsement Is Missing from a Policy's Schedule of
  Forms, Is It Enforceable?".
- **Countersignature is NOT a condition of validity — flag for the corpus.** The
  existing corpus plants a trap at `cov-004` (endorsement attached, not
  countersigned) that presumes non-countersignature affects enforceability. In
  current US law it generally does not. Florida still has a countersignature
  requirement on the books and the same section says in terms that the absence of
  a countersignature does not affect the validity of the policy. More broadly, the
  resident-agent countersignature statutes were held unconstitutional and repealed
  or struck in every state between 2003 and 2005. If the corpus wants a
  "defective endorsement" trap, a better one is **an endorsement missing from the
  declarations' schedule of forms** (previous bullet), which is a live rule with a
  real case behind it. Sources: Fla. Stat. §624.425; Insurance Journal 2005.
- **Two endorsements that both modify the same provision do not resolve by
  "latest wins" — they can render the policy ambiguous and knock the restriction
  out entirely.** Courts have negated an exclusion where multiple endorsements
  modified it inconsistently. This is a real contradiction with the folk rule that
  the most recently issued endorsement controls, and the synthesis step should see
  both claims. Source: The D&O Diary.

### What an adjuster searches it for

- "which endorsements are attached to policy AUT-4483 on the date of loss"
- "is there a rideshare or transportation network endorsement on this policy"
- "did an endorsement change the comprehensive deductible"
- "glass endorsement — does the deductible get waived on a repair"
- "was the endorsement effective before the accident date"
- "does the endorsement replace the exclusion or just add to it"
- "endorsement isn't on the dec page schedule — does it apply"
- "loss payee / lienholder endorsement for this vehicle"

### Sample skeleton

```
# PA-END-2026-04 — Glass Repair Amendment

> Fictional document, written for an FDE practice engagement.
> THIS ENDORSEMENT CHANGES THE POLICY. PLEASE READ IT CAREFULLY.
> Form ID: PA-END-2026-04 · Amends: PA-2026-01 · Jurisdiction: National
> Effective: 2026-04-01

## Schedule

| Vehicle | Coverage | Limit | Deductible | Premium |
|---|---|---|---|---|
| (blank = as shown on the Declarations) | | | | |

## I. Definitions
The following is added to the Definitions section. One placeholder sentence
defining a term used only by this endorsement.

## II. Part D — Coverage for Damage to Your Auto
Paragraph B. of the Insuring Agreement is replaced by the following.
One placeholder paragraph stating the replacement rule.

## III. Part F — General Provisions
The following is added to the Our Right to Recover Payment provision.
One placeholder sentence.

## All Other Provisions
All other provisions of the policy not in conflict with this endorsement
continue to apply.
```

*Note the table: if a chunker splits it from its header row the "blank means take
it from the Declarations" rule becomes unrecoverable.*

### Sources

- https://www1.maine.gov/pfr/insurance/themes/insurance/pdf/pdf2/liberty_mutual_group/peerless_insurance/amendment_of_policy_provisions_pp_01_75_11_12.pdf — Maine Bureau of Insurance copy of ISO `PP 01 75 11 12`. Primary source for endorsement length (3 pages, ~1,200 words), the caps shout-line, roman-numeral-by-target body structure, and the *added / replaced by / amended as follows* verb vocabulary.
- https://www.maine.gov/pfr/insurance/themes/insurance/pdf/pdf2/usaa_group/usaa_casualty_insurance/A402ME(01)-0215.pdf — USAA carrier amendatory endorsement. Primary source for a non-ISO identifier family, the up-front preservation clause, and "replaced in its entirety by the following" phrasing.
- https://www.insurancejournal.com/magazines/mag-features/2026/05/04/868017.htm — on whether an endorsement missing from the schedule of forms is enforceable; cites *National Union v. Lumbermens* (1st Cir. 2004), *Allstate v. Dean*, *Smith v. Dodgeville Mutual*.
- https://law.justia.com/codes/florida/title-xxxvii/chapter-624/part-iii/section-624-425/ and http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699/0624/Sections/0624.425.html — Fla. Stat. §624.425: requires agent countersignature and states that its absence does not affect policy validity.
- https://www.insurancejournal.com/news/midwest/2005/11/30/62599.htm — countersignature laws struck down / repealed across all 50 states by 2005.
- https://www.dandodiary.com/2021/06/articles/d-o-insurance/multiple-endorsements-modifying-same-exclusion-render-policy-ambiguous-negating-exclusions-applicability/ — multiple endorsements modifying the same exclusion rendered the policy ambiguous and negated the exclusion.
- https://ohioinsuranceagents.com/blog/2019/new-tune-understanding-isos-recent-changes-to-the-pap/ — ISO withdrew `PP 03 10` Change Endorsement along with the base-form requirement that post-issuance endorsements be attached.

---

## 3 · State amendatory endorsements

### What it is called

- **"Amendment of Policy Provisions — \<State\>"** is the literal ISO title, and the
  most common form of words.
- **"State amendatory endorsement"**, **"amendatory"**, **"the state amendatory"** —
  what underwriters, compliance and adjusters call it in speech.
- **"Conformity endorsement"** / **"state conformity"** — used where its job is
  narrowly to bring the national wording up to the state's mandated minimums.
- Regulators do not usually use "amendatory" as a category; Virginia simply lists
  `PP 01 99 01 21 Amendment of Policy Provisions – Virginia` among the **standard
  forms** insurers must use. To a regulator it is not a special animal, it is just
  the form it has ordered.
- There is a second, importantly different animal with a similar name: a carrier's
  **"Amendatory Endorsement"** with no state in the title (USAA's `A402ME(01)`
  has a state code in the *number* but the title is bare "AMENDATORY ENDORSEMENT").
  That is a carrier product change, not a compliance patch. The corpus should
  carry both and they should be distinguishable, because an adjuster asking
  "what does the state amendatory say" means only the first.

### Who writes it, who is bound

Drafted by ISO per state (or by the carrier's state compliance team), and filed
with — and often effectively dictated by — that state's insurance department. The
content is driven by the state's insurance code: mandated minimum liability
limits, mandated UM/UIM, mandated cancellation and nonrenewal notice periods, PIP
or medical-benefit mandates, post-judgment interest, subrogation restrictions.
`PP 01 75 11 12` (Maine) is a clean specimen: it defines "minimum limits" by
reference to what Maine law requires, rewrites Supplementary Payments, rewrites
the definition of collision, constrains the insurer's right to recover on medical
payments, and replaces the whole Termination provision with Maine's notice rules.

Bound: insurer and insured, in that state, on every policy the state's rules reach
— which in practice means it is attached to *every* policy in that state rather
than selected by underwriting. It is an endorsement by mechanism and a mandate by
nature.

### Shape

- **2–8 pages**, similar to other endorsements but usually at the longer end,
  because termination/cancellation rules alone eat a page and a half.
- Same caps shout-line, same title, same by-target roman-numeral body.
- **Distinctive content markers**: explicit dollar minimums lifted from the state's
  statute and stated as a per-person / per-accident / property-damage triple; explicit
  day counts attached to cancellation and nonrenewal notices, with a shorter count
  for nonpayment of premium than for other causes; and references to the state by
  name in headings and in the title.
- **Usually no schedule table**, because there is nothing per-policy to vary —
  which is a genuine shape difference from ordinary endorsements and a good signal
  for classification. Where a table appears it is a **minimum-limits table**:
  columns *Coverage*, *Minimum limit per person*, *per accident*, *property damage*.
- Frequently **replaces entire provisions** rather than adding to them, because a
  state's cancellation regime cannot be expressed as an addition.

### Identifier scheme

In the ISO scheme the "Amendment of Policy Provisions" series is `PP 01 nn`, with
the last pair allocated per state and **not derivable from anything** — it is a
lookup table, not an algorithm:

| Form | State |
|---|---|
| `PP 01 50` | Texas |
| `PP 01 75` | Maine |
| `PP 01 99` | Virginia |

And, restating the trap from §1 because it bites hardest here: **the `PP 01`
series is not the whole set of a state's forms.** Virginia's mandated set includes
`PP 03 27 01 20`, `PP 04 83 01 20`, `PP 05 96 01 20`, `PP 13 48/52/57/58/59/63/68`,
`PP 14 03 10 20` and `PP 43 20 11 20` — all titled "— Virginia", none in the
`PP 01` series. A regex over the number can never answer "is this a state form,
and which state". Carry `jurisdiction` as an explicit field, populated from the
title, and treat the number as opaque.

Carrier families encode state differently and more helpfully: `A402ME(01) 05-15`
(USAA, ME), `G01ME00 (10-13)` (Travelers, ME), `153-7341 WI (10/2022)`
(State Farm, WI). If we want a corpus where the state *is* parseable from the id,
we should imitate a carrier family and say so, not imitate ISO and pretend.

Edition dates behave the same as elsewhere, but note that state editions drift
from the national one: Virginia's national base form is the `09 18` edition while
its state forms are `01 20`, `10 20`, `11 20`, `12 20` and `01 21`. **A state
amendatory's edition date is routinely later than the base form it amends**, and
that is normal, not an error.

### Precedence

- **The state amendatory beats the national base form, within that state, on the
  provisions it touches.** Mechanically it is just an endorsement, so it inherits
  the endorsement rule; substantively it wins because the base form's own
  `CHANGES` provision lets an issued endorsement change any term. Condition:
  jurisdiction — the Maine form governs Maine policies and is irrelevant to a
  Texas loss even if both are in the corpus. Source: `PP 01 75 11 12` (which
  replaces named provisions of Parts A, D and F outright) read with
  `PP 00 01 09 18` Part F `CHANGES` A.
- **The state amendatory beats an ordinary multistate endorsement where they
  conflict, because behind it stands a statute the parties cannot contract around.**
  Stated carefully: the amendatory's *content* is mandated, so a private
  endorsement that reduced coverage below it would be unenforceable to that extent
  rather than "outranked" in a formal hierarchy. Hedge this one — the ordering is
  a consequence of the statute, not of a stated document-precedence rule, and it
  applies only where the amendatory is tracking a mandate rather than making an
  optional state change.
- **Statute and regulation beat conflicting policy language outright.** The
  auto-specific authority is *Williams v. GEICO* (S.C. 2014): a family step-down
  provision that cut liability coverage from the amount stated on the policy down
  to the statutory minimum was held void as violative of public policy and the
  state's motor-vehicle insurance statute — even though the court agreed the
  policy itself was unambiguous. Regulators reach the same result prospectively
  by prescribing mandatory provisions: New York requires owner's liability
  policies to contain the listed minimum provisions "or provisions which are
  equally or more favorable" to the insured and judgment creditors. Many policies
  also carry a **conformity clause** that performs the amendment automatically —
  a provision in conflict with the law of the state where the policy is issued is
  read as the state's law instead; an Indiana court used exactly such a clause to
  strike a one-year suit limitation. Direction: statute beats every document in
  this cluster, unconditionally. Sources: *Williams v. GEICO*; 11 NYCRR 60-1.1;
  *State Farm Fire & Cas. Co. v. Riddell Nat'l Bank* (Ind. Ct. App. 2013).
- **A regulator's order beats the insurer's form choice, on and after the order's
  effective date, in that jurisdiction.** Virginia ordered that from 1 Jan 2022 only
  the listed forms may be used to write personal auto, having permitted the prior
  2005 forms for a one-year overlap. The overlap is the interesting bit for a
  corpus: for one year *both* editions were valid, and only the policy's own
  declarations resolved which applied. Source: Virginia SCC AO 12113 memo.
- **Ambiguity is construed against the drafter.** Not a document ordering, but the
  tie-breaker courts reach for when the ordering does not resolve a conflict —
  and therefore a rule the synthesised precedence graph must hold as a terminal
  fallback rather than as an edge between node types.

### What an adjuster searches it for

- "what are the minimum liability limits in Maine"
- "Virginia amendatory — how many days notice for cancellation for nonpayment"
- "does the state amendatory change the definition of collision"
- "is UM stacking permitted in this state"
- "state amendatory for Texas — PP 01 50 — what does it change in Part A"
- "which state forms are mandatory on a policy written in Virginia after 2022"
- "post-judgment interest — does the state form add it"
- "can we subrogate against medical payments in this state"

### Sample skeleton

```
# PA-AMD-CA-2026-01 — Amendment of Policy Provisions — California

> Fictional document, written for an FDE practice engagement.
> THIS ENDORSEMENT CHANGES THE POLICY. PLEASE READ IT CAREFULLY.
> Form ID: PA-AMD-CA-2026-01 · Amends: PA-2026-01 · Jurisdiction: CA
> Effective: 2026-01-01 · Mandatory on all CA policies

## I. Definitions
"Minimum limits" means the limits this state requires a liability policy to
carry.

| Coverage | Each person | Each accident |
|---|---|---|
| Bodily injury | $— | $— |
| Property damage | — | $— |

## II. Part A — Liability Coverage
The Supplementary Payments provision is replaced by the following.
One placeholder paragraph.

## III. Part D — Coverage for Damage to Your Auto
Paragraph B. of the Insuring Agreement is replaced by the following.
One placeholder paragraph.

## IV. Part F — General Provisions
### Termination
The Termination provision is replaced by the following.
#### Cancellation
#### Nonrenewal
#### Proof of Notice
Placeholder day-count rules.

## All Other Provisions
All other provisions of the policy continue to apply.
```

### Sources

- https://www1.maine.gov/pfr/insurance/themes/insurance/pdf/pdf2/liberty_mutual_group/peerless_insurance/amendment_of_policy_provisions_pp_01_75_11_12.pdf — ISO `PP 01 75 11 12`, Maine. Primary source for the state amendatory's title convention, content markers (statutory minimum limits, notice day-counts), by-target structure, and wholesale replacement of the Termination provision.
- https://pxl-sccvirginiagov.terminalfour.net/prod01/channel_3/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/administration-of-insurance-regulation-in-virginia/administrative-orders/AO12113EX.pdf — Virginia SCC AO 12113 memo. Establishes `PP 01 99` as Virginia's amendatory, the scattering of state forms across non-`PP 01` series, the later edition dates on state forms, and the mandatory-use date with a one-year overlap.
- https://www.iiat.org/infocentral/pa-iso-amendment-of-policy-provisions-texas-pp-01-50 — Texas association reference identifying `PP 01 50` as the Texas amendment of policy provisions; corroborates that the last pair is a per-state allocation.
- https://law.justia.com/cases/south-carolina/supreme-court/2014/27435.html — *Williams v. GEICO* (S.C. 2014). Auto-specific primary authority that a policy provision reducing coverage below the stated amount to the statutory minimum is void against public policy, notwithstanding that the policy was unambiguous.
- https://www.law.cornell.edu/regulations/new-york/11-NYCRR-60-1.1 — 11 NYCRR 60-1.1, New York's mandatory provisions for motor-vehicle owner's liability policies; policies must contain the listed minimum provisions or ones equally or more favorable to the insured, which is the prospective form of "statute beats policy".
- https://www.propertyinsurancecoveragelaw.com/blog/policy-conditions-conformity-to-state-law-may-extend-the-period-time-to-file-suit/ — discussion of *State Farm Fire & Cas. Co. v. Riddell Nat'l Bank* (Ind. Ct. App. 2013); a conformity-to-state-law condition displaced a conflicting one-year suit limitation. Property line, cited for the conformity clause's mechanism rather than as auto authority.
- https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf — the base form's `CHANGES` A, the textual hook by which any endorsement (including a state amendatory) can change a term.

---

## 4 · Declarations pages

### What it is called

- **"Declarations page"**, **"dec page"**, **"the decs"** — everyone, constantly. The
  single most-spoken document name on a claims floor.
- **"Policy declarations" / "Auto Policy Declarations"** — the printed title.
- **"Coverage summary"**, **"policy summary"** — consumer-facing naming; regulators'
  consumer guides use "Declarations Page" and explain it as the page identifying
  the kinds and amounts of coverage and the cost.
- **"Proof of insurance"** — what the insured calls the little card, which is a
  different artifact derived from the same data.
- **"Schedule of forms" / "forms and endorsements list"** — the *section within*
  the declarations that manifests which forms are attached. It has its own name
  because it does its own job, and for precedence it is the most important part of
  the whole page.

### Who writes it, who is bound

Generated by the insurer's policy administration system from the underwriting
record — not drafted. The *layout* is a filed form (Allstate's sample carries the
form id `IL010NBD` in its footer, exactly like a policy form), but the *content*
is per-policy data. Reissued on every change and every renewal, which is why the
governing one is "the most recently issued Declarations".

Bound: insurer and named insured. Its statements are also the basis on which the
insurer says it issued the policy — carriers' booklets state that coverage is
provided in reliance on the statements made, which is the hook for
misrepresentation defences.

**Tension to flag, not resolve:** CORPUS-PLAN.md classifies the declarations as
**DATA, not document**, deliberately kept out of the vector store and served by
`get_policyholder`. That is defensible — the page is a rendering of per-policy
variables. But the declarations also does contract work that no other document
does: it is the manifest that *selects* which base form edition and which
endorsements are in the contract at all, and an endorsement absent from its
schedule of forms may be unenforceable. So there are two distinct things here
that the Step-2 design should separate: the **values** (limits, deductibles,
premium — data, fetched by key) and the **manifest** (form ids, editions,
endorsement ids and their effective dates — the thing precedence resolution reads
first). The manifest could live in the data side and still be the root of the
precedence graph. Decide in Step 2; this section only marks it.

### Shape

From Allstate's publicly posted sample:

- **1–4 pages**, mostly whitespace and rules, ~300–800 words of which most are
  labels rather than prose.
- **It is nearly all tables.** This is the structural opposite of the base form
  and the reason it is a separate document type at all. The recurring blocks:

| Block | Columns / fields it holds |
|---|---|
| Summary header | Named insured(s) and address; agent name and phone; billing note |
| Policy identity | Policy number; **policy period** (from/to, with the 12:01 A.M. convention); policy effective date |
| Drivers | Drivers listed; **drivers excluded** |
| Vehicles | Vehicle year/make/model; **VIN**; lienholder / loss payee |
| Coverage, per vehicle | *Coverage* · *Limits* (with "each person" / "each occurrence" qualifiers) · *Deductible* · *Premium* |
| Discounts | Discount name · amount |
| Rating information | Annual mileage, miles to work/school, rated driver, rate class |
| Premium summary | Per-vehicle premium, total premium |
| **Forms and endorsements** | Form id · edition · title — the manifest *(not present on the Allstate sample; inferred from the carrier booklet clause that the policy consists of the endorsements "shown on that Declarations")* |

- **Coverage rows are the money.** A single row reads
  `Bodily Injury | $— each person / $— each occurrence | Not Applicable | $—`.
  Losing the header row of that table destroys the meaning of every number in it,
  and the coverage table is where an adjuster's question actually lands. If the
  corpus keeps declarations as documents at all, this is the table that must
  survive chunking intact.
- **Repeated per vehicle.** A three-car policy repeats the entire coverage block
  three times with different values — a near-duplicate problem by construction,
  and a realistic one.
- **Footnote-style notes embedded in the table**, e.g. a line under the UM row
  stating that limits cannot be stacked or aggregated. These are contract terms
  hiding in a data table.
- **Footer** carries the form id of the declarations layout, an "information as of"
  date and `Page N`.
- **No signature on the modern sample**; historically a countersignature line sat
  here, which is where the countersignature question in §2 comes from.

### Identifier scheme

The declarations has **two identifiers and they are routinely confused**:

1. The **layout form number**, printed in the footer, from the carrier's own form
   family — `IL010NBD` in the Allstate sample. `IL` here is the ISO-style
   interline prefix; the rest is proprietary. This identifies the template, not the
   policy.
2. The **policy number**, printed prominently — carrier-specific and shaped
   nothing like a form id. Allstate's sample prints `1 23 456789 01/01`:
   space-separated groups with a trailing `NN/NN` that is a term/renewal
   indicator, not a date. Other carriers use unbroken alphanumerics.

Neither is an edition date in the form sense. The declarations instead carries
**three dates** that a claim turns on and that must not be collapsed:

- **policy period** (from–to, with a time of day — the 12:01 A.M. standard-time
  convention matters on a same-day loss),
- **policy effective date** (the current term or the last change),
- **"information as of" / issue date** (when this printout was produced).

For the corpus, a declarations record needs `policy_number`, `layout_form_id`,
`period_start`, `period_end`, `issued_on`, plus the manifest rows. An id regex for
declarations should target the *policy number* shape per carrier, and should not
try to unify it with the form-id regex — they are unrelated namespaces.

### Precedence

- **The declarations selects the contract.** It is not so much that it beats other
  documents as that it says which other documents exist: the policy consists of
  the most recently issued Declarations, the booklet version shown on it, and the
  endorsements shown on it. Everything else in this cluster's precedence graph
  is downstream of this one clause. Direction: declarations determines membership;
  membership determines what can beat what. Source: State Farm 9836C `THIS POLICY`.
- **An endorsement absent from the declarations' schedule of forms may be
  unenforceable** — the mirror of the same rule, and the one that has teeth in
  litigation. Source: Insurance Journal on *National Union v. Lumbermens*.
- **For variable values, the declarations supplies rather than overrides.** The
  base form is written with holes in it — "the Limit Of Liability shown in the
  Declarations", "less any applicable deductible shown in the Declarations". Most
  apparent dec-vs-form "conflicts" are not conflicts at all; the form delegated the
  number. Getting this right avoids a lot of spurious precedence. Source:
  `PP 00 01 09 18`, Parts A–D limit provisions.
- **Genuine dec-vs-form conflicts: hedge.** Two lines of authority exist. One says
  the specific controls the general, so the declarations governs. The other reads
  the documents together and asks whether the combination is ambiguous, then
  construes against the insurer — which usually reaches the same *outcome* for the
  insured by a different route. *Williams v. GEICO* is a caution against assuming
  either: the court held the policy **unambiguous** — so neither route applied —
  and still voided the step-down that cut coverage below the stated amount, on
  public-policy grounds. Do **not** state a clean directional rule for this pair.
  State the outcome tendency (the reading favourable to the insured usually wins)
  and mark it unsettled. Source: *Williams v. GEICO* (S.C. 2014); I did not locate
  a primary source stating a general dec-beats-form rule, only secondary
  restatements of specific-over-general.
- **The declarations cannot override a statute or a mandated state form.** If the
  declarations shows a limit below the state minimum, the statutory minimum
  applies. Follows from the conformity rule in §3.

### What an adjuster searches it for

An adjuster mostly *reads* the dec page rather than searching it, but the question
phrasings that hit it are:

- "what are the liability limits on this policy"
- "what's the comprehensive deductible on the 2019 Civic"
- "was the policy in force on the date of loss"
- "is this driver listed — or excluded"
- "which vehicle on the policy is the loss vehicle, by VIN"
- "what forms and endorsements are listed on the dec page"
- "is there a lienholder on this vehicle"
- "does this policy have rental reimbursement, and what's the daily cap"
- "when was the dec page last reissued — before or after the change"

### Sample skeleton

```
# DEC-AUT-4483-2026-T3 — Auto Policy Declarations

> Fictional document, written for an FDE practice engagement.
> Layout form: DEC-PA-02 · Policy: AUT-4483 · Issued: 2026-02-01

## Summary
Named insured · Mailing address · Agent · Billing note

## Policy Identity
| Policy number | Policy period | Effective date |
|---|---|---|
| — | — 12:01 A.M. to — 12:01 A.M. | — |

## Drivers
| Driver | Status (listed / excluded) |

## Vehicles
| # | Year / Make / Model | VIN | Lienholder |

## Coverage — Vehicle 1
| Coverage | Limits | Deductible | Premium |
|---|---|---|---|
| Bodily injury | $— each person / $— each occurrence | Not applicable | $— |
| Property damage | $— each occurrence | Not applicable | $— |
| Uninsured motorist | $— / $— | Not applicable | $— |
| Comprehensive | Actual cash value | $— | $— |
| Collision | Actual cash value | $— | $— |
| Rental reimbursement | $— per day, — days max | Not applicable | $— |

*Note rows sit inside this table and carry contract terms, e.g. a
non-stacking statement under the uninsured motorist row.*

## Discounts
| Discount | Amount |

## Rating Information
Annual mileage · commute distance · rated operator · rate class

## Forms and Endorsements Attached
| Form ID | Edition | Title | Endorsement effective |
|---|---|---|---|
| PA-2026-01 | 2026-01 | Personal Auto Policy | — |
| PA-AMD-CA-2026-01 | 2026-01 | Amendment of Policy Provisions — California | — |
| PA-END-2026-04 | 2026-04 | Glass Repair Amendment | 2026-04-01 |

## Premium Summary
| Vehicle | Premium |
| Total | $— |
```

*The Forms and Endorsements table is the manifest the whole precedence graph
reads first. The "Endorsement effective" column is what makes date-of-loss
resolution possible and is missing from many real dec pages — include it
deliberately and note the divergence.*

### Sources

- https://www.allstate.com/resources/allstate/attachments/allstate-protection-quide/allstate-auto-declarations-sample.pdf — Allstate's published sample auto declarations. Primary source for the block-and-table layout, the exact coverage-table columns (Coverage / Limits / Deductible / Premium), the drivers-excluded and VIN/lienholder fields, the discounts and rating-information blocks, the layout form id `IL010NBD` in the footer, the "information as of" date, and the inline non-stacking note inside the UM row.
- https://insurance.maryland.gov/Consumer/Pages/Auto-Understanding-Declarations.aspx — Maryland Insurance Administration consumer guidance; regulator's own definition of the declarations page as identifying kinds and amounts of coverage and cost, and the policy-period field.
- https://www.oid.ok.gov/wp-content/uploads/2025/11/state-farm-9836C.pdf — State Farm 9836C `THIS POLICY` clause: the policy consists of the most recently issued Declarations, the booklet version shown on it, and the endorsements shown on it. The root precedence clause for this whole cluster.
- https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf — the base form's repeated "shown in the Declarations" delegations, establishing that most dec-vs-form differences are delegation rather than conflict.
- https://www.insurancejournal.com/magazines/mag-features/2026/05/04/868017.htm — enforceability of an endorsement missing from the declarations' schedule of forms.
- https://law.justia.com/cases/south-carolina/supreme-court/2014/27435.html — *Williams v. GEICO* (S.C. 2014); a step-down cutting liability below the amount the policy stated was void, even though the policy was found unambiguous. The reason not to encode a clean dec-vs-form direction.
- https://hallboothsmith.com/coverage-blog-step-down-provisions-in-automobile-insurance-policies-issued-in-south-carolina-deemed-unenforceable-in-recent-south-carolina-supreme-court-decision/ — coverage-counsel summary of the same decision and its reach.

---

## Precedence claims (for synthesis)

*Atomic. Each is `X beats Y when Z` plus the source that says so. Generic type
names used throughout: **statute/regulation**, **regulator order**, **state
amendatory endorsement**, **endorsement**, **base policy form**, **declarations
page**. Confidence marked where it is not high.*

- **Statute/regulation beats base policy form** when a policy provision cuts coverage below what the state's motor-vehicle insurance statute requires — the provision is void as against public policy, and this holds even where the policy is found unambiguous. *(high; auto-specific, state supreme court)* — https://law.justia.com/cases/south-carolina/supreme-court/2014/27435.html
- **Statute/regulation beats base policy form prospectively** where the regulator prescribes mandatory policy provisions: an auto liability policy must contain those provisions or ones equally or more favourable to the insured. *(high; auto-specific regulation)* — https://www.law.cornell.edu/regulations/new-york/11-NYCRR-60-1.1
- **Statute/regulation beats base policy form automatically, without litigation, where the policy carries a conformity clause** — a conflicting provision is read as the state's law instead, from the effective date. *(medium — the clause's mechanism is well established but the case I read applying it is property-line, Indiana, not auto)* — https://www.propertyinsurancecoveragelaw.com/blog/policy-conditions-conformity-to-state-law-may-extend-the-period-time-to-file-suit/
- **Statute/regulation beats declarations page** when the declarations shows a limit below the state-mandated minimum — the minimum applies. *(medium; inferred from the two rules above rather than found stated for declarations specifically)* — https://www.law.cornell.edu/regulations/new-york/11-NYCRR-60-1.1
- **Regulator order beats insurer's choice of form/edition** when the order designates standard forms for the line and the policy is written on or after the order's mandatory-use date, in that jurisdiction. *(high)* — https://pxl-sccvirginiagov.terminalfour.net/prod01/channel_3/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/administration-of-insurance-regulation-in-virginia/administrative-orders/AO12113EX.pdf
- **Regulator order does NOT beat a previously issued policy** during a transition grant of permission — both the old and new editions are valid during the overlap window and only the policy's own declarations resolves which applies. *(high; same order, one-year overlap)* — https://pxl-sccvirginiagov.terminalfour.net/prod01/channel_3/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/administration-of-insurance-regulation-in-virginia/administrative-orders/AO12113EX.pdf
- **Endorsement beats base policy form** when the endorsement was issued by the insurer and addresses the same subject — the form's own terms may be changed or waived only by such an endorsement. *(high)* — https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf
- **Base policy form still governs every subject the endorsement did not address** — the override is scoped to the provisions the endorsement names, and endorsements state this themselves in a preservation clause. *(high)* — https://www.maine.gov/pfr/insurance/themes/insurance/pdf/pdf2/usaa_group/usaa_casualty_insurance/A402ME(01)-0215.pdf
- **State amendatory endorsement beats base policy form** when the loss is in that state, on the provisions the amendatory replaces or adds to. *(high)* — https://www1.maine.gov/pfr/insurance/themes/insurance/pdf/pdf2/liberty_mutual_group/peerless_insurance/amendment_of_policy_provisions_pp_01_75_11_12.pdf
- **State amendatory endorsement does not apply at all outside its state** — jurisdiction is a hard gate, not a tiebreak. *(high; from the form's own title and the regulator's per-state mandate)* — https://pxl-sccvirginiagov.terminalfour.net/prod01/channel_3/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/administration-of-insurance-regulation-in-virginia/administrative-orders/AO12113EX.pdf
- **State amendatory endorsement beats an ordinary endorsement** when the amendatory is tracking a statutory mandate and the ordinary endorsement would reduce coverage below it. *(LOW–MEDIUM confidence — this is a consequence of the statute being unwaivable, not a stated document-precedence rule, and it does not hold where the amendatory is making an optional state change)* — https://law.justia.com/cases/south-carolina/supreme-court/2014/27435.html
- **Declarations page determines which base form edition and which endorsements are in the contract at all** — the policy consists of the most recently issued declarations, the booklet version shown on it, and the endorsements shown on it. *(high; this is the root rule)* — https://www.oid.ok.gov/wp-content/uploads/2025/11/state-farm-9836C.pdf
- **Declarations page beats an endorsement that is absent from its schedule of forms** — an endorsement not incorporated by the primary policy form does not govern coverage merely by saying it is part of the policy. *(medium-high; well-sourced case law, but 1st Cir. and other state courts rather than universal)* — https://www.insurancejournal.com/magazines/mag-features/2026/05/04/868017.htm
- **Declarations page supplies, rather than overrides, every value the form delegated to it** — limits and deductibles "shown in the Declarations" are not conflicts. *(high)* — https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf
- **Declarations page vs base policy form on a genuine conflict: UNSETTLED.** One line of authority applies specific-over-general and gives the declarations the win; another reads the documents together, finds ambiguity, and construes against the insurer; and *Williams v. GEICO* shows a third route where the court found **no** ambiguity and still struck the form provision on public-policy grounds. Outcomes tend to favour the insured; the *rule* differs. *(LOW confidence — I found no primary source stating a general dec-beats-form rule, only secondary restatements of specific-over-general. Do not encode a clean direction.)* — https://law.justia.com/cases/south-carolina/supreme-court/2014/27435.html
- **The endorsement in force on the date of loss beats any endorsement added or removed afterwards** — governance is fixed by what the then-current declarations listed, not by the policy's present state. *(high)* — https://www.oid.ok.gov/wp-content/uploads/2025/11/state-farm-9836C.pdf
- **A newer edition of a form does NOT beat the edition named on the policy's declarations** for a loss inside that policy period. *(high)* — https://www.oid.ok.gov/wp-content/uploads/2025/11/state-farm-9836C.pdf
- **A coverage-broadening change beats the printed form without any endorsement** when the insurer implements it in that state without additional premium, from the implementation date — the liberalization rule. *(high)* — https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf
- **The liberalization rule does NOT apply when the broadening arrives inside a general program revision containing both broadenings and restrictions**, whether delivered as a subsequent edition or as an amendatory endorsement — in that case only a properly attached new edition or endorsement changes the policy. *(high; stated expressly in the form)* — https://www.scc.virginia.gov/media/sccvirginiagov-home/regulated-industries/insurance/insurance-companies/property-casualty-companies/personal-commercial-auto-forms/pp-00-01-09-18.pdf
- **Two endorsements modifying the same provision do NOT resolve by "latest wins"** — inconsistent modifications can render the policy ambiguous and negate the restriction entirely. *(medium; and it directly contradicts the widely repeated folk rule below — flagging both deliberately)* — https://www.dandodiary.com/2021/06/articles/d-o-insurance/multiple-endorsements-modifying-same-exclusion-render-policy-ambiguous-negating-exclusions-applicability/
- **Folk rule, asserted in trade literature and contradicted above: the most recently issued endorsement beats an earlier conflicting one.** *(LOWEST confidence in this file — it is trade/broker-guide lore restated across many secondary pages, I found no primary source stating it, it is jurisdiction-dependent, and it is in direct tension with the ambiguity outcome above. Recorded so the synthesis sees the conflict rather than inheriting it silently; do not encode without a case citation.)* — secondary only, e.g. https://www.irmi.com/categories/analyzing-standard-cgl-endorsements and https://www.docutrax.com/resources/guides/insurance-endorsements
- **Absence of countersignature does NOT defeat an endorsement or a policy.** Florida's countersignature statute says expressly that the absence of a required countersignature does not affect validity, and resident-agent countersignature statutes were struck down or repealed in all 50 states between 2003 and 2005. *(high — and this contradicts the premise of the existing `cov-004` corpus trap, which should be reviewed in Step 2)* — http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699/0624/Sections/0624.425.html and https://www.insurancejournal.com/news/midwest/2005/11/30/62599.htm
- **A mid-term endorsement no longer requires a separate change endorsement to be effective on current ISO paper** — `PP 03 10` was withdrawn together with the base-form requirement that post-issuance endorsements be attached. *(medium; trade source, not the form itself)* — https://ohioinsuranceagents.com/blog/2019/new-tune-understanding-isos-recent-changes-to-the-pap/
- **Ambiguity is construed against the drafter (the insurer)** — terminal tie-breaker when the document ordering does not resolve the conflict. Not an edge between document types; the synthesis should hold it as a fallback node or it will read as a contradiction of every other rule. *(high)* — https://www.propertyinsurancecoveragelaw.com/blog/ambiguous-insurance-policy-interpretation/
