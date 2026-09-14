# HIL integration report — Motor current control
**Programme:** PRG-KAI-20 (Pellon, P-EPS)
**Build:** 2.18.9 · **Rig:** HIL-1 · **Date:** 2023-06-22
**Engineer:** s.beker

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | fail |
| TC-002 | sine sweep 0.2–4 Hz | pass |
| TC-003 | parking manoeuvre | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | sine sweep 0.2–4 Hz | pass |
| TC-006 | CAN timeout | pass |
| TC-007 | supply dip to 9 V | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.

## Follow-up

Raised as CHR-2022-0169.
