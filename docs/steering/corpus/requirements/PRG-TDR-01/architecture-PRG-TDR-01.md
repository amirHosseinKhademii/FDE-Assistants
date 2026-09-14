# System Architectural Design — Delve
**Baseline:** ARCH-TDR-01-v2 · created 2020-12-26 · baselined
**Supersedes:** ARCH-TDR-01-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-01-SENS-01 | sensor | buy | C | — | modified |
| EL-TDR-01-ECU-02 | ecu | buy | B | — | carryover |
| EL-TDR-01-MOTO-03 | motor | buy | QM | — | carryover |
| EL-TDR-01-GEAR-04 | gearbox | make | D | — | new |
| EL-TDR-01-MECH-05 | mechanical | make | B | — | modified |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-TDR-01-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-TDR-01-MECH-05 | support |
| ACT-FRICTION-COMP | EL-TDR-01-GEAR-04 | support |
| ACT-ASSIST | EL-TDR-01-GEAR-04 | primary |
| ACT-SAFETY-MONITOR | EL-TDR-01-SENS-01 | support |
| ACT-DAMPING | EL-TDR-01-SENS-01 | primary |
| ACT-RETURN-TO-CENTER | EL-TDR-01-ECU-02 | support |
| ACT-DIAGNOSTICS | EL-TDR-01-GEAR-04 | primary |
| ACT-TORQUE-SENSE | EL-TDR-01-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-01-SENS-01 | EL-TDR-01-ECU-02 | mechanical | signal | 17.62 ms | D |
| EL-TDR-01-ECU-02 | EL-TDR-01-MOTO-03 | PSI5 | signal | — ms | D |
| EL-TDR-01-MOTO-03 | EL-TDR-01-GEAR-04 | PSI5 | signal | — ms | B |
| EL-TDR-01-GEAR-04 | EL-TDR-01-MECH-05 | PSI5 | signal | 9.5 ms | D |

## 4. Requirements allocated to elements

- SR-TDR-01-0023 → EL-TDR-01-MECH-05
- SR-TDR-01-0023 → EL-TDR-01-ECU-02
- SR-TDR-01-0024 → EL-TDR-01-MOTO-03
- SR-TDR-01-0024 → EL-TDR-01-ECU-02
- SR-TDR-01-0025 → EL-TDR-01-GEAR-04
- SR-TDR-01-0025 → EL-TDR-01-MECH-05
- SR-TDR-01-0026 → EL-TDR-01-MECH-05
- SR-TDR-01-0027 → EL-TDR-01-SENS-01
- SR-TDR-01-0027 → EL-TDR-01-ECU-02
- SR-TDR-01-0028 → EL-TDR-01-MOTO-03
- SR-TDR-01-0029 → EL-TDR-01-GEAR-04
- SR-TDR-01-0030 → EL-TDR-01-ECU-02
- SR-TDR-01-0031 → EL-TDR-01-GEAR-04
- SR-TDR-01-0031 → EL-TDR-01-ECU-02
- SR-TDR-01-0032 → EL-TDR-01-SENS-01
- SR-TDR-01-0032 → EL-TDR-01-MECH-05
- SR-TDR-01-0033 → EL-TDR-01-GEAR-04
- SR-TDR-01-0033 → EL-TDR-01-ECU-02
- SR-TDR-01-0034 → EL-TDR-01-SENS-01
- SR-TDR-01-0034 → EL-TDR-01-MOTO-03
- SR-TDR-01-0035 → EL-TDR-01-ECU-02
- SR-TDR-01-0036 → EL-TDR-01-MECH-05
- SR-TDR-01-0036 → EL-TDR-01-GEAR-04
- SR-TDR-01-0037 → EL-TDR-01-ECU-02
- SR-TDR-01-0037 → EL-TDR-01-MOTO-03
- SR-TDR-01-0038 → EL-TDR-01-MECH-05
- SR-TDR-01-0039 → EL-TDR-01-MECH-05
- SR-TDR-01-0039 → EL-TDR-01-ECU-02
- SR-TDR-01-0040 → EL-TDR-01-ECU-02
- SR-TDR-01-0041 → EL-TDR-01-MOTO-03
- SR-TDR-01-0042 → EL-TDR-01-ECU-02
- SR-TDR-01-0043 → EL-TDR-01-MECH-05
- SR-TDR-01-0044 → EL-TDR-01-MOTO-03
- SR-TDR-01-0045 → EL-TDR-01-MECH-05
- SR-TDR-01-0045 → EL-TDR-01-GEAR-04
- SR-TDR-01-0046 → EL-TDR-01-MOTO-03
- SR-TDR-01-0047 → EL-TDR-01-SENS-01
- SR-TDR-01-0048 → EL-TDR-01-GEAR-04
- SR-TDR-01-0049 → EL-TDR-01-SENS-01
- SR-TDR-01-0049 → EL-TDR-01-GEAR-04
- SR-TDR-01-0050 → EL-TDR-01-GEAR-04
- SR-TDR-01-0051 → EL-TDR-01-ECU-02
- SR-TDR-01-0051 → EL-TDR-01-GEAR-04
- SR-TDR-01-0052 → EL-TDR-01-MECH-05
- SR-TDR-01-0052 → EL-TDR-01-SENS-01
- SR-TDR-01-0053 → EL-TDR-01-GEAR-04
