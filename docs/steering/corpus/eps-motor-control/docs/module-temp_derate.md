# temp_derate — interface note
**Component:** SWC-MOTCTL · **ASIL:** B · **Team:** motor control
**Last reviewed:** 2022-07-07 

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `Derate_Init`
- `Derate_Apply`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
