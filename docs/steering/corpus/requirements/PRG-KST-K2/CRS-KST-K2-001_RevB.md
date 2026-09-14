========================================================================
Kestrel Motors — CONFIDENTIAL
K2 Electric Power Steering — Customer Requirement Specification
Document: CRS-KST-K2-001     Revision: Rev B
Issued:   2026-07-30          Effective: 2026-07-30
Status: IN FORCE
========================================================================

1. SCOPE

   This specification covers the electric power steering system for the
   K2 programme (R-EPS, SUV segment).
   Start of production 2028-09-01.

2. DEFINITIONS

   shall   mandatory. Non-compliance requires a written concession.
   should  recommended. Deviation requires justification at the design review.
   must    mandatory.

   (Note: earlier sections of this document use "must" and "shall"
   interchangeably. Both are mandatory.)

3. CHANGE RECORD

   Rev A   2026-05-12   Initial issue for quotation.
   Rev B   2026-07-30   Rack force capacity raised from 7500 N to 8000 N following a kerb-strike load case review. All other requirements unchanged.

   Changed requirements are marked with a bar in the left margin.

4. REQUIREMENTS

|   | ID | § | Title | Value | Verif. | ASIL | Class |
|---|---|---|---|---|---|---|---|
| | | CR-K2-0101 | 4.1.1 | Rack force capacity | >= 8000 N | test | B | must |
|   | CR-K2-0102 | 4.1.2 | Road wheel angle range | +/- 50 deg | test | QM | must |
|   | CR-K2-0103 | 4.3.1 | On-centre steering wheel torque | <= 2.7 Nm | test | QM | must |
|   | CR-K2-0104 | 4.3.2 | On-centre torque hysteresis | <= 0.5 Nm | test | QM | must |
|   | CR-K2-0105 | 4.1.3 | Overall steering ratio | = TBD | analysis | QM | must |
|   | CR-K2-0106 | 4.1.4 | Rack stroke | >= 152 mm | inspection | QM | must |
|   | CR-K2-0107 | 5.2.1 | Maximum supply current | <= 110 A | test | QM | must |
|   | CR-K2-0108 | 6.1.1 | System mass | <= 12.4 kg | inspection | QM | should |
|   | CR-K2-0109 | 7.1.1 | Minimum operating temperature | = -40 C | test | QM | must |
|   | CR-K2-0110 | 8.1.1 | Safety goal — unintended assist torque |   | analysis | D | must |
|   | CR-K2-0111 | 8.1.2 | Safety goal — loss of assist |   | analysis | C | must |
|   | CR-K2-0112 | 9.1.1 | Process capability |   | review | QM | must |
|   | CR-K2-0113 | 9.2.1 | Cybersecurity |   | review | QM | must |
|   | CR-K2-0114 | 5.3.1 | Diagnostic interface |   | test | QM | must |
|   | CR-K2-0115 | 5.4.1 | End-of-line calibration |   | test | QM | must |
|   | CR-K2-0116 | 6.2.1 | Lifetime | >= 1500000 cycles | test | QM | must |
|   | CR-K2-0117 | 4.4.1 | NVH limit | <= 52 dB | test | QM | should |
|   | CR-K2-0118 | 8.2.1 | Manual steering fallback |   | test | C | must |
|   | CR-K2-0119 | 4.2.3 | Assist cut-off speed | <= 180 km/h | test | QM | should |
|   | CR-K2-0120 | 4.3.3 | Return-to-centre accuracy | <= 3 deg | test | QM | should |
|   | CR-K2-0121 | 7.1.2 | Maximum operating temperature | = 85 C | test | QM | must |
|   | CR-K2-0122 | 10.1.1 | Piece price target | <= 268 EUR | review | QM | must |
|   | CR-K2-0123 | 10.2.1 | Warranty performance | <= 25 ppm | review | QM | should |
|   | CR-K2-0124 | 11.1.1 | Start of production |   | review | QM | must |


4.9 ADDITIONAL — STEERING EFFORT (added at the Rev B review)

    The steering wheel torque at 30 degrees of steering wheel angle shall not
    exceed 2.9 Nm.

    [NOTE: this restates §4.3.1 with a different figure. §4.3.1 says 2.7 Nm.
     Raised with the customer 2026-08-20, no response at time of issue.]


5. VERIFICATION

   Verification method per requirement is given above. Where the method is
   "test", the supplier shall provide a test report referencing this
   document and the requirement identifier.

END OF DOCUMENT
