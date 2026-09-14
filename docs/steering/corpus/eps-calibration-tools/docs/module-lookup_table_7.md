# lookup_table_7 — interface note
**Component:** SWC-PLT-025 · **ASIL:** QM · **Team:** calibration
**Last reviewed:** 2025-08-05 

## What it does

Converts between the units used on the bus and the units used internally.

## Entry points

- `LookupTable_Apply`
- `LookupTable_Reset`
- `LookupTable_Check`
- `LookupTable_Flush`

## Known issues

The ASIL in the header does not match the build configuration. Nobody has decided which is right.
