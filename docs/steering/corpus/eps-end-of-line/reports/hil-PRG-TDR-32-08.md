# HIL integration report — End-of-line calibration
**Programme:** PRG-TDR-32 (Ulric, R-EPS)
**Build:** 4.13.3 · **Rig:** HIL-2 · **Date:** 2021-02-23
**Engineer:** p.strand

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | fail |
| TC-002 | sine sweep 0.2–4 Hz | pass |
| TC-003 | CAN timeout | pass |
| TC-004 | parking manoeuvre | pass |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | CAN timeout | pass |
| TC-007 | CAN timeout | pass |

## Observations

- Nothing to report.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.

## Follow-up

Raised as CHR-2025-0171.
