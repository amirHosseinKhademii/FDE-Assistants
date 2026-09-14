# Motor current control — integration manual
**Revision 6** · 2026-05-25 · motor control

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| foc | `Foc_Park` | 10 ms | D |
| foc | `Foc_Clarke` | 1 ms | D |
| field_weakening | `Fw_Calc` | 1 ms | D |
| temp_derate | `Derate_Apply` | 1 ms | B |
| lookup_table_1 | `LookupTable_Put` | 1 ms | D |
| lookup_table_1 | `LookupTable_Check` | 5 ms | D |
| nvm_block_2 | `NvmBlock_Flush` | 5 ms | QM |
| nvm_block_2 | `NvmBlock_Calc` | 2 ms | QM |
| unit_conv_3 | `UnitConv_Peek` | 5 ms | B |
| unit_conv_3 | `UnitConv_Get` | 1 ms | B |
| timebase_4 | `Timebase_Put` | 5 ms | QM |
| timebase_4 | `Timebase_Get` | 2 ms | QM |
| rate_limit_5 | `RateLimit_Reset` | 5 ms | B |
| rate_limit_5 | `RateLimit_Flush` | 5 ms | B |
| rate_limit_6 | `RateLimit_Update` | 5 ms | QM |
| rate_limit_6 | `RateLimit_Apply` | 1 ms | QM |
| sat_math_7 | `SatMath_Apply` | 2 ms | D |
| sat_math_7 | `SatMath_Put` | 1 ms | D |
| nvm_block_8 | `NvmBlock_Get` | 5 ms | QM |
| nvm_block_8 | `NvmBlock_Put` | 1 ms | QM |

## Required interfaces

- ignition status
- vehicle speed (CAN-FD, 10 ms)

## Integration notes

- Do not call the apply functions from an interrupt context.
- Initialise in the order given above. The arbitration module assumes its inputs are already valid.
- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
