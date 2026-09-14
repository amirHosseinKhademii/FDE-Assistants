# HIL integration report — Calibration tooling
**Programme:** PRG-CHV-33 (Arden, R-EPS)
**Build:** 4.9.8 · **Rig:** HIL-3 · **Date:** 2024-09-04
**Engineer:** e.palmer

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | CAN timeout | fail |
| TC-002 | parking manoeuvre | fail |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | cold start at −40 °C | pass |
| TC-005 | supply dip to 9 V | pass |
| TC-006 | end-stop approach | pass |
| TC-007 | CAN timeout | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.
