# System Architectural Design — Borea
**Baseline:** ARCH-CHV-36-v3 · created 2024-03-04 · baselined
**Supersedes:** ARCH-CHV-36-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-CHV-36-SENS-01 | sensor | buy | QM | — | carryover |
| EL-CHV-36-ECU-02 | ecu | buy | B | — | modified |
| EL-CHV-36-MOTO-03 | motor | buy | B | — | carryover |
| EL-CHV-36-GEAR-04 | gearbox | make | QM | — | modified |
| EL-CHV-36-MECH-05 | mechanical | make | D | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-CHV-36-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-CHV-36-GEAR-04 | primary |
| ACT-FRICTION-COMP | EL-CHV-36-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-CHV-36-MECH-05 | support |
| ACT-HYSTERESIS-COMP | EL-CHV-36-MOTO-03 | primary |
| ACT-DAMPING | EL-CHV-36-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-CHV-36-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-CHV-36-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-CHV-36-SENS-01 | EL-CHV-36-ECU-02 | PSI5 | signal | — ms | D |
| EL-CHV-36-ECU-02 | EL-CHV-36-MOTO-03 | SENT | signal | 9.11 ms | D |
| EL-CHV-36-MOTO-03 | EL-CHV-36-GEAR-04 | mechanical | signal | 13.19 ms | B |
| EL-CHV-36-GEAR-04 | EL-CHV-36-MECH-05 | analog | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-CHV-36-0848 → EL-CHV-36-ECU-02
- SR-CHV-36-0849 → EL-CHV-36-SENS-01
- SR-CHV-36-0850 → EL-CHV-36-MOTO-03
- SR-CHV-36-0851 → EL-CHV-36-SENS-01
- SR-CHV-36-0852 → EL-CHV-36-ECU-02
- SR-CHV-36-0852 → EL-CHV-36-MECH-05
- SR-CHV-36-0853 → EL-CHV-36-MECH-05
- SR-CHV-36-0853 → EL-CHV-36-GEAR-04
- SR-CHV-36-0854 → EL-CHV-36-MECH-05
- SR-CHV-36-0854 → EL-CHV-36-GEAR-04
- SR-CHV-36-0855 → EL-CHV-36-SENS-01
- SR-CHV-36-0855 → EL-CHV-36-MOTO-03
- SR-CHV-36-0856 → EL-CHV-36-ECU-02
- SR-CHV-36-0856 → EL-CHV-36-MECH-05
- SR-CHV-36-0857 → EL-CHV-36-MOTO-03
- SR-CHV-36-0858 → EL-CHV-36-ECU-02
- SR-CHV-36-0858 → EL-CHV-36-SENS-01
- SR-CHV-36-0859 → EL-CHV-36-MOTO-03
- SR-CHV-36-0860 → EL-CHV-36-SENS-01
- SR-CHV-36-0861 → EL-CHV-36-ECU-02
- SR-CHV-36-0861 → EL-CHV-36-MOTO-03
- SR-CHV-36-0862 → EL-CHV-36-SENS-01
- SR-CHV-36-0863 → EL-CHV-36-MOTO-03
- SR-CHV-36-0863 → EL-CHV-36-ECU-02
- SR-CHV-36-0864 → EL-CHV-36-MOTO-03
