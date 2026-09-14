# System Architectural Design — Haldan
**Baseline:** ARCH-HLX-27-v1 · created 2020-08-05 · baselined


## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-HLX-27-SENS-01 | sensor | buy | C | — | new |
| EL-HLX-27-ECU-02 | ecu | buy | B | — | carryover |
| EL-HLX-27-MOTO-03 | motor | buy | QM | — | modified |
| EL-HLX-27-GEAR-04 | gearbox | make | QM | — | carryover |
| EL-HLX-27-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ANGLE-SENSE | EL-HLX-27-MECH-05 | primary |
| ACT-EOL-CALIB | EL-HLX-27-SENS-01 | primary |
| ACT-HYSTERESIS-COMP | EL-HLX-27-SENS-01 | primary |
| ACT-FRICTION-COMP | EL-HLX-27-SENS-01 | primary |
| ACT-DAMPING | EL-HLX-27-GEAR-04 | support |
| ACT-MOTOR-CONTROL | EL-HLX-27-MOTO-03 | primary |
| ACT-ASSIST | EL-HLX-27-MECH-05 | primary |
| ACT-TORQUE-SENSE | EL-HLX-27-SENS-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-HLX-27-SENS-01 | EL-HLX-27-ECU-02 | PSI5 | signal | — ms | D |
| EL-HLX-27-ECU-02 | EL-HLX-27-MOTO-03 | analog | signal | 7.89 ms | D |
| EL-HLX-27-MOTO-03 | EL-HLX-27-GEAR-04 | PSI5 | signal | 1.6 ms | QM |
| EL-HLX-27-GEAR-04 | EL-HLX-27-MECH-05 | PSI5 | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-HLX-27-0634 → EL-HLX-27-GEAR-04
- SR-HLX-27-0635 → EL-HLX-27-GEAR-04
- SR-HLX-27-0636 → EL-HLX-27-GEAR-04
- SR-HLX-27-0637 → EL-HLX-27-ECU-02
- SR-HLX-27-0637 → EL-HLX-27-GEAR-04
- SR-HLX-27-0638 → EL-HLX-27-MECH-05
- SR-HLX-27-0639 → EL-HLX-27-MOTO-03
- SR-HLX-27-0640 → EL-HLX-27-MECH-05
- SR-HLX-27-0641 → EL-HLX-27-MECH-05
- SR-HLX-27-0641 → EL-HLX-27-SENS-01
- SR-HLX-27-0642 → EL-HLX-27-ECU-02
- SR-HLX-27-0643 → EL-HLX-27-SENS-01
- SR-HLX-27-0643 → EL-HLX-27-GEAR-04
- SR-HLX-27-0644 → EL-HLX-27-MOTO-03
- SR-HLX-27-0645 → EL-HLX-27-GEAR-04
- SR-HLX-27-0645 → EL-HLX-27-SENS-01
- SR-HLX-27-0646 → EL-HLX-27-MECH-05
- SR-HLX-27-0647 → EL-HLX-27-SENS-01
- SR-HLX-27-0647 → EL-HLX-27-MECH-05
- SR-HLX-27-0648 → EL-HLX-27-ECU-02
- SR-HLX-27-0649 → EL-HLX-27-SENS-01
- SR-HLX-27-0650 → EL-HLX-27-GEAR-04
