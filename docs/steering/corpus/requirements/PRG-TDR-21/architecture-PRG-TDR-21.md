# System Architectural Design — Quarry
**Baseline:** ARCH-TDR-21-v2 · created 2023-10-05 · baselined
**Supersedes:** ARCH-TDR-21-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-21-SENS-01 | sensor | buy | C | — | modified |
| EL-TDR-21-ECU-02 | ecu | buy | QM | — | new |
| EL-TDR-21-MOTO-03 | motor | buy | B | — | modified |
| EL-TDR-21-GEAR-04 | gearbox | make | C | — | modified |
| EL-TDR-21-MECH-05 | mechanical | make | B | — | modified |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-TDR-21-SENS-01 | support |
| ACT-DIAGNOSTICS | EL-TDR-21-ECU-02 | primary |
| ACT-DAMPING | EL-TDR-21-MOTO-03 | support |
| ACT-HYSTERESIS-COMP | EL-TDR-21-SENS-01 | primary |
| ACT-MOTOR-CONTROL | EL-TDR-21-SENS-01 | support |
| ACT-FRICTION-COMP | EL-TDR-21-MOTO-03 | primary |
| ACT-ARBITRATION | EL-TDR-21-SENS-01 | support |
| ACT-SAFETY-MONITOR | EL-TDR-21-SENS-01 | primary |
| ACT-EOL-CALIB | EL-TDR-21-SENS-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-21-SENS-01 | EL-TDR-21-ECU-02 | mechanical | signal | 9.01 ms | B |
| EL-TDR-21-ECU-02 | EL-TDR-21-MOTO-03 | CAN-FD | signal | 17.7 ms | D |
| EL-TDR-21-MOTO-03 | EL-TDR-21-GEAR-04 | PSI5 | signal | — ms | B |
| EL-TDR-21-GEAR-04 | EL-TDR-21-MECH-05 | analog | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-TDR-21-0494 → EL-TDR-21-MOTO-03
- SR-TDR-21-0494 → EL-TDR-21-MECH-05
- SR-TDR-21-0495 → EL-TDR-21-ECU-02
- SR-TDR-21-0495 → EL-TDR-21-SENS-01
- SR-TDR-21-0496 → EL-TDR-21-ECU-02
- SR-TDR-21-0497 → EL-TDR-21-SENS-01
- SR-TDR-21-0498 → EL-TDR-21-ECU-02
- SR-TDR-21-0499 → EL-TDR-21-MECH-05
- SR-TDR-21-0499 → EL-TDR-21-SENS-01
- SR-TDR-21-0500 → EL-TDR-21-ECU-02
- SR-TDR-21-0501 → EL-TDR-21-SENS-01
- SR-TDR-21-0501 → EL-TDR-21-GEAR-04
- SR-TDR-21-0502 → EL-TDR-21-ECU-02
- SR-TDR-21-0502 → EL-TDR-21-MOTO-03
- SR-TDR-21-0503 → EL-TDR-21-GEAR-04
- SR-TDR-21-0504 → EL-TDR-21-MOTO-03
- SR-TDR-21-0504 → EL-TDR-21-SENS-01
- SR-TDR-21-0505 → EL-TDR-21-MECH-05
- SR-TDR-21-0505 → EL-TDR-21-SENS-01
- SR-TDR-21-0506 → EL-TDR-21-MOTO-03
- SR-TDR-21-0507 → EL-TDR-21-GEAR-04
- SR-TDR-21-0507 → EL-TDR-21-SENS-01
- SR-TDR-21-0508 → EL-TDR-21-MECH-05
- SR-TDR-21-0508 → EL-TDR-21-ECU-02
- SR-TDR-21-0509 → EL-TDR-21-ECU-02
- SR-TDR-21-0510 → EL-TDR-21-SENS-01
- SR-TDR-21-0510 → EL-TDR-21-MOTO-03
- SR-TDR-21-0511 → EL-TDR-21-ECU-02
- SR-TDR-21-0511 → EL-TDR-21-MECH-05
- SR-TDR-21-0512 → EL-TDR-21-MECH-05
- SR-TDR-21-0512 → EL-TDR-21-GEAR-04
- SR-TDR-21-0513 → EL-TDR-21-GEAR-04
- SR-TDR-21-0514 → EL-TDR-21-ECU-02
- SR-TDR-21-0514 → EL-TDR-21-GEAR-04
- SR-TDR-21-0515 → EL-TDR-21-ECU-02
- SR-TDR-21-0516 → EL-TDR-21-MOTO-03
- SR-TDR-21-0516 → EL-TDR-21-GEAR-04
- SR-TDR-21-0517 → EL-TDR-21-SENS-01
- SR-TDR-21-0517 → EL-TDR-21-GEAR-04
- SR-TDR-21-0518 → EL-TDR-21-SENS-01
- SR-TDR-21-0519 → EL-TDR-21-MECH-05
- SR-TDR-21-0520 → EL-TDR-21-MOTO-03
- SR-TDR-21-0520 → EL-TDR-21-ECU-02
- SR-TDR-21-0521 → EL-TDR-21-MECH-05
- SR-TDR-21-0521 → EL-TDR-21-SENS-01
- SR-TDR-21-0522 → EL-TDR-21-ECU-02
- SR-TDR-21-0522 → EL-TDR-21-MECH-05
