# HIL integration report — Steering feel
**Programme:** PRG-HLX-03 (Dorne, C-EPS)
**Build:** 3.3.3 · **Rig:** HIL-6 · **Date:** 2023-06-08
**Engineer:** s.beker

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | supply dip to 9 V | pass |
| TC-002 | parking manoeuvre | fail |
| TC-003 | parking manoeuvre | pass |
| TC-004 | over-temperature derate | pass |
| TC-005 | sensor fault injection | pass |
| TC-006 | cold start at −40 °C | pass |

## Observations

- Nothing to report.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
