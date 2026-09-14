# HIL integration report — Safety monitor
**Programme:** PRG-TDR-01 (Delve, DP-EPS)
**Build:** 5.0.8 · **Rig:** HIL-6 · **Date:** 2025-08-28
**Engineer:** j.moreau

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sine sweep 0.2–4 Hz | pass |
| TC-002 | end-stop approach | pass |
| TC-003 | supply dip to 9 V | pass |
| TC-004 | end-stop approach | pass |
| TC-005 | supply dip to 9 V | pass |
| TC-006 | supply dip to 9 V | pass |
| TC-007 | CAN timeout | pass |
| TC-008 | parking manoeuvre | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Nothing to report.
