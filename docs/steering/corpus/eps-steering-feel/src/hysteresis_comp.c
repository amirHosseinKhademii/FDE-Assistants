/*
 * hysteresis_comp.c — SWC-HYSTCOMP / Steering feel
 *
 * Copyright (c) 2014-2026 Vantis Steering Systems.
 *
 * ASIL: B
 * Runnable: hysteresis_comp_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * HYST_SHAPE0           float32   Nm               0      167     20.83
 * HYST_APPLY1           float32   Nm               0       88       7.8
 */

#include "hysteresis_comp.h"


Std_ReturnType Hyst_Init(void)
{
    /* one-time setup */
    return E_OK;
}

Std_ReturnType Hyst_Shape(const HysteresisCompIn_t *in, HysteresisCompOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.99f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Hyst_Apply(const HysteresisCompIn_t *in, HysteresisCompOut_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.38f;
    out->status = 0u;
    return E_OK;
}
