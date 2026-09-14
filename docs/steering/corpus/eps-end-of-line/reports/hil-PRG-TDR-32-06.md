# HIL integration report — End-of-line calibration
**Programme:** PRG-TDR-32 (Ulric, R-EPS)
**Build:** 3.6.8 · **Rig:** HIL-2 · **Date:** 2022-10-26
**Engineer:** j.moreau

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | CAN timeout | pass |
| TC-002 | end-stop approach | fail |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | parking manoeuvre | pass |
| TC-005 | sensor fault injection | pass |
| TC-006 | step input at 60 km/h | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
