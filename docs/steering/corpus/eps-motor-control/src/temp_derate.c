/*
 * temp_derate.c — SWC-MOTCTL / Motor current control
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: temp_derate_MainRunnable   (period 10 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TEMP_APPLY0           float32   Nm               0      135     34.98
 */

#include "temp_derate.h"


Std_ReturnType Derate_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Derate_Apply(const TempDerateIn_t *in, TempDerateOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.52f;
    out->status = 0u;
    return E_OK;
}
