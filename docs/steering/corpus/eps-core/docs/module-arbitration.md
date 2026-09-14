# arbitration — interface note
**Component:** SWC-ARB · **ASIL:** D · **Team:** control
**Last reviewed:** 2020-10-17 

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `Arb_Init`
- `Arb_Select`
- `Arb_RateLimit`
- `Arb_MainRunnable`

## Known issues

Stack figure in cfg/build.json predates the last change.
