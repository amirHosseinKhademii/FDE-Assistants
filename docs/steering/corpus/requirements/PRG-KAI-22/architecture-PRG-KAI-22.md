# System Architectural Design — Jarl
**Baseline:** ARCH-KAI-22-v2 · created 2025-10-29 · baselined
**Supersedes:** ARCH-KAI-22-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-22-SENS-01 | sensor | buy | D | — | carryover |
| EL-KAI-22-ECU-02 | ecu | buy | D | — | new |
| EL-KAI-22-MOTO-03 | motor | buy | B | — | carryover |
| EL-KAI-22-GEAR-04 | gearbox | make | C | — | carryover |
| EL-KAI-22-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-DAMPING | EL-KAI-22-SENS-01 | primary |
| ACT-HYSTERESIS-COMP | EL-KAI-22-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-KAI-22-MOTO-03 | support |
| ACT-FRICTION-COMP | EL-KAI-22-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-KAI-22-GEAR-04 | primary |
| ACT-ARBITRATION | EL-KAI-22-SENS-01 | primary |
| ACT-SAFETY-MONITOR | EL-KAI-22-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-22-SENS-01 | EL-KAI-22-ECU-02 | analog | signal | — ms | B |
| EL-KAI-22-ECU-02 | EL-KAI-22-MOTO-03 | CAN-FD | signal | 9.24 ms | QM |
| EL-KAI-22-MOTO-03 | EL-KAI-22-GEAR-04 | SENT | signal | 19.59 ms | QM |
| EL-KAI-22-GEAR-04 | EL-KAI-22-MECH-05 | mechanical | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-KAI-22-0523 → EL-KAI-22-MECH-05
- SR-KAI-22-0524 → EL-KAI-22-SENS-01
- SR-KAI-22-0524 → EL-KAI-22-GEAR-04
- SR-KAI-22-0525 → EL-KAI-22-ECU-02
- SR-KAI-22-0526 → EL-KAI-22-SENS-01
- SR-KAI-22-0526 → EL-KAI-22-GEAR-04
- SR-KAI-22-0527 → EL-KAI-22-MOTO-03
- SR-KAI-22-0527 → EL-KAI-22-MECH-05
- SR-KAI-22-0528 → EL-KAI-22-ECU-02
- SR-KAI-22-0529 → EL-KAI-22-MOTO-03
- SR-KAI-22-0530 → EL-KAI-22-SENS-01
- SR-KAI-22-0530 → EL-KAI-22-GEAR-04
- SR-KAI-22-0531 → EL-KAI-22-ECU-02
- SR-KAI-22-0531 → EL-KAI-22-MOTO-03
- SR-KAI-22-0532 → EL-KAI-22-GEAR-04
- SR-KAI-22-0533 → EL-KAI-22-GEAR-04
- SR-KAI-22-0534 → EL-KAI-22-MOTO-03
- SR-KAI-22-0534 → EL-KAI-22-SENS-01
- SR-KAI-22-0535 → EL-KAI-22-SENS-01
- SR-KAI-22-0535 → EL-KAI-22-MOTO-03
- SR-KAI-22-0536 → EL-KAI-22-SENS-01
- SR-KAI-22-0537 → EL-KAI-22-SENS-01
- SR-KAI-22-0538 → EL-KAI-22-MOTO-03
- SR-KAI-22-0539 → EL-KAI-22-GEAR-04
- SR-KAI-22-0540 → EL-KAI-22-ECU-02
- SR-KAI-22-0541 → EL-KAI-22-GEAR-04
- SR-KAI-22-0542 → EL-KAI-22-GEAR-04
- SR-KAI-22-0543 → EL-KAI-22-GEAR-04
- SR-KAI-22-0543 → EL-KAI-22-MECH-05
- SR-KAI-22-0544 → EL-KAI-22-SENS-01
- SR-KAI-22-0544 → EL-KAI-22-MOTO-03
- SR-KAI-22-0545 → EL-KAI-22-MOTO-03
- SR-KAI-22-0546 → EL-KAI-22-GEAR-04
- SR-KAI-22-0546 → EL-KAI-22-ECU-02
- SR-KAI-22-0547 → EL-KAI-22-ECU-02
- SR-KAI-22-0548 → EL-KAI-22-MECH-05
- SR-KAI-22-0549 → EL-KAI-22-SENS-01
- SR-KAI-22-0549 → EL-KAI-22-MECH-05
- SR-KAI-22-0550 → EL-KAI-22-SENS-01
- SR-KAI-22-0550 → EL-KAI-22-ECU-02
