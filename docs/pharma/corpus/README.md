# The Meridian Pharma corpus — FABRICATED

**None of this is real.** Meridian Pharma does not exist. No batch described
here was ever made, no person named here exists, no procedure here was ever
followed by anyone. Every document in this folder was written to be a plausible
example of its kind and nothing more.

This warning is here because the corpus is deliberately convincing. The
documents carry real regulatory citations — 21 CFR 211, EU GMP Annex 16, ICH
Q9 — which are genuine and quoted accurately, attached to procedures and batch
records that are entirely invented. That combination is exactly what makes the
corpus useful for testing retrieval and exactly what makes it dangerous if it
escapes this repo without the label.

**Do not use any document here as guidance for an actual manufacturing
operation.** The procedures are simplified, incomplete, and in places shaped to
plant a specific failure for an eval case to find.

The same applies to the 4,665 rows in the six `mrd_*` databases: fabricated,
internally consistent, and about a company that is not there.

## Why fabricate rather than use real documents

Real SOPs are confidential, and the public ones are not a coherent quality
system — they come from different companies, different decades and different
regimes, and nothing cross-references anything. What this repo needs is a small
corpus where *precedence is real*: where one revision genuinely supersedes
another on a known date, where a procedure genuinely implements a named clause,
and where the answer to a question is therefore checkable.

That is the same standing as the eighteen policyholder records in the insurance
build: a stand-in for a system we do not have, written so the seams around it
can be exercised honestly.

## What is here

| document | in force | why it exists |
|---|---|---|
| `sop-qc-014-rev-6.md` | 2023-07-01 → 2026-02-28 | the superseded revision. **No training precondition.** |
| `sop-qc-014-rev-7.md` | 2026-03-01 → current | adds §7.3, the precondition the acceptance case turns on |
| `sop-scm-004-rev-5.md` | 2023-04-01 → current | the rule N2 cites: what must happen when a supplier is disqualified |

**The first two are a pair, on purpose.** They are what
[`release-001`](../cases/release-001.md) depends on, and if retrieval cannot keep
them apart then nothing built on top of it will work — which is much cheaper to
discover at two documents than at eighty.

**The third was added 2026-09-12 because N2 could not be honest without it.**
`SOP-SCM-004 Rev 5` existed in `mrd_reg` as a metadata row and nowhere else, so
the supplier-impact answer would have had to describe the disqualification rule
from a revision id — the exact failure `search_procedures` was built to fix for
release, repeated one bottleneck later. See [`NEXT.md` §N5](../NEXT.md).

A corpus grows because a question needs it, never to look bigger. Each of these
three is the smallest document that makes a specific answer citable rather than
inferred, and that is the only test a fourth has to pass.

## Why this file is not inside `corpus/`

It was, for about ten minutes. `pnpm pharma:chunks` then reported **3
documents** for a two-document corpus: the loader reads every `.md` file in the
directory, so the warning label became a document, got classified as an `sop`
by the title fallback, and would have been chunked and embedded alongside the
real ones. A corpus directory contains corpus and nothing else.

The banner at the top of each file is metadata, parsed by
`@fde/grounding`'s `fileDocumentSource`. Keys it reads: `Revision Id`, `SOP Id`,
`Revision`, `Status`, `Effective`, `Expires`, `Owner`, `Category`,
`Jurisdiction`, `Implements`, `Supersedes`, `Change Control`.
