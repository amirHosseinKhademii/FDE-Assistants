# HIL integration report — Steer-by-wire (pre-development)
**Programme:** PRG-TDR-21 (Quarry, C-EPS)
**Build:** 8.16.0 · **Rig:** HIL-6 · **Date:** 2025-08-13
**Engineer:** d.ferreira

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | CAN timeout | pass |
| TC-003 | supply dip to 9 V | pass |
| TC-004 | end-stop approach | pass |
| TC-005 | step input at 60 km/h | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
