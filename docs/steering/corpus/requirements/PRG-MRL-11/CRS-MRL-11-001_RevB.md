========================================================================
Merilo S.p.A. — CONFIDENTIAL
Ember Electric Power Steering — Customer Requirement Specification
Document: CRS-MRL-11-001     Revision: Rev B
Issued:   2022-04-06          Effective: 2022-04-06
SUPERSEDED: 2022-08-04 — see the later revision
========================================================================

1. SCOPE

   This specification covers the electric power steering system for the
   Ember programme (DP-EPS, C segment).
   Start of production TBC.

2. DEFINITIONS

   shall   mandatory. Non-compliance requires a written concession.
   should  recommended. Deviation requires justification at the design review.
   must    mandatory.

   (Note: earlier sections of this document use "must" and "shall"
   interchangeably. Both are mandatory.)

3. CHANGE RECORD

   Rev A   2021-07-12   Initial issue for quotation.
   Rev B   2022-04-06   Revision following design review.
   Rev C   2025-07-28   Revision following design review.



4. REQUIREMENTS

|   | ID | § | Title | Value | Verif. | ASIL | Class |
|---|---|---|---|---|---|---|---|
|   | CR-MRL-11-0183 | 5.4.2 | assist latency ms | >= 10.55 ms | test | QM | must |
|   | CR-MRL-11-0184 | 10.1.3 | rack force capacity | <= 9.3kN | review | C | must |
|   | CR-MRL-11-0185 | 6.3.3 | assist latency ms | <= 7.66 ms | test | B | must |
|   | CR-MRL-11-0186 | 6.1.3 | on center torque nm | <= 2.28 Nm | review | QM | must |
|   | CR-MRL-11-0187 | 9.4.3 | on center torque nm | <= 2.16 Nm | analysis | C | should |
|   | CR-MRL-11-0188 | 6.2.1 | nvh limit db | >= 48.85 dB | test | C | should |
|   | CR-MRL-11-0189 | 9.3.1 | max current a | >= 83 A | test | D | should |
|   | CR-MRL-11-0190 | 8.3.1 | on center torque nm | <= 3.31 Nm | inspection | QM | must |
|   | CR-MRL-11-0191 | 9.1.2 | max current a | >= 106 A | test | B | must |
|   | CR-MRL-11-0192 | 4.2.3 | on center torque nm | <= TBD (owner: chassis) | review | C | must |
|   | CR-MRL-11-0193 | 11.2.1 | on center hysteresis nm | >= 0.64 Nm | analysis | QM | should |
|   | CR-MRL-11-0194 | 11.1.3 | on center hysteresis nm | >= 0.39 Nm | inspection | QM | must |
|   | CR-MRL-11-0195 | 10.2.3 | rack force capacity | <= 8212 N | inspection | B | must |
|   | CR-MRL-11-0196 | 7.1.1 | on center torque nm | >= 2.61 Nm | test | D | must |
|   | CR-MRL-11-0197 | 7.3.2 | rack force capacity | <= 11.8kN | test | B | must |
|   | CR-MRL-11-0198 | 10.1.3 | mass kg | >= 9.5 kg | inspection | C | should |
|   | CR-MRL-11-0199 | 4.3.3 | on center torque nm | <= 2.91 Nm | test | QM | must |
|   | CR-MRL-11-0200 | 8.3.2 | assist latency ms | <= 9.15 ms | analysis | QM | should |



5. VERIFICATION

   Verification method per requirement is given above. Where the method is
   "test", the supplier should provide a test report referencing this
   document and the requirement identifier.

END OF DOCUMENT
