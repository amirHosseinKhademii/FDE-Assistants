# System Architectural Design — Kestra
**Baseline:** ARCH-TDR-19-v1 · created 2023-08-26 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-19-SENS-01 | sensor | buy | QM | — | carryover |
| EL-TDR-19-ECU-02 | ecu | buy | D | — | carryover |
| EL-TDR-19-MOTO-03 | motor | buy | D | — | carryover |
| EL-TDR-19-GEAR-04 | gearbox | make | B | — | modified |
| EL-TDR-19-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-DAMPING | EL-TDR-19-ECU-02 | primary |
| ACT-SAFETY-MONITOR | EL-TDR-19-GEAR-04 | primary |
| ACT-ANGLE-SENSE | EL-TDR-19-MECH-05 | primary |
| ACT-EOL-CALIB | EL-TDR-19-GEAR-04 | primary |
| ACT-ARBITRATION | EL-TDR-19-GEAR-04 | primary |
| ACT-HYSTERESIS-COMP | EL-TDR-19-ECU-02 | primary |
| ACT-ASSIST | EL-TDR-19-ECU-02 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-19-SENS-01 | EL-TDR-19-ECU-02 | analog | signal | 3.16 ms | B |
| EL-TDR-19-ECU-02 | EL-TDR-19-MOTO-03 | SENT | signal | 5.06 ms | D |
| EL-TDR-19-MOTO-03 | EL-TDR-19-GEAR-04 | mechanical | signal | — ms | D |
| EL-TDR-19-GEAR-04 | EL-TDR-19-MECH-05 | CAN-FD | signal | 14.64 ms | QM |

## 4. Requirements allocated to elements

- SR-TDR-19-0444 → EL-TDR-19-MOTO-03
- SR-TDR-19-0445 → EL-TDR-19-GEAR-04
- SR-TDR-19-0445 → EL-TDR-19-ECU-02
- SR-TDR-19-0446 → EL-TDR-19-SENS-01
- SR-TDR-19-0447 → EL-TDR-19-GEAR-04
- SR-TDR-19-0448 → EL-TDR-19-MOTO-03
- SR-TDR-19-0448 → EL-TDR-19-ECU-02
- SR-TDR-19-0449 → EL-TDR-19-SENS-01
- SR-TDR-19-0449 → EL-TDR-19-ECU-02
- SR-TDR-19-0450 → EL-TDR-19-SENS-01
- SR-TDR-19-0451 → EL-TDR-19-ECU-02
- SR-TDR-19-0451 → EL-TDR-19-GEAR-04
- SR-TDR-19-0452 → EL-TDR-19-MECH-05
- SR-TDR-19-0452 → EL-TDR-19-GEAR-04
- SR-TDR-19-0453 → EL-TDR-19-GEAR-04
- SR-TDR-19-0453 → EL-TDR-19-ECU-02
- SR-TDR-19-0454 → EL-TDR-19-SENS-01
- SR-TDR-19-0454 → EL-TDR-19-MECH-05
- SR-TDR-19-0455 → EL-TDR-19-MECH-05
- SR-TDR-19-0456 → EL-TDR-19-MECH-05
- SR-TDR-19-0457 → EL-TDR-19-SENS-01
- SR-TDR-19-0458 → EL-TDR-19-ECU-02
- SR-TDR-19-0459 → EL-TDR-19-MOTO-03
- SR-TDR-19-0460 → EL-TDR-19-MECH-05
- SR-TDR-19-0460 → EL-TDR-19-ECU-02
- SR-TDR-19-0461 → EL-TDR-19-SENS-01
- SR-TDR-19-0461 → EL-TDR-19-ECU-02
- SR-TDR-19-0462 → EL-TDR-19-GEAR-04
- SR-TDR-19-0462 → EL-TDR-19-ECU-02
- SR-TDR-19-0463 → EL-TDR-19-GEAR-04
- SR-TDR-19-0463 → EL-TDR-19-MOTO-03
- SR-TDR-19-0464 → EL-TDR-19-MOTO-03
