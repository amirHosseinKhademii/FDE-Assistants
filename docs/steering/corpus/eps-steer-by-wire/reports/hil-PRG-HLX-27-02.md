# HIL integration report — Steer-by-wire (pre-development)
**Programme:** PRG-HLX-27 (Haldan, DP-EPS)
**Build:** 6.19.0 · **Rig:** HIL-4 · **Date:** 2021-06-24
**Engineer:** p.strand

## Result

FAIL — see §3

## Cases

| case | description | result |
|---|---|---|
| TC-001 | end-stop approach | pass |
| TC-002 | supply dip to 9 V | pass |
| TC-003 | end-stop approach | pass |
| TC-004 | cold start at −40 °C | pass |
| TC-005 | cold start at −40 °C | pass |
| TC-006 | parking manoeuvre | pass |
| TC-007 | parking manoeuvre | pass |

## Observations

- Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.
- Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.
- Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.

## Follow-up

Raised as CHR-2025-0178.
