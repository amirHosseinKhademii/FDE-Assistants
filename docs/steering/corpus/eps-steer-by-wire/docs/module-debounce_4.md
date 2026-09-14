# debounce_4 — interface note
**Component:** SWC-PLT-002 · **ASIL:** B · **Team:** control
**Last reviewed:** 2023-11-02 (overdue — annual review)

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `Debounce_Get`
- `Debounce_Calc`
- `Debounce_Update`
- `Debounce_Reset`
- `Debounce_Flush`
- `Debounce_Init`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
