# System Architectural Design — Iskra
**Baseline:** ARCH-HLX-14-v2 · created 2025-02-13 · baselined
**Supersedes:** ARCH-HLX-14-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-HLX-14-SENS-01 | sensor | buy | B | — | modified |
| EL-HLX-14-ECU-02 | ecu | buy | QM | — | carryover |
| EL-HLX-14-MOTO-03 | motor | buy | D | — | new |
| EL-HLX-14-GEAR-04 | gearbox | make | QM | — | new |
| EL-HLX-14-MECH-05 | mechanical | make | C | — | modified |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-HLX-14-SENS-01 | support |
| ACT-DAMPING | EL-HLX-14-MOTO-03 | primary |
| ACT-DIAGNOSTICS | EL-HLX-14-MOTO-03 | primary |
| ACT-EOL-CALIB | EL-HLX-14-MECH-05 | primary |
| ACT-FRICTION-COMP | EL-HLX-14-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-HLX-14-SENS-01 | primary |
| ACT-ARBITRATION | EL-HLX-14-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-HLX-14-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-HLX-14-SENS-01 | EL-HLX-14-ECU-02 | analog | signal | — ms | B |
| EL-HLX-14-ECU-02 | EL-HLX-14-MOTO-03 | analog | signal | 16.81 ms | D |
| EL-HLX-14-MOTO-03 | EL-HLX-14-GEAR-04 | SENT | signal | — ms | D |
| EL-HLX-14-GEAR-04 | EL-HLX-14-MECH-05 | PWM | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-HLX-14-0320 → EL-HLX-14-MOTO-03
- SR-HLX-14-0321 → EL-HLX-14-ECU-02
- SR-HLX-14-0321 → EL-HLX-14-SENS-01
- SR-HLX-14-0322 → EL-HLX-14-ECU-02
- SR-HLX-14-0322 → EL-HLX-14-GEAR-04
- SR-HLX-14-0323 → EL-HLX-14-MECH-05
- SR-HLX-14-0323 → EL-HLX-14-MOTO-03
- SR-HLX-14-0324 → EL-HLX-14-MECH-05
- SR-HLX-14-0325 → EL-HLX-14-ECU-02
- SR-HLX-14-0326 → EL-HLX-14-MECH-05
- SR-HLX-14-0326 → EL-HLX-14-SENS-01
- SR-HLX-14-0327 → EL-HLX-14-SENS-01
- SR-HLX-14-0328 → EL-HLX-14-SENS-01
- SR-HLX-14-0329 → EL-HLX-14-SENS-01
- SR-HLX-14-0330 → EL-HLX-14-MECH-05
- SR-HLX-14-0330 → EL-HLX-14-MOTO-03
- SR-HLX-14-0331 → EL-HLX-14-SENS-01
- SR-HLX-14-0331 → EL-HLX-14-ECU-02
- SR-HLX-14-0332 → EL-HLX-14-SENS-01
- SR-HLX-14-0333 → EL-HLX-14-ECU-02
- SR-HLX-14-0334 → EL-HLX-14-GEAR-04
- SR-HLX-14-0335 → EL-HLX-14-ECU-02
- SR-HLX-14-0335 → EL-HLX-14-SENS-01
- SR-HLX-14-0336 → EL-HLX-14-ECU-02
- SR-HLX-14-0336 → EL-HLX-14-GEAR-04
- SR-HLX-14-0337 → EL-HLX-14-MECH-05
- SR-HLX-14-0337 → EL-HLX-14-SENS-01
- SR-HLX-14-0338 → EL-HLX-14-MECH-05
- SR-HLX-14-0339 → EL-HLX-14-GEAR-04
- SR-HLX-14-0340 → EL-HLX-14-MECH-05
