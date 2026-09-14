# System Architectural Design — Ivo
**Baseline:** ARCH-ORV-13-v2 · created 2025-03-17 · baselined
**Supersedes:** ARCH-ORV-13-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-ORV-13-SENS-01 | sensor | buy | C | — | modified |
| EL-ORV-13-ECU-02 | ecu | buy | B | — | carryover |
| EL-ORV-13-MOTO-03 | motor | buy | B | — | carryover |
| EL-ORV-13-GEAR-04 | gearbox | make | B | — | new |
| EL-ORV-13-MECH-05 | mechanical | make | D | — | new |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ASSIST | EL-ORV-13-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-ORV-13-MOTO-03 | primary |
| ACT-HYSTERESIS-COMP | EL-ORV-13-MOTO-03 | primary |
| ACT-FRICTION-COMP | EL-ORV-13-GEAR-04 | primary |
| ACT-TORQUE-SENSE | EL-ORV-13-GEAR-04 | primary |
| ACT-EOL-CALIB | EL-ORV-13-MECH-05 | primary |
| ACT-DAMPING | EL-ORV-13-MECH-05 | primary |
| ACT-SAFETY-MONITOR | EL-ORV-13-MOTO-03 | primary |
| ACT-ARBITRATION | EL-ORV-13-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-ORV-13-SENS-01 | support |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-ORV-13-SENS-01 | EL-ORV-13-ECU-02 | SENT | signal | — ms | B |
| EL-ORV-13-ECU-02 | EL-ORV-13-MOTO-03 | analog | signal | 1.56 ms | B |
| EL-ORV-13-MOTO-03 | EL-ORV-13-GEAR-04 | mechanical | signal | 10.27 ms | D |
| EL-ORV-13-GEAR-04 | EL-ORV-13-MECH-05 | mechanical | signal | 9.78 ms | B |

## 4. Requirements allocated to elements

- SR-ORV-13-0303 → EL-ORV-13-MOTO-03
- SR-ORV-13-0304 → EL-ORV-13-SENS-01
- SR-ORV-13-0304 → EL-ORV-13-MOTO-03
- SR-ORV-13-0305 → EL-ORV-13-ECU-02
- SR-ORV-13-0305 → EL-ORV-13-MOTO-03
- SR-ORV-13-0306 → EL-ORV-13-MECH-05
- SR-ORV-13-0307 → EL-ORV-13-ECU-02
- SR-ORV-13-0307 → EL-ORV-13-MECH-05
- SR-ORV-13-0308 → EL-ORV-13-MECH-05
- SR-ORV-13-0309 → EL-ORV-13-GEAR-04
- SR-ORV-13-0309 → EL-ORV-13-MOTO-03
- SR-ORV-13-0310 → EL-ORV-13-ECU-02
- SR-ORV-13-0310 → EL-ORV-13-MOTO-03
- SR-ORV-13-0311 → EL-ORV-13-ECU-02
- SR-ORV-13-0311 → EL-ORV-13-MECH-05
- SR-ORV-13-0312 → EL-ORV-13-ECU-02
- SR-ORV-13-0312 → EL-ORV-13-GEAR-04
- SR-ORV-13-0313 → EL-ORV-13-ECU-02
- SR-ORV-13-0314 → EL-ORV-13-ECU-02
- SR-ORV-13-0315 → EL-ORV-13-SENS-01
- SR-ORV-13-0315 → EL-ORV-13-GEAR-04
- SR-ORV-13-0316 → EL-ORV-13-ECU-02
- SR-ORV-13-0317 → EL-ORV-13-SENS-01
- SR-ORV-13-0317 → EL-ORV-13-MECH-05
- SR-ORV-13-0318 → EL-ORV-13-ECU-02
- SR-ORV-13-0318 → EL-ORV-13-MECH-05
- SR-ORV-13-0319 → EL-ORV-13-GEAR-04
- SR-ORV-13-0319 → EL-ORV-13-MOTO-03
