# System Architectural Design — H1
**Baseline:** ARCH-HLX-H1-v1 · created 2023-09-23 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-HLX-H1-SENS-01 | sensor | buy | C | — | carryover |
| EL-HLX-H1-ECU-02 | ecu | buy | C | — | carryover |
| EL-HLX-H1-MOTO-03 | motor | buy | QM | — | new |
| EL-HLX-H1-GEAR-04 | gearbox | make | B | — | new |
| EL-HLX-H1-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-HYSTERESIS-COMP | EL-HLX-H1-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-HLX-H1-SENS-01 | primary |
| ACT-DAMPING | EL-HLX-H1-MOTO-03 | primary |
| ACT-SAFETY-MONITOR | EL-HLX-H1-ECU-02 | primary |
| ACT-MOTOR-CONTROL | EL-HLX-H1-ECU-02 | primary |
| ACT-FRICTION-COMP | EL-HLX-H1-MECH-05 | support |
| ACT-ARBITRATION | EL-HLX-H1-GEAR-04 | primary |
| ACT-ASSIST | EL-HLX-H1-MOTO-03 | primary |
| ACT-DIAGNOSTICS | EL-HLX-H1-SENS-01 | support |
| ACT-ANGLE-SENSE | EL-HLX-H1-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-HLX-H1-SENS-01 | EL-HLX-H1-ECU-02 | analog | signal | 4.42 ms | D |
| EL-HLX-H1-ECU-02 | EL-HLX-H1-MOTO-03 | CAN-FD | signal | 11.99 ms | D |
| EL-HLX-H1-MOTO-03 | EL-HLX-H1-GEAR-04 | CAN-FD | signal | 6.62 ms | QM |
| EL-HLX-H1-GEAR-04 | EL-HLX-H1-MECH-05 | PWM | signal | 18.24 ms | QM |

## 4. Requirements allocated to elements

- SR-HLX-H1-0001 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0002 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0002 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0003 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0004 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0005 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0005 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0006 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0006 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0007 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0008 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0008 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0009 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0009 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0010 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0011 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0012 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0012 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0013 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0013 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0014 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0014 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0015 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0016 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0016 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0017 → EL-HLX-H1-SENS-01
- SR-HLX-H1-0017 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0018 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0019 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0019 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0020 → EL-HLX-H1-GEAR-04
- SR-HLX-H1-0021 → EL-HLX-H1-MECH-05
- SR-HLX-H1-0021 → EL-HLX-H1-MOTO-03
- SR-HLX-H1-0022 → EL-HLX-H1-ECU-02
- SR-HLX-H1-0022 → EL-HLX-H1-GEAR-04
