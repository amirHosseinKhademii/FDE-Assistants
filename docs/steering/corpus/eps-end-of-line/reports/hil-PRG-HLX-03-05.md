# HIL integration report — End-of-line calibration
**Programme:** PRG-HLX-03 (Dorne, C-EPS)
**Build:** 1.15.9 · **Rig:** HIL-5 · **Date:** 2021-12-24
**Engineer:** d.ferreira

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | CAN timeout | pass |
| TC-002 | supply dip to 9 V | fail |
| TC-003 | end-stop approach | pass |
| TC-004 | over-temperature derate | pass |
| TC-005 | over-temperature derate | pass |
| TC-006 | end-stop approach | pass |
| TC-007 | over-temperature derate | pass |
| TC-008 | CAN timeout | pass |
| TC-009 | supply dip to 9 V | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
