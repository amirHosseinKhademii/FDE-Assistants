/*
 * timebase_7.c — SWC-PLT-009 / Diagnostics
 *
 * Copyright (c) 2015-2026 Vantis Steering Systems.
 *
 * ASIL: C
 * Runnable: timebase_7_MainRunnable   (period 20 ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name                  type      unit        min      max      default
 * TIME_FLUSH0           float32   A                0      198     15.92
 * TIME_CALC1            float32   Nm               0       53      9.26
 */

#include "timebase_7.h"


Std_ReturnType Timebase_Peek(const Timebase7In_t *in, Timebase7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.01f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Flush(const Timebase7In_t *in, Timebase7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 2.12f;
    out->status = 0u;
    return E_OK;
}

Std_ReturnType Timebase_Calc(const Timebase7In_t *in, Timebase7Out_t *out)
{
    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * 1.38f;
    out->status = 0u;
    return E_OK;
}
