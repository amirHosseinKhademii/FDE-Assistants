# System Architectural Design — Calder
**Baseline:** ARCH-ALT-08-v1 · created 2023-06-11 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-ALT-08-SENS-01 | sensor | buy | C | — | new |
| EL-ALT-08-ECU-02 | ecu | buy | D | — | modified |
| EL-ALT-08-MOTO-03 | motor | buy | D | — | carryover |
| EL-ALT-08-GEAR-04 | gearbox | make | C | — | carryover |
| EL-ALT-08-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-ALT-08-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-ALT-08-MECH-05 | primary |
| ACT-DAMPING | EL-ALT-08-ECU-02 | primary |
| ACT-MOTOR-CONTROL | EL-ALT-08-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-ALT-08-MOTO-03 | primary |
| ACT-SAFETY-MONITOR | EL-ALT-08-MECH-05 | primary |
| ACT-HYSTERESIS-COMP | EL-ALT-08-SENS-01 | primary |
| ACT-FRICTION-COMP | EL-ALT-08-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-ALT-08-MOTO-03 | primary |
| ACT-DIAGNOSTICS | EL-ALT-08-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-ALT-08-SENS-01 | EL-ALT-08-ECU-02 | PSI5 | signal | — ms | QM |
| EL-ALT-08-ECU-02 | EL-ALT-08-MOTO-03 | CAN-FD | signal | — ms | B |
| EL-ALT-08-MOTO-03 | EL-ALT-08-GEAR-04 | mechanical | signal | 1.77 ms | QM |
| EL-ALT-08-GEAR-04 | EL-ALT-08-MECH-05 | mechanical | signal | 17.58 ms | B |

## 4. Requirements allocated to elements

- SR-ALT-08-0181 → EL-ALT-08-MECH-05
- SR-ALT-08-0181 → EL-ALT-08-ECU-02
- SR-ALT-08-0182 → EL-ALT-08-MOTO-03
- SR-ALT-08-0183 → EL-ALT-08-GEAR-04
- SR-ALT-08-0184 → EL-ALT-08-GEAR-04
- SR-ALT-08-0184 → EL-ALT-08-MOTO-03
- SR-ALT-08-0185 → EL-ALT-08-MECH-05
- SR-ALT-08-0185 → EL-ALT-08-ECU-02
- SR-ALT-08-0186 → EL-ALT-08-MOTO-03
- SR-ALT-08-0187 → EL-ALT-08-MOTO-03
- SR-ALT-08-0188 → EL-ALT-08-SENS-01
- SR-ALT-08-0189 → EL-ALT-08-ECU-02
- SR-ALT-08-0190 → EL-ALT-08-ECU-02
- SR-ALT-08-0190 → EL-ALT-08-MECH-05
- SR-ALT-08-0191 → EL-ALT-08-MECH-05
- SR-ALT-08-0191 → EL-ALT-08-SENS-01
- SR-ALT-08-0192 → EL-ALT-08-GEAR-04
- SR-ALT-08-0192 → EL-ALT-08-MECH-05
- SR-ALT-08-0193 → EL-ALT-08-MECH-05
- SR-ALT-08-0193 → EL-ALT-08-MOTO-03
- SR-ALT-08-0194 → EL-ALT-08-SENS-01
- SR-ALT-08-0194 → EL-ALT-08-ECU-02
- SR-ALT-08-0195 → EL-ALT-08-GEAR-04
- SR-ALT-08-0196 → EL-ALT-08-SENS-01
- SR-ALT-08-0197 → EL-ALT-08-MOTO-03
- SR-ALT-08-0198 → EL-ALT-08-MECH-05
- SR-ALT-08-0198 → EL-ALT-08-ECU-02
