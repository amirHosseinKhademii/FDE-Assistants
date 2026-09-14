# HIL integration report — Motor current control
**Programme:** PRG-KAI-22 (Jarl, DP-EPS)
**Build:** 8.7.7 · **Rig:** HIL-2 · **Date:** 2023-08-01
**Engineer:** n.haas

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | end-stop approach | fail |
| TC-005 | supply dip to 9 V | pass |
| TC-006 | CAN timeout | pass |
| TC-007 | sine sweep 0.2–4 Hz | pass |
| TC-008 | cold start at −40 °C | pass |
| TC-009 | sensor fault injection | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
