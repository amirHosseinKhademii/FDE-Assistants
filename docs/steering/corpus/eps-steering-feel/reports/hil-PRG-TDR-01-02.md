# HIL integration report — Steering feel
**Programme:** PRG-TDR-01 (Delve, DP-EPS)
**Build:** 9.14.6 · **Rig:** HIL-5 · **Date:** 2020-11-24
**Engineer:** r.dietrich

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | CAN timeout | pass |
| TC-003 | step input at 60 km/h | pass |
| TC-004 | over-temperature derate | pass |
| TC-005 | sine sweep 0.2–4 Hz | pass |
| TC-006 | sine sweep 0.2–4 Hz | pass |
| TC-007 | over-temperature derate | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Nothing to report.
