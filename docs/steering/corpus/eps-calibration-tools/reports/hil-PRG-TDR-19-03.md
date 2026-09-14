# HIL integration report — Calibration tooling
**Programme:** PRG-TDR-19 (Kestra, C-EPS)
**Build:** 2.11.8 · **Rig:** HIL-5 · **Date:** 2026-01-21
**Engineer:** m.lindqvist

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | parking manoeuvre | pass |
| TC-002 | over-temperature derate | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | step input at 60 km/h | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Nothing to report.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
