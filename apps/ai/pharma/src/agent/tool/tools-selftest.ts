/**
 *   pnpm tools:check
 *
 * Calls the tools DIRECTLY — no model, no Azure, no cost. Needs the six
 * databases.
 *
 * WHY THIS EXISTS BEFORE THE LOOP. When a run goes wrong with a model in it,
 * there are three suspects: the tool, the prompt, and the model. This removes
 * the first one from the list permanently. Every failure after this is either
 * the prompt or the model, which is a much shorter argument to have.
 *
 * It also asserts the things a model cannot be trusted to survive: that a bad
 * argument comes back as a readable miss rather than an exception, and that
 * every parameter still carries the description that tells the model what to
 * put in it.
 */
import { z } from 'zod';
import { verifyDescriptions } from '@fde/schema';
import { openStore } from '@fde/grounding';
import { openaiClient } from '@fde/foundry';
import { openEmbeddings } from '../../grounding/embeddings.factory';
import { KB_DB, urlFor } from '../../config/connections';
import { searchProceduresTool, inForceOn, type Passage } from './search-procedures.tool';
import { openHandle } from '../../tools/utils/handle';
import { assessReleaseTool, type AssessReleaseMiss } from './assess-release.tool';
import type { ReleaseDossier } from '../../tools/functions/assess-release';
import { assessSupplierImpactTool } from './assess-supplier-impact.tool';
import type {
  SupplierImpactDossier,
  SupplierImpactMiss,
} from '../../tools/functions/assess-supplier-impact';

type Result = ReleaseDossier | AssessReleaseMiss;
const isMiss = (r: Result): r is AssessReleaseMiss => 'found' in r;

interface Case {
  name: string;
  why: string;
  args: { lot_id: string; market: string };
  check(r: Result): string | null;
}

const CASES: Case[] = [
  {
    name: 'release-001 — the acceptance case',
    why: 'five silos, and the answer lives in the gap between two of them',
    args: { lot_id: 'LOT-IBU200-2609-B', market: 'EU' },
    check: (r) =>
      isMiss(r) ? 'came back as a miss'
      : r.releasable ? 'reported releasable — the certifier had lapsed training'
      : r.findings.some((f) => f.code === 'CERTIFIER_TRAINING_LAPSED') ? null
      : `blockers were ${r.findings.map((f) => f.code).join(', ')}`,
  },
  {
    name: 'the clean control',
    why: 'a tool that only ever finds problems is useless and scores perfectly',
    args: { lot_id: 'LOT-IBU200-2608-A', market: 'EU' },
    check: (r) =>
      isMiss(r) ? 'came back as a miss'
      : r.releasable ? null
      : `found blockers: ${r.findings.filter((f) => f.severity === 'blocker').map((f) => f.code).join(', ')}`,
  },
  {
    name: 'T6 — same lot, other market, other limits',
    why:
      'the destination decides which specification applies; reading the lot\'s own ' +
      'answers a different question that looks identical',
    args: { lot_id: 'LOT-IBU200-2609-D', market: 'EU' },
    check: (r) =>
      isMiss(r) ? 'came back as a miss'
      : r.governingSpecVersion !== 'SPEC-IBU200-v4' ? `judged against ${r.governingSpecVersion}, not the EU specification`
      : r.findings.some((f) => f.code === 'OUT_OF_SPEC_FOR_MARKET') ? null
      : 'the US lot passed EU limits — the tighter EU dissolution limit was not applied',
  },
  {
    name: 'a market that does not exist',
    why:
      'GB is a real regulator and not in this estate; substituting EU for it would ' +
      'be a confident wrong answer',
    args: { lot_id: 'LOT-IBU200-2609-B', market: 'GB' },
    check: (r) =>
      !isMiss(r) ? 'answered a question about a market with no rows'
      : r.note.includes('EU') && r.note.includes('US') ? null
      : 'the miss does not tell the model which markets exist',
  },
  {
    name: 'a lot that does not exist',
    why: 'a model that mistypes an id must learn that, not receive an empty dossier',
    args: { lot_id: 'LOT-NOPE-0000-Z', market: 'EU' },
    check: (r) => (isMiss(r) ? null : 'returned a dossier for a lot that is not there'),
  },
  {
    name: 'lowercase market',
    why: 'the model will send "eu" sooner or later; rejecting it would be pedantry',
    args: { lot_id: 'LOT-IBU200-2609-B', market: 'eu' },
    check: (r) => (isMiss(r) ? 'rejected a valid market for its casing' : null),
  },
];

