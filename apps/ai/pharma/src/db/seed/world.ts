/**
 * THE WORLD — every row in the six databases, built as one coherent object
 * before a single line of SQL runs.
 *
 * WHY IT IS BUILT IN MEMORY FIRST, AND WHY THAT IS THE WHOLE ARGUMENT. The six
 * systems are separate databases, so Postgres cannot enforce a single reference
 * between them: no foreign key spans `mrd_qms.batch_dispositions.decided_by_ref`
 * and `mrd_hcm.employees`. That is the property we wanted — it is what stops an
 * assistant faking cross-silo reasoning with one clever JOIN — and the price is
 * that coherence becomes this file's job and nothing else's.
 *
 * So every cross-system id here is produced from the SAME variable that the
 * target row was built from. Not looked up, not re-derived, not typed twice.
 * When that discipline slips, `db:check` is what catches it, and `db:check`
 * carries a negative control because a reference checker that silently looks in
 * the wrong place reads exactly like a clean estate.
 *
 * THE EIGHT TRAPS ARE ANCHORED, NOT RANDOM. They are written as explicit
 * constants below, exported as `TRAPS`, and re-asserted by `db:check` after
 * load. A trap that depends on the dice is a trap that quietly disappears the
 * next time somebody changes a loop bound.
 */
import type { Helpers } from './rng';
import type {
  Reg, Hcm, Erp, Mes, Qms, Tms,
} from '../schema/rows';
import {
  makeHelpers,
  EPOCH,
  addDays,
  addMonths,
  iso,
  ts,
  campaignOf,
  pad,
} from './rng';

export const SEED = 20260911;

// ═══════════════════════════════════════════════════════════════ anchors ═══
//
// Everything the acceptance case and the eight traps depend on. Pinned here,
// in one place, because the plan's headline case derives to the OPPOSITE
// conclusion if these dates drift apart: a 2024 certification would have been
// governed by SOP-QC-014 Rev 6, under which a lapsed training is not a bar.

export const ANCHORS = {
  /**
   * The headline case: certified under Rev 7 by a QP whose training had lapsed.
   *
   * EMP-0103 AND EMP-0104 ARE NOT ARBITRARY. They fall inside the block of ids
   * that `EMP_PLAN` gives the Qualified Person position. The first draft named
   * EMP-0142, which resolved perfectly in every reference check and was a
   * PRODUCTION OPERATOR holding a QP registration and certifying batches. Every
   * soft key pointed at a real row; the person those rows described could not
   * exist. Referential integrity is not coherence, and that is why `db:check`
   * now asserts roles as well as references.
   */
  caseLot: 'LOT-IBU200-2609-B',
  caseWorkOrder: 'WO-26-0417',
  caseQp: 'EMP-0103',
  caseCertifiedOn: '2026-09-04',
  caseTrainingExpiry: '2026-08-24', // eleven days before certification
  caseSopRevision: 'SOP-QC-014 Rev 7',
  caseSpecVersion: 'SPEC-IBU200-v4',

  /** Rev 7 introduced the current-training requirement; Rev 6 did not. */
  releaseSopRev7From: '2026-03-01',
  releaseSopRev6From: '2023-07-01',
  releaseSopRev6To: '2026-02-28',

  /** T2 — a 2024 order citing a revision already superseded when it ran. */
  supersededLot: 'LOT-CET010-2408-A',
  supersededWorkOrder: 'WO-24-0311',
  supersededCitation: 'SOP-MFG-022 Rev 3',
  mfgSopRev3To: '2024-05-31',
  mfgSopRev4From: '2024-06-01',

  /** T3 — a press whose qualification expired before the run that used it. */
  unqualifiedEquipment: 'EQ-0112',
  equipmentValidUntil: '2026-06-30',
  unqualifiedLot: 'LOT-PAR500-2607-A',
  unqualifiedWorkOrder: 'WO-26-0389',

  /** T4 — material from a supplier disqualified after it was consumed. */
  badSupplier: 'SUP-04',
  supplierDisqualifiedOn: '2026-05-20',
  badMaterialLot: 'MLOT-2403-0017',
  contaminatedLots: ['LOT-IBU200-2409-B', 'LOT-AMX250-2411-A'],

  /** T5 — a cold-chain excursion on leg 2, inside a gap in the readings. */
  coldChainLot: 'LOT-LAT005-2608-A',
  coldChainShipment: 'SHP-26-1180',
  coldChainTruck: 'TRK-07',

  /** T6 — two sub-batches of one campaign, different markets, different limits. */
  twinEu: 'LOT-IBU200-2609-B',
  twinUs: 'LOT-IBU200-2609-D',

  /** T7 — an OOS retested to a pass with no investigation (21 CFR 211.192). */
  oosLot: 'LOT-PAR500-2605-C',
  oosTest: 'QC-26-003104',
  oosRetest: 'QC-26-003119',

  /** T8 — the negative control: a lot that is genuinely fine. */
  cleanLot: 'LOT-IBU200-2608-A',
  cleanWorkOrder: 'WO-26-0402',
  cleanQp: 'EMP-0104',
  cleanCertifiedOn: '2026-08-14',
};

// ═════════════════════════════════════════════════════════════ reference ═══

const PRODUCTS = [
  { code: 'IBU200', name: 'Ibuprofen 200 mg film-coated tablets', form: 'tablet', strength: '200 mg', atc: 'M01AE01', cap: 'tablet' },
  { code: 'PAR500', name: 'Paracetamol 500 mg tablets', form: 'tablet', strength: '500 mg', atc: 'N02BE01', cap: 'tablet' },
  { code: 'AMX250', name: 'Amoxicillin 250 mg hard capsules', form: 'capsule', strength: '250 mg', atc: 'J01CA04', cap: 'capsule' },
  { code: 'CET010', name: 'Cetirizine 10 mg film-coated tablets', form: 'tablet', strength: '10 mg', atc: 'R06AE07', cap: 'tablet' },
  { code: 'OME020', name: 'Omeprazole 20 mg gastro-resistant capsules', form: 'capsule', strength: '20 mg', atc: 'A02BC01', cap: 'capsule' },
  { code: 'MET500', name: 'Metformin 500 mg film-coated tablets', form: 'tablet', strength: '500 mg', atc: 'A10BA02', cap: 'tablet' },
  { code: 'ATO020', name: 'Atorvastatin 20 mg film-coated tablets', form: 'tablet', strength: '20 mg', atc: 'C10AA05', cap: 'tablet' },
  { code: 'LOR010', name: 'Loratadine 10 mg tablets', form: 'tablet', strength: '10 mg', atc: 'R06AX13', cap: 'tablet' },
  { code: 'DIC050', name: 'Diclofenac sodium 50 mg gastro-resistant tablets', form: 'tablet', strength: '50 mg', atc: 'M01AB05', cap: 'tablet' },
  { code: 'LAT005', name: 'Latanoprost 0.005% eye drops, solution', form: 'eye drops', strength: '50 mcg/ml', atc: 'S01EE01', cap: 'liquid', coldChain: true },
  { code: 'HYD001', name: 'Hydrocortisone 1% cream', form: 'cream', strength: '1%', atc: 'D07AA02', cap: 'semisolid' },
  { code: 'AMB030', name: 'Ambroxol 30 mg/5 ml oral solution', form: 'oral solution', strength: '30 mg/5 ml', atc: 'R05CB06', cap: 'liquid' },
];

