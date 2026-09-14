# System Architectural Design — Pellon
**Baseline:** ARCH-KAI-20-v2 · created 2023-09-10 · baselined
**Supersedes:** ARCH-KAI-20-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-20-SENS-01 | sensor | buy | B | — | carryover |
| EL-KAI-20-ECU-02 | ecu | buy | C | — | new |
| EL-KAI-20-MOTO-03 | motor | buy | B | — | modified |
| EL-KAI-20-GEAR-04 | gearbox | make | D | — | carryover |
| EL-KAI-20-MECH-05 | mechanical | make | B | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-KAI-20-MECH-05 | primary |
| ACT-SAFETY-MONITOR | EL-KAI-20-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-KAI-20-SENS-01 | support |
| ACT-TORQUE-SENSE | EL-KAI-20-MECH-05 | primary |
| ACT-ARBITRATION | EL-KAI-20-GEAR-04 | primary |
| ACT-HYSTERESIS-COMP | EL-KAI-20-MOTO-03 | support |
| ACT-DAMPING | EL-KAI-20-MOTO-03 | primary |
| ACT-EOL-CALIB | EL-KAI-20-ECU-02 | primary |
| ACT-DIAGNOSTICS | EL-KAI-20-MECH-05 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-20-SENS-01 | EL-KAI-20-ECU-02 | PWM | signal | — ms | QM |
| EL-KAI-20-ECU-02 | EL-KAI-20-MOTO-03 | mechanical | signal | 18.23 ms | B |
| EL-KAI-20-MOTO-03 | EL-KAI-20-GEAR-04 | SENT | signal | 15.53 ms | D |
| EL-KAI-20-GEAR-04 | EL-KAI-20-MECH-05 | PSI5 | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-KAI-20-0465 → EL-KAI-20-MECH-05
- SR-KAI-20-0465 → EL-KAI-20-ECU-02
- SR-KAI-20-0466 → EL-KAI-20-MECH-05
- SR-KAI-20-0466 → EL-KAI-20-GEAR-04
- SR-KAI-20-0467 → EL-KAI-20-SENS-01
- SR-KAI-20-0467 → EL-KAI-20-MECH-05
- SR-KAI-20-0468 → EL-KAI-20-MECH-05
- SR-KAI-20-0468 → EL-KAI-20-GEAR-04
- SR-KAI-20-0469 → EL-KAI-20-MECH-05
- SR-KAI-20-0469 → EL-KAI-20-ECU-02
- SR-KAI-20-0470 → EL-KAI-20-ECU-02
- SR-KAI-20-0471 → EL-KAI-20-SENS-01
- SR-KAI-20-0472 → EL-KAI-20-GEAR-04
- SR-KAI-20-0473 → EL-KAI-20-SENS-01
- SR-KAI-20-0474 → EL-KAI-20-MECH-05
- SR-KAI-20-0474 → EL-KAI-20-GEAR-04
- SR-KAI-20-0475 → EL-KAI-20-MECH-05
- SR-KAI-20-0475 → EL-KAI-20-MOTO-03
- SR-KAI-20-0476 → EL-KAI-20-ECU-02
- SR-KAI-20-0477 → EL-KAI-20-MECH-05
- SR-KAI-20-0477 → EL-KAI-20-ECU-02
- SR-KAI-20-0478 → EL-KAI-20-ECU-02
- SR-KAI-20-0479 → EL-KAI-20-GEAR-04
- SR-KAI-20-0480 → EL-KAI-20-ECU-02
- SR-KAI-20-0481 → EL-KAI-20-ECU-02
- SR-KAI-20-0481 → EL-KAI-20-SENS-01
- SR-KAI-20-0482 → EL-KAI-20-ECU-02
- SR-KAI-20-0483 → EL-KAI-20-GEAR-04
- SR-KAI-20-0483 → EL-KAI-20-SENS-01
- SR-KAI-20-0484 → EL-KAI-20-MOTO-03
- SR-KAI-20-0484 → EL-KAI-20-MECH-05
- SR-KAI-20-0485 → EL-KAI-20-SENS-01
- SR-KAI-20-0485 → EL-KAI-20-ECU-02
- SR-KAI-20-0486 → EL-KAI-20-MOTO-03
- SR-KAI-20-0486 → EL-KAI-20-ECU-02
- SR-KAI-20-0487 → EL-KAI-20-MECH-05
- SR-KAI-20-0488 → EL-KAI-20-MOTO-03
- SR-KAI-20-0488 → EL-KAI-20-MECH-05
- SR-KAI-20-0489 → EL-KAI-20-ECU-02
- SR-KAI-20-0489 → EL-KAI-20-MECH-05
- SR-KAI-20-0490 → EL-KAI-20-MECH-05
- SR-KAI-20-0491 → EL-KAI-20-ECU-02
- SR-KAI-20-0492 → EL-KAI-20-GEAR-04
- SR-KAI-20-0493 → EL-KAI-20-ECU-02
- SR-KAI-20-0493 → EL-KAI-20-GEAR-04
