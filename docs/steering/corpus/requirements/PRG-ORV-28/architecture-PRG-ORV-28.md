# System Architectural Design — Zephyr
**Baseline:** ARCH-ORV-28-v2 · created 2021-05-12 · baselined
**Supersedes:** ARCH-ORV-28-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-ORV-28-SENS-01 | sensor | buy | D | — | carryover |
| EL-ORV-28-ECU-02 | ecu | buy | C | — | new |
| EL-ORV-28-MOTO-03 | motor | buy | D | — | modified |
| EL-ORV-28-GEAR-04 | gearbox | make | B | — | modified |
| EL-ORV-28-MECH-05 | mechanical | make | D | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-ORV-28-SENS-01 | support |
| ACT-EOL-CALIB | EL-ORV-28-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-ORV-28-ECU-02 | primary |
| ACT-HYSTERESIS-COMP | EL-ORV-28-MECH-05 | primary |
| ACT-DIAGNOSTICS | EL-ORV-28-SENS-01 | support |
| ACT-DAMPING | EL-ORV-28-MECH-05 | support |
| ACT-FRICTION-COMP | EL-ORV-28-SENS-01 | primary |
| ACT-ASSIST | EL-ORV-28-ECU-02 | support |
| ACT-MOTOR-CONTROL | EL-ORV-28-ECU-02 | support |
| ACT-ANGLE-SENSE | EL-ORV-28-ECU-02 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-ORV-28-SENS-01 | EL-ORV-28-ECU-02 | mechanical | signal | 13.19 ms | D |
| EL-ORV-28-ECU-02 | EL-ORV-28-MOTO-03 | mechanical | signal | 3.55 ms | QM |
| EL-ORV-28-MOTO-03 | EL-ORV-28-GEAR-04 | mechanical | signal | — ms | B |
| EL-ORV-28-GEAR-04 | EL-ORV-28-MECH-05 | CAN-FD | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-ORV-28-0651 → EL-ORV-28-ECU-02
- SR-ORV-28-0651 → EL-ORV-28-MOTO-03
- SR-ORV-28-0652 → EL-ORV-28-SENS-01
- SR-ORV-28-0652 → EL-ORV-28-MECH-05
- SR-ORV-28-0653 → EL-ORV-28-SENS-01
- SR-ORV-28-0654 → EL-ORV-28-MOTO-03
- SR-ORV-28-0654 → EL-ORV-28-GEAR-04
- SR-ORV-28-0655 → EL-ORV-28-MOTO-03
- SR-ORV-28-0656 → EL-ORV-28-GEAR-04
- SR-ORV-28-0656 → EL-ORV-28-MECH-05
- SR-ORV-28-0657 → EL-ORV-28-SENS-01
- SR-ORV-28-0658 → EL-ORV-28-MOTO-03
- SR-ORV-28-0659 → EL-ORV-28-MECH-05
- SR-ORV-28-0660 → EL-ORV-28-ECU-02
- SR-ORV-28-0661 → EL-ORV-28-SENS-01
- SR-ORV-28-0661 → EL-ORV-28-MOTO-03
- SR-ORV-28-0662 → EL-ORV-28-GEAR-04
- SR-ORV-28-0662 → EL-ORV-28-ECU-02
- SR-ORV-28-0663 → EL-ORV-28-GEAR-04
- SR-ORV-28-0664 → EL-ORV-28-SENS-01
- SR-ORV-28-0664 → EL-ORV-28-GEAR-04
- SR-ORV-28-0665 → EL-ORV-28-GEAR-04
- SR-ORV-28-0665 → EL-ORV-28-MOTO-03
- SR-ORV-28-0666 → EL-ORV-28-GEAR-04
- SR-ORV-28-0667 → EL-ORV-28-ECU-02
- SR-ORV-28-0667 → EL-ORV-28-MECH-05
- SR-ORV-28-0668 → EL-ORV-28-ECU-02
- SR-ORV-28-0669 → EL-ORV-28-MOTO-03
- SR-ORV-28-0670 → EL-ORV-28-MOTO-03
- SR-ORV-28-0671 → EL-ORV-28-MOTO-03
- SR-ORV-28-0671 → EL-ORV-28-ECU-02
- SR-ORV-28-0672 → EL-ORV-28-SENS-01
- SR-ORV-28-0672 → EL-ORV-28-ECU-02
- SR-ORV-28-0673 → EL-ORV-28-MOTO-03
- SR-ORV-28-0673 → EL-ORV-28-MECH-05
- SR-ORV-28-0674 → EL-ORV-28-ECU-02
- SR-ORV-28-0675 → EL-ORV-28-MOTO-03
- SR-ORV-28-0676 → EL-ORV-28-MOTO-03
- SR-ORV-28-0676 → EL-ORV-28-SENS-01
- SR-ORV-28-0677 → EL-ORV-28-MOTO-03
- SR-ORV-28-0677 → EL-ORV-28-SENS-01
