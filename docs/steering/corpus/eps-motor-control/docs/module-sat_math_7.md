# sat_math_7 — interface note
**Component:** SWC-PLT-012 · **ASIL:** D · **Team:** motor control
**Last reviewed:** 2023-07-03 

## What it does

Converts between the units used on the bus and the units used internally.

## Entry points

- `SatMath_Apply`
- `SatMath_Put`
- `SatMath_Reset`
- `SatMath_Calc`
- `SatMath_Peek`
- `SatMath_Check`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
