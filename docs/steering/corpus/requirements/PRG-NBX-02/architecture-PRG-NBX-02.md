# System Architectural Design — Hale
**Baseline:** ARCH-NBX-02-v1 · created 2025-09-30 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-NBX-02-SENS-01 | sensor | buy | C | — | modified |
| EL-NBX-02-ECU-02 | ecu | buy | C | — | carryover |
| EL-NBX-02-MOTO-03 | motor | buy | C | — | modified |
| EL-NBX-02-GEAR-04 | gearbox | make | C | — | carryover |
| EL-NBX-02-MECH-05 | mechanical | make | B | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-SAFETY-MONITOR | EL-NBX-02-MOTO-03 | primary |
| ACT-TORQUE-SENSE | EL-NBX-02-ECU-02 | support |
| ACT-EOL-CALIB | EL-NBX-02-ECU-02 | primary |
| ACT-ASSIST | EL-NBX-02-GEAR-04 | primary |
| ACT-ANGLE-SENSE | EL-NBX-02-GEAR-04 | primary |
| ACT-DAMPING | EL-NBX-02-ECU-02 | primary |
| ACT-HYSTERESIS-COMP | EL-NBX-02-MOTO-03 | support |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-NBX-02-SENS-01 | EL-NBX-02-ECU-02 | mechanical | signal | — ms | B |
| EL-NBX-02-ECU-02 | EL-NBX-02-MOTO-03 | PSI5 | signal | 2.67 ms | D |
| EL-NBX-02-MOTO-03 | EL-NBX-02-GEAR-04 | SENT | signal | 3.65 ms | QM |
| EL-NBX-02-GEAR-04 | EL-NBX-02-MECH-05 | analog | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-NBX-02-0054 → EL-NBX-02-ECU-02
- SR-NBX-02-0054 → EL-NBX-02-GEAR-04
- SR-NBX-02-0055 → EL-NBX-02-MOTO-03
- SR-NBX-02-0056 → EL-NBX-02-GEAR-04
- SR-NBX-02-0057 → EL-NBX-02-MOTO-03
- SR-NBX-02-0057 → EL-NBX-02-ECU-02
- SR-NBX-02-0058 → EL-NBX-02-MECH-05
- SR-NBX-02-0059 → EL-NBX-02-ECU-02
- SR-NBX-02-0059 → EL-NBX-02-SENS-01
- SR-NBX-02-0060 → EL-NBX-02-MOTO-03
- SR-NBX-02-0060 → EL-NBX-02-GEAR-04
- SR-NBX-02-0061 → EL-NBX-02-GEAR-04
- SR-NBX-02-0062 → EL-NBX-02-MOTO-03
- SR-NBX-02-0063 → EL-NBX-02-ECU-02
- SR-NBX-02-0063 → EL-NBX-02-MOTO-03
- SR-NBX-02-0064 → EL-NBX-02-ECU-02
- SR-NBX-02-0065 → EL-NBX-02-SENS-01
- SR-NBX-02-0065 → EL-NBX-02-ECU-02
- SR-NBX-02-0066 → EL-NBX-02-GEAR-04
- SR-NBX-02-0066 → EL-NBX-02-MECH-05
- SR-NBX-02-0067 → EL-NBX-02-MECH-05
- SR-NBX-02-0068 → EL-NBX-02-MECH-05
- SR-NBX-02-0068 → EL-NBX-02-ECU-02
- SR-NBX-02-0069 → EL-NBX-02-SENS-01
- SR-NBX-02-0069 → EL-NBX-02-MOTO-03
- SR-NBX-02-0070 → EL-NBX-02-GEAR-04
- SR-NBX-02-0070 → EL-NBX-02-MOTO-03
- SR-NBX-02-0071 → EL-NBX-02-ECU-02
- SR-NBX-02-0072 → EL-NBX-02-SENS-01
- SR-NBX-02-0072 → EL-NBX-02-ECU-02
- SR-NBX-02-0073 → EL-NBX-02-MOTO-03
- SR-NBX-02-0073 → EL-NBX-02-SENS-01
- SR-NBX-02-0074 → EL-NBX-02-GEAR-04
- SR-NBX-02-0074 → EL-NBX-02-ECU-02
