# timebase_3 — interface note
**Component:** SWC-PLT-001 · **ASIL:** B · **Team:** calibration
**Last reviewed:** 2022-05-30 (overdue — annual review)

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `Timebase_Update`
- `Timebase_Peek`
- `Timebase_Calc`
- `Timebase_Reset`
- `Timebase_Check`
- `Timebase_Get`

## Known issues

Not re-verified since the toolchain upgrade.
