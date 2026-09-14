# nvm_block_2 — interface note
**Component:** SWC-PLT-023 · **ASIL:** QM · **Team:** motor control
**Last reviewed:** 2021-06-18 

## What it does

Computes its output from the inputs described below and writes it to the shared torque command structure.

## Entry points

- `NvmBlock_Flush`
- `NvmBlock_Calc`
- `NvmBlock_Update`
- `NvmBlock_Check`

## Known issues

Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.
