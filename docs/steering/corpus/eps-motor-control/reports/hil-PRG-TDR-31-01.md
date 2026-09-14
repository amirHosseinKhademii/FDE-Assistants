# HIL integration report — Motor current control
**Programme:** PRG-TDR-31 (Lumen, DP-EPS)
**Build:** 3.2.2 · **Rig:** HIL-4 · **Date:** 2025-06-17
**Engineer:** s.beker

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | parking manoeuvre | pass |
| TC-002 | sensor fault injection | fail |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | over-temperature derate | pass |
| TC-006 | parking manoeuvre | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2023-0074.
