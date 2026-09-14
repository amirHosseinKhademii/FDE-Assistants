# HIL integration report — EPS core control
**Programme:** PRG-TDR-19 (Kestra, C-EPS)
**Build:** 9.0.2 · **Rig:** HIL-6 · **Date:** 2021-01-09
**Engineer:** d.ferreira

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | end-stop approach | fail |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | supply dip to 9 V | pass |
| TC-007 | step input at 60 km/h | pass |
| TC-008 | parking manoeuvre | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.

## Follow-up

Raised as CHR-2025-0034.
