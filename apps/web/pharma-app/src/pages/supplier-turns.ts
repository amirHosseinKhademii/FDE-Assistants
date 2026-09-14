/**
 * The supplier-impact question, hop by hop — the words, not the drawing.
 *
 * THE SIBLING `release-turns.ts` PREDICTED. Same shell, same three lanes, same
 * rule that a turn is one request to the model. Only the content differs, which
 * is the whole reason `Journey` takes its turns as a prop.
 *
 * ══ WHERE EVERY NUMBER HERE COMES FROM, AND WHERE THE GAPS ARE ════════════
 *
 * This tab was a placeholder until today, and its placeholder said why: the
 * release walk is worth reading only because every payload on it was copied
 * from a recorded run, and writing this one from what the tools PROBABLY return
 * would have made both of them guesses. That has now changed, but only partly,
 * and the difference is stated rather than smoothed over.
 *
 *   ONE RUN, NOT AN AVERAGE, and it is a real question asked on this site
 *   rather than an eval: `ask_history` row 22, 2026-09-12T23:02:36Z, engine
 *   `mastra`. Three turns, two tool calls, 80.0s end to end, 20,646 input
 *   tokens (14,336 of them billed as cached) and 11,593 output, $0.025. Every
 *   timing and count below is from that row.
 *
 *   THE TOOL ARGUMENTS ARE THE ONES THE MODEL ACTUALLY CHOSE. An earlier draft
 *   of this file left the `search_procedures` query blank, on the grounds that
 *   the eval baselines record which tools were called and not their arguments.
 *   That was true of the baselines and false of the system: `api.supplier.tsx`
 *   stores the RAW events, arguments included, in `ask_history` — which is the
 *   whole reason it stores raw events rather than rendered sentences. The query
 *   string shown is copied from that row.
 *
 *   THE TOOL RESULT is exact and reproducible without spending anything.
 *   `pnpm db:supplier-impact SUP-04` calls no model and reads the estate
 *   directly, so every figure in that payload — 23 lots, 3,768,955 units, 19
 *   deliveries, the 5/6/12 split — can be checked against your own data.
 *
 * ══ WHY THE CROSSING IS SMALL, WHICH IS THE POINT ═════════════════════════
 *
 * The walk reads five tables across two of the six systems and reduces 23 lots
 * to a ranked list. Only the reduced list crosses. This is the same argument the
 * release tab makes, and it is stronger here: the model never sees a shipment
 * row, a customer address or a material lot record — it sees exposure bands and
 * finding codes that the tool already derived.
 */
import type { Turn } from '../components/flow/Journey';

