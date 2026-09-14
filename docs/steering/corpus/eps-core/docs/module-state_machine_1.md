# state_machine_1 — interface note
**Component:** SWC-PLT-027 · **ASIL:** D · **Team:** control
**Last reviewed:** 2022-12-30 

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `StateMachine_Update`
- `StateMachine_Flush`
- `StateMachine_Check`
- `StateMachine_Get`
- `StateMachine_Apply`
- `StateMachine_Put`

## Known issues

Stack figure in cfg/build.json predates the last change.
