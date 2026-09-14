# HIL integration report — Diagnostics
**Programme:** PRG-TDR-06 (Juno, C-EPS)
**Build:** 1.7.2 · **Rig:** HIL-2 · **Date:** 2021-08-17
**Engineer:** p.strand

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | pass |
| TC-002 | CAN timeout | fail |
| TC-003 | CAN timeout | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | end-stop approach | pass |
| TC-007 | CAN timeout | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.

## Follow-up

Raised as CHR-2025-0170.
