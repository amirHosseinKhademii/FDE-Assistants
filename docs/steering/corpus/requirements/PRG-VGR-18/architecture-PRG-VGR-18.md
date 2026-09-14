# System Architectural Design — Eyre
**Baseline:** ARCH-VGR-18-v1 · created 2023-06-02 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-VGR-18-SENS-01 | sensor | buy | C | — | carryover |
| EL-VGR-18-ECU-02 | ecu | buy | QM | — | carryover |
| EL-VGR-18-MOTO-03 | motor | buy | B | — | modified |
| EL-VGR-18-GEAR-04 | gearbox | make | D | — | modified |
| EL-VGR-18-MECH-05 | mechanical | make | D | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ANGLE-SENSE | EL-VGR-18-ECU-02 | primary |
| ACT-SAFETY-MONITOR | EL-VGR-18-SENS-01 | primary |
| ACT-DAMPING | EL-VGR-18-MECH-05 | primary |
| ACT-HYSTERESIS-COMP | EL-VGR-18-MECH-05 | primary |
| ACT-EOL-CALIB | EL-VGR-18-MECH-05 | primary |
| ACT-FRICTION-COMP | EL-VGR-18-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-VGR-18-ECU-02 | primary |
| ACT-ASSIST | EL-VGR-18-SENS-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-VGR-18-SENS-01 | EL-VGR-18-ECU-02 | PWM | signal | — ms | D |
| EL-VGR-18-ECU-02 | EL-VGR-18-MOTO-03 | analog | signal | 1.66 ms | QM |
| EL-VGR-18-MOTO-03 | EL-VGR-18-GEAR-04 | PSI5 | signal | — ms | QM |
| EL-VGR-18-GEAR-04 | EL-VGR-18-MECH-05 | PWM | signal | 13.92 ms | B |

## 4. Requirements allocated to elements

- SR-VGR-18-0417 → EL-VGR-18-GEAR-04
- SR-VGR-18-0418 → EL-VGR-18-MECH-05
- SR-VGR-18-0418 → EL-VGR-18-MOTO-03
- SR-VGR-18-0419 → EL-VGR-18-ECU-02
- SR-VGR-18-0420 → EL-VGR-18-GEAR-04
- SR-VGR-18-0420 → EL-VGR-18-MECH-05
- SR-VGR-18-0421 → EL-VGR-18-GEAR-04
- SR-VGR-18-0421 → EL-VGR-18-MOTO-03
- SR-VGR-18-0422 → EL-VGR-18-MOTO-03
- SR-VGR-18-0422 → EL-VGR-18-ECU-02
- SR-VGR-18-0423 → EL-VGR-18-MOTO-03
- SR-VGR-18-0423 → EL-VGR-18-SENS-01
- SR-VGR-18-0424 → EL-VGR-18-GEAR-04
- SR-VGR-18-0425 → EL-VGR-18-ECU-02
- SR-VGR-18-0425 → EL-VGR-18-MECH-05
- SR-VGR-18-0426 → EL-VGR-18-MOTO-03
- SR-VGR-18-0426 → EL-VGR-18-SENS-01
- SR-VGR-18-0427 → EL-VGR-18-MECH-05
- SR-VGR-18-0428 → EL-VGR-18-GEAR-04
- SR-VGR-18-0429 → EL-VGR-18-GEAR-04
- SR-VGR-18-0429 → EL-VGR-18-MECH-05
- SR-VGR-18-0430 → EL-VGR-18-SENS-01
- SR-VGR-18-0430 → EL-VGR-18-ECU-02
- SR-VGR-18-0431 → EL-VGR-18-MECH-05
- SR-VGR-18-0432 → EL-VGR-18-MOTO-03
- SR-VGR-18-0432 → EL-VGR-18-SENS-01
- SR-VGR-18-0433 → EL-VGR-18-GEAR-04
- SR-VGR-18-0434 → EL-VGR-18-GEAR-04
- SR-VGR-18-0434 → EL-VGR-18-MECH-05
- SR-VGR-18-0435 → EL-VGR-18-ECU-02
- SR-VGR-18-0436 → EL-VGR-18-GEAR-04
- SR-VGR-18-0436 → EL-VGR-18-MECH-05
- SR-VGR-18-0437 → EL-VGR-18-MOTO-03
- SR-VGR-18-0438 → EL-VGR-18-ECU-02
- SR-VGR-18-0439 → EL-VGR-18-MECH-05
- SR-VGR-18-0440 → EL-VGR-18-ECU-02
- SR-VGR-18-0441 → EL-VGR-18-ECU-02
- SR-VGR-18-0441 → EL-VGR-18-SENS-01
- SR-VGR-18-0442 → EL-VGR-18-GEAR-04
- SR-VGR-18-0442 → EL-VGR-18-SENS-01
- SR-VGR-18-0443 → EL-VGR-18-ECU-02
