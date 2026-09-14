# System Architectural Design — Wren
**Baseline:** ARCH-KAI-16-v2 · created 2023-12-15 · baselined
**Supersedes:** ARCH-KAI-16-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-16-SENS-01 | sensor | buy | D | — | carryover |
| EL-KAI-16-ECU-02 | ecu | buy | C | — | carryover |
| EL-KAI-16-MOTO-03 | motor | buy | C | — | new |
| EL-KAI-16-GEAR-04 | gearbox | make | D | — | modified |
| EL-KAI-16-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-KAI-16-ECU-02 | primary |
| ACT-TORQUE-SENSE | EL-KAI-16-GEAR-04 | primary |
| ACT-DAMPING | EL-KAI-16-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-KAI-16-MECH-05 | primary |
| ACT-HYSTERESIS-COMP | EL-KAI-16-MECH-05 | primary |
| ACT-ARBITRATION | EL-KAI-16-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-16-SENS-01 | EL-KAI-16-ECU-02 | CAN-FD | signal | 7.77 ms | B |
| EL-KAI-16-ECU-02 | EL-KAI-16-MOTO-03 | CAN-FD | signal | 10.49 ms | D |
| EL-KAI-16-MOTO-03 | EL-KAI-16-GEAR-04 | PWM | signal | 1.36 ms | B |
| EL-KAI-16-GEAR-04 | EL-KAI-16-MECH-05 | analog | signal | 14.57 ms | QM |

## 4. Requirements allocated to elements

- SR-KAI-16-0368 → EL-KAI-16-ECU-02
- SR-KAI-16-0369 → EL-KAI-16-SENS-01
- SR-KAI-16-0369 → EL-KAI-16-ECU-02
- SR-KAI-16-0370 → EL-KAI-16-GEAR-04
- SR-KAI-16-0370 → EL-KAI-16-ECU-02
- SR-KAI-16-0371 → EL-KAI-16-ECU-02
- SR-KAI-16-0371 → EL-KAI-16-SENS-01
- SR-KAI-16-0372 → EL-KAI-16-MOTO-03
- SR-KAI-16-0372 → EL-KAI-16-GEAR-04
- SR-KAI-16-0373 → EL-KAI-16-SENS-01
- SR-KAI-16-0373 → EL-KAI-16-GEAR-04
- SR-KAI-16-0374 → EL-KAI-16-ECU-02
- SR-KAI-16-0375 → EL-KAI-16-SENS-01
- SR-KAI-16-0376 → EL-KAI-16-GEAR-04
- SR-KAI-16-0376 → EL-KAI-16-ECU-02
- SR-KAI-16-0377 → EL-KAI-16-GEAR-04
- SR-KAI-16-0378 → EL-KAI-16-GEAR-04
- SR-KAI-16-0379 → EL-KAI-16-GEAR-04
- SR-KAI-16-0380 → EL-KAI-16-MECH-05
- SR-KAI-16-0381 → EL-KAI-16-MECH-05
- SR-KAI-16-0382 → EL-KAI-16-MOTO-03
- SR-KAI-16-0383 → EL-KAI-16-SENS-01
- SR-KAI-16-0383 → EL-KAI-16-MECH-05
- SR-KAI-16-0384 → EL-KAI-16-ECU-02
- SR-KAI-16-0384 → EL-KAI-16-MOTO-03
- SR-KAI-16-0385 → EL-KAI-16-MOTO-03
- SR-KAI-16-0386 → EL-KAI-16-MECH-05
- SR-KAI-16-0386 → EL-KAI-16-MOTO-03
- SR-KAI-16-0387 → EL-KAI-16-MECH-05
- SR-KAI-16-0387 → EL-KAI-16-SENS-01
