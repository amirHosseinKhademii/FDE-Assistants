# foc — interface note
**Component:** SWC-MOTCTL · **ASIL:** D · **Team:** motor control
**Last reviewed:** 2020-07-14 

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `Foc_Init`
- `Foc_Park`
- `Foc_Clarke`
- `Foc_CurrentLoop`
- `Foc_Pwm`

## Known issues

Not re-verified since the toolchain upgrade.
