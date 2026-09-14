# System Architectural Design — Gorse
**Baseline:** ARCH-CHV-07-v2 · created 2024-10-29 · baselined
**Supersedes:** ARCH-CHV-07-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-CHV-07-SENS-01 | sensor | buy | D | — | carryover |
| EL-CHV-07-ECU-02 | ecu | buy | D | — | carryover |
| EL-CHV-07-MOTO-03 | motor | buy | B | — | carryover |
| EL-CHV-07-GEAR-04 | gearbox | make | C | — | carryover |
| EL-CHV-07-MECH-05 | mechanical | make | D | — | modified |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-CHV-07-MECH-05 | primary |
| ACT-ASSIST | EL-CHV-07-MECH-05 | support |
| ACT-SAFETY-MONITOR | EL-CHV-07-MECH-05 | support |
| ACT-DIAGNOSTICS | EL-CHV-07-ECU-02 | support |
| ACT-RETURN-TO-CENTER | EL-CHV-07-SENS-01 | primary |
| ACT-EOL-CALIB | EL-CHV-07-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-CHV-07-SENS-01 | EL-CHV-07-ECU-02 | SENT | signal | — ms | D |
| EL-CHV-07-ECU-02 | EL-CHV-07-MOTO-03 | CAN-FD | signal | — ms | B |
| EL-CHV-07-MOTO-03 | EL-CHV-07-GEAR-04 | SENT | signal | 0.8 ms | B |
| EL-CHV-07-GEAR-04 | EL-CHV-07-MECH-05 | analog | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-CHV-07-0161 → EL-CHV-07-MECH-05
- SR-CHV-07-0161 → EL-CHV-07-SENS-01
- SR-CHV-07-0162 → EL-CHV-07-MOTO-03
- SR-CHV-07-0163 → EL-CHV-07-MOTO-03
- SR-CHV-07-0163 → EL-CHV-07-ECU-02
- SR-CHV-07-0164 → EL-CHV-07-GEAR-04
- SR-CHV-07-0164 → EL-CHV-07-SENS-01
- SR-CHV-07-0165 → EL-CHV-07-MOTO-03
- SR-CHV-07-0166 → EL-CHV-07-MOTO-03
- SR-CHV-07-0167 → EL-CHV-07-SENS-01
- SR-CHV-07-0167 → EL-CHV-07-MECH-05
- SR-CHV-07-0168 → EL-CHV-07-GEAR-04
- SR-CHV-07-0168 → EL-CHV-07-SENS-01
- SR-CHV-07-0169 → EL-CHV-07-MECH-05
- SR-CHV-07-0169 → EL-CHV-07-GEAR-04
- SR-CHV-07-0170 → EL-CHV-07-MECH-05
- SR-CHV-07-0171 → EL-CHV-07-MECH-05
- SR-CHV-07-0171 → EL-CHV-07-SENS-01
- SR-CHV-07-0172 → EL-CHV-07-MECH-05
- SR-CHV-07-0172 → EL-CHV-07-GEAR-04
- SR-CHV-07-0173 → EL-CHV-07-MECH-05
- SR-CHV-07-0174 → EL-CHV-07-GEAR-04
- SR-CHV-07-0175 → EL-CHV-07-SENS-01
- SR-CHV-07-0175 → EL-CHV-07-ECU-02
- SR-CHV-07-0176 → EL-CHV-07-MOTO-03
- SR-CHV-07-0177 → EL-CHV-07-GEAR-04
- SR-CHV-07-0177 → EL-CHV-07-MOTO-03
- SR-CHV-07-0178 → EL-CHV-07-MECH-05
- SR-CHV-07-0179 → EL-CHV-07-MOTO-03
- SR-CHV-07-0180 → EL-CHV-07-MECH-05
