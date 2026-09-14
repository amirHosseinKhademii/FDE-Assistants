# System Architectural Design — Nyral
**Baseline:** ARCH-VGR-10-v2 · created 2023-07-08 · baselined
**Supersedes:** ARCH-VGR-10-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-VGR-10-SENS-01 | sensor | buy | QM | — | carryover |
| EL-VGR-10-ECU-02 | ecu | buy | D | — | carryover |
| EL-VGR-10-MOTO-03 | motor | buy | D | — | carryover |
| EL-VGR-10-GEAR-04 | gearbox | make | C | — | new |
| EL-VGR-10-MECH-05 | mechanical | make | QM | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-RETURN-TO-CENTER | EL-VGR-10-SENS-01 | support |
| ACT-HYSTERESIS-COMP | EL-VGR-10-ECU-02 | primary |
| ACT-TORQUE-SENSE | EL-VGR-10-ECU-02 | primary |
| ACT-MOTOR-CONTROL | EL-VGR-10-MOTO-03 | primary |
| ACT-ASSIST | EL-VGR-10-GEAR-04 | primary |
| ACT-FRICTION-COMP | EL-VGR-10-MECH-05 | primary |
| ACT-ARBITRATION | EL-VGR-10-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-VGR-10-SENS-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-VGR-10-SENS-01 | EL-VGR-10-ECU-02 | PSI5 | signal | — ms | B |
| EL-VGR-10-ECU-02 | EL-VGR-10-MOTO-03 | analog | signal | — ms | D |
| EL-VGR-10-MOTO-03 | EL-VGR-10-GEAR-04 | PSI5 | signal | 17.21 ms | QM |
| EL-VGR-10-GEAR-04 | EL-VGR-10-MECH-05 | mechanical | signal | 18.14 ms | D |

## 4. Requirements allocated to elements

- SR-VGR-10-0228 → EL-VGR-10-MOTO-03
- SR-VGR-10-0228 → EL-VGR-10-MECH-05
- SR-VGR-10-0229 → EL-VGR-10-ECU-02
- SR-VGR-10-0229 → EL-VGR-10-SENS-01
- SR-VGR-10-0230 → EL-VGR-10-GEAR-04
- SR-VGR-10-0231 → EL-VGR-10-ECU-02
- SR-VGR-10-0232 → EL-VGR-10-MECH-05
- SR-VGR-10-0232 → EL-VGR-10-GEAR-04
- SR-VGR-10-0233 → EL-VGR-10-MOTO-03
- SR-VGR-10-0233 → EL-VGR-10-SENS-01
- SR-VGR-10-0234 → EL-VGR-10-MOTO-03
- SR-VGR-10-0235 → EL-VGR-10-GEAR-04
- SR-VGR-10-0236 → EL-VGR-10-GEAR-04
- SR-VGR-10-0236 → EL-VGR-10-MECH-05
- SR-VGR-10-0237 → EL-VGR-10-MOTO-03
- SR-VGR-10-0237 → EL-VGR-10-MECH-05
- SR-VGR-10-0238 → EL-VGR-10-MOTO-03
- SR-VGR-10-0239 → EL-VGR-10-ECU-02
- SR-VGR-10-0239 → EL-VGR-10-MOTO-03
- SR-VGR-10-0240 → EL-VGR-10-SENS-01
- SR-VGR-10-0240 → EL-VGR-10-MECH-05
- SR-VGR-10-0241 → EL-VGR-10-GEAR-04
- SR-VGR-10-0242 → EL-VGR-10-SENS-01
- SR-VGR-10-0243 → EL-VGR-10-GEAR-04
- SR-VGR-10-0243 → EL-VGR-10-SENS-01
- SR-VGR-10-0244 → EL-VGR-10-SENS-01
- SR-VGR-10-0244 → EL-VGR-10-ECU-02
- SR-VGR-10-0245 → EL-VGR-10-GEAR-04
- SR-VGR-10-0246 → EL-VGR-10-SENS-01
- SR-VGR-10-0247 → EL-VGR-10-SENS-01
- SR-VGR-10-0248 → EL-VGR-10-MOTO-03
- SR-VGR-10-0249 → EL-VGR-10-ECU-02
- SR-VGR-10-0250 → EL-VGR-10-GEAR-04
- SR-VGR-10-0251 → EL-VGR-10-ECU-02
- SR-VGR-10-0251 → EL-VGR-10-MECH-05
- SR-VGR-10-0252 → EL-VGR-10-MOTO-03
- SR-VGR-10-0253 → EL-VGR-10-MOTO-03
- SR-VGR-10-0253 → EL-VGR-10-ECU-02
- SR-VGR-10-0254 → EL-VGR-10-MECH-05
- SR-VGR-10-0255 → EL-VGR-10-MOTO-03
- SR-VGR-10-0255 → EL-VGR-10-ECU-02
