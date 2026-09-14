# state_machine_6 — interface note
**Component:** SWC-PLT-017 · **ASIL:** QM · **Team:** diagnostics
**Last reviewed:** 2026-01-21 

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `StateMachine_Apply`
- `StateMachine_Reset`
- `StateMachine_Put`
- `StateMachine_Calc`
- `StateMachine_Check`

## Known issues

Stack figure in cfg/build.json predates the last change.
