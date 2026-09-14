/**
 * What each table in Vantis Steering's estate holds, in a sentence.
 *
 * FIVE DATABASES, AND THE FIFTH IS OURS. The first four are the customer's
 * systems of record. `vst_derived` at the bottom is what `pnpm derived:parse` derived
 * from the 1,069 files, and its notes read differently on purpose: they say
 * what was READ and what was deliberately NOT tidied up.
 *
 * HAND-WRITTEN, AND IT HAS TO BE. `steering-estate.generated.ts` knows a table
 * is called `trace_cr_sr` and has four columns; it cannot know that those rows
 * ARE the answer to "what of this do we already have" — that the whole bid
 * question is a reachability walk over that one table. Structure is measurable
 * and meaning is not, so one is generated and the other is written.
 *
 * THE TYPE IS THE CHECK. `Record<EstateTableKey, string>` is exhaustive over the
 * generated union, so a table added to the estate without a note here is a
 * FAILING TYPECHECK, and a note for a table that has been dropped is too. The
 * steering estate is being actively worked on in another session; this is what
 * stops the page describing an estate that has moved on.
 *
 * VOICE: what a bid engineer would say, not what ASPICE calls it. "The
 * customer's requirements, as received" rather than "SYS.1 stakeholder
 * requirements". The standard's vocabulary is correct and is what the columns
 * use; the sentence is for somebody reading a web page.
 */
import type { EstateTableKey } from './estate.generated';

