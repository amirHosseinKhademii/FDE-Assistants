# System Architectural Design — Juno
**Baseline:** ARCH-TDR-06-v2 · created 2024-01-21 · baselined
**Supersedes:** ARCH-TDR-06-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-06-SENS-01 | sensor | buy | D | — | carryover |
| EL-TDR-06-ECU-02 | ecu | buy | B | — | modified |
| EL-TDR-06-MOTO-03 | motor | buy | D | — | carryover |
| EL-TDR-06-GEAR-04 | gearbox | make | D | — | new |
| EL-TDR-06-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-SAFETY-MONITOR | EL-TDR-06-MECH-05 | primary |
| ACT-ASSIST | EL-TDR-06-GEAR-04 | primary |
| ACT-ARBITRATION | EL-TDR-06-ECU-02 | primary |
| ACT-EOL-CALIB | EL-TDR-06-SENS-01 | primary |
| ACT-HYSTERESIS-COMP | EL-TDR-06-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-TDR-06-SENS-01 | primary |
| ACT-MOTOR-CONTROL | EL-TDR-06-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-06-SENS-01 | EL-TDR-06-ECU-02 | analog | signal | 0.18 ms | QM |
| EL-TDR-06-ECU-02 | EL-TDR-06-MOTO-03 | PSI5 | signal | 2.46 ms | B |
| EL-TDR-06-MOTO-03 | EL-TDR-06-GEAR-04 | SENT | signal | — ms | B |
| EL-TDR-06-GEAR-04 | EL-TDR-06-MECH-05 | PWM | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-TDR-06-0141 → EL-TDR-06-MOTO-03
- SR-TDR-06-0141 → EL-TDR-06-GEAR-04
- SR-TDR-06-0142 → EL-TDR-06-MOTO-03
- SR-TDR-06-0142 → EL-TDR-06-ECU-02
- SR-TDR-06-0143 → EL-TDR-06-ECU-02
- SR-TDR-06-0144 → EL-TDR-06-SENS-01
- SR-TDR-06-0145 → EL-TDR-06-MECH-05
- SR-TDR-06-0146 → EL-TDR-06-SENS-01
- SR-TDR-06-0147 → EL-TDR-06-GEAR-04
- SR-TDR-06-0147 → EL-TDR-06-MECH-05
- SR-TDR-06-0148 → EL-TDR-06-SENS-01
- SR-TDR-06-0149 → EL-TDR-06-MOTO-03
- SR-TDR-06-0150 → EL-TDR-06-ECU-02
- SR-TDR-06-0151 → EL-TDR-06-GEAR-04
- SR-TDR-06-0151 → EL-TDR-06-SENS-01
- SR-TDR-06-0152 → EL-TDR-06-MOTO-03
- SR-TDR-06-0152 → EL-TDR-06-SENS-01
- SR-TDR-06-0153 → EL-TDR-06-MECH-05
- SR-TDR-06-0153 → EL-TDR-06-GEAR-04
- SR-TDR-06-0154 → EL-TDR-06-MOTO-03
- SR-TDR-06-0154 → EL-TDR-06-MECH-05
- SR-TDR-06-0155 → EL-TDR-06-GEAR-04
- SR-TDR-06-0155 → EL-TDR-06-SENS-01
- SR-TDR-06-0156 → EL-TDR-06-MOTO-03
- SR-TDR-06-0156 → EL-TDR-06-GEAR-04
- SR-TDR-06-0157 → EL-TDR-06-SENS-01
- SR-TDR-06-0158 → EL-TDR-06-ECU-02
- SR-TDR-06-0158 → EL-TDR-06-SENS-01
- SR-TDR-06-0159 → EL-TDR-06-SENS-01
- SR-TDR-06-0159 → EL-TDR-06-MOTO-03
- SR-TDR-06-0160 → EL-TDR-06-SENS-01
- SR-TDR-06-0160 → EL-TDR-06-GEAR-04
