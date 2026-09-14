# System Architectural Design — Tarn
**Baseline:** ARCH-MRL-04-v3 · created 2020-11-12 · baselined
**Supersedes:** ARCH-MRL-04-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-MRL-04-SENS-01 | sensor | buy | C | — | carryover |
| EL-MRL-04-ECU-02 | ecu | buy | D | — | carryover |
| EL-MRL-04-MOTO-03 | motor | buy | D | — | new |
| EL-MRL-04-GEAR-04 | gearbox | make | D | — | carryover |
| EL-MRL-04-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-TORQUE-SENSE | EL-MRL-04-MECH-05 | primary |
| ACT-RETURN-TO-CENTER | EL-MRL-04-MECH-05 | primary |
| ACT-ANGLE-SENSE | EL-MRL-04-SENS-01 | primary |
| ACT-EOL-CALIB | EL-MRL-04-SENS-01 | primary |
| ACT-MOTOR-CONTROL | EL-MRL-04-MECH-05 | primary |
| ACT-ASSIST | EL-MRL-04-MECH-05 | primary |
| ACT-DIAGNOSTICS | EL-MRL-04-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-MRL-04-SENS-01 | EL-MRL-04-ECU-02 | PWM | signal | 1.68 ms | D |
| EL-MRL-04-ECU-02 | EL-MRL-04-MOTO-03 | PSI5 | signal | — ms | QM |
| EL-MRL-04-MOTO-03 | EL-MRL-04-GEAR-04 | mechanical | signal | 1.68 ms | QM |
| EL-MRL-04-GEAR-04 | EL-MRL-04-MECH-05 | mechanical | signal | 6.5 ms | B |

## 4. Requirements allocated to elements

- SR-MRL-04-0104 → EL-MRL-04-MECH-05
- SR-MRL-04-0105 → EL-MRL-04-MOTO-03
- SR-MRL-04-0105 → EL-MRL-04-ECU-02
- SR-MRL-04-0106 → EL-MRL-04-SENS-01
- SR-MRL-04-0107 → EL-MRL-04-MOTO-03
- SR-MRL-04-0107 → EL-MRL-04-ECU-02
- SR-MRL-04-0108 → EL-MRL-04-SENS-01
- SR-MRL-04-0108 → EL-MRL-04-MECH-05
- SR-MRL-04-0109 → EL-MRL-04-MOTO-03
- SR-MRL-04-0109 → EL-MRL-04-GEAR-04
- SR-MRL-04-0110 → EL-MRL-04-ECU-02
- SR-MRL-04-0110 → EL-MRL-04-GEAR-04
- SR-MRL-04-0111 → EL-MRL-04-ECU-02
- SR-MRL-04-0111 → EL-MRL-04-GEAR-04
- SR-MRL-04-0112 → EL-MRL-04-ECU-02
- SR-MRL-04-0112 → EL-MRL-04-SENS-01
- SR-MRL-04-0113 → EL-MRL-04-MOTO-03
- SR-MRL-04-0114 → EL-MRL-04-GEAR-04
- SR-MRL-04-0115 → EL-MRL-04-MECH-05
- SR-MRL-04-0116 → EL-MRL-04-GEAR-04
- SR-MRL-04-0117 → EL-MRL-04-MECH-05
- SR-MRL-04-0118 → EL-MRL-04-GEAR-04
- SR-MRL-04-0119 → EL-MRL-04-ECU-02
- SR-MRL-04-0120 → EL-MRL-04-MOTO-03
- SR-MRL-04-0120 → EL-MRL-04-ECU-02
- SR-MRL-04-0121 → EL-MRL-04-ECU-02
- SR-MRL-04-0121 → EL-MRL-04-MOTO-03
- SR-MRL-04-0122 → EL-MRL-04-MECH-05
- SR-MRL-04-0123 → EL-MRL-04-GEAR-04
- SR-MRL-04-0123 → EL-MRL-04-MECH-05
