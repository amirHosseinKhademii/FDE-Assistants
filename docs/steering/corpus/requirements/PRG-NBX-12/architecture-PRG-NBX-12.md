# System Architectural Design — Yarrow
**Baseline:** ARCH-NBX-12-v2 · created 2020-12-11 · baselined
**Supersedes:** ARCH-NBX-12-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-NBX-12-SENS-01 | sensor | buy | C | — | modified |
| EL-NBX-12-ECU-02 | ecu | buy | QM | — | carryover |
| EL-NBX-12-MOTO-03 | motor | buy | QM | — | carryover |
| EL-NBX-12-GEAR-04 | gearbox | make | C | — | new |
| EL-NBX-12-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-NBX-12-ECU-02 | primary |
| ACT-RETURN-TO-CENTER | EL-NBX-12-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-NBX-12-SENS-01 | primary |
| ACT-SAFETY-MONITOR | EL-NBX-12-ECU-02 | primary |
| ACT-MOTOR-CONTROL | EL-NBX-12-MOTO-03 | primary |
| ACT-FRICTION-COMP | EL-NBX-12-MECH-05 | primary |
| ACT-EOL-CALIB | EL-NBX-12-ECU-02 | primary |
| ACT-TORQUE-SENSE | EL-NBX-12-MOTO-03 | primary |
| ACT-DAMPING | EL-NBX-12-GEAR-04 | primary |
| ACT-ARBITRATION | EL-NBX-12-ECU-02 | primary |
| ACT-DIAGNOSTICS | EL-NBX-12-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-NBX-12-SENS-01 | EL-NBX-12-ECU-02 | analog | signal | 2.61 ms | B |
| EL-NBX-12-ECU-02 | EL-NBX-12-MOTO-03 | mechanical | signal | 17.51 ms | D |
| EL-NBX-12-MOTO-03 | EL-NBX-12-GEAR-04 | PWM | signal | 1.05 ms | B |
| EL-NBX-12-GEAR-04 | EL-NBX-12-MECH-05 | CAN-FD | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-NBX-12-0281 → EL-NBX-12-MOTO-03
- SR-NBX-12-0282 → EL-NBX-12-MECH-05
- SR-NBX-12-0283 → EL-NBX-12-GEAR-04
- SR-NBX-12-0283 → EL-NBX-12-ECU-02
- SR-NBX-12-0284 → EL-NBX-12-ECU-02
- SR-NBX-12-0285 → EL-NBX-12-MECH-05
- SR-NBX-12-0286 → EL-NBX-12-MECH-05
- SR-NBX-12-0287 → EL-NBX-12-MOTO-03
- SR-NBX-12-0287 → EL-NBX-12-SENS-01
- SR-NBX-12-0288 → EL-NBX-12-MOTO-03
- SR-NBX-12-0289 → EL-NBX-12-ECU-02
- SR-NBX-12-0290 → EL-NBX-12-MOTO-03
- SR-NBX-12-0290 → EL-NBX-12-MECH-05
- SR-NBX-12-0291 → EL-NBX-12-MOTO-03
- SR-NBX-12-0291 → EL-NBX-12-MECH-05
- SR-NBX-12-0292 → EL-NBX-12-GEAR-04
- SR-NBX-12-0292 → EL-NBX-12-MOTO-03
- SR-NBX-12-0293 → EL-NBX-12-SENS-01
- SR-NBX-12-0293 → EL-NBX-12-GEAR-04
- SR-NBX-12-0294 → EL-NBX-12-MECH-05
- SR-NBX-12-0295 → EL-NBX-12-MOTO-03
- SR-NBX-12-0295 → EL-NBX-12-ECU-02
- SR-NBX-12-0296 → EL-NBX-12-MECH-05
- SR-NBX-12-0296 → EL-NBX-12-SENS-01
- SR-NBX-12-0297 → EL-NBX-12-MOTO-03
- SR-NBX-12-0298 → EL-NBX-12-GEAR-04
- SR-NBX-12-0298 → EL-NBX-12-SENS-01
- SR-NBX-12-0299 → EL-NBX-12-MECH-05
- SR-NBX-12-0300 → EL-NBX-12-GEAR-04
- SR-NBX-12-0301 → EL-NBX-12-GEAR-04
- SR-NBX-12-0302 → EL-NBX-12-SENS-01
- SR-NBX-12-0302 → EL-NBX-12-GEAR-04
