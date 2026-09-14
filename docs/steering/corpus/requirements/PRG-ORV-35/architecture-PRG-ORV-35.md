# System Architectural Design — Brix
**Baseline:** ARCH-ORV-35-v2 · created 2021-09-14 · baselined
**Supersedes:** ARCH-ORV-35-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-ORV-35-SENS-01 | sensor | buy | D | — | new |
| EL-ORV-35-ECU-02 | ecu | buy | C | — | modified |
| EL-ORV-35-MOTO-03 | motor | buy | B | — | carryover |
| EL-ORV-35-GEAR-04 | gearbox | make | QM | — | carryover |
| EL-ORV-35-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-MOTOR-CONTROL | EL-ORV-35-MECH-05 | primary |
| ACT-ANGLE-SENSE | EL-ORV-35-MECH-05 | primary |
| ACT-EOL-CALIB | EL-ORV-35-SENS-01 | primary |
| ACT-HYSTERESIS-COMP | EL-ORV-35-SENS-01 | primary |
| ACT-DIAGNOSTICS | EL-ORV-35-MOTO-03 | primary |
| ACT-ASSIST | EL-ORV-35-GEAR-04 | primary |
| ACT-SAFETY-MONITOR | EL-ORV-35-MOTO-03 | primary |
| ACT-TORQUE-SENSE | EL-ORV-35-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-ORV-35-SENS-01 | EL-ORV-35-ECU-02 | PWM | signal | — ms | B |
| EL-ORV-35-ECU-02 | EL-ORV-35-MOTO-03 | CAN-FD | signal | — ms | QM |
| EL-ORV-35-MOTO-03 | EL-ORV-35-GEAR-04 | PWM | signal | — ms | QM |
| EL-ORV-35-GEAR-04 | EL-ORV-35-MECH-05 | SENT | signal | 2.9 ms | D |

## 4. Requirements allocated to elements

- SR-ORV-35-0823 → EL-ORV-35-MOTO-03
- SR-ORV-35-0823 → EL-ORV-35-ECU-02
- SR-ORV-35-0824 → EL-ORV-35-MECH-05
- SR-ORV-35-0824 → EL-ORV-35-ECU-02
- SR-ORV-35-0825 → EL-ORV-35-ECU-02
- SR-ORV-35-0825 → EL-ORV-35-GEAR-04
- SR-ORV-35-0826 → EL-ORV-35-SENS-01
- SR-ORV-35-0827 → EL-ORV-35-GEAR-04
- SR-ORV-35-0828 → EL-ORV-35-GEAR-04
- SR-ORV-35-0829 → EL-ORV-35-GEAR-04
- SR-ORV-35-0830 → EL-ORV-35-SENS-01
- SR-ORV-35-0830 → EL-ORV-35-ECU-02
- SR-ORV-35-0831 → EL-ORV-35-SENS-01
- SR-ORV-35-0831 → EL-ORV-35-MOTO-03
- SR-ORV-35-0832 → EL-ORV-35-ECU-02
- SR-ORV-35-0833 → EL-ORV-35-MECH-05
- SR-ORV-35-0834 → EL-ORV-35-MOTO-03
- SR-ORV-35-0834 → EL-ORV-35-GEAR-04
- SR-ORV-35-0835 → EL-ORV-35-ECU-02
- SR-ORV-35-0835 → EL-ORV-35-SENS-01
- SR-ORV-35-0836 → EL-ORV-35-MOTO-03
- SR-ORV-35-0836 → EL-ORV-35-SENS-01
- SR-ORV-35-0837 → EL-ORV-35-ECU-02
- SR-ORV-35-0838 → EL-ORV-35-SENS-01
- SR-ORV-35-0839 → EL-ORV-35-GEAR-04
- SR-ORV-35-0840 → EL-ORV-35-MOTO-03
- SR-ORV-35-0841 → EL-ORV-35-ECU-02
- SR-ORV-35-0842 → EL-ORV-35-GEAR-04
- SR-ORV-35-0842 → EL-ORV-35-ECU-02
- SR-ORV-35-0843 → EL-ORV-35-SENS-01
- SR-ORV-35-0843 → EL-ORV-35-MECH-05
- SR-ORV-35-0844 → EL-ORV-35-SENS-01
- SR-ORV-35-0844 → EL-ORV-35-ECU-02
- SR-ORV-35-0845 → EL-ORV-35-SENS-01
- SR-ORV-35-0846 → EL-ORV-35-SENS-01
- SR-ORV-35-0847 → EL-ORV-35-MECH-05
