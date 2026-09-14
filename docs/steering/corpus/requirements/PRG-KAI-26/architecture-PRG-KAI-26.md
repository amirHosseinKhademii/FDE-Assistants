# System Architectural Design — Kite
**Baseline:** ARCH-KAI-26-v3 · created 2022-02-09 · baselined
**Supersedes:** ARCH-KAI-26-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-26-SENS-01 | sensor | buy | QM | — | modified |
| EL-KAI-26-ECU-02 | ecu | buy | QM | — | carryover |
| EL-KAI-26-MOTO-03 | motor | buy | D | — | carryover |
| EL-KAI-26-GEAR-04 | gearbox | make | D | — | carryover |
| EL-KAI-26-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-HYSTERESIS-COMP | EL-KAI-26-GEAR-04 | primary |
| ACT-EOL-CALIB | EL-KAI-26-ECU-02 | primary |
| ACT-DIAGNOSTICS | EL-KAI-26-MOTO-03 | support |
| ACT-TORQUE-SENSE | EL-KAI-26-MECH-05 | primary |
| ACT-DAMPING | EL-KAI-26-SENS-01 | primary |
| ACT-FRICTION-COMP | EL-KAI-26-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-KAI-26-MECH-05 | primary |
| ACT-ASSIST | EL-KAI-26-MECH-05 | primary |
| ACT-SAFETY-MONITOR | EL-KAI-26-GEAR-04 | primary |
| ACT-ANGLE-SENSE | EL-KAI-26-MOTO-03 | primary |
| ACT-ARBITRATION | EL-KAI-26-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-26-SENS-01 | EL-KAI-26-ECU-02 | CAN-FD | signal | 12.62 ms | QM |
| EL-KAI-26-ECU-02 | EL-KAI-26-MOTO-03 | mechanical | signal | 18.06 ms | QM |
| EL-KAI-26-MOTO-03 | EL-KAI-26-GEAR-04 | analog | signal | 14.38 ms | B |
| EL-KAI-26-GEAR-04 | EL-KAI-26-MECH-05 | PSI5 | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-KAI-26-0617 → EL-KAI-26-MOTO-03
- SR-KAI-26-0618 → EL-KAI-26-ECU-02
- SR-KAI-26-0618 → EL-KAI-26-SENS-01
- SR-KAI-26-0619 → EL-KAI-26-MOTO-03
- SR-KAI-26-0620 → EL-KAI-26-MOTO-03
- SR-KAI-26-0621 → EL-KAI-26-SENS-01
- SR-KAI-26-0621 → EL-KAI-26-MECH-05
- SR-KAI-26-0622 → EL-KAI-26-SENS-01
- SR-KAI-26-0623 → EL-KAI-26-MOTO-03
- SR-KAI-26-0624 → EL-KAI-26-GEAR-04
- SR-KAI-26-0625 → EL-KAI-26-GEAR-04
- SR-KAI-26-0626 → EL-KAI-26-ECU-02
- SR-KAI-26-0626 → EL-KAI-26-SENS-01
- SR-KAI-26-0627 → EL-KAI-26-MECH-05
- SR-KAI-26-0627 → EL-KAI-26-ECU-02
- SR-KAI-26-0628 → EL-KAI-26-MECH-05
- SR-KAI-26-0628 → EL-KAI-26-ECU-02
- SR-KAI-26-0629 → EL-KAI-26-SENS-01
- SR-KAI-26-0629 → EL-KAI-26-MOTO-03
- SR-KAI-26-0630 → EL-KAI-26-GEAR-04
- SR-KAI-26-0630 → EL-KAI-26-MOTO-03
- SR-KAI-26-0631 → EL-KAI-26-MOTO-03
- SR-KAI-26-0631 → EL-KAI-26-SENS-01
- SR-KAI-26-0632 → EL-KAI-26-GEAR-04
- SR-KAI-26-0632 → EL-KAI-26-MECH-05
- SR-KAI-26-0633 → EL-KAI-26-ECU-02
- SR-KAI-26-0633 → EL-KAI-26-SENS-01
