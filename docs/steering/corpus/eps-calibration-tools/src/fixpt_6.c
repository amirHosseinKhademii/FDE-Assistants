/*
 * fixpt_6.c — SWC-PLT-014 / Calibration tooling
 *
 * Copyright (c) 2019-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: fixpt_6_MainRunnable   (period 2 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FIXP_FLUSH0           float32   Nm               0       50     14.39
 * FIXP_RESET1           float32   rad/s            0       27      3.97
 */

#include "fixpt_6.h"


Std_ReturnType Fixpt_Peek(const Fixpt6In_t *in, Fixpt6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.59f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Flush(const Fixpt6In_t *in, Fixpt6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.49f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Reset(const Fixpt6In_t *in, Fixpt6Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.86f;
    out->status = 0u;
    return E_OK;
}
