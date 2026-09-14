# timebase_6 — interface note
**Component:** SWC-PLT-031 · **ASIL:** QM · **Team:** functional safety
**Last reviewed:** 2024-12-25 (overdue — annual review)

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `Timebase_Calc`
- `Timebase_Apply`
- `Timebase_Flush`
- `Timebase_Get`

## Known issues

Stack figure in cfg/build.json predates the last change.
