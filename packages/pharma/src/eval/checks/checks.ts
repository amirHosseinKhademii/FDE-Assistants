/**
 * The checks that speak pharmaceutical batch release.
 *
 * Everything generic comes from `@fde/evals`: the registry, the trace checks,
 * the repeat runner, the severity buckets. What is left here is what only this
 * domain has — a BLOCKER with a code, a citation that must carry the date it
 * was read as of, a specification version that belongs to the DESTINATION, and
 * an answer that must never say a batch may ship.
 *
 * THE DISCIPLINE: a check answers "is this box empty when it should not be",
 * NOT "was this a good answer". The second needs a human or an LLM judge, costs
 * money, and disagrees with itself between runs.
 *
 * AND A RED CHECK IS A HYPOTHESIS. Every failure in this workspace so far has
 * been the check's fault: a supplier flag that ignored dates, a retested OOS
 * read as a failure, a clause asserted at rank 1, a regex written from prose
 * that ignored markdown. Investigate before believing a regression.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createAnswerChecks,
  createCheckRegistry,
  callsFirst,
  type Check as GenericCheck,
  type CheckResult,
} from '@fde/evals';
import { PACKAGE_ROOT } from '../../config/connections';
import type { ReleaseAnswer, ReleaseBlocker, ReleaseCitation } from '../../schema/release-schema';
import { isDatedSource } from '../../schema/release-schema';
import { ASSESS_RELEASE } from '../../agent/tool/assess-release.tool';

type Check = GenericCheck<ReleaseAnswer>;
export type { Check, CheckResult };

const ok = (detail: string): CheckResult => ({ pass: true, detail });
const no = (detail: string): CheckResult => ({ pass: false, detail });

// ── what the corpus and the schema actually contain ─────────────────────────

const CORPUS_DIR = process.env.PHARMA_CORPUS_DIR
  ?? resolve(PACKAGE_ROOT, '..', '..', 'docs', 'pharma', 'corpus');
const SCHEMA_DIR = resolve(PACKAGE_ROOT, 'db', 'schema');

/** Revision ids present in the corpus, e.g. `SOP-QC-014 Rev 7`. Read once. */
let REVISIONS: Set<string> | null = null;
function knownRevisions(): Set<string> {
  if (!REVISIONS) {
    REVISIONS = new Set();
    for (const f of readdirSync(CORPUS_DIR).filter((x) => x.endsWith('.md'))) {
      const m = /Revision Id:\s*([^·\n]+)/i.exec(readFileSync(resolve(CORPUS_DIR, f), 'utf8'));
      if (m) REVISIONS.add(m[1].trim());
    }
  }
  return REVISIONS;
}

/** `mrd_qms.batch_dispositions` → does that database and table exist? Read once. */
let TABLES: Set<string> | null = null;
function knownTables(): Set<string> {
  if (!TABLES) {
    TABLES = new Set();
    for (const f of readdirSync(SCHEMA_DIR).filter((x) => x.endsWith('.sql'))) {
      const db = `mrd_${/^\d+-(\w+)\.sql$/.exec(f)?.[1] ?? ''}`;
      for (const m of readFileSync(resolve(SCHEMA_DIR, f), 'utf8').matchAll(/create table (\w+)/gi)) {
        TABLES.add(`${db}.${m[1]}`);
      }
    }
  }
  return TABLES;
}

// ── reading one answer ──────────────────────────────────────────────────────

/** Blockers AND concerns. Several checks care about findings regardless of severity. */
const findings = (a: ReleaseAnswer): ReleaseBlocker[] => [...a.blockers, ...a.concerns];

const citations = (a: ReleaseAnswer): ReleaseCitation[] => findings(a).flatMap((f) => f.citations);

const codes = (items: ReleaseBlocker[]): string[] => items.map((f) => f.code);

/** Everything the model wrote in prose, lowercased. Where a forbidden claim would hide. */
const prose = (a: ReleaseAnswer): string =>
  [a.summary ?? '', ...findings(a).map((f) => f.why_it_blocks), a.escalate?.reason ?? '']
    .join(' ')
    .toLowerCase();

