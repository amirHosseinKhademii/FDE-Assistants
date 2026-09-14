/**
 * ONE REAL ASSESSMENT, CAPTURED. Generated — do not edit by hand.
 *
 * Written by `pnpm steering:worked-example CR-K2-0101` on 2026-09-14. It is what the
 * loop said on ONE occasion, not what it always says; the eval suite under
 * `docs/steering/evals/` is where reliability is answered.
 */
import type { WorkedExample } from './worked-example';

export const WORKED: WorkedExample | null = {
  "ref": "CR-K2-0101",
  "requirement": {
    "ref": "CR-K2-0101",
    "section": "4.1.1",
    "title": "Rack force capacity",
    "text": "The steering system shall deliver a peak rack force of at least 8000 N at 20 °C and 13.5 V supply.",
    "attribute": "rack_force_capacity",
    "unit": "N",
    "asil": "B",
    "priority": "must",
    "verificationMethod": "test",
    "revision": "Rev B",
    "specTitle": "K2 Electric Power Steering — Customer Requirement Specification",
    "programme": "PRG-KST-K2"
  },
  "assessment": {
    "requirement_ref": "CR-K2-0101",
    "finding": "change_needed",
    "reasoning": "CR-K2-0101 is specified in the programme (CRS and system requirements) with verification by test and the supplier is required to provide a test report, but I find no test report in the programme documents demonstrating the 8000 N result. The requirements set also contain an unresolved ambiguity about whether the figure is measured at the rack or at the motor, which must be resolved before claiming the requirement is demonstrated.",
    "citations": [
      {
        "file": "requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md",
        "line": 16,
        "quote": "The EPS assembly shall deliver at least 8000 N at the rack. Motor and gearbox output shall exceed this by the internal friction losses between motor and rack.\n\n- attribute: rack_force_capacity [N]\n- ASIL: B · verification: test · owner: systems\n- traces to: CR-K2-0101\n- rationale: CR-K2-0101 plus the motor-to-rack friction budget. The customer figure is AT THE RACK, so the gearbox must be sized above it."
      },
      {
        "file": "requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md",
        "line": 33,
        "quote": "|   | ID | § | Title | Value | Verif. | ASIL | Class |\n|---|---|---|---|---|---|---|---|\n| | | CR-K2-0101 | 4.1.1 | Rack force capacity | >= 8000 N | test | B | must |"
      },
      {
        "file": "requirements/PRG-KST-K2/CRS-KST-K2-001_RevA.md",
        "line": 33,
        "quote": "| 1. Rack force capacity. The system should achieve 7.5kN, peak, 20 °C, 13.5 V. (test, ASIL B)"
      },
      {
        "file": "requirements/PRG-KST-K2/CRS-KST-K2-001_RevA.md",
        "line": 83,
        "quote": "5. VERIFICATION\n\n   Verification method per requirement is given above. Where the method is\n   \"test\", the supplier shall provide a test report referencing this\n   document and the requirement identifier.\n\nEND OF DOCUMENT"
      },
      {
        "file": "requirements/PRG-KST-K2/review-notes-PRG-KST-K2.md",
        "line": 10,
        "quote": "2. The rack force figure is stated at the rack in §4.1 and at the motor in §5.2. These are not the same number and the document does not say which governs."
      },
      {
        "file": "requirements/PRG-KST-K2/architecture-PRG-KST-K2.md",
        "line": 43,
        "quote": "| EL-K2-MOT-01 | EL-K2-GEAR-01 | mechanical | assist torque | — ms | B |\n| EL-K2-GEAR-01 | EL-K2-RACK-01 | mechanical | rack force | — ms | B |"
      }
    ],
    "unverified_claims": [
      "No supplier test report demonstrating CR-K2-0101 (>= 8000 N) was found in the programme documents returned by the search."
    ],
    "conflicts": [
      {
        "about": "measurement point for the required 8000 N (at the rack vs at the motor)",
        "positions": [
          {
            "says": "The EPS assembly shall deliver at least 8000 N at the rack. Motor and gearbox output shall exceed this by the internal friction losses between motor and rack.\n\n- attribute: rack_force_capacity [N]\n- ASIL: B · verification: test · owner: systems\n- traces to: CR-K2-0101\n- rationale: CR-K2-0101 plus the motor-to-rack friction budget. The customer figure is AT THE RACK, so the gearbox must be sized above it.",
            "citation": {
              "file": "requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md",
              "line": 16,
              "quote": "The EPS assembly shall deliver at least 8000 N at the rack. Motor and gearbox output shall exceed this by the internal friction losses between motor and rack.\n\n- attribute: rack_force_capacity [N]\n- ASIL: B · verification: test · owner: systems\n- traces to: CR-K2-0101\n- rationale: CR-K2-0101 plus the motor-to-rack friction budget. The customer figure is AT THE RACK, so the gearbox must be sized above it."
            }
          },
          {
            "says": "The rack force figure is stated at the rack in §4.1 and at the motor in §5.2. These are not the same number and the document does not say which governs.",
            "citation": {
              "file": "requirements/PRG-KST-K2/review-notes-PRG-KST-K2.md",
              "line": 10,
              "quote": "2. The rack force figure is stated at the rack in §4.1 and at the motor in §5.2. These are not the same number and the document does not say which governs."
            }
          }
        ]
      }
    ],
    "cost": {
      "comparable_jobs": 0,
      "median_hours": null,
      "eur": null,
      "refused_because": "Only 0 past job(s) match change_class = \"validation_only\", element_kind = \"mechanical\", asil = \"B\", safety_case_impact = false, tooling_required = false, out of 203 with attributable hours. Fewer than 3 is not enough for a median to mean anything, so there is no price. What each part of the filter costs you — safety_case_impact: 146 on its own, 0 without it · asil: 43 on its own, 0 without it · change_class: 19 on its own, 0 without it · element_kind: 17 on its own, 0 without it. Those are COUNTS, not prices: a median over a wider set is a different number about different work, and dropping a field that matters to this requirement would produce a confident wrong answer. Drop one only if it is genuinely irrelevant here, and say which you dropped. This needs a bottom-up estimate from somebody who has done one; history cannot help and should not be made to look like it can."
    },
    "decisions_for_human": [
      {
        "question": "Should the 8000 N requirement be interpreted and verified 'at the rack' (as SR-EPS-0407 and RevA's wording indicate) or 'at the motor' (as the review notes warn §5.2 may imply)?",
        "why_it_matters": "Whether the value is measured at the rack or motor changes sizing and test procedure (gearbox friction margin), impacts whether existing hardware meets the requirement, and thus whether a simple validation test suffices or a redesign is needed.",
        "suggested_owner": "systems engineering"
      },
      {
        "question": "Are the explicit test conditions (20 °C, 13.5 V) from CRS Rev A still required for the verification, and should they be re-inserted into the Rev B text/test protocol?",
        "why_it_matters": "Test conditions define the load point to be demonstrated; missing or different conditions change the test setup and the measured outcome, affecting pass/fail and test cost.",
        "suggested_owner": "test engineering / project manager"
      },
      {
        "question": "Is a supplier-provided test report (per the CRS verification clause) acceptable evidence, or does the programme require witnessed or third‑party validation?",
        "why_it_matters": "Acceptance of supplier test reports reduces programme test scope and cost; requiring witnessed/third-party tests increases schedule, oversight, and cost.",
        "suggested_owner": "project manager / quality"
      }
    ]
  },
  "citations": {
    "corrected": 5,
    "exact": 3,
    "unresolved": []
  },
  "run": {
    "turns": 7,
    "toolCalls": 6,
    "ms": 76758,
    "engine": "agents-sdk",
    "stoppedBecause": "model_finished",
    "schemaRetries": 0
  },
  "trace": [
    {
      "name": "search_documents",
      "summary": "10 passage(s) from 4 file(s): requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md, requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md",
      "ms": 1487,
      "ok": true
    },
    {
      "name": "search_documents",
      "summary": "0 passage(s) from 0 file(s): ",
      "ms": 934,
      "ok": true
    },
    {
      "name": "search_documents",
      "summary": "10 passage(s) from 5 file(s): requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md, requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md",
      "ms": 2092,
      "ok": true
    },
    {
      "name": "search_documents",
      "summary": "10 passage(s) from 4 file(s): requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md, requirements/PRG-KST-K2/CRS-KST-K2-001_RevA.md",
      "ms": 1389,
      "ok": true
    },
    {
      "name": "search_documents",
      "summary": "10 passage(s) from 4 file(s): requirements/PRG-KST-K2/CRS-KST-K2-001_RevA.md, requirements/PRG-KST-K2/CRS-KST-K2-001_RevB.md",
      "ms": 1523,
      "ok": true
    },
    {
      "name": "find_comparable_work",
      "summary": "ok",
      "ms": 2455,
      "ok": true
    }
  ],
  "measuredBy": "pnpm steering:worked-example CR-K2-0101",
  "measuredAt": "2026-09-14"
};
