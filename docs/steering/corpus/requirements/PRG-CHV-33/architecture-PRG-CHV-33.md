# System Architectural Design — Arden
**Baseline:** ARCH-CHV-33-v3 · created 2021-12-29 · baselined
**Supersedes:** ARCH-CHV-33-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-CHV-33-SENS-01 | sensor | buy | QM | — | carryover |
| EL-CHV-33-ECU-02 | ecu | buy | QM | — | carryover |
| EL-CHV-33-MOTO-03 | motor | buy | D | — | carryover |
| EL-CHV-33-GEAR-04 | gearbox | make | B | — | new |
| EL-CHV-33-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-HYSTERESIS-COMP | EL-CHV-33-MECH-05 | primary |
| ACT-EOL-CALIB | EL-CHV-33-GEAR-04 | primary |
| ACT-ANGLE-SENSE | EL-CHV-33-MECH-05 | primary |
| ACT-FRICTION-COMP | EL-CHV-33-MOTO-03 | primary |
| ACT-RETURN-TO-CENTER | EL-CHV-33-GEAR-04 | primary |
| ACT-DAMPING | EL-CHV-33-MOTO-03 | primary |
| ACT-ASSIST | EL-CHV-33-GEAR-04 | primary |
| ACT-SAFETY-MONITOR | EL-CHV-33-GEAR-04 | primary |
| ACT-ARBITRATION | EL-CHV-33-SENS-01 | primary |
| ACT-MOTOR-CONTROL | EL-CHV-33-GEAR-04 | primary |
| ACT-DIAGNOSTICS | EL-CHV-33-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-CHV-33-SENS-01 | EL-CHV-33-ECU-02 | CAN-FD | signal | — ms | QM |
| EL-CHV-33-ECU-02 | EL-CHV-33-MOTO-03 | CAN-FD | signal | 19.38 ms | QM |
| EL-CHV-33-MOTO-03 | EL-CHV-33-GEAR-04 | SENT | signal | 18.67 ms | D |
| EL-CHV-33-GEAR-04 | EL-CHV-33-MECH-05 | PSI5 | signal | 15.2 ms | D |

## 4. Requirements allocated to elements

- SR-CHV-33-0776 → EL-CHV-33-MOTO-03
- SR-CHV-33-0776 → EL-CHV-33-GEAR-04
- SR-CHV-33-0777 → EL-CHV-33-ECU-02
- SR-CHV-33-0777 → EL-CHV-33-MOTO-03
- SR-CHV-33-0778 → EL-CHV-33-MOTO-03
- SR-CHV-33-0778 → EL-CHV-33-ECU-02
- SR-CHV-33-0779 → EL-CHV-33-ECU-02
- SR-CHV-33-0779 → EL-CHV-33-MECH-05
- SR-CHV-33-0780 → EL-CHV-33-GEAR-04
- SR-CHV-33-0780 → EL-CHV-33-MOTO-03
- SR-CHV-33-0781 → EL-CHV-33-SENS-01
- SR-CHV-33-0782 → EL-CHV-33-MOTO-03
- SR-CHV-33-0782 → EL-CHV-33-MECH-05
- SR-CHV-33-0783 → EL-CHV-33-MECH-05
- SR-CHV-33-0783 → EL-CHV-33-MOTO-03
- SR-CHV-33-0784 → EL-CHV-33-MECH-05
- SR-CHV-33-0784 → EL-CHV-33-MOTO-03
- SR-CHV-33-0785 → EL-CHV-33-SENS-01
- SR-CHV-33-0786 → EL-CHV-33-ECU-02
- SR-CHV-33-0786 → EL-CHV-33-MECH-05
- SR-CHV-33-0787 → EL-CHV-33-MOTO-03
- SR-CHV-33-0787 → EL-CHV-33-MECH-05
- SR-CHV-33-0788 → EL-CHV-33-SENS-01
- SR-CHV-33-0789 → EL-CHV-33-GEAR-04
- SR-CHV-33-0790 → EL-CHV-33-GEAR-04
- SR-CHV-33-0791 → EL-CHV-33-MECH-05
- SR-CHV-33-0792 → EL-CHV-33-GEAR-04
- SR-CHV-33-0792 → EL-CHV-33-SENS-01
- SR-CHV-33-0793 → EL-CHV-33-MOTO-03
- SR-CHV-33-0793 → EL-CHV-33-GEAR-04
- SR-CHV-33-0794 → EL-CHV-33-ECU-02
- SR-CHV-33-0794 → EL-CHV-33-GEAR-04
- SR-CHV-33-0795 → EL-CHV-33-ECU-02
- SR-CHV-33-0795 → EL-CHV-33-SENS-01
- SR-CHV-33-0796 → EL-CHV-33-GEAR-04
- SR-CHV-33-0797 → EL-CHV-33-GEAR-04
- SR-CHV-33-0798 → EL-CHV-33-GEAR-04
- SR-CHV-33-0799 → EL-CHV-33-MECH-05
- SR-CHV-33-0799 → EL-CHV-33-SENS-01
- SR-CHV-33-0800 → EL-CHV-33-MOTO-03
- SR-CHV-33-0801 → EL-CHV-33-GEAR-04
- SR-CHV-33-0801 → EL-CHV-33-MECH-05
- SR-CHV-33-0802 → EL-CHV-33-MECH-05
- SR-CHV-33-0802 → EL-CHV-33-SENS-01
- SR-CHV-33-0803 → EL-CHV-33-GEAR-04
- SR-CHV-33-0804 → EL-CHV-33-GEAR-04
