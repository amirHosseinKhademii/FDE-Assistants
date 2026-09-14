# System Architectural Design — Morrow
**Baseline:** ARCH-TDR-17-v1 · created 2021-03-05 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-17-SENS-01 | sensor | buy | QM | — | carryover |
| EL-TDR-17-ECU-02 | ecu | buy | B | — | carryover |
| EL-TDR-17-MOTO-03 | motor | buy | C | — | carryover |
| EL-TDR-17-GEAR-04 | gearbox | make | B | — | modified |
| EL-TDR-17-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-EOL-CALIB | EL-TDR-17-MOTO-03 | primary |
| ACT-SAFETY-MONITOR | EL-TDR-17-SENS-01 | primary |
| ACT-ANGLE-SENSE | EL-TDR-17-MECH-05 | support |
| ACT-RETURN-TO-CENTER | EL-TDR-17-ECU-02 | primary |
| ACT-ASSIST | EL-TDR-17-MOTO-03 | primary |
| ACT-TORQUE-SENSE | EL-TDR-17-MECH-05 | primary |
| ACT-DAMPING | EL-TDR-17-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-17-SENS-01 | EL-TDR-17-ECU-02 | PSI5 | signal | 0.54 ms | D |
| EL-TDR-17-ECU-02 | EL-TDR-17-MOTO-03 | PWM | signal | — ms | B |
| EL-TDR-17-MOTO-03 | EL-TDR-17-GEAR-04 | analog | signal | 3.02 ms | B |
| EL-TDR-17-GEAR-04 | EL-TDR-17-MECH-05 | mechanical | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-TDR-17-0388 → EL-TDR-17-MECH-05
- SR-TDR-17-0388 → EL-TDR-17-MOTO-03
- SR-TDR-17-0389 → EL-TDR-17-MOTO-03
- SR-TDR-17-0389 → EL-TDR-17-SENS-01
- SR-TDR-17-0390 → EL-TDR-17-MOTO-03
- SR-TDR-17-0390 → EL-TDR-17-SENS-01
- SR-TDR-17-0391 → EL-TDR-17-ECU-02
- SR-TDR-17-0392 → EL-TDR-17-SENS-01
- SR-TDR-17-0392 → EL-TDR-17-MECH-05
- SR-TDR-17-0393 → EL-TDR-17-ECU-02
- SR-TDR-17-0393 → EL-TDR-17-MECH-05
- SR-TDR-17-0394 → EL-TDR-17-MECH-05
- SR-TDR-17-0394 → EL-TDR-17-MOTO-03
- SR-TDR-17-0395 → EL-TDR-17-ECU-02
- SR-TDR-17-0396 → EL-TDR-17-MOTO-03
- SR-TDR-17-0396 → EL-TDR-17-ECU-02
- SR-TDR-17-0397 → EL-TDR-17-ECU-02
- SR-TDR-17-0397 → EL-TDR-17-GEAR-04
- SR-TDR-17-0398 → EL-TDR-17-SENS-01
- SR-TDR-17-0399 → EL-TDR-17-GEAR-04
- SR-TDR-17-0399 → EL-TDR-17-ECU-02
- SR-TDR-17-0400 → EL-TDR-17-SENS-01
- SR-TDR-17-0400 → EL-TDR-17-ECU-02
- SR-TDR-17-0401 → EL-TDR-17-MECH-05
- SR-TDR-17-0402 → EL-TDR-17-ECU-02
- SR-TDR-17-0402 → EL-TDR-17-MECH-05
- SR-TDR-17-0403 → EL-TDR-17-SENS-01
- SR-TDR-17-0403 → EL-TDR-17-MOTO-03
- SR-TDR-17-0404 → EL-TDR-17-MOTO-03
- SR-TDR-17-0405 → EL-TDR-17-MECH-05
- SR-TDR-17-0406 → EL-TDR-17-ECU-02
- SR-TDR-17-0407 → EL-TDR-17-MECH-05
- SR-TDR-17-0407 → EL-TDR-17-MOTO-03
- SR-TDR-17-0408 → EL-TDR-17-ECU-02
- SR-TDR-17-0408 → EL-TDR-17-MOTO-03
- SR-TDR-17-0409 → EL-TDR-17-ECU-02
- SR-TDR-17-0409 → EL-TDR-17-SENS-01
- SR-TDR-17-0410 → EL-TDR-17-GEAR-04
- SR-TDR-17-0410 → EL-TDR-17-ECU-02
- SR-TDR-17-0411 → EL-TDR-17-SENS-01
- SR-TDR-17-0412 → EL-TDR-17-MOTO-03
- SR-TDR-17-0412 → EL-TDR-17-GEAR-04
- SR-TDR-17-0413 → EL-TDR-17-MECH-05
- SR-TDR-17-0414 → EL-TDR-17-SENS-01
- SR-TDR-17-0414 → EL-TDR-17-GEAR-04
- SR-TDR-17-0415 → EL-TDR-17-MECH-05
- SR-TDR-17-0416 → EL-TDR-17-ECU-02
