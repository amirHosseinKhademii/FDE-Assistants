/**
 * GROUNDING STEP 2 — did the loader read what I actually wrote?
 *
 * WHY THIS IS ITS OWN CHECK. `commerce:chunks` exercises the loader and the
 * chunker but reports only counts, and counts are happy to be right about a
 * corpus whose metadata is entirely null. Between them, nothing yet confirms
 * that the hand-typed banner keys parse.
 *
 * AND A MISSPELLED KEY DOES NOT FAIL. It silently yields `null`, and the first
 * symptom is an as-of filter matching nothing — discovered after the embeddings
 * have been paid for. `Effective:` versus `Effective From:`, `Audience:` versus
 * `Audiance:`: every one of these is a string typed by hand in a markdown file
 * twelve times.
 *
 * Offline. Reads twelve files, writes nothing, connects to nothing.
 *
 *   pnpm commerce:source-probe
 */
import { fileDocumentSource, type SourceDocument } from '@fde/grounding';
import { resolve } from 'node:path';
import { COMMERCE_DOCUMENTS } from '../config/commerce-documents';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const CORPUS_DIR =
  process.env.COMMERCE_CORPUS_DIR ?? resolve(REPO_ROOT, 'docs', 'commerce', 'corpus');

type Facets = Record<string, unknown>;
const facetsOf = (d: SourceDocument): Facets => d.facets as Facets;

// ── reporting ───────────────────────────────────────────────────────────────

function printDocument(d: SourceDocument): void {
  const f = facetsOf(d);
  console.log(`  ${d.documentId}`);
  console.log(`    type / status      ${d.docType} / ${d.status}`);
  console.log(`    revisionId         ${f.revisionId}`);
  console.log(`    docId / revision    ${f.docId} / ${f.revisionNo}`);
  console.log(`    in force           ${f.effectiveFrom} → ${f.effectiveTo ?? 'null (in force)'}`);
  console.log(`    audience           ${f.audience}`);
  console.log(`    owner / category   ${f.owningDepartment} / ${f.category}`);
  console.log(`    carrier            ${f.carrier ?? 'null (not a carrier contract)'}`);
  console.log(`    relations          ${d.relations.map((r) => `${r.verb} ${r.toId}`).join('; ') || '—'}`);
  console.log('');
}

// ── the checks ──────────────────────────────────────────────────────────────

type Check = [pass: boolean, label: string, detail: string];

/** The corpus is the corpus — the count that catches a meta-document leaking in. */
function countChecks(docs: SourceDocument[]): Check[] {
  return [
    [
      docs.length === 12,
      'the corpus is exactly the corpus',
      `${docs.length} document(s). CORPUS.md lives OUTSIDE this folder because the ` +
        'loader reads every .md in it — pharma went 75→80 chunks that way',
    ],
  ];
}

/** Every banner key parsed. A null here is a typo, not a fact about the corpus. */
function bannerChecks(docs: SourceDocument[]): Check[] {
  const nullDate = docs.filter((d) => facetsOf(d).effectiveFrom === null);
  const nullId = docs.filter((d) => facetsOf(d).revisionId === null);
  const unknownType = docs.filter((d) => d.docType === 'guidance' && !/^note-/.test(d.documentId));
  return [
    [
      nullDate.length === 0,
      'every document has a parsed effective date',
      nullDate.length ? `NULL in: ${nullDate.map((d) => d.documentId).join(', ')}` :
        'requiredFacets names effectiveFrom, and a null one cannot be placed in time',
    ],
    [
      nullId.length === 0,
      'every document carries its own revision id',
      nullId.length ? `NULL in: ${nullId.map((d) => d.documentId).join(', ')}` :
        'parsed from the banner, so a chunk can be matched back without guessing at a filename',
    ],
    [
      unknownType.length === 0,
      'classify() recognised every id shape',
      unknownType.length ? `fell through to 'guidance': ${unknownType.map((d) => d.documentId).join(', ')}` :
        "only note-elec-2022 is 'guidance', and it is one by declaration",
    ],
  ];
}