export const SUPPLIER_TURNS: Turn[] = [
  {
    label: 'Turn 1',
    note: 'The question goes out with the tools it is allowed to call. Nothing about the estate has been read yet — the model is choosing what to ask for, not being handed it.',
    crosses: true,
    hops: [
      {
        where: 'browser',
        title: 'The reviewer asks',
        payload:
          'SUP-04 was disqualified — what did we make with their material, and where did it go?',
        detail:
          'One supplier id and a sentence. The supplier is picked from a list in the browser and never searched for: two supplier ids one character apart are different companies.',
      },
      {
        where: 'yours',
        title: 'The guard runs before anything else',
        payload: 'authorize({ configuredKey, presentedKey, isDev })',
        detail:
          'Fail-closed. No key configured means refuse, not allow. This happens before the body is parsed, before a database is opened and before a token is spent.',
      },
      {
        where: 'crosses',
        title: 'The question and the tool definitions cross',
        payload:
          'POST /openai/deployments/gpt-5-mini/chat/completions\n{\n  "store": false,\n  "messages": [ system prompt, the question ],\n  "tools": [ "assess_supplier_impact", "search_procedures" ]\n}',
        ms: '20,646 input tokens · 14,336 cached',
        detail:
          'store: false is asserted by pnpm compliance:check, which captures the real outgoing request rather than trusting the setting. The model receives tool NAMES and argument shapes — never a connection string, a schema or a table.',
      },
      {
        where: 'back',
        title: 'It asks for the assessment',
        payload: 'assess_supplier_impact({ supplier_id: "SUP-04" })',
        detail:
          'One exact id, not a search. The model cannot widen this to "suppliers like Silverbrook" — the tool takes an id and nothing else.',
      },
    ],
  },
  {
    label: 'Turn 2',
    note: 'The expensive part, and none of it crosses. Five tables across two systems are read in your own network, and what goes back is the conclusion, not the records.',
    crosses: true,
    hops: [
      {
        where: 'yours',
        title: 'Two systems of record are walked',
        payload:
          "mrd_erp.suppliers      → who they are, disqualified when and why\nmrd_erp.material_lots  → 19 deliveries from them\nmrd_erp.product_lots   → 23 finished lots built from those\nmrd_tms.shipments      → where each of those 23 went\nmrd_erp.ingredients    → which product used which material",
        ms: '474ms · reads only',
        detail:
          'Separate databases on separate credentials, which is why no single query answers this. Every statement is a read — pnpm pharma:sql-check scans every SQL string reachable from the tools, the agent, the CLI and the evals, and plants writes to prove it can still catch one.',
      },
      {
        where: 'yours',
        title: 'The tool does the ranking, not the model',
        payload:
          'exposure order: patient_facing → distributor → in_transit → in_our_control → expired\nthen by quantity within each band',
        detail:
          'Ranking is comparative and deterministic, so it is done in code where it can be tested. The model is never asked which lot is worse — it is handed the order and forbidden from changing it.',
      },
      {
        where: 'yours',
        title: 'What the tool returns, verbatim',
        payload:
          '{\n' +
          '  "assessedOn": "2026-09-12",\n' +
          '  "supplier": {\n' +
          '    "supplierId": "SUP-04",\n' +
          '    "name": "Silverbrook Synthesis Co.",\n' +
          '    "country": "IN",\n' +
          '    "qualifiedFrom": "2018-10-19",\n' +
          '    "disqualifiedOn": "2026-05-20",\n' +
          '    "disqualifiedReason": "Critical finding at supplier audit AUD-26-0003: undeclared change of synthesis route and incomplete elemental impurity data. Disqualified pending remediation."\n' +
          '  },\n' +
          '  "materials": {\n' +
          '    "total": 19,\n' +
          '    "inStockUnused": 14,\n' +
          '    "receivedAfterDisqualification": [\n' +
          '      "MLOT-2606-0055"\n' +
          '    ],\n' +
          '    "notQuarantined": [\n' +
          '      "MLOT-2402-0097",\n' +
          '      "MLOT-2405-0047",\n' +
          '      "MLOT-2405-0039",\n' +
          '      "MLOT-2406-0002",\n' +
          '      "MLOT-2407-0048",\n' +
          '      "MLOT-2501-0106",\n' +
          '      "MLOT-2501-0053",\n' +
          '      "MLOT-2503-0042",\n' +
          '      "MLOT-2505-0092",\n' +
          '      "MLOT-2506-0100",\n' +
          '      "MLOT-2506-0044",\n' +
          '      "MLOT-2506-0108",\n' +
          '      "MLOT-2603-0070",\n' +
          '      "MLOT-2606-0055"\n' +
          '    ]\n' +
          '  },\n' +
          '  "totals": {\n' +
          '    "lots": 23,\n' +
          '    "units": 3768955,\n' +
          '    "byExposure": {\n' +
          '      "patient_facing": 5,\n' +
          '      "distributor": 6,\n' +
          '      "in_transit": 0,\n' +
          '      "in_our_control": 12,\n' +
          '      "expired": 0\n' +
          '    }\n' +
          '  },\n' +
          '  "findings": [\n' +
          '    "MATERIAL_RECEIVED_AFTER_DISQUALIFICATION",\n' +
          '    "MATERIAL_IN_STOCK_NOT_QUARANTINED"\n' +
          '  ],\n' +
          '  "evidence": [\n' +
          '    "mrd_erp.suppliers#SUP-04",\n' +
          '    "mrd_erp.material_lots#MLOT-2606-0055"\n' +
          '  ],\n' +
          '  "affected": [\n' +
          '    {\n' +
          '      "lotId": "LOT-AMX250-2510-A",\n' +
          '      "productId": "PRD-00143",\n' +
          '      "productName": "Amoxicillin 250 mg hard capsules",\n' +
          '      "market": "US",\n' +
          '      "status": "released",\n' +
          '      "manufacturedOn": "2025-10-07",\n' +
          '      "expiryOn": "2028-10-07",\n' +
          '      "quantityUnits": 164859,\n' +
          '      "materialLotIds": [\n' +
          '        "MLOT-2604-0017"\n' +
          '      ],\n' +
          '      "exposure": "patient_facing",\n' +
          '      "deliveries": [\n' +
          '        {\n' +
          '          "shipmentId": "SHP-25-1032",\n' +
          '          "status": "delivered",\n' +
          '          "dispatchedOn": "2025-12-04",\n' +
          '          "deliveredOn": "2025-12-05",\n' +
          '          "consigneeName": "Piedmont Regional Hospital",\n' +
          '          "consigneeKind": "hospital",\n' +
          '          "consigneeCountry": "US",\n' +
          '          "quantityUnits": 32290\n' +
          '        }\n' +
          '      ],\n' +
          '      "findings": [\n' +
          '        "DELIVERED_TO_PATIENT_FACING"\n' +
          '      ],\n' +
          '      "evidence": [\n' +
          '        "mrd_erp.product_lots#LOT-AMX250-2510-A",\n' +
          '        "mrd_erp.material_lots#MLOT-2604-0017",\n' +
          '        "mrd_tms.shipments#SHP-25-1032"\n' +
          '      ]\n' +
          '    }\n' +
          '    … 22 more lots, same shape, ranked worst-exposure first\n' +
          '  ]\n' +
          '}',
        ms: '19,682 characters in full',
        detail:
          'The complete object, with one of the 23 lots shown at full depth and the other 22 elided for length — every field on them is identical in shape. This is exactly what `pnpm db:supplier-impact SUP-04` produces, which calls no model, so any line of it can be checked against your own estate in one command.',
      },
      {
        where: 'crosses',
        title: 'That object — byte for byte — is what goes out',
        payload:
          'role: "tool", name: "assess_supplier_impact"\n' +
          'content: <the JSON above, verbatim>',
        detail:
          'Nothing is added to it and nothing is expanded. Note what is in it and what is not: consignee NAMES and shipment ids are there, because the answer has to cite them; no address, no contact, no price, no contract. If a fact is not in that object, the model has no way to know it.',
      },
      {
        where: 'back',
        title: 'It asks what the procedure requires',
        payload:
          'search_procedures({\n' +
          '  query:  "supplier disqualification quarantine unused material\n' +
          '           received after disqualification prevent further use\n' +
          '           SOP-SCM-004",\n' +
          '  sop_id: "SOP-SCM-004",\n' +
          '  as_of:  "2026-05-20",\n' +
          '  k:      5\n' +
          '})',
        detail:
          'The exact call, copied from the stored run. Note as_of: it is the disqualification date, not today — the revision that governs an act is the one in force when it happened. Note also what the model asked about: the material still in stock, which is the half of this question that can still be prevented rather than remediated.',
      },
    ],
  },
  {
    label: 'Turn 3',
    note: 'The matched passages go out, the work list comes back, and it is checked before anybody sees it.',
    crosses: true,
    hops: [
      {
        where: 'yours',
        title: 'Your procedures are searched, in your database',
        payload: '5 passages from SOP-SCM-004 Rev 5 — of 50 in the index',
        ms: '1,647ms',
        detail:
          'Meaning and keyword together, over vectors in your own Postgres. The procedures were embedded once, into your own database. Only the five passages that matched are sent onward; the other 45 never leave.',
      },
      {
        where: 'crosses',
        title: 'The matched passages cross',
        payload: 'SOP-SCM-004 §6.2 · §7.2 · §7.3 — the quarantine and notification clauses',
        detail:
          'Quoted text from your own procedures, which is the one category of your data that crosses in full. It has to: the answer has to name the rule it applied, and a paraphrased rule is an ungrounded one.',
      },
      {
        where: 'back',
        title: 'The work list comes back',
        payload:
          '{\n' +
          '  "summary": "Silverbrook Synthesis Co. (SUP-04) was disqualified 2026-05-20; the assessment lists 23 finished-product lots that used their material, and five of those reached patient-facing sites (hospitals or a pharmacy chain). The single most urgent item: notify the receiving patient-facing sites listed below and escalate to the Recall coordinator, DEPT-QA for those delivered lots.",\n' +
          '  "supplier_id": "SUP-04",\n' +
          '  "supplier_name": "Silverbrook Synthesis Co.",\n' +
          '  "disqualified_on": "2026-05-20",\n' +
          '  "rows": [\n' +
          '    {\n' +
          '      "lot_id": "LOT-AMX250-2510-A",\n' +
          '      "product_name": "Amoxicillin 250 mg hard capsules",\n' +
          '      "market": "US",\n' +
          '      "quantity_units": 164859,\n' +
          '      "exposure": "patient_facing",\n' +
          '      "in_short": "Delivered to Piedmont Regional Hospital (patient-facing) \\u2014 32,290 units",\n' +
          '      "findings": [\n' +
          '        {\n' +
          '          "code": "DELIVERED_TO_PATIENT_FACING",\n' +
          '          "in_short": "Delivered to a hospital",\n' +
          '          "citations": [\n' +
          '            "mrd_erp.product_lots#LOT-AMX250-2510-A",\n' +
          '            "mrd_erp.material_lots#MLOT-2604-0017",\n' +
          '            "mrd_tms.shipments#SHP-25-1032"\n' +
          '          ]\n' +
          '        }\n' +
          '      ],\n' +
          '      "next_action": "Notify Piedmont Regional Hospital (consignee) and open a field-alert record; inform Recall coordinator, DEPT-QA",\n' +
          '      "escalate": {\n' +
          '        "reason": "Lot delivered to a patient-facing hospital (Piedmont Regional Hospital) \\u2014 QA must decide notification/field action for this delivered product.",\n' +
          '        "suggested_owner": "Recall coordinator, DEPT-QA"\n' +
          '      }\n' +
          '    }\n' +
          '    … 22 more rows\n' +
          '  ],\n' +
          '  "preventable": [\n' +
          '    "MATERIAL_RECEIVED_AFTER_DISQUALIFICATION \\u2014 quoted SOP text: \\"Goods receipt is blocked against the supplier. Material received from a supplier on or after their disqualification date should not have been accepted; where such a receipt has occurred it is quarantined on discovery and a deviation is raised under SOP-QA-007 against the receipt itself, separately from any deviation raised against the material.\\" (SOP-SCM-004 Rev 5 \\u00a76.2 Immediate actions)",\n' +
          '    "MATERIAL_IN_STOCK_NOT_QUARANTINED \\u2014 quoted SOP text: \\"All unused material from that supplier is placed in quarantine, physically and in the inventory system, irrespective of its own test results and irrespective of any prior release decision recorded against it. A material lot that has passed its own incoming testing is not thereby exempt: the basis of the disqualification is the supplier, not the consignment.\\" (SOP-SCM-004 Rev 5 \\u00a76.2 Immediate actions)"\n' +
          '  ],\n' +
          '  "missing": [],\n' +
          '  "unverified_claims": [],\n' +
          '  "escalate": {\n' +
          '    "reason": "Assessment records material received after the disqualification date (MLOT-2606-0055) and multiple supplier material lots listed as not quarantined; SOP-SCM-004 \\u00a76.2 requires preventive quarantine and deviation handling for such receipts \\u2014 QA must confirm and instruct Warehouse to quarantine and raise the required deviations.",\n' +
          '    "suggested_owner": "Recall coordinator, DEPT-QA"\n' +
          '  }\n' +
          '}',
        ms: '11,593 output tokens · 80.0s end to end · $0.025',
        detail:
          'One row per affected lot, each with its own findings, its next step and its named owner. There is no field that can say "recall it" — the contract has none, and the coherence layer rejects the sentence in prose.',
      },
      {
        where: 'yours',
        title: 'Validated before it is shown',
        payload: 'shape → coherence → render',
        detail:
          'JSON Schema checks the shape. A second layer checks sense: a row outside our control with no named human to own it is rejected, because that is the system quietly deciding.',
      },
      {
        where: 'yours',
        title: 'Recorded, in your database',
        payload: "insert into ask_history (kind, question, answer, run, trace) — kind = 'supplier'",
        detail:
          'Filed beside the release questions and tagged, so the supplier desk can never be handed a release dossier to draw. Written to mrd_kb, which is ours: a write cannot reach the six systems of record because it resolves a different connection entirely.',
      },
      {
        where: 'browser',
        title: 'The work list appears',
        payload: 'event: answer',
        detail:
          'Tool steps stream as they happen so a seventy-second walk does not look broken. The list itself is sent once, whole, after it has passed validation.',
      },
    ],
  },
];