const INGREDIENTS = [
  { id: 'ING-API-IBU', name: 'Ibuprofen', kind: 'API', cas: '15687-27-1', mono: 'USP-IBU' },
  { id: 'ING-API-PAR', name: 'Paracetamol (Acetaminophen)', kind: 'API', cas: '103-90-2', mono: 'USP-PAR' },
  { id: 'ING-API-AMX', name: 'Amoxicillin trihydrate', kind: 'API', cas: '61336-70-7', mono: 'USP-AMX' },
  { id: 'ING-API-CET', name: 'Cetirizine dihydrochloride', kind: 'API', cas: '83881-52-1', mono: 'USP-CET' },
  { id: 'ING-API-OME', name: 'Omeprazole', kind: 'API', cas: '73590-58-6', mono: 'USP-OME' },
  { id: 'ING-API-MET', name: 'Metformin hydrochloride', kind: 'API', cas: '1115-70-4', mono: 'USP-MET' },
  { id: 'ING-API-ATO', name: 'Atorvastatin calcium', kind: 'API', cas: '134523-03-8', mono: 'USP-ATO' },
  { id: 'ING-API-LOR', name: 'Loratadine', kind: 'API', cas: '79794-75-5', mono: 'USP-LOR' },
  { id: 'ING-API-DIC', name: 'Diclofenac sodium', kind: 'API', cas: '15307-79-6', mono: 'USP-DIC' },
  { id: 'ING-API-LAT', name: 'Latanoprost', kind: 'API', cas: '130209-82-4', mono: 'USP-LAT' },
  { id: 'ING-API-HYD', name: 'Hydrocortisone', kind: 'API', cas: '50-23-7', mono: 'USP-HYD' },
  { id: 'ING-API-AMB', name: 'Ambroxol hydrochloride', kind: 'API', cas: '23828-92-4', mono: 'USP-AMB' },
  { id: 'ING-EXC-MCC', name: 'Microcrystalline cellulose', kind: 'excipient', cas: '9004-34-6', mono: 'USP-MCC' },
  { id: 'ING-EXC-LAC', name: 'Lactose monohydrate', kind: 'excipient', cas: '64044-51-5', mono: 'USP-LAC' },
  { id: 'ING-EXC-MGS', name: 'Magnesium stearate', kind: 'excipient', cas: '557-04-0', mono: 'USP-MGS' },
  { id: 'ING-EXC-PVP', name: 'Povidone K30', kind: 'excipient', cas: '9003-39-8', mono: 'USP-PVP' },
  { id: 'ING-EXC-CRM', name: 'Croscarmellose sodium', kind: 'excipient', cas: '74811-65-7', mono: 'USP-CRM' },
  { id: 'ING-EXC-WFI', name: 'Water for injections', kind: 'excipient', cas: '7732-18-5', mono: 'USP-WFI' },
];

const SURNAMES = [
  'Visser', 'de Jong', 'Bakker', 'Janssen', 'Meijer', 'de Vries', 'van Dijk', 'Smit',
  'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Dekker', 'Brouwer', 'Kramer',
  'Whitfield', 'Alvarez', 'Okonkwo', 'Lindqvist', 'Haddad', 'Moreau', 'Rossi', 'Nowak',
  'Fischer', 'Torres', 'Nakamura', 'Kowalski', 'Petrov', 'Andersen',
];
const FORENAMES = [
  'Anneke', 'Bram', 'Carla', 'Daan', 'Eva', 'Femke', 'Gijs', 'Hanna', 'Ivo', 'Julia',
  'Koen', 'Lotte', 'Maarten', 'Nora', 'Otto', 'Pien', 'Quinn', 'Ruben', 'Sanne', 'Thijs',
  'Priya', 'Marcus', 'Ingrid', 'Yusuf', 'Clara', 'Diego', 'Mei', 'Tomasz', 'Elif', 'Noah',
];

// ═════════════════════════════════════════════════════════════════ build ═══

/**
 * The master data, before anything has happened to it.
 *
 * `MasterWorld` is the estate plus the lookup tables the operations half needs
 * — which are NOT database rows and deliberately do not pretend to be. They are
 * the indices that let a lot name the spec version it was made to without
 * re-deriving the id and getting it subtly wrong.
 */
export interface MasterWorld {
  h: Helpers;
  reg: Reg; hcm: Hcm; erp: Erp; mes: Mes; qms: Qms; tms: Tms;
  productOf: Record<string, string>;
  specVersionOf: Record<string, string>;
  specLimitIndex: Record<string, Record<string, SpecLimit>>;
  equipmentByLine: Record<string, string[]>;
  materialLotsByIngredient: Record<string, string[]>;
  byPos(position: string): string[];
  allEmployees: string[];
  LINE_DEFS: typeof LINE_DEFS_T;
  PRODUCTS: typeof PRODUCTS;
  /** Set by `buildOperations`. */
  sopRevisionAsOf?: (sopId: string, date: string) => string;
  lotIndex?: Record<string, LotFacts>;
}

/** One attribute's limits on one specification version. */
export interface SpecLimit {
  lo: number | null;
  hi: number | null;
  method_id: string;
  unit: string;
}

/** What `buildOperations` remembers about each lot it created. */
export interface LotFacts {
  lot: string; code: string; campaign: string; sub: string; market: string;
  wo: string; line: string; start: string; end: string;
  cap: string; specVersion: string; supervisor: string;
}

interface LineDef {
  line_id: string; site: string; name: string;
  building: string; room: string; grade: string; cap: string;
}
declare const LINE_DEFS_T: LineDef[];

/**
 * The standards and their clauses — what the WORLD requires, as opposed to what
 * Meridian's own procedures say.
 *
 * FIRST OF THE SEED SPLIT, 2026-09-12. `buildWorld` was 547 lines in one
 * function and nobody had dared touch it, because every value in the estate
 * comes off ONE random stream in order and a reordering would have moved 17
 * tables with nothing to detect it.
 *
 * `pnpm pharma:world-check` detects it now, so each section can be lifted and
 * PROVED byte-identical — the fingerprint after this commit is the same
 * `ab67e52dbe2e8ffd` as before it.
 *
 * THIS ONE DRAWS NO RANDOM NUMBERS AT ALL. Every standard and clause is a
 * literal, which is why it is first: the safest possible test of the pattern.
 */
