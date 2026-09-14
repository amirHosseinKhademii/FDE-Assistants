# System Architectural Design — Ryde
**Baseline:** ARCH-ORV-23-v2 · created 2023-01-19 · baselined
**Supersedes:** ARCH-ORV-23-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-ORV-23-SENS-01 | sensor | buy | D | — | modified |
| EL-ORV-23-ECU-02 | ecu | buy | QM | — | carryover |
| EL-ORV-23-MOTO-03 | motor | buy | B | — | carryover |
| EL-ORV-23-GEAR-04 | gearbox | make | B | — | carryover |
| EL-ORV-23-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-SAFETY-MONITOR | EL-ORV-23-ECU-02 | primary |
| ACT-FRICTION-COMP | EL-ORV-23-MECH-05 | support |
| ACT-DIAGNOSTICS | EL-ORV-23-GEAR-04 | primary |
| ACT-HYSTERESIS-COMP | EL-ORV-23-ECU-02 | primary |
| ACT-EOL-CALIB | EL-ORV-23-MOTO-03 | primary |
| ACT-TORQUE-SENSE | EL-ORV-23-MECH-05 | primary |
| ACT-DAMPING | EL-ORV-23-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-ORV-23-GEAR-04 | support |
| ACT-RETURN-TO-CENTER | EL-ORV-23-MOTO-03 | primary |
| ACT-ASSIST | EL-ORV-23-SENS-01 | support |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-ORV-23-SENS-01 | EL-ORV-23-ECU-02 | PSI5 | signal | — ms | B |
| EL-ORV-23-ECU-02 | EL-ORV-23-MOTO-03 | CAN-FD | signal | 18.28 ms | QM |
| EL-ORV-23-MOTO-03 | EL-ORV-23-GEAR-04 | PSI5 | signal | 0.94 ms | B |
| EL-ORV-23-GEAR-04 | EL-ORV-23-MECH-05 | CAN-FD | signal | 14.45 ms | B |

## 4. Requirements allocated to elements

- SR-ORV-23-0551 → EL-ORV-23-ECU-02
- SR-ORV-23-0551 → EL-ORV-23-GEAR-04
- SR-ORV-23-0552 → EL-ORV-23-SENS-01
- SR-ORV-23-0553 → EL-ORV-23-MOTO-03
- SR-ORV-23-0553 → EL-ORV-23-ECU-02
- SR-ORV-23-0554 → EL-ORV-23-GEAR-04
- SR-ORV-23-0555 → EL-ORV-23-SENS-01
- SR-ORV-23-0556 → EL-ORV-23-MECH-05
- SR-ORV-23-0556 → EL-ORV-23-MOTO-03
- SR-ORV-23-0557 → EL-ORV-23-MECH-05
- SR-ORV-23-0558 → EL-ORV-23-MOTO-03
- SR-ORV-23-0558 → EL-ORV-23-MECH-05
- SR-ORV-23-0559 → EL-ORV-23-SENS-01
- SR-ORV-23-0559 → EL-ORV-23-GEAR-04
- SR-ORV-23-0560 → EL-ORV-23-ECU-02
- SR-ORV-23-0561 → EL-ORV-23-GEAR-04
- SR-ORV-23-0561 → EL-ORV-23-MECH-05
- SR-ORV-23-0562 → EL-ORV-23-GEAR-04
- SR-ORV-23-0563 → EL-ORV-23-ECU-02
- SR-ORV-23-0563 → EL-ORV-23-MECH-05
- SR-ORV-23-0564 → EL-ORV-23-ECU-02
- SR-ORV-23-0565 → EL-ORV-23-MECH-05
- SR-ORV-23-0566 → EL-ORV-23-MOTO-03
- SR-ORV-23-0566 → EL-ORV-23-ECU-02
- SR-ORV-23-0567 → EL-ORV-23-SENS-01
