# Safety monitor — integration manual
**Revision 5** · 2022-03-28 · functional safety

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| torque_bound | `Bound_Check` | 1 ms | D |
| torque_bound | `Bound_Trip` | 1 ms | D |
| watchdog | `Wdg_Kick` | 10 ms | D |
| watchdog | `Wdg_Expire` | 2 ms | D |
| plausibility | `Plaus_CrossCheck` | 10 ms | D |
| plausibility | `Plaus_Report` | 10 ms | D |
| bitfield_1 | `Bitfield_Check` | 1 ms | D |
| bitfield_1 | `Bitfield_Flush` | 1 ms | D |
| rate_limit_2 | `RateLimit_Apply` | 2 ms | B |
| rate_limit_2 | `RateLimit_Calc` | 1 ms | B |
| event_queue_3 | `EventQueue_Get` | 10 ms | B |
| event_queue_3 | `EventQueue_Flush` | 1 ms | B |
| debounce_4 | `Debounce_Flush` | 10 ms | C |
| debounce_4 | `Debounce_Peek` | 1 ms | C |
| rate_limit_5 | `RateLimit_Reset` | 10 ms | QM |
| rate_limit_5 | `RateLimit_Get` | 1 ms | QM |
| timebase_6 | `Timebase_Calc` | 10 ms | QM |
| timebase_6 | `Timebase_Apply` | 1 ms | QM |

## Required interfaces

- steering angle (SENT, 1 ms)
- motor position (resolver)
- vehicle speed (CAN-FD, 10 ms)
- driver torque (SENT, 1 ms)

## Integration notes

- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
- Initialise in the order given above. The arbitration module assumes its inputs are already valid.
- The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.
