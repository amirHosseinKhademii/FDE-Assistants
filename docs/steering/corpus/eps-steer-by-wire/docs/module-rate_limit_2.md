# rate_limit_2 — interface note
**Component:** SWC-PLT-007 · **ASIL:** QM · **Team:** control
**Last reviewed:** 2022-12-21 

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `RateLimit_Init`
- `RateLimit_Reset`
- `RateLimit_Put`
- `RateLimit_Apply`

## Known issues

Not re-verified since the toolchain upgrade.
