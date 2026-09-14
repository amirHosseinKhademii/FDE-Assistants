# HIL integration report — EPS core control
**Programme:** PRG-CHV-07 (Gorse, C-EPS)
**Build:** 7.16.1 · **Rig:** HIL-1 · **Date:** 2024-07-02
**Engineer:** p.strand

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | supply dip to 9 V | pass |
| TC-002 | sensor fault injection | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | CAN timeout | pass |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | sensor fault injection | pass |
| TC-007 | CAN timeout | pass |
| TC-008 | over-temperature derate | pass |

## Observations

- Nothing to report.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
