/**
 * The release question, hop by hop — the words, not the drawing.
 *
 * SEPARATE FROM `components/flow/Journey.tsx` BECAUSE A SECOND QUESTION IS
 * COMING. Supplier impact walks different systems, calls different tools and
 * sends different payloads, but it should draw its sequence exactly the same
 * way — so the shell takes turns as data and each question supplies its own.
 * A sibling of this file is all the supplier flow needs.
 *
 * EVERY PAYLOAD BELOW IS REAL, and that is the whole reason the page is worth
 * having. Tool and argument names come from `assess-release.tool.ts` and
 * `search-procedures.tool.ts`. The 29-query count is what
 * `pnpm db:release LOT-IBU200-2609-B EU` prints. The timings (9.6s for the
 * walk, 2.1s for the search), the CERTIFIER_TRAINING_LAPSED finding and the
 * citations are from a recorded run stored in `ask_history`. A diagram with
 * invented field names is one a reviewer disproves in a single grep, and then
 * nothing else on the page survives either.
 *
 * IT IS ORGANISED BY TURN, because that is the unit that matters when the
 * question is "what did you send them". A turn is one request to the model, and
 * everything in it either crossed or did not. Organising by component would
 * hide the count — three turns means three requests, checkable against the cost
 * line the desk prints.
 *
 * THE STEPS THAT STAY GET THE SAME WEIGHT AS THE ONES THAT CROSS. Twenty-nine
 * queries run inside the network and produce findings; only the findings move.
 * Showing both is the only honest way to say "it reads a lot and sends a
 * little", and it is the most reassuring true fact available.
 */
import type { Turn } from '../components/flow/Journey';