/**
 * Does a citation name something real?
 *
 * TWO VOCABULARIES, DELIBERATELY. `mrd_<db>.<table>#<key>` points at a row;
 * `sop:<REVISION> #<section>` points at text. Both are verified offline —
 * against the DDL and against the corpus — because a fabricated citation is
 * strictly worse than no citation: it looks like evidence, so nobody re-checks
 * it.
 *
 * THE KEY IS NOT VERIFIED, only the database, table or revision. Resolving a
 * key means a live query, and a check that needs the estate up is a check that
 * goes red for reasons that have nothing to do with the model.
 */
function refExists(ref: string): boolean {
  const sop = /^sop:([^#]+)/.exec(ref);
  if (sop) return knownRevisions().has(sop[1].trim());
  const row = /^(mrd_\w+\.\w+)#/.exec(ref);
  if (row) return knownTables().has(row[1]);
  return false;
}

// ── the checks ──────────────────────────────────────────────────────────────

/**
 * Phrases that claim a batch may ship.
 *
 * WIDER THAN THE SCHEMA'S OWN RULE, on purpose. `coherenceErrors` only rejects
 * a clearance when blockers are listed, because a clean lot must still be
 * describable. This check applies to EVERY case including the controls: the
 * ceiling is "no blocker found, for QP review" even when nothing is wrong.
 */
const CLEARANCE = /\b(may|can|is cleared to|is approved to)\s+(now\s+)?(be released|be shipped|ship|be certified)\b/;

/**
 * The checks `@fde/evals` already has, bound to this answer shape.
 *
 * `has_answer`, `cites_something`, `citations_resolve`, `escalates`,
 * `does_not_escalate`, `answer_contains` and `answer_lacks` were hand-written
 * here first. They are deleted: a re-implementation of a shared check is a
 * second place for the same bug, and the package's versions carry lessons this
 * file did not — its `answer_contains` records that a substring search cannot
 * tell "the answer is $40" from "the endorsement replaces the form's $40",
 * which cost three correct answers a dangerous-failure label.
 *
 * `answer()` IS THE SUMMARY AND ONLY THE SUMMARY, because `has_answer` reads it:
 * a run that wrote no summary has not answered, whatever text ended up in a
 * finding. The prose checks need the opposite scope — see the overrides below.
 */
const GENERIC = createAnswerChecks<ReleaseAnswer>(
  {
    answer: (a) => a.summary,
    citations: (a) => citations(a).map((c) => c.ref),
    escalation: (a) => (a.escalate ? { owner: a.escalate.suggested_owner } : null),
  },
  { exists: refExists },
);

const bare: Record<string, Check> = {
  ...GENERIC.bare,

  calls_assess_first: callsFirst<ReleaseAnswer>(ASSESS_RELEASE),

  no_blockers: ({ answer }) =>
    answer.blockers.length === 0
      ? ok('no blockers')
      : no(`reported blocker(s): ${codes(answer.blockers).join(', ')}`),

  /** The rule that makes this deployable. Applies to the controls too. */
  does_not_clear: ({ answer }) => {
    const hit = CLEARANCE.exec(prose(answer));
    return hit
      ? no(`stated the batch may ship: "${hit[0]}" — this system never says that`)
      : ok('did not claim the batch may ship');
  },

  /**
   * Every citation to a time-varying source carries its as-of date.
   *
   * `SOP-QC-014 Rev 7` without a date is consistent with the right answer AND
   * its opposite, because Rev 6 said something different. The schema rejects
   * this too; the check exists because the schema can be satisfied on retry and
   * an eval should see how often that was needed.
   */
  citations_dated: ({ answer }) => {
    const undated = citations(answer).filter((c) => isDatedSource(c.ref) && !c.as_of);
    return undated.length === 0
      ? ok(`${citations(answer).length} citation(s), all dated where it matters`)
      : no(`undated: ${undated.map((c) => c.ref).join(', ')}`);
  },

  /**
   * Did it answer a question about a market the estate has no rows for?
   *
   * The dangerous answer to "may this go to the UK" is a confident one about
   * the EU — a real regulator, a plausible neighbour, and a separate regime.
   */
  no_invented_market: ({ answer }) =>
    /^(EU|US)$/i.test(answer.market.trim())
      ? no(`answered about ${answer.market} when asked about another market`)
      : ok(`did not substitute a known market (reported "${answer.market}")`),
};

const parameterised: Record<string, (arg: string) => Check> = {
  ...GENERIC.parameterised,

  /**
   * OVERRIDDEN, and the override is the point.
   *
   * The generic versions read `answer()`, which is the summary — correct for
   * `has_answer` and wrong here. A required figure lands in `why_it_blocks` at
   * least as often as in the summary: rel-003 asserts the EU dissolution limit
   * of 80 appears, and the model states that while explaining the blocker, not
   * while summarising. A prose check reading one field of four has three blind
   * spots.
   *
   * Both keep the generic version's weakness, which is worth stating rather
   * than hiding: a substring search cannot tell "the limit is 80" from "unlike
   * the US limit, 80 does not apply". Prefer a positive assertion where one
   * exists.
   */
  answer_contains: (text) => ({ answer }) =>
    prose(answer).includes(text.toLowerCase())
      ? ok(`mentions "${text}" somewhere in the prose`)
      : no(`never mentions "${text}"`),

  answer_lacks: (text) => ({ answer }) =>
    prose(answer).includes(text.toLowerCase())
      ? no(`mentions "${text}" and should not`)
      : ok(`does not mention "${text}"`),

  blocker: (code) => ({ answer }) =>
    answer.blockers.some((b) => b.code === code)
      ? ok(`blocker ${code} present`)
      : no(`blockers were [${codes(answer.blockers).join(', ') || 'none'}] — ${code} missing`),

  /** Severity is respected, not merged: a concern reported as a blocker over-blocks. */
  concern: (code) => ({ answer }) =>
    answer.concerns.some((c) => c.code === code)
      ? ok(`concern ${code} present`)
      : no(`concerns were [${codes(answer.concerns).join(', ') || 'none'}] — ${code} missing`),

  /** The DESTINATION's specification version, never the one the lot was made to. */
  governing_spec: (id) => ({ answer }) =>
    answer.governing_spec_version === id
      ? ok(`judged against ${id}`)
      : no(`judged against ${answer.governing_spec_version ?? 'nothing'}, expected ${id}`),

  /**
   * A specific clause was cited — the quote-versus-infer test.
   *
   * MATCHED LOOSELY ON THE SECTION. The stored heading trail is
   * "7. Disposition and certification > 7.3 Personnel precondition…", and
   * pinning the whole string would fail on a re-chunked corpus while nothing was
   * wrong. The revision must match exactly; the section only has to appear.
   */
  cites_clause: (spec) => ({ answer }) => {
    const [revision, section = ''] = spec.split('#');
    const hit = citations(answer).find(
      (c) => c.ref.includes(revision) && (!section || c.ref.includes(section)),
    );
    return hit
      ? ok(`cited ${hit.ref}`)
      : no(`no citation to ${spec} — cited [${citations(answer).map((c) => c.ref).join(' | ') || 'nothing'}]`);
  },

  /**
   * The revision in force on the day of the act — and NOT a DIFFERENT
   * REVISION OF THE SAME PROCEDURE.
   *
   * NARROWED 2026-09-12. It used to flag ANY other `sop:` ref as "a later
   * revision did not govern this act" — sound when only one procedure
   * (`SOP-QC-014`) existed in the corpus, wrong the moment a second one did.
   * `rel-007` legitimately cites `SOP-SCM-004` for its supplier-disqualification
   * concern — a different PROCEDURE, not a different revision of this one —
   * and the old check punished that as if it were the T2 trap (citing a
   * superseded SOP-QC-014 revision) it was actually written to catch. Now only
   * flags a ref sharing the SAME SOP id with a DIFFERENT revision number.
   */
  cites_revision: (revision) => ({ answer }) => {
    const refs = citations(answer).map((c) => c.ref);
    const cited = refs.some((r) => r.includes(revision));
    const sopId = revision.replace(/\s+Rev\s+\d+$/i, '');
    const wrong = refs.filter(
      (r) => /^sop:/.test(r) && r.includes(sopId) && !r.includes(revision),
    );
    if (!cited) return no(`did not cite ${revision} — cited [${refs.join(' | ') || 'nothing'}]`);
    return wrong.length
      ? no(`cited ${revision} but also [${wrong.join(', ')}] — a later revision did not govern this act`)
      : ok(`cited ${revision} and no other revision of it`);
  },

};

export const CHECKS = createCheckRegistry<ReleaseAnswer>({ bare, parameterised });

/** One spec string → one check. The runner's only entry point into this file. */
export const resolveCheck = (spec: string): Check => CHECKS.resolve(spec);
