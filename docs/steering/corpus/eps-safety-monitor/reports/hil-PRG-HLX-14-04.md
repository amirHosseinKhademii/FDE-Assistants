# HIL integration report — Safety monitor
**Programme:** PRG-HLX-14 (Iskra, DP-EPS)
**Build:** 9.5.0 · **Rig:** HIL-5 · **Date:** 2026-04-04
**Engineer:** a.kovac

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sensor fault injection | pass |
| TC-002 | over-temperature derate | pass |
| TC-003 | supply dip to 9 V | fail |
| TC-004 | sine sweep 0.2–4 Hz | pass |
| TC-005 | parking manoeuvre | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Nothing to report.
- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.

## Follow-up

Raised as CHR-2024-0166.
