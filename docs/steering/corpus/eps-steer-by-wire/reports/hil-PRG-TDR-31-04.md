# HIL integration report — Steer-by-wire (pre-development)
**Programme:** PRG-TDR-31 (Lumen, DP-EPS)
**Build:** 6.6.5 · **Rig:** HIL-2 · **Date:** 2022-01-07
**Engineer:** s.beker

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | supply dip to 9 V | pass |
| TC-002 | over-temperature derate | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | CAN timeout | pass |
| TC-005 | cold start at −40 °C | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2021-0110.
