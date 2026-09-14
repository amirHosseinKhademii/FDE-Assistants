/*
 * nvm_block_8.c — SWC-PLT-019 / Motor current control
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: nvm_block_8_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * NVM__PUT0             float32   Nm               0       81     11.23
 * NVM__INIT1            float32   km/h             0       78      3.05
 * NVM__APPLY2           float32   Nm               0       30     44.22
 */

#include "nvm_block_8.h"


Std_ReturnType NvmBlock_Get(const NvmBlock8In_t *in, NvmBlock8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.91f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType NvmBlock_Put(const NvmBlock8In_t *in, NvmBlock8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.86f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType NvmBlock_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType NvmBlock_Apply(const NvmBlock8In_t *in, NvmBlock8Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.53f;
    out->status = 0u;
    return E_OK;
}
