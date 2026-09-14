# System Architectural Design — K2
**Baseline:** ARCH-K2-v3 · created 2026-08-04 · baselined
**Supersedes:** ARCH-K2-v2

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-K2-TSENS-01 | sensor | buy | D | VS-TSENS-1180-B | carryover |
| EL-K2-ECU-01 | ecu | buy | D | VS-ECU-4680-A | modified |
| EL-K2-MOT-01 | motor | buy | D | VS-MOT-5520-A | carryover |
| EL-K2-GEAR-01 | gearbox | make | B | VS-GEAR-3301-C | modified |
| EL-K2-RACK-01 | mechanical | make | B | VS-RACK-2210-A | carryover |
| EL-K2-GW-01 | ecu | buy | B | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-TORQUE-SENSE | EL-K2-TSENS-01 | primary |
| ACT-ANGLE-SENSE | EL-K2-TSENS-01 | primary |
| ACT-ASSIST | EL-K2-ECU-01 | primary |
| ACT-DAMPING | EL-K2-ECU-01 | primary |
| ACT-RETURN-TO-CENTER | EL-K2-ECU-01 | primary |
| ACT-HYSTERESIS-COMP | EL-K2-ECU-01 | primary |
| ACT-FRICTION-COMP | EL-K2-ECU-01 | primary |
| ACT-ARBITRATION | EL-K2-ECU-01 | primary |
| ACT-DIAGNOSTICS | EL-K2-ECU-01 | primary |
| ACT-SAFETY-MONITOR | EL-K2-ECU-01 | primary |
| ACT-EOL-CALIB | EL-K2-ECU-01 | primary |
| ACT-MOTOR-CONTROL | EL-K2-MOT-01 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-K2-TSENS-01 | EL-K2-ECU-01 | SENT | driver torque, steering angle | 1 ms | D |
| EL-K2-ECU-01 | EL-K2-MOT-01 | PWM | three-phase motor current command | 0.1 ms | D |
| EL-K2-GW-01 | EL-K2-ECU-01 | CAN-FD | vehicle speed, ADAS torque request | 10 ms | B |
| EL-K2-ECU-01 | EL-K2-GW-01 | CAN-FD | status, diagnostics | 20 ms | QM |
| EL-K2-MOT-01 | EL-K2-GEAR-01 | mechanical | assist torque | — ms | B |
| EL-K2-GEAR-01 | EL-K2-RACK-01 | mechanical | rack force | — ms | B |

## 4. Requirements allocated to elements

- SR-EPS-0407 → EL-K2-GEAR-01
- SR-EPS-0407 → EL-K2-MOT-01
- SR-EPS-0407 → EL-K2-RACK-01
- SR-EPS-0408 → EL-K2-ECU-01
- SR-EPS-0408 → EL-K2-GEAR-01
- SR-EPS-0411 → EL-K2-ECU-01
- SR-EPS-0415 → EL-K2-TSENS-01
- SR-EPS-0415 → EL-K2-ECU-01
- SR-EPS-0415 → EL-K2-MOT-01
- SR-EPS-0421 → EL-K2-ECU-01
- SR-EPS-0401 → EL-K2-RACK-01
- SR-EPS-0402 → EL-K2-RACK-01
- SR-EPS-0403 → EL-K2-RACK-01
- SR-EPS-0404 → EL-K2-ECU-01
- SR-EPS-0405 → EL-K2-RACK-01
- SR-EPS-0406 → EL-K2-ECU-01
- SR-EPS-0409 → EL-K2-TSENS-01
- SR-EPS-0410 → EL-K2-ECU-01
- SR-EPS-0412 → EL-K2-ECU-01
- SR-EPS-0413 → EL-K2-RACK-01
- SR-EPS-0414 → EL-K2-ECU-01
- SR-EPS-0416 → EL-K2-ECU-01
- SR-EPS-0417 → EL-K2-RACK-01
- SR-EPS-0418 → EL-K2-GEAR-01
- SR-EPS-0419 → EL-K2-ECU-01
