# HIL integration report — Diagnostics
**Programme:** PRG-HLX-H1 (H1, R-EPS)
**Build:** 6.1.8 · **Rig:** HIL-6 · **Date:** 2026-05-19
**Engineer:** j.moreau

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | sensor fault injection | pass |
| TC-003 | end-stop approach | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | step input at 60 km/h | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
