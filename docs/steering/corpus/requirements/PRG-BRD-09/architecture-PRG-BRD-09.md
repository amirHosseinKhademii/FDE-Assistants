# System Architectural Design — Solen
**Baseline:** ARCH-BRD-09-v2 · created 2024-07-04 · baselined
**Supersedes:** ARCH-BRD-09-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-BRD-09-SENS-01 | sensor | buy | D | — | carryover |
| EL-BRD-09-ECU-02 | ecu | buy | QM | — | modified |
| EL-BRD-09-MOTO-03 | motor | buy | D | — | modified |
| EL-BRD-09-GEAR-04 | gearbox | make | C | — | carryover |
| EL-BRD-09-MECH-05 | mechanical | make | QM | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-FRICTION-COMP | EL-BRD-09-ECU-02 | primary |
| ACT-SAFETY-MONITOR | EL-BRD-09-ECU-02 | primary |
| ACT-RETURN-TO-CENTER | EL-BRD-09-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-BRD-09-SENS-01 | primary |
| ACT-ARBITRATION | EL-BRD-09-SENS-01 | primary |
| ACT-HYSTERESIS-COMP | EL-BRD-09-MOTO-03 | primary |
| ACT-DIAGNOSTICS | EL-BRD-09-GEAR-04 | primary |
| ACT-ASSIST | EL-BRD-09-MECH-05 | primary |
| ACT-EOL-CALIB | EL-BRD-09-MOTO-03 | support |
| ACT-MOTOR-CONTROL | EL-BRD-09-ECU-02 | primary |
| ACT-TORQUE-SENSE | EL-BRD-09-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-BRD-09-SENS-01 | EL-BRD-09-ECU-02 | PWM | signal | 6.46 ms | B |
| EL-BRD-09-ECU-02 | EL-BRD-09-MOTO-03 | mechanical | signal | — ms | B |
| EL-BRD-09-MOTO-03 | EL-BRD-09-GEAR-04 | PWM | signal | 9.59 ms | B |
| EL-BRD-09-GEAR-04 | EL-BRD-09-MECH-05 | PWM | signal | 19.39 ms | B |

## 4. Requirements allocated to elements

- SR-BRD-09-0199 → EL-BRD-09-MOTO-03
- SR-BRD-09-0199 → EL-BRD-09-SENS-01
- SR-BRD-09-0200 → EL-BRD-09-SENS-01
- SR-BRD-09-0201 → EL-BRD-09-MECH-05
- SR-BRD-09-0201 → EL-BRD-09-MOTO-03
- SR-BRD-09-0202 → EL-BRD-09-GEAR-04
- SR-BRD-09-0203 → EL-BRD-09-MOTO-03
- SR-BRD-09-0204 → EL-BRD-09-SENS-01
- SR-BRD-09-0205 → EL-BRD-09-ECU-02
- SR-BRD-09-0205 → EL-BRD-09-SENS-01
- SR-BRD-09-0206 → EL-BRD-09-MOTO-03
- SR-BRD-09-0206 → EL-BRD-09-GEAR-04
- SR-BRD-09-0207 → EL-BRD-09-SENS-01
- SR-BRD-09-0208 → EL-BRD-09-GEAR-04
- SR-BRD-09-0208 → EL-BRD-09-MOTO-03
- SR-BRD-09-0209 → EL-BRD-09-GEAR-04
- SR-BRD-09-0210 → EL-BRD-09-MECH-05
- SR-BRD-09-0211 → EL-BRD-09-GEAR-04
- SR-BRD-09-0212 → EL-BRD-09-GEAR-04
- SR-BRD-09-0212 → EL-BRD-09-SENS-01
- SR-BRD-09-0213 → EL-BRD-09-MECH-05
- SR-BRD-09-0214 → EL-BRD-09-MECH-05
- SR-BRD-09-0215 → EL-BRD-09-ECU-02
- SR-BRD-09-0216 → EL-BRD-09-ECU-02
- SR-BRD-09-0216 → EL-BRD-09-MECH-05
- SR-BRD-09-0217 → EL-BRD-09-MOTO-03
- SR-BRD-09-0218 → EL-BRD-09-MECH-05
- SR-BRD-09-0219 → EL-BRD-09-ECU-02
- SR-BRD-09-0219 → EL-BRD-09-GEAR-04
- SR-BRD-09-0220 → EL-BRD-09-ECU-02
- SR-BRD-09-0221 → EL-BRD-09-GEAR-04
- SR-BRD-09-0221 → EL-BRD-09-SENS-01
- SR-BRD-09-0222 → EL-BRD-09-MOTO-03
- SR-BRD-09-0222 → EL-BRD-09-MECH-05
- SR-BRD-09-0223 → EL-BRD-09-GEAR-04
- SR-BRD-09-0224 → EL-BRD-09-MECH-05
- SR-BRD-09-0224 → EL-BRD-09-GEAR-04
- SR-BRD-09-0225 → EL-BRD-09-GEAR-04
- SR-BRD-09-0226 → EL-BRD-09-MECH-05
- SR-BRD-09-0227 → EL-BRD-09-MECH-05
