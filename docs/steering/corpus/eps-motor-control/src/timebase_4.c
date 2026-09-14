/*
 * timebase_4.c — SWC-PLT-020 / Motor current control
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: QM
 * Runnable: timebase_4_MainRunnable   (period 1 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TIME_GET0             float32   A                0       95     27.47
 * TIME_CALC1            float32   km/h             0       18     24.38
 * TIME_FLUSH2           float32   A                0       99     15.91
 */

#include "timebase_4.h"


Std_ReturnType Timebase_Put(const Timebase4In_t *in, Timebase4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.52f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Get(const Timebase4In_t *in, Timebase4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.36f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Calc(const Timebase4In_t *in, Timebase4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.48f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Flush(const Timebase4In_t *in, Timebase4Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.05f;
    out->status = 0u;
    return E_OK;
}
