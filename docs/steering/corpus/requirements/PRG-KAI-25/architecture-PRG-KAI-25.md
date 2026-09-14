# System Architectural Design — Cove
**Baseline:** ARCH-KAI-25-v2 · created 2021-04-23 · baselined
**Supersedes:** ARCH-KAI-25-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-25-SENS-01 | sensor | buy | QM | — | new |
| EL-KAI-25-ECU-02 | ecu | buy | C | — | carryover |
| EL-KAI-25-MOTO-03 | motor | buy | B | — | new |
| EL-KAI-25-GEAR-04 | gearbox | make | B | — | carryover |
| EL-KAI-25-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-RETURN-TO-CENTER | EL-KAI-25-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-KAI-25-SENS-01 | primary |
| ACT-ARBITRATION | EL-KAI-25-ECU-02 | primary |
| ACT-EOL-CALIB | EL-KAI-25-SENS-01 | primary |
| ACT-MOTOR-CONTROL | EL-KAI-25-ECU-02 | primary |
| ACT-DIAGNOSTICS | EL-KAI-25-MOTO-03 | support |
| ACT-SAFETY-MONITOR | EL-KAI-25-SENS-01 | support |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-25-SENS-01 | EL-KAI-25-ECU-02 | SENT | signal | — ms | B |
| EL-KAI-25-ECU-02 | EL-KAI-25-MOTO-03 | SENT | signal | 12.91 ms | QM |
| EL-KAI-25-MOTO-03 | EL-KAI-25-GEAR-04 | PSI5 | signal | 5.06 ms | QM |
| EL-KAI-25-GEAR-04 | EL-KAI-25-MECH-05 | PSI5 | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-KAI-25-0588 → EL-KAI-25-SENS-01
- SR-KAI-25-0588 → EL-KAI-25-MOTO-03
- SR-KAI-25-0589 → EL-KAI-25-MECH-05
- SR-KAI-25-0590 → EL-KAI-25-MOTO-03
- SR-KAI-25-0590 → EL-KAI-25-GEAR-04
- SR-KAI-25-0591 → EL-KAI-25-GEAR-04
- SR-KAI-25-0591 → EL-KAI-25-ECU-02
- SR-KAI-25-0592 → EL-KAI-25-SENS-01
- SR-KAI-25-0592 → EL-KAI-25-MECH-05
- SR-KAI-25-0593 → EL-KAI-25-MECH-05
- SR-KAI-25-0593 → EL-KAI-25-ECU-02
- SR-KAI-25-0594 → EL-KAI-25-ECU-02
- SR-KAI-25-0594 → EL-KAI-25-MOTO-03
- SR-KAI-25-0595 → EL-KAI-25-GEAR-04
- SR-KAI-25-0596 → EL-KAI-25-MECH-05
- SR-KAI-25-0597 → EL-KAI-25-ECU-02
- SR-KAI-25-0598 → EL-KAI-25-ECU-02
- SR-KAI-25-0598 → EL-KAI-25-MOTO-03
- SR-KAI-25-0599 → EL-KAI-25-SENS-01
- SR-KAI-25-0599 → EL-KAI-25-ECU-02
- SR-KAI-25-0600 → EL-KAI-25-MOTO-03
- SR-KAI-25-0601 → EL-KAI-25-SENS-01
- SR-KAI-25-0601 → EL-KAI-25-MOTO-03
- SR-KAI-25-0602 → EL-KAI-25-SENS-01
- SR-KAI-25-0602 → EL-KAI-25-ECU-02
- SR-KAI-25-0603 → EL-KAI-25-MECH-05
- SR-KAI-25-0603 → EL-KAI-25-ECU-02
- SR-KAI-25-0604 → EL-KAI-25-MOTO-03
- SR-KAI-25-0604 → EL-KAI-25-ECU-02
- SR-KAI-25-0605 → EL-KAI-25-MOTO-03
- SR-KAI-25-0606 → EL-KAI-25-MECH-05
- SR-KAI-25-0606 → EL-KAI-25-ECU-02
- SR-KAI-25-0607 → EL-KAI-25-SENS-01
- SR-KAI-25-0608 → EL-KAI-25-SENS-01
- SR-KAI-25-0609 → EL-KAI-25-ECU-02
- SR-KAI-25-0610 → EL-KAI-25-GEAR-04
- SR-KAI-25-0611 → EL-KAI-25-SENS-01
- SR-KAI-25-0611 → EL-KAI-25-ECU-02
- SR-KAI-25-0612 → EL-KAI-25-MECH-05
- SR-KAI-25-0612 → EL-KAI-25-GEAR-04
- SR-KAI-25-0613 → EL-KAI-25-MOTO-03
- SR-KAI-25-0614 → EL-KAI-25-GEAR-04
- SR-KAI-25-0614 → EL-KAI-25-MECH-05
- SR-KAI-25-0615 → EL-KAI-25-MECH-05
- SR-KAI-25-0615 → EL-KAI-25-ECU-02
- SR-KAI-25-0616 → EL-KAI-25-ECU-02
- SR-KAI-25-0616 → EL-KAI-25-SENS-01
