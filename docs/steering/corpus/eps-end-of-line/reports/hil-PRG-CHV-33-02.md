# HIL integration report — End-of-line calibration
**Programme:** PRG-CHV-33 (Arden, R-EPS)
**Build:** 4.19.4 · **Rig:** HIL-6 · **Date:** 2023-05-27
**Engineer:** e.palmer

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | step input at 60 km/h | pass |
| TC-004 | over-temperature derate | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2024-0026.
