# Calibration tooling — integration manual
**Revision 6** · 2025-12-03 · calibration

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| a2l_export | `A2l_Load` | 1 ms | QM |
| a2l_export | `A2l_Export` | 5 ms | QM |
| dataset | `Ds_Open` | 1 ms | QM |
| dataset | `Ds_Diff` | 5 ms | QM |
| filter_iir_1 | `FilterIir_Apply` | 10 ms | QM |
| filter_iir_1 | `FilterIir_Flush` | 1 ms | QM |
| ring_buffer_2 | `RingBuffer_Flush` | 5 ms | QM |
| ring_buffer_2 | `RingBuffer_Update` | 1 ms | QM |
| timebase_3 | `Timebase_Update` | 5 ms | B |
| timebase_3 | `Timebase_Peek` | 10 ms | B |
| rate_limit_4 | `RateLimit_Calc` | 10 ms | QM |
| rate_limit_4 | `RateLimit_Peek` | 2 ms | QM |
| ring_buffer_5 | `RingBuffer_Put` | 2 ms | B |
| ring_buffer_5 | `RingBuffer_Flush` | 10 ms | B |
| fixpt_6 | `Fixpt_Peek` | 2 ms | D |
| fixpt_6 | `Fixpt_Flush` | 2 ms | D |
| lookup_table_7 | `LookupTable_Apply` | 10 ms | QM |
| lookup_table_7 | `LookupTable_Reset` | 2 ms | QM |

## Required interfaces

- vehicle speed (CAN-FD, 10 ms)
- ignition status
- battery voltage
- motor position (resolver)

## Integration notes

- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
- Do not call the apply functions from an interrupt context.