function buildStandards(reg: Reg): void {
  reg.standards.push(
    { standard_id: 'CFR-211', body: 'FDA', code: '21 CFR Part 211', title: 'Current Good Manufacturing Practice for Finished Pharmaceuticals', jurisdiction: 'US', in_force_from: '1978-09-29' },
    { standard_id: 'CFR-210', body: 'FDA', code: '21 CFR Part 210', title: 'cGMP in Manufacturing, Processing, Packing, or Holding of Drugs: General', jurisdiction: 'US', in_force_from: '1978-09-29' },
    { standard_id: 'EU-GMP-P1', body: 'EMA', code: 'EudraLex Vol. 4 Part I', title: 'Basic Requirements for Medicinal Products', jurisdiction: 'EU', in_force_from: '2013-08-31' },
    { standard_id: 'EU-GMP-ANNEX-16', body: 'EMA', code: 'EudraLex Vol. 4 Annex 16', title: 'Certification by a Qualified Person and Batch Release', jurisdiction: 'EU', in_force_from: '2016-04-15' },
    { standard_id: 'EU-GDP', body: 'EMA', code: '2013/C 343/01', title: 'Guidelines on Good Distribution Practice of Medicinal Products for Human Use', jurisdiction: 'EU', in_force_from: '2013-11-05' },
    { standard_id: 'ICH-Q7', body: 'ICH', code: 'ICH Q7', title: 'Good Manufacturing Practice Guide for Active Pharmaceutical Ingredients', jurisdiction: 'ICH', in_force_from: '2000-11-10' },
    { standard_id: 'ICH-Q9', body: 'ICH', code: 'ICH Q9(R1)', title: 'Quality Risk Management', jurisdiction: 'ICH', in_force_from: '2023-01-18' },
    { standard_id: 'ICH-Q10', body: 'ICH', code: 'ICH Q10', title: 'Pharmaceutical Quality System', jurisdiction: 'ICH', in_force_from: '2008-06-04' },
  );
  for (const ing of INGREDIENTS) {
    reg.standards.push({
      standard_id: ing.mono, body: 'USP', code: `USP-NF ${ing.name}`,
      title: `${ing.name} monograph`, jurisdiction: 'US', in_force_from: '2020-05-01',
    });
  }

  const CLAUSES: [string, string, string, string, string][] = [
    ['CFR-211.22', 'CFR-211', '211.22', 'Responsibilities of quality control unit', 'The quality control unit has the responsibility and authority to approve or reject all components, drug product containers, in-process materials and finished products.'],
    ['CFR-211.25', 'CFR-211', '211.25', 'Personnel qualifications', 'Each person engaged in the manufacture, processing, packing or holding of a drug product shall have education, training and experience to perform the assigned functions, and training shall be conducted with sufficient frequency to assure continuing familiarity.'],
    ['CFR-211.68', 'CFR-211', '211.68', 'Automatic, mechanical and electronic equipment', 'Equipment shall be routinely calibrated, inspected or checked according to a written programme designed to assure proper performance.'],
    ['CFR-211.100', 'CFR-211', '211.100', 'Written procedures; deviations', 'There shall be written procedures for production and process control, and any deviation from them shall be recorded and justified.'],
    ['CFR-211.160', 'CFR-211', '211.160', 'Laboratory controls, general requirements', 'Laboratory controls shall include scientifically sound specifications, standards, sampling plans and test procedures.'],
    ['CFR-211.165', 'CFR-211', '211.165', 'Testing and release for distribution', 'For each batch there shall be appropriate laboratory determination of satisfactory conformance to final specifications prior to release.'],
    ['CFR-211.192', 'CFR-211', '211.192', 'Production record review', 'Any unexplained discrepancy or the failure of a batch to meet any of its specifications shall be thoroughly investigated, whether or not the batch has already been distributed. The investigation shall extend to other batches that may have been associated with the specific failure.'],
    ['CFR-211.194', 'CFR-211', '211.194', 'Laboratory records', 'Laboratory records shall include complete data derived from all tests necessary to assure compliance with established specifications and standards.'],
    ['CFR-211.198', 'CFR-211', '211.198', 'Complaint files', 'Written procedures describing the handling of all written and oral complaints regarding a drug product shall be established and followed.'],
    ['ANNEX16-1.5', 'EU-GMP-ANNEX-16', '1.5', 'Responsibilities of the Qualified Person', 'The QP certifying a batch is personally responsible for ensuring that each batch has been manufactured and checked in compliance with the marketing authorisation and with Good Manufacturing Practice.'],
    ['ANNEX16-1.7', 'EU-GMP-ANNEX-16', '1.7', 'Reliance on quality systems', 'The QP may rely on the pharmaceutical quality system, but personal responsibility for certification is not delegable and the QP must have ongoing knowledge and experience appropriate to the products certified.'],
    ['ANNEX16-3', 'EU-GMP-ANNEX-16', '3', 'Handling of unexpected deviations', 'An unexpected deviation may be accepted only where the registered specifications for the product are met and a thorough assessment has been performed.'],
    ['EUGMP-2.1', 'EU-GMP-P1', '2.1', 'Personnel principle', 'The establishment and maintenance of a satisfactory system of quality assurance relies upon people; there must be sufficient qualified personnel and all personnel should be aware of the principles of GMP that affect them.'],
    ['EUGMP-2.10', 'EU-GMP-P1', '2.10', 'Continuing training', 'All personnel should receive initial and continuing training relevant to their duties, and the practical effectiveness of training should be periodically assessed.'],
    ['EUGMP-3.41', 'EU-GMP-P1', '3.41', 'Equipment qualification', 'Manufacturing equipment should be designed, located and maintained to suit its intended purpose, and should be qualified before use and requalified at defined intervals.'],
    ['EUGMP-5.1', 'EU-GMP-P1', '5.1', 'Production principle', 'Production operations must follow clearly defined procedures in accordance with GMP in order to obtain products of the requisite quality.'],
    ['EUGMP-6.1', 'EU-GMP-P1', '6.1', 'Quality control principle', 'Quality Control is concerned with sampling, specifications and testing, and with the release procedures which ensure that the necessary relevant tests are carried out.'],
    ['GDP-9.2', 'EU-GDP', '9.2', 'Transportation conditions', 'The required storage conditions for medicinal products should be maintained during transportation within the defined limits described by the manufacturers.'],
    ['ICHQ7-6.1', 'ICH-Q7', '6.1', 'Documentation and records', 'All documents related to the manufacture of intermediates or APIs should be prepared, reviewed, approved and distributed according to written procedures.'],
    ['ICHQ9-4.1', 'ICH-Q9', '4.1', 'Risk assessment', 'Quality risk management should be based on scientific knowledge and ultimately link to the protection of the patient.'],
  ];
  for (const [clause_id, standard_id, clause_no, title, summary] of CLAUSES) {
    reg.standard_clauses.push({ clause_id, standard_id, clause_no, title, summary });
  }
}

/**
 * Meridian's own procedures and their revisions.
 *
 * DRAWS NO RANDOM NUMBERS either — every effective date is a literal or an
 * ANCHOR, because the as-of rule lives or dies on those dates being exactly
 * what the traps expect.
 */
