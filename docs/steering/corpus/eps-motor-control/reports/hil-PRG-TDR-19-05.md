# HIL integration report — Motor current control
**Programme:** PRG-TDR-19 (Kestra, C-EPS)
**Build:** 8.4.4 · **Rig:** HIL-2 · **Date:** 2021-05-27
**Engineer:** r.dietrich

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | over-temperature derate | pass |
| TC-002 | parking manoeuvre | pass |
| TC-003 | supply dip to 9 V | pass |
| TC-004 | sine sweep 0.2–4 Hz | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.

## Follow-up

Raised as CHR-2025-0083.
