# unit_conv_3 — interface note
**Component:** SWC-PLT-030 · **ASIL:** B · **Team:** motor control
**Last reviewed:** 2023-03-26 

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `UnitConv_Peek`
- `UnitConv_Init`
- `UnitConv_Get`
- `UnitConv_Calc`
- `UnitConv_Reset`
- `UnitConv_Put`

## Known issues

Stack figure in cfg/build.json predates the last change.
