# state_machine_1 — interface note
**Component:** SWC-PLT-013 · **ASIL:** B · **Team:** steering feel
**Last reviewed:** 2023-08-27 (overdue — annual review)

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `StateMachine_Put`
- `StateMachine_Check`
- `StateMachine_Flush`

## Known issues

Stack figure in cfg/build.json predates the last change.
