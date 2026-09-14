# HIL integration report — Diagnostics
**Programme:** PRG-TDR-06 (Juno, C-EPS)
**Build:** 9.3.5 · **Rig:** HIL-1 · **Date:** 2022-12-11
**Engineer:** e.palmer

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | over-temperature derate | pass |
| TC-003 | parking manoeuvre | fail |
| TC-004 | CAN timeout | pass |
| TC-005 | sine sweep 0.2–4 Hz | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
