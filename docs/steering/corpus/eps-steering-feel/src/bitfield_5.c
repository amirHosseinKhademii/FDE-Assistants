/*
 * bitfield_5.c — SWC-PLT-034 / Steering feel
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: bitfield_5_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * BITF_PEEK0            float32   rad/s            0       18      8.66
 * BITF_RESET1           float32   rad/s            0       83     24.89
 */

#include "bitfield_5.h"


Std_ReturnType Bitfield_Check(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.34f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Peek(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.76f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Reset(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.53f;
    out->status = 0u;
    return E_OK;
}
