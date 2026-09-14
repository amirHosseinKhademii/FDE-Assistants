# HIL integration report — End-of-line calibration
**Programme:** PRG-TDR-21 (Quarry, C-EPS)
**Build:** 8.2.0 · **Rig:** HIL-6 · **Date:** 2022-11-24
**Engineer:** p.strand

## Result

PASS

## Cases

| case | description | result |
|---|---|---|
| TC-001 | end-stop approach | pass |
| TC-002 | sensor fault injection | fail |
| TC-003 | supply dip to 9 V | pass |
| TC-004 | step input at 60 km/h | pass |
| TC-005 | parking manoeuvre | pass |
| TC-006 | parking manoeuvre | pass |
| TC-007 | step input at 60 km/h | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
- Nothing to report.

## Follow-up

Raised as CHR-2023-0152.
