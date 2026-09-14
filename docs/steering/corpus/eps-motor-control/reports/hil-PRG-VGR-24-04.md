# HIL integration report — Motor current control
**Programme:** PRG-VGR-24 (Gale, C-EPS)
**Build:** 5.7.0 · **Rig:** HIL-3 · **Date:** 2022-12-30
**Engineer:** e.palmer

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | supply dip to 9 V | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | sine sweep 0.2–4 Hz | pass |
| TC-006 | sine sweep 0.2–4 Hz | pass |
| TC-007 | step input at 60 km/h | pass |
| TC-008 | parking manoeuvre | pass |
| TC-009 | CAN timeout | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
