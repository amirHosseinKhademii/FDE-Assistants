/**
 * BABY STEP 2a — does the domain descriptor survive contact with real rows?
 *
 * No documents exist yet. What exists is the catalogue in `mrd_reg`: 20 SOP
 * revisions, 26 standards, 20 clauses, 8 policies, each with the ids and dates a
 * real document would carry in its banner. So this builds the banner each of
 * those documents WOULD have, hands it to `PHARMA_DOCUMENTS`, and prints what
 * came back.
 *
 * WHY BOTHER BEFORE WRITING THE TEXT. Every mistake in a `DocumentDomain` is
 * cheap here and expensive two steps later. A classifier that returns `sop` for
 * a USP monograph, an id regex that swallows a clause into its parent
 * regulation, a facet that silently comes back null — all of them look like
 * nothing until retrieval returns the wrong document, by which point the
 * embeddings are paid for and the wrong answer has a citation attached.
 *
 * This writes nothing and connects to nothing but `mrd_reg`, read-only.
 */
import { Client } from 'pg';
import type { DocumentFields } from '@fde/grounding';
import { urlFor } from '../../config/connections';
import { PHARMA_DOCUMENTS, familyOf } from '../../config/pharma-documents';
import { asOfDay } from '../../tools/utils/dates';

/** The as-of day. One implementation, in `tools/utils/dates.ts`. */
const d = asOfDay;

/** The banner a document would carry, as the parser would hand it over. */
const banner = (pairs: Record<string, string | null>): DocumentFields => {
  const m: DocumentFields = new Map();
  for (const [k, v] of Object.entries(pairs)) if (v) m.set(k.toLowerCase(), v);
  return m;
};

