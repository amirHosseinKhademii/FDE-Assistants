# checksum_8 — interface note
**Component:** SWC-PLT-003 · **ASIL:** D · **Team:** diagnostics
**Last reviewed:** 2020-06-21 (overdue — annual review)

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `Checksum_Get`
- `Checksum_Put`
- `Checksum_Apply`
- `Checksum_Update`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
