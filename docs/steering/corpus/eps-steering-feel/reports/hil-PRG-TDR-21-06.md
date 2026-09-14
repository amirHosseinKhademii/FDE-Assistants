# HIL integration report — Steering feel
**Programme:** PRG-TDR-21 (Quarry, C-EPS)
**Build:** 7.9.8 · **Rig:** HIL-5 · **Date:** 2023-11-02
**Engineer:** e.palmer

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | step input at 60 km/h | fail |
| TC-002 | over-temperature derate | pass |
| TC-003 | parking manoeuvre | pass |
| TC-004 | cold start at −40 °C | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.

## Follow-up

Raised as CHR-2023-0048.