/** The T2 trap, as metadata. If these four lines are wrong, T2 is not testable. */
function conflictChecks(docs: SourceDocument[]): Check[] {
  const pub = docs.find((d) => d.documentId.startsWith('pol-ret-001-rev-3'));
  const bul = docs.find((d) => d.documentId.startsWith('bul-ret-2025-03'));
  const old = docs.find((d) => d.documentId.startsWith('pol-ret-001-rev-2'));
  const fp = pub && facetsOf(pub), fb = bul && facetsOf(bul), fo = old && facetsOf(old);
  return [
    [
      fp?.audience === 'public' && fb?.audience === 'internal',
      'T2 — the two contradicting documents differ by AUDIENCE',
      `published policy=${fp?.audience}, bulletin=${fb?.audience}. This is the facet the ` +
        'domain exists for: one is a promise the customer read, the other they never saw',
    ],
    [
      pub?.status === 'current' && bul?.status === 'current',
      'T2 — BOTH are current, and they disagree',
      'the bulletin AMENDS rather than supersedes, so the policy stays in force. ' +
        'Flattening amends→supersedes would tidy the contradiction away',
    ],
    [
      bul?.relations.some((r) => r.verb === 'amends' && r.toId === 'POL-RET-001') === true,
      'T2 — the amendment is recorded as DATA, not prose',
      bul?.relations.map((r) => `${r.verb} → ${r.toId}`).join('; ') ?? 'none',
    ],
    [
      old?.status === 'superseded' &&
        !COMMERCE_DOCUMENTS.retiredStatuses.includes(old.status),
      'CONTROL — Rev 2 is superseded and STILL SEARCHABLE',
      `status=${old?.status}, retiredStatuses=[${COMMERCE_DOCUMENTS.retiredStatuses.join(', ')}]. ` +
        'It governed every order placed 2023-06-01→2024-10-31 and still answers "what did we promise then?"',
    ],
  ];
}

/** The one document that is genuinely dead, and the one facet T6 cannot work without. */
function retirementAndCarrierChecks(docs: SourceDocument[]): Check[] {
  const retired = docs.find((d) => d.status === 'retired');
  const carriers = docs.filter((d) => facetsOf(d).carrier !== null);
  return [
    [
      retired?.documentId.startsWith('note-elec-2022') === true &&
        COMMERCE_DOCUMENTS.retiredStatuses.includes('retired'),
      'exactly one document is RETIRED, and it is the wrong one',
      `${retired?.documentId}. Retired is not superseded: Rev 2 was correct for its ` +
        'period, this note was WRONG — it misstated the law and cost complaints',
    ],
    [
      carriers.length === 2,
      'T6 — both carrier contracts carry a carrier facet',
      carriers.map((d) => `${facetsOf(d).carrier}`).join(', ') +
        '. Lateness is unanswerable without it: one counts working days, one calendar days',
    ],
  ];
}

// ── orchestration ───────────────────────────────────────────────────────────

function report(checks: Check[]): number {
  let failed = 0;
  for (const [pass, label, detail] of checks) {
    if (!pass) failed++;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}    ${label}\n          ${detail}`);
  }
  return failed;
}

async function main(): Promise<void> {
  const docs = await fileDocumentSource(CORPUS_DIR, COMMERCE_DOCUMENTS).list();
  docs.sort((a, b) => a.documentId.localeCompare(b.documentId));

  console.log('\nGrounding step 2 — the banners, as the loader actually parsed them\n');
  for (const d of docs) printDocument(d);

  const checks = [
    ...countChecks(docs),
    ...bannerChecks(docs),
    ...conflictChecks(docs),
    ...retirementAndCarrierChecks(docs),
  ];
  const failed = report(checks);

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`} — ${checks.length - failed} ok, ${failed} failing\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
