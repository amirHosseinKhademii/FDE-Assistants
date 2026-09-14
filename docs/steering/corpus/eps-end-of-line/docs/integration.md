# End-of-line calibration — integration manual
**Revision 8** · 2023-07-08 · diagnostics

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
| eol_learn | `Eol_LearnCentre` | 5 ms | QM |
| eol_learn | `Eol_LearnOffsets` | 2 ms | QM |
| eol_seq | `EolSeq_Run` | 10 ms | QM |
| eol_seq | `EolSeq_Abort` | 5 ms | QM |
| rate_limit_1 | `RateLimit_Flush` | 10 ms | B |
| rate_limit_1 | `RateLimit_Update` | 5 ms | B |
| can_shim_2 | `CanShim_Calc` | 5 ms | QM |
| can_shim_2 | `CanShim_Update` | 5 ms | QM |
| rate_limit_3 | `RateLimit_Check` | 5 ms | B |
| rate_limit_3 | `RateLimit_Put` | 5 ms | B |
| unit_conv_4 | `UnitConv_Get` | 2 ms | B |
| unit_conv_4 | `UnitConv_Reset` | 5 ms | B |

## Required interfaces

- steering angle (SENT, 1 ms)
- vehicle speed (CAN-FD, 10 ms)
- ignition status

## Integration notes

- Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.
- Do not call the apply functions from an interrupt context.
- Initialise in the order given above. The arbitration module assumes its inputs are already valid.
