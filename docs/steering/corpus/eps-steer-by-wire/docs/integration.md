# Steer-by-wire (pre-development) — integration manual
**Revision 8** · 2023-08-06 · control

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| road_wheel_actuator | `Rwa_Track` | 5 ms | D |
| road_wheel_actuator | `Rwa_Fault` | 5 ms | D |
| feedback_actuator | `Fba_Render` | 5 ms | D |
| feedback_actuator | `Fba_Fault` | 5 ms | D |
| filter_iir_1 | `FilterIir_Calc` | 5 ms | QM |
| filter_iir_1 | `FilterIir_Apply` | 2 ms | QM |
| rate_limit_2 | `RateLimit_Reset` | 1 ms | QM |
| rate_limit_2 | `RateLimit_Put` | 10 ms | QM |
| crc_3 | `Crc_Peek` | 5 ms | D |
| crc_3 | `Crc_Flush` | 1 ms | D |
| debounce_4 | `Debounce_Get` | 1 ms | B |
| debounce_4 | `Debounce_Calc` | 10 ms | B |

## Required interfaces

- vehicle speed (CAN-FD, 10 ms)
- driver torque (SENT, 1 ms)
- steering angle (SENT, 1 ms)

## Integration notes

- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
- The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.
