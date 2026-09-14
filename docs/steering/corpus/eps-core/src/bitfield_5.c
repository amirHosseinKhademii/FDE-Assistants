/*
 * bitfield_5.c — SWC-PLT-001 / EPS core control
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: bitfield_5_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * BITF_UPDATE0          float32   rad/s            0       43      46.5
 * BITF_CHECK1           float32   rad/s            0      177     10.53
 */

#include "bitfield_5.h"


Std_ReturnType Bitfield_Put(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.52f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Update(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.42f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Bitfield_Check(const Bitfield5In_t *in, Bitfield5Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.82f;
    out->status = 0u;
    return E_OK;
}
