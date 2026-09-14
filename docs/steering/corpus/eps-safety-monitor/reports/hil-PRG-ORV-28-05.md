# HIL integration report — Safety monitor
**Programme:** PRG-ORV-28 (Zephyr, C-EPS)
**Build:** 4.4.4 · **Rig:** HIL-4 · **Date:** 2022-02-01
**Engineer:** d.ferreira

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | parking manoeuvre | pass |
| TC-004 | parking manoeuvre | pass |
| TC-005 | over-temperature derate | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.

## Follow-up

Raised as CHR-2024-0107.
