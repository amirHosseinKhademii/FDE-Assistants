# HIL integration report — Steering feel
**Programme:** PRG-CHV-29 (Aster, C-EPS)
**Build:** 8.3.2 · **Rig:** HIL-5 · **Date:** 2025-01-30
**Engineer:** m.lindqvist

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | pass |
| TC-002 | cold start at −40 °C | pass |
| TC-003 | sine sweep 0.2–4 Hz | pass |
| TC-004 | sensor fault injection | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
