# HIL integration report — Steering feel
**Programme:** PRG-KAI-20 (Pellon, P-EPS)
**Build:** 3.8.3 · **Rig:** HIL-5 · **Date:** 2022-04-30
**Engineer:** s.beker

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | pass |
| TC-002 | CAN timeout | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | end-stop approach | fail |
| TC-005 | over-temperature derate | pass |
| TC-006 | sensor fault injection | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Nothing to report.
