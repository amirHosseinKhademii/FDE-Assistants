# System Architectural Design — Flint
**Baseline:** ARCH-KAI-34-v2 · created 2021-02-01 · baselined
**Supersedes:** ARCH-KAI-34-v1

## 1. Elements

| element | kind | make/buy | ASIL | part | reuse |
|---|---|---|---|---|---|
| EL-KAI-34-SENS-01 | sensor | buy | QM | — | carryover |
| EL-KAI-34-ECU-02 | ecu | buy | B | — | new |
| EL-KAI-34-MOTO-03 | motor | buy | QM | — | carryover |
| EL-KAI-34-GEAR-04 | gearbox | make | D | — | carryover |
| EL-KAI-34-MECH-05 | mechanical | make | QM | — | carryover |

## 2. Activities, and which element performs them

Per ASPICE SYS.3, each activity is allocated to exactly one element as primary.

| activity | element | type |
|---|---|---|
| ACT-ANGLE-SENSE | EL-KAI-34-SENS-01 | primary |
| ACT-DAMPING | EL-KAI-34-MOTO-03 | primary |
| ACT-ASSIST | EL-KAI-34-ECU-02 | primary |
| ACT-EOL-CALIB | EL-KAI-34-GEAR-04 | primary |
| ACT-FRICTION-COMP | EL-KAI-34-ECU-02 | primary |
| ACT-DIAGNOSTICS | EL-KAI-34-MECH-05 | primary |
| ACT-MOTOR-CONTROL | EL-KAI-34-GEAR-04 | primary |
| ACT-RETURN-TO-CENTER | EL-KAI-34-MOTO-03 | primary |

## 3. Interfaces

| from | to | kind | signal | rate | ASIL |
|---|---|---|---|---|---|
| EL-KAI-34-SENS-01 | EL-KAI-34-ECU-02 | mechanical | signal | — ms | QM |
| EL-KAI-34-ECU-02 | EL-KAI-34-MOTO-03 | SENT | signal | — ms | D |
| EL-KAI-34-MOTO-03 | EL-KAI-34-GEAR-04 | PWM | signal | — ms | B |
| EL-KAI-34-GEAR-04 | EL-KAI-34-MECH-05 | PWM | signal | — ms | QM |

## 4. Requirements allocated to elements

- SR-KAI-34-0805 → EL-KAI-34-SENS-01
- SR-KAI-34-0805 → EL-KAI-34-MECH-05
- SR-KAI-34-0806 → EL-KAI-34-SENS-01
- SR-KAI-34-0807 → EL-KAI-34-ECU-02
- SR-KAI-34-0808 → EL-KAI-34-ECU-02
- SR-KAI-34-0809 → EL-KAI-34-SENS-01
- SR-KAI-34-0810 → EL-KAI-34-MOTO-03
- SR-KAI-34-0810 → EL-KAI-34-GEAR-04
- SR-KAI-34-0811 → EL-KAI-34-SENS-01
- SR-KAI-34-0811 → EL-KAI-34-MECH-05
- SR-KAI-34-0812 → EL-KAI-34-SENS-01
- SR-KAI-34-0813 → EL-KAI-34-MOTO-03
- SR-KAI-34-0813 → EL-KAI-34-SENS-01
- SR-KAI-34-0814 → EL-KAI-34-ECU-02
- SR-KAI-34-0815 → EL-KAI-34-GEAR-04
- SR-KAI-34-0815 → EL-KAI-34-MOTO-03
- SR-KAI-34-0816 → EL-KAI-34-MECH-05
- SR-KAI-34-0816 → EL-KAI-34-GEAR-04
- SR-KAI-34-0817 → EL-KAI-34-MOTO-03
- SR-KAI-34-0817 → EL-KAI-34-SENS-01
- SR-KAI-34-0818 → EL-KAI-34-ECU-02
- SR-KAI-34-0819 → EL-KAI-34-MOTO-03
- SR-KAI-34-0819 → EL-KAI-34-MECH-05
- SR-KAI-34-0820 → EL-KAI-34-MOTO-03
- SR-KAI-34-0820 → EL-KAI-34-SENS-01
- SR-KAI-34-0821 → EL-KAI-34-MOTO-03
- SR-KAI-34-0822 → EL-KAI-34-GEAR-04
