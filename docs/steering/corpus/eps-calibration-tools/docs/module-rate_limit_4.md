# rate_limit_4 — interface note
**Component:** SWC-PLT-017 · **ASIL:** QM · **Team:** calibration
**Last reviewed:** 2025-01-27 (overdue — annual review)

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `RateLimit_Init`
- `RateLimit_Calc`
- `RateLimit_Peek`
- `RateLimit_Update`
- `RateLimit_Apply`

## Known issues

None recorded.
