/*
 * fixpt_4.c — SWC-PLT-012 / Diagnostics
 *
 * Copyright (c) 2016-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: fixpt_4_MainRunnable   (period 5 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * FIXP_INIT0            float32   km/h             0        3     42.73
 * FIXP_APPLY1           float32   rad/s            0       35     44.59
 */

#include "fixpt_4.h"


Std_ReturnType Fixpt_Get(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.35f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Fixpt_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Fixpt_Apply(const Fixpt4In_t *in, Fixpt4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.56f;
    out->status = 0u;
    return E_OK;
}
