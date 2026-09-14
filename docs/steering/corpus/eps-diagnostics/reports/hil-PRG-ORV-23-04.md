# HIL integration report — Diagnostics
**Programme:** PRG-ORV-23 (Ryde, C-EPS)
**Build:** 4.1.7 · **Rig:** HIL-2 · **Date:** 2023-10-10
**Engineer:** j.moreau

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sine sweep 0.2–4 Hz | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | over-temperature derate | pass |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | sine sweep 0.2–4 Hz | pass |
| TC-007 | parking manoeuvre | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
