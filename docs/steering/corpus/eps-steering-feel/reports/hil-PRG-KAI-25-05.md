# HIL integration report — Steering feel
**Programme:** PRG-KAI-25 (Cove, DP-EPS)
**Build:** 8.2.3 · **Rig:** HIL-5 · **Date:** 2022-09-22
**Engineer:** l.renaud

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | supply dip to 9 V | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | end-stop approach | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
