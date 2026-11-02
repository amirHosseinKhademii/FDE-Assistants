/**
 * The checks that speak this application.
 *
 * The generic ones come from @fde/evals: has an answer, cites something, cites only
 * real things, escalates, reports conflicts, and mentions or avoids given words. This
 * file adds the one piece that only this corpus has: what a citation is allowed to
 * point at.
 *
 * A citation resolves when its file is a document in the corpus, and when a § number
 * is given, that section heads a passage in that file. Reading the corpus directly
 * keeps this check free and offline.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCorpusIndex } from '@fde/grounding';
import {
  createAnswerChecks,
  createCheckRegistry,
  type Check as GenericCheck,
  type CheckContext as GenericContext,
  type CheckResult,
} from '@fde/evals';
import { DOMAIN } from '../config/domain';
import { sectionNumbersIn } from '../config/brf-documents';
import type { BrfAnswer } from '../schema/answer-schema';

/** Bound once, so every check below reads this application's answer. */
type Check = GenericCheck<BrfAnswer>;
export type { CheckResult, Check };
export type CheckContext = GenericContext<BrfAnswer>;

const CORPUS = createCorpusIndex(DOMAIN.corpusDir);

/** The § numbers that head a section in each file. Read once per file. */
const SECTIONS = new Map<string, Set<string>>();

function sectionsOf(file: string): Set<string> {
  let found = SECTIONS.get(file);
  if (!found) {
    found = sectionNumbersIn(readFileSync(resolve(DOMAIN.corpusDir, file), 'utf8'));
    SECTIONS.set(file, found);
  }
  return found;
}

/** "stadgar.md § 9" splits into the file and the section number. */
const CITED = /^(.*?)\s*§\s*(\d+[a-z]?)\s*$/;

/**
 * Does a citation name something real?
 *
 * Lenient about formatting and strict about identity. Spacing, case and a missing
 * ".md" are forgiven. The file must be a document in the corpus, and a section number
 * must head a passage in that file. A section that does not exist is a fabricated
 * citation, and it looks like evidence, so it fails here.
 */
export function citationResolves(source: string): boolean {
  const m = CITED.exec(source.trim());
  const fileText = m ? m[1] : source;
  const doc = CORPUS.resolve(fileText);
  if (!doc) return false;
  if (!m) return true;
  return sectionsOf(doc.file).has(m[2]);
}

/**
 * The citation strings the generic checks read. A section given as a § label becomes
 * "file § N". Any other section (the document title, for example) is checked by file
 * alone, because only a § number has a section to find.
 */
const sources = (a: BrfAnswer): string[] =>
  a.citations.map((c) => (/^§\s*\d/.test(c.section.trim()) ? `${c.file} ${c.section.trim()}` : c.file));

const generic = createAnswerChecks<BrfAnswer>(
  {
    answer: (a) => a.answer,
    citations: sources,
    conflicts: (a) => a.conflicts.map((c) => ({ topic: c.topic, resolvedBy: c.resolved_by })),
    escalation: (a) => (a.escalate ? { owner: a.escalate.suggested_owner } : null),
  },
  { exists: citationResolves },
);

const REGISTRY = createCheckRegistry<BrfAnswer>({
  bare: { ...generic.bare },
  parameterised: { ...generic.parameterised },
});

/**
 * Every check name. Exported so scorecard-selftest.ts can assert that each one maps to
 * a severity bucket. A check added without a bucket is the failure that once put a
 * wrong figure into "uncategorised" while the card said "false answers: 1".
 */
export const CHECK_NAMES: string[] = REGISTRY.names();

export const resolveCheck = (spec: string): Check => REGISTRY.resolve(spec);
