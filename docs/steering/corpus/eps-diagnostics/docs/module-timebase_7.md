# timebase_7 — interface note
**Component:** SWC-PLT-009 · **ASIL:** C · **Team:** diagnostics
**Last reviewed:** 2023-11-10 (overdue — annual review)

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `Timebase_Peek`
- `Timebase_Flush`
- `Timebase_Calc`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
