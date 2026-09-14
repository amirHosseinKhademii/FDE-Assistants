# Steering feel — integration manual
**Revision 5** · 2026-04-23 · steering feel

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| damping | `Damping_Apply` | 1 ms | B |
| damping | `Damping_RateLimit` | 5 ms | B |
| hysteresis_comp | `Hyst_Shape` | 10 ms | B |
| hysteresis_comp | `Hyst_Apply` | 2 ms | B |
| friction_comp | `Fric_Estimate` | 10 ms | B |
| friction_comp | `Fric_Compensate` | 2 ms | B |
| rtc | `Rtc_CalcReturn` | 2 ms | B |
| rtc | `Rtc_Blend` | 5 ms | B |
| state_machine_1 | `StateMachine_Put` | 10 ms | B |
| state_machine_1 | `StateMachine_Check` | 2 ms | B |
| rate_limit_2 | `RateLimit_Apply` | 5 ms | QM |
| rate_limit_2 | `RateLimit_Update` | 1 ms | QM |
| can_shim_3 | `CanShim_Peek` | 1 ms | QM |
| can_shim_3 | `CanShim_Apply` | 2 ms | QM |
| ring_buffer_4 | `RingBuffer_Get` | 1 ms | QM |
| ring_buffer_4 | `RingBuffer_Check` | 2 ms | QM |
| bitfield_5 | `Bitfield_Check` | 5 ms | QM |
| bitfield_5 | `Bitfield_Peek` | 10 ms | QM |
| debounce_6 | `Debounce_Calc` | 2 ms | D |
| debounce_6 | `Debounce_Reset` | 10 ms | D |
| event_queue_7 | `EventQueue_Get` | 2 ms | B |
| event_queue_7 | `EventQueue_Apply` | 10 ms | B |
| checksum_8 | `Checksum_Get` | 5 ms | B |
| checksum_8 | `Checksum_Flush` | 5 ms | B |

## Required interfaces

- motor position (resolver)
- ignition status
- battery voltage
- driver torque (SENT, 1 ms)

## Integration notes

- The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.
- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
