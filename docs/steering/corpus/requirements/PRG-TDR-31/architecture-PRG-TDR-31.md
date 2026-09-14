# System Architectural Design — Lumen
**Baseline:** ARCH-TDR-31-v3 · created 2021-02-06 · baselined
**Supersedes:** ARCH-TDR-31-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-TDR-31-SENS-01 | sensor | buy | D | — | new |
| EL-TDR-31-ECU-02 | ecu | buy | C | — | carryover |
| EL-TDR-31-MOTO-03 | motor | buy | QM | — | modified |
| EL-TDR-31-GEAR-04 | gearbox | make | QM | — | modified |
| EL-TDR-31-MECH-05 | mechanical | make | D | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-FRICTION-COMP | EL-TDR-31-MECH-05 | primary |
| ACT-DAMPING | EL-TDR-31-MOTO-03 | primary |
| ACT-HYSTERESIS-COMP | EL-TDR-31-ECU-02 | primary |
| ACT-MOTOR-CONTROL | EL-TDR-31-MOTO-03 | primary |
| ACT-EOL-CALIB | EL-TDR-31-SENS-01 | primary |
| ACT-ARBITRATION | EL-TDR-31-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-TDR-31-SENS-01 | EL-TDR-31-ECU-02 | mechanical | signal | 10.53 ms | B |
| EL-TDR-31-ECU-02 | EL-TDR-31-MOTO-03 | SENT | signal | — ms | B |
| EL-TDR-31-MOTO-03 | EL-TDR-31-GEAR-04 | PWM | signal | 6.73 ms | B |
| EL-TDR-31-GEAR-04 | EL-TDR-31-MECH-05 | CAN-FD | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-TDR-31-0723 → EL-TDR-31-ECU-02
- SR-TDR-31-0724 → EL-TDR-31-MOTO-03
- SR-TDR-31-0725 → EL-TDR-31-SENS-01
- SR-TDR-31-0725 → EL-TDR-31-MOTO-03
- SR-TDR-31-0726 → EL-TDR-31-MOTO-03
- SR-TDR-31-0727 → EL-TDR-31-GEAR-04
- SR-TDR-31-0727 → EL-TDR-31-MECH-05
- SR-TDR-31-0728 → EL-TDR-31-MECH-05
- SR-TDR-31-0728 → EL-TDR-31-GEAR-04
- SR-TDR-31-0729 → EL-TDR-31-SENS-01
- SR-TDR-31-0729 → EL-TDR-31-MECH-05
- SR-TDR-31-0730 → EL-TDR-31-MOTO-03
- SR-TDR-31-0731 → EL-TDR-31-MOTO-03
- SR-TDR-31-0732 → EL-TDR-31-MECH-05
- SR-TDR-31-0733 → EL-TDR-31-MOTO-03
- SR-TDR-31-0733 → EL-TDR-31-MECH-05
- SR-TDR-31-0734 → EL-TDR-31-ECU-02
- SR-TDR-31-0735 → EL-TDR-31-MECH-05
- SR-TDR-31-0735 → EL-TDR-31-GEAR-04
- SR-TDR-31-0736 → EL-TDR-31-MECH-05
- SR-TDR-31-0737 → EL-TDR-31-GEAR-04
- SR-TDR-31-0738 → EL-TDR-31-GEAR-04
- SR-TDR-31-0739 → EL-TDR-31-MECH-05
- SR-TDR-31-0740 → EL-TDR-31-MECH-05
- SR-TDR-31-0740 → EL-TDR-31-MOTO-03
- SR-TDR-31-0741 → EL-TDR-31-MECH-05
- SR-TDR-31-0741 → EL-TDR-31-MOTO-03
- SR-TDR-31-0742 → EL-TDR-31-MOTO-03
- SR-TDR-31-0743 → EL-TDR-31-GEAR-04
- SR-TDR-31-0743 → EL-TDR-31-MECH-05
- SR-TDR-31-0744 → EL-TDR-31-SENS-01
- SR-TDR-31-0744 → EL-TDR-31-MOTO-03
- SR-TDR-31-0745 → EL-TDR-31-GEAR-04
- SR-TDR-31-0745 → EL-TDR-31-ECU-02
- SR-TDR-31-0746 → EL-TDR-31-SENS-01
- SR-TDR-31-0747 → EL-TDR-31-ECU-02
- SR-TDR-31-0748 → EL-TDR-31-MECH-05
- SR-TDR-31-0748 → EL-TDR-31-MOTO-03
- SR-TDR-31-0749 → EL-TDR-31-GEAR-04
- SR-TDR-31-0749 → EL-TDR-31-ECU-02
- SR-TDR-31-0750 → EL-TDR-31-MOTO-03
- SR-TDR-31-0750 → EL-TDR-31-GEAR-04
- SR-TDR-31-0751 → EL-TDR-31-MECH-05
