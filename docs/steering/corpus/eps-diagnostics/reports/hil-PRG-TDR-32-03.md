# HIL integration report — Diagnostics
**Programme:** PRG-TDR-32 (Ulric, R-EPS)
**Build:** 5.16.3 · **Rig:** HIL-4 · **Date:** 2023-03-21
**Engineer:** j.moreau

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | cold start at −40 °C | pass |
| TC-002 | cold start at −40 °C | pass |
| TC-003 | end-stop approach | pass |
| TC-004 | step input at 60 km/h | pass |
| TC-005 | CAN timeout | pass |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.

## Follow-up

Raised as CHR-2020-0155.
