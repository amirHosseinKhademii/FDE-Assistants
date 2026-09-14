# HIL integration report — Calibration tooling
**Programme:** PRG-MRL-04 (Tarn, P-EPS)
**Build:** 1.16.4 · **Rig:** HIL-4 · **Date:** 2024-03-16
**Engineer:** l.renaud

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sine sweep 0.2–4 Hz | pass |
| TC-002 | parking manoeuvre | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | parking manoeuvre | pass |
| TC-005 | sine sweep 0.2–4 Hz | fail |
| TC-006 | parking manoeuvre | pass |
| TC-007 | end-stop approach | pass |
| TC-008 | step input at 60 km/h | pass |
| TC-009 | CAN timeout | fail |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.

## Follow-up

Raised as CHR-2025-0034.
