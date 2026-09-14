/*
 * timebase_3.c — SWC-PLT-011 / EPS core control
 *
 * Copyright (c) 2020-2026 Vantis Steering Systems.
 *
 * ASIL: D
 * Runnable: timebase_3_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TIME_CALC0            float32   Nm               0      110     15.82
 * TIME_APPLY1           float32   km/h             0       62      2.86
 */

#include "timebase_3.h"


Std_ReturnType Timebase_Check(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 0.94f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Calc(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.5f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Apply(const Timebase3In_t *in, Timebase3Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.74f;
    out->status = 0u;
    return E_OK;
}