function buildSops(reg: Reg): void {
  //
  // The as-of rule lives or dies on effective_from / effective_to being right.

  const SOP_DEFS: { id: string; title: string; category: string; dept: string; clauses: string[] }[] = [
    { id: 'SOP-QC-014', title: 'Batch Release and QP Certification', category: 'quality', dept: 'DEPT-QA', clauses: ['ANNEX16-1.5', 'CFR-211.165', 'CFR-211.22'] },
    { id: 'SOP-MFG-022', title: 'Tablet Compression Operation', category: 'manufacturing', dept: 'DEPT-MFG', clauses: ['EUGMP-5.1', 'CFR-211.100'] },
    { id: 'SOP-QC-003', title: 'Out-of-Specification Result Investigation', category: 'quality', dept: 'DEPT-QC', clauses: ['CFR-211.192', 'CFR-211.194'] },
    { id: 'SOP-QA-007', title: 'Deviation Management', category: 'quality', dept: 'DEPT-QA', clauses: ['CFR-211.100', 'ANNEX16-3'] },
    { id: 'SOP-QA-011', title: 'Corrective and Preventive Action (CAPA)', category: 'quality', dept: 'DEPT-QA', clauses: ['ICHQ9-4.1'] },
    { id: 'SOP-ENG-005', title: 'Equipment Qualification and Requalification', category: 'manufacturing', dept: 'DEPT-ENG', clauses: ['EUGMP-3.41', 'CFR-211.68'] },
    { id: 'SOP-HR-002', title: 'GMP Training and Qualification of Personnel', category: 'hr', dept: 'DEPT-HR', clauses: ['CFR-211.25', 'EUGMP-2.10'] },
    { id: 'SOP-WH-009', title: 'Cold Chain Shipment and Temperature Monitoring', category: 'warehouse', dept: 'DEPT-WH', clauses: ['GDP-9.2'] },
    { id: 'SOP-SCM-004', title: 'Supplier Qualification and Disqualification', category: 'warehouse', dept: 'DEPT-SCM', clauses: ['ICHQ7-6.1', 'CFR-211.22'] },
    { id: 'SOP-QA-015', title: 'Change Control', category: 'quality', dept: 'DEPT-QA', clauses: ['ICHQ9-4.1'] },
    { id: 'SOP-QC-021', title: 'Dissolution Testing of Solid Oral Dosage Forms', category: 'quality', dept: 'DEPT-QC', clauses: ['CFR-211.160', 'EUGMP-6.1'] },
    { id: 'SOP-MFG-031', title: 'Aseptic Filling of Ophthalmic Solutions', category: 'manufacturing', dept: 'DEPT-MFG', clauses: ['EUGMP-5.1'] },
  ];

  for (const s of SOP_DEFS) {
    reg.sops.push({ sop_id: s.id, title: s.title, category: s.category, owning_department_ref: s.dept });
  }

  /** Add one revision and its clause links. `to` null means still in force. */
  const addRevision = (
    sopId: string, no: number, from: string, to: string | null,
    summary: string, change: string, clauses: string[], ccRef: string | null = null,
  ): string => {
    const revision_id = `${sopId} Rev ${no}`;
    reg.sop_revisions.push({
      revision_id, sop_id: sopId, revision_no: no,
      effective_from: from, effective_to: to,
      summary, change_summary: change,
      // Only when the predecessor is a revision we actually model. The
      // history here is a WINDOW, not the full life of the procedure — some
      // SOPs are first modelled at Rev 5 — and pointing at a row that was
      // never written is a dangling reference inside a single database, which
      // Postgres will and should reject.
      supersedes_revision_id: reg.sop_revisions.some((r) => r.revision_id === `${sopId} Rev ${no - 1}`)
        ? `${sopId} Rev ${no - 1}`
        : null,
      change_control_ref: ccRef,
    });
    for (const c of clauses) {
      reg.sop_clause_links.push({ revision_id, clause_id: c, relation: 'implements' });
    }
    return revision_id;
  };

  // SOP-QC-014 — the one the headline case turns on.
  addRevision('SOP-QC-014', 5, '2021-02-01', '2023-06-30',
    'Batch release and QP certification, general process.',
    'Initial consolidated revision replacing the site-specific release procedures.',
    ['ANNEX16-1.5', 'CFR-211.165']);
  addRevision('SOP-QC-014', 6, ANCHORS.releaseSopRev6From, ANCHORS.releaseSopRev6To,
    'Batch release and QP certification. Section 7 lists the release checklist.',
    'Added the requirement to reconcile the batch record against the deviation log before certification. NO personnel-training precondition.',
    ['ANNEX16-1.5', 'CFR-211.165', 'CFR-211.22']);
  addRevision('SOP-QC-014', 7, ANCHORS.releaseSopRev7From, null,
    'Batch release and QP certification. Section 7.3 adds a personnel precondition to certification.',
    'Section 7.3 NEW: the certifying QP must hold a valid, unexpired GMP refresher training record on the date of certification. A certification made without one is invalid and the batch remains in quarantine.',
    ['ANNEX16-1.5', 'ANNEX16-1.7', 'CFR-211.165', 'CFR-211.25'], 'CC-26-0008');

  // SOP-MFG-022 — the one T2's work order cites a stale revision of.
  addRevision('SOP-MFG-022', 1, '2018-01-01', '2020-02-29', 'Tablet compression operation.', 'Initial issue.', ['EUGMP-5.1']);
  addRevision('SOP-MFG-022', 2, '2020-03-01', '2021-12-31', 'Tablet compression operation.', 'Routine periodic review.', ['EUGMP-5.1']);
  addRevision('SOP-MFG-022', 3, '2022-01-01', ANCHORS.mfgSopRev3To, 'Tablet compression operation.', 'Compression force limits widened following press requalification.', ['EUGMP-5.1', 'CFR-211.100']);
  addRevision('SOP-MFG-022', 4, ANCHORS.mfgSopRev4From, null, 'Tablet compression operation, with in-process control intervals.',
    'In-process weight checks moved from every 60 minutes to every 30 minutes, and the hardness limit tightened.', ['EUGMP-5.1', 'CFR-211.100'], 'CC-24-0021');

  addRevision('SOP-QC-003', 4, '2022-06-01', '2025-03-31', 'OOS investigation, Phase IA/IB/II.', 'Aligned with FDA OOS guidance 2022.', ['CFR-211.192']);
  addRevision('SOP-QC-003', 5, '2025-04-01', null, 'OOS investigation, Phase IA/IB/II.',
    'Explicit prohibition on retesting before a Phase IA laboratory investigation has been documented and approved.', ['CFR-211.192', 'CFR-211.194'], 'CC-25-0014');

  addRevision('SOP-QA-007', 3, '2023-01-15', null, 'Deviation management.', 'Severity matrix aligned to ICH Q9(R1).', ['CFR-211.100', 'ANNEX16-3']);
  addRevision('SOP-QA-011', 2, '2022-09-01', null, 'CAPA lifecycle and effectiveness checks.', 'Added 30-day effectiveness review.', ['ICHQ9-4.1']);
  addRevision('SOP-ENG-005', 6, '2024-02-01', null, 'Equipment qualification and requalification intervals.',
    'Requalification interval for tablet presses set to 24 months and made a hard block on production use.', ['EUGMP-3.41', 'CFR-211.68'], 'CC-24-0005');
  addRevision('SOP-HR-002', 8, '2025-09-01', null, 'GMP training curriculum, frequency and records.',
    'GMP refresher validity confirmed at 24 months; expiry now blocks GMP-critical activities.', ['CFR-211.25', 'EUGMP-2.10']);
  addRevision('SOP-WH-009', 3, '2024-11-01', null, 'Cold chain shipment and continuous temperature monitoring.',
    'Continuous monitoring at 15-minute intervals made mandatory; a monitoring gap exceeding 60 minutes is to be treated as an excursion until proven otherwise.', ['GDP-9.2'], 'CC-24-0033');
  addRevision('SOP-SCM-004', 5, '2023-04-01', null, 'Supplier qualification, periodic audit and disqualification.',
    'Disqualification now requires a traceability assessment of all material already consumed.', ['ICHQ7-6.1', 'CFR-211.22']);
  addRevision('SOP-QA-015', 4, '2024-01-01', null, 'Change control.', 'Added regulatory-impact assessment step.', ['ICHQ9-4.1']);
  addRevision('SOP-QC-021', 2, '2023-10-01', null, 'Dissolution testing, apparatus 2.', 'Media degassing method specified.', ['CFR-211.160', 'EUGMP-6.1']);
  // SOP-MFG-031 needs revisions reaching back to the earliest liquid campaign.
  // It did not, at first: `sopRevisionAsOf` threw on a February 2024 run,
  // which is the function refusing to pretend a procedure governed an act
  // before it existed. A seed that silently attached the 2025 revision to a
  // 2024 run would have made the as-of rule look satisfied while teaching the
  // exact error the rule exists to prevent.
  addRevision('SOP-MFG-031', 1, '2019-01-01', '2021-05-31', 'Aseptic filling of ophthalmic solutions.', 'Initial issue.', ['EUGMP-5.1']);
  addRevision('SOP-MFG-031', 2, '2021-06-01', '2025-04-30', 'Aseptic filling of ophthalmic solutions.', 'Media fill frequency aligned to Annex 1.', ['EUGMP-5.1']);
  addRevision('SOP-MFG-031', 3, '2025-05-01', null, 'Aseptic filling of ophthalmic solutions.', 'Environmental monitoring frequency increased.', ['EUGMP-5.1']);
}

/**
 * Sites, lines and equipment.
 *
 * THE FIRST SECTION THAT DRAWS. `int` is threaded in explicitly rather than
 * closed over, which is the point of the split: a function that takes the
 * random source cannot accidentally be given a different one, and the call
 * order in `buildWorld` is now the whole of the stream's order in one screen.
 */
