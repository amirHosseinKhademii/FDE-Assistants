# System Architectural Design — Oriel
**Baseline:** ARCH-VGR-05-v2 · created 2025-04-02 · baselined
**Supersedes:** ARCH-VGR-05-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-VGR-05-SENS-01 | sensor | buy | QM | — | carryover |
| EL-VGR-05-ECU-02 | ecu | buy | C | — | carryover |
| EL-VGR-05-MOTO-03 | motor | buy | QM | — | carryover |
| EL-VGR-05-GEAR-04 | gearbox | make | QM | — | new |
| EL-VGR-05-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-VGR-05-ECU-02 | primary |
| ACT-HYSTERESIS-COMP | EL-VGR-05-GEAR-04 | primary |
| ACT-MOTOR-CONTROL | EL-VGR-05-SENS-01 | support |
| ACT-SAFETY-MONITOR | EL-VGR-05-MOTO-03 | primary |
| ACT-ARBITRATION | EL-VGR-05-MECH-05 | primary |
| ACT-ANGLE-SENSE | EL-VGR-05-MECH-05 | primary |
| ACT-FRICTION-COMP | EL-VGR-05-MECH-05 | primary |
| ACT-DAMPING | EL-VGR-05-MECH-05 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-VGR-05-SENS-01 | EL-VGR-05-ECU-02 | mechanical | signal | — ms | D |
| EL-VGR-05-ECU-02 | EL-VGR-05-MOTO-03 | PSI5 | signal | 16.64 ms | B |
| EL-VGR-05-MOTO-03 | EL-VGR-05-GEAR-04 | SENT | signal | 0.85 ms | QM |
| EL-VGR-05-GEAR-04 | EL-VGR-05-MECH-05 | analog | signal | 8.06 ms | B |

## 4. Requirements allocated to elements

- SR-VGR-05-0124 → EL-VGR-05-MOTO-03
- SR-VGR-05-0125 → EL-VGR-05-MECH-05
- SR-VGR-05-0126 → EL-VGR-05-GEAR-04
- SR-VGR-05-0126 → EL-VGR-05-MOTO-03
- SR-VGR-05-0127 → EL-VGR-05-MECH-05
- SR-VGR-05-0127 → EL-VGR-05-GEAR-04
- SR-VGR-05-0128 → EL-VGR-05-SENS-01
- SR-VGR-05-0128 → EL-VGR-05-ECU-02
- SR-VGR-05-0129 → EL-VGR-05-MOTO-03
- SR-VGR-05-0129 → EL-VGR-05-GEAR-04
- SR-VGR-05-0130 → EL-VGR-05-GEAR-04
- SR-VGR-05-0130 → EL-VGR-05-MECH-05
- SR-VGR-05-0131 → EL-VGR-05-SENS-01
- SR-VGR-05-0132 → EL-VGR-05-GEAR-04
- SR-VGR-05-0132 → EL-VGR-05-SENS-01
- SR-VGR-05-0133 → EL-VGR-05-MOTO-03
- SR-VGR-05-0133 → EL-VGR-05-SENS-01
- SR-VGR-05-0134 → EL-VGR-05-MECH-05
- SR-VGR-05-0134 → EL-VGR-05-GEAR-04
- SR-VGR-05-0135 → EL-VGR-05-SENS-01
- SR-VGR-05-0136 → EL-VGR-05-MECH-05
- SR-VGR-05-0136 → EL-VGR-05-GEAR-04
- SR-VGR-05-0137 → EL-VGR-05-MECH-05
- SR-VGR-05-0137 → EL-VGR-05-MOTO-03
- SR-VGR-05-0138 → EL-VGR-05-GEAR-04
- SR-VGR-05-0138 → EL-VGR-05-MOTO-03
- SR-VGR-05-0139 → EL-VGR-05-SENS-01
- SR-VGR-05-0140 → EL-VGR-05-ECU-02
