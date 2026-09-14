# HIL integration report — Diagnostics
**Programme:** PRG-CHV-07 (Gorse, C-EPS)
**Build:** 6.6.7 · **Rig:** HIL-1 · **Date:** 2020-09-04
**Engineer:** p.strand

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | fail |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | over-temperature derate | fail |
| TC-004 | parking manoeuvre | pass |
| TC-005 | over-temperature derate | pass |
| TC-006 | parking manoeuvre | pass |
| TC-007 | step input at 60 km/h | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2024-0161.