export const NOTES: Record<EstateTableKey, string> = {
  // ── vst_crm — who is asking, and for what car ───────────────────────────
  'vst_crm.customers': 'The OEMs, and how long we have been selling to each.',
  'vst_crm.contacts': 'Who to ask on the customer side, and what they decide.',
  'vst_crm.programs': 'Every vehicle programme: its segment, its steering architecture, its start of production.',
  'vst_crm.rfqs': 'Each request to quote — when it landed, when it is due, and whether we won it.',
  'vst_crm.rfq_specs': 'Which requirement specification, at which revision, came attached to an RFQ.',
  'vst_crm.milestones': 'Programme gates and whether they were hit on the planned day.',

  // ── vst_plm — what we actually make ─────────────────────────────────────
  'vst_plm.product_lines': 'The four steering architectures we build, and the rack force each is good for.',
  'vst_plm.parts': 'Every part: what it is, whether we make or buy it, what it costs, and whether it is still alive.',
  'vst_plm.part_capabilities': 'What a part can actually do — the numbers a requirement gets compared against.',
  'vst_plm.qualification_tests': 'The test that proves a capability, against which standard, at what condition.',
  'vst_plm.assemblies': 'The assemblies parts go into, by revision.',
  'vst_plm.bom_lines': 'What is in each assembly, and how many.',
  'vst_plm.component_suppliers': 'Who supplies the bought parts, and whether they are still approved.',
  'vst_plm.part_program_usage': 'Which programme already ships which part, and at what annual volume.',

  // ── vst_alm — the promise, the design, and the thread between them ──────
  'vst_alm.spec_documents': 'The requirement specifications customers send us.',
  'vst_alm.spec_revisions':
    'Each revision with the dates it was in force. Rev A and Rev B say different things; which governed is a date question.',
  'vst_alm.customer_requirements': "The customer's requirements as received — one row per numbered clause.",
  'vst_alm.customer_requirement_versions':
    'What each one actually demanded at a given revision: the number, the operator, the condition it holds under.',
  'vst_alm.cr_history': 'What changed in a requirement between revisions, and who changed it.',
  'vst_alm.system_requirements': 'Those turned into something testable that an engineer owns.',
  'vst_alm.system_requirement_versions': 'Each version of that, with the dates it applied and the verification method.',
  'vst_alm.trace_cr_sr':
    'Which system requirement satisfies which customer requirement. This table is the bid question — an orphan here is a gap nobody has noticed.',
  'vst_alm.architecture_versions': 'Each baseline of the system design, and the one it superseded.',
  'vst_alm.elements': 'The blocks the system is made of, their safety level, and whether we make or buy each.',
  'vst_alm.interfaces': 'What passes between two elements, how often, and at what safety level.',
  'vst_alm.activities': 'What the system has to DO — damping, assist, diagnosis — before anything is assigned to hardware.',
  'vst_alm.activity_allocations': 'Which element is on the hook for which activity, and why.',
  'vst_alm.trace_sr_element': 'Which element carries which system requirement. The other half of the thread.',
  'vst_alm.budgets':
    'A number split across contributors — on-centre torque, latency down the signal chain. It closes, or it is a finding.',
  'vst_alm.budget_allocations': 'The shares themselves: what each contributor is allowed, and on what basis.',
  'vst_alm.change_requests': 'Every change ever raised against a programme, and what was decided.',
  'vst_alm.change_request_items': 'What each change actually touched — a requirement, an element, a part.',

  // ── vst_pmo — what it cost last time ────────────────────────────────────
  'vst_pmo.effort_records':
    'What a past change really took, tagged by how big it was and what kind of thing it touched. The comparables a quote is built from.',
  'vst_pmo.effort_by_discipline': 'Those hours split by who did them — systems, software, hardware, validation.',
  'vst_pmo.rate_cards': 'What an hour of each discipline costs, by year and region.',
  'vst_pmo.quotes': 'What we quoted, what we said it would take, and what happened.',
  'vst_pmo.quote_lines': 'Each line of a quote, back to the requirement that caused it.',

  // ── vst_derived — ours, and the only rows here that were READ out of something ──
  //
  // Every note above describes a table somebody else runs. These six describe
  // what `pnpm derived:parse` produced from `docs/steering/corpus/`, and each row
  // carries the file and the line it came from — which is the whole point, and
  // the reason `file_id` and `line_no` lead every one of them. A parsed number
  // with no way back to the sentence it came from is a number you cannot argue
  // with, and on a bid somebody always argues.
  'vst_derived.source_files':
    'Every file the ingest has read, with its hash and size. The hash is what lets an unchanged file be skipped next time.',
  'vst_derived.timesheet_lines':
    'Hours booked, one row per line of a quarterly export — and NOT cleaned up. "P. Strand" and "Strand, Petra" stay two values, because deciding they are one person is a judgement somebody should be able to see and disagree with.',
  'vst_derived.document_fields':
    'Labelled values lifted out of prose documents — a Reference, a date, an owner. The label as written is kept beside the value, so a document that calls it something odd is still checkable.',
  'vst_derived.rate_card_lines': 'What an hour of each discipline cost, by year and region, read out of the rate cards.',
  'vst_derived.estimate_lines':
    'What somebody estimated a work package would take, and on what basis — a measured comparable or a guess. The basis is in the file; a table that dropped it would make every estimate look equally solid.',
  'vst_derived.quote_line_items':
    'The lines of the quotes as issued, classified by the kind of change each one was. This is the extraction that the effort tables next door are the answer key for.',

  // ── the extraction's own tables, added when `derived:extract` first ran ──
  'vst_derived.extracted_facts':
    'One row per report per question: the answer, the sentence it was read from, and the line that sentence is on. The line number is found by us, not supplied by the model, so a challenged figure traces to a file and a line rather than to a row nobody can account for.',
  'vst_derived.rejected_facts':
    'The answers that were thrown away because the sentence they quoted was not in the file. Kept rather than deleted — a rejection is the most informative thing the reading produces, and losing it means losing the reason a number moved.',
  'vst_derived.derived_effort':
    'One row per closure report, assembled from the answers above: what kind of change, what part, what safety level, how many interfaces, and the hours it took. This is the table a price is actually queried from.',
  'vst_derived.effort_totals': 'The headline hours and calendar weeks each report states for itself.',
  'vst_derived.document_chunks':
    'The prose, cut into passages that can be searched by meaning rather than by exact words. Each one keeps its heading trail — “Quotation QUO-0004 > Post-award assumptions” — so a fragment that comes back is both answerable and citable, and tables are never split from the header row that names their columns.',
  'vst_derived.effort_split_lines':
    'The same hours broken down by discipline, as the report lists them — hardware, validation, systems, pm.',
};
