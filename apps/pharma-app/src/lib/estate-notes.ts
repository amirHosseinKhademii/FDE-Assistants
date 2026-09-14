/**
 * What each table actually holds, in a sentence.
 *
 * HAND-WRITTEN, AND IT HAS TO BE. `estate.generated.ts` knows a table is called
 * `lot_material_consumption` and has four columns; it cannot know that the rows
 * are what ties a finished batch to the supplier's material that went into it,
 * which is the only reason anyone opens that table. Structure is measurable and
 * meaning is not, so one is generated and the other is written.
 *
 * THE TYPE IS THE CHECK. `Record<EstateTableKey, string>` is exhaustive over the
 * generated union, so a table added to the estate without a note here is a
 * FAILING TYPECHECK, and a note for a table that has been dropped is too. There
 * is no separate script to remember to run, and no way for the page to quietly
 * describe an estate that has moved on.
 *
 * VOICE: what a reviewer would say, not what the schema says. "Who signed, and
 * whether they were allowed to" rather than "signature authority records". The
 * column names are on the card already for anyone who wants them.
 */
import type { EstateTableKey } from './estate.generated';

export const NOTES: Record<EstateTableKey, string> = {
  // ── mrd_reg — the rules, and when each one was in force ──────────────────
  'mrd_reg.standards':
    'The outside rulebooks: 21 CFR 211, EU GMP annexes, ICH guidelines, USP monographs.',
  'mrd_reg.standard_clauses':
    'The individual clauses a finding can cite, so a blocker points at a rule and not a document.',
  'mrd_reg.sops': "Meridian's own procedures — what each one governs and who owns it.",
  'mrd_reg.sop_revisions':
    'Every revision with the dates it was in force. This is the table the as-of question turns on.',
  'mrd_reg.sop_clause_links': 'Which external clause each procedure revision implements.',
  'mrd_reg.policies': 'Site-level policy documents, their scope and their owner.',

  // ── mrd_hcm — who may do what, and on which day ──────────────────────────
  'mrd_hcm.departments': 'The eight departments, their function and their head.',
  'mrd_hcm.positions': 'Job titles, and which of them are GMP-critical.',
  'mrd_hcm.employees': 'The sixty people, their position, their site and their dates.',
  'mrd_hcm.qualifications':
    'Registrations that let a person act — a QP registration, and the day it expires.',
  'mrd_hcm.training_records':
    'Every course completed and when it lapses. A lapsed refresher is what blocks the headline batch.',
  'mrd_hcm.training_curricula': 'The courses themselves, their validity period and who must hold them.',
  'mrd_hcm.signature_authority': 'Who is permitted to sign what, granted on, revoked on.',

  // ── mrd_erp — what was made, and what went into it ───────────────────────
  'mrd_erp.products': 'The twelve products: dosage form, strength, status.',
  'mrd_erp.ingredients': 'Actives and excipients, with their CAS numbers and compendial references.',
  'mrd_erp.bill_of_materials': 'What goes into each product, in what quantity, under which version.',
  'mrd_erp.suppliers': 'Who supplies the material — and the day any of them was disqualified.',
  'mrd_erp.material_lots': 'Incoming material by lot: who supplied it, when it arrived, its status.',
  'mrd_erp.product_lots': 'The ninety-four finished batches, their campaign, market and expiry.',
  'mrd_erp.lot_material_consumption':
    'Which material lot went into which batch. The trace a supplier disqualification follows.',
  'mrd_erp.market_authorisations':
    'Permission to sell a product in a market, and which specification version applies there.',

  // ── mrd_mes — the execution record of the run that made it ───────────────
  'mrd_mes.sites': 'The two manufacturing sites and their GMP certificates.',
  'mrd_mes.lines': 'Production lines, their room and cleanroom grade.',
  'mrd_mes.equipment': 'The machines on each line.',
  'mrd_mes.equipment_qualification':
    'When each machine was qualified and until when — checked against the day the step ran.',
  'mrd_mes.work_orders': 'The batch records: one run per batch, start, end, and who signed it.',
  'mrd_mes.process_steps': 'Every step of every run, who performed it and who verified it.',
  'mrd_mes.process_parameters': 'The readings taken at each step, against their limits.',
  'mrd_mes.deviations': 'Anything that went wrong on the floor, its severity and whether it was closed.',

  // ── mrd_qms — the tests, the decisions, and what was done about them ─────
  'mrd_qms.specifications': 'What a product must meet, per market.',
  'mrd_qms.specification_versions':
    'Each version of a specification with the dates it applied. Two batches can be judged differently.',
  'mrd_qms.spec_limits': 'The numeric limits themselves — the pass mark for every attribute.',
  'mrd_qms.test_methods': 'The laboratory methods, their technique and compendial reference.',
  'mrd_qms.qc_tests': 'Every test run on every batch: result, analyst, and the version it was judged against.',
  'mrd_qms.lab_events': 'The audit trail behind a test — every retest, reason and re-integration.',
  'mrd_qms.oos_investigations':
    'Out-of-specification results and what was found. A retest without one of these is a finding.',
  'mrd_qms.batch_dispositions': 'The release decision itself: who certified the batch, on what day, under which procedure.',
  'mrd_qms.capas': 'Corrective actions: what opened them, who owns them, whether they are still open.',
  'mrd_qms.change_controls': 'Changes to a procedure, and who approved them.',
  'mrd_qms.audits': 'Internal and supplier audits, and their outcome.',
  'mrd_qms.complaints': 'What came back from the market, and against which batch.',

  // ── mrd_tms — where it went and how cold it was kept ─────────────────────
  'mrd_tms.warehouses': 'Where finished stock sits, and the licence that lets it.',
  'mrd_tms.consignees': 'Who receives it — a hospital, a pharmacy chain, a distributor.',
  'mrd_tms.shipments': 'Each dispatch: warehouse, consignee, truck, driver, dates.',
  'mrd_tms.shipment_lines': 'What was on the truck, at batch granularity.',
  'mrd_tms.routes': 'Each leg of the journey, departed and arrived.',
  'mrd_tms.trucks': 'The fleet, and which vehicles are refrigerated.',
  'mrd_tms.drivers': 'Who drove.',
  'mrd_tms.telematics_readings':
    'Temperature every step of the way. The gaps in it matter as much as the readings.',

  // ── mrd_kb — not a system of record ──────────────────────────────────────
  'mrd_kb.documents': 'The written procedures themselves, in full text.',
  'mrd_kb.document_chunks': 'Those documents cut up and embedded, so they can be searched by meaning.',
  'mrd_kb.document_relations': 'Which revision supersedes which.',
  'mrd_kb.ask_history': 'Questions asked on this site, and what came back. Rebuilt from nothing if dropped.',
};