function buildSites(
  mes: Mes,
  int: Helpers['int'],
): { LINE_DEFS: LineDef[]; equipmentByLine: Record<string, string[]> } {
  mes.sites.push(
    { site_id: 'SITE-01', name: 'Meridian Pharma Leiden', city: 'Leiden', country: 'NL', gmp_certificate_no: 'NL/GMP/2024/0418', gmp_valid_from: '2024-03-01', gmp_valid_to: '2027-02-28' },
    { site_id: 'SITE-02', name: 'Meridian Pharma Greenville', city: 'Greenville, SC', country: 'US', gmp_certificate_no: 'US-FEI-3011492', gmp_valid_from: '2023-11-15', gmp_valid_to: '2026-11-14' },
  );

  const LINE_DEFS: LineDef[] = [
    { line_id: 'LINE-01-T1', site: 'SITE-01', name: 'Tablet line 1', building: 'B1', room: 'R-104', grade: 'D', cap: 'tablet' },
    { line_id: 'LINE-01-T2', site: 'SITE-01', name: 'Tablet line 2', building: 'B1', room: 'R-106', grade: 'D', cap: 'tablet' },
    { line_id: 'LINE-01-C1', site: 'SITE-01', name: 'Capsule line 1', building: 'B1', room: 'R-112', grade: 'D', cap: 'capsule' },
    { line_id: 'LINE-01-L1', site: 'SITE-01', name: 'Ophthalmic filling line', building: 'B2', room: 'R-201', grade: 'B', cap: 'liquid' },
    { line_id: 'LINE-02-T1', site: 'SITE-02', name: 'Tablet line 1', building: 'A', room: '118', grade: 'D', cap: 'tablet' },
    { line_id: 'LINE-02-S1', site: 'SITE-02', name: 'Semisolid line', building: 'A', room: '124', grade: 'D', cap: 'semisolid' },
  ];
  for (const l of LINE_DEFS) {
    mes.lines.push({ line_id: l.line_id, site_id: l.site, name: l.name, building: l.building, room: l.room, cleanroom_grade: l.grade, capability: l.cap });
  }

  // Equipment numbering starts at 111 so that the tablet press on LINE-01-T1 —
  // the one whose qualification T3 lets expire — is EQ-0112, as the plan says.
  const EQUIP_BY_CAP: Record<string, string[]> = {
    tablet: ['Fluid bed granulator', 'Rotary tablet press', 'Film coater', 'Deduster/metal check'],
    capsule: ['V-blender', 'Capsule filler', 'Capsule polisher', 'Weight checker'],
    liquid: ['Compounding vessel', 'Sterile filling machine', 'Autoclave', 'Visual inspection unit'],
    semisolid: ['Vacuum emulsifier', 'Tube filler', 'Homogeniser', 'Checkweigher'],
  };
  const EQUIP_KIND: Record<string, string> = { 'Fluid bed granulator': 'granulator', 'Rotary tablet press': 'press', 'Film coater': 'coater', 'Deduster/metal check': 'checkweigher', 'V-blender': 'blender', 'Capsule filler': 'filler', 'Capsule polisher': 'polisher', 'Weight checker': 'checkweigher', 'Compounding vessel': 'vessel', 'Sterile filling machine': 'filler', 'Autoclave': 'autoclave', 'Visual inspection unit': 'inspection', 'Vacuum emulsifier': 'emulsifier', 'Tube filler': 'filler', 'Homogeniser': 'homogeniser', 'Checkweigher': 'checkweigher' };

  let eqN = 111;
  const equipmentByLine: Record<string, string[]> = {};
  for (const l of LINE_DEFS) {
    equipmentByLine[l.line_id] = [];
    for (const name of EQUIP_BY_CAP[l.cap]) {
      const equipment_id = pad('EQ-', eqN++, 4);
      mes.equipment.push({ equipment_id, line_id: l.line_id, name, kind: EQUIP_KIND[name], serial_no: `SN-${int(100000, 999999)}` });
      equipmentByLine[l.line_id].push(equipment_id);
    }
  }

  // RETURNED, not closed over. These two are read by later sections and by
  // the world object itself; hiding them inside this function would have been
  // the one way a mechanical split could change behaviour rather than just
  // shape.
  return { LINE_DEFS, equipmentByLine };
}

/**
 * Departments, positions, people, training and signature authority.
 *
 * THE LARGEST SECTION, and the one every trap eventually touches: T1 is a
 * training record, T3 an engineer's qualification, and the QP registrations
 * decide who may certify at all.
 *
 * RETURNS `byPos` and `allEmployees` rather than closing over them. Every later
 * section asks "who holds this position", and the world object exposes both —
 * hiding them here would have been the one way a mechanical split could change
 * behaviour rather than only shape.
 */
