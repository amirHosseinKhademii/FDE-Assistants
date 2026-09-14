# System Architectural Design — Fathom
**Baseline:** ARCH-NBX-15-v2 · created 2023-11-25 · baselined
**Supersedes:** ARCH-NBX-15-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-NBX-15-SENS-01 | sensor | buy | D | — | carryover |
| EL-NBX-15-ECU-02 | ecu | buy | B | — | new |
| EL-NBX-15-MOTO-03 | motor | buy | QM | — | new |
| EL-NBX-15-GEAR-04 | gearbox | make | D | — | new |
| EL-NBX-15-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-MOTOR-CONTROL | EL-NBX-15-ECU-02 | primary |
| ACT-FRICTION-COMP | EL-NBX-15-GEAR-04 | support |
| ACT-HYSTERESIS-COMP | EL-NBX-15-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-NBX-15-SENS-01 | primary |
| ACT-TORQUE-SENSE | EL-NBX-15-MOTO-03 | primary |
| ACT-SAFETY-MONITOR | EL-NBX-15-MECH-05 | primary |
| ACT-RETURN-TO-CENTER | EL-NBX-15-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-NBX-15-SENS-01 | EL-NBX-15-ECU-02 | mechanical | signal | 10.16 ms | D |
| EL-NBX-15-ECU-02 | EL-NBX-15-MOTO-03 | SENT | signal | — ms | QM |
| EL-NBX-15-MOTO-03 | EL-NBX-15-GEAR-04 | PSI5 | signal | 12.4 ms | B |
| EL-NBX-15-GEAR-04 | EL-NBX-15-MECH-05 | mechanical | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-NBX-15-0341 → EL-NBX-15-SENS-01
- SR-NBX-15-0342 → EL-NBX-15-MECH-05
- SR-NBX-15-0343 → EL-NBX-15-GEAR-04
- SR-NBX-15-0343 → EL-NBX-15-MECH-05
- SR-NBX-15-0344 → EL-NBX-15-GEAR-04
- SR-NBX-15-0345 → EL-NBX-15-ECU-02
- SR-NBX-15-0345 → EL-NBX-15-MECH-05
- SR-NBX-15-0346 → EL-NBX-15-SENS-01
- SR-NBX-15-0346 → EL-NBX-15-MECH-05
- SR-NBX-15-0347 → EL-NBX-15-SENS-01
- SR-NBX-15-0347 → EL-NBX-15-GEAR-04
- SR-NBX-15-0348 → EL-NBX-15-SENS-01
- SR-NBX-15-0349 → EL-NBX-15-SENS-01
- SR-NBX-15-0349 → EL-NBX-15-MOTO-03
- SR-NBX-15-0350 → EL-NBX-15-ECU-02
- SR-NBX-15-0351 → EL-NBX-15-MOTO-03
- SR-NBX-15-0352 → EL-NBX-15-ECU-02
- SR-NBX-15-0353 → EL-NBX-15-ECU-02
- SR-NBX-15-0354 → EL-NBX-15-ECU-02
- SR-NBX-15-0354 → EL-NBX-15-MOTO-03
- SR-NBX-15-0355 → EL-NBX-15-SENS-01
- SR-NBX-15-0356 → EL-NBX-15-MOTO-03
- SR-NBX-15-0357 → EL-NBX-15-MOTO-03
- SR-NBX-15-0358 → EL-NBX-15-GEAR-04
- SR-NBX-15-0358 → EL-NBX-15-SENS-01
- SR-NBX-15-0359 → EL-NBX-15-GEAR-04
- SR-NBX-15-0359 → EL-NBX-15-SENS-01
- SR-NBX-15-0360 → EL-NBX-15-GEAR-04
- SR-NBX-15-0361 → EL-NBX-15-MECH-05
- SR-NBX-15-0362 → EL-NBX-15-GEAR-04
- SR-NBX-15-0362 → EL-NBX-15-ECU-02
- SR-NBX-15-0363 → EL-NBX-15-ECU-02
- SR-NBX-15-0363 → EL-NBX-15-GEAR-04
- SR-NBX-15-0364 → EL-NBX-15-MOTO-03
- SR-NBX-15-0365 → EL-NBX-15-ECU-02
- SR-NBX-15-0366 → EL-NBX-15-GEAR-04
- SR-NBX-15-0367 → EL-NBX-15-MOTO-03
