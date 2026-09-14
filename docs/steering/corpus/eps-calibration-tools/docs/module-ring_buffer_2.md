# ring_buffer_2 — interface note
**Component:** SWC-PLT-023 · **ASIL:** QM · **Team:** calibration
**Last reviewed:** 2023-05-16 (overdue — annual review)

## What it does

Monitors its inputs and raises a fault if they leave the plausible range.

## Entry points

- `RingBuffer_Flush`
- `RingBuffer_Update`
- `RingBuffer_Apply`

## Known issues

None recorded.
