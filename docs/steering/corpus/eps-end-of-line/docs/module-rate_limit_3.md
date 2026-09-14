# rate_limit_3 — interface note
**Component:** SWC-PLT-023 · **ASIL:** B · **Team:** diagnostics
**Last reviewed:** 2023-05-23 

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `RateLimit_Check`
- `RateLimit_Put`
- `RateLimit_Get`

## Known issues

Not re-verified since the toolchain upgrade.