interface Candidate {
  id: string;
  title: string;
  fields: DocumentFields;
  /** What we expect `classify` to say. The probe is worthless without this. */
  expect: string;
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: urlFor('mrd_reg') });
  await client.connect();

  const candidates: Candidate[] = [];

  // ── SOP revisions. The document is the REVISION, not the SOP. ──────────────
  const revs = await client.query(`
    select r.revision_id, r.sop_id, r.revision_no, r.effective_from, r.effective_to,
           r.change_control_ref, r.supersedes_revision_id, s.title, s.category,
           s.owning_department_ref
      from sop_revisions r join sops s on s.sop_id = r.sop_id
     order by r.sop_id, r.revision_no`);
  for (const r of revs.rows) {
    const implementsClauses = await client.query(
      'select clause_id from sop_clause_links where revision_id = $1 order by 1',
      [r.revision_id],
    );
    candidates.push({
      id: r.revision_id,
      title: r.title,
      expect: 'sop',
      fields: banner({
        'Revision Id': r.revision_id,
        'SOP Id': r.sop_id,
        Revision: String(r.revision_no),
        // `effective_to` of null means still in force. The banner simply omits
        // the key, which is what a real document would do.
        Effective: d(r.effective_from),
        Expires: d(r.effective_to),
        Status: r.effective_to ? 'superseded' : 'current',
        Owner: r.owning_department_ref,
        Category: r.category,
        Implements: implementsClauses.rows.map((c) => c.clause_id).join(', '),
        Supersedes: r.supersedes_revision_id,
        'Change Control': r.change_control_ref,
      }),
    });
  }

  // ── Standards, and their clauses, which must classify the same way. ────────
  const stds = await client.query('select * from standards order by standard_id');
  for (const s of stds.rows) {
    candidates.push({
      id: s.standard_id,
      title: s.title,
      expect: s.body === 'USP' ? 'monograph'
        : s.body === 'ICH' ? 'guideline'
        : s.body === 'FDA' ? 'regulation'
        : s.standard_id === 'EU-GDP' ? 'guideline' : 'annex',
      fields: banner({
        'Standard Id': s.standard_id,
        Jurisdiction: s.jurisdiction,
        Effective: d(s.in_force_from),
        Status: 'current',
      }),
    });
  }
  const clauses = await client.query(
    'select c.*, s.body, s.jurisdiction from standard_clauses c join standards s on s.standard_id = c.standard_id order by clause_id',
  );
  for (const c of clauses.rows) {
    candidates.push({
      id: c.clause_id,
      title: c.title,
      // A CLAUSE INHERITS ITS PARENT'S TYPE, and the parent's type is not a
      // function of who published it. The first version of this expectation
      // said "EMA ⇒ annex", which made GDP-9.2 an annex — the EU GDP
      // guidelines (2013/C 343/01) are published by EMA and are guidelines,
      // not an annex to GMP Part I. The classifier said `guideline` and the
      // probe said `annex`, and the probe was wrong.
      expect: c.body === 'FDA' ? 'regulation'
        : c.body === 'ICH' ? 'guideline'
        : c.standard_id === 'EU-GDP' ? 'guideline' : 'annex',
      fields: banner({
        'Clause Id': c.clause_id,
        Jurisdiction: c.jurisdiction,
        Effective: '2016-04-15',
        Status: 'current',
      }),
    });
  }

  const policies = await client.query('select * from policies order by policy_id');
  for (const p of policies.rows) {
    candidates.push({
      id: p.policy_id,
      title: p.title,
      expect: 'policy',
      fields: banner({
        'Policy Id': p.policy_id,
        Effective: d(p.effective_from),
        Expires: d(p.effective_to),
        Status: 'current',
        Owner: p.owner_ref,
      }),
    });
  }
  await client.end();

  // ── run the descriptor ────────────────────────────────────────────────────

  console.log('\nBaby step 2a — the pharma DocumentDomain against real catalogue rows\n');

  const wrong: string[] = [];
  const byType = new Map<string, number>();
  let missingDate = 0;
  let missingSopId = 0;

  for (const c of candidates) {
    const docType = PHARMA_DOCUMENTS.classify(c.id, c.title, c.fields);
    const facets = PHARMA_DOCUMENTS.facets(c.fields, { id: c.id, title: c.title });
    byType.set(docType, (byType.get(docType) ?? 0) + 1);
    if (docType !== c.expect) wrong.push(`${c.id}: expected ${c.expect}, got ${docType}`);
    if (!facets.effectiveFrom) missingDate++;
    if (docType === 'sop' && !facets.sopId) missingSopId++;
  }

  console.log(`  ${candidates.length} catalogue rows classified\n`);
  for (const [type, n] of [...byType].sort()) {
    console.log(`    ${type.padEnd(16)} ${String(n).padStart(3)}   family: ${familyOf(type)}`);
  }

  // ── the four that decide whether step 2f can work ─────────────────────────

  const show = (id: string): void => {
    const c = candidates.find((x) => x.id === id);
    if (!c) { console.log(`\n  (no candidate ${id})`); return; }
    const f = PHARMA_DOCUMENTS.facets(c.fields, { id: c.id, title: c.title });
    console.log(`\n  ${id}`);
    console.log(`    type          ${PHARMA_DOCUMENTS.classify(c.id, c.title, c.fields)}`);
    console.log(`    sopId         ${f.sopId}        revisionNo ${f.revisionNo}`);
    console.log(`    in force      ${f.effectiveFrom} → ${f.effectiveTo ?? 'current'}`);
    console.log(`    implements    ${(f.standardRefs as string[]).join(', ') || '—'}`);
    console.log(`    changeControl ${f.changeControl ?? '—'}`);
  };

  console.log('\n  ── the pair the acceptance case turns on ──');
  show('SOP-QC-014 Rev 6');
  show('SOP-QC-014 Rev 7');

  // The assertions. A probe that only prints is a probe nobody reads twice.
  const rev6 = candidates.find((c) => c.id === 'SOP-QC-014 Rev 6');
  const rev7 = candidates.find((c) => c.id === 'SOP-QC-014 Rev 7');
  const f6 = rev6 && PHARMA_DOCUMENTS.facets(rev6.fields, { id: rev6.id, title: rev6.title });
  const f7 = rev7 && PHARMA_DOCUMENTS.facets(rev7.fields, { id: rev7.id, title: rev7.title });

  const checks: [boolean, string, string][] = [
    [wrong.length === 0, 'every row classified as expected',
      wrong.length ? wrong.slice(0, 5).join('; ') : `${candidates.length} rows, ${byType.size} types`],
    [missingDate === 0, 'every document can be placed in time',
      missingDate ? `${missingDate} without effectiveFrom` : 'effectiveFrom present on all'],
    [missingSopId === 0, 'every SOP revision knows its parent procedure',
      missingSopId ? `${missingSopId} without sopId` : 'sopId derived on all'],
    [f6?.sopId === f7?.sopId && rev6?.id !== rev7?.id,
      'Rev 6 and Rev 7 are TWO documents sharing ONE parent',
      `both sopId=${f6?.sopId}, distinct ids — keying on the SOP would merge them`],
    [f6?.effectiveTo === '2026-02-28' && f7?.effectiveTo === null,
      'the range has both ends, and null means still in force',
      `Rev 6 ${f6?.effectiveFrom}→${f6?.effectiveTo}, Rev 7 ${f7?.effectiveFrom}→${f7?.effectiveTo}`],
    [!PHARMA_DOCUMENTS.retiredStatuses.includes('superseded'),
      'CONTROL — a superseded revision is NOT excluded from search',
      'retiredStatuses = ' + PHARMA_DOCUMENTS.retiredStatuses.join(', ') +
      ' — Rev 6 stays reachable, which is what makes "as of 2024" answerable'],
  ];

  console.log('');
  let failed = 0;
  for (const [pass, label, detail] of checks) {
    if (!pass) failed++;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}    ${label}\n          ${detail}`);
  }

  console.log(`\n2a: ${failed === 0 ? 'PASS' : 'FAIL'} — ${checks.length - failed} ok, ${failed} failing\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
