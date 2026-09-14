# HIL integration report — End-of-line calibration
**Programme:** PRG-HLX-27 (Haldan, DP-EPS)
**Build:** 1.9.0 · **Rig:** HIL-5 · **Date:** 2025-05-28
**Engineer:** s.beker

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | over-temperature derate | pass |
| TC-004 | over-temperature derate | pass |
| TC-005 | end-stop approach | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Nothing to report.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2024-0043.
