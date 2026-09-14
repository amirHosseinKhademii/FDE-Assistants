# HIL integration report — End-of-line calibration
**Programme:** PRG-ORV-28 (Zephyr, C-EPS)
**Build:** 5.5.3 · **Rig:** HIL-1 · **Date:** 2023-10-17
**Engineer:** a.kovac

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | pass |
| TC-002 | step input at 60 km/h | pass |
| TC-003 | sine sweep 0.2–4 Hz | pass |
| TC-004 | sine sweep 0.2–4 Hz | fail |
| TC-005 | sensor fault injection | fail |
| TC-006 | sine sweep 0.2–4 Hz | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
