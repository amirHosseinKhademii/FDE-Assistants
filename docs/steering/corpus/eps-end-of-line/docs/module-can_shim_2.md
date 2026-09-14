# can_shim_2 — interface note
**Component:** SWC-PLT-006 · **ASIL:** QM · **Team:** diagnostics
**Last reviewed:** 2020-11-09 (overdue — annual review)

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `CanShim_Calc`
- `CanShim_Update`
- `CanShim_Flush`
- `CanShim_Put`
- `CanShim_Peek`

## Known issues

Stack figure in cfg/build.json predates the last change.
