# ring_buffer_4 — interface note
**Component:** SWC-PLT-019 · **ASIL:** QM · **Team:** steering feel
**Last reviewed:** 2020-07-03 (overdue — annual review)

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `RingBuffer_Get`
- `RingBuffer_Check`
- `RingBuffer_Put`
- `RingBuffer_Init`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
