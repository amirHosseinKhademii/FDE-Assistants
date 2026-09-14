/*
 * nvm_block_2.c — SWC-PLT-023 / Motor current control
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: nvm_block_2_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * NVM__CALC0            float32   A                0      156     38.68
 * NVM__UPDATE1          float32   rad/s            0       42      5.21
 * NVM__CHECK2           float32   km/h             0      114     29.91
 */

#include "nvm_block_2.h"


Std_ReturnType NvmBlock_Flush(const NvmBlock2In_t *in, NvmBlock2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.7f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType NvmBlock_Calc(const NvmBlock2In_t *in, NvmBlock2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.82f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType NvmBlock_Update(const NvmBlock2In_t *in, NvmBlock2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.91f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType NvmBlock_Check(const NvmBlock2In_t *in, NvmBlock2Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.56f;
    out->status = 0u;
    return E_OK;
}
