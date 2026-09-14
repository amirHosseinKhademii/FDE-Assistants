# HIL integration report — EPS core control
**Programme:** PRG-TDR-31 (Lumen, DP-EPS)
**Build:** 2.3.8 · **Rig:** HIL-1 · **Date:** 2024-04-04
**Engineer:** s.beker

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | step input at 60 km/h | pass |
| TC-002 | sensor fault injection | pass |
| TC-003 | CAN timeout | pass |
| TC-004 | CAN timeout | pass |
| TC-005 | sensor fault injection | pass |
| TC-006 | step input at 60 km/h | pass |
| TC-007 | over-temperature derate | pass |
| TC-008 | CAN timeout | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
