# filter_iir_1 — interface note
**Component:** SWC-PLT-002 · **ASIL:** QM · **Team:** calibration
**Last reviewed:** 2025-01-06 

## What it does

Buffers samples and provides a filtered value to the callers below.

## Entry points

- `FilterIir_Apply`
- `FilterIir_Flush`
- `FilterIir_Reset`
- `FilterIir_Put`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
