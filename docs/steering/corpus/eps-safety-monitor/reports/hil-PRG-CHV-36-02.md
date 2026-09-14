# HIL integration report — Safety monitor
**Programme:** PRG-CHV-36 (Borea, DP-EPS)
**Build:** 2.17.9 · **Rig:** HIL-3 · **Date:** 2025-12-23
**Engineer:** j.moreau

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | sine sweep 0.2–4 Hz | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | parking manoeuvre | pass |
| TC-006 | sensor fault injection | pass |
| TC-007 | end-stop approach | pass |
| TC-008 | sensor fault injection | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
