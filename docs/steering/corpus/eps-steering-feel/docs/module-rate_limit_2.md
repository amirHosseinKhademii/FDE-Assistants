# rate_limit_2 — interface note
**Component:** SWC-PLT-018 · **ASIL:** QM · **Team:** steering feel
**Last reviewed:** 2021-08-17 (overdue — annual review)

## What it does

Converts between the units used on the bus and the units used internally.

## Entry points

- `RateLimit_Apply`
- `RateLimit_Update`
- `RateLimit_Init`
- `RateLimit_Calc`

## Known issues

The ASIL in the header does not match the build configuration. Nobody has decided which is right.
