# EPS core control — integration manual
**Revision 3** · 2023-01-22 · control

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| assist | `Assist_CalcBase` | 2 ms | D |
| assist | `Assist_ApplySpeedScale` | 1 ms | D |
| arbitration | `Arb_Select` | 1 ms | D |
| arbitration | `Arb_RateLimit` | 1 ms | D |
| torque_sense | `TrqSens_Read` | 2 ms | D |
| torque_sense | `TrqSens_Plausibilise` | 2 ms | D |
| veh_speed | `VehSpd_Read` | 10 ms | B |
| veh_speed | `VehSpd_CheckStaleness` | 10 ms | B |
| state_machine_1 | `StateMachine_Update` | 10 ms | D |
| state_machine_1 | `StateMachine_Flush` | 2 ms | D |
| filter_iir_2 | `FilterIir_Check` | 5 ms | QM |
| filter_iir_2 | `FilterIir_Apply` | 5 ms | QM |
| timebase_3 | `Timebase_Check` | 5 ms | D |
| timebase_3 | `Timebase_Calc` | 5 ms | D |
| fixpt_4 | `Fixpt_Peek` | 10 ms | C |
| fixpt_4 | `Fixpt_Apply` | 10 ms | C |
| bitfield_5 | `Bitfield_Put` | 1 ms | C |
| bitfield_5 | `Bitfield_Update` | 1 ms | C |

## Required interfaces

- vehicle speed (CAN-FD, 10 ms)
- ignition status
- steering angle (SENT, 1 ms)

## Integration notes

- Initialise in the order given above. The arbitration module assumes its inputs are already valid.
- The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.
- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
