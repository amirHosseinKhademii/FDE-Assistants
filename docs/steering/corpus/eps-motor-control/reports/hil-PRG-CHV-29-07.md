# HIL integration report — Motor current control
**Programme:** PRG-CHV-29 (Aster, C-EPS)
**Build:** 1.15.6 · **Rig:** HIL-5 · **Date:** 2021-09-09
**Engineer:** d.ferreira

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | step input at 60 km/h | pass |
| TC-002 | sensor fault injection | pass |
| TC-003 | parking manoeuvre | pass |
| TC-004 | step input at 60 km/h | pass |
| TC-005 | CAN timeout | pass |
| TC-006 | sensor fault injection | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
