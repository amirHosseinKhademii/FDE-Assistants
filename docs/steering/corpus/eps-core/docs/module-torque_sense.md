# torque_sense — interface note
**Component:** SWC-TRQSENS · **ASIL:** D · **Team:** control
**Last reviewed:** 2026-01-05 

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `TrqSens_Init`
- `TrqSens_Read`
- `TrqSens_Plausibilise`
- `TrqSens_Filter`

## Known issues

The ASIL in the header does not match the build configuration. Nobody has decided which is right.
