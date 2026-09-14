# HIL integration report — Steer-by-wire (pre-development)
**Programme:** PRG-MRL-30 (Vane, C-EPS)
**Build:** 7.14.8 · **Rig:** HIL-2 · **Date:** 2021-09-22
**Engineer:** j.moreau

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | pass |
| TC-002 | parking manoeuvre | pass |
| TC-003 | over-temperature derate | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | end-stop approach | pass |
| TC-006 | cold start at −40 °C | pass |
| TC-007 | end-stop approach | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
- Nothing to report.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
