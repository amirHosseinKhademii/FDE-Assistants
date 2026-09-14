/**
 * DOMAIN: what an identifier looks like in this estate.
 *
 * `@fde/uikit`'s `Prose` highlights typed references in model prose but has no
 * idea what one looks like — a design system that knows what a batch number is
 * has stopped being a design system. So the grammar lives here, with the rest of
 * the domain, and is passed in.
 *
 * ORDER MATTERS: most specific first. `SOP-QC-014 Rev 7` must match before the
 * generic prefix rule reaches `SOP-QC-014`, or one reference renders as two.
 */
import type { TokenPattern } from '@fde/uikit';

export const REFERENCE_PATTERNS: TokenPattern[] = [
  // A procedure revision, which is one reference and must never be split — the
  // revision number is the load-bearing half in a domain where the rule in force
  // on the day decides the answer.
  { re: /\bSOP-[A-Z0-9-]+\s+Rev\s+\d+/g, kind: 'ref' },

  // The estate's identifier prefixes.
  { re: /\b(?:LOT|MLOT|SHP|EMP|SUP|WO|CAPA|QC|SPEC|TRN|DEPT|PRD)-[A-Z0-9-]+/g, kind: 'ref' },

  // A citation into a system of record: `mrd_hcm.training_records#(EMP-0103, …)`.
  { re: /\bmrd_[a-z]+\.[a-z_]+#\S+/g, kind: 'ref' },

  // Dates are accented rather than merely monospaced, because in this domain the
  // date is frequently the whole answer: the revision that governs an act is the
  // one in force when the act happened.
  { re: /\b\d{4}-\d{2}-\d{2}\b/g, kind: 'date' },

  { re: /§\s?[\d.]+/g, kind: 'clause' },

  // Screaming snake case is a finding code from the assessment, e.g.
  // CERTIFIER_TRAINING_LAPSED. Two segments minimum, so ordinary capitals
  // ("EU", "GMP", "QP") are left alone.
  { re: /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, kind: 'code' },
];