function buildPeople(hcm: Hcm, reg: Reg, h: Helpers): { byPos: (p: string) => string[]; allEmployees: string[] } {
  const { int, pick, chance, num, shuffle } = h;
  const DEPT_DEFS: [string, string, string, string][] = [
    ['DEPT-QA', 'Quality Assurance', 'quality', 'SITE-01'],
    ['DEPT-QC', 'Quality Control Laboratory', 'quality', 'SITE-01'],
    ['DEPT-MFG', 'Manufacturing', 'manufacturing', 'SITE-01'],
    ['DEPT-ENG', 'Engineering & Maintenance', 'manufacturing', 'SITE-01'],
    ['DEPT-WH', 'Warehouse & Distribution', 'warehouse', 'SITE-01'],
    ['DEPT-REG', 'Regulatory Affairs', 'regulatory', 'SITE-01'],
    ['DEPT-HR', 'Human Resources', 'hr', 'SITE-01'],
    ['DEPT-SCM', 'Supply Chain', 'warehouse', 'SITE-02'],
  ];
  for (const [department_id, name, fn, site] of DEPT_DEFS) {
    hcm.departments.push({ department_id, name, function: fn, site_ref: site, head_employee_ref: null });
  }

  const POSITION_DEFS: [string, string, string, boolean][] = [
    ['POS-QP', 'Qualified Person', 'DEPT-QA', true],
    ['POS-QAM', 'QA Manager', 'DEPT-QA', true],
    ['POS-QAO', 'QA Officer', 'DEPT-QA', true],
    ['POS-QCS', 'QC Supervisor', 'DEPT-QC', true],
    ['POS-QCA', 'QC Analyst', 'DEPT-QC', true],
    ['POS-PRM', 'Production Manager', 'DEPT-MFG', true],
    ['POS-LSU', 'Line Supervisor', 'DEPT-MFG', true],
    ['POS-OPR', 'Production Operator', 'DEPT-MFG', false],
    ['POS-MTC', 'Maintenance Technician', 'DEPT-ENG', false],
    ['POS-ENG', 'Qualification Engineer', 'DEPT-ENG', true],
    ['POS-WHO', 'Warehouse Operative', 'DEPT-WH', false],
    ['POS-LOG', 'Logistics Coordinator', 'DEPT-WH', false],
    ['POS-RAO', 'Regulatory Affairs Officer', 'DEPT-REG', false],
    ['POS-HRO', 'HR Officer', 'DEPT-HR', false],
    ['POS-BUY', 'Buyer', 'DEPT-SCM', false],
  ];
  for (const [position_id, title, department_id, gmp_critical] of POSITION_DEFS) {
    hcm.positions.push({ position_id, title, department_id, gmp_critical });
  }

  // 60 employees, EMP-0101 … EMP-0160, so that EMP-0142 and EMP-0119 — the two
  // the acceptance case and its control name — are real people in the middle of
  // the list rather than special-cased ids bolted on the end.
  const EMP_PLAN: [string, number][] = [
    ['POS-QAM', 1], ['POS-QP', 4], ['POS-QAO', 6], ['POS-QCS', 2], ['POS-QCA', 9],
    ['POS-PRM', 2], ['POS-LSU', 4], ['POS-OPR', 14], ['POS-MTC', 4], ['POS-ENG', 2],
    ['POS-WHO', 5], ['POS-LOG', 2], ['POS-RAO', 2], ['POS-HRO', 1], ['POS-BUY', 2],
  ];
  const posOf: Record<string, { department: string; gmp_critical: boolean }> =
    Object.fromEntries(POSITION_DEFS.map((p) => [p[0], { department: p[2] as string, gmp_critical: p[3] as boolean }]));
  let empN = 101;
  const employeesByPosition: Record<string, string[]> = {};
  for (const [position_id, count] of EMP_PLAN) {
    employeesByPosition[position_id] = [];
    for (let i = 0; i < count; i++) {
      const employee_id = pad('EMP-', empN++, 4);
      const dept = posOf[position_id].department;
      // A position naming a department that does not exist is a typo in
      // POSITION_DEFS, and the useful moment to hear about it is here — not
      // three hundred rows later as a dangling `site_ref` in `db:check`.
      const department = hcm.departments.find((d) => d.department_id === dept);
      if (!department) {
        throw new Error(`Position ${position_id} names department ${dept}, which does not exist.`);
      }
      hcm.employees.push({
        employee_id,
        full_name: `${pick(FORENAMES)} ${pick(SURNAMES)}`,
        position_id,
        department_id: dept,
        site_ref: department.site_ref,
        hired_on: iso(addDays(EPOCH, -int(400, 5200))),
        left_on: null,
        status: 'active',
      });
      employeesByPosition[position_id].push(employee_id);
    }
  }
  const allEmployees = hcm.employees.map((e) => e.employee_id);
  const byPos = (p: string): string[] => employeesByPosition[p];

  // Department heads, now that people exist.
  const HEADS: Record<string, string> = { 'DEPT-QA': byPos('POS-QAM')[0], 'DEPT-QC': byPos('POS-QCS')[0], 'DEPT-MFG': byPos('POS-PRM')[0], 'DEPT-ENG': byPos('POS-ENG')[0], 'DEPT-WH': byPos('POS-LOG')[0], 'DEPT-REG': byPos('POS-RAO')[0], 'DEPT-HR': byPos('POS-HRO')[0], 'DEPT-SCM': byPos('POS-BUY')[0] };
  for (const d of hcm.departments) d.head_employee_ref = HEADS[d.department_id];

  // Policies, now that there are people to own them. They were built in the
  // mrd_reg section at first, which forced hard-coded employee ids — and those
  // ids landed on a warehouse operative owning the regulatory reporting policy
  // and a qualification engineer owning Good Distribution Practice. Building
  // them here costs one move and makes the owner a consequence of the org
  // chart rather than a guess.
  const QAM = byPos('POS-QAM')[0];
  reg.policies.push(
    { policy_id: 'POL-QA-01', title: 'Quality Policy', scope: 'global', owner_ref: QAM, effective_from: '2023-01-01', effective_to: null },
    { policy_id: 'POL-QA-03', title: 'Data Integrity Policy (ALCOA+)', scope: 'global', owner_ref: QAM, effective_from: '2024-06-01', effective_to: null },
    { policy_id: 'POL-QA-04', title: 'Personnel Qualification Policy', scope: 'global', owner_ref: QAM, effective_from: ANCHORS.releaseSopRev7From, effective_to: null },
    { policy_id: 'POL-EHS-02', title: 'Health, Safety and Environment Policy', scope: 'global', owner_ref: byPos('POS-HRO')[0], effective_from: '2022-04-01', effective_to: null },
    { policy_id: 'POL-WH-01', title: 'Good Distribution Practice Policy', scope: 'global', owner_ref: byPos('POS-LOG')[0], effective_from: '2024-11-01', effective_to: null },
    { policy_id: 'POL-REG-02', title: 'Regulatory Reporting and Variations Policy', scope: 'global', owner_ref: byPos('POS-RAO')[0], effective_from: '2023-09-01', effective_to: null },
    { policy_id: 'POL-QA-06', title: 'Supplier Management Policy', scope: 'global', owner_ref: byPos('POS-BUY')[0], effective_from: '2023-04-01', effective_to: null },
    { policy_id: 'POL-SITE-01', title: 'Leiden Site Access and Gowning Policy', scope: 'site', owner_ref: byPos('POS-QAO')[0], effective_from: '2025-02-01', effective_to: null },
  );

  const CURRICULA: [string, string, string, number, string][] = [
    ['TRN-GMP-IND', 'GMP-IND', 'GMP Induction', 36, 'all'],
    ['TRN-GMP-REF', 'GMP-REF', 'GMP Refresher', 24, 'all'],
    ['TRN-DATA-INT', 'DI-01', 'Data Integrity and ALCOA+', 24, 'all'],
    ['TRN-HYG', 'HYG-01', 'Hygiene and Gowning', 12, 'manufacturing'],
    ['TRN-SOP-QC-014', 'SOP-QC-014', 'Batch Release and QP Certification (procedure training)', 24, 'quality'],
    ['TRN-DEV', 'DEV-01', 'Deviation Handling', 36, 'all'],
    ['TRN-OOS', 'OOS-01', 'OOS Investigation', 24, 'quality'],
    ['TRN-GDP', 'GDP-01', 'Good Distribution Practice', 24, 'warehouse'],
    ['TRN-EHS', 'EHS-01', 'Health and Safety', 12, 'all'],
    ['TRN-AUD', 'AUD-01', 'Internal Auditor', 36, 'quality'],
  ];
  for (const [curriculum_id, code, title, validity_months, mandatory_for] of CURRICULA) {
    hcm.training_curricula.push({ curriculum_id, code, title, validity_months, mandatory_for });
  }

  const deptFunction: Record<string, string> = Object.fromEntries(DEPT_DEFS.map((d) => [d[0], d[2]]));
  for (const e of hcm.employees) {
    const fn = deptFunction[e.department_id];
    for (const c of hcm.training_curricula) {
      if (c.mandatory_for !== 'all' && c.mandatory_for !== fn) continue;
      // Everyone's training is current, EXCEPT where an anchor says otherwise.
      // A world where a third of the staff is out of date makes the planted
      // lapse unremarkable, and the trap has to be the only one of its kind.
      const completed = addDays(EPOCH, -int(30, c.validity_months * 30 - 60));
      hcm.training_records.push({
        employee_id: e.employee_id, curriculum_id: c.curriculum_id,
        completed_on: iso(completed),
        expires_on: iso(addMonths(completed, c.validity_months)),
        score_pct: int(78, 100),
      });
    }
  }

  // T1 — the lapse. EMP-0142's GMP refresher expired eleven days before they
  // certified. Rewritten rather than generated, so it cannot drift.
  const lapsed = hcm.training_records.find(
    (t) => t.employee_id === ANCHORS.caseQp && t.curriculum_id === 'TRN-GMP-REF',
  );
  // THROWS RATHER THAN SHRUGS. If the GMP refresher record for the anchored QP
  // is not there — because the curriculum was renamed, or the employee id moved
  // out of the QP block — then T1 has silently ceased to exist and every check
  // downstream would report a clean estate. The whole acceptance case rests on
  // this one row.
  if (!lapsed) {
    throw new Error(
      `No TRN-GMP-REF record for ${ANCHORS.caseQp} to expire — T1 cannot be planted.`,
    );
  }
  lapsed.completed_on = iso(addMonths(new Date(`${ANCHORS.caseTrainingExpiry}T00:00:00Z`), -24));
  lapsed.expires_on = ANCHORS.caseTrainingExpiry;
  lapsed.score_pct = 91;

  // The QPs. EMP-0142 must be one, and so must the control's EMP-0119.
  const QPS = [...new Set([ANCHORS.caseQp, ANCHORS.cleanQp, ...byPos('POS-QP')])];
  for (const employee_id of QPS) {
    hcm.qualifications.push({
      qualification_id: `QUAL-${employee_id}-QP`, employee_id, kind: 'QP',
      authority: 'Dutch Medicines Evaluation Board (CBG-MEB)',
      register_no: `QP-NL-${int(10000, 99999)}`,
      registered_on: iso(addDays(EPOCH, -int(900, 3500))), valid_until: null,
    });
    hcm.signature_authority.push({ employee_id, act: 'qp_certify', granted_on: iso(addDays(EPOCH, -int(400, 2000))), revoked_on: null });
  }
  for (const employee_id of byPos('POS-QCA').concat(byPos('POS-QCS'))) {
    hcm.qualifications.push({ qualification_id: `QUAL-${employee_id}-ANL`, employee_id, kind: 'analyst', authority: 'Internal', register_no: null, registered_on: iso(addDays(EPOCH, -int(300, 2500))), valid_until: iso(addDays(EPOCH, int(120, 900))) });
    hcm.signature_authority.push({ employee_id, act: 'oos_approve', granted_on: iso(addDays(EPOCH, -int(300, 1500))), revoked_on: null });
  }
  for (const employee_id of byPos('POS-OPR').concat(byPos('POS-LSU'))) {
    hcm.qualifications.push({ qualification_id: `QUAL-${employee_id}-OPR`, employee_id, kind: 'operator', authority: 'Internal', register_no: null, registered_on: iso(addDays(EPOCH, -int(200, 2500))), valid_until: iso(addDays(EPOCH, int(60, 800))) });
  }
  for (const employee_id of byPos('POS-LSU').concat(byPos('POS-PRM'))) {
    hcm.signature_authority.push({ employee_id, act: 'batch_record_sign', granted_on: iso(addDays(EPOCH, -int(300, 1800))), revoked_on: null });
  }
  for (const employee_id of byPos('POS-QAO').concat(byPos('POS-QAM'))) {
    hcm.signature_authority.push({ employee_id, act: 'capa_close', granted_on: iso(addDays(EPOCH, -int(300, 1800))), revoked_on: null });
    hcm.qualifications.push({ qualification_id: `QUAL-${employee_id}-AUD`, employee_id, kind: 'auditor', authority: 'Internal', register_no: null, registered_on: iso(addDays(EPOCH, -int(300, 2000))), valid_until: iso(addDays(EPOCH, int(90, 700))) });
  }

  return { byPos, allEmployees };
}

