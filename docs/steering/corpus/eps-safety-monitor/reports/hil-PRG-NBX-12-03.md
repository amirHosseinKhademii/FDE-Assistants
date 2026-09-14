# HIL integration report — Safety monitor
**Programme:** PRG-NBX-12 (Yarrow, R-EPS)
**Build:** 9.15.0 · **Rig:** HIL-5 · **Date:** 2022-04-17
**Engineer:** s.beker

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | end-stop approach | pass |
| TC-002 | end-stop approach | fail |
| TC-003 | CAN timeout | pass |
| TC-004 | sine sweep 0.2–4 Hz | fail |
| TC-005 | over-temperature derate | pass |
| TC-006 | over-temperature derate | pass |
| TC-007 | sine sweep 0.2–4 Hz | pass |

## Observations

- Nothing to report.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
