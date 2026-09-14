# HIL integration report — EPS core control
**Programme:** PRG-ORV-35 (Brix, P-EPS)
**Build:** 2.2.0 · **Rig:** HIL-6 · **Date:** 2020-12-22
**Engineer:** e.palmer

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sine sweep 0.2–4 Hz | pass |
| TC-002 | cold start at −40 °C | pass |
| TC-003 | step input at 60 km/h | fail |
| TC-004 | step input at 60 km/h | pass |
| TC-005 | end-stop approach | pass |
| TC-006 | step input at 60 km/h | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
- Nothing to report.
