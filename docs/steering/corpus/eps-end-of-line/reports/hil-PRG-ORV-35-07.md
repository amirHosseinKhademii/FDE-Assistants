# HIL integration report — End-of-line calibration
**Programme:** PRG-ORV-35 (Brix, P-EPS)
**Build:** 5.9.4 · **Rig:** HIL-6 · **Date:** 2021-06-09
**Engineer:** l.renaud

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | pass |
| TC-002 | over-temperature derate | pass |
| TC-003 | cold start at −40 °C | pass |
| TC-004 | cold start at −40 °C | pass |
| TC-005 | sine sweep 0.2–4 Hz | pass |
| TC-006 | sensor fault injection | pass |
| TC-007 | end-stop approach | pass |
| TC-008 | over-temperature derate | pass |
| TC-009 | cold start at −40 °C | fail |

## Observations

- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Nothing to report.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.

## Follow-up

Raised as CHR-2023-0067.