export const RELEASE_TURNS: Turn[] = [
  {
    label: 'Before any model is involved',
    note: 'A request that is not allowed never reaches a database, let alone a model.',
    crosses: false,
    hops: [
      {
        where: 'browser',
        title: 'The reviewer asks',
        payload: 'POST /api/ask\n{ "question": "Can LOT-IBU200-2609-B be released to EU?",\n  "loop": "sdk" }',
        detail:
          'Sent as POST rather than in a URL: a query string is kept by proxies and access logs, and there would be nowhere to carry the key.',
      },
      {
        where: 'yours',
        title: 'The guard runs first',
        payload: 'authorize({ configuredKey, presentedKey, isDev })',
        detail:
          'Fail-closed. No key configured means refuse, not allow. Nothing is parsed and nothing is connected to until this passes.',
      },
    ],
  },
  {
    label: 'Turn 1 — what should I do?',
    note: 'The model is given the question and the tools it may call. No data from your systems yet.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'The question and the tool definitions go out',
        payload:
          'messages: [ system prompt, the question ]\ntools:    [ assess_release, search_procedures ]\nstore:    false',
        detail:
          'The prompt is an ordered list of rules; the tools are names, descriptions and argument shapes. No batch data has been read at this point, so none can be sent.',
      },
      {
        where: 'back',
        title: 'It asks for the assessment',
        payload: 'assess_release({\n  lot_id: "LOT-IBU200-2609-B",\n  market: "EU"\n})',
        detail:
          'The model chooses the tool and the arguments. It cannot reach a database; it can only name a tool that the loop then runs.',
      },
    ],
  },
  {
    label: 'The walk — entirely inside your network',
    note: 'This is where almost all the data is. Almost none of it leaves.',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'Twenty-nine reads across six databases',
        payload:
          'mrd_erp  product_lots · material_lots · market_authorisations · spec_limits\n' +
          'mrd_mes  batch_records · equipment · qualifications\n' +
          'mrd_qms  qc_results · batch_dispositions · deviations\n' +
          'mrd_hcm  employees · training_records · signature_authority\n' +
          'mrd_reg  sop_revisions · standard_clauses · sop_clause_links\n' +
          'mrd_tms  shipments · telematics_readings\n\n' +
          'select … only — asserted by pnpm pharma:sql-check',
        detail:
          'Six separate databases on separate connections that no single query can join, which is why this is code and not SQL. Every one of these reads happens inside your network.',
        ms: '9.6s',
      },
      {
        where: 'yours',
        title: 'Rows become findings — the reduction that matters',
        payload:
          '{\n' +
          '  "lotId": "LOT-IBU200-2609-B",\n' +
          '  "market": "EU",\n' +
          '  "product": "Ibuprofen 200 mg film-coated tablets",\n' +
          '  "governingSpecVersion": "SPEC-IBU200-v4",\n' +
          '  "basis": {\n' +
          '    "assessedOn": "2026-09-12",\n' +
          '    "builtToSpecVersion": "SPEC-IBU200-v4",\n' +
          '    "certification": {\n' +
          '      "dispositionId": "DISP-26-0001",\n' +
          '      "decidedOn": "2026-09-04",\n' +
          '      "decidedByRef": "EMP-0103",\n' +
          '      "certifier": "Eva Vos",\n' +
          '      "citedSopRevision": "SOP-QC-014 Rev 7",\n' +
          '      "governingSopRevision": "SOP-QC-014 Rev 7",\n' +
          '      "qpCertified": true\n' +
          '    }\n' +
          '  },\n' +
          '  "findings": [{\n' +
          '    "code": "CERTIFIER_TRAINING_LAPSED",\n' +
          '    "severity": "blocker",\n' +
          '    "summary": "Eva Vos (Qualified Person) signed on 2026-09-04\n' +
          '                with TRN-GMP-REF expired since 2026-08-24.",\n' +
          '    "evidence": [\n' +
          '      { "ref": "mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF)",\n' +
          '        "asOf": "2026-09-04" },\n' +
          '      { "ref": "mrd_qms.batch_dispositions#DISP-26-0001",\n' +
          '        "asOf": "2026-09-04" },\n' +
          '      { "ref": "mrd_reg.sop_revisions#SOP-QC-014 Rev 7",\n' +
          '        "asOf": "2026-09-04" }\n' +
          '    ]\n' +
          '  }],\n' +
          '  "missing": [],\n' +
          '  "releasable": false\n' +
          '}',
        detail:
          'This is the whole object, and it is worth reading for what is ABSENT. Twenty-nine queries went in; what comes out is one finding, one sentence of summary, and three references. No table contents. No employee record beyond the id and the name that appears in the finding. No connection string, no schema, no other lot. A reference like mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF) is an address you can look up yourself — it is not the row.',
      },
    ],
  },
  {
    label: 'Turn 2 — reading the rule',
    note: 'The findings cross. The rows behind them do not.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'That object — byte for byte — is what goes out',
        payload:
          'role: "tool", name: "assess_release"\n' +
          'content: <the JSON above, verbatim>',
        detail:
          'Nothing is added to it and nothing is expanded. What you read in the previous step is the complete message the model receives about your batch: 1 finding and 3 references out of 29 queries. If a fact is not in that object, the model has no way to know it.',
      },
      {
        where: 'back',
        title: 'It asks for the written procedure',
        payload:
          'search_procedures({\n  query:  "training required before certification…",\n  sop_id: null,\n  as_of:  "2026-09-04",\n  k:      null\n})',
        detail:
          'as_of is the date of the act being judged, not today. The revision that governs an act is the one in force when it happened — answering from the current revision is the easiest way to be confidently wrong.',
      },
      {
        where: 'yours',
        title: 'Hybrid search runs against your index',
        payload:
          '5 of 50 passages — top hit:\n\n' +
          'SOP-QC-014 Rev 7\n' +
          '  > 7. Disposition and certification\n' +
          '  > 7.3 Personnel precondition to certification\n\n' +
          '"…the certifying Qualified Person must hold a valid, unexpired\n' +
          ' GMP refresher training record on the date of certification. A\n' +
          ' certification made by a Qualified Person whose GMP refresher\n' +
          ' training had expired on that date is invalid. The batch does\n' +
          ' not become released…"',
        detail:
          'Meaning and keyword together, over vectors in your own Postgres. Note the revision: Rev 6 §7.3 is "Records" — a filing requirement. Rev 7 §7.3 is this rule. Searching as of the date of the act is what gets the second one. The other 45 passages are not sent.',
        ms: '2.1s',
      },
    ],
  },
  {
    label: 'Turn 3 — writing the answer',
    note: 'The last crossing. Everything after this is yours again.',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        title: 'The matched passages go out',
        payload:
          'role: "tool", name: "search_procedures"\n' +
          'content: [ 5 passages, each with its clause trail and text ]',
        detail:
          'Now the model has the facts and the rule, and can quote the clause rather than assert it from memory.',
      },
      {
        where: 'back',
        title: 'The answer comes back as structured data',
        payload:
          '{\n' +
          '  "lot_id": "LOT-IBU200-2609-B",\n' +
          '  "market": "EU",\n' +
          '  "summary": "On 2026-09-04 the Qualified Person Eva Vos signed the\n' +
          '              disposition for LOT-IBU200-2609-B, but her GMP refresher\n' +
          '              training record had expired on 2026-08-24. …",\n' +
          '  "blockers": [{\n' +
          '    "code": "CERTIFIER_TRAINING_LAPSED",\n' +
          '    "in_short": "Certifying QP\'s GMP refresher had expired on\n' +
          '                 certification date",\n' +
          '    "why_it_blocks": "SOP-QC-014 Rev 7 §7.3 requires the certifying\n' +
          '      Qualified Person to hold a valid, unexpired GMP refresher on the\n' +
          '      date of certification; a certification made by a QP whose\n' +
          '      refresher had expired is explicitly declared invalid …",\n' +
          '    "citations": [{\n' +
          '      "ref": "mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF)",\n' +
          '      "as_of": "2026-09-04",\n' +
          '      "claim": "EMP-0103\'s GMP refresher had expired before the\n' +
          '                certification date.",\n' +
          '      "detail": "Training record shows expiry_on 2026-08-24."\n' +
          '    }, … ]\n' +
          '  }],\n' +
          '  "concerns": [], "missing": [],\n' +
          '  "what_would_clear_it": [ … ],\n' +
          '  "escalate": { "reason": …, "suggested_owner": "Qualified Person,\n' +
          '                 DEPT-QA" }\n' +
          '}',
        detail:
          'Every citation carries the record it came from AND the date it was read as of, because "SOP-QC-014 Rev 7" is a different rule from Rev 6 and a reference without its date cannot be checked by the person who has to countersign. Note what the schema has no field for: there is no verdict, no score, no "releasable" — and it is strict, so one cannot be smuggled in as an extra key.',
      },
      {
        where: 'yours',
        title: 'Validated before it is shown',
        payload: 'shape → coherence → render',
        detail:
          'JSON Schema checks the shape. A second layer checks sense: a finding with no named human to own it is rejected, because that is the system quietly deciding.',
      },
      {
        where: 'yours',
        title: 'Recorded, in your database',
        payload: 'insert into ask_history (kind, question, answer, run, trace)',
        detail:
          'So the reviewer can come back to it. Written to mrd_kb, which is ours — a write cannot reach the six systems of record because it resolves a different connection entirely.',
      },
      {
        where: 'browser',
        title: 'The dossier appears',
        payload: 'event: answer',
        detail:
          'Tool steps stream as they happen so a ninety-second walk does not look broken. The answer itself is sent once, whole, after it has passed validation.',
      },
    ],
  },
];
