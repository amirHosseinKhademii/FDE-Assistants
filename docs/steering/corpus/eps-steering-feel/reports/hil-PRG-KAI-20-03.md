# HIL integration report — Steering feel
**Programme:** PRG-KAI-20 (Pellon, P-EPS)
**Build:** 8.16.9 · **Rig:** HIL-1 · **Date:** 2025-12-30
**Engineer:** r.dietrich

## Result

PASS with observations

## Cases

| case | description | result |
|---|---|---|
| TC-001 | sine sweep 0.2–4 Hz | pass |
| TC-002 | cold start at −40 °C | pass |
| TC-003 | end-stop approach | pass |
| TC-004 | supply dip to 9 V | pass |

## Observations

- The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.
