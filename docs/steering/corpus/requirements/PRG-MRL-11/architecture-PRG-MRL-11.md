# System Architectural Design — Ember
**Baseline:** ARCH-MRL-11-v1 · created 2023-03-13 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-MRL-11-SENS-01 | sensor | buy | B | — | modified |
| EL-MRL-11-ECU-02 | ecu | buy | C | — | modified |
| EL-MRL-11-MOTO-03 | motor | buy | QM | — | new |
| EL-MRL-11-GEAR-04 | gearbox | make | D | — | carryover |
| EL-MRL-11-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-MRL-11-MOTO-03 | primary |
| ACT-DIAGNOSTICS | EL-MRL-11-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-MRL-11-SENS-01 | primary |
| ACT-RETURN-TO-CENTER | EL-MRL-11-SENS-01 | primary |
| ACT-ANGLE-SENSE | EL-MRL-11-SENS-01 | support |
| ACT-DAMPING | EL-MRL-11-MOTO-03 | primary |
| ACT-FRICTION-COMP | EL-MRL-11-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-MRL-11-SENS-01 | EL-MRL-11-ECU-02 | analog | signal | — ms | QM |
| EL-MRL-11-ECU-02 | EL-MRL-11-MOTO-03 | PSI5 | signal | — ms | D |
| EL-MRL-11-MOTO-03 | EL-MRL-11-GEAR-04 | PSI5 | signal | — ms | QM |
| EL-MRL-11-GEAR-04 | EL-MRL-11-MECH-05 | PWM | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-MRL-11-0256 → EL-MRL-11-ECU-02
- SR-MRL-11-0257 → EL-MRL-11-MOTO-03
- SR-MRL-11-0258 → EL-MRL-11-SENS-01
- SR-MRL-11-0259 → EL-MRL-11-GEAR-04
- SR-MRL-11-0259 → EL-MRL-11-MOTO-03
- SR-MRL-11-0260 → EL-MRL-11-GEAR-04
- SR-MRL-11-0260 → EL-MRL-11-SENS-01
- SR-MRL-11-0261 → EL-MRL-11-MECH-05
- SR-MRL-11-0262 → EL-MRL-11-SENS-01
- SR-MRL-11-0262 → EL-MRL-11-MOTO-03
- SR-MRL-11-0263 → EL-MRL-11-GEAR-04
- SR-MRL-11-0263 → EL-MRL-11-MECH-05
- SR-MRL-11-0264 → EL-MRL-11-ECU-02
- SR-MRL-11-0265 → EL-MRL-11-ECU-02
- SR-MRL-11-0266 → EL-MRL-11-SENS-01
- SR-MRL-11-0266 → EL-MRL-11-ECU-02
- SR-MRL-11-0267 → EL-MRL-11-ECU-02
- SR-MRL-11-0267 → EL-MRL-11-MECH-05
- SR-MRL-11-0268 → EL-MRL-11-GEAR-04
- SR-MRL-11-0268 → EL-MRL-11-MOTO-03
- SR-MRL-11-0269 → EL-MRL-11-ECU-02
- SR-MRL-11-0270 → EL-MRL-11-MOTO-03
- SR-MRL-11-0271 → EL-MRL-11-MOTO-03
- SR-MRL-11-0272 → EL-MRL-11-SENS-01
- SR-MRL-11-0272 → EL-MRL-11-ECU-02
- SR-MRL-11-0273 → EL-MRL-11-SENS-01
- SR-MRL-11-0273 → EL-MRL-11-MECH-05
- SR-MRL-11-0274 → EL-MRL-11-SENS-01
- SR-MRL-11-0274 → EL-MRL-11-MECH-05
- SR-MRL-11-0275 → EL-MRL-11-SENS-01
- SR-MRL-11-0276 → EL-MRL-11-SENS-01
- SR-MRL-11-0276 → EL-MRL-11-GEAR-04
- SR-MRL-11-0277 → EL-MRL-11-GEAR-04
- SR-MRL-11-0278 → EL-MRL-11-MOTO-03
- SR-MRL-11-0279 → EL-MRL-11-MECH-05
- SR-MRL-11-0279 → EL-MRL-11-GEAR-04
- SR-MRL-11-0280 → EL-MRL-11-MOTO-03