/**
 * Suppliers, ingredients, products and market authorisations.
 *
 * Returns `productOf` — which product a lot belongs to, needed by nearly
 * everything downstream and carried on the world object.
 */
function buildProducts(erp: Erp, h: Helpers): Record<string, string> {
  const { int, pick, chance, num, shuffle } = h;
  for (const ing of INGREDIENTS) {
    erp.ingredients.push({ ingredient_id: ing.id, name: ing.name, kind: ing.kind, cas_number: ing.cas, compendial_ref: ing.mono });
  }

  const SUPPLIER_DEFS: [string, string, string][] = [
    ['SUP-01', 'Rhine Fine Chemicals GmbH', 'DE'], ['SUP-02', 'Aurora API Ltd', 'IE'],
    ['SUP-03', 'Kanpur Pharmaceuticals Pvt Ltd', 'IN'], ['SUP-04', 'Silverbrook Synthesis Co.', 'IN'],
    ['SUP-05', 'Nordwest Excipients BV', 'NL'], ['SUP-06', 'Tessera Lactose SpA', 'IT'],
    ['SUP-07', 'Blue Ridge Chemicals Inc', 'US'], ['SUP-08', 'Hokkaido Fine Materials KK', 'JP'],
  ];
  for (const [supplier_id, name, country] of SUPPLIER_DEFS) {
    erp.suppliers.push({
      supplier_id, name, country,
      qualified_from: iso(addDays(EPOCH, -int(1200, 4000))),
      // T4 — disqualified after the fact, with the audit that caused it below.
      disqualified_on: supplier_id === ANCHORS.badSupplier ? ANCHORS.supplierDisqualifiedOn : null,
      disqualified_reason: supplier_id === ANCHORS.badSupplier
        ? 'Critical finding at supplier audit AUD-26-0003: undeclared change of synthesis route and incomplete elemental impurity data. Disqualified pending remediation.'
        : null,
    });
  }

  let prodN = 140;
  const productOf: Record<string, string> = {};
  for (const p of PRODUCTS) {
    const product_id = pad('PRD-', ++prodN, 5);
    productOf[p.code] = product_id;
    erp.products.push({
      product_id, product_code: p.code, name: p.name, dosage_form: p.form,
      strength: p.strength, atc_code: p.atc, status: 'commercial',
    });
  }

  return productOf;
}

/**
 * Specifications, test methods, limits, and the material lots consumed.
 *
 * NAMED "specs before anything" in the original because a specification version
 * must exist before a lot can name one. That ordering is a data dependency, not
 * a preference — which is exactly why this section could not simply be moved.
 */
