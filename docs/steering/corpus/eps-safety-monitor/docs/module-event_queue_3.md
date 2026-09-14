# event_queue_3 — interface note
**Component:** SWC-PLT-011 · **ASIL:** B · **Team:** functional safety
**Last reviewed:** 2025-06-05 

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `EventQueue_Get`
- `EventQueue_Flush`
- `EventQueue_Put`
- `EventQueue_Calc`
- `EventQueue_Check`

## Known issues

Stack figure in cfg/build.json predates the last change.
