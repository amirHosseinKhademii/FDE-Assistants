# HIL integration report — Motor current control
**Programme:** PRG-CHV-33 (Arden, R-EPS)
**Build:** 5.5.5 · **Rig:** HIL-4 · **Date:** 2026-03-30
**Engineer:** a.kovac

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | pass |
| TC-002 | parking manoeuvre | pass |
| TC-003 | sensor fault injection | pass |
| TC-004 | cold start at −40 °C | pass |
| TC-005 | step input at 60 km/h | pass |
| TC-006 | over-temperature derate | pass |
| TC-007 | supply dip to 9 V | pass |
| TC-008 | CAN timeout | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
