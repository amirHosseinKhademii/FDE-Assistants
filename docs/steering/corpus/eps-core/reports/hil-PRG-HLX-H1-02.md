# HIL integration report — EPS core control
**Programme:** PRG-HLX-H1 (H1, R-EPS)
**Build:** 7.4.7 · **Rig:** HIL-1 · **Date:** 2025-03-31
**Engineer:** m.lindqvist

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | parking manoeuvre | pass |
| TC-002 | parking manoeuvre | pass |
| TC-003 | CAN timeout | pass |
| TC-004 | sensor fault injection | pass |

## Observations

- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.

## Follow-up

Raised as CHR-2022-0022.