function buildSpecs(
  qms: Qms,
  erp: Erp,
  /** From `buildProducts`. Threaded explicitly so the data dependency between
   *  the two sections is visible in the signature rather than in a closure. */
  productOf: Record<string, string>,
  h: Helpers,
): {
  specVersionOf: Record<string, string>;
  specLimitIndex: Record<string, Record<string, SpecLimit>>;
  materialLotsByIngredient: Record<string, string[]>;
} {
  const { int, pick, chance, num, shuffle } = h;
  //
  // Built before lots, because a lot must name the spec version it was made to
  // and that id has to come from the row that will actually exist.

  const METHODS: [string, string, string, string, string][] = [
    ['MTH-ASSAY', 'AS-HPLC', 'Assay by HPLC', 'HPLC', 'CFR-211.160'],
    ['MTH-DISS', 'DISS-A2', 'Dissolution, apparatus 2', 'dissolution', 'CFR-211.160'],
    ['MTH-UNIF', 'UNIF-01', 'Uniformity of dosage units', 'UV', 'CFR-211.160'],
    ['MTH-WATER', 'KF-01', 'Water content, Karl Fischer', 'titration', 'CFR-211.160'],
    ['MTH-MICRO', 'MB-TAMC', 'Microbial enumeration, TAMC', 'microbiology', 'CFR-211.160'],
    ['MTH-PH', 'PH-01', 'pH determination', 'titration', 'CFR-211.160'],
    ['MTH-STER', 'STER-01', 'Sterility test', 'microbiology', 'CFR-211.160'],
    ['MTH-VISC', 'VISC-01', 'Viscosity, rotational', 'titration', 'CFR-211.160'],
    ['MTH-IMP', 'IMP-HPLC', 'Related substances by HPLC', 'HPLC', 'CFR-211.160'],
    ['MTH-HARD', 'HARD-01', 'Tablet hardness', 'UV', 'CFR-211.160'],
  ];
  for (const [method_id, code, title, technique, compendial_ref] of METHODS) {
    qms.test_methods.push({ method_id, code, title, technique, compendial_ref });
  }

  /** Attributes tested at release, by dosage form. */
  const ATTRS_BY_CAP: Record<string, [string, string, number | null, number | null, string][]> = {
    tablet: [['assay', 'MTH-ASSAY', 95, 105, '%'], ['dissolution', 'MTH-DISS', null, null, '%'], ['uniformity', 'MTH-UNIF', 85, 115, '%'], ['water', 'MTH-WATER', 0, 5, '%'], ['micro', 'MTH-MICRO', 0, 1000, 'CFU/g']],
    capsule: [['assay', 'MTH-ASSAY', 95, 105, '%'], ['dissolution', 'MTH-DISS', null, null, '%'], ['uniformity', 'MTH-UNIF', 85, 115, '%'], ['water', 'MTH-WATER', 0, 7, '%'], ['micro', 'MTH-MICRO', 0, 1000, 'CFU/g']],
    liquid: [['assay', 'MTH-ASSAY', 95, 105, '%'], ['ph', 'MTH-PH', 6.0, 7.5, 'pH'], ['sterility', 'MTH-STER', 0, 0, 'CFU'], ['impurities', 'MTH-IMP', 0, 0.5, '%'], ['micro', 'MTH-MICRO', 0, 10, 'CFU/ml']],
    semisolid: [['assay', 'MTH-ASSAY', 95, 105, '%'], ['viscosity', 'MTH-VISC', 8000, 20000, 'mPa·s'], ['ph', 'MTH-PH', 4.0, 6.0, 'pH'], ['water', 'MTH-WATER', 60, 80, '%'], ['micro', 'MTH-MICRO', 0, 100, 'CFU/g']],
  };

  const specVersionOf: Record<string, string> = {}; // `${code}|${market}` → current spec_version_id
  const specLimitIndex: Record<string, Record<string, SpecLimit>> = {}; // spec_version_id → { attribute: {lo, hi} }

  for (const p of PRODUCTS) {
    for (const market of ['EU', 'US']) {
      const spec_id = market === 'EU' ? `SPEC-${p.code}` : `SPEC-${p.code}-US`;
      qms.specifications.push({ spec_id, product_ref: productOf[p.code], market, title: `${p.name} — finished product specification (${market})` });

      // IBU200 carries four EU versions and two US ones, because the headline
      // case names SPEC-IBU200-v4 and the twin names the US spec. Everything
      // else gets two and three, which is enough to make "which version" a
      // real question without inflating the table.
      const nVersions = p.code === 'IBU200' ? (market === 'EU' ? 4 : 2) : (market === 'EU' ? 3 : 2);
      let from = new Date(Date.UTC(2019, 0, 1));
      for (let v = 1; v <= nVersions; v++) {
        const spec_version_id = `${spec_id}-v${v}`;
        const last = v === nVersions;
        const to = last ? null : iso(addDays(addMonths(from, int(14, 26)), -1));
        qms.specification_versions.push({
          spec_version_id, spec_id, version: v,
          effective_from: iso(from), effective_to: to,
          standard_ref: INGREDIENTS.find((i) => i.id === `ING-API-${p.code.slice(0, 3)}`)?.mono ?? null,
        });

        specLimitIndex[spec_version_id] = {};
        for (const [attribute, method_id, lo, hi, unit] of ATTRS_BY_CAP[p.cap]) {
          let lower = lo, upper = hi;
          if (attribute === 'dissolution') {
            // THE MARKET DIFFERENCE THAT MAKES T6 BITE. The EU authorisation
            // for ibuprofen 200 mg carries Q ≥ 80% at 45 min; the US one 75%.
            // A result of 78% passes one and fails the other, and the only way
            // to know which applies is the LOT's market — not the product's.
            lower = market === 'EU' ? 80 : 75;
            upper = null;
          }
          qms.spec_limits.push({ spec_version_id, method_id, attribute, lower_limit: lower, upper_limit: upper, unit });
          specLimitIndex[spec_version_id][attribute] = { lo: lower, hi: upper, method_id, unit };
        }
        if (last) specVersionOf[`${p.code}|${market}`] = spec_version_id;
        if (!last) from = addDays(new Date(`${to}T00:00:00Z`), 1);
      }
    }
  }

  for (const p of PRODUCTS) {
    for (const market of ['EU', 'US']) {
      erp.market_authorisations.push({
        ma_id: `MA-${p.code}-${market}`, product_id: productOf[p.code], market,
        ma_number: market === 'EU' ? `NL/H/${int(1000, 9999)}/001` : `ANDA ${int(200000, 219999)}`,
        holder: 'Meridian Pharma B.V.', status: 'valid',
        valid_from: iso(addDays(EPOCH, -int(700, 3000))), valid_to: null,
        spec_version_ref: specVersionOf[`${p.code}|${market}`],
      });
    }
  }

  // Bill of materials: one API plus three or four excipients per product.
  const EXCIPIENTS = INGREDIENTS.filter((i) => i.kind === 'excipient').map((i) => i.id);
  for (const p of PRODUCTS) {
    const api = `ING-API-${p.code.slice(0, 3)}`;
    const chosen = [api, ...shuffle(EXCIPIENTS).slice(0, p.cap === 'liquid' ? 2 : 4)];
    for (const ingredient_id of chosen) {
      erp.bill_of_materials.push({
        product_id: productOf[p.code], ingredient_id, version: 2,
        effective_from: '2023-01-01', effective_to: null,
        qty_mg: ingredient_id === api ? num(10, 520, 3) : num(2, 180, 3),
        tolerance_pct: num(1, 5, 2),
      });
    }
  }

  // Material lots. One anchored: MLOT-2403-0017, from the supplier that gets
  // disqualified in 2026, received long before that and consumed in 2024.
  const materialLotsByIngredient: Record<string, string[]> = {};
  let mlotN = 0;
  const mlotFor = (_ingredient_id: string, received: Date): string => {
    const material_lot_id = pad(`MLOT-${campaignOf(received)}-`, ++mlotN, 4);
    return material_lot_id;
  };
  for (let i = 0; i < 120; i++) {
    const ing = pick(INGREDIENTS);
    const received = addDays(EPOCH, -int(60, 1000));
    const material_lot_id = mlotFor(ing.id, received);
    const supplier = pick(erp.suppliers);
    erp.material_lots.push({
      material_lot_id, ingredient_id: ing.id, supplier_id: supplier.supplier_id,
      received_on: iso(received), quantity_kg: num(50, 900, 3),
      coa_ref: `COA-${supplier.supplier_id}-${int(10000, 99999)}`, status: 'released',
    });
    (materialLotsByIngredient[ing.id] ??= []).push(material_lot_id);
  }
  // The anchored one, appended so its id is exactly what the plan names.
  erp.material_lots.push({
    material_lot_id: ANCHORS.badMaterialLot, ingredient_id: 'ING-API-IBU',
    supplier_id: ANCHORS.badSupplier, received_on: '2024-03-11', quantity_kg: 640.0,
    coa_ref: `COA-${ANCHORS.badSupplier}-44219`, status: 'released',
  });
  (materialLotsByIngredient['ING-API-IBU'] ??= []).push(ANCHORS.badMaterialLot);
  // A second lot of the same API from the same supplier, consumed by the other
  // affected product, so the traceability question has two arms and not one.
  erp.material_lots.push({
    material_lot_id: 'MLOT-2410-0042', ingredient_id: 'ING-API-AMX',
    supplier_id: ANCHORS.badSupplier, received_on: '2024-10-02', quantity_kg: 380.0,
    coa_ref: `COA-${ANCHORS.badSupplier}-51780`, status: 'released',
  });
  (materialLotsByIngredient['ING-API-AMX'] ??= []).push('MLOT-2410-0042');

  return { specVersionOf, specLimitIndex, materialLotsByIngredient };
}

export function buildWorld(): MasterWorld {
  const h = makeHelpers(SEED);
  const { int, pick, chance, num, shuffle } = h;

  const reg: Reg = { standards: [], standard_clauses: [], sops: [], sop_revisions: [], sop_clause_links: [], policies: [] };
  const hcm: Hcm = { departments: [], positions: [], employees: [], training_curricula: [], training_records: [], qualifications: [], signature_authority: [] };
  const erp: Erp = { suppliers: [], ingredients: [], products: [], market_authorisations: [], bill_of_materials: [], material_lots: [], product_lots: [], lot_material_consumption: [] };
  const mes: Mes = { sites: [], lines: [], equipment: [], equipment_qualification: [], work_orders: [], process_steps: [], process_parameters: [], deviations: [] };
  const qms: Qms = { specifications: [], specification_versions: [], test_methods: [], spec_limits: [], qc_tests: [], oos_investigations: [], batch_dispositions: [], capas: [], change_controls: [], audits: [], complaints: [], lab_events: [] };
  const tms: Tms = { warehouses: [], consignees: [], trucks: [], drivers: [], shipments: [], shipment_lines: [], routes: [], telematics_readings: [] };

  buildStandards(reg);

  buildSops(reg);

  const { LINE_DEFS, equipmentByLine } = buildSites(mes, int);

  const { byPos, allEmployees } = buildPeople(hcm, reg, h);

  const productOf = buildProducts(erp, h);

  const { specVersionOf, specLimitIndex, materialLotsByIngredient } = buildSpecs(qms, erp, productOf, h);

  return {
    h, reg, hcm, erp, mes, qms, tms,
    productOf, specVersionOf, specLimitIndex, equipmentByLine,
    materialLotsByIngredient, byPos, allEmployees, LINE_DEFS, PRODUCTS,
  };
}
