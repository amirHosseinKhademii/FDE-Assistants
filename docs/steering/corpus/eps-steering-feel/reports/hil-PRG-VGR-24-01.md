# HIL integration report — Steering feel
**Programme:** PRG-VGR-24 (Gale, C-EPS)
**Build:** 1.15.7 · **Rig:** HIL-1 · **Date:** 2026-01-18
**Engineer:** d.ferreira

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | cold start at −40 °C | pass |
| TC-003 | over-temperature derate | pass |
| TC-004 | supply dip to 9 V | pass |
| TC-005 | step input at 60 km/h | fail |
| TC-006 | parking manoeuvre | pass |
| TC-007 | CAN timeout | pass |
| TC-008 | over-temperature derate | pass |

## Observations

- Nothing to report.

## Follow-up

Raised as CHR-2024-0166.
