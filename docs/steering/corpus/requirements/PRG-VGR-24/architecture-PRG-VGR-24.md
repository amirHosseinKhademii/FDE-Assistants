# System Architectural Design — Gale
**Baseline:** ARCH-VGR-24-v3 · created 2025-10-04 · baselined
**Supersedes:** ARCH-VGR-24-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-VGR-24-SENS-01 | sensor | buy | C | — | carryover |
| EL-VGR-24-ECU-02 | ecu | buy | C | — | carryover |
| EL-VGR-24-MOTO-03 | motor | buy | D | — | modified |
| EL-VGR-24-GEAR-04 | gearbox | make | D | — | modified |
| EL-VGR-24-MECH-05 | mechanical | make | C | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ARBITRATION | EL-VGR-24-SENS-01 | primary |
| ACT-FRICTION-COMP | EL-VGR-24-MECH-05 | primary |
| ACT-DIAGNOSTICS | EL-VGR-24-MECH-05 | primary |
| ACT-EOL-CALIB | EL-VGR-24-MECH-05 | primary |
| ACT-SAFETY-MONITOR | EL-VGR-24-MOTO-03 | primary |
| ACT-TORQUE-SENSE | EL-VGR-24-GEAR-04 | primary |
| ACT-MOTOR-CONTROL | EL-VGR-24-MOTO-03 | primary |
| ACT-ANGLE-SENSE | EL-VGR-24-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-VGR-24-SENS-01 | EL-VGR-24-ECU-02 | mechanical | signal | — ms | QM |
| EL-VGR-24-ECU-02 | EL-VGR-24-MOTO-03 | mechanical | signal | — ms | QM |
| EL-VGR-24-MOTO-03 | EL-VGR-24-GEAR-04 | analog | signal | — ms | B |
| EL-VGR-24-GEAR-04 | EL-VGR-24-MECH-05 | PWM | signal | — ms | B |

## 4. Requirements allocated to elements

- SR-VGR-24-0568 → EL-VGR-24-GEAR-04
- SR-VGR-24-0568 → EL-VGR-24-MOTO-03
- SR-VGR-24-0569 → EL-VGR-24-ECU-02
- SR-VGR-24-0569 → EL-VGR-24-MECH-05
- SR-VGR-24-0570 → EL-VGR-24-MECH-05
- SR-VGR-24-0571 → EL-VGR-24-ECU-02
- SR-VGR-24-0572 → EL-VGR-24-MECH-05
- SR-VGR-24-0573 → EL-VGR-24-SENS-01
- SR-VGR-24-0573 → EL-VGR-24-MOTO-03
- SR-VGR-24-0574 → EL-VGR-24-SENS-01
- SR-VGR-24-0574 → EL-VGR-24-MOTO-03
- SR-VGR-24-0575 → EL-VGR-24-GEAR-04
- SR-VGR-24-0576 → EL-VGR-24-GEAR-04
- SR-VGR-24-0576 → EL-VGR-24-MECH-05
- SR-VGR-24-0577 → EL-VGR-24-ECU-02
- SR-VGR-24-0578 → EL-VGR-24-MECH-05
- SR-VGR-24-0578 → EL-VGR-24-MOTO-03
- SR-VGR-24-0579 → EL-VGR-24-MECH-05
- SR-VGR-24-0579 → EL-VGR-24-SENS-01
- SR-VGR-24-0580 → EL-VGR-24-SENS-01
- SR-VGR-24-0581 → EL-VGR-24-GEAR-04
- SR-VGR-24-0582 → EL-VGR-24-SENS-01
- SR-VGR-24-0582 → EL-VGR-24-GEAR-04
- SR-VGR-24-0583 → EL-VGR-24-ECU-02
- SR-VGR-24-0584 → EL-VGR-24-GEAR-04
- SR-VGR-24-0584 → EL-VGR-24-MECH-05
- SR-VGR-24-0585 → EL-VGR-24-GEAR-04
- SR-VGR-24-0586 → EL-VGR-24-MOTO-03
- SR-VGR-24-0587 → EL-VGR-24-SENS-01
- SR-VGR-24-0587 → EL-VGR-24-ECU-02