/**
 * `search_procedures` cases.
 *
 * Separate from the `assess_release` table because the arguments and the result
 * shape are different, not because the discipline is: each case names the
 * failure it exists to catch.
 */
interface SearchCase {
  name: string;
  why: string;
  args: { query: string; sop_id: string | null; as_of: string | null; k: number | null };
  check(r: { results: Passage[]; note?: string }): string | null;
}

const revisions = (r: { results: Passage[] }): string[] =>
  [...new Set(r.results.map((p) => p.revision_id))].sort();

const SEARCH_CASES: SearchCase[] = [
  {
    name: 'finds the clause the whole case turns on',
    why: 'the model currently infers §7.3 from a revision number; this is what lets it quote instead',
    args: { query: 'training required before a QP may certify a batch', sop_id: 'SOP-QC-014', as_of: '2026-09-04', k: 5 },
    // IN THE TOP k, NOT AT RANK 1. This asserted rank 1 first and failed —
    // §7.3 comes back first for "GMP refresher training precondition" and
    // second for this phrasing, behind "3. Responsibilities". Both are correct
    // retrievals; which one edges ahead is the embedding model's tie-breaking
    // on a 31-chunk corpus, and pinning it would make this check fail on a
    // reworded question or an embedding upgrade while nothing was wrong. The
    // model reads all k. What must hold is that the clause is THERE, with its
    // text intact.
    check: (r) => {
      const hit = r.results.find((p) => /7\.3/.test(p.section));
      return !r.results.length ? 'nothing returned'
        : !hit ? `§7.3 not in the top ${r.results.length}: ${r.results.map((p) => p.section.split('>').pop()!.trim()).join(' | ')}`
        // MARKDOWN STRIPPED BEFORE MATCHING. The clause reads "must hold a
        // **valid, unexpired GMP refresher training record**" — the emphasis
        // markers sit INSIDE the sentence, so a regex written from the prose
        // fails on text that is perfectly correct. Asserting on rendered
        // meaning rather than on source punctuation.
        : /must hold a valid, unexpired GMP refresher/i.test(hit.text.replace(/[*_`]/g, '')) ? null
        : 'the §7.3 passage does not contain the precondition text';
    },
  },
  {
    name: 'as-of 2026-09-04 returns Rev 7 only',
    why: 'the revision in force on the day of the act, not the newest and not both',
    args: { query: 'certification requirements', sop_id: 'SOP-QC-014', as_of: '2026-09-04', k: 8 },
    check: (r) => {
      const got = revisions(r);
      return got.length === 1 && got[0] === 'SOP-QC-014 Rev 7' ? null : `returned ${got.join(', ') || 'nothing'}`;
    },
  },
  {
    name: 'as-of 2024-06-01 returns Rev 6 only',
    why:
      'THE point of the domain: the same question, two years earlier, is governed by a ' +
      'revision with no training precondition — and the correct answer flips',
    args: { query: 'certification requirements', sop_id: 'SOP-QC-014', as_of: '2024-06-01', k: 8 },
    check: (r) => {
      const got = revisions(r);
      return got.length === 1 && got[0] === 'SOP-QC-014 Rev 6' ? null : `returned ${got.join(', ') || 'nothing'}`;
    },
  },
  {
    name: 'superseded revisions stay reachable',
    why:
      'the insurance sibling drops superseded documents and is right to; here Rev 6 ' +
      'governed batches still within shelf life, so hiding it makes an inspector\'s ' +
      'question unanswerable',
    args: { query: 'certification requirements', sop_id: 'SOP-QC-014', as_of: null, k: 10 },
    check: (r) =>
      revisions(r).includes('SOP-QC-014 Rev 6') ? null : 'Rev 6 was not reachable without a date filter',
  },
  {
    name: 'every passage is citable',
    why: 'a fragment that cannot say which revision it came from is a rumour, not evidence',
    args: { query: 'batch release', sop_id: null, as_of: null, k: 5 },
    check: (r) => {
      const bad = r.results.filter((p) => !p.ref.startsWith('sop:') || !p.revision_id || !p.section);
      return bad.length ? `${bad.length} passage(s) without a usable ref` : null;
    },
  },
  {
    name: 'an unknown procedure is an informative miss',
    why: 'an empty result must not read as "the procedures permit it"',
    args: { query: 'anything', sop_id: 'SOP-XX-999', as_of: null, k: 5 },
    check: (r) =>
      r.results.length ? 'returned passages for a procedure that does not exist'
      : r.note && /silence in the corpus is not permission/i.test(r.note) ? null
      : 'the miss does not warn that silence is not permission',
  },
];

/** Pure, so it is checked without a database. */
const UNIT: Array<[string, boolean, string]> = [
  ['open-ended revision covers a later day',
   inForceOn({ effectiveFrom: '2026-03-01', effectiveTo: null }, '2026-09-04'), 'null effectiveTo must read as OPEN, not as expired'],
  ['closed revision does not cover a later day',
   !inForceOn({ effectiveFrom: '2023-07-01', effectiveTo: '2026-02-28' }, '2026-09-04'), 'a superseded revision must not govern a later act'],
  ['closed revision covers a day inside its range',
   inForceOn({ effectiveFrom: '2023-07-01', effectiveTo: '2026-02-28' }, '2024-06-01'), 'the range is inclusive at both ends'],
];

/**
 * `assess_supplier_impact` cases.
 *
 * Separate table again, same reasoning as `SEARCH_CASES`: different
 * arguments, different result shape, same discipline.
 */
type SupplierResult = SupplierImpactDossier | SupplierImpactMiss;
const isSupplierMiss = (r: SupplierResult): r is SupplierImpactMiss => 'found' in r;

interface SupplierCase {
  name: string;
  why: string;
  args: { supplier_id: string };
  check(r: SupplierResult): string | null;
}

const SUPPLIER_CASES: SupplierCase[] = [
  {
    name: 'SUP-04 — the Silverbrook disqualification',
    why: 'the acceptance case: disqualified after use, and at least one lot must have left our control',
    args: { supplier_id: 'SUP-04' },
    check: (r) =>
      isSupplierMiss(r) ? 'came back as a miss'
      : !r.supplier.disqualifiedOn ? 'the supplier does not show as disqualified'
      : r.affected.length === 0 ? 'no affected lots — the fan-out found nothing'
      : r.affected.some((a) => a.exposure !== 'in_our_control' && a.exposure !== 'expired') ? null
      : 'every affected lot is still in our control — the second hop (did anything ship) found nothing',
  },
  {
    name: 'the preventable finding is present',
    why:
      'material that arrived AFTER the disqualification and is still flagged usable is the ' +
      'one thing here that can still be prevented rather than remediated — losing it silently ' +
      'is the failure this case exists to catch',
    args: { supplier_id: 'SUP-04' },
    check: (r) =>
      isSupplierMiss(r) ? 'came back as a miss'
      : r.materials.notQuarantined.length > 0 ? null
      : 'no unquarantined material reported — the preventable finding this bottleneck was built for is missing',
  },
  {
    name: 'the clean control — a supplier never disqualified',
    why: 'a tool that only ever finds problems is useless and scores perfectly',
    args: { supplier_id: 'SUP-01' },
    check: (r) =>
      isSupplierMiss(r) ? 'came back as a miss'
      : r.supplier.disqualifiedOn !== null ? 'a never-disqualified supplier shows a disqualification date'
      : r.materials.notQuarantined.length > 0 ? 'reported unquarantined material for a supplier never disqualified'
      : null,
  },
  {
    name: 'a supplier that does not exist',
    why: 'a model that mistypes an id must learn that, not receive an empty dossier',
    args: { supplier_id: 'SUP-99' },
    check: (r) => (isSupplierMiss(r) ? null : 'returned a dossier for a supplier that is not there'),
  },
];

async function main(): Promise<void> {
  const h = openHandle();
  const tool = assessReleaseTool(h);
  let failed = 0;

  for (const c of CASES) {
    let problem: string | null;
    try {
      problem = c.check(await tool.execute(c.args));
    } catch (e) {
      // A throw is the one outcome no case allows: the model cannot read an
      // exception, and the loop reports it as infrastructure rather than input.
      problem = `threw: ${e instanceof Error ? e.message : String(e)}`;
    }
    if (problem) failed++;
    console.log(`  ${problem ? 'FAIL' : 'ok  '}  ${c.name}`);
    console.log(`        why: ${c.why}`);
    if (problem) console.log(`        \x1b[31m${problem}\x1b[0m`);
  }

  // ── search_procedures ─────────────────────────────────────────────────────
  const store = await openStore(openEmbeddings(openaiClient()), {
    connectionString: urlFor(KB_DB),
    tableName: 'document_chunks',
  });
  const search = searchProceduresTool(store);

  for (const [name, ok, why] of UNIT) {
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    console.log(`        why: ${why}`);
  }

  for (const c of SEARCH_CASES) {
    let problem: string | null;
    try {
      problem = c.check((await search.execute(c.args)) as any);
    } catch (e) {
      problem = `threw: ${e instanceof Error ? e.message : String(e)}`;
    }
    if (problem) failed++;
    console.log(`  ${problem ? 'FAIL' : 'ok  '}  ${c.name}`);
    console.log(`        why: ${c.why}`);
    if (problem) console.log(`        \x1b[31m${problem}\x1b[0m`);
  }
  await store.end();

  // ── assess_supplier_impact ────────────────────────────────────────────────
  const supplierTool = assessSupplierImpactTool(h);

  for (const c of SUPPLIER_CASES) {
    let problem: string | null;
    try {
      problem = c.check(await supplierTool.execute(c.args));
    } catch (e) {
      problem = `threw: ${e instanceof Error ? e.message : String(e)}`;
    }
    if (problem) failed++;
    console.log(`  ${problem ? 'FAIL' : 'ok  '}  ${c.name}`);
    console.log(`        why: ${c.why}`);
    if (problem) console.log(`        \x1b[31m${problem}\x1b[0m`);
  }

  // The descriptions are the only thing telling the model what to put in each
  // argument. Losing one is silent and looks like a model problem.
  //
  // THIS USED TO BE A LOCAL `Object.entries(...).filter(v => !v.description)`.
  // It was weaker than it looked in two ways `@fde/schema`'s version is not: it
  // walked only the TOP level, so a description lost inside a nested object
  // passed; and it had no control, so it would have reported "ok" just as
  // cheerfully if the walk had been looking at the wrong object entirely.
  // `verifyDescriptions` blanks one description itself and requires a complaint
  // about that exact field — the same both-directions rule the eval checks obey.
  for (const [name, params] of [
    ['assess_release', tool.schema.parameters],
    ['search_procedures', search.schema.parameters],
    ['assess_supplier_impact', supplierTool.schema.parameters],
  ] as const) {
    const described = verifyDescriptions(z.toJSONSchema(params, { io: 'output' }));
    if (!described.passed) failed++;
    // Label the block rather than rewriting the package's own wording. An
    // earlier draft did `l.replace('every field', ...)`, which would no-op
    // silently if `@fde/schema` reworded its output and leave two identical
    // blocks with no way to tell which tool failed — depending on another
    // package's prose is the same shape as the stale-local-copy bug that
    // `prompt:check` exists to catch.
    console.log(`\n  ${name}:`);
    for (const l of described.lines) console.log(l.replace(/^\n/, ''));
  }

  const total = CASES.length + UNIT.length + SEARCH_CASES.length + SUPPLIER_CASES.length + 3;
  console.log(`\n  tools: ${failed ? `${failed} FAILING` : `PASS — ${total} checks`}\n`);
  await h.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
