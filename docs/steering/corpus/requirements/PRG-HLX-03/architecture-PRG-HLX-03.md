# System Architectural Design — Dorne
**Baseline:** ARCH-HLX-03-v3 · created 2023-09-19 · baselined
**Supersedes:** ARCH-HLX-03-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-HLX-03-SENS-01 | sensor | buy | QM | — | carryover |
| EL-HLX-03-ECU-02 | ecu | buy | D | — | modified |
| EL-HLX-03-MOTO-03 | motor | buy | C | — | modified |
| EL-HLX-03-GEAR-04 | gearbox | make | C | — | new |
| EL-HLX-03-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-DIAGNOSTICS | EL-HLX-03-MECH-05 | primary |
| ACT-MOTOR-CONTROL | EL-HLX-03-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-HLX-03-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-HLX-03-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-HLX-03-ECU-02 | primary |
| ACT-DAMPING | EL-HLX-03-GEAR-04 | primary |
| ACT-SAFETY-MONITOR | EL-HLX-03-MECH-05 | support |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-HLX-03-SENS-01 | EL-HLX-03-ECU-02 | PSI5 | signal | 8.94 ms | B |
| EL-HLX-03-ECU-02 | EL-HLX-03-MOTO-03 | PSI5 | signal | 16.7 ms | QM |
| EL-HLX-03-MOTO-03 | EL-HLX-03-GEAR-04 | SENT | signal | 7.81 ms | QM |
| EL-HLX-03-GEAR-04 | EL-HLX-03-MECH-05 | SENT | signal | — ms | D |

## 4. Requirements allocated to elements

- SR-HLX-03-0075 → EL-HLX-03-GEAR-04
- SR-HLX-03-0076 → EL-HLX-03-GEAR-04
- SR-HLX-03-0076 → EL-HLX-03-SENS-01
- SR-HLX-03-0077 → EL-HLX-03-GEAR-04
- SR-HLX-03-0077 → EL-HLX-03-MECH-05
- SR-HLX-03-0078 → EL-HLX-03-SENS-01
- SR-HLX-03-0079 → EL-HLX-03-MOTO-03
- SR-HLX-03-0079 → EL-HLX-03-ECU-02
- SR-HLX-03-0080 → EL-HLX-03-MECH-05
- SR-HLX-03-0080 → EL-HLX-03-SENS-01
- SR-HLX-03-0081 → EL-HLX-03-SENS-01
- SR-HLX-03-0082 → EL-HLX-03-SENS-01
- SR-HLX-03-0083 → EL-HLX-03-MOTO-03
- SR-HLX-03-0084 → EL-HLX-03-GEAR-04
- SR-HLX-03-0084 → EL-HLX-03-MOTO-03
- SR-HLX-03-0085 → EL-HLX-03-MOTO-03
- SR-HLX-03-0085 → EL-HLX-03-GEAR-04
- SR-HLX-03-0086 → EL-HLX-03-MOTO-03
- SR-HLX-03-0086 → EL-HLX-03-SENS-01
- SR-HLX-03-0087 → EL-HLX-03-GEAR-04
- SR-HLX-03-0088 → EL-HLX-03-SENS-01
- SR-HLX-03-0088 → EL-HLX-03-ECU-02
- SR-HLX-03-0089 → EL-HLX-03-MOTO-03
- SR-HLX-03-0090 → EL-HLX-03-GEAR-04
- SR-HLX-03-0090 → EL-HLX-03-MOTO-03
- SR-HLX-03-0091 → EL-HLX-03-ECU-02
- SR-HLX-03-0091 → EL-HLX-03-SENS-01
- SR-HLX-03-0092 → EL-HLX-03-SENS-01
- SR-HLX-03-0092 → EL-HLX-03-MECH-05
- SR-HLX-03-0093 → EL-HLX-03-SENS-01
- SR-HLX-03-0094 → EL-HLX-03-MECH-05
- SR-HLX-03-0095 → EL-HLX-03-MOTO-03
- SR-HLX-03-0095 → EL-HLX-03-SENS-01
- SR-HLX-03-0096 → EL-HLX-03-GEAR-04
- SR-HLX-03-0097 → EL-HLX-03-ECU-02
- SR-HLX-03-0098 → EL-HLX-03-SENS-01
- SR-HLX-03-0098 → EL-HLX-03-GEAR-04
- SR-HLX-03-0099 → EL-HLX-03-MECH-05
- SR-HLX-03-0100 → EL-HLX-03-ECU-02
- SR-HLX-03-0100 → EL-HLX-03-MOTO-03
- SR-HLX-03-0101 → EL-HLX-03-GEAR-04
- SR-HLX-03-0102 → EL-HLX-03-GEAR-04
- SR-HLX-03-0102 → EL-HLX-03-SENS-01
- SR-HLX-03-0103 → EL-HLX-03-ECU-02
- SR-HLX-03-0103 → EL-HLX-03-SENS-01
