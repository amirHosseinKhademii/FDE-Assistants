# Diagnostics — integration manual
**Revision 1** · 2023-02-25 · diagnostics

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| dtc | `Dtc_Set` | 5 ms | QM |
| dtc | `Dtc_Clear` | 2 ms | QM |
| uds | `Uds_Dispatch` | 2 ms | QM |
| uds | `Uds_ReadDid` | 1 ms | QM |
| snapshot | `Snap_Capture` | 5 ms | QM |
| snapshot | `Snap_Store` | 1 ms | QM |
| lookup_table_1 | `LookupTable_Get` | 10 ms | QM |
| lookup_table_1 | `LookupTable_Apply` | 10 ms | QM |
| bitfield_2 | `Bitfield_Get` | 2 ms | D |
| bitfield_2 | `Bitfield_Peek` | 2 ms | D |
| crc_3 | `Crc_Update` | 1 ms | C |
| crc_3 | `Crc_Put` | 10 ms | C |
| fixpt_4 | `Fixpt_Get` | 2 ms | QM |
| fixpt_4 | `Fixpt_Apply` | 5 ms | QM |
| checksum_5 | `Checksum_Calc` | 5 ms | C |
| checksum_5 | `Checksum_Put` | 2 ms | C |
| state_machine_6 | `StateMachine_Apply` | 2 ms | QM |
| state_machine_6 | `StateMachine_Reset` | 1 ms | QM |
| timebase_7 | `Timebase_Peek` | 2 ms | C |
| timebase_7 | `Timebase_Flush` | 1 ms | C |
| checksum_8 | `Checksum_Get` | 2 ms | D |
| checksum_8 | `Checksum_Put` | 1 ms | D |

## Required interfaces

- ignition status
- battery voltage
- steering angle (SENT, 1 ms)

## Integration notes

- Do not call the apply functions from an interrupt context.
- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
- The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.
