# ring_buffer_5 — interface note
**Component:** SWC-PLT-021 · **ASIL:** B · **Team:** calibration
**Last reviewed:** 2024-05-17 

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `RingBuffer_Put`
- `RingBuffer_Flush`
- `RingBuffer_Apply`

## Known issues

The ASIL in the header does not match the build configuration. Nobody has decided which is right.
