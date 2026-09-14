# System Architectural Design — Ulric
**Baseline:** ARCH-TDR-32-v3 · created 2023-05-06 · baselined
**Supersedes:** ARCH-TDR-32-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-32-SENS-01 | sensor | buy | D | — | modified |
| EL-TDR-32-ECU-02 | ecu | buy | B | — | carryover |
| EL-TDR-32-MOTO-03 | motor | buy | C | — | new |
| EL-TDR-32-GEAR-04 | gearbox | make | QM | — | carryover |
| EL-TDR-32-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ANGLE-SENSE | EL-TDR-32-GEAR-04 | support |
| ACT-ARBITRATION | EL-TDR-32-SENS-01 | primary |
| ACT-DIAGNOSTICS | EL-TDR-32-MECH-05 | support |
| ACT-ASSIST | EL-TDR-32-MECH-05 | primary |
| ACT-MOTOR-CONTROL | EL-TDR-32-GEAR-04 | support |
| ACT-FRICTION-COMP | EL-TDR-32-SENS-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-32-SENS-01 | EL-TDR-32-ECU-02 | PWM | signal | — ms | QM |
| EL-TDR-32-ECU-02 | EL-TDR-32-MOTO-03 | CAN-FD | signal | — ms | B |
| EL-TDR-32-MOTO-03 | EL-TDR-32-GEAR-04 | mechanical | signal | — ms | QM |
| EL-TDR-32-GEAR-04 | EL-TDR-32-MECH-05 | mechanical | signal | 16.63 ms | B |

## 4. Requirements allocated to elements

- SR-TDR-32-0752 → EL-TDR-32-SENS-01
- SR-TDR-32-0752 → EL-TDR-32-GEAR-04
- SR-TDR-32-0753 → EL-TDR-32-SENS-01
- SR-TDR-32-0754 → EL-TDR-32-MOTO-03
- SR-TDR-32-0755 → EL-TDR-32-SENS-01
- SR-TDR-32-0755 → EL-TDR-32-ECU-02
- SR-TDR-32-0756 → EL-TDR-32-MOTO-03
- SR-TDR-32-0757 → EL-TDR-32-MOTO-03
- SR-TDR-32-0758 → EL-TDR-32-SENS-01
- SR-TDR-32-0759 → EL-TDR-32-SENS-01
- SR-TDR-32-0759 → EL-TDR-32-ECU-02
- SR-TDR-32-0760 → EL-TDR-32-MOTO-03
- SR-TDR-32-0760 → EL-TDR-32-MECH-05
- SR-TDR-32-0761 → EL-TDR-32-GEAR-04
- SR-TDR-32-0762 → EL-TDR-32-ECU-02
- SR-TDR-32-0762 → EL-TDR-32-MECH-05
- SR-TDR-32-0763 → EL-TDR-32-MOTO-03
- SR-TDR-32-0763 → EL-TDR-32-SENS-01
- SR-TDR-32-0764 → EL-TDR-32-MECH-05
- SR-TDR-32-0764 → EL-TDR-32-GEAR-04
- SR-TDR-32-0765 → EL-TDR-32-GEAR-04
- SR-TDR-32-0766 → EL-TDR-32-MOTO-03
- SR-TDR-32-0766 → EL-TDR-32-ECU-02
- SR-TDR-32-0767 → EL-TDR-32-SENS-01
- SR-TDR-32-0767 → EL-TDR-32-MOTO-03
- SR-TDR-32-0768 → EL-TDR-32-GEAR-04
- SR-TDR-32-0769 → EL-TDR-32-SENS-01
- SR-TDR-32-0770 → EL-TDR-32-GEAR-04
- SR-TDR-32-0771 → EL-TDR-32-MOTO-03
- SR-TDR-32-0771 → EL-TDR-32-ECU-02
- SR-TDR-32-0772 → EL-TDR-32-MOTO-03
- SR-TDR-32-0772 → EL-TDR-32-GEAR-04
- SR-TDR-32-0773 → EL-TDR-32-MOTO-03
- SR-TDR-32-0774 → EL-TDR-32-MECH-05
- SR-TDR-32-0774 → EL-TDR-32-SENS-01
- SR-TDR-32-0775 → EL-TDR-32-SENS-01
