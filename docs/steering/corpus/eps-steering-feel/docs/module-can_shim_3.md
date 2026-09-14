# can_shim_3 — interface note
**Component:** SWC-PLT-032 · **ASIL:** QM · **Team:** steering feel
**Last reviewed:** 2020-07-14 (overdue — annual review)

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `CanShim_Peek`
- `CanShim_Apply`
- `CanShim_Get`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
