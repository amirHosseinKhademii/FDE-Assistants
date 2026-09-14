# System Architectural Design — Aster
**Baseline:** ARCH-CHV-29-v3 · created 2020-08-23 · baselined
**Supersedes:** ARCH-CHV-29-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-CHV-29-SENS-01 | sensor | buy | C | — | carryover |
| EL-CHV-29-ECU-02 | ecu | buy | B | — | carryover |
| EL-CHV-29-MOTO-03 | motor | buy | C | — | carryover |
| EL-CHV-29-GEAR-04 | gearbox | make | QM | — | modified |
| EL-CHV-29-MECH-05 | mechanical | make | C | — | modified |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-DIAGNOSTICS | EL-CHV-29-SENS-01 | primary |
| ACT-ASSIST | EL-CHV-29-MOTO-03 | primary |
| ACT-HYSTERESIS-COMP | EL-CHV-29-GEAR-04 | primary |
| ACT-DAMPING | EL-CHV-29-MOTO-03 | support |
| ACT-SAFETY-MONITOR | EL-CHV-29-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-CHV-29-ECU-02 | primary |
| ACT-RETURN-TO-CENTER | EL-CHV-29-SENS-01 | primary |
| ACT-EOL-CALIB | EL-CHV-29-ECU-02 | primary |
| ACT-TORQUE-SENSE | EL-CHV-29-SENS-01 | primary |
| ACT-ANGLE-SENSE | EL-CHV-29-GEAR-04 | primary |
| ACT-ARBITRATION | EL-CHV-29-ECU-02 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-CHV-29-SENS-01 | EL-CHV-29-ECU-02 | SENT | signal | — ms | QM |
| EL-CHV-29-ECU-02 | EL-CHV-29-MOTO-03 | analog | signal | 1.79 ms | QM |
| EL-CHV-29-MOTO-03 | EL-CHV-29-GEAR-04 | PSI5 | signal | — ms | D |
| EL-CHV-29-GEAR-04 | EL-CHV-29-MECH-05 | PSI5 | signal | 18.38 ms | QM |

## 4. Requirements allocated to elements

- SR-CHV-29-0678 → EL-CHV-29-SENS-01
- SR-CHV-29-0679 → EL-CHV-29-GEAR-04
- SR-CHV-29-0679 → EL-CHV-29-ECU-02
- SR-CHV-29-0680 → EL-CHV-29-GEAR-04
- SR-CHV-29-0681 → EL-CHV-29-GEAR-04
- SR-CHV-29-0682 → EL-CHV-29-GEAR-04
- SR-CHV-29-0683 → EL-CHV-29-GEAR-04
- SR-CHV-29-0684 → EL-CHV-29-MOTO-03
- SR-CHV-29-0685 → EL-CHV-29-MOTO-03
- SR-CHV-29-0685 → EL-CHV-29-SENS-01
- SR-CHV-29-0686 → EL-CHV-29-SENS-01
- SR-CHV-29-0686 → EL-CHV-29-MECH-05
- SR-CHV-29-0687 → EL-CHV-29-MOTO-03
- SR-CHV-29-0688 → EL-CHV-29-SENS-01
- SR-CHV-29-0689 → EL-CHV-29-SENS-01
- SR-CHV-29-0690 → EL-CHV-29-GEAR-04
- SR-CHV-29-0691 → EL-CHV-29-MECH-05
- SR-CHV-29-0692 → EL-CHV-29-ECU-02
- SR-CHV-29-0693 → EL-CHV-29-SENS-01
- SR-CHV-29-0694 → EL-CHV-29-GEAR-04
- SR-CHV-29-0695 → EL-CHV-29-MECH-05
- SR-CHV-29-0695 → EL-CHV-29-ECU-02
