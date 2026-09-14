# System Architectural Design — Vane
**Baseline:** ARCH-MRL-30-v3 · created 2021-10-09 · baselined
**Supersedes:** ARCH-MRL-30-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-MRL-30-SENS-01 | sensor | buy | D | — | new |
| EL-MRL-30-ECU-02 | ecu | buy | B | — | modified |
| EL-MRL-30-MOTO-03 | motor | buy | D | — | new |
| EL-MRL-30-GEAR-04 | gearbox | make | C | — | carryover |
| EL-MRL-30-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-FRICTION-COMP | EL-MRL-30-ECU-02 | primary |
| ACT-ASSIST | EL-MRL-30-ECU-02 | primary |
| ACT-ANGLE-SENSE | EL-MRL-30-SENS-01 | primary |
| ACT-TORQUE-SENSE | EL-MRL-30-MOTO-03 | primary |
| ACT-RETURN-TO-CENTER | EL-MRL-30-MECH-05 | primary |
| ACT-DIAGNOSTICS | EL-MRL-30-MOTO-03 | primary |
| ACT-MOTOR-CONTROL | EL-MRL-30-GEAR-04 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-MRL-30-SENS-01 | EL-MRL-30-ECU-02 | CAN-FD | signal | 13.66 ms | D |
| EL-MRL-30-ECU-02 | EL-MRL-30-MOTO-03 | PSI5 | signal | 6.48 ms | QM |
| EL-MRL-30-MOTO-03 | EL-MRL-30-GEAR-04 | SENT | signal | 4.31 ms | QM |
| EL-MRL-30-GEAR-04 | EL-MRL-30-MECH-05 | analog | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-MRL-30-0696 → EL-MRL-30-MECH-05
- SR-MRL-30-0696 → EL-MRL-30-ECU-02
- SR-MRL-30-0697 → EL-MRL-30-GEAR-04
- SR-MRL-30-0698 → EL-MRL-30-MECH-05
- SR-MRL-30-0698 → EL-MRL-30-MOTO-03
- SR-MRL-30-0699 → EL-MRL-30-ECU-02
- SR-MRL-30-0699 → EL-MRL-30-MOTO-03
- SR-MRL-30-0700 → EL-MRL-30-ECU-02
- SR-MRL-30-0700 → EL-MRL-30-SENS-01
- SR-MRL-30-0701 → EL-MRL-30-MECH-05
- SR-MRL-30-0702 → EL-MRL-30-MECH-05
- SR-MRL-30-0703 → EL-MRL-30-ECU-02
- SR-MRL-30-0704 → EL-MRL-30-MECH-05
- SR-MRL-30-0704 → EL-MRL-30-MOTO-03
- SR-MRL-30-0705 → EL-MRL-30-SENS-01
- SR-MRL-30-0705 → EL-MRL-30-MOTO-03
- SR-MRL-30-0706 → EL-MRL-30-GEAR-04
- SR-MRL-30-0707 → EL-MRL-30-ECU-02
- SR-MRL-30-0707 → EL-MRL-30-SENS-01
- SR-MRL-30-0708 → EL-MRL-30-SENS-01
- SR-MRL-30-0709 → EL-MRL-30-MECH-05
- SR-MRL-30-0710 → EL-MRL-30-MECH-05
- SR-MRL-30-0711 → EL-MRL-30-GEAR-04
- SR-MRL-30-0711 → EL-MRL-30-SENS-01
- SR-MRL-30-0712 → EL-MRL-30-MECH-05
- SR-MRL-30-0713 → EL-MRL-30-MOTO-03
- SR-MRL-30-0713 → EL-MRL-30-SENS-01
- SR-MRL-30-0714 → EL-MRL-30-SENS-01
- SR-MRL-30-0714 → EL-MRL-30-MOTO-03
- SR-MRL-30-0715 → EL-MRL-30-MECH-05
- SR-MRL-30-0716 → EL-MRL-30-ECU-02
- SR-MRL-30-0717 → EL-MRL-30-GEAR-04
- SR-MRL-30-0718 → EL-MRL-30-ECU-02
- SR-MRL-30-0718 → EL-MRL-30-GEAR-04
- SR-MRL-30-0719 → EL-MRL-30-SENS-01
- SR-MRL-30-0720 → EL-MRL-30-ECU-02
- SR-MRL-30-0720 → EL-MRL-30-GEAR-04
- SR-MRL-30-0721 → EL-MRL-30-MECH-05
- SR-MRL-30-0721 → EL-MRL-30-SENS-01
- SR-MRL-30-0722 → EL-MRL-30-ECU-02
- SR-MRL-30-0722 → EL-MRL-30-SENS-01
